"""Authentication providers — Dev mode & Keycloak.

Mirrors legacy eam-df/middleware/must-be-authenticated.js
and eam-df/middleware/sessionless-auth.js (Passport).
"""
from __future__ import annotations

import abc
import logging
from typing import Any

from fastapi import Request

from app.auth.models import AuthUser, Role
from app.auth.rbac import build_permission_list
from app.config import settings

logger = logging.getLogger("eam.auth")


class AuthProvider(abc.ABC):
    """Base class for authentication providers."""

    @abc.abstractmethod
    async def authenticate(self, request: Request) -> AuthUser | None:
        """Extract and validate user identity from *request*.

        Returns ``AuthUser`` on success, ``None`` if no credentials are present.
        Raises ``ValueError`` with a human-readable message on invalid credentials.
        """


# ---------------------------------------------------------------------------
# Dev mode — no real token validation
# ---------------------------------------------------------------------------

class DevAuthProvider(AuthProvider):
    """Return a fixed dev user — used when AUTH_DISABLED=True."""

    async def authenticate(self, request: Request) -> AuthUser | None:
        role = Role(settings.AUTH_DEV_ROLE)
        return AuthUser(
            id=settings.AUTH_DEV_USER,
            name=settings.AUTH_DEV_USER,
            email=f"{settings.AUTH_DEV_USER}@dev.local",
            role=role,
            permissions=build_permission_list(role),
        )


# ---------------------------------------------------------------------------
# Keycloak JWT — production mode
# ---------------------------------------------------------------------------

class KeycloakAuthProvider(AuthProvider):
    """Decode Keycloak JWT and extract user identity.

    Mirrors the legacy Node.js middleware:
        const decoded = jwt.decode(temp, { complete: true });
        req.user.id = decoded.payload.preferred_username;
        req.user.email = decoded.payload.email;
    """

    def __init__(self) -> None:
        self._jwks_client: Any | None = None

    async def authenticate(self, request: Request) -> AuthUser | None:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None

        token = auth_header.removeprefix("Bearer ").strip()
        if not token:
            return None

        try:
            payload = self._decode_token(token)
        except Exception as exc:
            raise ValueError(f"Invalid token: {exc}") from exc

        username = payload.get("preferred_username", "")
        email = payload.get("email", "")
        name = payload.get("name", username)

        # Resolve role from resource_access (legacy pattern)
        role = self._resolve_role(payload)

        user = AuthUser(
            id=username,
            name=name,
            email=email,
            role=role,
            permissions=build_permission_list(role),
        )
        return user

    # -- helpers --

    def _decode_token(self, token: str) -> dict:
        """Decode & verify the JWT."""
        try:
            from jose import jwt as jose_jwt
        except ImportError:
            raise RuntimeError(
                "python-jose[cryptography] is required for Keycloak auth. "
                "Install it with: pip install python-jose[cryptography]"
            )

        # For now, decode without verification (matching legacy behaviour).
        # TODO: add JWKS-based verification for production hardening.
        payload: dict = jose_jwt.decode(
            token,
            key="",
            options={
                "verify_signature": False,
                "verify_aud": False,
                "verify_exp": True,
            },
            algorithms=[settings.KEYCLOAK_ALGORITHMS],
        )
        return payload

    def _resolve_role(self, payload: dict) -> Role:
        """Map Keycloak resource_access roles to EAM Role enum.

        Legacy pattern (must-be-authenticated.js):
            roles = _.get(decoded, `payload.resource_access.tap-${appCode}-${appId}-b`)
        """
        resource_access: dict = payload.get("resource_access", {})

        # Try client-specific roles first
        client_id = settings.KEYCLOAK_CLIENT_ID
        client_roles: list[str] = []
        if client_id and client_id in resource_access:
            client_roles = resource_access[client_id].get("roles", [])

        # Try realm roles as fallback
        realm_roles: list[str] = resource_access.get("realm-management", {}).get("roles", [])
        all_roles = client_roles + realm_roles

        # Map to EAM roles (highest privilege wins)
        role_str_upper = [r.upper() for r in all_roles]
        if "_SYS_ADMIN" in role_str_upper or "ADMIN" in role_str_upper or "SUPER_ADMIN" in role_str_upper:
            return Role.ADMIN
        if "EA_REVIEWER" in role_str_upper:
            return Role.EA_REVIEWER
        if "_SYS_DEVELOPER" in role_str_upper or "EDITOR" in role_str_upper or "_INIT_DEVELOPER" in role_str_upper:
            return Role.EDITOR
        # Default to viewer
        return Role.VIEWER


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def get_auth_provider() -> AuthProvider:
    """Return the configured auth provider based on AUTH_DISABLED setting."""
    if settings.AUTH_DISABLED:
        return DevAuthProvider()
    return KeycloakAuthProvider()

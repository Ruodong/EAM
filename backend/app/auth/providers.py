"""Authentication providers — Dev mode & Keycloak.

Mirrors legacy eam-df/middleware/must-be-authenticated.js
and eam-df/middleware/sessionless-auth.js (Passport).
"""
from __future__ import annotations

import abc
import logging
import time
from typing import Any

import httpx
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

    # Cache JWKS keys for 1 hour to avoid hitting Keycloak on every request
    _jwks_cache: dict[str, Any] = {}
    _jwks_cache_ts: float = 0
    _JWKS_TTL: int = 3600  # seconds

    async def authenticate(self, request: Request) -> AuthUser | None:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None

        token = auth_header.removeprefix("Bearer ").strip()
        if not token:
            return None

        try:
            jwks = await self._fetch_jwks()
            payload = self._decode_token(token, jwks)
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

    async def _fetch_jwks(self) -> dict[str, Any]:
        """Fetch JWKS from Keycloak, with in-memory cache."""
        now = time.monotonic()
        if self._jwks_cache and (now - self._jwks_cache_ts) < self._JWKS_TTL:
            return self._jwks_cache

        jwks_url = (
            f"{settings.KEYCLOAK_SERVER_URL.rstrip('/')}"
            f"/realms/{settings.KEYCLOAK_REALM}"
            f"/protocol/openid-connect/certs"
        )
        logger.info("Fetching JWKS from %s", jwks_url)
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(jwks_url)
            resp.raise_for_status()
            jwks = resp.json()

        KeycloakAuthProvider._jwks_cache = jwks
        KeycloakAuthProvider._jwks_cache_ts = now
        return jwks

    def _decode_token(self, token: str, jwks: dict[str, Any]) -> dict:
        """Decode & verify the JWT against Keycloak JWKS public keys."""
        try:
            from jose import jwt as jose_jwt, jwk as jose_jwk
        except ImportError:
            raise RuntimeError(
                "python-jose[cryptography] is required for Keycloak auth. "
                "Install it with: pip install python-jose[cryptography]"
            )

        # Extract the key-id from the token header
        unverified_header = jose_jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        # Find the matching public key in the JWKS keyset
        rsa_key: dict = {}
        for key_data in jwks.get("keys", []):
            if key_data.get("kid") == kid:
                rsa_key = key_data
                break

        if not rsa_key:
            raise ValueError(f"No matching JWKS key found for kid={kid}")

        payload: dict = jose_jwt.decode(
            token,
            rsa_key,
            algorithms=[settings.KEYCLOAK_ALGORITHMS],
            options={
                "verify_aud": False,   # Keycloak audience varies by client
                "verify_exp": True,
            },
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

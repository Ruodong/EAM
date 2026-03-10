"""FastAPI authentication middleware.

Mirrors legacy:
  - eam-df/middleware/must-be-authenticated.js
  - eam-admin-console-backend HttpAuthnInterceptor.java

Injects ``request.state.user`` (AuthUser | None) for every request.
Public paths are whitelisted and skip authentication entirely.
"""
from __future__ import annotations

import logging

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.auth.providers import get_auth_provider

logger = logging.getLogger("eam.auth")

# Paths that never require authentication
PUBLIC_PATHS: set[str] = {
    "/api/health",
    "/api/health/check",
    "/docs",
    "/redoc",
    "/openapi.json",
}

# Path prefixes that never require authentication
PUBLIC_PREFIXES: tuple[str, ...] = (
    "/docs",
    "/redoc",
)


def _is_public(path: str) -> bool:
    """Return True if the request path is on the public whitelist."""
    if path in PUBLIC_PATHS:
        return True
    return any(path.startswith(prefix) for prefix in PUBLIC_PREFIXES)


class AuthMiddleware(BaseHTTPMiddleware):
    """Extract user identity from request and inject into request.state.user."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Always set user to None initially
        request.state.user = None

        # Skip auth for public paths
        if _is_public(request.url.path):
            return await call_next(request)

        provider = get_auth_provider()
        try:
            user = await provider.authenticate(request)
            request.state.user = user
        except ValueError as exc:
            # Invalid token
            logger.warning("Auth failed for %s %s: %s", request.method, request.url.path, exc)
            return JSONResponse(
                status_code=401,
                content={"detail": str(exc)},
            )
        except Exception as exc:
            logger.error("Unexpected auth error: %s", exc, exc_info=True)
            return JSONResponse(
                status_code=500,
                content={"detail": "Authentication error"},
            )

        return await call_next(request)

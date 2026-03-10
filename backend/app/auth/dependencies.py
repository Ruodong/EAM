"""FastAPI dependency injection functions for auth.

Usage in routers:
    from app.auth import require_auth, require_role, require_permission, Role

    # Any authenticated user
    @router.get("", dependencies=[Depends(require_auth)])

    # Specific role
    @router.post("", dependencies=[Depends(require_role(Role.ADMIN))])

    # Resource + scope permission
    @router.put("/{id}", dependencies=[Depends(require_permission("ea_request", "write"))])

Mirrors legacy:
  - eam-admin-console-backend HttpRoleInterceptor.java
  - eam-admin-console-backend HttpRequestLocalInterceptor.java
"""
from __future__ import annotations

from typing import Callable

from fastapi import Depends, HTTPException, Request

from app.auth.models import AuthUser, Role
from app.auth.rbac import check_permission as _check_permission
from app.config import settings


# ---------------------------------------------------------------------------
# Core: get current user from request.state
# ---------------------------------------------------------------------------

async def get_current_user(request: Request) -> AuthUser:
    """Retrieve the authenticated user from request.state.

    Raises 401 if no user is present (unless AUTH_DISABLED and dev provider
    already injected one via middleware).
    """
    user: AuthUser | None = getattr(request.state, "user", None)
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


# ---------------------------------------------------------------------------
# Convenience: require_auth (alias for get_current_user as dependency)
# ---------------------------------------------------------------------------

async def require_auth(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    """Dependency that simply requires authentication — any role allowed."""
    return user


# ---------------------------------------------------------------------------
# Role-based: require_role(*roles)
# ---------------------------------------------------------------------------

def require_role(*roles: Role) -> Callable:
    """Return a dependency that requires the user to have one of *roles*.

    Usage:
        @router.delete("/{id}", dependencies=[Depends(require_role(Role.ADMIN))])
    """

    async def _check(user: AuthUser = Depends(get_current_user)) -> AuthUser:
        if user.role not in roles:
            raise HTTPException(
                status_code=403,
                detail=f"Insufficient role. Required: {[r.value for r in roles]}, have: {user.role.value}",
            )
        return user

    return _check


# ---------------------------------------------------------------------------
# Resource-based: require_permission(resource, scope)
# ---------------------------------------------------------------------------

def require_permission(resource: str, scope: str = "read") -> Callable:
    """Return a dependency that requires *scope* on *resource*.

    Usage:
        @router.post("", dependencies=[Depends(require_permission("ea_request", "write"))])
    """

    async def _check(user: AuthUser = Depends(get_current_user)) -> AuthUser:
        if not _check_permission(user.role, resource, scope):
            raise HTTPException(
                status_code=403,
                detail=f"No permission: {resource}:{scope}",
            )
        return user

    return _check

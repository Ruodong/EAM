"""Auth router — user info & permissions API.

Endpoints:
    GET /api/auth/me          — current user info + role + permissions
    GET /api/auth/permissions — flat permission list for frontend UI gating
"""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_user
from app.auth.models import AuthUser

router = APIRouter()


@router.get("/me")
async def auth_me(user: AuthUser = Depends(get_current_user)):
    """Return the current authenticated user's profile and permissions."""
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role.value,
        "permissions": user.permissions,
    }


@router.get("/permissions")
async def auth_permissions(user: AuthUser = Depends(get_current_user)):
    """Return the flat permission list for the current user.

    Used by the frontend PermissionGate component to show/hide UI elements.
    Response shape: { "role": "admin", "permissions": ["ea_request:read", ...] }
    """
    return {
        "role": user.role.value,
        "permissions": user.permissions,
    }

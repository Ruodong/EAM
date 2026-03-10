"""Auth data models — AuthUser, Role enum."""
from __future__ import annotations

from enum import Enum
from pydantic import BaseModel


class Role(str, Enum):
    """EAM user roles — mapped from legacy Keycloak role system.

    Legacy mapping:
        _SYS_ADMIN      → admin
        (new)            → ea_reviewer
        _SYS_DEVELOPER   → editor
        _SYS_BASIC       → viewer
    """

    ADMIN = "admin"
    EA_REVIEWER = "ea_reviewer"
    EDITOR = "editor"
    VIEWER = "viewer"


class AuthUser(BaseModel):
    """Authenticated user context injected into request.state."""

    id: str  # itcode / preferred_username
    name: str
    email: str
    role: Role
    permissions: list[str] = []  # cached flat list, e.g. ["ea_request:read", "ea_request:write"]

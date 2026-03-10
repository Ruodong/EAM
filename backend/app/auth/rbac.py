"""RBAC permission matrix — replaces legacy authorization-config.json.

Each role maps to a dict of { resource: [scopes] }.
Admin uses a wildcard "*" for both resource and scope.
"""
from __future__ import annotations

from app.auth.models import Role


# ---------------------------------------------------------------------------
# Permission matrix
# ---------------------------------------------------------------------------

ROLE_PERMISSIONS: dict[Role, dict[str, list[str]]] = {
    Role.ADMIN: {
        "*": ["*"],  # full access
    },
    Role.EA_REVIEWER: {
        "ea_request": ["read", "write"],
        "meeting": ["read", "write"],
        "meeting_deck": ["read", "write"],
        "action": ["read", "write"],
        "schedule": ["read", "write"],
        "ea_review_log": ["read", "write"],
        "application": ["read"],
        "bcm": ["read"],
        "cmdb": ["read"],
        "bcpf": ["read"],
        "tech_stack": ["read"],
        "report": ["read"],
        "dashboard": ["read"],
        "export": ["execute"],
        "team_member": ["read"],
        "project": ["read"],
        "scope": ["read"],
    },
    Role.EDITOR: {
        "ea_request": ["read"],
        "meeting": ["read"],
        "meeting_deck": ["read"],
        "action": ["read"],
        "schedule": ["read"],
        "ea_review_log": ["read"],
        "application": ["read", "write"],
        "bcm": ["read", "write"],
        "cmdb": ["read", "write"],
        "bcpf": ["read", "write"],
        "tech_stack": ["read", "write"],
        "report": ["read"],
        "dashboard": ["read"],
        "export": ["execute"],
        "team_member": ["read"],
        "project": ["read", "write"],
        "scope": ["read"],
        "master_data": ["read", "write"],
        "resource": ["read", "write"],
        "certification": ["read", "write"],
        "dict_option": ["read", "write"],
    },
    Role.VIEWER: {
        "ea_request": ["read"],
        "meeting": ["read"],
        "meeting_deck": ["read"],
        "action": ["read"],
        "schedule": ["read"],
        "ea_review_log": ["read"],
        "application": ["read"],
        "bcm": ["read"],
        "cmdb": ["read"],
        "bcpf": ["read"],
        "tech_stack": ["read"],
        "report": ["read"],
        "dashboard": ["read"],
        "team_member": ["read"],
        "project": ["read"],
        "scope": ["read"],
    },
}


# ---------------------------------------------------------------------------
# Check helpers
# ---------------------------------------------------------------------------

def check_permission(role: Role, resource: str, scope: str) -> bool:
    """Return True if *role* is allowed *scope* on *resource*."""
    perms = ROLE_PERMISSIONS.get(role, {})

    # Wildcard role (admin)
    if "*" in perms and ("*" in perms["*"] or scope in perms["*"]):
        return True

    allowed_scopes = perms.get(resource, [])
    return "*" in allowed_scopes or scope in allowed_scopes


def build_permission_list(role: Role) -> list[str]:
    """Return a flat list like ["ea_request:read", "ea_request:write", ...] for *role*."""
    perms = ROLE_PERMISSIONS.get(role, {})
    result: list[str] = []
    for resource, scopes in perms.items():
        for scope in scopes:
            result.append(f"{resource}:{scope}")
    return result

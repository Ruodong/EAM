"""Applications router — ported from applications.ts."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db
from app.utils.pagination import PaginationParams, paginated_response

from app.auth import require_permission, require_role, Role

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _map_app(r: dict) -> dict:
    return {
        "id": r.get("id"),
        "appId": r.get("app_id"),
        "projectId": r.get("project_id"),
        "appName": r.get("app_name"),
        "appFullName": r.get("app_full_name"),
        "appItOwner": r.get("app_it_owner"),
        "currentState": r.get("current_state"),
        "appTechIdInCmdb": r.get("app_tech_id_in_cmdb"),
        "appDescription": r.get("app_description"),
        "businessFunction": r.get("business_function"),
        "createdBy": r.get("create_by"),
        "createdAt": r.get("create_at"),
    }


# Sort field whitelist
APP_SORT_FIELDS: dict[str, str] = {
    "appId": "app_id",
    "name": "app_name",
}


# ---------------------------------------------------------------------------
# GET / — paginated list of applications
# ---------------------------------------------------------------------------

@router.get("", dependencies=[Depends(require_permission("application", "read"))])
async def list_applications(
    pag: PaginationParams = Depends(),
    db: AsyncSession = Depends(get_db),
    appId: str | None = Query(None),
    name: str | None = Query(None),
    projectId: str | None = Query(None),
):
    try:
        conditions: list[str] = []
        params: dict[str, Any] = {}

        if appId:
            conditions.append("app_id ILIKE :p_appId")
            params["p_appId"] = f"%{appId}%"
        if name:
            conditions.append("app_name ILIKE :p_name")
            params["p_name"] = f"%{name}%"
        if projectId:
            conditions.append("project_id = :p_projectId")
            params["p_projectId"] = projectId

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        db_sort = APP_SORT_FIELDS.get(pag.sort_field or "", "app_id")
        sort_order = pag.sort_order or "asc"
        order_dir = "ASC" if sort_order == "asc" else "DESC"

        params["p_limit"] = pag.page_size
        params["p_offset"] = pag.offset

        data_result = await db.execute(
            text(
                f"SELECT * FROM eam.project_app {where_clause} "
                f"ORDER BY {db_sort} {order_dir} "
                f"LIMIT :p_limit OFFSET :p_offset"
            ),
            params,
        )
        count_result = await db.execute(
            text(f"SELECT COUNT(*) as total FROM eam.project_app {where_clause}"),
            params,
        )

        rows = [dict(r._mapping) for r in data_result.fetchall()]
        total = int(count_result.scalar() or 0)

        return paginated_response([_map_app(r) for r in rows], total, pag.page, pag.page_size)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch applications") from e


# ---------------------------------------------------------------------------
# GET /bcm/versions — List distinct BCPF data versions
# MUST be before /bcm to avoid ambiguity and before /bcm/{subpath}
# ---------------------------------------------------------------------------

@router.get("/bcm/versions", dependencies=[Depends(require_permission("application", "read"))])
async def bcm_versions(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(
            text("SELECT DISTINCT data_version FROM eam.bcpf_master_data ORDER BY data_version DESC")
        )
        return [r[0] for r in result.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch versions") from e


# ---------------------------------------------------------------------------
# GET /bcm/bc-tree — BCPF master data for cascader/search
# ---------------------------------------------------------------------------

@router.get("/bcm/bc-tree", dependencies=[Depends(require_permission("application", "read"))])
async def bcm_bc_tree(
    db: AsyncSession = Depends(get_db),
    version: str | None = Query(None),
    q: str | None = Query(None),
):
    try:
        conditions: list[str] = []
        params: dict[str, Any] = {}

        if version:
            conditions.append("data_version = :p_version")
            params["p_version"] = version
        if q:
            conditions.append(
                "(bc_id ILIKE :p_q OR bc_name ILIKE :p_q "
                "OR lv1_domain ILIKE :p_q OR lv2_sub_domain ILIKE :p_q "
                "OR lv3_capability_group ILIKE :p_q)"
            )
            params["p_q"] = f"%{q}%"

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        result = await db.execute(
            text(
                f"SELECT id, bc_id, bc_name, lv1_domain, lv2_sub_domain, "
                f"lv3_capability_group, data_version, level "
                f"FROM eam.bcpf_master_data {where_clause} "
                f"ORDER BY bc_id ASC LIMIT 500"
            ),
            params,
        )
        rows = [dict(r._mapping) for r in result.fetchall()]
        return [
            {
                "id": int(r["id"]) if r.get("id") is not None else None,
                "bcId": r.get("bc_id"),
                "bcName": r.get("bc_name"),
                "domainL1": r.get("lv1_domain"),
                "subDomainL2": r.get("lv2_sub_domain"),
                "capGroupL3": r.get("lv3_capability_group"),
                "version": r.get("data_version"),
                "level": r.get("level"),
            }
            for r in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch BC tree data") from e


# ---------------------------------------------------------------------------
# GET /bcm — Business Capability Mapping list (paginated)
# ---------------------------------------------------------------------------

@router.get("/bcm", dependencies=[Depends(require_permission("application", "read"))])
async def bcm_list(
    pag: PaginationParams = Depends(),
    db: AsyncSession = Depends(get_db),
    appId: str | None = Query(None),
    name: str | None = Query(None),
    domainL1: str | None = Query(None),
    subDomainL2: str | None = Query(None),
    bcName: str | None = Query(None),
    version: str | None = Query(None),
):
    try:
        conditions: list[str] = []
        params: dict[str, Any] = {}

        if appId:
            conditions.append("b.app_id ILIKE :p_appId")
            params["p_appId"] = f"%{appId}%"
        if name:
            conditions.append("COALESCE(NULLIF(a.app_name,''), c.name, '') ILIKE :p_name")
            params["p_name"] = f"%{name}%"
        if domainL1:
            conditions.append("m.lv1_domain ILIKE :p_domainL1")
            params["p_domainL1"] = f"%{domainL1}%"
        if subDomainL2:
            conditions.append("m.lv2_sub_domain ILIKE :p_subDomainL2")
            params["p_subDomainL2"] = f"%{subDomainL2}%"
        if bcName:
            conditions.append("m.bc_name ILIKE :p_bcName")
            params["p_bcName"] = f"%{bcName}%"
        if version:
            conditions.append("m.data_version = :p_version")
            params["p_version"] = version

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        app_joins = (
            "LEFT JOIN eam.project_app a ON b.app_id = a.app_id "
            "LEFT JOIN eam.cmdb_application c ON b.app_id = c.app_id"
        )

        count_result = await db.execute(
            text(
                f"SELECT count(*) as count FROM eam.biz_cap_map b "
                f"JOIN eam.bcpf_master_data m ON b.bcpf_master_id = m.id "
                f"{app_joins} {where_clause}"
            ),
            params,
        )
        total = int(count_result.scalar() or 0)

        params["p_limit"] = pag.page_size
        params["p_offset"] = pag.offset

        data_result = await db.execute(
            text(
                f"SELECT b.id, b.app_id, "
                f"COALESCE(NULLIF(a.app_name,''), c.name, '') as app_name, "
                f"COALESCE(NULLIF(a.app_it_owner,''), c.app_it_owner, '') as app_it_owner, "
                f"COALESCE(NULLIF(a.current_state,''), c.u_status, '') as current_state, "
                f"COALESCE(NULLIF(a.app_ownership,''), c.app_ownership, '') as app_ownership, "
                f"COALESCE(NULLIF(a.app_solution_owner,''), c.owned_by, '') as app_solution_owner, "
                f"COALESCE(NULLIF(a.portfolio_mgt,''), c.portfolio_mgt, '') as portfolio_mgt, "
                f"COALESCE(NULLIF(a.app_solution_type,''), c.app_solution_type, '') as app_solution_type, "
                f"COALESCE(NULLIF(a.app_classification,''), c.app_classification, '') as app_classification, "
                f"COALESCE(a.business_function, '') as business_function, "
                f"COALESCE(c.app_full_name, '') as app_full_name, "
                f"COALESCE(c.owned_by, '') as owned_by, "
                f"COALESCE(c.app_owner_tower, '') as app_owner_tower, "
                f"COALESCE(c.app_owner_domain, '') as app_owner_domain, "
                f"COALESCE(c.app_dt_owner, '') as app_dt_owner, "
                f"COALESCE(c.app_operation_owner, '') as app_operation_owner, "
                f"COALESCE(NULLIF(a.app_description,''), c.short_description, '') as app_description, "
                f"m.bc_id, m.bc_name, m.lv1_domain, m.lv2_sub_domain, "
                f"m.lv3_capability_group, m.data_version, m.level "
                f"FROM eam.biz_cap_map b "
                f"JOIN eam.bcpf_master_data m ON b.bcpf_master_id = m.id "
                f"{app_joins} {where_clause} "
                f"ORDER BY b.app_id ASC, m.bc_id ASC "
                f"LIMIT :p_limit OFFSET :p_offset"
            ),
            params,
        )
        rows = [dict(r._mapping) for r in data_result.fetchall()]

        mapped = [
            {
                "id": r.get("id"),
                "appId": r.get("app_id"),
                "appName": r.get("app_name") or "",
                "appFullName": r.get("app_full_name") or "",
                "appItOwner": r.get("app_it_owner") or "",
                "status": r.get("current_state") or "",
                "appOwnership": r.get("app_ownership") or "",
                "appSolutionOwner": r.get("app_solution_owner") or "",
                "ownedBy": r.get("owned_by") or "",
                "portfolioMgt": r.get("portfolio_mgt") or "",
                "appSolutionType": r.get("app_solution_type") or "",
                "appClassification": r.get("app_classification") or "",
                "businessFunction": r.get("business_function") or "",
                "appOwnerTower": r.get("app_owner_tower") or "",
                "appOwnerDomain": r.get("app_owner_domain") or "",
                "appDtOwner": r.get("app_dt_owner") or "",
                "appOperationOwner": r.get("app_operation_owner") or "",
                "appDescription": r.get("app_description") or "",
                "bcId": r.get("bc_id"),
                "bcName": r.get("bc_name"),
                "domainL1": r.get("lv1_domain"),
                "subDomainL2": r.get("lv2_sub_domain"),
                "capGroupL3": r.get("lv3_capability_group"),
                "version": r.get("data_version"),
                "level": r.get("level"),
            }
            for r in rows
        ]

        return paginated_response(mapped, total, pag.page, pag.page_size)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch BCM data") from e

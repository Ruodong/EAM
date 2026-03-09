"""CMDB Applications router — ported from cmdb.ts."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db
from app.utils.pagination import PaginationParams, paginated_response
from app.utils.filters import multi_value_condition

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _clean_pg_array(v: Any) -> str:
    """Strip PostgreSQL array literal braces, e.g. '{"Business Application"}' -> 'Business Application'."""
    if not v:
        return ""
    s = str(v)
    if s.startswith("{") and s.endswith("}"):
        return s[1:-1].replace('"', "")
    return s


def _map_row(r: dict) -> dict:
    return {
        "appId": r.get("app_id") or "",
        "name": r.get("name") or "",
        "appFullName": r.get("app_full_name") or "",
        "shortDescription": r.get("short_description") or "",
        "status": r.get("u_status") or "",
        "appOwnership": r.get("app_ownership") or "",
        "ownedBy": r.get("owned_by") or "",
        "appItOwner": r.get("app_it_owner") or "",
        "appDtOwner": r.get("app_dt_owner") or "",
        "appOperationOwner": r.get("app_operation_owner") or "",
        "appOwnerTower": r.get("app_owner_tower") or "",
        "appOwnerDomain": r.get("app_owner_domain") or "",
        "appOperationOwnerTower": r.get("app_operation_owner_tower") or "",
        "appOperationOwnerDomain": r.get("app_operation_owner_domain") or "",
        "portfolioMgt": r.get("portfolio_mgt") or "",
        "appClassification": _clean_pg_array(r.get("app_classification")),
        "appSolutionType": _clean_pg_array(r.get("app_solution_type")),
        "serviceArea": r.get("u_service_area") or "",
        "patchLevel": r.get("patch_level") or "",
        "updateAt": r.get("update_at"),
        "decommissionedAt": r.get("decommissioned_at"),
    }


# Sort column whitelist (uses sortKey/sortDir instead of sortField/sortOrder)
SORT_COLUMNS: dict[str, str] = {
    "appId": "app_id",
    "name": "name",
    "appFullName": "app_full_name",
    "status": "u_status",
    "appOwnerTower": "app_owner_tower",
    "ownedBy": "owned_by",
    "portfolioMgt": "portfolio_mgt",
    "appClassification": "app_classification",
}


# ---------------------------------------------------------------------------
# GET / — paginated list with search & sort
# ---------------------------------------------------------------------------

@router.get("")
async def list_cmdb(
    pag: PaginationParams = Depends(),
    db: AsyncSession = Depends(get_db),
    appId: str | None = Query(None),
    name: str | None = Query(None),
    status: str | None = Query(None),
    ownerTower: str | None = Query(None),
    ownedBy: str | None = Query(None),
    portfolio: str | None = Query(None),
    classification: str | None = Query(None),
    solutionType: str | None = Query(None),
    serviceArea: str | None = Query(None),
    ownership: str | None = Query(None),
    appFullName: str | None = Query(None),
    sortKey: str | None = Query(None),
    sortDir: str | None = Query(None),
):
    try:
        conditions: list[str] = []
        params: dict[str, Any] = {}

        if appId:
            conditions.append("app_id ILIKE :p_appId")
            params["p_appId"] = f"%{appId}%"
        if name:
            conditions.append("(name ILIKE :p_name OR app_full_name ILIKE :p_name)")
            params["p_name"] = f"%{name}%"
        if status:
            conditions.append(multi_value_condition("u_status", "p_status", status, params))
        if ownerTower:
            conditions.append("app_owner_tower ILIKE :p_ownerTower")
            params["p_ownerTower"] = f"%{ownerTower}%"
        if ownedBy:
            conditions.append("owned_by ILIKE :p_ownedBy")
            params["p_ownedBy"] = f"%{ownedBy}%"
        if portfolio:
            conditions.append(multi_value_condition("portfolio_mgt", "p_portfolio", portfolio, params))
        if classification:
            conditions.append(multi_value_condition("app_classification", "p_classification", classification, params))
        if solutionType:
            conditions.append(multi_value_condition("app_solution_type", "p_solutionType", solutionType, params))
        if serviceArea:
            conditions.append(multi_value_condition("u_service_area", "p_serviceArea", serviceArea, params))
        if ownership:
            conditions.append(multi_value_condition("app_ownership", "p_ownership", ownership, params))

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        # Sort — uses sortKey/sortDir (not sortField/sortOrder)
        db_col = SORT_COLUMNS.get(sortKey or "", "app_id")
        direction = "DESC" if sortDir == "desc" else "ASC"
        order_by = f"ORDER BY (COALESCE({db_col},'') = '') ASC, {db_col} {direction} NULLS LAST"

        count_result = await db.execute(
            text(f"SELECT count(*) as count FROM eam.cmdb_application {where_clause}"),
            params,
        )
        total = int(count_result.scalar() or 0)

        params["p_limit"] = pag.page_size
        params["p_offset"] = pag.offset

        data_result = await db.execute(
            text(
                f"SELECT * FROM eam.cmdb_application {where_clause} "
                f"{order_by} LIMIT :p_limit OFFSET :p_offset"
            ),
            params,
        )
        rows = [dict(r._mapping) for r in data_result.fetchall()]

        return paginated_response([_map_row(r) for r in rows], total, pag.page, pag.page_size)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch CMDB applications") from e


# ---------------------------------------------------------------------------
# GET /{app_id} — single record detail
# ---------------------------------------------------------------------------

@router.get("/{app_id}")
async def get_cmdb_detail(app_id: str, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(
            text("SELECT * FROM eam.cmdb_application WHERE app_id = :p_appId LIMIT 1"),
            {"p_appId": app_id},
        )
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Application not found")
        return _map_row(dict(row._mapping))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch application detail") from e

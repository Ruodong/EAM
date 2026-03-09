"""Technology stack router — read-only paginated list with filters."""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db
from app.utils.pagination import PaginationParams, paginated_response
from app.utils.filters import multi_value_condition

router = APIRouter()

# ── Mapping helpers ──────────────────────────────────────────────

SORT_FIELD_MAP: dict[str, str] = {
    "component": "component",
    "category": "category",
    "eaAdvice": "ea_advice",
    "masterNo": "master_no",
}

ALLOWED_SORT_FIELDS = set(SORT_FIELD_MAP.values())


def _map_tech_stack(r) -> dict:
    """Convert a DB row to the camelCase API shape."""
    t = r._mapping if hasattr(r, "_mapping") else r
    return {
        "id": t["id"],
        "masterNo": t["master_no"],
        "category": t["category"],
        "subCategory": t["sub_category"],
        "component": t["component"],
        "componentPackage": t["component_package"],
        "version": t["version"],
        "majorVersion": t["major_version"],
        "minorVersion": t["minor_version"],
        "patchVersion": t["patch_version"],
        "eaAdvice": t["ea_advice"],
        "standard": t["standard"],
        "restricted": t["restricted"],
        "remark": t["remark"],
        "initialReleaseDate": t["initial_release_date"],
        "finalReleaseDate": t["final_release_date"],
        "eolDate": t["eol_date"],
        "eolLink": t["eol_link"],
        "securityVulnerability": t["security_vulnerability"],
        "securityServerity": t["security_serverity"],
        "cvssV3Score": t["cvss_v3_score"],
        "securityAdvice": t["security_advice"],
        "vulnerabilityLink": t["vulnerability_link"],
        "status": t["status"],
        "createdBy": t["create_by"],
        "createdAt": t["create_at"],
    }


# ── GET /api/technology-stack ────────────────────────────────────

@router.get("")
async def list_technology_stack(
    pagination: PaginationParams = Depends(),
    component: str | None = Query(None),
    category: str | None = Query(None),
    eaAdvice: str | None = Query(None),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        conditions: list[str] = []
        params: dict = {}

        if component:
            conditions.append("component ILIKE :component")
            params["component"] = f"%{component}%"
        if category:
            conditions.append(multi_value_condition("category", "category", category, params))
        if eaAdvice:
            conditions.append(multi_value_condition("ea_advice", "eaAdvice", eaAdvice, params))
        if status:
            conditions.append(multi_value_condition("status", "status", status, params))

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        # Sort
        db_sort_field = SORT_FIELD_MAP.get(pagination.sort_field, pagination.sort_field) if pagination.sort_field else "master_no"
        if db_sort_field not in ALLOWED_SORT_FIELDS:
            db_sort_field = "master_no"
        sort_order = "DESC" if pagination.sort_order and pagination.sort_order.lower() == "desc" else "ASC"

        data_query = text(
            f"SELECT * FROM eam.tech_stack_master_data WHERE {where_clause} "
            f"ORDER BY {db_sort_field} {sort_order} "
            f"LIMIT :limit OFFSET :offset"
        )
        count_query = text(
            f"SELECT COUNT(*) FROM eam.tech_stack_master_data WHERE {where_clause}"
        )

        params["limit"] = pagination.page_size
        params["offset"] = pagination.offset

        result = await db.execute(data_query, params)
        rows = result.mappings().all()

        count_result = await db.execute(count_query, {k: v for k, v in params.items() if k not in ("limit", "offset")})
        total = count_result.scalar_one()

        return paginated_response(
            [_map_tech_stack(r) for r in rows],
            total,
            pagination.page,
            pagination.page_size,
        )
    except Exception as e:
        print(f"Error fetching technology stack: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch technology stack")

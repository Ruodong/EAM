"""BCPF Master Data router — paginated list with filtering and sorting."""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db
from app.utils.pagination import PaginationParams, paginated_response
from app.utils.filters import multi_value_int_condition

router = APIRouter()

# ── Sort field whitelist ────────────────────────────────────────

SORT_FIELD_MAP: dict[str, str] = {
    "bcId": "bc_id",
    "parentBcId": "parent_bc_id",
    "bcName": "bc_name",
    "domainL1": "lv1_domain",
    "subDomainL2": "lv2_sub_domain",
    "capabilityGroupL3": "lv3_capability_group",
    "version": "data_version",
}

ALLOWED_SORT_FIELDS = set(SORT_FIELD_MAP.values()) | {
    "bc_id", "parent_bc_id", "bc_name", "lv1_domain", "lv2_sub_domain",
    "lv3_capability_group", "data_version", "level",
}


def _map_bcpf(r) -> dict:
    """Convert a DB row (RowMapping) to the camelCase API shape."""
    m = r._mapping if hasattr(r, "_mapping") else r
    return {
        "id": int(m["id"]) if m["id"] is not None else None,
        "bcId": m["bc_id"],
        "parentBcId": m["parent_bc_id"],
        "bcName": m["bc_name"],
        "bcNameCn": m["bc_name_cn"],
        "level": m["level"],
        "alias": m["alias"],
        "bcDescription": m["bc_description"],
        "bizGroup": m["biz_group"],
        "geo": m["geo"],
        "bizOwner": m["biz_owner"],
        "bizTeam": m["biz_team"],
        "dtOwner": m["dt_owner"],
        "dtTeam": m["dt_team"],
        "remark": m["remark"],
        "version": m["data_version"],
        "domainL1": m["lv1_domain"],
        "subDomainL2": m["lv2_sub_domain"],
        "capabilityGroupL3": m["lv3_capability_group"],
        "createTime": m["create_time"],
    }


# ── GET /api/bcpf-master-data ───────────────────────────────────

@router.get("")
async def list_bcpf(
    pagination: PaginationParams = Depends(),
    version: str | None = Query(None),
    domainL1: str | None = Query(None),
    subDomainL2: str | None = Query(None),
    bcName: str | None = Query(None),
    level: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        conditions: list[str] = []
        params: dict = {}

        if version:
            conditions.append("data_version = :version")
            params["version"] = version
        if domainL1:
            conditions.append("lv1_domain = :domainL1")
            params["domainL1"] = domainL1
        if subDomainL2:
            conditions.append("lv2_sub_domain = :subDomainL2")
            params["subDomainL2"] = subDomainL2
        if bcName:
            conditions.append("bc_name ILIKE :bcName")
            params["bcName"] = f"%{bcName}%"
        if level:
            conditions.append(multi_value_int_condition("level", "level", level, params))

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        # Sort
        db_sort_field = SORT_FIELD_MAP.get(pagination.sort_field, pagination.sort_field) if pagination.sort_field else "bc_id"
        if db_sort_field not in ALLOWED_SORT_FIELDS:
            db_sort_field = "bc_id"
        sort_order = "ASC" if (not pagination.sort_order) or pagination.sort_order.lower() == "asc" else "DESC"

        data_query = text(
            f"SELECT * FROM eam.bcpf_master_data WHERE {where_clause} "
            f"ORDER BY {db_sort_field} {sort_order} "
            f"LIMIT :limit OFFSET :offset"
        )
        count_query = text(
            f"SELECT COUNT(*) FROM eam.bcpf_master_data WHERE {where_clause}"
        )

        params["limit"] = pagination.page_size
        params["offset"] = pagination.offset

        result = await db.execute(data_query, params)
        rows = result.mappings().all()

        count_params = {k: v for k, v in params.items() if k not in ("limit", "offset")}
        count_result = await db.execute(count_query, count_params)
        total = count_result.scalar_one()

        return paginated_response(
            [_map_bcpf(r) for r in rows],
            total,
            pagination.page,
            pagination.page_size,
        )
    except Exception as e:
        print(f"Error fetching BCPF master data: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch BCPF master data")

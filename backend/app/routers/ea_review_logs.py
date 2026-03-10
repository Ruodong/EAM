"""EA review log endpoints."""
from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db
from app.utils.pagination import PaginationParams, paginated_response

from app.auth import require_permission, require_role, Role

router = APIRouter()

FIELD_MAP = {
    "createdAt": "create_at",
}

ALLOWED_SORT_COLUMNS = {
    "id", "comment", "create_at", "operator", "operation", "project_id",
}


def _map_log(row: dict) -> dict:
    return {
        "id": row["id"],
        "comment": row["comment"],
        "createdAt": row["create_at"].isoformat() if row["create_at"] else None,
        "operator": row["operator"],
        "operation": row["operation"],
        "projectId": row["project_id"],
    }


@router.get("", dependencies=[Depends(require_permission("ea_review_log", "read"))])
async def get_ea_review_logs(
    pag: PaginationParams = Depends(),
    projectId: str | None = Query(None),
    operator: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        conditions: list[str] = []
        params: dict = {}

        if projectId:
            conditions.append("project_id = :project_id")
            params["project_id"] = projectId
        if operator:
            conditions.append("operator ILIKE :operator")
            params["operator"] = f"%{operator}%"

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        # Resolve sort column
        db_sort_field = FIELD_MAP.get(pag.sort_field, pag.sort_field) if pag.sort_field else "create_at"
        if db_sort_field not in ALLOWED_SORT_COLUMNS:
            db_sort_field = "create_at"
        sort_order = pag.sort_order if pag.sort_order in ("asc", "desc") else "desc"

        # Count query
        count_result = await db.execute(
            text(f"SELECT COUNT(*) AS cnt FROM eam.eam_review_log WHERE {where_clause}"),
            params,
        )
        total = count_result.scalar_one()

        # Data query
        data_result = await db.execute(
            text(
                f"SELECT * FROM eam.eam_review_log WHERE {where_clause} "
                f"ORDER BY {db_sort_field} {sort_order} "
                f"LIMIT :limit OFFSET :offset"
            ),
            {**params, "limit": pag.page_size, "offset": pag.offset},
        )
        rows = data_result.mappings().all()

        return paginated_response(
            [_map_log(dict(r)) for r in rows],
            total,
            pag.page,
            pag.page_size,
        )
    except Exception as e:
        print(f"Error: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to fetch EA review logs"})

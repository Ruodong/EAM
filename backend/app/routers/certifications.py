"""Certification endpoints."""
from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db
from app.utils.pagination import PaginationParams, paginated_response
from app.utils.filters import multi_value_condition

router = APIRouter()

# Maps camelCase front-end sort fields to DB column names
CERT_FIELD_MAP = {
    "certId": "simple_id",
    "name": "exam_name",
    "type": "certificate_type",
    "itCode": "itcode",
    "ownerName": "user_name",
    "issuedDate": "issue_date",
    "expiryDate": "expiration_date",
}

ALLOWED_SORT_COLUMNS = {
    "id", "simple_id", "exam_name", "certificate_type",
    "itcode", "user_name", "issue_date", "expiration_date",
}


def _map_cert(row: dict) -> dict:
    return {
        "id": row["id"],
        "certId": row["simple_id"],
        "name": row["exam_name"],
        "type": row["certificate_type"],
        "itCode": row["itcode"],
        "issuedDate": row["issue_date"].isoformat() if row["issue_date"] else None,
        "expiryDate": row["expiration_date"].isoformat() if row["expiration_date"] else None,
        "ownerName": row["user_name"],
        "comment": row.get("comment"),
    }


@router.get("")
async def get_certifications(
    pag: PaginationParams = Depends(),
    name: str | None = Query(None),
    type: str | None = Query(None),
    itCode: str | None = Query(None),
    certId: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        conditions: list[str] = []
        params: dict = {}

        if name:
            conditions.append("exam_name ILIKE :name")
            params["name"] = f"%{name}%"
        if type:
            conditions.append(multi_value_condition("certificate_type", "type", type, params))
        if itCode:
            conditions.append("itcode ILIKE :itcode")
            params["itcode"] = f"%{itCode}%"
        if certId:
            conditions.append("simple_id ILIKE :cert_id")
            params["cert_id"] = f"%{certId}%"

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        # Resolve sort column
        db_sort_field = CERT_FIELD_MAP.get(pag.sort_field, pag.sort_field) if pag.sort_field else "id"
        if db_sort_field not in ALLOWED_SORT_COLUMNS:
            db_sort_field = "id"
        sort_order = pag.sort_order if pag.sort_order in ("asc", "desc") else "desc"

        # Count query
        count_result = await db.execute(
            text(f"SELECT COUNT(*) AS cnt FROM eam.certification WHERE {where_clause}"),
            params,
        )
        total = count_result.scalar_one()

        # Data query
        data_result = await db.execute(
            text(
                f"SELECT * FROM eam.certification WHERE {where_clause} "
                f"ORDER BY {db_sort_field} {sort_order} "
                f"LIMIT :limit OFFSET :offset"
            ),
            {**params, "limit": pag.page_size, "offset": pag.offset},
        )
        rows = data_result.mappings().all()

        return paginated_response(
            [_map_cert(dict(r)) for r in rows],
            total,
            pag.page,
            pag.page_size,
        )
    except Exception as e:
        print(f"Error: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to fetch certifications"})

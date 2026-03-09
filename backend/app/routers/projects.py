"""Projects router — CRUD with pagination, filtering, sorting."""
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db
from app.utils.pagination import PaginationParams, paginated_response
from app.utils.filters import multi_value_condition

router = APIRouter()

# ── Mapping helpers ──────────────────────────────────────────────

SORT_FIELD_MAP: dict[str, str] = {
    "projectId": "project_id",
    "name": "project_name",
    "pmName": "pm",
    "dtLeadName": "dt_lead",
    "itLeadName": "it_lead",
    "createdAt": "create_at",
    "aiRelated": "ai_related",
}

ALLOWED_SORT_FIELDS = set(SORT_FIELD_MAP.values()) | {
    "project_id", "project_name", "pm", "dt_lead", "it_lead",
    "create_at", "ai_related",
}


def _map_project(row) -> dict:
    """Convert a DB row (RowMapping) to the camelCase API shape."""
    r = row._mapping if hasattr(row, "_mapping") else row
    return {
        "id": r["id"],
        "projectId": r["project_id"],
        "name": r["project_name"],
        "projectName": r["project_name"],
        "type": r["type"],
        "startDate": r["start_date"],
        "goLiveDate": r["go_live_date"],
        "ppsExitDate": r["pps_exit_date"],
        "endDate": r["end_date"],
        "pmName": r["pm"],
        "pm": r["pm"],
        "pmItcode": r["pm_itcode"],
        "dtLeadName": r["dt_lead"],
        "dtLead": r["dt_lead"],
        "dtLeadItcode": r["dt_lead_itcode"],
        "itLeadName": r["it_lead"],
        "itLead": r["it_lead"],
        "itLeadItcode": r["it_lead_itcode"],
        "duration": r["duration"],
        "objectives": r["objectives"],
        "investmentCost": r["investment_cost"],
        "yearlyMaCost": r["yearly_ma_cost"],
        "currency": r["currency"],
        "expectedManDays": r["expected_man_days"],
        "status": r["status"],
        "comment": r["comment"],
        "eaReviewType": r["ea_review_type"],
        "domainEaReviewer": r["domain_ea_reviewer"],
        "favourite": r["favourite"],
        "overallStatus": r["overall_status"],
        "approvedTime": r["approved_time"],
        "source": r["source"],
        "eaApprovalDt": r["ea_approval_dt"],
        "aiRelated": r["ai_related"],
        "createdBy": r["create_by"],
        "createdAt": r["create_at"],
        "updatedAt": r["update_at"],
    }


# ── GET /api/projects ────────────────────────────────────────────

@router.get("")
async def list_projects(
    pagination: PaginationParams = Depends(),
    projectId: str | None = Query(None),
    name: str | None = Query(None),
    itCode: str | None = Query(None),
    requestStatus: str | None = Query(None),
    aiRelated: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        conditions: list[str] = []
        params: dict = {}

        if projectId:
            conditions.append("project_id ILIKE :projectId")
            params["projectId"] = f"%{projectId}%"
        if name:
            conditions.append("project_name ILIKE :name")
            params["name"] = f"%{name}%"
        if itCode:
            conditions.append("it_lead ILIKE :itCode")
            params["itCode"] = f"%{itCode}%"
        if requestStatus:
            conditions.append(multi_value_condition("status", "requestStatus", requestStatus, params))
        if aiRelated:
            ai_vals = [v.strip() for v in aiRelated.split(",") if v.strip()]
            mapped = ["Yes" if v.lower() in ("true", "yes") else "No" for v in ai_vals]
            conditions.append(multi_value_condition("ai_related", "aiRelated", ",".join(mapped), params))

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        # Sort
        db_sort_field = SORT_FIELD_MAP.get(pagination.sort_field, pagination.sort_field) if pagination.sort_field else "project_id"
        if db_sort_field not in ALLOWED_SORT_FIELDS:
            db_sort_field = "project_id"
        sort_order = "ASC" if pagination.sort_order and pagination.sort_order.lower() == "asc" else "DESC"

        data_query = text(
            f"SELECT * FROM eam.project WHERE {where_clause} "
            f"ORDER BY {db_sort_field} {sort_order} "
            f"LIMIT :limit OFFSET :offset"
        )
        count_query = text(
            f"SELECT COUNT(*) FROM eam.project WHERE {where_clause}"
        )

        params["limit"] = pagination.page_size
        params["offset"] = pagination.offset

        result = await db.execute(data_query, params)
        rows = result.mappings().all()

        count_result = await db.execute(count_query, {k: v for k, v in params.items() if k not in ("limit", "offset")})
        total = count_result.scalar_one()

        return paginated_response(
            [_map_project(r) for r in rows],
            total,
            pagination.page,
            pagination.page_size,
        )
    except Exception as e:
        print(f"Error fetching projects: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch projects")


# ── GET /api/projects/{project_id} ───────────────────────────────

@router.get("/{project_id}")
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(
            text("SELECT * FROM eam.project WHERE project_id = :pid"),
            {"pid": project_id},
        )
        row = result.mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Project not found")
        return _map_project(row)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching project: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch project")


# ── POST /api/projects ───────────────────────────────────────────

@router.post("", status_code=201)
async def create_project(
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(
            text("""
                INSERT INTO eam.project (
                    project_name, type, start_date, go_live_date, pps_exit_date, end_date,
                    pm, pm_itcode, dt_lead, dt_lead_itcode, it_lead, it_lead_itcode,
                    duration, objectives, investment_cost, yearly_ma_cost, currency,
                    expected_man_days, status, comment, ea_review_type, domain_ea_reviewer,
                    ai_related, source, create_by
                ) VALUES (
                    :project_name, :type, :start_date, :go_live_date, :pps_exit_date, :end_date,
                    :pm, :pm_itcode, :dt_lead, :dt_lead_itcode, :it_lead, :it_lead_itcode,
                    :duration, :objectives, :investment_cost, :yearly_ma_cost, :currency,
                    :expected_man_days, 'Active', :comment, :ea_review_type, :domain_ea_reviewer,
                    :ai_related, :source, :create_by
                ) RETURNING *
            """),
            {
                "project_name": body.get("projectName"),
                "type": body.get("type"),
                "start_date": body.get("startDate"),
                "go_live_date": body.get("goLiveDate"),
                "pps_exit_date": body.get("ppsExitDate"),
                "end_date": body.get("endDate"),
                "pm": body.get("pm"),
                "pm_itcode": body.get("pmItcode"),
                "dt_lead": body.get("dtLead"),
                "dt_lead_itcode": body.get("dtLeadItcode"),
                "it_lead": body.get("itLead"),
                "it_lead_itcode": body.get("itLeadItcode"),
                "duration": body.get("duration"),
                "objectives": body.get("objectives"),
                "investment_cost": body.get("investmentCost"),
                "yearly_ma_cost": body.get("yearlyMaCost"),
                "currency": body.get("currency"),
                "expected_man_days": body.get("expectedManDays"),
                "comment": body.get("comment"),
                "ea_review_type": body.get("eaReviewType"),
                "domain_ea_reviewer": body.get("domainEaReviewer"),
                "ai_related": body.get("aiRelated"),
                "source": body.get("source"),
                "create_by": body.get("createdBy"),
            },
        )
        row = result.mappings().first()
        await db.commit()
        return _map_project(row)
    except Exception as e:
        await db.rollback()
        print(f"Error creating project: {e}")
        raise HTTPException(status_code=500, detail="Failed to create project")


# ── PUT /api/projects/{project_id} ───────────────────────────────

@router.put("/{project_id}")
async def update_project(
    project_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    try:
        # Check existence
        existing = await db.execute(
            text("SELECT id FROM eam.project WHERE project_id = :pid"),
            {"pid": project_id},
        )
        row = existing.mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Project not found")

        db_id = row["id"]

        # Build dynamic SET clause
        field_mapping = {
            "projectName": "project_name",
            "type": "type",
            "startDate": "start_date",
            "goLiveDate": "go_live_date",
            "ppsExitDate": "pps_exit_date",
            "endDate": "end_date",
            "pm": "pm",
            "pmItcode": "pm_itcode",
            "dtLead": "dt_lead",
            "dtLeadItcode": "dt_lead_itcode",
            "itLead": "it_lead",
            "itLeadItcode": "it_lead_itcode",
            "duration": "duration",
            "objectives": "objectives",
            "investmentCost": "investment_cost",
            "yearlyMaCost": "yearly_ma_cost",
            "currency": "currency",
            "expectedManDays": "expected_man_days",
            "status": "status",
            "comment": "comment",
            "eaReviewType": "ea_review_type",
            "domainEaReviewer": "domain_ea_reviewer",
            "favourite": "favourite",
            "overallStatus": "overall_status",
            "aiRelated": "ai_related",
            "source": "source",
            "updatedBy": "update_by",
        }

        set_parts = ["update_at = NOW()"]
        params: dict = {"db_id": db_id}

        for api_field, db_col in field_mapping.items():
            if api_field in body:
                param_name = f"u_{db_col}"
                set_parts.append(f"{db_col} = :{param_name}")
                params[param_name] = body[api_field]

        set_clause = ", ".join(set_parts)

        result = await db.execute(
            text(f"UPDATE eam.project SET {set_clause} WHERE id = :db_id RETURNING *"),
            params,
        )
        updated = result.mappings().first()
        await db.commit()
        return _map_project(updated)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error updating project: {e}")
        raise HTTPException(status_code=500, detail="Failed to update project")

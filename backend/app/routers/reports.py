"""Reports router — lead-time report with process log enrichment."""
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db
from app.utils.pagination import PaginationParams, paginated_response

router = APIRouter()


def _isoformat_or_none(val) -> str | None:
    """Safely convert a datetime to ISO string, or return None."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.isoformat()
    # Already a string (e.g. from DB driver)
    return str(val)


# ── GET /api/reports/lead-time ───────────────────────────────────

@router.get("/lead-time")
async def lead_time_report(
    pagination: PaginationParams = Depends(),
    projectId: str | None = Query(None),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        # ── Build request query ──────────────────────────────────
        conditions: list[str] = []
        params: dict = {}

        if projectId:
            conditions.append("project_id ILIKE :projectId")
            params["projectId"] = f"%{projectId}%"
        if status:
            conditions.append("status = :status")
            params["status"] = status

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        data_query = text(
            f"SELECT * FROM eam.eam_request WHERE {where_clause} "
            f"ORDER BY create_at DESC "
            f"LIMIT :limit OFFSET :offset"
        )
        count_query = text(
            f"SELECT COUNT(*) FROM eam.eam_request WHERE {where_clause}"
        )

        params["limit"] = pagination.page_size
        params["offset"] = pagination.offset

        result = await db.execute(data_query, params)
        requests = result.mappings().all()

        count_result = await db.execute(count_query, {k: v for k, v in params.items() if k not in ("limit", "offset")})
        total = count_result.scalar_one()

        # ── Enrich each request with project name + process log ──
        results: list[dict] = []

        for req in requests:
            request_id = req["request_id"]
            project_id_val = req["project_id"] or ""

            # Fetch project name
            proj_result = await db.execute(
                text("SELECT project_name FROM eam.project WHERE project_id = :pid"),
                {"pid": project_id_val},
            )
            proj_row = proj_result.mappings().first()
            project_name = proj_row["project_name"] if proj_row else ""

            # Fetch process logs ordered by create_at ASC
            logs_result = await db.execute(
                text(
                    "SELECT action, create_at FROM eam.eam_request_process_log "
                    "WHERE request_id = :rid ORDER BY create_at ASC"
                ),
                {"rid": request_id},
            )
            logs = logs_result.mappings().all()

            # Extract timestamps from process log
            draft_time = req["create_at"]
            in_progress_time = None
            completed_time = None

            for log in logs:
                action = (log["action"] or "").lower()
                if "in progress" in action or "submit" in action or "accept" in action:
                    if in_progress_time is None:
                        in_progress_time = log["create_at"]
                if "complete" in action or "approved" in action or "close" in action:
                    completed_time = log["create_at"]

            # Calculate total lead time in days
            total_lead_time_days: int | None = None
            if draft_time and completed_time:
                dt_draft = draft_time if isinstance(draft_time, datetime) else datetime.fromisoformat(str(draft_time))
                dt_completed = completed_time if isinstance(completed_time, datetime) else datetime.fromisoformat(str(completed_time))
                total_lead_time_days = round(
                    (dt_completed - dt_draft).total_seconds() / (60 * 60 * 24)
                )

            results.append({
                "id": req["id"],
                "requestId": request_id,
                "projectId": req["project_id"],
                "projectName": project_name,
                "overallStatus": req["status"],
                "draftTime": _isoformat_or_none(draft_time),
                "inProgressTime": _isoformat_or_none(in_progress_time),
                "completedTime": _isoformat_or_none(completed_time),
                "totalLeadTimeDays": total_lead_time_days,
            })

        return paginated_response(results, total, pagination.page, pagination.page_size)
    except Exception as e:
        print(f"Error generating lead time report: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate lead time report")

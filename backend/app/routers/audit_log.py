"""Audit log router — Audit logs, process logs, email logs."""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db
from app.utils.pagination import PaginationParams, paginated_response

router = APIRouter()

# ── Sort field whitelist for audit log ──────────────────────────

AUDIT_SORT_FIELD_MAP: dict[str, str] = {
    "createdAt": "create_time",
}

AUDIT_ALLOWED_SORT_FIELDS = set(AUDIT_SORT_FIELD_MAP.values()) | {
    "create_time", "object_type", "field", "create_by",
}


# ═══════════════════════════════════════════════════════════════
# Audit Log (Field Change Log)
# ═══════════════════════════════════════════════════════════════

@router.get("/audit-log")
async def list_audit_log(
    pagination: PaginationParams = Depends(),
    projectId: str | None = Query(None),
    objectType: str | None = Query(None),
    field: str | None = Query(None),
    createBy: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        conditions: list[str] = []
        params: dict = {}

        if projectId:
            conditions.append("project_id = :projectId")
            params["projectId"] = projectId
        if objectType:
            conditions.append("object_type = :objectType")
            params["objectType"] = objectType
        if field:
            conditions.append("field ILIKE :field")
            params["field"] = f"%{field}%"
        if createBy:
            conditions.append("create_by ILIKE :createBy")
            params["createBy"] = f"%{createBy}%"

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        # Sort
        db_sort_field = AUDIT_SORT_FIELD_MAP.get(pagination.sort_field, pagination.sort_field) if pagination.sort_field else "create_time"
        if db_sort_field not in AUDIT_ALLOWED_SORT_FIELDS:
            db_sort_field = "create_time"
        sort_order = "ASC" if pagination.sort_order and pagination.sort_order.lower() == "asc" else "DESC"

        data_query = text(
            f"SELECT * FROM eam.eam_audit_log WHERE {where_clause} "
            f"ORDER BY {db_sort_field} {sort_order} "
            f"LIMIT :limit OFFSET :offset"
        )
        count_query = text(
            f"SELECT COUNT(*) FROM eam.eam_audit_log WHERE {where_clause}"
        )

        params["limit"] = pagination.page_size
        params["offset"] = pagination.offset

        result = await db.execute(data_query, params)
        rows = result.mappings().all()

        count_params = {k: v for k, v in params.items() if k not in ("limit", "offset")}
        count_result = await db.execute(count_query, count_params)
        total = count_result.scalar_one()

        mapped = [
            {
                "id": r["id"],
                "objectType": r["object_type"],
                "objectId": r["object_id"],
                "field": r["field"],
                "oldValue": r["old_value"],
                "newValue": r["new_value"],
                "createdBy": r["create_by"],
                "createdAt": r["create_time"],
                "projectId": r["project_id"],
            }
            for r in rows
        ]

        return paginated_response(mapped, total, pagination.page, pagination.page_size)
    except Exception as e:
        print(f"Error fetching audit log: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch audit log")


# ═══════════════════════════════════════════════════════════════
# Process Log
# ═══════════════════════════════════════════════════════════════

@router.get("/process-logs")
async def list_process_logs(
    requestId: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        conditions: list[str] = []
        params: dict = {}

        if requestId:
            conditions.append("request_id = :requestId")
            params["requestId"] = requestId

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        result = await db.execute(
            text(f"SELECT * FROM eam.eam_request_process_log WHERE {where_clause} ORDER BY create_at DESC"),
            params,
        )
        rows = result.mappings().all()

        return [
            {
                "id": r["id"],
                "requestId": r["request_id"],
                "action": r["action"],
                "comment": r["comment"],
                "operator": r["operator"],
                "createdAt": r["create_at"],
            }
            for r in rows
        ]
    except Exception as e:
        print(f"Error fetching process logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch process logs")


# ═══════════════════════════════════════════════════════════════
# Email Logs — Actions
# ═══════════════════════════════════════════════════════════════

@router.get("/email-logs/actions")
async def list_action_email_logs(
    pagination: PaginationParams = Depends(),
    projectId: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        conditions: list[str] = []
        params: dict = {}

        if projectId:
            conditions.append("project_id = :projectId")
            params["projectId"] = projectId

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        data_query = text(
            f"SELECT * FROM eam.eam_actions_email_log WHERE {where_clause} "
            f"ORDER BY log_time DESC "
            f"LIMIT :limit OFFSET :offset"
        )
        count_query = text(
            f"SELECT COUNT(*) FROM eam.eam_actions_email_log WHERE {where_clause}"
        )

        params["limit"] = pagination.page_size
        params["offset"] = pagination.offset

        result = await db.execute(data_query, params)
        rows = result.mappings().all()

        count_params = {k: v for k, v in params.items() if k not in ("limit", "offset")}
        count_result = await db.execute(count_query, count_params)
        total = count_result.scalar_one()

        mapped = [
            {
                "id": r["id"],
                "projectId": r["project_id"],
                "meetingId": r["meeting_id"],
                "actionId": r["action_id"],
                "logTime": r["log_time"],
                "from": r["from"],
                "recipients": r["recipients"],
                "subject": r["subject"],
                "status": r["status"],
            }
            for r in rows
        ]

        return paginated_response(mapped, total, pagination.page, pagination.page_size)
    except Exception as e:
        print(f"Error fetching action email logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch action email logs")


# ═══════════════════════════════════════════════════════════════
# Email Logs — Meetings
# ═══════════════════════════════════════════════════════════════

@router.get("/email-logs/meetings")
async def list_meeting_email_logs(
    pagination: PaginationParams = Depends(),
    projectId: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        conditions: list[str] = []
        params: dict = {}

        if projectId:
            conditions.append("l.project_id = :projectId")
            params["projectId"] = projectId

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        data_query = text(
            f"SELECT l.* FROM eam.eam_meetings_email_log l WHERE {where_clause} "
            f"ORDER BY l.log_time DESC "
            f"LIMIT :limit OFFSET :offset"
        )
        count_query = text(
            f"SELECT COUNT(*) FROM eam.eam_meetings_email_log l WHERE {where_clause}"
        )

        params["limit"] = pagination.page_size
        params["offset"] = pagination.offset

        result = await db.execute(data_query, params)
        rows = result.mappings().all()

        count_params = {k: v for k, v in params.items() if k not in ("limit", "offset")}
        count_result = await db.execute(count_query, count_params)
        total = count_result.scalar_one()

        # Resolve projectId from meetings table when email log has null/invalid project_id
        meeting_ids = list({r["meeting_id"] for r in rows if r["meeting_id"]})
        meeting_map: dict[str, str] = {}

        if meeting_ids:
            ph = ", ".join([f":mid_{i}" for i in range(len(meeting_ids))])
            mid_params = {f"mid_{i}": mid for i, mid in enumerate(meeting_ids)}

            meeting_result = await db.execute(
                text(f"SELECT id, project_id FROM eam.eam_meetings WHERE id IN ({ph})"),
                mid_params,
            )
            for mr in meeting_result.mappings().all():
                meeting_map[mr["id"]] = mr["project_id"]

        mapped = []
        for r in rows:
            pid = r["project_id"]
            if pid:
                pid = pid.strip()
            resolved_project_id = pid if (pid and pid != "null") else meeting_map.get(r["meeting_id"])
            mapped.append({
                "id": r["id"],
                "projectId": resolved_project_id,
                "meetingId": r["meeting_id"],
                "logTime": r["log_time"],
                "from": r["from"],
                "recipients": r["recipients"],
                "subject": r["subject"],
                "status": r["status"],
            })

        return paginated_response(mapped, total, pagination.page, pagination.page_size)
    except Exception as e:
        print(f"Error fetching meeting email logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch meeting email logs")

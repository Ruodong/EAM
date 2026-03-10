"""Actions router — CRUD with pagination, filtering, sorting, stats, enrichment."""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime

from app.database import get_db
from app.utils.pagination import PaginationParams, paginated_response
from app.utils.filters import multi_value_condition

from app.auth import require_permission, require_role, Role

router = APIRouter()

# ── Sort field whitelist ────────────────────────────────────────

SORT_FIELD_MAP: dict[str, str] = {
    "actionId": "action_no",
    "actionNo": "action_no",
    "title": "action_title",
    "projectId": "project_id",
    "type": "type",
    "closeDate": "close_date",
    "dueDate": "due_date",
    "requestedBy": "requested_by",
    "assigneeName": "assignee_name",
    "applicableDomain": "applicable_domain",
    "status": "status",
    "requestId": "request_id",
    "createdAt": "create_at",
}

ALLOWED_SORT_FIELDS = set(SORT_FIELD_MAP.values()) | set(SORT_FIELD_MAP.keys())


def _map_action(r) -> dict:
    """Convert a DB row (RowMapping) to the camelCase API shape."""
    m = r._mapping if hasattr(r, "_mapping") else r
    return {
        "id": m["id"],
        "actionNo": int(m["action_no"]) if m["action_no"] is not None else None,
        "actionId": int(m["action_no"]) if m["action_no"] is not None else None,
        "title": m["action_title"],
        "actionTitle": m["action_title"],
        "projectId": m["project_id"],
        "meetingId": m["meeting_id"],
        "priority": m["priority"],
        "dueDate": m["due_date"],
        "closeDate": m["close_date"],
        "startDate": m["start_date"],
        "openDate": m["open_date"],
        "assignee": m["assignee"],
        "assigneeName": m["assignee_name"],
        "actionDescription": m["action_description"],
        "status": m["status"],
        "type": m["type"],
        "requestedBy": m["requested_by"],
        "requestedByName": m["requested_by_name"],
        "actionUpdates": m["action_updates"],
        "applicableDomain": m["applicable_domain"],
        "createdAt": m["create_at"],
        "updatedAt": m["update_at"],
        "createdBy": m["create_by"],
        "requestId": m["request_id"],
    }


# ── GET /api/actions ────────────────────────────────────────────

@router.get("", dependencies=[Depends(require_permission("action", "read"))])
async def list_actions(
    pagination: PaginationParams = Depends(),
    title: str | None = Query(None),
    requestId: str | None = Query(None),
    projectId: str | None = Query(None),
    status: str | None = Query(None),
    assigneeName: str | None = Query(None),
    priority: str | None = Query(None),
    reviewerName: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        conditions: list[str] = []
        params: dict = {}

        if title:
            conditions.append("a.action_title ILIKE :title")
            params["title"] = f"%{title}%"
        if requestId:
            conditions.append("a.request_id = :requestId")
            params["requestId"] = requestId
        if projectId:
            conditions.append("a.project_id = :projectId")
            params["projectId"] = projectId
        if status:
            conditions.append(multi_value_condition("a.status", "status", status, params))
        if priority:
            conditions.append(multi_value_condition("a.priority", "priority", priority, params))

        # Resolve reviewerName -> project_id list
        if reviewerName:
            reviewer_result = await db.execute(
                text("""
                    SELECT DISTINCT r.project_id
                    FROM eam.eam_request r
                    JOIN eam.eam_bigea_team_members t ON t.itcode = ANY(r.assign_reviewer)
                    WHERE t.name = :reviewerName AND r.project_id IS NOT NULL
                """),
                {"reviewerName": reviewerName},
            )
            pids = [row[0] for row in reviewer_result.fetchall()]
            if not pids:
                return {
                    **paginated_response([], 0, pagination.page, pagination.page_size),
                    "stats": {"total": 0, "open": 0, "inValidation": 0, "closed": 0},
                }
            placeholders = ", ".join([f":pid_{i}" for i in range(len(pids))])
            conditions.append(f"a.project_id IN ({placeholders})")
            for i, pid in enumerate(pids):
                params[f"pid_{i}"] = pid

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        # Sort
        db_sort_field = SORT_FIELD_MAP.get(pagination.sort_field, pagination.sort_field) if pagination.sort_field else "action_no"
        if db_sort_field not in ALLOWED_SORT_FIELDS:
            db_sort_field = "action_no"
        sort_order = "ASC" if pagination.sort_order and pagination.sort_order.lower() == "asc" else "DESC"

        data_query = text(
            f"SELECT a.* FROM eam.eam_actions a WHERE {where_clause} "
            f"ORDER BY {db_sort_field} {sort_order} "
            f"LIMIT :limit OFFSET :offset"
        )
        count_query = text(
            f"SELECT COUNT(*) FROM eam.eam_actions a WHERE {where_clause}"
        )

        # Stats queries — count by status using same base filter
        open_query = text(
            f"SELECT COUNT(*) FROM eam.eam_actions a WHERE ({where_clause}) AND a.status = 'Open'"
        )
        validation_query = text(
            f"SELECT COUNT(*) FROM eam.eam_actions a WHERE ({where_clause}) AND a.status = 'In Validation'"
        )
        closed_query = text(
            f"SELECT COUNT(*) FROM eam.eam_actions a WHERE ({where_clause}) AND a.status = 'Closed'"
        )

        params["limit"] = pagination.page_size
        params["offset"] = pagination.offset

        count_params = {k: v for k, v in params.items() if k not in ("limit", "offset")}

        # Execute all queries
        result = await db.execute(data_query, params)
        rows = result.mappings().all()

        total_result = await db.execute(count_query, count_params)
        total = total_result.scalar_one()

        open_result = await db.execute(open_query, count_params)
        open_count = open_result.scalar_one()

        validation_result = await db.execute(validation_query, count_params)
        validation_count = validation_result.scalar_one()

        closed_result = await db.execute(closed_query, count_params)
        closed_count = closed_result.scalar_one()

        actions = [_map_action(r) for r in rows]

        # Enrich with projectName and requestName
        project_ids = list({a["projectId"] for a in actions if a["projectId"]})
        proj_map: dict[str, str] = {}
        req_map: dict[str, str] = {}

        if project_ids:
            ph = ", ".join([f":enr_pid_{i}" for i in range(len(project_ids))])
            enr_params = {f"enr_pid_{i}": pid for i, pid in enumerate(project_ids)}

            proj_result = await db.execute(
                text(f"SELECT project_id, project_name FROM eam.project WHERE project_id IN ({ph})"),
                enr_params,
            )
            for pr in proj_result.mappings().all():
                proj_map[pr["project_id"]] = pr["project_name"]

            req_result = await db.execute(
                text(f"SELECT project_id, request_id FROM eam.eam_request WHERE project_id IN ({ph})"),
                enr_params,
            )
            for rr in req_result.mappings().all():
                req_map[rr["project_id"]] = rr["request_id"]

        enriched = []
        for a in actions:
            a["projectName"] = proj_map.get(a["projectId"], "")
            a["requestName"] = req_map.get(a["projectId"], "")
            enriched.append(a)

        return {
            **paginated_response(enriched, total, pagination.page, pagination.page_size),
            "stats": {
                "total": total,
                "open": open_count,
                "inValidation": validation_count,
                "closed": closed_count,
            },
        }
    except Exception as e:
        print(f"Error fetching actions: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch actions")


# ── GET /api/actions/{actionNo} ─────────────────────────────────

@router.get("/{actionNo}", dependencies=[Depends(require_permission("action", "read"))])
async def get_action(
    actionNo: int,
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(
            text("SELECT * FROM eam.eam_actions WHERE action_no = :ano"),
            {"ano": actionNo},
        )
        row = result.mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Action not found")
        return _map_action(row)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching action: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch action")


# ── POST /api/actions ───────────────────────────────────────────

@router.post("", status_code=201, dependencies=[Depends(require_permission("action", "write"))])
async def create_action(
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    try:
        required = ["projectId", "actionTitle", "priority", "actionDescription",
                     "type", "requestedBy", "requestedByName", "applicableDomain"]
        missing = [f for f in required if not body.get(f)]
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Required fields: {', '.join(required)}",
            )

        now = datetime.now()

        result = await db.execute(
            text("""
                INSERT INTO eam.eam_actions (
                    project_id, meeting_id, action_title, priority, due_date,
                    start_date, open_date, assignee, assignee_name, action_description,
                    status, type, requested_by, requested_by_name, action_updates,
                    applicable_domain, create_by, create_at, update_at, request_id
                ) VALUES (
                    :project_id, :meeting_id, :action_title, :priority, :due_date,
                    :start_date, :open_date, :assignee, :assignee_name, :action_description,
                    'Open', :type, :requested_by, :requested_by_name, :action_updates,
                    :applicable_domain, :create_by, :create_at, :update_at, :request_id
                ) RETURNING *
            """),
            {
                "project_id": body["projectId"],
                "meeting_id": body.get("meetingId"),
                "action_title": body["actionTitle"],
                "priority": body["priority"],
                "due_date": body.get("dueDate"),
                "start_date": body.get("startDate"),
                "open_date": now,
                "assignee": body.get("assignee", []),
                "assignee_name": body.get("assigneeName", []),
                "action_description": body["actionDescription"],
                "type": body["type"],
                "requested_by": body["requestedBy"],
                "requested_by_name": body["requestedByName"],
                "action_updates": body.get("actionUpdates"),
                "applicable_domain": body["applicableDomain"],
                "create_by": body.get("createdBy"),
                "create_at": now,
                "update_at": now,
                "request_id": body.get("requestId"),
            },
        )
        created = result.mappings().first()
        await db.commit()
        return _map_action(created)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error creating action: {e}")
        raise HTTPException(status_code=500, detail="Failed to create action")


# ── PUT /api/actions/{actionNo} ─────────────────────────────────

@router.put("/{actionNo}", dependencies=[Depends(require_permission("action", "write"))])
async def update_action(
    actionNo: int,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    try:
        existing = await db.execute(
            text("SELECT id, status FROM eam.eam_actions WHERE action_no = :ano"),
            {"ano": actionNo},
        )
        row = existing.mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Action not found")

        db_id = row["id"]
        old_status = row["status"]

        field_mapping = {
            "actionTitle": "action_title",
            "priority": "priority",
            "dueDate": "due_date",
            "startDate": "start_date",
            "closeDate": "close_date",
            "assignee": "assignee",
            "assigneeName": "assignee_name",
            "actionDescription": "action_description",
            "type": "type",
            "requestedBy": "requested_by",
            "requestedByName": "requested_by_name",
            "actionUpdates": "action_updates",
            "applicableDomain": "applicable_domain",
            "updatedBy": "update_by",
            "requestId": "request_id",
        }

        set_parts = ["update_at = NOW()"]
        params: dict = {"db_id": db_id}

        for api_field, db_col in field_mapping.items():
            if api_field in body:
                param_name = f"u_{db_col}"
                set_parts.append(f"{db_col} = :{param_name}")
                params[param_name] = body[api_field]

        # Handle status transitions
        new_status = body.get("status")
        if new_status is not None and new_status != old_status:
            set_parts.append("status = :u_status")
            params["u_status"] = new_status

            if new_status == "In Validation":
                set_parts.append("in_validtion_date = NOW()")

            if new_status == "Closed":
                # Use provided closeDate or default to now
                if "closeDate" not in body:
                    set_parts.append("close_date = NOW()")
        elif new_status is not None:
            # Status provided but same — still set it
            set_parts.append("status = :u_status")
            params["u_status"] = new_status

        set_clause = ", ".join(set_parts)

        result = await db.execute(
            text(f"UPDATE eam.eam_actions SET {set_clause} WHERE id = :db_id RETURNING *"),
            params,
        )
        updated = result.mappings().first()
        await db.commit()
        return _map_action(updated)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error updating action: {e}")
        raise HTTPException(status_code=500, detail="Failed to update action")


# ── DELETE /api/actions/{actionNo} ──────────────────────────────

@router.delete("/{actionNo}", dependencies=[Depends(require_permission("action", "write"))])
async def delete_action(
    actionNo: int,
    db: AsyncSession = Depends(get_db),
):
    try:
        existing = await db.execute(
            text("SELECT id FROM eam.eam_actions WHERE action_no = :ano"),
            {"ano": actionNo},
        )
        row = existing.mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Action not found")

        await db.execute(
            text("DELETE FROM eam.eam_actions WHERE id = :db_id"),
            {"db_id": row["id"]},
        )
        await db.commit()
        return {"message": "Action deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error deleting action: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete action")

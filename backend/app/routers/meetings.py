"""Meetings router — CRUD with pagination, filtering, sorting, enrichment."""
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime, timezone

from app.database import get_db
from app.utils.pagination import PaginationParams, paginated_response
from app.utils.filters import multi_value_condition

router = APIRouter()

# ── Sort field whitelist ────────────────────────────────────────

SORT_FIELD_MAP: dict[str, str] = {
    "meetingNo": "meeting_no",
    "title": "meeting_title",
    "projectId": "project_id",
    "startTime": "start_time",
    "endTime": "end_time",
    "status": "status",
    "requestId": "request_id",
    "createdAt": "create_at",
}

ALLOWED_SORT_FIELDS = set(SORT_FIELD_MAP.values()) | set(SORT_FIELD_MAP.keys())


def _map_meeting(r) -> dict:
    """Convert a DB row (RowMapping) to the camelCase API shape."""
    m = r._mapping if hasattr(r, "_mapping") else r
    return {
        "id": m["id"],
        "meetingNo": int(m["meeting_no"]) if m["meeting_no"] is not None else None,
        "title": m["meeting_title"],
        "meetingTitle": m["meeting_title"],
        "projectId": m["project_id"],
        "projectObjectives": m["project_objectives"],
        "availableEaSchedule": m["available_ea_schedule"],
        "startTime": m["start_time"],
        "endTime": m["end_time"],
        "presenter": m["presenter"],
        "attendees": m["attendees"],
        "location": m["location"],
        "meetingAgenda": m["meeting_agenda"],
        "keyAgreementFindings": m["key_agreement_findings"],
        "reviewDecks": m["review_decks"],
        "reviewRecording": m["review_recording"],
        "status": m["status"],
        "calendarId": m["calendar_id"],
        "statusRemark": m["status_remark"],
        "eaReviewResult": m["ea_review_result"],
        "eaReviewRemark": m["ea_review_remark"],
        "emailCC": m["email_cc"],
        "createdBy": m["create_by"],
        "createdAt": m["create_at"],
        "updatedAt": m["update_at"],
        "requestId": m["request_id"],
    }


# ── GET /api/meetings ───────────────────────────────────────────

@router.get("")
async def list_meetings(
    pagination: PaginationParams = Depends(),
    title: str | None = Query(None),
    requestId: str | None = Query(None),
    projectId: str | None = Query(None),
    status: str | None = Query(None),
    reviewerName: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        conditions: list[str] = []
        params: dict = {}

        if title:
            conditions.append("m.meeting_title ILIKE :title")
            params["title"] = f"%{title}%"
        if requestId:
            conditions.append("m.request_id = :requestId")
            params["requestId"] = requestId
        if projectId:
            conditions.append("m.project_id = :projectId")
            params["projectId"] = projectId
        if status:
            conditions.append(multi_value_condition("m.status", "status", status, params))

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
                return paginated_response([], 0, pagination.page, pagination.page_size)
            placeholders = ", ".join([f":pid_{i}" for i in range(len(pids))])
            conditions.append(f"m.project_id IN ({placeholders})")
            for i, pid in enumerate(pids):
                params[f"pid_{i}"] = pid

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        # Sort
        db_sort_field = SORT_FIELD_MAP.get(pagination.sort_field, pagination.sort_field) if pagination.sort_field else "meeting_no"
        if db_sort_field not in ALLOWED_SORT_FIELDS:
            db_sort_field = "meeting_no"
        sort_order = "ASC" if pagination.sort_order and pagination.sort_order.lower() == "asc" else "DESC"

        data_query = text(
            f"SELECT m.* FROM eam.eam_meetings m WHERE {where_clause} "
            f"ORDER BY {db_sort_field} {sort_order} "
            f"LIMIT :limit OFFSET :offset"
        )
        count_query = text(
            f"SELECT COUNT(*) FROM eam.eam_meetings m WHERE {where_clause}"
        )

        params["limit"] = pagination.page_size
        params["offset"] = pagination.offset

        result = await db.execute(data_query, params)
        rows = result.mappings().all()

        count_params = {k: v for k, v in params.items() if k not in ("limit", "offset")}
        count_result = await db.execute(count_query, count_params)
        total = count_result.scalar_one()

        meetings = [_map_meeting(r) for r in rows]

        # Enrich with projectName and requestName
        project_ids = list({m["projectId"] for m in meetings if m["projectId"]})
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
        for m in meetings:
            m["projectName"] = proj_map.get(m["projectId"], "")
            m["requestName"] = req_map.get(m["projectId"], "")
            enriched.append(m)

        return paginated_response(enriched, total, pagination.page, pagination.page_size)
    except Exception as e:
        print(f"Error fetching meetings: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch meetings")


# ── GET /api/meetings/{meetingNo} ───────────────────────────────

@router.get("/{meetingNo}")
async def get_meeting(
    meetingNo: int,
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(
            text("SELECT * FROM eam.eam_meetings WHERE meeting_no = :mno"),
            {"mno": meetingNo},
        )
        row = result.mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Meeting not found")
        return _map_meeting(row)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching meeting: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch meeting")


# ── POST /api/meetings ──────────────────────────────────────────

@router.post("", status_code=201)
async def create_meeting(
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    try:
        project_id = body.get("projectId")
        meeting_title = body.get("meetingTitle")
        start_time = body.get("startTime")
        end_time = body.get("endTime")

        if not project_id or not meeting_title or not start_time or not end_time:
            raise HTTPException(
                status_code=400,
                detail="projectId, meetingTitle, startTime, and endTime are required",
            )

        now = datetime.now(timezone.utc)

        result = await db.execute(
            text("""
                INSERT INTO eam.eam_meetings (
                    project_id, project_objectives, meeting_title, available_ea_schedule,
                    start_time, end_time, presenter, attendees, location, meeting_agenda,
                    key_agreement_findings, review_decks, review_recording, status,
                    calendar_id, status_remark, ea_review_result, ea_review_remark,
                    email_cc, create_by, create_at, update_at, request_id
                ) VALUES (
                    :project_id, :project_objectives, :meeting_title, :available_ea_schedule,
                    :start_time, :end_time, :presenter, :attendees, :location, :meeting_agenda,
                    :key_agreement_findings, :review_decks, :review_recording, 'Scheduled',
                    :calendar_id, :status_remark, :ea_review_result, :ea_review_remark,
                    :email_cc, :create_by, :create_at, :update_at, :request_id
                ) RETURNING *
            """),
            {
                "project_id": project_id,
                "project_objectives": body.get("projectObjectives"),
                "meeting_title": meeting_title,
                "available_ea_schedule": body.get("availableEaSchedule"),
                "start_time": start_time,
                "end_time": end_time,
                "presenter": body.get("presenter", []),
                "attendees": body.get("attendees", []),
                "location": body.get("location"),
                "meeting_agenda": body.get("meetingAgenda", ""),
                "key_agreement_findings": body.get("keyAgreementFindings"),
                "review_decks": body.get("reviewDecks", []),
                "review_recording": body.get("reviewRecording", []),
                "calendar_id": body.get("calendarId"),
                "status_remark": body.get("statusRemark"),
                "ea_review_result": body.get("eaReviewResult"),
                "ea_review_remark": body.get("eaReviewRemark"),
                "email_cc": body.get("emailCC", []),
                "create_by": body.get("createdBy"),
                "create_at": now,
                "update_at": now,
                "request_id": body.get("requestId"),
            },
        )
        created = result.mappings().first()

        # If calendarId provided, mark the schedule as Booked
        calendar_id = body.get("calendarId")
        if calendar_id:
            await db.execute(
                text("""
                    UPDATE eam.eam_ea_calendar
                    SET status = 'Booked', for_project = :project_id, for_meeting = :meeting_no
                    WHERE id = :calendar_id
                """),
                {
                    "project_id": project_id,
                    "meeting_no": str(created["meeting_no"]),
                    "calendar_id": calendar_id,
                },
            )

        await db.commit()
        return _map_meeting(created)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error creating meeting: {e}")
        raise HTTPException(status_code=500, detail="Failed to create meeting")


# ── PUT /api/meetings/{meetingNo} ───────────────────────────────

@router.put("/{meetingNo}")
async def update_meeting(
    meetingNo: int,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    try:
        existing = await db.execute(
            text("SELECT id FROM eam.eam_meetings WHERE meeting_no = :mno"),
            {"mno": meetingNo},
        )
        row = existing.mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Meeting not found")

        db_id = row["id"]

        field_mapping = {
            "projectObjectives": "project_objectives",
            "meetingTitle": "meeting_title",
            "availableEaSchedule": "available_ea_schedule",
            "startTime": "start_time",
            "endTime": "end_time",
            "presenter": "presenter",
            "attendees": "attendees",
            "location": "location",
            "meetingAgenda": "meeting_agenda",
            "keyAgreementFindings": "key_agreement_findings",
            "reviewDecks": "review_decks",
            "reviewRecording": "review_recording",
            "status": "status",
            "calendarId": "calendar_id",
            "statusRemark": "status_remark",
            "eaReviewResult": "ea_review_result",
            "eaReviewRemark": "ea_review_remark",
            "emailCC": "email_cc",
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

        set_clause = ", ".join(set_parts)

        result = await db.execute(
            text(f"UPDATE eam.eam_meetings SET {set_clause} WHERE id = :db_id RETURNING *"),
            params,
        )
        updated = result.mappings().first()
        await db.commit()
        return _map_meeting(updated)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error updating meeting: {e}")
        raise HTTPException(status_code=500, detail="Failed to update meeting")

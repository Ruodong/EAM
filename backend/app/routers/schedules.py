"""Schedules router — CRUD with pagination, recurrence, stats."""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime, timedelta, timezone
from dateutil.relativedelta import relativedelta

from app.database import get_db
from app.utils.pagination import PaginationParams, paginated_response
from app.utils.filters import multi_value_condition

router = APIRouter()

# ── Sort field whitelist ────────────────────────────────────────

SORT_FIELD_MAP: dict[str, str] = {
    "scheduleNo": "schedule_no",
    "title": "schedule_title",
    "status": "status",
    "startTime": "start_time",
    "endTime": "end_time",
    "duration": "duration",
    "ownerName": "owner",
}

ALLOWED_SORT_FIELDS = set(SORT_FIELD_MAP.values()) | set(SORT_FIELD_MAP.keys())


def _map_schedule(r) -> dict:
    """Convert a DB row (RowMapping) to the camelCase API shape."""
    m = r._mapping if hasattr(r, "_mapping") else r
    owner = m["owner"]
    if isinstance(owner, list):
        owner_name = ", ".join(owner)
    else:
        owner_name = owner or ""
    return {
        "id": m["id"],
        "scheduleNo": int(m["schedule_no"]) if m["schedule_no"] is not None else None,
        "title": m["schedule_title"],
        "scheduleTitle": m["schedule_title"],
        "projectId": m.get("project_id"),
        "startTime": m["start_time"],
        "endTime": m["end_time"],
        "duration": m["duration"],
        "recurrencePattern": m["recurrence_pattern"],
        "endAfter": m["end_after"],
        "owner": m["owner"],
        "ownerName": owner_name,
        "remark": m["remark"],
        "status": m["status"],
        "forProject": m["for_project"],
        "forMeeting": m["for_meeting"],
    }


# ── GET /api/schedules ──────────────────────────────────────────

@router.get("")
async def list_schedules(
    pagination: PaginationParams = Depends(),
    status: str | None = Query(None),
    timeFrom: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        conditions: list[str] = []
        params: dict = {}

        if status:
            conditions.append(multi_value_condition("s.status", "status", status, params))
        if timeFrom:
            conditions.append("s.start_time >= :timeFrom")
            # asyncpg requires a datetime object, not a plain string
            params["timeFrom"] = datetime.fromisoformat(timeFrom).replace(tzinfo=None)

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        # Sort
        db_sort_field = SORT_FIELD_MAP.get(pagination.sort_field, pagination.sort_field) if pagination.sort_field else "schedule_no"
        if db_sort_field not in ALLOWED_SORT_FIELDS:
            db_sort_field = "schedule_no"
        sort_order = "ASC" if pagination.sort_order and pagination.sort_order.lower() == "asc" else "DESC"

        data_query = text(
            f"SELECT s.* FROM eam.eam_ea_calendar s WHERE {where_clause} "
            f"ORDER BY {db_sort_field} {sort_order} "
            f"LIMIT :limit OFFSET :offset"
        )
        count_query = text(
            f"SELECT COUNT(*) FROM eam.eam_ea_calendar s WHERE {where_clause}"
        )

        # Stats queries — global counts, not filtered
        available_query = text("SELECT COUNT(*) FROM eam.eam_ea_calendar WHERE status = 'Available'")
        booked_query = text("SELECT COUNT(*) FROM eam.eam_ea_calendar WHERE status = 'Booked'")
        expired_query = text("SELECT COUNT(*) FROM eam.eam_ea_calendar WHERE status = 'Expired'")
        completed_query = text("SELECT COUNT(*) FROM eam.eam_ea_calendar WHERE status = 'Completed'")

        params["limit"] = pagination.page_size
        params["offset"] = pagination.offset

        count_params = {k: v for k, v in params.items() if k not in ("limit", "offset")}

        result = await db.execute(data_query, params)
        rows = result.mappings().all()

        total_result = await db.execute(count_query, count_params)
        total = total_result.scalar_one()

        available_result = await db.execute(available_query)
        available_count = available_result.scalar_one()

        booked_result = await db.execute(booked_query)
        booked_count = booked_result.scalar_one()

        expired_result = await db.execute(expired_query)
        expired_count = expired_result.scalar_one()

        completed_result = await db.execute(completed_query)
        completed_count = completed_result.scalar_one()

        return {
            **paginated_response(
                [_map_schedule(r) for r in rows],
                total,
                pagination.page,
                pagination.page_size,
            ),
            "stats": {
                "total": total,
                "available": available_count,
                "booked": booked_count,
                "expired": expired_count,
                "completed": completed_count,
            },
        }
    except Exception as e:
        print(f"Error fetching schedules: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch schedules")


# ── POST /api/schedules ─────────────────────────────────────────

@router.post("", status_code=201)
async def create_schedule(
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    try:
        start_time = body.get("startTime")
        end_time = body.get("endTime")

        if not start_time or not end_time:
            raise HTTPException(status_code=400, detail="startTime and endTime are required")

        recurrence_pattern = body.get("recurrencePattern")
        end_after = body.get("endAfter")
        schedule_title = body.get("scheduleTitle")
        duration = body.get("duration")
        owner = body.get("owner", [])
        remark = body.get("remark")

        # Parse base dates — always produce naive datetimes so they are
        # compatible with TIMESTAMP WITHOUT TIME ZONE columns in Postgres.
        if isinstance(start_time, str):
            start = datetime.fromisoformat(start_time.replace("Z", "+00:00")).replace(tzinfo=None)
        else:
            start = start_time.replace(tzinfo=None) if start_time.tzinfo is not None else start_time
        if isinstance(end_time, str):
            end = datetime.fromisoformat(end_time.replace("Z", "+00:00")).replace(tzinfo=None)
        else:
            end = end_time.replace(tzinfo=None) if end_time.tzinfo is not None else end_time

        # Build slots
        slots = []
        if recurrence_pattern and end_after and end_after > 1:
            for i in range(end_after):
                if recurrence_pattern == "Weekly":
                    slot_start = start + timedelta(days=i * 7)
                    slot_end = end + timedelta(days=i * 7)
                elif recurrence_pattern == "Biweekly":
                    slot_start = start + timedelta(days=i * 14)
                    slot_end = end + timedelta(days=i * 14)
                elif recurrence_pattern == "Monthly":
                    slot_start = start + relativedelta(months=i)
                    slot_end = end + relativedelta(months=i)
                else:
                    slot_start = start
                    slot_end = end

                slots.append((slot_start, slot_end))
        else:
            slots.append((start, end))

        created = []
        for slot_start, slot_end in slots:
            result = await db.execute(
                text("""
                    INSERT INTO eam.eam_ea_calendar (
                        schedule_title, start_time, end_time, duration,
                        recurrence_pattern, end_after, owner, remark, status
                    ) VALUES (
                        :schedule_title, :start_time, :end_time, :duration,
                        :recurrence_pattern, :end_after, :owner, :remark, 'Available'
                    ) RETURNING *
                """),
                {
                    "schedule_title": schedule_title,
                    "start_time": slot_start,
                    "end_time": slot_end,
                    "duration": duration,
                    "recurrence_pattern": recurrence_pattern,
                    "end_after": end_after,
                    "owner": owner,
                    "remark": remark,
                },
            )
            row = result.mappings().first()
            created.append(_map_schedule(row))

        await db.commit()
        return created
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error creating schedule: {e}")
        raise HTTPException(status_code=500, detail="Failed to create schedule")


# ── PUT /api/schedules/{id} ─────────────────────────────────────

@router.put("/{id}")
async def update_schedule(
    id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    try:
        existing = await db.execute(
            text("SELECT id FROM eam.eam_ea_calendar WHERE id = :id"),
            {"id": id},
        )
        row = existing.mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Schedule not found")

        field_mapping = {
            "scheduleTitle": "schedule_title",
            "startTime": "start_time",
            "endTime": "end_time",
            "duration": "duration",
            "recurrencePattern": "recurrence_pattern",
            "endAfter": "end_after",
            "owner": "owner",
            "remark": "remark",
            "status": "status",
            "forProject": "for_project",
            "forMeeting": "for_meeting",
        }

        set_parts: list[str] = []
        params: dict = {"db_id": id}

        for api_field, db_col in field_mapping.items():
            if api_field in body:
                param_name = f"u_{db_col}"
                set_parts.append(f"{db_col} = :{param_name}")
                params[param_name] = body[api_field]

        if not set_parts:
            # Nothing to update — return existing
            full = await db.execute(
                text("SELECT * FROM eam.eam_ea_calendar WHERE id = :id"),
                {"id": id},
            )
            return _map_schedule(full.mappings().first())

        set_clause = ", ".join(set_parts)

        result = await db.execute(
            text(f"UPDATE eam.eam_ea_calendar SET {set_clause} WHERE id = :db_id RETURNING *"),
            params,
        )
        updated = result.mappings().first()
        await db.commit()
        return _map_schedule(updated)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error updating schedule: {e}")
        raise HTTPException(status_code=500, detail="Failed to update schedule")


# ── DELETE /api/schedules/{id} ──────────────────────────────────

@router.delete("/{id}")
async def delete_schedule(
    id: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        existing = await db.execute(
            text("SELECT id, status FROM eam.eam_ea_calendar WHERE id = :id"),
            {"id": id},
        )
        row = existing.mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Schedule not found")

        if row["status"] == "Booked":
            raise HTTPException(
                status_code=400,
                detail="Cannot delete a booked schedule. Cancel the booking first.",
            )

        await db.execute(
            text("DELETE FROM eam.eam_ea_calendar WHERE id = :id"),
            {"id": id},
        )
        await db.commit()
        return {"message": "Schedule deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error deleting schedule: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete schedule")

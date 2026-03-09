"""Team members router — CRUD for BigEA team members."""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db
from app.utils.pagination import PaginationParams, paginated_response

router = APIRouter()

# ── Mapping helpers ──────────────────────────────────────────────

SORT_FIELD_MAP: dict[str, str] = {
    "itcode": "itcode",
    "name": "name",
    "email": "email",
    "country": "country",
    "workerType": "worker_type",
    "primarySkill": "primary_skill",
    "jobRole": "job_role",
}

ALLOWED_SORT_FIELDS = set(SORT_FIELD_MAP.values())


def _map_member(r) -> dict:
    """Convert a DB row to the camelCase API shape."""
    m = r._mapping if hasattr(r, "_mapping") else r
    return {
        "itcode": m["itcode"],
        "name": m["name"],
        "email": m["email"],
        "worker": m["worker"],
        "workerType": m["worker_type"],
        "country": m["country"],
        "location": m["location"],
        "primarySkill": m["primary_skill"],
        "skillLevel": m["skill_level"],
        "jobRole": m["job_role"],
        "trackFocal": m["track_focal"],
        "managerItcode": m["manager_itcode"],
        "managerName": m["manager_name"],
        "emailOption": m["email_option"],
        "eaAdminStatus": m["ea_admin_status"],
        "tier1Org": m["tier_1_org"],
        "tier2Org": m["tier_2_org"],
    }


# ── GET /api/team-members ───────────────────────────────────────

@router.get("")
async def list_team_members(
    pagination: PaginationParams = Depends(),
    itcode: str | None = Query(None),
    name: str | None = Query(None),
    workerType: str | None = Query(None),
    country: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        conditions: list[str] = []
        params: dict = {}

        if itcode:
            conditions.append("itcode ILIKE :itcode")
            params["itcode"] = f"%{itcode}%"
        if name:
            conditions.append("name ILIKE :name")
            params["name"] = f"%{name}%"
        if workerType:
            conditions.append("worker_type = :workerType")
            params["workerType"] = workerType
        if country:
            conditions.append("country ILIKE :country")
            params["country"] = f"%{country}%"

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        # Sort
        db_sort_field = SORT_FIELD_MAP.get(pagination.sort_field, pagination.sort_field) if pagination.sort_field else "name"
        if db_sort_field not in ALLOWED_SORT_FIELDS:
            db_sort_field = "name"
        sort_order = "DESC" if pagination.sort_order and pagination.sort_order.lower() == "desc" else "ASC"

        data_query = text(
            f"SELECT * FROM eam.eam_bigea_team_members WHERE {where_clause} "
            f"ORDER BY {db_sort_field} {sort_order} "
            f"LIMIT :limit OFFSET :offset"
        )
        count_query = text(
            f"SELECT COUNT(*) FROM eam.eam_bigea_team_members WHERE {where_clause}"
        )

        params["limit"] = pagination.page_size
        params["offset"] = pagination.offset

        result = await db.execute(data_query, params)
        rows = result.mappings().all()

        count_result = await db.execute(count_query, {k: v for k, v in params.items() if k not in ("limit", "offset")})
        total = count_result.scalar_one()

        return paginated_response(
            [_map_member(r) for r in rows],
            total,
            pagination.page,
            pagination.page_size,
        )
    except Exception as e:
        print(f"Error fetching team members: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch team members")


# ── POST /api/team-members ──────────────────────────────────────

@router.post("", status_code=201)
async def create_team_member(
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    try:
        itcode = body.get("itcode")
        if not itcode:
            raise HTTPException(status_code=400, detail="itcode is required")

        result = await db.execute(
            text("""
                INSERT INTO eam.eam_bigea_team_members (
                    itcode, name, email, worker_type, country,
                    location, primary_skill, skill_level, job_role, create_time
                ) VALUES (
                    :itcode, :name, :email, :worker_type, :country,
                    :location, :primary_skill, :skill_level, :job_role, NOW()
                ) RETURNING *
            """),
            {
                "itcode": itcode,
                "name": body.get("name"),
                "email": body.get("email"),
                "worker_type": body.get("workerType"),
                "country": body.get("country"),
                "location": body.get("location"),
                "primary_skill": body.get("primarySkill"),
                "skill_level": body.get("skillLevel"),
                "job_role": body.get("jobRole"),
            },
        )
        row = result.mappings().first()
        await db.commit()
        return _map_member(row)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error adding team member: {e}")
        raise HTTPException(status_code=500, detail="Failed to add team member")


# ── PUT /api/team-members/{itcode} ──────────────────────────────

@router.put("/{itcode}")
async def update_team_member(
    itcode: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    try:
        field_mapping = {
            "name": "name",
            "email": "email",
            "workerType": "worker_type",
            "country": "country",
            "location": "location",
            "primarySkill": "primary_skill",
            "skillLevel": "skill_level",
            "jobRole": "job_role",
            "emailOption": "email_option",
            "eaAdminStatus": "ea_admin_status",
        }

        set_parts = ["update_time = NOW()"]
        params: dict = {"itcode": itcode}

        for api_field, db_col in field_mapping.items():
            if api_field in body:
                param_name = f"u_{db_col}"
                set_parts.append(f"{db_col} = :{param_name}")
                params[param_name] = body[api_field]

        set_clause = ", ".join(set_parts)

        result = await db.execute(
            text(f"UPDATE eam.eam_bigea_team_members SET {set_clause} WHERE itcode = :itcode RETURNING *"),
            params,
        )
        row = result.mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Team member not found")

        await db.commit()
        return _map_member(row)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error updating team member: {e}")
        raise HTTPException(status_code=500, detail="Failed to update team member")


# ── DELETE /api/team-members/{itcode} ────────────────────────────

@router.delete("/{itcode}")
async def delete_team_member(
    itcode: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(
            text("DELETE FROM eam.eam_bigea_team_members WHERE itcode = :itcode"),
            {"itcode": itcode},
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Team member not found")

        await db.commit()
        return {"message": "Team member removed"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error removing team member: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove team member")

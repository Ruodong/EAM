"""Dashboard statistics endpoints."""
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db

from app.auth import require_permission, require_role, Role

router = APIRouter()


@router.get("/stats", dependencies=[Depends(require_permission("dashboard", "read"))])
async def get_stats(db: AsyncSession = Depends(get_db)):
    try:
        results = await db.execute(text("""
            SELECT
                (SELECT COUNT(*) FROM eam.project) AS total_projects,
                (SELECT COUNT(*) FROM eam.eam_request WHERE status = 'Completed') AS completed_requests,
                (SELECT COUNT(*) FROM eam.eam_request WHERE status = 'In Progress') AS in_progress_requests,
                (SELECT COUNT(*) FROM eam.eam_meetings) AS total_meetings,
                (SELECT COUNT(*) FROM eam.eam_actions) AS total_actions,
                (SELECT COUNT(*) FROM eam.eam_actions WHERE status = 'Open') AS pending_actions,
                (SELECT COUNT(*) FROM eam.eam_scope_check_list) AS scope_check_count,
                (SELECT COUNT(*) FROM eam.eam_scope_of_change) AS scope_of_change_count
        """))
        row = results.mappings().one()
        return {
            "totalProjects": row["total_projects"],
            "inProgress": row["in_progress_requests"],
            "completed": row["completed_requests"],
            "meetings": row["total_meetings"],
            "actions": row["total_actions"],
            "pending": row["pending_actions"],
            "scopeCheck": row["scope_check_count"],
            "scopeOfChange": row["scope_of_change_count"],
        }
    except Exception as e:
        print(f"Error: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to fetch dashboard stats"})


@router.get("/home-stats", dependencies=[Depends(require_permission("dashboard", "read"))])
async def get_home_stats(db: AsyncSession = Depends(get_db)):
    try:
        results = await db.execute(text("""
            SELECT
                (SELECT COUNT(*) FROM eam.project) AS my_projects,
                (SELECT COUNT(*) FROM eam.eam_request WHERE status != 'Draft') AS my_requests,
                (SELECT COUNT(*) FROM eam.eam_actions WHERE status = 'Open') AS my_actions,
                (SELECT COUNT(*) FROM eam.eam_request WHERE status = 'Submitted') AS request_queue
        """))
        row = results.mappings().one()
        return {
            "myProjects": row["my_projects"],
            "myRequests": row["my_requests"],
            "myActions": row["my_actions"],
            "requestQueue": row["request_queue"],
        }
    except Exception as e:
        print(f"Error: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to fetch home stats"})

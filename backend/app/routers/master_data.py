"""Master-data reference endpoints."""
import re
from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db

from app.auth import require_permission, require_role, Role

router = APIRouter()

UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE)


# ---- Data Classification ------------------------------------------------

@router.get("/data-classification", dependencies=[Depends(require_permission("master_data", "read"))])
async def get_data_classification(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(
            text("SELECT * FROM eam.data_classification ORDER BY method ASC, sort ASC")
        )
        rows = result.mappings().all()
        return [
            {
                "id": r["id"],
                "method": r["method"],
                "code": r["code"],
                "nameZh": r["name_zh"],
                "nameEn": r["name_en"],
                "parent": r["parent"],
                "sort": r["sort"],
                "status": r["status"],
                "comment": r["comment"],
                "level": float(r["level"]) if r["level"] is not None else None,
            }
            for r in rows
        ]
    except Exception as e:
        print(f"Error: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to fetch data classification"})


# ---- Data Centers --------------------------------------------------------

@router.get("/data-centers", dependencies=[Depends(require_permission("master_data", "read"))])
async def get_data_centers(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(
            text("SELECT * FROM eam.data_center ORDER BY name ASC")
        )
        rows = result.mappings().all()
        return [
            {
                "id": str(r["id"]),
                "name": r["name"],
                "createdBy": r["create_by"],
                "createdAt": r["create_at"].isoformat() if r["create_at"] else None,
            }
            for r in rows
        ]
    except Exception as e:
        print(f"Error: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to fetch data centers"})


# ---- Companies -----------------------------------------------------------

@router.get("/companies", dependencies=[Depends(require_permission("master_data", "read"))])
async def get_companies(
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        params: dict = {}
        if search:
            where = "(company_code ILIKE :search OR company_name ILIKE :search)"
            params["search"] = f"%{search}%"
        else:
            where = "1=1"

        result = await db.execute(
            text(f"SELECT * FROM eam.company WHERE {where} ORDER BY company_code ASC"),
            params,
        )
        rows = result.mappings().all()
        return [
            {
                "id": r["id"],
                "companyCode": r["company_code"],
                "companyName": r["company_name"],
                "companyRemark": r["company_remark"],
                "s4": r["s4"],
                "area": r["area"],
            }
            for r in rows
        ]
    except Exception as e:
        print(f"Error: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to fetch companies"})


# ---- Legal Entities ------------------------------------------------------

@router.get("/legal-entities", dependencies=[Depends(require_permission("master_data", "read"))])
async def get_legal_entities(
    appId: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        params: dict = {}
        conditions: list[str] = []

        if appId:
            if not UUID_RE.match(appId):
                return []
            conditions.append("app_id = :app_id")
            params["app_id"] = appId

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        result = await db.execute(
            text(f"SELECT * FROM eam.application_legal_entity WHERE {where_clause} ORDER BY create_at DESC"),
            params,
        )
        rows = result.mappings().all()
        return [
            {
                "id": str(r["id"]),
                "appId": str(r["app_id"]),
                "companyCode": r["company_code"],
                "createdAt": r["create_at"].isoformat() if r["create_at"] else None,
            }
            for r in rows
        ]
    except Exception as e:
        print(f"Error: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to fetch legal entities"})


# ---- Help Files ----------------------------------------------------------

@router.get("/help-files", dependencies=[Depends(require_permission("master_data", "read"))])
async def get_help_files(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(
            text("SELECT * FROM eam.help_file ORDER BY create_at DESC")
        )
        rows = result.mappings().all()
        return [
            {
                "id": r["id"],
                "usage": r["usage"],
                "fileName": r["file_name"],
                "filePath": r["file_path"],
                "createdBy": r["create_by"],
                "createdAt": r["create_at"].isoformat() if r["create_at"] else None,
            }
            for r in rows
        ]
    except Exception as e:
        print(f"Error: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to fetch help files"})

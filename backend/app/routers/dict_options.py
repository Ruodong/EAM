"""Dictionary option endpoints."""
from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db

router = APIRouter()


@router.get("")
async def get_dict_options(
    categoryId: int | None = Query(None),
    lang: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        conditions = []
        params: dict = {}

        if categoryId is not None:
            conditions.append("category_id = :category_id")
            params["category_id"] = categoryId

        effective_lang = lang if lang else "en"
        conditions.append("lang = :lang")
        params["lang"] = effective_lang

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        result = await db.execute(
            text(f"SELECT * FROM eam.dict_option WHERE {where_clause} ORDER BY option_id ASC"),
            params,
        )
        rows = result.mappings().all()

        return [
            {
                "categoryId": r["category_id"],
                "optionId": r["option_id"],
                "option": r["option"],
                "lang": r["lang"],
                "description": r["description"],
                "status": r["status"],
            }
            for r in rows
        ]
    except Exception as e:
        print(f"Error: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to fetch dict options"})


@router.get("/categories")
async def get_categories(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(
            text("""
                SELECT DISTINCT ON (category_id) category_id, description
                FROM eam.dict_option
                WHERE lang = 'en'
                ORDER BY category_id ASC
            """)
        )
        rows = result.mappings().all()

        return [
            {
                "categoryId": r["category_id"],
                "description": r["description"],
            }
            for r in rows
        ]
    except Exception as e:
        print(f"Error: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to fetch categories"})

"""Scope router — Scope of Change, Scope Check List, and templates."""
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db

router = APIRouter()


# ── Mapping helpers ─────────────────────────────────────────────

def _map_scope_of_change(r) -> dict:
    m = r._mapping if hasattr(r, "_mapping") else r
    return {
        "id": m["id"],
        "projectId": m["project_id"],
        "scopeNo": int(m["scope_no"]) if m["scope_no"] is not None else None,
        "title": m["title"],
        "description": m["description"],
        "createUsingTemplate": m["create_using_template"],
        "sample": m["sample"],
    }


def _map_checklist(r) -> dict:
    m = r._mapping if hasattr(r, "_mapping") else r
    return {
        "id": m["id"],
        "checklistNo": m["checklist_no"],
        "projectId": m["project_id"],
        "category": m["category"],
        "subCategory": m["sub_category"],
        "questions": m["questions"],
        "answer": m["answer"],
        "option": m["option"],
        "comment": m["comment"],
        "link": m["link"],
    }


# ═══════════════════════════════════════════════════════════════
# Scope of Change
# ═══════════════════════════════════════════════════════════════

# ── GET /api/scope-of-change ────────────────────────────────────

@router.get("/scope-of-change")
async def list_scope_of_change(
    projectId: str | None = Query(None),
    requestId: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        conditions: list[str] = []
        params: dict = {}

        if projectId:
            conditions.append("project_id = :projectId")
            params["projectId"] = projectId

        if requestId:
            req_result = await db.execute(
                text("SELECT project_id FROM eam.eam_request WHERE request_id = :requestId LIMIT 1"),
                {"requestId": requestId},
            )
            req_row = req_result.mappings().first()
            if req_row:
                conditions.append("project_id = :resolvedProjectId")
                params["resolvedProjectId"] = req_row["project_id"]

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        result = await db.execute(
            text(f"SELECT * FROM eam.eam_scope_of_change WHERE {where_clause} ORDER BY scope_no ASC"),
            params,
        )
        rows = result.mappings().all()
        return [_map_scope_of_change(r) for r in rows]
    except Exception as e:
        print(f"Error fetching scope of change: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch scope of change")


# ── POST /api/scope-of-change ───────────────────────────────────

@router.post("/scope-of-change", status_code=201)
async def create_scope_of_change(
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    try:
        project_id = body.get("projectId")
        title = body.get("title")
        description = body.get("description")

        if not project_id or not title or not description:
            raise HTTPException(status_code=400, detail="projectId, title, description required")

        result = await db.execute(
            text("""
                INSERT INTO eam.eam_scope_of_change (
                    project_id, title, description, create_using_template, sample
                ) VALUES (
                    :project_id, :title, :description, :create_using_template, :sample
                ) RETURNING *
            """),
            {
                "project_id": project_id,
                "title": title,
                "description": description,
                "create_using_template": body.get("createUsingTemplate", ""),
                "sample": body.get("sample", ""),
            },
        )
        created = result.mappings().first()
        await db.commit()
        return _map_scope_of_change(created)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error creating scope of change: {e}")
        raise HTTPException(status_code=500, detail="Failed to create scope of change")


# ── PUT /api/scope-of-change/{id} ──────────────────────────────

@router.put("/scope-of-change/{id}")
async def update_scope_of_change(
    id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    try:
        field_mapping = {
            "title": "title",
            "description": "description",
            "createUsingTemplate": "create_using_template",
            "sample": "sample",
        }

        set_parts: list[str] = []
        params: dict = {"db_id": id}

        for api_field, db_col in field_mapping.items():
            if api_field in body:
                param_name = f"u_{db_col}"
                set_parts.append(f"{db_col} = :{param_name}")
                params[param_name] = body[api_field]

        if not set_parts:
            result = await db.execute(
                text("SELECT * FROM eam.eam_scope_of_change WHERE id = :id"),
                {"id": id},
            )
            row = result.mappings().first()
            if not row:
                raise HTTPException(status_code=404, detail="Scope of change not found")
            return _map_scope_of_change(row)

        set_clause = ", ".join(set_parts)

        result = await db.execute(
            text(f"UPDATE eam.eam_scope_of_change SET {set_clause} WHERE id = :db_id RETURNING *"),
            params,
        )
        updated = result.mappings().first()
        if not updated:
            raise HTTPException(status_code=404, detail="Scope of change not found")
        await db.commit()
        return _map_scope_of_change(updated)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error updating scope of change: {e}")
        raise HTTPException(status_code=500, detail="Failed to update scope of change")


# ── DELETE /api/scope-of-change/{id} ────────────────────────────

@router.delete("/scope-of-change/{id}")
async def delete_scope_of_change(
    id: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        await db.execute(
            text("DELETE FROM eam.eam_scope_of_change WHERE id = :id"),
            {"id": id},
        )
        await db.commit()
        return {"message": "Scope of change deleted"}
    except Exception as e:
        await db.rollback()
        print(f"Error deleting scope of change: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete scope of change")


# ═══════════════════════════════════════════════════════════════
# Scope of Change Pages (sub-items)
# ═══════════════════════════════════════════════════════════════

@router.get("/scope-of-change/{id}/pages")
async def list_scope_pages(
    id: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(
            text("SELECT * FROM eam.eam_scope_of_change_pages WHERE scope_of_change_id = :scope_id"),
            {"scope_id": id},
        )
        rows = result.mappings().all()
        return [
            {
                "id": r["id"],
                "scopeOfChangeId": r["scope_of_change_id"],
                "name": r["name"],
                "description": r["description"],
                "diagram": r["diagram"],
            }
            for r in rows
        ]
    except Exception as e:
        print(f"Error fetching scope pages: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch scope pages")


# ═══════════════════════════════════════════════════════════════
# Scope Check List
# ═══════════════════════════════════════════════════════════════

# ── GET /api/scope-check-list ───────────────────────────────────

@router.get("/scope-check-list")
async def list_scope_check_list(
    projectId: str | None = Query(None),
    requestId: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        conditions: list[str] = []
        params: dict = {}

        if projectId:
            conditions.append("project_id = :projectId")
            params["projectId"] = projectId

        if requestId:
            req_result = await db.execute(
                text("SELECT project_id FROM eam.eam_request WHERE request_id = :requestId LIMIT 1"),
                {"requestId": requestId},
            )
            req_row = req_result.mappings().first()
            if req_row:
                conditions.append("project_id = :resolvedProjectId")
                params["resolvedProjectId"] = req_row["project_id"]

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        result = await db.execute(
            text(f"SELECT * FROM eam.eam_scope_check_list WHERE {where_clause} ORDER BY checklist_no ASC"),
            params,
        )
        rows = result.mappings().all()
        return [_map_checklist(r) for r in rows]
    except Exception as e:
        print(f"Error fetching scope check list: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch scope check list")


# ── POST /api/scope-check-list ──────────────────────────────────

@router.post("/scope-check-list", status_code=201)
async def create_scope_check_list(
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    try:
        project_id = body.get("projectId")
        category = body.get("category")

        if not project_id or not category:
            raise HTTPException(status_code=400, detail="projectId, category required")

        # Auto-generate the next checklist_no for this project to avoid
        # violating the project_id_checklist_no_uniq unique constraint.
        max_result = await db.execute(
            text(
                "SELECT COALESCE(MAX(checklist_no), 0) AS max_no "
                "FROM eam.eam_scope_check_list WHERE project_id = :project_id"
            ),
            {"project_id": project_id},
        )
        max_row = max_result.mappings().first()
        checklist_no = (max_row["max_no"] or 0) + 1

        result = await db.execute(
            text("""
                INSERT INTO eam.eam_scope_check_list (
                    project_id, checklist_no, category, sub_category,
                    questions, answer, option, comment, link
                ) VALUES (
                    :project_id, :checklist_no, :category, :sub_category,
                    :questions, :answer, :option, :comment, :link
                ) RETURNING *
            """),
            {
                "project_id": project_id,
                "checklist_no": checklist_no,
                "category": category,
                "sub_category": body.get("subCategory"),
                "questions": body.get("questions"),
                "answer": body.get("answer"),
                "option": body.get("option"),
                "comment": body.get("comment"),
                "link": body.get("link", []),
            },
        )
        created = result.mappings().first()
        await db.commit()
        return _map_checklist(created)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error creating scope check list item: {e}")
        raise HTTPException(status_code=500, detail="Failed to create scope check list item")


# ── PUT /api/scope-check-list/{id} ─────────────────────────────

@router.put("/scope-check-list/{id}")
async def update_scope_check_list(
    id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    try:
        field_mapping = {
            "answer": "answer",
            "option": "option",
            "comment": "comment",
            "link": "link",
        }

        set_parts: list[str] = []
        params: dict = {"db_id": id}

        for api_field, db_col in field_mapping.items():
            if api_field in body:
                param_name = f"u_{db_col}"
                set_parts.append(f"{db_col} = :{param_name}")
                params[param_name] = body[api_field]

        if not set_parts:
            result = await db.execute(
                text("SELECT * FROM eam.eam_scope_check_list WHERE id = :id"),
                {"id": id},
            )
            row = result.mappings().first()
            if not row:
                raise HTTPException(status_code=404, detail="Check list item not found")
            return _map_checklist(row)

        set_clause = ", ".join(set_parts)

        result = await db.execute(
            text(f"UPDATE eam.eam_scope_check_list SET {set_clause} WHERE id = :db_id RETURNING *"),
            params,
        )
        updated = result.mappings().first()
        if not updated:
            raise HTTPException(status_code=404, detail="Check list item not found")
        await db.commit()
        return _map_checklist(updated)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error updating scope check list item: {e}")
        raise HTTPException(status_code=500, detail="Failed to update scope check list item")


# ═══════════════════════════════════════════════════════════════
# Templates
# ═══════════════════════════════════════════════════════════════

@router.get("/scope-of-change-templates")
async def list_scope_templates(
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(
            text("SELECT * FROM eam.eam_scope_of_change_template ORDER BY scope_no ASC")
        )
        rows = result.mappings().all()
        return [
            {
                "id": r["id"],
                "scopeNo": int(r["scope_no"]) if r["scope_no"] is not None else None,
                "title": r["title"],
                "description": r["description"],
                "createUsingTemplate": r["create_using_template"],
                "sample": r["sample"],
            }
            for r in rows
        ]
    except Exception as e:
        print(f"Error fetching scope templates: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch scope templates")


@router.get("/scope-check-list-templates")
async def list_checklist_templates(
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(
            text("SELECT * FROM eam.eam_scope_check_list_template ORDER BY checklist_no ASC")
        )
        rows = result.mappings().all()
        return [
            {
                "id": r["id"],
                "checklistNo": r["checklist_no"],
                "category": r["category"],
                "subCategory": r["sub_category"],
                "questions": r["questions"],
                "answer": r["answer"],
                "option": r["option"],
                "comment": r["comment"],
                "link": r["link"],
                "answerType": r["answer_type"],
                "selectionType": r["selection_type"],
                "selectionOption": r["selection_option"],
            }
            for r in rows
        ]
    except Exception as e:
        print(f"Error fetching check list templates: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch check list templates")

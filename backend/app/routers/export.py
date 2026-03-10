"""Export router — ported from export.ts. CSV export for multiple entities."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db
from app.utils.csv_export import build_csv_response, sanitize_cell

from app.auth import require_permission, require_role, Role

router = APIRouter()


def _iso(val: Any) -> str:
    """Convert a datetime-ish value to ISO string, or empty string."""
    if val is None:
        return ""
    if isinstance(val, datetime):
        return val.isoformat()
    return str(val)


def _join_array(val: Any) -> str:
    """Join a list/array field with '; ', or return the string as-is."""
    if isinstance(val, list):
        return "; ".join(str(v) for v in val)
    return str(val) if val is not None else ""


# ---------------------------------------------------------------------------
# GET /{entity} — CSV export
# ---------------------------------------------------------------------------

@router.get("/{entity}", dependencies=[Depends(require_permission("export", "execute"))])
async def export_entity(
    entity: str,
    db: AsyncSession = Depends(get_db),
    # BCM-specific query params (passed through when entity == 'bcm')
    appId: str | None = Query(None),
    name: str | None = Query(None),
    domainL1: str | None = Query(None),
    subDomainL2: str | None = Query(None),
    bcName: str | None = Query(None),
    version: str | None = Query(None),
):
    try:
        rows: list[dict] = []
        headers: list[str] = []
        filename = f"{entity}-export.csv"

        if entity == "ea-requests":
            result = await db.execute(text(
                "SELECT r.request_id, r.status, r.review_result, r.review_scope, "
                "r.ws_phase_name, r.requester, r.organization, "
                "p.project_id, p.project_name, p.pm, "
                "r.create_at, r.create_by "
                "FROM eam.eam_request r "
                "LEFT JOIN eam.project p ON r.project_id = p.project_id "
                "ORDER BY r.request_id DESC LIMIT 5000"
            ))
            headers = [
                "Request ID", "Status", "Review Result", "Review Scope",
                "WS Phase", "Requestor", "Organization",
                "Project ID", "Project Name", "PM",
                "Created At", "Created By",
            ]
            for r in result.fetchall():
                d = dict(r._mapping)
                rows.append({
                    "Request ID": d.get("request_id"),
                    "Status": d.get("status"),
                    "Review Result": d.get("review_result"),
                    "Review Scope": d.get("review_scope"),
                    "WS Phase": d.get("ws_phase_name"),
                    "Requestor": d.get("requester"),
                    "Organization": d.get("organization"),
                    "Project ID": d.get("project_id"),
                    "Project Name": d.get("project_name"),
                    "PM": d.get("pm"),
                    "Created At": _iso(d.get("create_at")),
                    "Created By": d.get("create_by"),
                })
            filename = "ea-requests-export.csv"

        elif entity == "projects":
            result = await db.execute(text(
                "SELECT project_id, project_name, type, pm, dt_lead, it_lead, "
                "status, start_date, go_live_date, ai_related, create_at "
                "FROM eam.project ORDER BY project_id DESC LIMIT 5000"
            ))
            headers = [
                "Project ID", "Project Name", "Type", "PM", "DT Lead",
                "IT Lead", "Status", "Start Date", "Go Live Date",
                "AI Related", "Created At",
            ]
            for r in result.fetchall():
                d = dict(r._mapping)
                rows.append({
                    "Project ID": d.get("project_id"),
                    "Project Name": d.get("project_name"),
                    "Type": d.get("type"),
                    "PM": d.get("pm"),
                    "DT Lead": d.get("dt_lead"),
                    "IT Lead": d.get("it_lead"),
                    "Status": d.get("status"),
                    "Start Date": d.get("start_date") or "",
                    "Go Live Date": d.get("go_live_date") or "",
                    "AI Related": d.get("ai_related"),
                    "Created At": _iso(d.get("create_at")),
                })
            filename = "projects-export.csv"

        elif entity == "meetings":
            result = await db.execute(text(
                "SELECT meeting_no, meeting_title, request_id, project_id, "
                "start_time, end_time, status, create_by, create_at "
                "FROM eam.eam_meetings "
                "ORDER BY meeting_no DESC NULLS LAST LIMIT 5000"
            ))
            headers = [
                "Meeting No", "Title", "Request ID", "Project ID",
                "Start Time", "End Time", "Status", "Created By", "Created At",
            ]
            for r in result.fetchall():
                d = dict(r._mapping)
                rows.append({
                    "Meeting No": d.get("meeting_no"),
                    "Title": d.get("meeting_title"),
                    "Request ID": d.get("request_id"),
                    "Project ID": d.get("project_id"),
                    "Start Time": _iso(d.get("start_time")),
                    "End Time": _iso(d.get("end_time")),
                    "Status": d.get("status"),
                    "Created By": d.get("create_by"),
                    "Created At": _iso(d.get("create_at")),
                })
            filename = "meetings-export.csv"

        elif entity == "actions":
            result = await db.execute(text(
                "SELECT action_no, action_title, request_id, project_id, "
                "type, priority, status, assignee_name, due_date, "
                "start_date, close_date, create_at "
                "FROM eam.eam_actions "
                "ORDER BY action_no DESC NULLS LAST LIMIT 5000"
            ))
            headers = [
                "Action No", "Title", "Request ID", "Project ID",
                "Type", "Priority", "Status", "Assignee",
                "Due Date", "Start Date", "Close Date", "Created At",
            ]
            for r in result.fetchall():
                d = dict(r._mapping)
                rows.append({
                    "Action No": d.get("action_no"),
                    "Title": d.get("action_title"),
                    "Request ID": d.get("request_id"),
                    "Project ID": d.get("project_id"),
                    "Type": d.get("type"),
                    "Priority": d.get("priority"),
                    "Status": d.get("status"),
                    "Assignee": _join_array(d.get("assignee_name")),
                    "Due Date": d.get("due_date") or "",
                    "Start Date": _iso(d.get("start_date")),
                    "Close Date": d.get("close_date") or "",
                    "Created At": _iso(d.get("create_at")),
                })
            filename = "actions-export.csv"

        elif entity == "bcm":
            conditions: list[str] = []
            params: dict[str, Any] = {}

            if appId:
                conditions.append("b.app_id ILIKE :p_appId")
                params["p_appId"] = f"%{appId}%"
            if name:
                conditions.append("a.app_name ILIKE :p_name")
                params["p_name"] = f"%{name}%"
            if domainL1:
                conditions.append("m.lv1_domain ILIKE :p_domainL1")
                params["p_domainL1"] = f"%{domainL1}%"
            if subDomainL2:
                conditions.append("m.lv2_sub_domain ILIKE :p_subDomainL2")
                params["p_subDomainL2"] = f"%{subDomainL2}%"
            if bcName:
                conditions.append("m.bc_name ILIKE :p_bcName")
                params["p_bcName"] = f"%{bcName}%"
            if version:
                conditions.append("m.data_version = :p_version")
                params["p_version"] = version

            where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

            result = await db.execute(
                text(
                    f"SELECT b.app_id, "
                    f"COALESCE(a.app_name, '') AS app_name, "
                    f"COALESCE(a.app_it_owner, '') AS app_it_owner, "
                    f"COALESCE(a.current_state, '') AS current_state, "
                    f"COALESCE(a.app_ownership, '') AS app_ownership, "
                    f"COALESCE(a.app_solution_owner, '') AS app_solution_owner, "
                    f"COALESCE(a.portfolio_mgt, '') AS portfolio_mgt, "
                    f"COALESCE(a.app_solution_type, '') AS app_solution_type, "
                    f"COALESCE(a.app_classification, '') AS app_classification, "
                    f"COALESCE(a.business_function, '') AS business_function, "
                    f"m.bc_id, m.bc_name, m.lv1_domain, m.lv2_sub_domain, "
                    f"m.lv3_capability_group, m.data_version "
                    f"FROM eam.biz_cap_map b "
                    f"JOIN eam.bcpf_master_data m ON b.bcpf_master_id = m.id "
                    f"LEFT JOIN eam.project_app a ON b.app_id = a.app_id "
                    f"{where_clause} "
                    f"ORDER BY b.app_id ASC, m.bc_id ASC LIMIT 50000"
                ),
                params,
            )
            headers = [
                "App ID", "Application Name", "DT Owner", "Status",
                "App Ownership", "Solution Owner", "Portfolio Management",
                "Solution Type", "Classification", "Business Function",
                "BC ID", "BC Name", "Domain L1", "Sub Domain L2",
                "Capability Group L3", "Version",
            ]
            for r in result.fetchall():
                d = dict(r._mapping)
                rows.append({
                    "App ID": d.get("app_id"),
                    "Application Name": d.get("app_name"),
                    "DT Owner": d.get("app_it_owner"),
                    "Status": d.get("current_state"),
                    "App Ownership": d.get("app_ownership"),
                    "Solution Owner": d.get("app_solution_owner"),
                    "Portfolio Management": d.get("portfolio_mgt"),
                    "Solution Type": d.get("app_solution_type"),
                    "Classification": d.get("app_classification"),
                    "Business Function": d.get("business_function"),
                    "BC ID": d.get("bc_id"),
                    "BC Name": d.get("bc_name"),
                    "Domain L1": d.get("lv1_domain"),
                    "Sub Domain L2": d.get("lv2_sub_domain"),
                    "Capability Group L3": d.get("lv3_capability_group"),
                    "Version": d.get("data_version"),
                })
            filename = "bcm-export.csv"

        elif entity == "lead-time":
            # Batch-load requests
            req_result = await db.execute(text(
                "SELECT request_id, project_id, status, create_at "
                "FROM eam.eam_request ORDER BY create_at DESC LIMIT 5000"
            ))
            requests = [dict(r._mapping) for r in req_result.fetchall()]

            # Batch-load all projects
            project_ids = list(set(r["project_id"] for r in requests if r.get("project_id")))
            project_map: dict[str, str] = {}
            if project_ids:
                proj_result = await db.execute(
                    text(
                        "SELECT project_id, project_name FROM eam.project "
                        "WHERE project_id = ANY(:pids)"
                    ),
                    {"pids": project_ids},
                )
                for pr in proj_result.fetchall():
                    prd = dict(pr._mapping)
                    project_map[prd["project_id"]] = prd["project_name"]

            # Batch-load all process logs
            request_ids = [r["request_id"] for r in requests if r.get("request_id")]
            log_map: dict[str, list[dict]] = {}
            if request_ids:
                log_result = await db.execute(
                    text(
                        "SELECT request_id, action, create_at "
                        "FROM eam.eam_request_process_log "
                        "WHERE request_id = ANY(:rids) "
                        "ORDER BY create_at ASC"
                    ),
                    {"rids": request_ids},
                )
                for lr in log_result.fetchall():
                    ld = dict(lr._mapping)
                    rid = ld["request_id"] or ""
                    log_map.setdefault(rid, []).append(ld)

            headers = [
                "Request ID", "Project ID", "Project Name", "Status",
                "Draft Time", "In Progress Time", "Completed Time",
                "Total Lead Time (Days)",
            ]

            for req in requests:
                rid = req.get("request_id") or ""
                project_name = project_map.get(req.get("project_id") or "", "")
                logs = log_map.get(rid, [])

                draft_time = req.get("create_at")
                in_progress_time = None
                completed_time = None

                for log in logs:
                    action = (log.get("action") or "").lower()
                    if any(kw in action for kw in ("in progress", "submit", "accept")):
                        if not in_progress_time:
                            in_progress_time = log.get("create_at")
                    if any(kw in action for kw in ("complete", "approved", "close")):
                        completed_time = log.get("create_at")

                total_lead: Any = ""
                if draft_time and completed_time:
                    try:
                        delta = completed_time - draft_time
                        total_lead = round(delta.total_seconds() / 86400)
                    except Exception:
                        total_lead = ""

                rows.append({
                    "Request ID": rid,
                    "Project ID": req.get("project_id"),
                    "Project Name": project_name,
                    "Status": req.get("status"),
                    "Draft Time": _iso(draft_time),
                    "In Progress Time": _iso(in_progress_time),
                    "Completed Time": _iso(completed_time),
                    "Total Lead Time (Days)": total_lead,
                })
            filename = "lead-time-report-export.csv"

        else:
            raise HTTPException(status_code=400, detail=f"Unknown entity: {entity}")

        return build_csv_response(rows, headers, filename)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to export data") from e

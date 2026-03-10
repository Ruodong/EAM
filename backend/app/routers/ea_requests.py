"""EA Requests router — ported from ea-requests.ts (841 LOC)."""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db
from app.utils.pagination import PaginationParams, paginated_response
from app.utils.filters import multi_value_condition
from app.auth import require_permission, require_role, Role

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _map_request(r: dict) -> dict:
    """Map a raw DB row (dict) to the camelCase API shape."""
    reviewer = r.get("assign_reviewer")
    if isinstance(reviewer, list):
        reviewer_str = ", ".join(reviewer)
    else:
        reviewer_str = reviewer or ""
    return {
        "id": r.get("id"),
        "requestId": r.get("request_id"),
        "projectId": r.get("project_id"),
        "projectName": r.get("project_name") or "",
        "pmName": r.get("pm") or "",
        "status": r.get("status"),
        "scope": r.get("review_scope"),
        "wsPhase": r.get("ws_phase_name"),
        "requestorName": r.get("requester"),
        "reviewerName": reviewer_str,
        "reviewResult": r.get("review_result"),
        "organization": r.get("organization"),
        "requestDesc": r.get("request_desc"),
        "link": r.get("link"),
        "createdAt": r.get("create_at"),
        "updatedAt": r.get("update_at"),
        "createdBy": r.get("create_by"),
        "changedBy": r.get("status_changed_by") or "",
        "changedAt": r.get("status_changed_at"),
        "dtLeadName": r.get("dt_lead") or "",
    }


async def _generate_request_id(db: AsyncSession) -> str:
    """
    Generate next request_id from business_object_sequences table.
    Pattern: EA + 2-digit fiscal year + 4-digit sequence, e.g. EA250001
    Fiscal year: Apr-Mar (if month < 4, use previous year).
    Note: JS months are 0-indexed so month<3 == Python month<4.
    """
    now = datetime.now()
    fiscal_year = now.year - 1 if now.month < 4 else now.year
    fy = str(fiscal_year)[-2:]
    seq_name = f"EA_REQUEST_{fy}"

    result = await db.execute(
        text(
            "INSERT INTO eam.business_object_sequences (sequence_name, current_value) "
            "VALUES (:seq_name, 1) "
            "ON CONFLICT (sequence_name) "
            "DO UPDATE SET current_value = business_object_sequences.current_value + 1 "
            "RETURNING current_value"
        ),
        {"seq_name": seq_name},
    )
    row = result.fetchone()
    next_val = int(row[0])
    return f"EA{fy}{str(next_val).zfill(4)}"


# Sort field whitelist to prevent SQL injection
SORT_FIELD_MAP: dict[str, str] = {
    "requestId": "r.request_id",
    "status": "r.status",
    "scope": "r.review_scope",
    "requestorName": "r.requester",
    "reviewResult": "r.review_result",
    "projectId": "r.project_id",
    "projectName": "p.project_name",
    "wsPhase": "r.ws_phase_name",
    "reviewerName": "r.assign_reviewer",
    "pmName": "p.pm",
    "dtLeadName": "p.dt_lead",
    "changedBy": "r.status_changed_by",
    "changedAt": "r.status_changed_at",
    "createdBy": "r.create_by",
    "createdAt": "r.create_at",
}


# ---------------------------------------------------------------------------
# GET / — List with pagination, filtering, sorting
# ---------------------------------------------------------------------------

@router.get("", dependencies=[Depends(require_permission("ea_request", "read"))])
async def list_requests(
    pag: PaginationParams = Depends(),
    db: AsyncSession = Depends(get_db),
    requestId: str | None = Query(None),
    status: str | None = Query(None),
    reviewResult: str | None = Query(None),
    scope: str | None = Query(None),
    projectName: str | None = Query(None),
    requestorName: str | None = Query(None),
    organization: str | None = Query(None),
    reviewerName: str | None = Query(None),
    dateFrom: str | None = Query(None),
    dateTo: str | None = Query(None),
    bizType: str | None = Query(None),
    scoreMin: float | None = Query(None),
    scoreMax: float | None = Query(None),
    firstPass: str | None = Query(None),
    leadTimeMin: float | None = Query(None),
    leadTimeMax: float | None = Query(None),
    workerType: str | None = Query(None),
):
    try:
        conditions: list[str] = ["r.status <> 'Deleted'"]
        params: dict[str, Any] = {}
        extra_joins: list[str] = []

        if requestId:
            conditions.append("r.request_id ILIKE :p_requestId")
            params["p_requestId"] = f"%{requestId}%"
        if status:
            conditions.append(multi_value_condition("r.status", "p_status", status, params))
        if reviewResult:
            conditions.append(multi_value_condition("r.review_result", "p_reviewResult", reviewResult, params))
        if scope:
            conditions.append(multi_value_condition("r.review_scope", "p_scope", scope, params))
        if requestorName:
            conditions.append("r.requester ILIKE :p_requestorName")
            params["p_requestorName"] = f"%{requestorName}%"
        if organization:
            # Handle comma-separated org values (e.g. "DTIT,Other")
            org_vals = [v.strip() for v in organization.split(",") if v.strip()]
            if org_vals == ["Other"] or org_vals == ["other"]:
                conditions.append("(r.organization IS NULL OR r.organization <> 'DTIT')")
            elif "Other" in org_vals or "other" in org_vals:
                # Both DTIT and Other selected = all, no filter needed
                pass
            else:
                conditions.append(multi_value_condition("r.organization", "p_organization", organization, params))
        if projectName:
            conditions.append("p.project_name ILIKE :p_projectName")
            params["p_projectName"] = f"%{projectName}%"
        if reviewerName:
            conditions.append(
                "EXISTS (SELECT 1 FROM eam.eam_bigea_team_members _rv "
                "WHERE _rv.itcode = ANY(r.assign_reviewer) AND _rv.name = :p_reviewerName)"
            )
            params["p_reviewerName"] = reviewerName
        if workerType:
            extra_joins.append(
                "JOIN eam.eam_bigea_team_members _wt2 ON _wt2.itcode = ANY(r.assign_reviewer)"
            )
            conditions.append(multi_value_condition("_wt2.worker_type", "p_workerType", workerType, params))
        if dateFrom:
            conditions.append("r.create_at >= :p_dateFrom")
            params["p_dateFrom"] = datetime.strptime(dateFrom, "%Y-%m-%d")
        if dateTo:
            date_to_dt = datetime.strptime(dateTo, "%Y-%m-%d")
            date_to_exclusive = date_to_dt.replace(
                hour=23, minute=59, second=59, microsecond=999999
            )
            conditions.append("r.create_at <= :p_dateTo")
            params["p_dateTo"] = date_to_exclusive
        if firstPass == "true":
            conditions.append(
                "NOT EXISTS (SELECT 1 FROM eam.eam_request_process_log l "
                "WHERE l.request_id = r.request_id AND l.action = 'Returned by EA')"
            )
            conditions.append(
                "NOT EXISTS (SELECT 1 FROM eam.eam_meetings m WHERE m.request_id = r.request_id)"
            )
            conditions.append(
                "NOT EXISTS (SELECT 1 FROM eam.eam_actions act WHERE act.request_id = r.request_id)"
            )
        if leadTimeMin is not None or leadTimeMax is not None:
            conditions.append("r.status = 'Completed'")
            conditions.append("r.update_at IS NOT NULL")
            if leadTimeMin is not None:
                conditions.append(
                    "ROUND(EXTRACT(EPOCH FROM (r.update_at - r.create_at)) / 86400::numeric, 1) >= :p_leadTimeMin"
                )
                params["p_leadTimeMin"] = leadTimeMin
            if leadTimeMax is not None:
                conditions.append(
                    "ROUND(EXTRACT(EPOCH FROM (r.update_at - r.create_at)) / 86400::numeric, 1) <= :p_leadTimeMax"
                )
                params["p_leadTimeMax"] = leadTimeMax
        if bizType or scoreMin is not None or scoreMax is not None:
            extra_joins.append(
                "INNER JOIN eam.eam_request_attachment att ON att.request_id = r.request_id"
            )
            extra_joins.append(
                "INNER JOIN eam.eam_arch_ai_check aic ON aic.attachment_uuid = att.id"
            )
            if bizType:
                conditions.append("att.biz_type = :p_bizType")
                params["p_bizType"] = bizType
            if scoreMin is not None:
                conditions.append(
                    "(aic.result->'overall_evaluation'->>'score')::numeric >= :p_scoreMin"
                )
                params["p_scoreMin"] = scoreMin
            if scoreMax is not None:
                conditions.append(
                    "(aic.result->'overall_evaluation'->>'score')::numeric <= :p_scoreMax"
                )
                params["p_scoreMax"] = scoreMax

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        db_sort_field = SORT_FIELD_MAP.get(pag.sort_field or "", "r.request_id")
        db_sort_order = "ASC" if pag.sort_order == "asc" else "DESC"

        joins_sql = "\n      ".join(extra_joins)
        base_query = f"""
            FROM eam.eam_request r
            LEFT JOIN eam.project p ON r.project_id = p.project_id
            {joins_sql}
            {where_clause}
        """

        data_sql = f"""
            SELECT DISTINCT r.*, p.project_name, p.pm, p.dt_lead
            {base_query}
            ORDER BY {db_sort_field} {db_sort_order} NULLS LAST
            LIMIT :p_limit OFFSET :p_offset
        """
        count_sql = f"SELECT COUNT(DISTINCT r.request_id) as total {base_query}"

        params["p_limit"] = pag.page_size
        params["p_offset"] = pag.offset

        data_result = await db.execute(text(data_sql), params)
        count_result = await db.execute(text(count_sql), params)

        rows = [dict(r._mapping) for r in data_result.fetchall()]
        total = int(count_result.scalar() or 0)

        return paginated_response([_map_request(r) for r in rows], total, pag.page, pag.page_size)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch EA requests") from e


# ---------------------------------------------------------------------------
# GET /dashboard — 17 aggregated stats queries
# MUST be before /{id} to avoid being caught by the path param route
# ---------------------------------------------------------------------------

@router.get("/dashboard", dependencies=[Depends(require_permission("ea_request", "read"))])
async def dashboard(
    db: AsyncSession = Depends(get_db),
    # query params use 'from' which is a Python keyword, alias via Query
    date_from: str | None = Query(None, alias="from"),
    date_to: str | None = Query(None, alias="to"),
    org: str | None = Query(None),
    workerType: str | None = Query(None),
):
    try:
        # -- Build date filter clause (unaliased table) --
        date_conditions: list[str] = ["status <> 'Deleted'"]
        date_params: dict[str, Any] = {}
        if date_from:
            date_conditions.append("create_at >= :p_from")
            date_params["p_from"] = datetime.strptime(date_from, "%Y-%m-%d")
        if date_to:
            date_to_dt = datetime.strptime(date_to, "%Y-%m-%d")
            date_to_exclusive = date_to_dt.replace(
                hour=23, minute=59, second=59, microsecond=999999
            )
            date_conditions.append("create_at <= :p_to")
            date_params["p_to"] = date_to_exclusive
        date_where = " AND ".join(date_conditions)

        # Organization filter (supports comma-separated, e.g. "DTIT,other")
        org_filter = ""
        r_org_filter = ""
        if org:
            org_vals = [v.strip() for v in org.split(",") if v.strip()]
            has_dtit = "DTIT" in org_vals
            has_other = "other" in org_vals or "Other" in org_vals
            if has_dtit and not has_other:
                org_filter = " AND organization = 'DTIT'"
                r_org_filter = " AND r.organization = 'DTIT'"
            elif has_other and not has_dtit:
                org_filter = " AND organization <> 'DTIT'"
                r_org_filter = " AND r.organization <> 'DTIT'"
            # both selected = all, no filter

        # Worker type filter (supports comma-separated, e.g. "EA Office,Domain Architect")
        wt_filter = ""
        r_wt_filter = ""
        t_wt_filter = ""
        if workerType:
            wt_vals = [v.strip() for v in workerType.split(",") if v.strip()]
            valid_wts = [v for v in wt_vals if v in ("EA Office", "Domain Architect")]
            if len(valid_wts) == 1:
                wt_filter = (
                    f" AND EXISTS (SELECT 1 FROM eam.eam_bigea_team_members _wt "
                    f"WHERE _wt.itcode = ANY(assign_reviewer) AND _wt.worker_type = '{valid_wts[0]}')"
                )
                r_wt_filter = (
                    f" AND EXISTS (SELECT 1 FROM eam.eam_bigea_team_members _wt "
                    f"WHERE _wt.itcode = ANY(r.assign_reviewer) AND _wt.worker_type = '{valid_wts[0]}')"
                )
                t_wt_filter = f" AND t.worker_type = '{valid_wts[0]}'"
            elif len(valid_wts) == 2:
                pass  # both selected = all, no filter

        # r-aliased date conditions (for JOINed queries)
        r_date_conds: list[str] = ["r.status <> 'Deleted'"]
        if date_from:
            r_date_conds.append("r.create_at >= :p_from")
        if date_to:
            r_date_conds.append("r.create_at <= :p_to")
        r_date_where = " AND ".join(r_date_conds)

        # -- Helper to run one query and return list of dicts --
        async def _q(sql: str, params: dict | None = None) -> list[dict]:
            result = await db.execute(text(sql), params or {})
            return [dict(r._mapping) for r in result.fetchall()]

        dp = dict(date_params)  # shallow copy for reuse

        # 1. Count by status
        status_counts = await _q(
            f"SELECT status, COUNT(*)::int as count "
            f"FROM eam.eam_request WHERE {date_where}{org_filter}{wt_filter} "
            f"GROUP BY status ORDER BY count DESC",
            dp,
        )

        # 2. Count by review_result for Completed requests
        completed_result_counts = await _q(
            f"SELECT COALESCE(review_result, 'Unknown') as result, COUNT(*)::int as count "
            f"FROM eam.eam_request WHERE {date_where}{org_filter}{wt_filter} AND status = 'Completed' "
            f"GROUP BY review_result ORDER BY count DESC",
            dp,
        )

        # 3. Count by organization
        org_counts = await _q(
            f"SELECT COALESCE(organization, 'Unknown') as organization, COUNT(*)::int as count "
            f"FROM eam.eam_request WHERE {date_where}{org_filter}{wt_filter} "
            f"GROUP BY organization ORDER BY count DESC",
            dp,
        )

        # 4. Monthly trend
        monthly_trend = await _q(
            f"SELECT TO_CHAR(create_at, 'YYYY-MM') as month, "
            f"COUNT(*)::int as submitted, "
            f"COUNT(*) FILTER (WHERE review_result IN ('Approved','Approved with Actions'))::int as approved "
            f"FROM eam.eam_request WHERE {date_where}{org_filter}{wt_filter} "
            f"GROUP BY TO_CHAR(create_at, 'YYYY-MM') ORDER BY month",
            dp,
        )

        # 5. Monthly lead time
        monthly_lead_time = await _q(
            f"SELECT TO_CHAR(create_at, 'YYYY-MM') as month, "
            f"ROUND(MIN(EXTRACT(EPOCH FROM (update_at - create_at)) / 86400)::numeric, 1) as min_days, "
            f"ROUND(AVG(EXTRACT(EPOCH FROM (update_at - create_at)) / 86400)::numeric, 1) as avg_days, "
            f"ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (update_at - create_at)) / 86400))::numeric, 1) as median_days, "
            f"ROUND(MAX(EXTRACT(EPOCH FROM (update_at - create_at)) / 86400)::numeric, 1) as max_days "
            f"FROM eam.eam_request WHERE {date_where}{org_filter}{wt_filter} AND status = 'Completed' AND update_at IS NOT NULL "
            f"GROUP BY TO_CHAR(create_at, 'YYYY-MM') ORDER BY month",
            dp,
        )

        # 6. Monthly by organization
        monthly_by_org = await _q(
            f"SELECT TO_CHAR(create_at, 'YYYY-MM') as month, "
            f"COALESCE(organization, 'Unknown') as organization, COUNT(*)::int as count "
            f"FROM eam.eam_request WHERE {date_where}{org_filter}{wt_filter} "
            f"GROUP BY TO_CHAR(create_at, 'YYYY-MM'), organization ORDER BY month, count DESC",
            dp,
        )

        # 7. Recent requests (last 10, within date range)
        recent_conds: list[str] = ["r.status <> 'Deleted'"]
        recent_params: dict[str, Any] = {}
        if date_from:
            recent_conds.append("r.create_at >= :p_from")
            recent_params["p_from"] = date_params["p_from"]
        if date_to:
            recent_conds.append("r.create_at <= :p_to")
            recent_params["p_to"] = date_params["p_to"]
        recent_requests_raw = await _q(
            f"SELECT r.request_id, r.status, r.review_result, r.organization, "
            f"r.requester, r.create_at, r.update_at, p.project_name, r.review_scope "
            f"FROM eam.eam_request r "
            f"LEFT JOIN eam.project p ON r.project_id = p.project_id "
            f"WHERE {' AND '.join(recent_conds)}{r_org_filter}{r_wt_filter} "
            f"ORDER BY r.update_at DESC NULLS LAST LIMIT 10",
            recent_params,
        )
        recent_requests = [
            {
                "requestId": r["request_id"],
                "status": r["status"],
                "reviewResult": r["review_result"],
                "organization": r["organization"],
                "requester": r["requester"],
                "projectName": r["project_name"],
                "reviewScope": r["review_scope"],
                "createdAt": r["create_at"],
                "updatedAt": r["update_at"],
            }
            for r in recent_requests_raw
        ]

        # 8. Architect by Org x Worker Type
        architect_by_org_type = await _q(
            f"SELECT "
            f"CASE WHEN r.organization = 'DTIT' THEN 'DTIT' ELSE 'Other' END AS org_group, "
            f"t.worker_type, "
            f"COUNT(DISTINCT r.id)::int AS count, "
            f"COUNT(DISTINCT t.itcode)::int AS architect_count, "
            f"COUNT(DISTINCT m.id)::int AS meeting_count, "
            f"COUNT(DISTINCT ac.id)::int AS action_count "
            f"FROM eam.eam_request r "
            f"JOIN eam.eam_bigea_team_members t ON t.itcode = ANY(r.assign_reviewer) "
            f"LEFT JOIN eam.eam_meetings m ON m.project_id = r.project_id "
            f"LEFT JOIN eam.eam_actions ac ON ac.project_id = r.project_id "
            f"WHERE {r_date_where}{r_org_filter}{t_wt_filter} "
            f"AND t.worker_type IN ('EA Office', 'Domain Architect') "
            f"GROUP BY org_group, t.worker_type ORDER BY org_group, t.worker_type",
            dp,
        )

        # 9. Top 10 architects workload
        top_architects = await _q(
            f"SELECT t.name AS architect_name, "
            f"COUNT(DISTINCT r.id)::int AS count, "
            f"COUNT(DISTINCT m.id)::int AS meeting_count, "
            f"COUNT(DISTINCT ac.id)::int AS action_count "
            f"FROM eam.eam_request r "
            f"JOIN eam.eam_bigea_team_members t ON t.itcode = ANY(r.assign_reviewer) "
            f"LEFT JOIN eam.eam_meetings m ON m.project_id = r.project_id "
            f"LEFT JOIN eam.eam_actions ac ON ac.project_id = r.project_id "
            f"WHERE {r_date_where}{r_org_filter}{t_wt_filter} "
            f"GROUP BY t.name ORDER BY count DESC LIMIT 10",
            dp,
        )

        # 10. Monthly review activity
        # Build the conditional JOIN fragments for org/wt filters
        meeting_org_join = ""
        action_org_join = ""
        if org or workerType:
            meeting_org_join = (
                f"JOIN eam.eam_request r ON r.project_id = mt.project_id "
                f"AND r.status <> 'Deleted'{r_org_filter}{r_wt_filter}"
            )
            action_org_join = (
                f"JOIN eam.eam_request r2 ON r2.project_id = ac.project_id "
                f"AND r2.status <> 'Deleted'"
                f"{r_org_filter.replace('r.', 'r2.')}{r_wt_filter.replace('r.', 'r2.')}"
            )

        monthly_review_activity = await _q(
            f"SELECT month, "
            f"ROUND(meetings::numeric / NULLIF(projects, 0), 1) AS avg_meetings, "
            f"ROUND(actions::numeric / NULLIF(projects, 0), 1) AS avg_actions, "
            f"min_meetings, max_meetings, min_actions, max_actions "
            f"FROM ( "
            f"  SELECT m.month, m.projects, m.meetings, m.min_meetings, m.max_meetings, "
            f"         COALESCE(a.actions, 0) AS actions, "
            f"         COALESCE(a.min_actions, 0) AS min_actions, "
            f"         COALESCE(a.max_actions, 0) AS max_actions "
            f"  FROM ( "
            f"    SELECT TO_CHAR(mt.create_at, 'YYYY-MM') AS month, "
            f"           COUNT(DISTINCT mt.project_id)::int AS projects, "
            f"           COUNT(*)::int AS meetings, "
            f"           MIN(pc.cnt)::int AS min_meetings, "
            f"           MAX(pc.cnt)::int AS max_meetings "
            f"    FROM eam.eam_meetings mt "
            f"    JOIN (SELECT project_id, TO_CHAR(create_at, 'YYYY-MM') AS month, COUNT(*)::int AS cnt "
            f"         FROM eam.eam_meetings WHERE create_at IS NOT NULL "
            f"         GROUP BY project_id, TO_CHAR(create_at, 'YYYY-MM')) pc "
            f"      ON pc.project_id = mt.project_id AND pc.month = TO_CHAR(mt.create_at, 'YYYY-MM') "
            f"    {meeting_org_join} "
            f"    WHERE mt.create_at IS NOT NULL "
            f"    GROUP BY TO_CHAR(mt.create_at, 'YYYY-MM') "
            f"  ) m "
            f"  LEFT JOIN ( "
            f"    SELECT TO_CHAR(ac.create_at, 'YYYY-MM') AS month, "
            f"           COUNT(*)::int AS actions, "
            f"           MIN(pc2.cnt)::int AS min_actions, "
            f"           MAX(pc2.cnt)::int AS max_actions "
            f"    FROM eam.eam_actions ac "
            f"    JOIN (SELECT project_id, TO_CHAR(create_at, 'YYYY-MM') AS month, COUNT(*)::int AS cnt "
            f"         FROM eam.eam_actions WHERE create_at IS NOT NULL "
            f"         GROUP BY project_id, TO_CHAR(create_at, 'YYYY-MM')) pc2 "
            f"      ON pc2.project_id = ac.project_id AND pc2.month = TO_CHAR(ac.create_at, 'YYYY-MM') "
            f"    {action_org_join} "
            f"    WHERE ac.create_at IS NOT NULL "
            f"    GROUP BY TO_CHAR(ac.create_at, 'YYYY-MM') "
            f"  ) a ON a.month = m.month "
            f") sub ORDER BY month",
        )

        # 11. Monthly Org x Worker Type trend
        monthly_org_type_trend = await _q(
            f"SELECT TO_CHAR(r.create_at, 'YYYY-MM') AS month, "
            f"CASE WHEN r.organization = 'DTIT' THEN 'DTIT' ELSE 'Other' END AS org_group, "
            f"t.worker_type, "
            f"COUNT(DISTINCT r.id)::int AS count, "
            f"COUNT(DISTINCT t.itcode)::int AS architect_count "
            f"FROM eam.eam_request r "
            f"JOIN eam.eam_bigea_team_members t ON t.itcode = ANY(r.assign_reviewer) "
            f"WHERE {r_date_where}{r_org_filter}{t_wt_filter} "
            f"AND t.worker_type IN ('EA Office', 'Domain Architect') "
            f"GROUP BY TO_CHAR(r.create_at, 'YYYY-MM'), org_group, t.worker_type "
            f"ORDER BY month, org_group, t.worker_type",
            dp,
        )

        # 12. Architecture Diagram Score Stats
        diagram_score_stats = await _q(
            f"SELECT a.biz_type, "
            f"MIN((c.result->'overall_evaluation'->>'score')::numeric) AS min_score, "
            f"MAX((c.result->'overall_evaluation'->>'score')::numeric) AS max_score, "
            f"ROUND(AVG((c.result->'overall_evaluation'->>'score')::numeric), 1) AS avg_score, "
            f"ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (c.result->'overall_evaluation'->>'score')::numeric))::numeric, 1) AS median_score, "
            f"COUNT(*)::int AS total "
            f"FROM eam.eam_arch_ai_check c "
            f"JOIN eam.eam_request_attachment a ON a.id = c.attachment_uuid "
            f"JOIN eam.eam_request r ON r.request_id = a.request_id "
            f"WHERE {r_date_where}{r_org_filter}{r_wt_filter} "
            f"AND c.result->'overall_evaluation'->>'score' IS NOT NULL "
            f"GROUP BY a.biz_type ORDER BY a.biz_type",
            dp,
        )

        # 13. Monthly Architecture Score Trends
        monthly_arch_score = await _q(
            f"SELECT TO_CHAR(r.create_at, 'YYYY-MM') AS month, a.biz_type, "
            f"MIN((c.result->'overall_evaluation'->>'score')::numeric) AS min_score, "
            f"ROUND(AVG((c.result->'overall_evaluation'->>'score')::numeric), 1) AS avg_score, "
            f"ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (c.result->'overall_evaluation'->>'score')::numeric))::numeric, 1) AS median_score, "
            f"MAX((c.result->'overall_evaluation'->>'score')::numeric) AS max_score, "
            f"COUNT(*)::int AS total "
            f"FROM eam.eam_arch_ai_check c "
            f"JOIN eam.eam_request_attachment a ON a.id = c.attachment_uuid "
            f"JOIN eam.eam_request r ON r.request_id = a.request_id "
            f"WHERE {r_date_where}{r_org_filter}{r_wt_filter} "
            f"AND c.result->'overall_evaluation'->>'score' IS NOT NULL "
            f"GROUP BY TO_CHAR(r.create_at, 'YYYY-MM'), a.biz_type ORDER BY month, a.biz_type",
            dp,
        )

        # 14. First-pass approval rate
        first_pass_rows = await _q(
            f"SELECT "
            f"COUNT(*)::int AS total_completed, "
            f"COUNT(*) FILTER ( "
            f"  WHERE NOT EXISTS ( "
            f"    SELECT 1 FROM eam.eam_request_process_log l "
            f"    WHERE l.request_id = r.request_id AND l.action = 'Returned by EA' "
            f"  ) AND NOT EXISTS ( "
            f"    SELECT 1 FROM eam.eam_meetings m WHERE m.request_id = r.request_id "
            f"  ) AND NOT EXISTS ( "
            f"    SELECT 1 FROM eam.eam_actions act WHERE act.request_id = r.request_id "
            f"  ) "
            f")::int AS first_pass_count, "
            f"COUNT(*) FILTER ( "
            f"  WHERE EXISTS ( "
            f"    SELECT 1 FROM eam.eam_request_process_log l "
            f"    WHERE l.request_id = r.request_id AND l.action = 'Returned by EA' "
            f"  ) "
            f")::int AS return_count, "
            f"COUNT(*) FILTER ( "
            f"  WHERE EXISTS ( "
            f"    SELECT 1 FROM eam.eam_meetings m WHERE m.request_id = r.request_id "
            f"  ) "
            f")::int AS meeting_count, "
            f"COUNT(*) FILTER ( "
            f"  WHERE EXISTS ( "
            f"    SELECT 1 FROM eam.eam_actions act WHERE act.request_id = r.request_id "
            f"  ) "
            f")::int AS action_count "
            f"FROM eam.eam_request r "
            f"WHERE r.status = 'Completed' AND {date_where}{org_filter}{wt_filter}",
            dp,
        )
        first_pass_rate = first_pass_rows[0] if first_pass_rows else {
            "total_completed": 0, "first_pass_count": 0
        }

        # 15. Individual scores for scatter plot
        score_distribution = await _q(
            f"SELECT a.biz_type, "
            f"ROUND((c.result->'overall_evaluation'->>'score')::numeric, 2) AS score "
            f"FROM eam.eam_arch_ai_check c "
            f"JOIN eam.eam_request_attachment a ON a.id = c.attachment_uuid "
            f"JOIN eam.eam_request r ON r.request_id = a.request_id "
            f"WHERE {r_date_where}{r_org_filter}{r_wt_filter} "
            f"AND c.result->'overall_evaluation'->>'score' IS NOT NULL "
            f"ORDER BY a.biz_type, score",
            dp,
        )

        # 16. Monthly first-pass trend
        monthly_first_pass = await _q(
            f"SELECT TO_CHAR(r.create_at, 'YYYY-MM') AS month, "
            f"COUNT(*)::int AS total, "
            f"COUNT(*) FILTER ( "
            f"  WHERE NOT EXISTS ( "
            f"    SELECT 1 FROM eam.eam_request_process_log l "
            f"    WHERE l.request_id = r.request_id AND l.action = 'Returned by EA' "
            f"  ) AND NOT EXISTS ( "
            f"    SELECT 1 FROM eam.eam_meetings m WHERE m.request_id = r.request_id "
            f"  ) AND NOT EXISTS ( "
            f"    SELECT 1 FROM eam.eam_actions act WHERE act.request_id = r.request_id "
            f"  ) "
            f")::int AS first_pass "
            f"FROM eam.eam_request r "
            f"WHERE r.status = 'Completed' AND {date_where}{org_filter}{wt_filter} "
            f"GROUP BY TO_CHAR(r.create_at, 'YYYY-MM') ORDER BY month",
            dp,
        )

        # 17. Monthly Top 10 Architects
        monthly_top_architects = await _q(
            f"SELECT month, architect_name, project_count, rank::int "
            f"FROM ( "
            f"  SELECT TO_CHAR(r.create_at, 'YYYY-MM') AS month, "
            f"         t.name AS architect_name, "
            f"         COUNT(DISTINCT r.id)::int AS project_count, "
            f"         ROW_NUMBER() OVER ( "
            f"           PARTITION BY TO_CHAR(r.create_at, 'YYYY-MM') "
            f"           ORDER BY COUNT(DISTINCT r.id) DESC "
            f"         ) AS rank "
            f"  FROM eam.eam_request r "
            f"  JOIN eam.eam_bigea_team_members t ON t.itcode = ANY(r.assign_reviewer) "
            f"  WHERE {r_date_where}{r_org_filter}{t_wt_filter} "
            f"  GROUP BY TO_CHAR(r.create_at, 'YYYY-MM'), t.name "
            f") ranked WHERE rank <= 10 ORDER BY month, rank",
            dp,
        )

        total = sum(r.get("count", 0) for r in status_counts)

        return {
            "total": total,
            "statusCounts": status_counts,
            "completedResultCounts": completed_result_counts,
            "orgCounts": org_counts,
            "monthlyTrend": monthly_trend,
            "monthlyLeadTime": monthly_lead_time,
            "monthlyByOrg": monthly_by_org,
            "architectByOrgType": architect_by_org_type,
            "topArchitects": top_architects,
            "monthlyReviewActivity": monthly_review_activity,
            "monthlyOrgTypeTrend": monthly_org_type_trend,
            "diagramScoreStats": diagram_score_stats,
            "monthlyArchScore": monthly_arch_score,
            "firstPassRate": first_pass_rate,
            "scoreDistribution": score_distribution,
            "monthlyFirstPass": monthly_first_pass,
            "monthlyTopArchitects": monthly_top_architects,
            "recentRequests": recent_requests,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard stats") from e


# ---------------------------------------------------------------------------
# GET /filter-options — Distinct values for search dropdowns
# MUST be before /{id}
# ---------------------------------------------------------------------------

@router.get("/filter-options", dependencies=[Depends(require_permission("ea_request", "read"))])
async def filter_options(db: AsyncSession = Depends(get_db)):
    try:
        proj_result = await db.execute(text(
            "SELECT DISTINCT p.project_name "
            "FROM eam.eam_request r "
            "LEFT JOIN eam.project p ON r.project_id = p.project_id "
            "WHERE p.project_name IS NOT NULL AND p.project_name <> '' "
            "ORDER BY p.project_name"
        ))
        org_result = await db.execute(text(
            "SELECT DISTINCT organization "
            "FROM eam.eam_request "
            "WHERE organization IS NOT NULL AND organization <> '' "
            "ORDER BY organization"
        ))
        return {
            "projects": [r[0] for r in proj_result.fetchall()],
            "organizations": [r[0] for r in org_result.fetchall()],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch filter options") from e


# ---------------------------------------------------------------------------
# GET /{id} — Get single request by request_id (string, NOT UUID)
# ---------------------------------------------------------------------------

@router.get("/{id}", dependencies=[Depends(require_permission("ea_request", "read"))])
async def get_request(id: str, db: AsyncSession = Depends(get_db)):
    try:
        data_result = await db.execute(
            text(
                "SELECT r.*, p.project_name, p.pm, p.dt_lead "
                "FROM eam.eam_request r "
                "LEFT JOIN eam.project p ON r.project_id = p.project_id "
                "WHERE r.request_id = :rid LIMIT 1"
            ),
            {"rid": id},
        )
        row = data_result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Request not found")
        request_data = dict(row._mapping)

        att_result = await db.execute(
            text(
                "SELECT DISTINCT ON (a.id) "
                "a.id, a.attachment_name, a.biz_type, a.app_arch_type, "
                "a.create_at, a.create_by, "
                "c.result as ai_result, c.create_at as ai_check_at "
                "FROM eam.eam_request_attachment a "
                "LEFT JOIN eam.eam_arch_ai_check c ON c.attachment_uuid = a.id "
                "WHERE a.request_id = :rid "
                "ORDER BY a.id, c.create_at DESC NULLS LAST"
            ),
            {"rid": id},
        )
        attachment_rows = [dict(r._mapping) for r in att_result.fetchall()]

        def extract_file_name(path: str | None) -> str:
            if not path:
                return ""
            parts = path.split("/")
            return parts[-1]

        def parse_ai_result(result: Any) -> Any:
            if result is None:
                return None
            try:
                return json.loads(result) if isinstance(result, str) else result
            except (json.JSONDecodeError, TypeError):
                return None

        def map_attachment(r: dict) -> dict:
            ai_result = parse_ai_result(r.get("ai_result"))
            ai_score = None
            if isinstance(ai_result, dict):
                oe = ai_result.get("overall_evaluation")
                if isinstance(oe, dict):
                    ai_score = oe.get("score")
            return {
                "id": r.get("id"),
                "fileName": extract_file_name(r.get("attachment_name")),
                "filePath": r.get("attachment_name") or "",
                "uploadBy": r.get("create_by") or "",
                "createdAt": r.get("create_at"),
                "aiScore": ai_score,
                "aiResult": ai_result,
                "evaluatedAt": r.get("ai_check_at"),
                "appArchType": r.get("app_arch_type"),
            }

        app_diagrams = [map_attachment(r) for r in attachment_rows if r.get("biz_type") == "App_Arch"]
        tech_diagrams = [map_attachment(r) for r in attachment_rows if r.get("biz_type") == "Tech_Arch"]
        attachments = [map_attachment(r) for r in attachment_rows if r.get("biz_type") == "Proj_Intro"]

        return {
            **_map_request(request_data),
            "appDiagrams": app_diagrams,
            "techDiagrams": tech_diagrams,
            "attachments": attachments,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch request") from e


# ---------------------------------------------------------------------------
# POST / — Create new EA request
# ---------------------------------------------------------------------------

@router.post("", status_code=201, dependencies=[Depends(require_permission("ea_request", "write"))])
async def create_request(body: dict, db: AsyncSession = Depends(get_db)):
    try:
        project_id = body.get("projectId")
        if not project_id:
            raise HTTPException(status_code=400, detail="projectId is required")

        request_id = await _generate_request_id(db)

        assign_reviewer = body.get("assignReviewer") or []

        await db.execute(
            text(
                "INSERT INTO eam.eam_request "
                "(request_id, project_id, review_scope, ws_phase_name, requester, "
                "status, link, assign_reviewer, organization, request_desc, "
                "create_by, create_at, update_at) "
                "VALUES (:request_id, :project_id, :review_scope, :ws_phase, :requester, "
                "'Draft', :link, :assign_reviewer, :organization, :request_desc, "
                ":created_by, NOW(), NOW())"
            ),
            {
                "request_id": request_id,
                "project_id": project_id,
                "review_scope": body.get("reviewScope"),
                "ws_phase": body.get("wsPhase"),
                "requester": body.get("requester"),
                "link": body.get("link"),
                "assign_reviewer": assign_reviewer,
                "organization": body.get("organization"),
                "request_desc": body.get("requestDesc"),
                "created_by": body.get("createdBy"),
            },
        )

        # Log the process
        await db.execute(
            text(
                "INSERT INTO eam.eam_request_process_log "
                "(request_id, action, comment, operator, create_at) "
                "VALUES (:request_id, 'Created', 'Request created', :operator, NOW())"
            ),
            {"request_id": request_id, "operator": body.get("createdBy")},
        )

        await db.commit()

        # Fetch the created row to return
        result = await db.execute(
            text(
                "SELECT r.*, p.project_name, p.pm, p.dt_lead "
                "FROM eam.eam_request r "
                "LEFT JOIN eam.project p ON r.project_id = p.project_id "
                "WHERE r.request_id = :rid LIMIT 1"
            ),
            {"rid": request_id},
        )
        created = dict(result.fetchone()._mapping)
        return _map_request(created)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create EA request") from e


# ---------------------------------------------------------------------------
# PUT /{id} — Update EA request
# ---------------------------------------------------------------------------

@router.put("/{id}", dependencies=[Depends(require_permission("ea_request", "write"))])
async def update_request(id: str, body: dict, db: AsyncSession = Depends(get_db)):
    try:
        # Find existing
        existing_result = await db.execute(
            text("SELECT * FROM eam.eam_request WHERE request_id = :rid LIMIT 1"),
            {"rid": id},
        )
        existing = existing_result.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Request not found")
        existing_dict = dict(existing._mapping)

        set_clauses: list[str] = ["update_at = NOW()"]
        params: dict[str, Any] = {"rid": id}

        field_map = {
            "reviewScope": "review_scope",
            "wsPhase": "ws_phase_name",
            "requester": "requester",
            "status": "status",
            "link": "link",
            "assignReviewer": "assign_reviewer",
            "reviewResult": "review_result",
            "organization": "organization",
            "requestDesc": "request_desc",
            "statusRemark": "status_remark",
            "updatedBy": "update_by",
        }
        for api_key, db_col in field_map.items():
            if api_key in body:
                set_clauses.append(f"{db_col} = :u_{db_col}")
                params[f"u_{db_col}"] = body[api_key]

        new_status = body.get("status")
        updated_by = body.get("updatedBy")

        # Track status change
        if new_status and new_status != existing_dict.get("status"):
            set_clauses.append("status_changed_by = :u_scb")
            set_clauses.append("status_changed_at = NOW()")
            params["u_scb"] = updated_by

            old_status = existing_dict.get("status")
            await db.execute(
                text(
                    "INSERT INTO eam.eam_request_process_log "
                    "(request_id, action, comment, operator, create_at) "
                    "VALUES (:request_id, :action, :comment, :operator, NOW())"
                ),
                {
                    "request_id": id,
                    "action": f"Status changed: {old_status} -> {new_status}",
                    "comment": body.get("statusRemark"),
                    "operator": updated_by,
                },
            )

        update_sql = f"UPDATE eam.eam_request SET {', '.join(set_clauses)} WHERE request_id = :rid"
        await db.execute(text(update_sql), params)
        await db.commit()

        # Return updated row
        result = await db.execute(
            text(
                "SELECT r.*, p.project_name, p.pm, p.dt_lead "
                "FROM eam.eam_request r "
                "LEFT JOIN eam.project p ON r.project_id = p.project_id "
                "WHERE r.request_id = :rid LIMIT 1"
            ),
            {"rid": id},
        )
        updated = dict(result.fetchone()._mapping)
        return _map_request(updated)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update EA request") from e


# ---------------------------------------------------------------------------
# DELETE /{id} — Soft delete (set status to 'Deleted')
# ---------------------------------------------------------------------------

@router.delete("/{id}", dependencies=[Depends(require_permission("ea_request", "write"))])
async def delete_request(id: str, db: AsyncSession = Depends(get_db)):
    try:
        existing_result = await db.execute(
            text("SELECT id FROM eam.eam_request WHERE request_id = :rid LIMIT 1"),
            {"rid": id},
        )
        if not existing_result.fetchone():
            raise HTTPException(status_code=404, detail="Request not found")

        await db.execute(
            text(
                "UPDATE eam.eam_request SET status = 'Deleted', update_at = NOW(), "
                "status_changed_at = NOW() WHERE request_id = :rid"
            ),
            {"rid": id},
        )
        await db.commit()
        return {"message": "Request deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete EA request") from e

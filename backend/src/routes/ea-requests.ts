import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPaginationParams, buildPaginatedResponse } from '../middleware/pagination';

const prisma = new PrismaClient();
const router = Router();

function mapRequest(r: any) {
  return {
    id:             r.id,
    requestId:      r.request_id,
    projectId:      r.project_id,
    projectName:    r.project_name ?? '',
    pmName:         r.pm ?? '',
    status:         r.status,
    scope:          r.review_scope,
    wsPhase:        r.ws_phase_name,
    requestorName:  r.requester,
    reviewerName:   Array.isArray(r.assign_reviewer) ? r.assign_reviewer.join(', ') : (r.assign_reviewer ?? ''),
    reviewResult:   r.review_result,
    organization:   r.organization,
    requestDesc:    r.request_desc,
    link:           r.link,
    createdAt:      r.create_at,
    updatedAt:      r.update_at,
    createdBy:      r.create_by,
    changedBy:      r.status_changed_by ?? '',
    changedAt:      r.status_changed_at,
    dtLeadName:     r.dt_lead ?? '',
  };
}

/**
 * Generate next request_id from business_object_sequences table.
 * Pattern: EA + 2-digit fiscal year + 4-digit sequence, e.g. EA250001
 * Fiscal year: Apr-Mar (if month < 4, use previous year)
 */
async function generateRequestId(): Promise<string> {
  const now = new Date();
  const fiscalYear = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
  const fy = String(fiscalYear).slice(-2);
  const seqName = `EA_REQUEST_${fy}`;

  // Atomically increment the sequence
  const result = await prisma.$queryRaw<any[]>`
    INSERT INTO eam.business_object_sequences (sequence_name, current_value)
    VALUES (${seqName}, 1)
    ON CONFLICT (sequence_name)
    DO UPDATE SET current_value = business_object_sequences.current_value + 1
    RETURNING current_value
  `;
  const nextVal = Number(result[0].current_value);
  return `EA${fy}${String(nextVal).padStart(4, '0')}`;
}

// GET /api/ea-requests — List with pagination, filtering, sorting
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, sortField, sortOrder, skip } = getPaginationParams(req);
    const {
      requestId, status, reviewResult, scope, projectName, requestorName, organization,
      reviewerName, dateFrom, dateTo, bizType, scoreMin, scoreMax, firstPass,
      leadTimeMin, leadTimeMax, workerType,
    } = req.query;

    // Build WHERE conditions (always exclude Deleted, matching dashboard query)
    const conditions: string[] = ["r.status <> 'Deleted'"];
    const params: any[] = [];
    const extraJoins: string[] = [];
    let idx = 1;

    if (requestId) {
      conditions.push(`r.request_id ILIKE $${idx++}`);
      params.push(`%${requestId}%`);
    }
    if (status) {
      conditions.push(`r.status = $${idx++}`);
      params.push(status);
    }
    if (reviewResult) {
      conditions.push(`r.review_result = $${idx++}`);
      params.push(reviewResult);
    }
    if (scope) {
      conditions.push(`r.review_scope = $${idx++}`);
      params.push(scope);
    }
    if (requestorName) {
      conditions.push(`r.requester ILIKE $${idx++}`);
      params.push(`%${requestorName}%`);
    }
    if (organization === 'Other') {
      conditions.push(`(r.organization IS NULL OR r.organization <> 'DTIT')`);
    } else if (organization) {
      conditions.push(`r.organization = $${idx++}`);
      params.push(organization);
    }
    if (projectName) {
      conditions.push(`p.project_name ILIKE $${idx++}`);
      params.push(`%${projectName}%`);
    }
    // --- New drill-down filters ---
    if (reviewerName) {
      conditions.push(
        `EXISTS (SELECT 1 FROM eam.eam_bigea_team_members _rv WHERE _rv.itcode = ANY(r.assign_reviewer) AND _rv.name = $${idx++})`
      );
      params.push(reviewerName);
    }
    if (workerType) {
      extraJoins.push(`JOIN eam.eam_bigea_team_members _wt2 ON _wt2.itcode = ANY(r.assign_reviewer)`);
      conditions.push(`_wt2.worker_type = $${idx++}`);
      params.push(workerType);
    }
    if (dateFrom) {
      conditions.push(`r.create_at >= $${idx++}::timestamp`);
      params.push(dateFrom);
    }
    if (dateTo) {
      conditions.push(`r.create_at < ($${idx++}::timestamp + interval '1 day')`);
      params.push(dateTo);
    }
    if (firstPass === 'true') {
      conditions.push(`NOT EXISTS (SELECT 1 FROM eam.eam_request_process_log l WHERE l.request_id = r.request_id AND l.action = 'Returned by EA')`);
      conditions.push(`NOT EXISTS (SELECT 1 FROM eam.eam_meetings m WHERE m.request_id = r.request_id)`);
      conditions.push(`NOT EXISTS (SELECT 1 FROM eam.eam_actions act WHERE act.request_id = r.request_id)`);
    }
    if (leadTimeMin || leadTimeMax) {
      conditions.push(`r.status = 'Completed'`);
      conditions.push(`r.update_at IS NOT NULL`);
      if (leadTimeMin) {
        conditions.push(`ROUND(EXTRACT(EPOCH FROM (r.update_at - r.create_at)) / 86400::numeric, 1) >= $${idx++}`);
        params.push(parseFloat(leadTimeMin as string));
      }
      if (leadTimeMax) {
        conditions.push(`ROUND(EXTRACT(EPOCH FROM (r.update_at - r.create_at)) / 86400::numeric, 1) <= $${idx++}`);
        params.push(parseFloat(leadTimeMax as string));
      }
    }
    if (bizType || scoreMin || scoreMax) {
      extraJoins.push(`INNER JOIN eam.eam_request_attachment att ON att.request_id = r.request_id`);
      extraJoins.push(`INNER JOIN eam.eam_arch_ai_check aic ON aic.attachment_uuid = att.id`);
      if (bizType) {
        conditions.push(`att.biz_type = $${idx++}`);
        params.push(bizType);
      }
      if (scoreMin) {
        conditions.push(`(aic.result->'overall_evaluation'->>'score')::numeric >= $${idx++}`);
        params.push(Number(scoreMin));
      }
      if (scoreMax) {
        conditions.push(`(aic.result->'overall_evaluation'->>'score')::numeric <= $${idx++}`);
        params.push(Number(scoreMax));
      }
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const fieldMap: Record<string, string> = {
      requestId:    'r.request_id',
      status:       'r.status',
      scope:        'r.review_scope',
      requestorName:'r.requester',
      reviewResult: 'r.review_result',
      projectId:    'r.project_id',
      projectName:  'p.project_name',
      wsPhase:      'r.ws_phase_name',
      reviewerName: 'r.assign_reviewer',
      pmName:       'p.pm',
      dtLeadName:   'p.dt_lead',
      changedBy:    'r.status_changed_by',
      changedAt:    'r.status_changed_at',
      createdBy:    'r.create_by',
      createdAt:    'r.create_at',
    };
    const dbSortField = (sortField && fieldMap[sortField]) || 'r.request_id';
    const dbSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const baseQuery = `
      FROM eam.eam_request r
      LEFT JOIN eam.project p ON r.project_id = p.project_id
      ${extraJoins.join('\n      ')}
      ${whereClause}
    `;

    const dataQuery = `
      SELECT DISTINCT r.*, p.project_name, p.pm, p.dt_lead
      ${baseQuery}
      ORDER BY ${dbSortField} ${dbSortOrder} NULLS LAST
      LIMIT ${pageSize} OFFSET ${skip}
    `;
    const countQuery = `SELECT COUNT(DISTINCT r.request_id) as total ${baseQuery}`;

    const [data, countResult] = await Promise.all([
      prisma.$queryRawUnsafe(dataQuery, ...params) as Promise<any[]>,
      prisma.$queryRawUnsafe(countQuery, ...params) as Promise<any[]>,
    ]);

    const total = Number(countResult[0]?.total ?? 0);
    res.json(buildPaginatedResponse(data.map(mapRequest), total, page, pageSize));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch EA requests' });
  }
});

// GET /api/ea-requests/dashboard — Aggregate stats for EA Review Dashboard
// Accepts ?from=YYYY-MM-DD&to=YYYY-MM-DD for date filtering
// MUST be before /:id to avoid being caught by the param route
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const { from, to, org } = req.query;
    // Build date filter clause
    const dateConditions: string[] = ['status <> \'Deleted\''];
    const dateParams: any[] = [];
    let idx = 1;
    if (from) { dateConditions.push(`create_at >= $${idx++}::timestamp`); dateParams.push(from); }
    if (to)   { dateConditions.push(`create_at < ($${idx++}::timestamp + interval '1 day')`); dateParams.push(to); }
    const dateWhere = dateConditions.join(' AND ');

    // Organization filter for monthly charts
    const orgFilter = org === 'DTIT' ? " AND organization = 'DTIT'" : org === 'other' ? " AND organization <> 'DTIT'" : '';
    const rOrgFilter = org === 'DTIT' ? " AND r.organization = 'DTIT'" : org === 'other' ? " AND r.organization <> 'DTIT'" : '';

    // Worker type filter (EA Office / Domain Architect)
    const workerType = req.query.workerType as string | undefined;
    // EXISTS subquery for queries without team_members JOIN (unaliased table)
    const wtFilter = workerType === 'EA Office'
      ? " AND EXISTS (SELECT 1 FROM eam.eam_bigea_team_members _wt WHERE _wt.itcode = ANY(assign_reviewer) AND _wt.worker_type = 'EA Office')"
      : workerType === 'Domain Architect'
      ? " AND EXISTS (SELECT 1 FROM eam.eam_bigea_team_members _wt WHERE _wt.itcode = ANY(assign_reviewer) AND _wt.worker_type = 'Domain Architect')"
      : '';
    // EXISTS subquery for queries with r-aliased eam_request
    const rWtFilter = workerType === 'EA Office'
      ? " AND EXISTS (SELECT 1 FROM eam.eam_bigea_team_members _wt WHERE _wt.itcode = ANY(r.assign_reviewer) AND _wt.worker_type = 'EA Office')"
      : workerType === 'Domain Architect'
      ? " AND EXISTS (SELECT 1 FROM eam.eam_bigea_team_members _wt WHERE _wt.itcode = ANY(r.assign_reviewer) AND _wt.worker_type = 'Domain Architect')"
      : '';
    // For queries already JOINed with t alias on team_members
    const tWtFilter = workerType === 'EA Office'
      ? " AND t.worker_type = 'EA Office'"
      : workerType === 'Domain Architect'
      ? " AND t.worker_type = 'Domain Architect'"
      : '';

    // Table-aliased version for JOINed queries
    const rDateConds: string[] = ["r.status <> 'Deleted'"];
    let ri = 1;
    if (from) { rDateConds.push(`r.create_at >= $${ri++}::timestamp`); }
    if (to)   { rDateConds.push(`r.create_at < ($${ri++}::timestamp + interval '1 day')`); }
    const rDateWhere = rDateConds.join(' AND ');

    const [
      statusCounts,
      completedResultCounts,
      orgCounts,
      monthlyTrend,
      monthlyLeadTime,
      monthlyByOrg,
      recentRequests,
      architectByOrgType,
      topArchitects,
      monthlyReviewActivity,
      monthlyOrgTypeTrend,
      diagramScoreStats,
      monthlyArchScore,
      firstPassRate,
      scoreDistribution,
      monthlyFirstPass,
      monthlyTopArchitects,
    ] = await Promise.all([
      // 1. Count by status
      prisma.$queryRawUnsafe(`
        SELECT status, COUNT(*)::int as count
        FROM eam.eam_request WHERE ${dateWhere}${orgFilter}${wtFilter}
        GROUP BY status ORDER BY count DESC
      `, ...dateParams),
      // 2. Count by review_result for Completed requests only
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(review_result, 'Unknown') as result, COUNT(*)::int as count
        FROM eam.eam_request WHERE ${dateWhere}${orgFilter}${wtFilter} AND status = 'Completed'
        GROUP BY review_result ORDER BY count DESC
      `, ...dateParams),
      // 3. Count by organization
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(organization, 'Unknown') as organization, COUNT(*)::int as count
        FROM eam.eam_request WHERE ${dateWhere}${orgFilter}${wtFilter}
        GROUP BY organization ORDER BY count DESC
      `, ...dateParams),
      // 4. Monthly trend: submitted and approved counts per month
      prisma.$queryRawUnsafe(`
        SELECT
          TO_CHAR(create_at, 'YYYY-MM') as month,
          COUNT(*)::int as submitted,
          COUNT(*) FILTER (WHERE review_result IN ('Approved','Approved with Actions'))::int as approved
        FROM eam.eam_request WHERE ${dateWhere}${orgFilter}${wtFilter}
        GROUP BY TO_CHAR(create_at, 'YYYY-MM')
        ORDER BY month
      `, ...dateParams),
      // 5. Monthly lead time min/avg/max (days from create to last update, completed only)
      prisma.$queryRawUnsafe(`
        SELECT
          TO_CHAR(create_at, 'YYYY-MM') as month,
          ROUND(MIN(EXTRACT(EPOCH FROM (update_at - create_at)) / 86400)::numeric, 1) as min_days,
          ROUND(AVG(EXTRACT(EPOCH FROM (update_at - create_at)) / 86400)::numeric, 1) as avg_days,
          ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (update_at - create_at)) / 86400))::numeric, 1) as median_days,
          ROUND(MAX(EXTRACT(EPOCH FROM (update_at - create_at)) / 86400)::numeric, 1) as max_days
        FROM eam.eam_request
        WHERE ${dateWhere}${orgFilter}${wtFilter} AND status = 'Completed' AND update_at IS NOT NULL
        GROUP BY TO_CHAR(create_at, 'YYYY-MM')
        ORDER BY month
      `, ...dateParams),
      // 6. Monthly by organization
      prisma.$queryRawUnsafe(`
        SELECT
          TO_CHAR(create_at, 'YYYY-MM') as month,
          COALESCE(organization, 'Unknown') as organization,
          COUNT(*)::int as count
        FROM eam.eam_request WHERE ${dateWhere}${orgFilter}${wtFilter}
        GROUP BY TO_CHAR(create_at, 'YYYY-MM'), organization
        ORDER BY month, count DESC
      `, ...dateParams),
      // 7. Recent requests (last 10, within date range)
      (async () => {
        const conds: string[] = ['r.status <> \'Deleted\''];
        const p: any[] = [];
        let pi = 1;
        if (from) { conds.push(`r.create_at >= $${pi++}::timestamp`); p.push(from); }
        if (to)   { conds.push(`r.create_at < ($${pi++}::timestamp + interval '1 day')`); p.push(to); }
        return prisma.$queryRawUnsafe(`
          SELECT r.request_id, r.status, r.review_result, r.organization,
                 r.requester, r.create_at, r.update_at,
                 p.project_name, r.review_scope
          FROM eam.eam_request r
          LEFT JOIN eam.project p ON r.project_id = p.project_id
          WHERE ${conds.join(' AND ')}${rOrgFilter}${rWtFilter}
          ORDER BY r.update_at DESC NULLS LAST
          LIMIT 10
        `, ...p);
      })(),
      // 8. Architect by Org × Worker Type (DTIT vs Other, EA Office vs Domain Architect)
      prisma.$queryRawUnsafe(`
        SELECT
          CASE WHEN r.organization = 'DTIT' THEN 'DTIT' ELSE 'Other' END AS org_group,
          t.worker_type,
          COUNT(DISTINCT r.id)::int AS count,
          COUNT(DISTINCT t.itcode)::int AS architect_count,
          COUNT(DISTINCT m.id)::int AS meeting_count,
          COUNT(DISTINCT ac.id)::int AS action_count
        FROM eam.eam_request r
        JOIN eam.eam_bigea_team_members t ON t.itcode = ANY(r.assign_reviewer)
        LEFT JOIN eam.eam_meetings m ON m.project_id = r.project_id
        LEFT JOIN eam.eam_actions ac ON ac.project_id = r.project_id
        WHERE ${rDateWhere}${rOrgFilter}${tWtFilter}
          AND t.worker_type IN ('EA Office', 'Domain Architect')
        GROUP BY org_group, t.worker_type
        ORDER BY org_group, t.worker_type
      `, ...dateParams),
      // 9. Top 10 architects workload (reviews, meetings, actions)
      prisma.$queryRawUnsafe(`
        SELECT
          t.name AS architect_name,
          COUNT(DISTINCT r.id)::int AS count,
          COUNT(DISTINCT m.id)::int AS meeting_count,
          COUNT(DISTINCT ac.id)::int AS action_count
        FROM eam.eam_request r
        JOIN eam.eam_bigea_team_members t ON t.itcode = ANY(r.assign_reviewer)
        LEFT JOIN eam.eam_meetings m ON m.project_id = r.project_id
        LEFT JOIN eam.eam_actions ac ON ac.project_id = r.project_id
        WHERE ${rDateWhere}${rOrgFilter}${tWtFilter}
        GROUP BY t.name
        ORDER BY count DESC
        LIMIT 10
      `, ...dateParams),
      // 10. Monthly review activity: min/avg/max meetings & actions per project
      prisma.$queryRawUnsafe(`
        SELECT month,
               ROUND(meetings::numeric / NULLIF(projects, 0), 1) AS avg_meetings,
               ROUND(actions::numeric / NULLIF(projects, 0), 1) AS avg_actions,
               min_meetings, max_meetings,
               min_actions, max_actions
        FROM (
          SELECT m.month, m.projects, m.meetings,
                 m.min_meetings, m.max_meetings,
                 COALESCE(a.actions, 0) AS actions,
                 COALESCE(a.min_actions, 0) AS min_actions,
                 COALESCE(a.max_actions, 0) AS max_actions
          FROM (
            SELECT TO_CHAR(mt.create_at, 'YYYY-MM') AS month,
                   COUNT(DISTINCT mt.project_id)::int AS projects,
                   COUNT(*)::int AS meetings,
                   MIN(pc.cnt)::int AS min_meetings,
                   MAX(pc.cnt)::int AS max_meetings
            FROM eam.eam_meetings mt
            JOIN (SELECT project_id, TO_CHAR(create_at, 'YYYY-MM') AS month, COUNT(*)::int AS cnt FROM eam.eam_meetings WHERE create_at IS NOT NULL GROUP BY project_id, TO_CHAR(create_at, 'YYYY-MM')) pc ON pc.project_id = mt.project_id AND pc.month = TO_CHAR(mt.create_at, 'YYYY-MM')
            ${orgFilter || rWtFilter ? 'JOIN eam.eam_request r ON r.project_id = mt.project_id AND r.status <> \'Deleted\'' + rOrgFilter + rWtFilter : ''}
            WHERE mt.create_at IS NOT NULL
            GROUP BY TO_CHAR(mt.create_at, 'YYYY-MM')
          ) m
          LEFT JOIN (
            SELECT TO_CHAR(ac.create_at, 'YYYY-MM') AS month,
                   COUNT(*)::int AS actions,
                   MIN(pc2.cnt)::int AS min_actions,
                   MAX(pc2.cnt)::int AS max_actions
            FROM eam.eam_actions ac
            JOIN (SELECT project_id, TO_CHAR(create_at, 'YYYY-MM') AS month, COUNT(*)::int AS cnt FROM eam.eam_actions WHERE create_at IS NOT NULL GROUP BY project_id, TO_CHAR(create_at, 'YYYY-MM')) pc2 ON pc2.project_id = ac.project_id AND pc2.month = TO_CHAR(ac.create_at, 'YYYY-MM')
            ${orgFilter || rWtFilter ? 'JOIN eam.eam_request r2 ON r2.project_id = ac.project_id AND r2.status <> \'Deleted\'' + rOrgFilter.replace(/r\./g, 'r2.') + rWtFilter.replace(/r\./g, 'r2.') : ''}
            WHERE ac.create_at IS NOT NULL
            GROUP BY TO_CHAR(ac.create_at, 'YYYY-MM')
          ) a ON a.month = m.month
        ) sub
        ORDER BY month
      `),
      // 11. Monthly Org × Worker Type trend
      prisma.$queryRawUnsafe(`
        SELECT
          TO_CHAR(r.create_at, 'YYYY-MM') AS month,
          CASE WHEN r.organization = 'DTIT' THEN 'DTIT' ELSE 'Other' END AS org_group,
          t.worker_type,
          COUNT(DISTINCT r.id)::int AS count,
          COUNT(DISTINCT t.itcode)::int AS architect_count
        FROM eam.eam_request r
        JOIN eam.eam_bigea_team_members t ON t.itcode = ANY(r.assign_reviewer)
        WHERE ${rDateWhere}${rOrgFilter}${tWtFilter}
          AND t.worker_type IN ('EA Office', 'Domain Architect')
        GROUP BY TO_CHAR(r.create_at, 'YYYY-MM'), org_group, t.worker_type
        ORDER BY month, org_group, t.worker_type
      `, ...dateParams),
      // 12. Architecture Diagram Score Stats (min/max/avg by biz_type)
      prisma.$queryRawUnsafe(`
        SELECT
          a.biz_type,
          MIN((c.result->'overall_evaluation'->>'score')::numeric) AS min_score,
          MAX((c.result->'overall_evaluation'->>'score')::numeric) AS max_score,
          ROUND(AVG((c.result->'overall_evaluation'->>'score')::numeric), 1) AS avg_score,
          ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (c.result->'overall_evaluation'->>'score')::numeric))::numeric, 1) AS median_score,
          COUNT(*)::int AS total
        FROM eam.eam_arch_ai_check c
        JOIN eam.eam_request_attachment a ON a.id = c.attachment_uuid
        JOIN eam.eam_request r ON r.request_id = a.request_id
        WHERE ${rDateWhere}${rOrgFilter}${rWtFilter}
          AND c.result->'overall_evaluation'->>'score' IS NOT NULL
        GROUP BY a.biz_type
        ORDER BY a.biz_type
      `, ...dateParams),
      // 13. Monthly Architecture Score Trends (min/avg/median/max per month per biz_type)
      prisma.$queryRawUnsafe(`
        SELECT
          TO_CHAR(r.create_at, 'YYYY-MM') AS month,
          a.biz_type,
          MIN((c.result->'overall_evaluation'->>'score')::numeric) AS min_score,
          ROUND(AVG((c.result->'overall_evaluation'->>'score')::numeric), 1) AS avg_score,
          ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (c.result->'overall_evaluation'->>'score')::numeric))::numeric, 1) AS median_score,
          MAX((c.result->'overall_evaluation'->>'score')::numeric) AS max_score,
          COUNT(*)::int AS total
        FROM eam.eam_arch_ai_check c
        JOIN eam.eam_request_attachment a ON a.id = c.attachment_uuid
        JOIN eam.eam_request r ON r.request_id = a.request_id
        WHERE ${rDateWhere}${rOrgFilter}${rWtFilter}
          AND c.result->'overall_evaluation'->>'score' IS NOT NULL
        GROUP BY TO_CHAR(r.create_at, 'YYYY-MM'), a.biz_type
        ORDER BY month, a.biz_type
      `, ...dateParams),
      // 14. First-pass approval rate (no return, no meeting, no action) + breakdown
      prisma.$queryRawUnsafe(`
        SELECT
          COUNT(*)::int AS total_completed,
          COUNT(*) FILTER (
            WHERE NOT EXISTS (
              SELECT 1 FROM eam.eam_request_process_log l
              WHERE l.request_id = r.request_id
                AND l.action = 'Returned by EA'
            )
            AND NOT EXISTS (
              SELECT 1 FROM eam.eam_meetings m
              WHERE m.request_id = r.request_id
            )
            AND NOT EXISTS (
              SELECT 1 FROM eam.eam_actions act
              WHERE act.request_id = r.request_id
            )
          )::int AS first_pass_count,
          COUNT(*) FILTER (
            WHERE EXISTS (
              SELECT 1 FROM eam.eam_request_process_log l
              WHERE l.request_id = r.request_id
                AND l.action = 'Returned by EA'
            )
          )::int AS return_count,
          COUNT(*) FILTER (
            WHERE EXISTS (
              SELECT 1 FROM eam.eam_meetings m
              WHERE m.request_id = r.request_id
            )
          )::int AS meeting_count,
          COUNT(*) FILTER (
            WHERE EXISTS (
              SELECT 1 FROM eam.eam_actions act
              WHERE act.request_id = r.request_id
            )
          )::int AS action_count
        FROM eam.eam_request r
        WHERE r.status = 'Completed' AND ${dateWhere}${orgFilter}${wtFilter}
      `, ...dateParams),
      // 15. Individual scores for scatter plot
      prisma.$queryRawUnsafe(`
        SELECT
          a.biz_type,
          ROUND((c.result->'overall_evaluation'->>'score')::numeric, 2) AS score
        FROM eam.eam_arch_ai_check c
        JOIN eam.eam_request_attachment a ON a.id = c.attachment_uuid
        JOIN eam.eam_request r ON r.request_id = a.request_id
        WHERE ${rDateWhere}${rOrgFilter}${rWtFilter}
          AND c.result->'overall_evaluation'->>'score' IS NOT NULL
        ORDER BY a.biz_type, score
      `, ...dateParams),
      // 16. Monthly first-pass approval rate trend (no return, no meeting, no action)
      prisma.$queryRawUnsafe(`
        SELECT
          TO_CHAR(r.create_at, 'YYYY-MM') AS month,
          COUNT(*)::int AS total,
          COUNT(*) FILTER (
            WHERE NOT EXISTS (
              SELECT 1 FROM eam.eam_request_process_log l
              WHERE l.request_id = r.request_id
                AND l.action = 'Returned by EA'
            )
            AND NOT EXISTS (
              SELECT 1 FROM eam.eam_meetings m
              WHERE m.request_id = r.request_id
            )
            AND NOT EXISTS (
              SELECT 1 FROM eam.eam_actions act
              WHERE act.request_id = r.request_id
            )
          )::int AS first_pass
        FROM eam.eam_request r
        WHERE r.status = 'Completed' AND ${dateWhere}${orgFilter}${wtFilter}
        GROUP BY TO_CHAR(r.create_at, 'YYYY-MM')
        ORDER BY month
      `, ...dateParams),
      // 17. Monthly Top 10 Architects by project count
      prisma.$queryRawUnsafe(`
        SELECT month, architect_name, project_count, rank::int
        FROM (
          SELECT
            TO_CHAR(r.create_at, 'YYYY-MM') AS month,
            t.name AS architect_name,
            COUNT(DISTINCT r.id)::int AS project_count,
            ROW_NUMBER() OVER (
              PARTITION BY TO_CHAR(r.create_at, 'YYYY-MM')
              ORDER BY COUNT(DISTINCT r.id) DESC
            ) AS rank
          FROM eam.eam_request r
          JOIN eam.eam_bigea_team_members t ON t.itcode = ANY(r.assign_reviewer)
          WHERE ${rDateWhere}${rOrgFilter}${tWtFilter}
          GROUP BY TO_CHAR(r.create_at, 'YYYY-MM'), t.name
        ) ranked
        WHERE rank <= 10
        ORDER BY month, rank
      `, ...dateParams),
    ]) as [any[], any[], any[], any[], any[], any[], any[], any[], any[], any[], any[], any[], any[], any[], any[], any[], any[]];

    const total = (statusCounts as any[]).reduce((sum: number, r: any) => sum + r.count, 0);

    res.json({
      total,
      statusCounts,
      completedResultCounts,
      orgCounts,
      monthlyTrend,
      monthlyLeadTime,
      monthlyByOrg,
      architectByOrgType,
      topArchitects,
      monthlyReviewActivity,
      monthlyOrgTypeTrend,
      diagramScoreStats,
      monthlyArchScore,
      firstPassRate: (firstPassRate as any[])[0] || { total_completed: 0, first_pass_count: 0 },
      scoreDistribution,
      monthlyFirstPass,
      monthlyTopArchitects,
      recentRequests: (recentRequests as any[]).map((r: any) => ({
        requestId: r.request_id,
        status: r.status,
        reviewResult: r.review_result,
        organization: r.organization,
        requester: r.requester,
        projectName: r.project_name,
        reviewScope: r.review_scope,
        createdAt: r.create_at,
        updatedAt: r.update_at,
      })),
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// GET /api/ea-requests/filter-options — Distinct values for search dropdowns
// MUST be before /:id to avoid being caught by the param route
router.get('/filter-options', async (_req: Request, res: Response) => {
  try {
    const [projects, orgs] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT DISTINCT p.project_name
        FROM eam.eam_request r
        LEFT JOIN eam.project p ON r.project_id = p.project_id
        WHERE p.project_name IS NOT NULL AND p.project_name <> ''
        ORDER BY p.project_name
      `,
      prisma.$queryRaw<any[]>`
        SELECT DISTINCT organization
        FROM eam.eam_request
        WHERE organization IS NOT NULL AND organization <> ''
        ORDER BY organization
      `,
    ]);
    res.json({
      projects: projects.map((r: any) => r.project_name),
      organizations: orgs.map((r: any) => r.organization),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
});

// GET /api/ea-requests/:id — Get single request by request_id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const requestId = req.params.id;
    const [data, attachmentRows] = await Promise.all([
      prisma.$queryRaw`
        SELECT r.*, p.project_name, p.pm, p.dt_lead
        FROM eam.eam_request r
        LEFT JOIN eam.project p ON r.project_id = p.project_id
        WHERE r.request_id = ${requestId}
        LIMIT 1
      ` as Promise<any[]>,
      prisma.$queryRaw`
        SELECT DISTINCT ON (a.id)
               a.id, a.attachment_name, a.biz_type, a.app_arch_type,
               a.create_at, a.create_by,
               c.result as ai_result, c.create_at as ai_check_at
        FROM eam.eam_request_attachment a
        LEFT JOIN eam.eam_arch_ai_check c ON c.attachment_uuid = a.id
        WHERE a.request_id = ${requestId}
        ORDER BY a.id, c.create_at DESC NULLS LAST
      ` as Promise<any[]>,
    ]);
    if (!data.length) return res.status(404).json({ error: 'Request not found' });

    // Extract file name from path like "pm/eam/app/filename-123.ext"
    const extractFileName = (path: string | null) => {
      if (!path) return '';
      const parts = path.split('/');
      return parts[parts.length - 1];
    };

    // Parse AI result JSON
    const parseAiResult = (result: any) => {
      if (!result) return null;
      try { return typeof result === 'string' ? JSON.parse(result) : result; }
      catch { return null; }
    };

    const mapAttachment = (row: any) => {
      const aiResult = parseAiResult(row.ai_result);
      return {
        id:          row.id,
        fileName:    extractFileName(row.attachment_name),
        filePath:    row.attachment_name ?? '',
        uploadBy:    row.create_by ?? '',
        createdAt:   row.create_at,
        aiScore:     aiResult?.overall_evaluation?.score ?? null,
        aiResult,
        evaluatedAt: row.ai_check_at ?? null,
        appArchType: row.app_arch_type ?? null,
      };
    };

    const appDiagrams  = attachmentRows.filter((r: any) => r.biz_type === 'App_Arch').map(mapAttachment);
    const techDiagrams = attachmentRows.filter((r: any) => r.biz_type === 'Tech_Arch').map(mapAttachment);
    const attachments  = attachmentRows.filter((r: any) => r.biz_type === 'Proj_Intro').map(mapAttachment);

    res.json({ ...mapRequest(data[0]), appDiagrams, techDiagrams, attachments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

// GET /api/ea-requests/attachments/:attachmentId/download — Download attachment file
router.get('/attachments/:attachmentId/download', async (req: Request, res: Response) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT attachment_name FROM eam.eam_request_attachment WHERE id = ${req.params.attachmentId} LIMIT 1
    ` as any[];
    if (!rows.length) return res.status(404).json({ error: 'Attachment not found' });
    const filePath = rows[0].attachment_name;
    // TODO: Connect to actual file storage (MinIO/S3) and stream the file
    // For now return the storage path as JSON so frontend knows the path exists
    res.json({ filePath });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch attachment' });
  }
});

// POST /api/ea-requests — Create new EA request
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      projectId, reviewScope, wsPhase, requester, link,
      assignReviewer, organization, requestDesc, createdBy,
    } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    const requestId = await generateRequestId();

    const created = await prisma.eam_request.create({
      data: {
        request_id:      requestId,
        project_id:      projectId,
        review_scope:    reviewScope ?? null,
        ws_phase_name:   wsPhase ?? null,
        requester:       requester ?? null,
        status:          'Draft',
        link:            link ?? null,
        assign_reviewer: assignReviewer ?? [],
        organization:    organization ?? null,
        request_desc:    requestDesc ?? null,
        create_by:       createdBy ?? null,
        create_at:       new Date(),
        update_at:       new Date(),
      },
    });

    // Log the process
    await prisma.eam_request_process_log.create({
      data: {
        request_id: requestId,
        action:     'Created',
        comment:    'Request created',
        operator:   createdBy ?? null,
        create_at:  new Date(),
      },
    });

    res.status(201).json(mapRequest(created));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create EA request' });
  }
});

// PUT /api/ea-requests/:id — Update EA request
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const requestId = req.params.id as string;
    const {
      reviewScope, wsPhase, requester, status, link,
      assignReviewer, reviewResult, organization, requestDesc,
      statusRemark, updatedBy,
    } = req.body;

    // Find existing
    const existing = await prisma.eam_request.findFirst({ where: { request_id: requestId } });
    if (!existing) return res.status(404).json({ error: 'Request not found' });

    const updateData: any = { update_at: new Date() };
    if (reviewScope !== undefined)   updateData.review_scope     = reviewScope;
    if (wsPhase !== undefined)       updateData.ws_phase_name    = wsPhase;
    if (requester !== undefined)     updateData.requester        = requester;
    if (status !== undefined)        updateData.status           = status;
    if (link !== undefined)          updateData.link             = link;
    if (assignReviewer !== undefined) updateData.assign_reviewer  = assignReviewer;
    if (reviewResult !== undefined)  updateData.review_result    = reviewResult;
    if (organization !== undefined)  updateData.organization     = organization;
    if (requestDesc !== undefined)   updateData.request_desc     = requestDesc;
    if (statusRemark !== undefined)  updateData.status_remark    = statusRemark;
    if (updatedBy !== undefined)     updateData.update_by        = updatedBy;

    // Track status change
    if (status && status !== existing.status) {
      updateData.status_changed_by = updatedBy ?? null;
      updateData.status_changed_at = new Date();

      // Log the process
      await prisma.eam_request_process_log.create({
        data: {
          request_id: requestId,
          action:     `Status changed: ${existing.status} → ${status}`,
          comment:    statusRemark ?? null,
          operator:   updatedBy ?? null,
          create_at:  new Date(),
        },
      });
    }

    const updated = await prisma.eam_request.update({
      where: { id: existing.id },
      data: updateData,
    });

    res.json(mapRequest(updated));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update EA request' });
  }
});

// DELETE /api/ea-requests/:id — Soft delete (set status to Deleted)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const requestId = req.params.id as string;
    const existing = await prisma.eam_request.findFirst({ where: { request_id: requestId } });
    if (!existing) return res.status(404).json({ error: 'Request not found' });

    await prisma.eam_request.update({
      where: { id: existing.id },
      data: {
        status:     'Deleted',
        update_at:  new Date(),
        status_changed_at: new Date(),
      },
    });

    res.json({ message: 'Request deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete EA request' });
  }
});

export { router as eaRequestRoutes };

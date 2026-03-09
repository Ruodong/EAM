import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

/**
 * Generic CSV export endpoint.
 * GET /api/export/:entity
 * Returns CSV data with content-disposition header.
 */

function escapeCsvValue(val: any): string {
  if (val === null || val === undefined) return '';
  let str = String(val).replace(/"/g, '""');
  // Prevent CSV formula injection: prefix dangerous leading chars with a single quote
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
}

function toCsv(rows: Record<string, any>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const csvRows = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => escapeCsvValue(row[h])).join(',')
    ),
  ];
  return csvRows.join('\n');
}

router.get('/:entity', async (req: Request, res: Response) => {
  try {
    const entity = req.params.entity as string;
    let data: Record<string, any>[] = [];
    let filename = `${entity}-export.csv`;

    switch (entity) {
      case 'ea-requests': {
        const rows = await prisma.$queryRaw`
          SELECT r.request_id, r.status, r.review_result, r.review_scope,
                 r.ws_phase_name, r.requester, r.organization,
                 p.project_id, p.project_name, p.pm,
                 r.create_at, r.create_by
          FROM eam.eam_request r
          LEFT JOIN eam.project p ON r.project_id = p.project_id
          ORDER BY r.request_id DESC
          LIMIT 5000
        ` as any[];
        data = rows.map(r => ({
          'Request ID': r.request_id,
          'Status': r.status,
          'Review Result': r.review_result,
          'Review Scope': r.review_scope,
          'WS Phase': r.ws_phase_name,
          'Requestor': r.requester,
          'Organization': r.organization,
          'Project ID': r.project_id,
          'Project Name': r.project_name,
          'PM': r.pm,
          'Created At': r.create_at ? new Date(r.create_at).toISOString() : '',
          'Created By': r.create_by,
        }));
        filename = 'ea-requests-export.csv';
        break;
      }

      case 'projects': {
        const rows = await prisma.project.findMany({
          orderBy: { project_id: 'desc' },
          take: 5000,
        });
        data = rows.map(p => ({
          'Project ID': p.project_id,
          'Project Name': p.project_name,
          'Type': p.type,
          'PM': p.pm,
          'DT Lead': p.dt_lead,
          'IT Lead': p.it_lead,
          'Status': p.status,
          'Start Date': p.start_date || '',
          'Go Live Date': p.go_live_date || '',
          'AI Related': p.ai_related,
          'Created At': p.create_at ? new Date(p.create_at).toISOString() : '',
        }));
        filename = 'projects-export.csv';
        break;
      }

      case 'meetings': {
        const rows = await prisma.$queryRaw`
          SELECT meeting_no, meeting_title, request_id, project_id,
                 start_time, end_time, status, create_by, create_at
          FROM eam.eam_meetings
          ORDER BY meeting_no DESC NULLS LAST
          LIMIT 5000
        ` as any[];
        data = rows.map(m => ({
          'Meeting No': m.meeting_no,
          'Title': m.meeting_title,
          'Request ID': m.request_id,
          'Project ID': m.project_id,
          'Start Time': m.start_time ? new Date(m.start_time).toISOString() : '',
          'End Time': m.end_time ? new Date(m.end_time).toISOString() : '',
          'Status': m.status,
          'Created By': m.create_by,
          'Created At': m.create_at ? new Date(m.create_at).toISOString() : '',
        }));
        filename = 'meetings-export.csv';
        break;
      }

      case 'actions': {
        const rows = await prisma.$queryRaw`
          SELECT action_no, action_title, request_id, project_id,
                 type, priority, status, assignee_name, due_date,
                 start_date, close_date, create_at
          FROM eam.eam_actions
          ORDER BY action_no DESC NULLS LAST
          LIMIT 5000
        ` as any[];
        data = rows.map(a => ({
          'Action No': a.action_no,
          'Title': a.action_title,
          'Request ID': a.request_id,
          'Project ID': a.project_id,
          'Type': a.type,
          'Priority': a.priority,
          'Status': a.status,
          'Assignee': Array.isArray(a.assignee_name) ? a.assignee_name.join('; ') : (a.assignee_name ?? ''),
          'Due Date': a.due_date || '',
          'Start Date': a.start_date ? new Date(a.start_date).toISOString() : '',
          'Close Date': a.close_date || '',
          'Created At': a.create_at ? new Date(a.create_at).toISOString() : '',
        }));
        filename = 'actions-export.csv';
        break;
      }

      case 'bcm': {
        const { appId, name, domainL1, subDomainL2, bcName, version } = req.query as Record<string, string>;
        const conditions: string[] = [];
        if (appId)       conditions.push(`b.app_id ILIKE '%${appId.replace(/'/g, "''")}%'`);
        if (name)        conditions.push(`a.app_name ILIKE '%${name.replace(/'/g, "''")}%'`);
        if (domainL1)    conditions.push(`m.lv1_domain ILIKE '%${domainL1.replace(/'/g, "''")}%'`);
        if (subDomainL2) conditions.push(`m.lv2_sub_domain ILIKE '%${subDomainL2.replace(/'/g, "''")}%'`);
        if (bcName)      conditions.push(`m.bc_name ILIKE '%${bcName.replace(/'/g, "''")}%'`);
        if (version)     conditions.push(`m.data_version = '${version.replace(/'/g, "''")}'`);
        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const bcmRows = await prisma.$queryRawUnsafe<any[]>(`
          SELECT b.app_id,
                 COALESCE(a.app_name, '') AS app_name,
                 COALESCE(a.app_it_owner, '') AS app_it_owner,
                 COALESCE(a.current_state, '') AS current_state,
                 COALESCE(a.app_ownership, '') AS app_ownership,
                 COALESCE(a.app_solution_owner, '') AS app_solution_owner,
                 COALESCE(a.portfolio_mgt, '') AS portfolio_mgt,
                 COALESCE(a.app_solution_type, '') AS app_solution_type,
                 COALESCE(a.app_classification, '') AS app_classification,
                 COALESCE(a.business_function, '') AS business_function,
                 m.bc_id, m.bc_name, m.lv1_domain, m.lv2_sub_domain,
                 m.lv3_capability_group, m.data_version
          FROM eam.biz_cap_map b
          JOIN eam.bcpf_master_data m ON b.bcpf_master_id = m.id
          LEFT JOIN eam.project_app a ON b.app_id = a.app_id
          ${whereClause}
          ORDER BY b.app_id ASC, m.bc_id ASC
          LIMIT 50000
        `);
        data = bcmRows.map(r => ({
          'App ID': r.app_id,
          'Application Name': r.app_name,
          'DT Owner': r.app_it_owner,
          'Status': r.current_state,
          'App Ownership': r.app_ownership,
          'Solution Owner': r.app_solution_owner,
          'Portfolio Management': r.portfolio_mgt,
          'Solution Type': r.app_solution_type,
          'Classification': r.app_classification,
          'Business Function': r.business_function,
          'BC ID': r.bc_id,
          'BC Name': r.bc_name,
          'Domain L1': r.lv1_domain,
          'Sub Domain L2': r.lv2_sub_domain,
          'Capability Group L3': r.lv3_capability_group,
          'Version': r.data_version,
        }));
        filename = 'bcm-export.csv';
        break;
      }

      case 'lead-time': {
        // Batch-load approach: 3 queries instead of N+1
        const requests = await prisma.eam_request.findMany({
          orderBy: { create_at: 'desc' },
          take: 5000,
        });

        // Batch-load all projects in one query
        const projectIds = [...new Set(requests.map(r => r.project_id).filter(Boolean))] as string[];
        const projects = await prisma.project.findMany({
          where: { project_id: { in: projectIds } },
          select: { project_id: true, project_name: true },
        });
        const projectMap = new Map(projects.map(p => [p.project_id, p.project_name]));

        // Batch-load all process logs in one query
        const requestIds = requests.map(r => r.request_id).filter(Boolean) as string[];
        const allLogs = await prisma.eam_request_process_log.findMany({
          where: { request_id: { in: requestIds } },
          orderBy: { create_at: 'asc' },
        });
        const logMap = new Map<string, typeof allLogs>();
        allLogs.forEach(log => {
          const key = log.request_id ?? '';
          if (!logMap.has(key)) logMap.set(key, []);
          logMap.get(key)!.push(log);
        });

        // Map results using lookups (no per-row queries)
        const results = requests.map(r => {
          const projectName = projectMap.get(r.project_id ?? '') ?? '';
          const processLogs = logMap.get(r.request_id ?? '') ?? [];
          let draftTime: Date | null = r.create_at;
          let inProgressTime: Date | null = null;
          let completedTime: Date | null = null;
          for (const log of processLogs) {
            const action = (log.action ?? '').toLowerCase();
            if (action.includes('in progress') || action.includes('submit') || action.includes('accept')) {
              if (!inProgressTime) inProgressTime = log.create_at;
            }
            if (action.includes('complete') || action.includes('approved') || action.includes('close')) {
              completedTime = log.create_at;
            }
          }
          let totalLeadTimeDays: number | null = null;
          if (draftTime && completedTime) {
            totalLeadTimeDays = Math.round(
              (completedTime.getTime() - draftTime.getTime()) / (1000 * 60 * 60 * 24)
            );
          }
          return {
            'Request ID': r.request_id,
            'Project ID': r.project_id,
            'Project Name': projectName,
            'Status': r.status,
            'Draft Time': draftTime?.toISOString() ?? '',
            'In Progress Time': inProgressTime?.toISOString() ?? '',
            'Completed Time': completedTime?.toISOString() ?? '',
            'Total Lead Time (Days)': totalLeadTimeDays ?? '',
          };
        });
        data = results;
        filename = 'lead-time-report-export.csv';
        break;
      }

      default:
        return res.status(400).json({ error: `Unknown entity: ${entity}` });
    }

    const csv = toCsv(data);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM for Excel UTF-8 compat
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

export { router as exportRoutes };

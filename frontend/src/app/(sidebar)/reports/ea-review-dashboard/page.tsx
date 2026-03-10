'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/locale';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { authHeaders } from '@/lib/auth-token';

/* ════════════════════════════════════════════
   Types
   ════════════════════════════════════════════ */

interface DashboardData {
  total: number;
  statusCounts: { status: string; count: number }[];
  completedResultCounts: { result: string; count: number }[];
  orgCounts: { organization: string; count: number }[];
  monthlyTrend: { month: string; submitted: number; approved: number }[];
  monthlyLeadTime: { month: string; min_days: string; avg_days: string; median_days: string; max_days: string }[];
  monthlyByOrg: { month: string; organization: string; count: number }[];
  recentRequests: {
    requestId: string; status: string; reviewResult: string | null;
    organization: string; requester: string; projectName: string;
    reviewScope: string; createdAt: string; updatedAt: string;
  }[];
  architectByOrgType: { org_group: string; worker_type: string; count: number; architect_count: number; meeting_count: number; action_count: number }[];
  topArchitects: { architect_name: string; count: number; meeting_count: number; action_count: number }[];
  monthlyReviewActivity: { month: string; avg_meetings: string; avg_actions: string; min_meetings: number; max_meetings: number; min_actions: number; max_actions: number }[];
  monthlyOrgTypeTrend: { month: string; org_group: string; worker_type: string; count: number; architect_count: number }[];
  diagramScoreStats: { biz_type: string; min_score: string; max_score: string; avg_score: string; median_score: string; total: number }[];
  monthlyArchScore: { month: string; biz_type: string; min_score: string; avg_score: string; median_score: string; max_score: string; total: number }[];
  firstPassRate: { total_completed: number; first_pass_count: number; return_count: number; meeting_count: number; action_count: number };
  scoreDistribution: { biz_type: string; score: number }[];
  monthlyFirstPass: { month: string; total: number; first_pass: number }[];
  monthlyTopArchitects: { month: string; architect_name: string; project_count: number; rank: number }[];
}

/* ════════════════════════════════════════════
   Date-range presets
   ════════════════════════════════════════════ */

type Preset = 'all' | '1y' | 'ytd' | 'lastQ' | 'lastM' | 'lastW' | 'custom';

function getPresetRange(preset: Preset, customFrom?: string, customTo?: string): { from: string; to: string } | null {
  if (preset === 'all') return null;
  if (preset === 'custom') {
    if (customFrom && customTo) return { from: customFrom, to: customTo };
    return null;
  }
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  let d: Date;
  switch (preset) {
    case '1y':    d = new Date(now); d.setFullYear(d.getFullYear() - 1); break;
    case 'ytd':   d = new Date(now.getFullYear(), 0, 1); break;
    case 'lastQ': d = new Date(now); d.setMonth(d.getMonth() - 3); break;
    case 'lastM': d = new Date(now); d.setMonth(d.getMonth() - 1); break;
    case 'lastW': d = new Date(now); d.setDate(d.getDate() - 7); break;
    default:      return null;
  }
  return { from: d.toISOString().slice(0, 10), to };
}

type MonthRange = 3 | 6 | 12;

function getMonthCutoff(n: MonthRange): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/* ════════════════════════════════════════════
   Colour palettes
   ════════════════════════════════════════════ */

const STATUS_PALETTE = [
  { key: 'Completed',   color: '#22c55e' },
  { key: 'In Progress', color: '#f59e0b' },
  { key: 'Draft',       color: '#94a3b8' },
  { key: 'Submitted',   color: '#3b82f6' },
  { key: 'Cancelled',   color: '#ef4444' },
];

const RESULT_PALETTE = [
  { key: 'Approved',                color: '#22c55e' },
  { key: 'Approved with Actions', color: '#14b8a6' },
  { key: 'Returned by EA',         color: '#f97316' },
  { key: 'Rejected',               color: '#ef4444' },
  { key: 'Unknown',                color: '#cbd5e1' },
];

const ORG_PALETTE = ['#a5b4fc', '#fdba74', '#86efac', '#fca5a5', '#7dd3fc', '#fde68a', '#c4b5fd', '#f9a8d4', '#cbd5e1', '#99f6e4'];


/* ════════════════════════════════════════════
   SVG Pie Chart
   ════════════════════════════════════════════ */

function PieChart({ data, size = 160, onSliceClick }: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  onSliceClick?: (label: string) => void;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="flex items-center justify-center text-xs text-gray-400" style={{ width: size, height: size }}>No data</div>;

  const r = size / 2;
  const ir = r * 0.55; // inner radius for donut
  let cumAngle = -90; // start at top

  const positiveData = data.filter(d => d.value > 0);

  // Single-slice: render a full donut ring
  if (positiveData.length === 1) {
    const d = positiveData[0];
    const strokeW = r * 0.95 - ir;
    const midR = (r * 0.95 + ir) / 2;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={r} cy={r} r={midR} fill="none" stroke={d.color} strokeWidth={strokeW}
          style={onSliceClick ? { cursor: 'pointer' } : undefined}
          onClick={onSliceClick ? () => onSliceClick(d.label) : undefined}>
          <title>{d.label}: {d.value} (100%)</title>
        </circle>
        <text x={r} y={r - 6} textAnchor="middle" className="fill-gray-800 text-lg font-bold" fontSize={20} fontWeight={700}>{total}</text>
        <text x={r} y={r + 12} textAnchor="middle" className="fill-gray-400" fontSize={10}>TOTAL</text>
      </svg>
    );
  }

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const slices = positiveData.map((d) => {
    const angle = (d.value / total) * 360;
    const startAngle = cumAngle;
    cumAngle += angle;
    const endAngle = cumAngle;
    const largeArc = angle > 180 ? 1 : 0;
    const x1 = r + r * 0.95 * Math.cos(toRad(startAngle));
    const y1 = r + r * 0.95 * Math.sin(toRad(startAngle));
    const x2 = r + r * 0.95 * Math.cos(toRad(endAngle));
    const y2 = r + r * 0.95 * Math.sin(toRad(endAngle));
    const ix1 = r + ir * Math.cos(toRad(startAngle));
    const iy1 = r + ir * Math.sin(toRad(startAngle));
    const ix2 = r + ir * Math.cos(toRad(endAngle));
    const iy2 = r + ir * Math.sin(toRad(endAngle));
    const path = [
      `M ${x1} ${y1}`,
      `A ${r * 0.95} ${r * 0.95} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix2} ${iy2}`,
      `A ${ir} ${ir} 0 ${largeArc} 0 ${ix1} ${iy1}`,
      'Z',
    ].join(' ');
    const pct = Math.round((d.value / total) * 100);
    const midAngle = (startAngle + endAngle) / 2;
    const labelR = (r * 0.95 + ir) / 2;
    const lx = r + labelR * Math.cos(toRad(midAngle));
    const ly = r + labelR * Math.sin(toRad(midAngle));
    return { ...d, path, pct, lx, ly };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s, i) => (
        <g key={i} style={onSliceClick ? { cursor: 'pointer' } : undefined}
           onClick={onSliceClick ? () => onSliceClick(s.label) : undefined}>
          <path d={s.path} fill={s.color} stroke="white" strokeWidth={2}>
            <title>{s.label}: {s.value} ({s.pct}%)</title>
          </path>
          {s.pct >= 5 && (
            <text x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={600} fill="white">{s.pct}%</text>
          )}
        </g>
      ))}
      <text x={r} y={r - 6} textAnchor="middle" className="fill-gray-800 text-lg font-bold" fontSize={20} fontWeight={700}>{total}</text>
      <text x={r} y={r + 12} textAnchor="middle" className="fill-gray-400" fontSize={10}>TOTAL</text>
    </svg>
  );
}

/* ════════════════════════════════════════════
   Sub-components
   ════════════════════════════════════════════ */

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 shadow-sm${className ? ` ${className}` : ''}`}>
      <h2 className="text-sm font-semibold text-gray-800 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function PieLegend({ items, onItemClick }: { items: { label: string; value: number; color: string; pct: number }[]; onItemClick?: (label: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((it) => (
        <div key={it.label}
          className={`flex items-center gap-2 text-xs${onItemClick ? ' cursor-pointer hover:bg-gray-50 rounded px-1 -mx-1 transition-colors' : ''}`}
          onClick={onItemClick ? () => onItemClick(it.label) : undefined}
        >
          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: it.color }} />
          <span className="text-gray-600 truncate flex-1">{it.label}</span>
          <span className="font-semibold text-gray-800">{it.value}</span>
          <span className="text-gray-400 w-8 text-right">{it.pct}%</span>
        </div>
      ))}
    </div>
  );
}

function formatMonth(m: string) {
  const [, mo] = m.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[parseInt(mo) - 1];
}

/* ════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════ */

function getMonthRange(month: string): { dateFrom: string; dateTo: string } {
  const [y, m] = month.split('-').map(Number);
  const from = `${y}-${String(m).padStart(2, '0')}-01`;
  const last = new Date(y, m, 0).getDate();
  const to = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  return { dateFrom: from, dateTo: to };
}

export default function EAReviewDashboard() {
  const t = useT();
  const drillRouter = useRouter();

  /** Navigate to the drill-down request list with filter params */
  const drillDown = useCallback((params: Record<string, string>) => {
    sessionStorage.setItem('dashboard-scroll-y', String(window.scrollY));
    const qs = new URLSearchParams(params).toString();
    drillRouter.push(`/reports/ea-review-dashboard/request-list?${qs}`);
  }, [drillRouter]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<Preset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [monthRange, setMonthRange] = useState<MonthRange>(3);
  const [monthOrg, setMonthOrg] = useState<string[]>([]);
  const [requestOrg, setRequestOrg] = useState<string[]>([]);
  const [requestWt, setRequestWt] = useState<string[]>([]);
  const [monthWt, setMonthWt] = useState<string[]>([]);
  const [monthlyBase, setMonthlyBase] = useState<DashboardData | null>(null);

  const dateRange = useMemo(() => getPresetRange(preset, customFrom, customTo), [preset, customFrom, customTo]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (dateRange) { params.set('from', dateRange.from); params.set('to', dateRange.to); }
      if (requestOrg.length > 0) params.set('org', requestOrg.join(','));
      if (requestWt.length > 0) params.set('workerType', requestWt.join(','));
      const r = await fetch(`/api/ea-requests/dashboard?${params}`, {
        headers: { ...authHeaders() },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [dateRange, requestOrg, requestWt]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Restore scroll position when returning from drill-down pages
  useEffect(() => {
    if (!loading && data) {
      const saved = sessionStorage.getItem('dashboard-scroll-y');
      if (saved) {
        sessionStorage.removeItem('dashboard-scroll-y');
        requestAnimationFrame(() => {
          window.scrollTo(0, parseInt(saved, 10));
        });
      }
    }
  }, [loading, data]);

  // Fetch all-time data for monthly charts (independent of global time filter, respects org filter)
  const fetchMonthly = useCallback(() => {
    const params = new URLSearchParams();
    if (monthOrg.length > 0) params.set('org', monthOrg.join(','));
    if (monthWt.length > 0) params.set('workerType', monthWt.join(','));
    fetch(`/api/ea-requests/dashboard?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setMonthlyBase(d); });
  }, [monthOrg, monthWt]);

  useEffect(() => { fetchMonthly(); }, [fetchMonthly]);

  // Derived data for pie charts
  const statusPie = useMemo(() => {
    if (!data) return [];
    return data.statusCounts.map((s) => {
      const pal = STATUS_PALETTE.find(p => p.key === s.status);
      return { label: s.status, value: s.count, color: pal?.color ?? '#94a3b8' };
    });
  }, [data]);

  const resultPie = useMemo(() => {
    if (!data) return [];
    return data.completedResultCounts.map((r) => {
      const pal = RESULT_PALETTE.find(p => p.key === r.result);
      return { label: r.result, value: r.count, color: pal?.color ?? '#cbd5e1' };
    });
  }, [data]);

  const orgPie = useMemo(() => {
    if (!data) return [];
    return data.orgCounts.map((o, i) => ({
      label: o.organization, value: o.count, color: ORG_PALETTE[i % ORG_PALETTE.length],
    }));
  }, [data]);

  // Architect pie: 4-way breakdown by org group × worker type
  const ARCH_COLORS: Record<string, string> = {
    'DTIT|EA Office': '#3b82f6',
    'DTIT|Domain Architect': '#93c5fd',
    'Other|EA Office': '#f97316',
    'Other|Domain Architect': '#fdba74',
  };
  const EFFORT_SERIES = [
    { wt: 'EA Office',        org: 'DTIT',  label: 'EA Office - DTIT',        color: '#3b82f6' },
    { wt: 'EA Office',        org: 'Other', label: 'EA Office - Other',        color: '#93c5fd' },
    { wt: 'Domain Architect', org: 'DTIT',  label: 'Domain Architect - DTIT',  color: '#f97316' },
    { wt: 'Domain Architect', org: 'Other', label: 'Domain Architect - Other', color: '#fdba74' },
  ];
  const architectPie = useMemo(() => {
    if (!data) return [];
    return data.architectByOrgType.map(r => ({
      label: `${r.org_group} – ${r.worker_type}`,
      value: r.count,
      color: ARCH_COLORS[`${r.org_group}|${r.worker_type}`] ?? '#94a3b8',
    }));
  }, [data]);

  const topArchitects = data?.topArchitects ?? [];
  const archBarMax = useMemo(() => Math.max(...topArchitects.flatMap(a => [a.count, a.meeting_count, a.action_count]), 1), [topArchitects]);

  // Architects Workload: avg reviews, meetings, actions per architect by worker_type × org_group
  const architectOutput = useMemo(() => {
    if (!data) return [];
    return data.architectByOrgType.map(r => ({
      ...r,
      avg: r.architect_count > 0 ? +(r.count / r.architect_count).toFixed(1) : 0,
      avgMeetings: r.architect_count > 0 ? +(r.meeting_count / r.architect_count).toFixed(1) : 0,
      avgActions: r.architect_count > 0 ? +(r.action_count / r.architect_count).toFixed(1) : 0,
    }));
  }, [data]);
  const archOutputMax = useMemo(() => Math.max(...architectOutput.flatMap(a => [a.avg, a.avgMeetings, a.avgActions]), 1), [architectOutput]);

  // Monthly data filtered by monthRange
  const monthCutoff = useMemo(() => getMonthCutoff(monthRange), [monthRange]);

  const filteredTrend = useMemo(() =>
    monthlyBase?.monthlyTrend.filter(m => m.month >= monthCutoff) ?? [], [monthlyBase, monthCutoff]);
  const filteredLeadTime = useMemo(() =>
    monthlyBase?.monthlyLeadTime.filter(m => m.month >= monthCutoff) ?? [], [monthlyBase, monthCutoff]);
  const filteredByOrg = useMemo(() =>
    monthlyBase?.monthlyByOrg.filter(m => m.month >= monthCutoff) ?? [], [monthlyBase, monthCutoff]);
  const filteredActivity = useMemo(() =>
    monthlyBase?.monthlyReviewActivity?.filter(m => m.month >= monthCutoff) ?? [], [monthlyBase, monthCutoff]);
  const filteredOrgTypeTrend = useMemo(() =>
    monthlyBase?.monthlyOrgTypeTrend?.filter(m => m.month >= monthCutoff) ?? [], [monthlyBase, monthCutoff]);

  const orgTypeTrendMonths = useMemo(() => {
    const set = new Set<string>();
    filteredOrgTypeTrend.forEach(r => set.add(r.month));
    return Array.from(set).sort();
  }, [filteredOrgTypeTrend]);

  const orgTypeTrendMax = useMemo(() => {
    const byMonth = new Map<string, number>();
    filteredOrgTypeTrend.forEach(r => byMonth.set(r.month, (byMonth.get(r.month) ?? 0) + r.count));
    return Math.max(...Array.from(byMonth.values()), 1);
  }, [filteredOrgTypeTrend]);

  const filteredArchScore = useMemo(() =>
    monthlyBase?.monthlyArchScore?.filter(m => m.month >= monthCutoff) ?? [], [monthlyBase, monthCutoff]);
  const filteredFirstPass = useMemo(() =>
    monthlyBase?.monthlyFirstPass?.filter(m => m.month >= monthCutoff) ?? [], [monthlyBase, monthCutoff]);

  // Monthly Architects Workload: avg reviews per architect by month × worker_type × org_group
  const filteredArchOutput = useMemo(() => {
    const raw = monthlyBase?.monthlyOrgTypeTrend?.filter(m => m.month >= monthCutoff) ?? [];
    return raw.map(r => ({
      ...r,
      avg: r.architect_count > 0 ? +(r.count / r.architect_count).toFixed(1) : 0,
    }));
  }, [monthlyBase, monthCutoff]);
  const archOutputMonths = useMemo(() => {
    const set = new Set<string>();
    filteredArchOutput.forEach(r => set.add(r.month));
    return Array.from(set).sort();
  }, [filteredArchOutput]);
  const archOutputYMax = useMemo(() =>
    Math.max(...filteredArchOutput.map(r => r.avg), 1), [filteredArchOutput]);

  const archScoreMonths = useMemo(() => {
    const set = new Set<string>();
    filteredArchScore.forEach(r => set.add(r.month));
    return Array.from(set).sort();
  }, [filteredArchScore]);

  const trendMax = useMemo(() => Math.max(...filteredTrend.map(m => m.submitted), 1), [filteredTrend]);
  const leadMax = useMemo(() => Math.max(...filteredLeadTime.map(m => parseFloat(m.max_days) || 0), 1), [filteredLeadTime]);
  const activityMax = useMemo(() => Math.max(...filteredActivity.flatMap(m => [m.max_meetings || 0, m.max_actions || 0, parseFloat(m.avg_meetings) || 0, parseFloat(m.avg_actions) || 0]), 1), [filteredActivity]);

  // Monthly Top Architects
  const filteredTopArchitects = useMemo(() =>
    (monthlyBase?.monthlyTopArchitects ?? []).filter(r => r.month >= monthCutoff), [monthlyBase, monthCutoff]);
  const topArchMonths = useMemo(() => {
    const set = new Set<string>();
    filteredTopArchitects.forEach(r => set.add(r.month));
    return Array.from(set).sort();
  }, [filteredTopArchitects]);

  const allOrgs = useMemo(() => {
    const set = new Set<string>();
    filteredByOrg.forEach(r => set.add(r.organization));
    return Array.from(set);
  }, [filteredByOrg]);

  const orgMonthMax = useMemo(() => {
    const byMonth = new Map<string, number>();
    filteredByOrg.forEach(r => byMonth.set(r.month, (byMonth.get(r.month) ?? 0) + r.count));
    return Math.max(...Array.from(byMonth.values()), 1);
  }, [filteredByOrg]);

  const months = filteredTrend.map(m => m.month);

  function addPct(items: { label: string; value: number; color: string }[]) {
    const total = items.reduce((s, i) => s + i.value, 0);
    return items.map(i => ({ ...i, pct: total > 0 ? Math.round((i.value / total) * 100) : 0 }));
  }

  /* ── Render ── */

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue mr-3" />
      Loading dashboard…
    </div>
  );
  if (error || !data) return (
    <div className="text-red-500 p-8 text-center">Failed to load dashboard: {error}</div>
  );

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Header */}
      <h1 className="text-xl font-bold text-gray-900">{t('EA Review Dashboard')}</h1>

      {/* Row 1: Pie Charts */}
      <div>
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-gray-800">{t('Request Summary')}</h2>
          <div className="flex items-center gap-2">
            <MultiSelect
              options={[{ label: 'DTIT', value: 'DTIT' }, { label: 'Other', value: 'other' }]}
              value={requestOrg}
              onChange={setRequestOrg}
              placeholder="All Orgs"
              maxDisplay={2}
            />
            <MultiSelect
              options={[{ label: 'EA Office', value: 'EA Office' }, { label: 'Domain Architect', value: 'Domain Architect' }]}
              value={requestWt}
              onChange={setRequestWt}
              placeholder="All Types"
              maxDisplay={2}
            />
            <select
              value={preset}
              onChange={e => setPreset(e.target.value as Preset)}
              className="border border-gray-300 rounded px-2 py-1 text-xs bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-blue/30"
            >
              <option value="all">All History</option>
              <option value="1y">1 Year</option>
              <option value="ytd">YTD</option>
              <option value="lastQ">Last Quarter</option>
              <option value="lastM">Last Month</option>
              <option value="lastW">Last Week</option>
              <option value="custom">Custom Range</option>
            </select>
            {preset === 'custom' && (
              <>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-xs bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-blue/30" />
                <span className="text-xs text-gray-400">–</span>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-xs bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-blue/30" />
              </>
            )}
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
        {/* Pie 1: Request Status */}
        <ChartCard title={t('Request Status')}>
          <div className="flex flex-col items-center gap-3">
            <PieChart data={statusPie} size={150} onSliceClick={(label) => drillDown({ status: label })} />
            <PieLegend items={addPct(statusPie)} onItemClick={(label) => drillDown({ status: label })} />
          </div>
        </ChartCard>

        {/* Pie 2: Completed Result */}
        <ChartCard title={t('Completed Review Results')}>
          <div className="flex flex-col items-center gap-3">
            <PieChart data={resultPie} size={150} onSliceClick={(label) => drillDown({ status: 'Completed', reviewResult: label })} />
            <PieLegend items={addPct(resultPie)} onItemClick={(label) => drillDown({ status: 'Completed', reviewResult: label })} />
          </div>
        </ChartCard>

        {/* Pie 3: Organization */}
        <ChartCard title={t('By Organization')}>
          <div className="flex flex-col items-center gap-3">
            <PieChart data={orgPie} size={150} onSliceClick={(label) => drillDown({ organization: label })} />
            <PieLegend items={addPct(orgPie)} onItemClick={(label) => drillDown({ organization: label })} />
          </div>
        </ChartCard>
        </div>

        {/* Row 2: First-Pass Rate */}
        <div className="mt-4">
          <ChartCard title={t('First-Pass Rate')}>
            {(() => {
              const fp = data?.firstPassRate;
              if (!fp || fp.total_completed === 0) return <p className="text-xs text-gray-400 text-center py-4">No data</p>;
              const rate = Math.round((fp.first_pass_count / fp.total_completed) * 100);
              const color = rate >= 80 ? '#16a34a' : rate >= 60 ? '#ca8a04' : '#dc2626';
              const returned = fp.total_completed - fp.first_pass_count;
              return (
                <div className="flex items-center gap-6 py-2">
                  {/* Circular gauge */}
                  <div className="relative flex items-center justify-center shrink-0" style={{ width: 80, height: 80 }}>
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke={color} strokeWidth="3"
                        strokeDasharray={`${rate} ${100 - rate}`} strokeDashoffset="0" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold" style={{ color }}>{rate}%</span>
                    </div>
                  </div>
                  {/* Details */}
                  <div className="space-y-1.5">
                    <div className="text-xs text-gray-500">
                      <span className="font-semibold text-primary-blue cursor-pointer hover:underline"
                        onClick={() => drillDown({ status: 'Completed', firstPass: 'true' })}
                      >{fp.first_pass_count}</span> / {fp.total_completed} completed requests approved without Return, Meeting or Action
                    </div>
                  </div>
                </div>
              );
            })()}
          </ChartCard>
        </div>
      </div>

      {/* Row 1.5: Architect Work Summary */}
      <div>
        <h2 className="text-sm font-semibold text-gray-800 mb-3">{t('Architect Work Summary')}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Left col, row 1: Architects Workload Distribution */}
          <ChartCard title={t('Architects Workload Distribution')}>
            <div className="flex flex-col items-center gap-3">
              <PieChart data={architectPie} size={150} onSliceClick={(label) => {
                // label is "DTIT – EA Office" or "Other – Domain Architect" etc.
                const [org] = label.split(' – ');
                drillDown({ organization: org }); // 'DTIT' or 'Other'
              }} />
              <div className="flex flex-col gap-1.5">
                <div className="text-[10px] font-semibold text-gray-500 mb-0.5">DTIT</div>
                {addPct(architectPie).filter(i => i.label.startsWith('DTIT')).map(it => (
                  <div key={it.label} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: it.color }} />
                    <span className="text-gray-600 truncate flex-1">{it.label.split(' – ')[1]}</span>
                    <span className="font-semibold text-gray-800">{it.value}</span>
                  </div>
                ))}
                <div className="text-[10px] font-semibold text-gray-500 mt-1.5 mb-0.5">Other</div>
                {addPct(architectPie).filter(i => i.label.startsWith('Other')).map(it => (
                  <div key={it.label} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: it.color }} />
                    <span className="text-gray-600 truncate flex-1">{it.label.split(' – ')[1]}</span>
                    <span className="font-semibold text-gray-800">{it.value}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-2 text-center leading-relaxed">
                Distribution of EA review requests by organization (DTIT / Other) and worker type (EA Office / Domain Architect). Only includes requests assigned to EA Office or Domain Architect reviewers.
              </p>
            </div>
          </ChartCard>

          {/* Right col, rows 1-2: Top 10 Architects Workload */}
          <div className="lg:row-span-2 h-full">
          <ChartCard title={t('Top 10 Architects Workload')} className="h-full">
            {topArchitects.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No data</p>
            ) : (
              <div className="flex flex-col gap-2 py-2">
                {topArchitects.map((a, i) => {
                  const metrics = [
                    { label: 'Reviews',  value: a.count,         opacity: 1,    path: 'request-list' },
                    { label: 'Meetings', value: a.meeting_count, opacity: 0.7,  path: 'meeting-list' },
                    { label: 'Actions',  value: a.action_count,  opacity: 0.45, path: 'action-list' },
                  ];
                  return (
                    <div key={i} className="hover:bg-gray-50 rounded px-1 -mx-1 transition-colors">
                      <div className="text-[10px] text-gray-600 font-medium mb-0.5 truncate">{a.architect_name}</div>
                      <div className="flex flex-col gap-0.5">
                        {metrics.map(m => {
                          const w = archBarMax > 0 ? (m.value / archBarMax) * 100 : 0;
                          return (
                            <div key={m.label} className="flex items-center gap-1.5 cursor-pointer" onClick={() => {
                              const qs = new URLSearchParams({ reviewerName: a.architect_name }).toString();
                              drillRouter.push(`/reports/ea-review-dashboard/${m.path}?${qs}`);
                            }}>
                              <span className="text-[8px] text-gray-400 w-12 text-right">{m.label}</span>
                              <div className="flex-1 bg-gray-100 rounded h-3 relative">
                                <div
                                  className="h-full rounded flex items-center"
                                  style={{ width: `${Math.max(w, 4)}%`, backgroundColor: '#60a5fa', opacity: m.opacity }}
                                >
                                  {m.value > 0 && <span className="text-[7px] font-semibold text-white ml-1">{m.value}</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ChartCard>
          </div>

          {/* Left col, row 2: Architects Workload */}
          <ChartCard title={t('Architects Workload')}>
            {architectOutput.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No data</p>
            ) : (
              <div className="flex flex-col gap-3 py-2">
                {['EA Office', 'Domain Architect'].map(wt => {
                  const rows = architectOutput.filter(r => r.worker_type === wt);
                  if (rows.length === 0) return null;
                  const isEA = wt === 'EA Office';
                  return (
                    <div key={wt}>
                      <div className="text-[10px] font-semibold text-gray-500 mb-1">{wt}</div>
                      <div className="flex flex-col gap-2.5">
                        {rows.map(r => {
                          const baseColor = isEA
                            ? (r.org_group === 'DTIT' ? '#3b82f6' : '#93c5fd')
                            : (r.org_group === 'DTIT' ? '#f97316' : '#fdba74');
                          const metrics = [
                            { label: 'Reviews', value: r.avg, color: baseColor },
                            { label: 'Meetings', value: r.avgMeetings, color: baseColor, opacity: 0.7 },
                            { label: 'Actions', value: r.avgActions, color: baseColor, opacity: 0.45 },
                          ];
                          return (
                            <div key={`${wt}-${r.org_group}`} className="rounded px-1 -mx-1">
                              <div className="text-[10px] text-gray-600 font-medium ml-12 mb-0.5">{r.org_group} <span className="text-gray-400 font-normal">({r.architect_count} architects)</span></div>
                              <div className="flex flex-col gap-0.5">
                                {metrics.map(m => {
                                  const w = archOutputMax > 0 ? (m.value / archOutputMax) * 100 : 0;
                                  return (
                                    <div key={m.label} className="flex items-center gap-2">
                                      <span className="text-[9px] text-gray-400 w-10 text-right">{m.label}</span>
                                      <div className="flex-1 bg-gray-100 rounded h-3.5 relative">
                                        <div
                                          className="h-full rounded flex items-center"
                                          style={{ width: `${Math.max(w, 5)}%`, backgroundColor: m.color, opacity: m.opacity ?? 1 }}
                                        >
                                          <span className="text-[8px] font-semibold text-white ml-1">{m.value}</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {/* Legend */}
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-[9px] text-gray-400 border-t border-gray-100 pt-1.5">
                  <span>Reviews = Reviews per Architect</span>
                  <span>Meetings = Meetings per Architect</span>
                  <span>Actions = Actions per Architect</span>
                </div>
              </div>
            )}
          </ChartCard>
        </div>
      </div>

      {/* Solution Summary Section */}
      <div>
        <h2 className="text-sm font-semibold text-gray-800 mb-3">{t('Solution Summary')}</h2>
        <div>
          <ChartCard title={t('Architecture Diagram Score')}>
            {(!data?.diagramScoreStats || data.diagramScoreStats.length === 0) ? (
              <p className="text-xs text-gray-400 text-center py-8">No data</p>
            ) : (
              <div className="flex flex-col gap-4 py-2">
                {[
                  { key: 'App_Arch', label: 'Application', color: '#3b82f6', bg: '#dbeafe', dot: '#93c5fd' },
                  { key: 'Tech_Arch', label: 'Technical', color: '#f97316', bg: '#ffedd5', dot: '#fdba74' },
                ].map(row => {
                  const d = data!.diagramScoreStats.find(s => s.biz_type === row.key);
                  if (!d) return null;
                  const min = parseFloat(d.min_score) || 0;
                  const max = parseFloat(d.max_score) || 0;
                  const avg = parseFloat(d.avg_score) || 0;
                  const med = parseFloat(d.median_score) || 0;
                  const scale = 10;
                  const minPct = (min / scale) * 100;
                  const maxPct = (max / scale) * 100;
                  const avgPct = (avg / scale) * 100;
                  const medPct = (med / scale) * 100;

                  // ── Beeswarm scatter dots ──
                  const scores = (data!.scoreDistribution || [])
                    .filter(s => s.biz_type === row.key)
                    .map(s => Number(s.score));
                  scores.sort((a, b) => a - b);

                  const dotSize = 5;
                  const halfH = 28; // max vertical offset from center (px)
                  const placed: { xPct: number; yOff: number }[] = [];
                  scores.forEach(score => {
                    const xPct = (score / 10) * 100;
                    // Count nearby already-placed dots (within ~1.5% of width)
                    const nearby = placed.filter(p => Math.abs(p.xPct - xPct) < 1.5);
                    const level = nearby.length;
                    const sign = level % 2 === 0 ? -1 : 1;
                    const yOff = sign * Math.ceil(level / 2) * (dotSize + 1);
                    placed.push({ xPct, yOff: Math.max(-halfH, Math.min(halfH, yOff)) });
                  });

                  return (
                    <div key={row.key} className="flex items-center gap-3 rounded px-1 -mx-1">
                      <span className="text-xs text-gray-600 w-20 text-right shrink-0">{row.label}</span>
                      <div className="flex-1 relative" style={{ height: 70 }}>
                        {/* Background track */}
                        <div className="absolute top-1/2 -translate-y-1/2 w-full h-px bg-gray-200" />
                        {/* Score axis labels */}
                        <div className="absolute bottom-0 left-0 text-[8px] text-gray-300">0</div>
                        <div className="absolute bottom-0 right-0 text-[8px] text-gray-300">10</div>

                        {/* ── Scatter dots (rendered first, behind markers) ── */}
                        {placed.map((pt, i) => (
                          <div key={i} className="absolute rounded-full"
                               style={{
                                 width: dotSize, height: dotSize,
                                 backgroundColor: row.dot,
                                 opacity: 0.5,
                                 left: `${pt.xPct}%`,
                                 top: '50%',
                                 transform: `translate(-50%, calc(-50% + ${pt.yOff}px))`,
                               }} />
                        ))}

                        {/* Range line (min → max) */}
                        <div className="absolute top-1/2 -translate-y-1/2 rounded"
                             style={{ left: `${minPct}%`, width: `${maxPct - minPct}%`, height: 4, backgroundColor: row.bg }} />
                        {/* Min tick */}
                        <div className="absolute top-1/2 -translate-y-1/2"
                             style={{ left: `${minPct}%`, marginLeft: -1, width: 2, height: 14, backgroundColor: row.color, borderRadius: 1 }} />
                        {/* Max tick */}
                        <div className="absolute top-1/2 -translate-y-1/2"
                             style={{ left: `${maxPct}%`, marginLeft: -1, width: 2, height: 14, backgroundColor: row.color, borderRadius: 1 }} />
                        {/* Median marker (diamond) */}
                        <div className="absolute top-1/2 -translate-y-1/2"
                             style={{ left: `${medPct}%`, marginLeft: -4, width: 8, height: 8, backgroundColor: row.color, borderRadius: 1, transform: 'translateY(-50%) rotate(45deg)' }} />
                        {/* Avg marker (thick bar) */}
                        <div className="absolute top-1/2 -translate-y-1/2"
                             style={{ left: `${avgPct}%`, marginLeft: -3, width: 6, height: 18, backgroundColor: row.color, borderRadius: 2 }} />
                        {/* Min label */}
                        <div className="absolute text-[9px] font-medium whitespace-nowrap cursor-pointer hover:underline"
                             style={{ left: `${minPct}%`, top: 2, transform: 'translateX(-50%)', color: row.color }}
                             onClick={() => drillDown({ bizType: row.key, scoreMin: d.min_score, scoreMax: d.min_score })}>
                          {d.min_score}
                        </div>
                        {/* Avg label */}
                        <div className="absolute text-[10px] font-bold whitespace-nowrap"
                             style={{ left: `${avgPct}%`, top: 2, transform: 'translateX(-50%)', color: row.color }}>
                          {d.avg_score}
                        </div>
                        {/* Median label */}
                        <div className="absolute text-[9px] font-semibold whitespace-nowrap cursor-pointer hover:underline"
                             style={{ left: `${medPct}%`, bottom: 2, transform: 'translateX(-50%)', color: row.color }}
                             onClick={() => drillDown({ bizType: row.key, scoreMin: d.median_score, scoreMax: d.median_score })}>
                          {d.median_score}
                        </div>
                        {/* Max label */}
                        <div className="absolute text-[9px] font-medium whitespace-nowrap cursor-pointer hover:underline"
                             style={{ left: `${maxPct}%`, top: 2, transform: 'translateX(-50%)', color: row.color }}
                             onClick={() => drillDown({ bizType: row.key, scoreMin: d.max_score, scoreMax: d.max_score })}>
                          {d.max_score}
                        </div>
                      </div>
                      <span className="text-[9px] text-gray-400 w-8 shrink-0">n={d.total}</span>
                    </div>
                  );
                })}
                {/* Legend */}
                <div className="flex items-center justify-center gap-4 text-[10px] text-gray-500 mt-1">
                  <span className="flex items-center gap-1">
                    <span className="inline-block rounded-full" style={{ width: 5, height: 5, backgroundColor: '#9ca3af', opacity: 0.5 }} /> Score
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block rounded-sm" style={{ width: 2, height: 10, backgroundColor: '#6b7280' }} /> Min / Max
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block rounded-sm" style={{ width: 6, height: 12, backgroundColor: '#6b7280' }} /> Avg
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block" style={{ width: 7, height: 7, backgroundColor: '#6b7280', borderRadius: 1, transform: 'rotate(45deg)' }} /> Median
                  </span>
                </div>
              </div>
            )}
          </ChartCard>
        </div>
      </div>

      {/* Row 2: Monthly Charts with separate period selector */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-800">{t('Monthly Trends')}</h2>
          <div className="flex items-center gap-2">
            <MultiSelect
              options={[{ label: 'DTIT', value: 'DTIT' }, { label: 'Other', value: 'other' }]}
              value={monthOrg}
              onChange={setMonthOrg}
              placeholder="All Orgs"
              maxDisplay={2}
            />
            <MultiSelect
              options={[{ label: 'EA Office', value: 'EA Office' }, { label: 'Domain Architect', value: 'Domain Architect' }]}
              value={monthWt}
              onChange={setMonthWt}
              placeholder="All Types"
              maxDisplay={2}
            />
            <select
              value={monthRange}
              onChange={e => setMonthRange(Number(e.target.value) as MonthRange)}
              className="border border-gray-300 rounded px-2 py-1 text-xs bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-blue/30"
            >
              <option value={3}>Last 3 Months</option>
              <option value={6}>Last 6 Months</option>
              <option value={12}>Last 12 Months</option>
            </select>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
        {/* Chart 1: Monthly Submitted vs Approved (Line Chart) */}
        <ChartCard title={t('Monthly Request Trends')}>
          {filteredTrend.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No data</p>
          ) : (() => {
            const padT = 18, padB = 20, padL = 28, padR = 10;
            const W = 320, H = 170;
            const chartW = W - padL - padR, chartH = H - padT - padB;
            const n = filteredTrend.length;
            const yMax = Math.max(...filteredTrend.flatMap(m => [m.submitted, m.approved]), 1);
            const toX = (i: number) => padL + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW);
            const toY = (v: number) => padT + chartH - (v / yMax) * chartH;
            const subPts = filteredTrend.map((m, i) => `${toX(i)},${toY(m.submitted)}`).join(' ');
            const appPts = filteredTrend.map((m, i) => `${toX(i)},${toY(m.approved)}`).join(' ');
            return (
              <>
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 170 }}>
                  {/* Y-axis grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map(f => {
                    const y = padT + chartH - f * chartH;
                    const val = Math.round(f * yMax);
                    return (
                      <g key={f}>
                        <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#e5e7eb" strokeWidth={0.5} />
                        <text x={padL - 4} y={y + 3} textAnchor="end" fontSize={7} fill="#9ca3af">{val}</text>
                      </g>
                    );
                  })}
                  {/* Submitted line */}
                  <polyline points={subPts} fill="none" stroke="#94a3b8" strokeWidth={2} strokeLinejoin="round" />
                  {filteredTrend.map((m, i) => (
                    <g key={`sub-${i}`} style={{ cursor: 'pointer' }}
                      onClick={() => drillDown({ ...getMonthRange(m.month) })}>
                      <circle cx={toX(i)} cy={toY(m.submitted)} r={5} fill="#94a3b8" stroke="white" strokeWidth={1} opacity={0} />
                      <circle cx={toX(i)} cy={toY(m.submitted)} r={3} fill="#94a3b8" stroke="white" strokeWidth={1} />
                      <text x={toX(i)} y={toY(m.submitted) - 6} textAnchor="middle" fontSize={7} fontWeight={600} fill="#64748b">{m.submitted}</text>
                    </g>
                  ))}
                  {/* Approved line */}
                  <polyline points={appPts} fill="none" stroke="#34d399" strokeWidth={2} strokeLinejoin="round" />
                  {filteredTrend.map((m, i) => (
                    <g key={`app-${i}`} style={{ cursor: 'pointer' }}
                      onClick={() => drillDown({ status: 'Completed', ...getMonthRange(m.month) })}>
                      <circle cx={toX(i)} cy={toY(m.approved)} r={5} fill="#34d399" stroke="white" strokeWidth={1} opacity={0} />
                      <circle cx={toX(i)} cy={toY(m.approved)} r={3} fill="#34d399" stroke="white" strokeWidth={1} />
                      <text x={toX(i)} y={toY(m.approved) + 11} textAnchor="middle" fontSize={7} fontWeight={600} fill="#059669">{m.approved}</text>
                    </g>
                  ))}
                  {/* X-axis month labels */}
                  {filteredTrend.map((m, i) => (
                    <text key={`lbl-${i}`} x={toX(i)} y={H - 4} textAnchor="middle" fontSize={7} fill="#9ca3af">{formatMonth(m.month)}</text>
                  ))}
                </svg>
                <div className="flex items-center justify-center gap-4 mt-1 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-400" /> Submitted</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /> Approved</span>
                </div>
              </>
            );
          })()}
        </ChartCard>

        {/* Chart 2: Monthly Lead Time (Range Bar with Tick) */}
        <ChartCard title={t('Monthly Lead Time (Days)')}>
          {filteredLeadTime.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No data</p>
          ) : (
            <>
              <div className="flex items-end gap-1" style={{ height: 160 }}>
                {filteredLeadTime.map((m) => {
                  const minV = parseFloat(m.min_days) || 0;
                  const avgV = parseFloat(m.avg_days) || 0;
                  const medV = parseFloat(m.median_days) || 0;
                  const maxV = parseFloat(m.max_days) || 0;
                  const chartH = 130;
                  const minY = (minV / leadMax) * chartH;
                  const maxY = (maxV / leadMax) * chartH;
                  const avgY = (avgV / leadMax) * chartH;
                  const medY = (medV / leadMax) * chartH;
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5"
                         title={`Min: ${m.min_days}d | Avg: ${m.avg_days}d | Median: ${m.median_days}d | Max: ${m.max_days}d`}>
                      <div className="w-full relative" style={{ height: 140 }}>
                        {/* Vertical range line */}
                        <div className="absolute left-1/2 -translate-x-1/2 bg-gray-300" style={{ bottom: minY, height: Math.max(maxY - minY, 2), width: 2 }} />
                        {/* Min tick – thin horizontal line */}
                        <div className="absolute left-1/2 -translate-x-1/2 bg-emerald-500 rounded-sm" style={{ bottom: minY - 1, width: 12, height: 2 }} />
                        {/* Max tick – thin horizontal line */}
                        <div className="absolute left-1/2 -translate-x-1/2 bg-orange-500 rounded-sm" style={{ bottom: maxY - 1, width: 12, height: 2 }} />
                        {/* Median tick – medium horizontal line */}
                        <div className="absolute left-1/2 -translate-x-1/2 bg-violet-500 rounded-sm" style={{ bottom: medY - 1, width: 14, height: 3 }} />
                        {/* Avg tick – thicker horizontal line */}
                        <div className="absolute left-1/2 -translate-x-1/2 bg-blue-500 rounded-sm" style={{ bottom: avgY - 2, width: 16, height: 4 }} />
                        {/* Max value – right of tick */}
                        <div className="absolute text-[7px] font-semibold text-orange-500 whitespace-nowrap cursor-pointer hover:underline" style={{ left: '50%', marginLeft: 10, bottom: maxY - 5 }}
                          onClick={() => drillDown({ status: 'Completed', ...getMonthRange(m.month), leadTimeMin: m.max_days, leadTimeMax: m.max_days })}>
                          {m.max_days}
                        </div>
                        {/* Avg value – right of tick */}
                        <div className="absolute text-[7px] font-bold text-blue-600 whitespace-nowrap" style={{ left: '50%', marginLeft: 12, bottom: avgY - 5 }}>
                          {m.avg_days}
                        </div>
                        {/* Median value – left of tick */}
                        <div className="absolute text-[7px] font-semibold text-violet-600 whitespace-nowrap cursor-pointer hover:underline" style={{ right: '50%', marginRight: 10, bottom: medY - 5 }}
                          onClick={() => drillDown({ status: 'Completed', ...getMonthRange(m.month), leadTimeMin: m.median_days, leadTimeMax: m.median_days })}>
                          {m.median_days}
                        </div>
                        {/* Min value – right of tick */}
                        <div className="absolute text-[7px] font-semibold text-emerald-600 whitespace-nowrap cursor-pointer hover:underline" style={{ left: '50%', marginLeft: 10, bottom: minY - 5 }}
                          onClick={() => drillDown({ status: 'Completed', ...getMonthRange(m.month), leadTimeMin: m.min_days, leadTimeMax: m.min_days })}>
                          {m.min_days}
                        </div>
                      </div>
                      <span className="text-[8px] text-gray-400">{formatMonth(m.month)}</span>
                    </div>
                  );
                })}
              </div>
              {/* Legend below chart */}
              <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><span className="inline-block bg-emerald-500 rounded-sm" style={{ width: 10, height: 2 }} /> Min</span>
                <span className="flex items-center gap-1"><span className="inline-block bg-blue-500 rounded-sm" style={{ width: 12, height: 4 }} /> Avg</span>
                <span className="flex items-center gap-1"><span className="inline-block bg-violet-500 rounded-sm" style={{ width: 11, height: 3 }} /> Median</span>
                <span className="flex items-center gap-1"><span className="inline-block bg-orange-500 rounded-sm" style={{ width: 10, height: 2 }} /> Max</span>
              </div>
            </>
          )}
        </ChartCard>

        {/* Chart 3: Monthly by Organization (stacked) */}
        <ChartCard title={t('Monthly by Organization')}>
          {months.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No data</p>
          ) : (
            <>
              <div className="flex items-end gap-1" style={{ height: 160 }}>
                {months.map((month) => {
                  const orgData = filteredByOrg.filter(r => r.month === month);
                  const totalMonth = orgData.reduce((s, r) => s + r.count, 0);
                  const h = Math.max((totalMonth / orgMonthMax) * 140, 2);
                  // Build stacked segments
                  const segments = orgData.map(r => ({
                    org: r.organization,
                    count: r.count,
                    color: ORG_PALETTE[allOrgs.indexOf(r.organization) % ORG_PALETTE.length],
                    height: totalMonth > 0 ? (r.count / totalMonth) * h : 0,
                  }));
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className="w-full relative" style={{ height: 140 }}>
                        <div className="absolute bottom-0 w-full flex flex-col-reverse rounded-t overflow-hidden" style={{ height: h }}>
                          {segments.map((seg, i) => (
                            <div key={i} className="flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80"
                                 style={{ height: seg.height, backgroundColor: seg.color }}
                                 title={`${seg.org}: ${seg.count}`}
                                 onClick={() => drillDown({ organization: seg.org, ...getMonthRange(month) })}>
                              {seg.height > 12 && (
                                <span className="text-[8px] font-semibold text-white leading-none">
                                  {seg.count} <span className="opacity-80">{Math.round((seg.count / totalMonth) * 100)}%</span>
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <span className="text-[8px] text-gray-400">{formatMonth(month)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-gray-500 flex-wrap">
                {allOrgs.map((org, i) => (
                  <span key={org} className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: ORG_PALETTE[i % ORG_PALETTE.length] }} />
                    {org}
                  </span>
                ))}
              </div>
            </>
          )}
        </ChartCard>
        </div>

        {/* Bottom row: 3-column grid */}
        <div className="grid gap-4 lg:grid-cols-3">
        {/* Chart 4: Org × Worker Type Trend */}
        <ChartCard title={t('Architect Effort Distribution Trend')}>
          {orgTypeTrendMonths.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No data</p>
          ) : (
            <>
              <div className="flex items-end gap-1" style={{ height: 160 }}>
                {orgTypeTrendMonths.map((month) => {
                  const monthData = filteredOrgTypeTrend.filter(r => r.month === month);
                  const totalMonth = monthData.reduce((s, r) => s + r.count, 0);
                  const h = Math.max((totalMonth / orgTypeTrendMax) * 140, 2);
                  const segments = EFFORT_SERIES.map(series => {
                    const found = monthData.find(r => r.worker_type === series.wt && r.org_group === series.org);
                    const count = found?.count ?? 0;
                    return { ...series, count, height: totalMonth > 0 ? (count / totalMonth) * h : 0 };
                  }).filter(seg => seg.count > 0);
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className="w-full relative" style={{ height: 140 }}>
                        <div className="absolute bottom-0 w-full flex flex-col-reverse rounded-t overflow-hidden" style={{ height: h }}>
                          {segments.map((seg, i) => (
                            <div key={i} className="flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80"
                                 style={{ height: seg.height, backgroundColor: seg.color }}
                                 title={`${seg.label}: ${seg.count}`}
                                 onClick={() => {
                                   drillDown({ organization: seg.org, workerType: seg.wt, ...getMonthRange(month) });
                                 }}>
                              {seg.height > 12 && (
                                <span className="text-[8px] font-semibold text-white leading-none">
                                  {seg.count} <span className="opacity-80">{Math.round((seg.count / totalMonth) * 100)}%</span>
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <span className="text-[8px] text-gray-400">{formatMonth(month)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-gray-500 flex-wrap">
                {EFFORT_SERIES.map(s => (
                  <span key={s.label} className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                    {s.label}
                  </span>
                ))}
              </div>
            </>
          )}
        </ChartCard>

        {/* Chart 5: Monthly Architecture Score Trends (MIDDLE) */}
        <ChartCard title={t('Monthly Architecture Score')}>
          {archScoreMonths.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No data</p>
          ) : (
            <>
              <div className="flex items-end gap-1" style={{ height: 110 }}>
                {archScoreMonths.map((month) => {
                  const appD = filteredArchScore.find(r => r.month === month && r.biz_type === 'App_Arch');
                  const techD = filteredArchScore.find(r => r.month === month && r.biz_type === 'Tech_Arch');
                  const scale = 10;
                  const chartH = 85;
                  const renderBar = (d: typeof appD, colors: { line: string; min: string; avg: string; med: string; max: string }, side: 'left' | 'right') => {
                    if (!d) return <div className="flex-1" style={{ minWidth: 12 }} />;
                    const minV = parseFloat(d.min_score) || 0;
                    const avgV = parseFloat(d.avg_score) || 0;
                    const medV = parseFloat(d.median_score) || 0;
                    const maxV = parseFloat(d.max_score) || 0;
                    const minY = (minV / scale) * chartH;
                    const maxY = (maxV / scale) * chartH;
                    const avgY = (avgV / scale) * chartH;
                    const medY = (medV / scale) * chartH;
                    return (
                      <div className="flex-1 relative" style={{ minWidth: 12, height: chartH }}
                           title={`${side === 'left' ? 'App' : 'Tech'} — Min: ${d.min_score} | Avg: ${d.avg_score} | Med: ${d.median_score} | Max: ${d.max_score}`}>
                        {/* Vertical range line */}
                        <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: minY, height: Math.max(maxY - minY, 2), width: 2, backgroundColor: colors.line }} />
                        {/* Min tick */}
                        <div className="absolute left-1/2 -translate-x-1/2 rounded-sm" style={{ bottom: minY - 1, width: 8, height: 2, backgroundColor: colors.min }} />
                        {/* Max tick */}
                        <div className="absolute left-1/2 -translate-x-1/2 rounded-sm" style={{ bottom: maxY - 1, width: 8, height: 2, backgroundColor: colors.max }} />
                        {/* Median tick */}
                        <div className="absolute left-1/2 -translate-x-1/2 rounded-sm" style={{ bottom: medY - 1, width: 10, height: 3, backgroundColor: colors.med }} />
                        {/* Avg tick */}
                        <div className="absolute left-1/2 -translate-x-1/2 rounded-sm" style={{ bottom: avgY - 2, width: 12, height: 4, backgroundColor: colors.avg }} />
                        {/* Avg value label */}
                        <div className="absolute text-[7px] font-bold whitespace-nowrap" style={{ color: colors.avg, ...(side === 'left' ? { right: '50%', marginRight: 8 } : { left: '50%', marginLeft: 8 }), bottom: avgY - 5 }}>
                          {d.avg_score}
                        </div>
                        {/* Min value label */}
                        <div className="absolute text-[7px] font-semibold whitespace-nowrap" style={{ color: colors.min, ...(side === 'left' ? { right: '50%', marginRight: 8 } : { left: '50%', marginLeft: 8 }), bottom: minY - 5 }}>
                          {d.min_score}
                        </div>
                        {/* Max value label */}
                        <div className="absolute text-[7px] font-semibold whitespace-nowrap" style={{ color: colors.max, ...(side === 'left' ? { right: '50%', marginRight: 8 } : { left: '50%', marginLeft: 8 }), bottom: maxY - 5 }}>
                          {d.max_score}
                        </div>
                        {/* Median value label – opposite side to avoid overlap */}
                        <div className="absolute text-[7px] font-semibold whitespace-nowrap" style={{ color: colors.med, ...(side === 'left' ? { left: '50%', marginLeft: 8 } : { right: '50%', marginRight: 8 }), bottom: medY - 5 }}>
                          {d.median_score}
                        </div>
                      </div>
                    );
                  };
                  const appColors = { line: '#93c5fd', min: '#3b82f6', avg: '#1d4ed8', med: '#7c3aed', max: '#3b82f6' };
                  const techColors = { line: '#fdba74', min: '#f97316', avg: '#c2410c', med: '#7c3aed', max: '#f97316' };
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center">
                      <div className="flex items-end gap-[2px] w-full">
                        <div className="flex-1 cursor-pointer" onClick={() => drillDown({ bizType: 'App_Arch', ...getMonthRange(month) })}>
                          {renderBar(appD, appColors, 'left')}
                        </div>
                        <div className="flex-1 cursor-pointer" onClick={() => drillDown({ bizType: 'Tech_Arch', ...getMonthRange(month) })}>
                          {renderBar(techD, techColors, 'right')}
                        </div>
                      </div>
                      <span className="text-[8px] text-gray-400 mt-1">{formatMonth(month)}</span>
                    </div>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><span className="inline-block rounded-sm" style={{ width: 8, height: 8, backgroundColor: '#93c5fd' }} /> App</span>
                <span className="flex items-center gap-1"><span className="inline-block rounded-sm" style={{ width: 8, height: 8, backgroundColor: '#fdba74' }} /> Tech</span>
                <span className="text-gray-300">|</span>
                <span className="flex items-center gap-1"><span className="inline-block rounded-sm" style={{ width: 6, height: 2, backgroundColor: '#666' }} /> Min/Max</span>
                <span className="flex items-center gap-1"><span className="inline-block rounded-sm" style={{ width: 10, height: 4, backgroundColor: '#666' }} /> Avg</span>
                <span className="flex items-center gap-1"><span className="inline-block rounded-sm" style={{ width: 8, height: 3, backgroundColor: '#7c3aed' }} /> Median</span>
              </div>
            </>
          )}
        </ChartCard>

        {/* Chart 6: Monthly Review Activity – Min/Max/Avg Range Chart (RIGHT) */}
        <ChartCard title={t('Monthly Review Activity')}>
          {filteredActivity.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No data</p>
          ) : (
            <>
              <div className="flex items-end gap-1" style={{ height: 110 }}>
                {filteredActivity.map((m) => {
                  const chartH = 85;
                  const avgMtg = parseFloat(m.avg_meetings) || 0;
                  const avgAct = parseFloat(m.avg_actions) || 0;
                  const minMtg = Number(m.min_meetings) || 0;
                  const maxMtg = Number(m.max_meetings) || 0;
                  const minAct = Number(m.min_actions) || 0;
                  const maxAct = Number(m.max_actions) || 0;
                  const renderActivityBar = (
                    min: number, avg: number, max: number,
                    colors: { line: string; min: string; avg: string },
                    side: 'left' | 'right', label: string
                  ) => {
                    if (max === 0 && avg === 0) return <div className="flex-1" style={{ minWidth: 12 }} />;
                    const minY = (min / activityMax) * chartH;
                    const maxY = (max / activityMax) * chartH;
                    const avgY = (avg / activityMax) * chartH;
                    return (
                      <div className="flex-1 relative" style={{ minWidth: 12, height: chartH }}
                           title={`${label} — Min: ${min} | Avg: ${avg} | Max: ${max}`}>
                        {/* Vertical range line */}
                        <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: minY, height: Math.max(maxY - minY, 2), width: 2, backgroundColor: colors.line }} />
                        {/* Min tick */}
                        <div className="absolute left-1/2 -translate-x-1/2 rounded-sm" style={{ bottom: minY - 1, width: 8, height: 2, backgroundColor: colors.min }} />
                        {/* Max tick */}
                        <div className="absolute left-1/2 -translate-x-1/2 rounded-sm" style={{ bottom: maxY - 1, width: 8, height: 2, backgroundColor: colors.min }} />
                        {/* Avg tick */}
                        <div className="absolute left-1/2 -translate-x-1/2 rounded-sm" style={{ bottom: avgY - 2, width: 12, height: 4, backgroundColor: colors.avg }} />
                        {/* Avg value label */}
                        <div className="absolute text-[7px] font-bold whitespace-nowrap" style={{ color: colors.avg, ...(side === 'left' ? { right: '50%', marginRight: 8 } : { left: '50%', marginLeft: 8 }), bottom: avgY - 5 }}>
                          {avg}
                        </div>
                        {/* Min value label */}
                        <div className="absolute text-[7px] font-semibold whitespace-nowrap" style={{ color: colors.min, ...(side === 'left' ? { right: '50%', marginRight: 8 } : { left: '50%', marginLeft: 8 }), bottom: minY - 5 }}>
                          {min}
                        </div>
                        {/* Max value label */}
                        <div className="absolute text-[7px] font-semibold whitespace-nowrap" style={{ color: colors.min, ...(side === 'left' ? { right: '50%', marginRight: 8 } : { left: '50%', marginLeft: 8 }), bottom: maxY - 5 }}>
                          {max}
                        </div>
                      </div>
                    );
                  };
                  const mtgColors = { line: '#93c5fd', min: '#3b82f6', avg: '#1d4ed8' };
                  const actColors = { line: '#fdba74', min: '#f97316', avg: '#c2410c' };
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center">
                      <div className="flex items-end gap-[2px] w-full">
                        {renderActivityBar(minMtg, avgMtg, maxMtg, mtgColors, 'left', 'Meetings')}
                        {renderActivityBar(minAct, avgAct, maxAct, actColors, 'right', 'Actions')}
                      </div>
                      <span className="text-[8px] text-gray-400 mt-1">{formatMonth(m.month)}</span>
                    </div>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><span className="inline-block rounded-sm" style={{ width: 8, height: 8, backgroundColor: '#93c5fd' }} /> Meetings</span>
                <span className="flex items-center gap-1"><span className="inline-block rounded-sm" style={{ width: 8, height: 8, backgroundColor: '#fdba74' }} /> Actions</span>
                <span className="text-gray-300">|</span>
                <span className="flex items-center gap-1"><span className="inline-block rounded-sm" style={{ width: 6, height: 2, backgroundColor: '#666' }} /> Min/Max</span>
                <span className="flex items-center gap-1"><span className="inline-block rounded-sm" style={{ width: 10, height: 4, backgroundColor: '#666' }} /> Avg</span>
              </div>
            </>
          )}
        </ChartCard>

        {/* Chart 7: Monthly First-Pass Approval Rate (LEFT of new row) */}
        <ChartCard title={t('Monthly First-Pass Rate')}>
          {filteredFirstPass.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No data</p>
          ) : (
            <>
              <div className="flex items-end gap-1" style={{ height: 160 }}>
                {filteredFirstPass.map((m) => {
                  const rate = m.total > 0 ? Math.round((m.first_pass / m.total) * 100) : 0;
                  const barH = Math.max((rate / 100) * 130, 2);
                  const color = rate >= 80 ? '#10b981' : rate >= 60 ? '#f59e0b' : '#ef4444';
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5 cursor-pointer"
                      onClick={() => drillDown({ status: 'Completed', firstPass: 'true', ...getMonthRange(m.month) })}>
                      <div className="w-full flex items-end justify-center" style={{ height: 140 }}>
                        <div className="w-3/4 rounded-t flex items-center justify-center hover:opacity-80"
                             style={{ height: barH, backgroundColor: color }}
                             title={`${rate}% (${m.first_pass}/${m.total})`}>
                          {m.total > 0 && <span className="text-[9px] font-semibold text-white">{rate}%</span>}
                        </div>
                      </div>
                      <span className="text-[7px] text-gray-400">{m.first_pass}/{m.total}</span>
                      <span className="text-[8px] text-gray-400">{formatMonth(m.month)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> ≥80%</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> 60–79%</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> &lt;60%</span>
              </div>
            </>
          )}
        </ChartCard>

        {/* Chart 8: Monthly Architects Workload (avg reviews per architect trend) */}
        <ChartCard title={t('Monthly Architects Workload')}>
          {archOutputMonths.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No data</p>
          ) : (() => {
            const months = archOutputMonths;
            const n = months.length;
            const chartW = 350;
            const chartH = 180;
            const padL = 32, padR = 16, padT = 14, padB = 28;
            const plotW = chartW - padL - padR;
            const plotH = chartH - padT - padB;
            const xStep = n > 1 ? plotW / (n - 1) : 0;
            const yMax = Math.ceil(archOutputYMax * 1.15) || 1;
            const gridLines = (() => {
              const step = yMax <= 5 ? 1 : yMax <= 20 ? 5 : 10;
              const lines: number[] = [];
              for (let v = 0; v <= yMax; v += step) lines.push(v);
              return lines;
            })();
            return (
              <>
                <div className="w-full overflow-x-auto">
                  <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" style={{ minWidth: 250 }}>
                    {/* Grid lines */}
                    {gridLines.map(v => {
                      const y = padT + plotH - (v / yMax) * plotH;
                      return (
                        <g key={v}>
                          <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="#f3f4f6" strokeWidth={0.5} />
                          <text x={padL - 4} y={y + 3} textAnchor="end" fontSize={7} fill="#9ca3af">{v}</text>
                        </g>
                      );
                    })}
                    {/* X-axis month labels */}
                    {months.map((m, i) => (
                      <text key={m} x={padL + i * xStep} y={chartH - 4} textAnchor="middle" fontSize={7} fill="#9ca3af">
                        {formatMonth(m)}
                      </text>
                    ))}
                    {/* Lines + dots for each series */}
                    {EFFORT_SERIES.map(series => {
                      const pts = months.map((m, i) => {
                        const row = filteredArchOutput.find(r => r.month === m && r.worker_type === series.wt && r.org_group === series.org);
                        const avg = row?.avg ?? 0;
                        return {
                          x: padL + i * xStep,
                          y: padT + plotH - (avg / yMax) * plotH,
                          avg,
                          count: row?.count ?? 0,
                          architects: row?.architect_count ?? 0,
                          month: m,
                        };
                      }).filter(p => p.avg > 0);
                      if (pts.length === 0) return null;
                      const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
                      return (
                        <g key={series.label}>
                          <path d={pathD} fill="none" stroke={series.color} strokeWidth={1.8} />
                          {pts.map((p, i) => (
                            <g key={i} style={{ cursor: 'pointer' }}
                              onClick={() => {
                                drillDown({ organization: series.org, ...getMonthRange(p.month) });
                              }}>
                              <circle cx={p.x} cy={p.y} r={5} fill={series.color} opacity={0} />
                              <circle cx={p.x} cy={p.y} r={3} fill={series.color} />
                              <title>{`${series.label}: avg ${p.avg} (${p.count} reviews / ${p.architects} architects)`}</title>
                              <text x={p.x} y={p.y - 5} textAnchor="middle" fontSize={7} fontWeight="600" fill={series.color}>{p.avg}</text>
                            </g>
                          ))}
                        </g>
                      );
                    })}
                  </svg>
                </div>
                {/* Legend */}
                <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-[10px] text-gray-500">
                  {EFFORT_SERIES.map(s => (
                    <span key={s.label} className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
                      {s.label}
                    </span>
                  ))}
                  <span className="text-gray-400 italic">(avg reviews / architect)</span>
                </div>
              </>
            );
          })()}
        </ChartCard>

        {/* Chart 9: Monthly Top 10 Architects (line chart) */}
        <ChartCard title={t('Monthly Top Architects')}>
          {topArchMonths.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No data</p>
          ) : (() => {
            const TOP_COLORS = ['#3b82f6','#ef4444','#10b981','#f97316','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f59e0b','#6366f1'];
            // Collect top 10 architects by total project count across all filtered months
            const archTotals = new Map<string, number>();
            filteredTopArchitects.forEach(e => archTotals.set(e.architect_name, (archTotals.get(e.architect_name) || 0) + e.project_count));
            const topNames = Array.from(archTotals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(e => e[0]);
            const months = topArchMonths;
            const n = months.length;
            const chartW = 350;
            const chartH = 200;
            const padL = 32, padR = 16, padT = 14, padB = 28;
            const plotW = chartW - padL - padR;
            const plotH = chartH - padT - padB;
            const xStep = n > 1 ? plotW / (n - 1) : 0;
            const yMax = Math.ceil(Math.max(...filteredTopArchitects.map(e => e.project_count), 1) * 1.15) || 1;
            const gridLines = (() => {
              const step = yMax <= 5 ? 1 : yMax <= 20 ? 5 : 10;
              const lines: number[] = [];
              for (let v = 0; v <= yMax; v += step) lines.push(v);
              return lines;
            })();
            return (
              <>
                <div className="w-full overflow-x-auto">
                  <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" style={{ minWidth: 250 }}>
                    {/* Grid lines */}
                    {gridLines.map(v => {
                      const y = padT + plotH - (v / yMax) * plotH;
                      return (
                        <g key={v}>
                          <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="#f3f4f6" strokeWidth={0.5} />
                          <text x={padL - 4} y={y + 3} textAnchor="end" fontSize={7} fill="#9ca3af">{v}</text>
                        </g>
                      );
                    })}
                    {/* X-axis month labels */}
                    {months.map((m, i) => (
                      <text key={m} x={padL + i * xStep} y={chartH - 4} textAnchor="middle" fontSize={7} fill="#9ca3af">
                        {formatMonth(m)}
                      </text>
                    ))}
                    {/* Lines + dots for each architect */}
                    {topNames.map((name, si) => {
                      const color = TOP_COLORS[si % TOP_COLORS.length];
                      const pts = months.map((m, i) => {
                        const entry = filteredTopArchitects.find(e => e.month === m && e.architect_name === name);
                        return { x: padL + i * xStep, y: entry ? padT + plotH - (entry.project_count / yMax) * plotH : null, count: entry?.project_count ?? 0, month: m };
                      }).filter(p => p.y !== null) as { x: number; y: number; count: number; month: string }[];
                      if (pts.length === 0) return null;
                      const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
                      return (
                        <g key={name}>
                          <path d={pathD} fill="none" stroke={color} strokeWidth={1.8} />
                          {pts.map((p, i) => (
                            <g key={i} style={{ cursor: 'pointer' }} onClick={() => drillDown({ reviewerName: name, ...getMonthRange(p.month) })}>
                              <circle cx={p.x} cy={p.y} r={3} fill={color} />
                              <title>{`${name}: ${p.count} projects`}</title>
                              <text x={p.x} y={p.y - 5} textAnchor="middle" fontSize={7} fontWeight="600" fill={color}>{p.count}</text>
                            </g>
                          ))}
                        </g>
                      );
                    })}
                  </svg>
                </div>
                {/* Legend */}
                <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-[10px] text-gray-500">
                  {topNames.map((name, si) => (
                    <span key={name} className="flex items-center gap-1 cursor-pointer hover:underline" onClick={() => drillDown({ reviewerName: name })}>
                      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: TOP_COLORS[si % TOP_COLORS.length] }} />
                      {name}
                    </span>
                  ))}
                  <span className="text-gray-400 italic">(projects / month)</span>
                </div>
              </>
            );
          })()}
        </ChartCard>

        </div>
      </div>

    </div>
  );
}

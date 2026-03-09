'use client';

import { useMemo, useState } from 'react';
import type { CapNode, Application } from './types';

/* ── colour / style maps ── */

const PORTFOLIO_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Invest:   { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  Migrate:  { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
  Tolerate: { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
};
const PORTFOLIO_DEFAULT = { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };

const GEO_STYLES: Record<string, { borderStyle: string; borderWidth: string }> = {
  Global: { borderStyle: 'solid',  borderWidth: '2px' },
  PRC:    { borderStyle: 'dashed', borderWidth: '2px' },
  ROW:    { borderStyle: 'dotted', borderWidth: '2.5px' },
};
const GEO_DEFAULT = { borderStyle: 'solid', borderWidth: '1px' };

function getPortfolioColor(p: string) {
  return PORTFOLIO_COLORS[p] ?? PORTFOLIO_DEFAULT;
}
function getGeoStyle(g: string) {
  return GEO_STYLES[g] ?? GEO_DEFAULT;
}

/* ── sub-components ── */

interface CapabilityDashboardProps {
  capabilities: ReadonlyArray<CapNode>;
  domains: ReadonlyArray<string>;
  applications: ReadonlyArray<Application>;
}

function KpiCard({ label, value, colorClass = 'text-gray-900' }: { label: string; value: string | number; colorClass?: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold tracking-tight ${colorClass}`}>{value}</p>
    </div>
  );
}

function Legend() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-wrap items-start gap-6">
      {/* Portfolio legend */}
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Portfolio</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PORTFOLIO_COLORS).map(([name, c]) => (
            <span
              key={name}
              className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}
            >
              {name}
            </span>
          ))}
          <span
            className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium"
            style={{ backgroundColor: PORTFOLIO_DEFAULT.bg, color: PORTFOLIO_DEFAULT.text, border: `1px solid ${PORTFOLIO_DEFAULT.border}` }}
          >
            N/A
          </span>
        </div>
      </div>

      {/* Geo legend */}
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Geo</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(GEO_STYLES).map(([name, s]) => (
            <span
              key={name}
              className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium text-gray-700"
              style={{
                border: `${s.borderWidth} ${s.borderStyle} #64748b`,
                backgroundColor: '#f8fafc',
              }}
            >
              {name}
            </span>
          ))}
          <span
            className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium text-gray-400"
            style={{
              border: `${GEO_DEFAULT.borderWidth} ${GEO_DEFAULT.borderStyle} #cbd5e1`,
              backgroundColor: '#f8fafc',
            }}
          >
            N/A
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── main component ── */

export function CapabilityDashboard({ capabilities, domains, applications }: CapabilityDashboardProps) {
  const [domainFilter, setDomainFilter] = useState<string>('All');

  // Build app lookup: appId → full Application
  const appLookup = useMemo(() => {
    const map = new Map<string, Application>();
    for (const app of applications) {
      map.set(app.appId, app);
    }
    return map;
  }, [applications]);

  const l3Caps = useMemo(
    () => capabilities.filter((c) => c.level === 3),
    [capabilities],
  );

  const filtered = useMemo(() => {
    if (domainFilter === 'All') return l3Caps;
    return l3Caps.filter((c) => c.domain === domainFilter);
  }, [l3Caps, domainFilter]);

  const totalCaps = l3Caps.length;
  const coveredCaps = l3Caps.filter((c) => c.applications.length > 0).length;
  const coverageRate = totalCaps > 0 ? Math.round((coveredCaps / totalCaps) * 100) : 0;

  const uniqueApps = useMemo(() => {
    const ids = new Set<string>();
    for (const cap of l3Caps) {
      for (const app of cap.applications) ids.add(app.id);
    }
    return ids.size;
  }, [l3Caps]);

  // Group by L1 domain, then L2 sub-domain
  const grouped = useMemo(() => {
    const l1Nodes = capabilities.filter((c) => c.level === 1);
    const l2Nodes = capabilities.filter((c) => c.level === 2);

    return l1Nodes
      .filter((l1) => domainFilter === 'All' || l1.domain === domainFilter)
      .map((l1) => {
        const l2Children = l2Nodes
          .filter((l2) => l2.parentId === l1.id)
          .map((l2) => {
            const l3Children = filtered.filter((l3) => l3.parentId === l2.id);
            return { ...l2, children: l3Children };
          })
          .filter((l2) => l2.children.length > 0);
        return { ...l1, subDomains: l2Children };
      })
      .filter((l1) => l1.subDomains.length > 0);
  }, [capabilities, filtered, domainFilter]);

  return (
    <div className="flex flex-col gap-4">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Total Capabilities (L3)" value={totalCaps} />
        <KpiCard label="Covered" value={coveredCaps} colorClass="text-emerald-600" />
        <KpiCard label="Coverage Rate" value={`${coverageRate}%`} colorClass="text-sky-600" />
        <KpiCard label="Unique Applications" value={uniqueApps} colorClass="text-violet-600" />
      </div>

      {/* Legend */}
      <Legend />

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary-blue"
        >
          <option value="All">All Domains</option>
          {domains.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <span className="text-xs text-gray-500">
          {filtered.length} capabilities across {grouped.length} domains
        </span>
      </div>

      {/* Domain groups */}
      {grouped.map((l1) => {
        return (
          <div key={l1.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="mb-3 inline-block rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-900 bg-gray-100 border border-gray-200">
              {l1.name}
            </h2>

            {l1.subDomains.map((l2) => (
              <div key={l2.id} className="mb-4 last:mb-0">
                <h3 className="mb-2 text-sm font-medium text-gray-700">{l2.name}</h3>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {l2.children.map((cap) => (
                    <div key={cap.id} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                      <div className="mb-1.5 flex items-start justify-between gap-2">
                        <span className="text-xs font-medium text-gray-800">{cap.name}</span>
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          cap.applications.length > 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {cap.applications.length}
                        </span>
                      </div>
                      {cap.nameCn && (
                        <p className="mb-1.5 text-xs text-gray-400">{cap.nameCn}</p>
                      )}
                      {cap.applications.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {cap.applications.map((app) => {
                            const meta = appLookup.get(app.id);
                            const geo = app.geo || meta?.geo || '';
                            const portfolio = app.portfolioMgt || meta?.portfolioMgt || '';
                            const pColor = getPortfolioColor(portfolio);
                            const gStyle = getGeoStyle(geo);

                            const tooltipLines = [
                              meta?.appFullName && meta.appFullName !== app.name ? `Full Name: ${meta.appFullName}` : '',
                              `Status: ${meta?.appStatus || app.status || 'N/A'}`,
                              `Portfolio: ${portfolio || 'N/A'}`,
                              `Geo: ${geo || 'N/A'}`,
                              meta?.appSolutionOwner ? `Solution Owner: ${meta.appSolutionOwner}` : '',
                              meta?.appItOwner ? `IT Owner: ${meta.appItOwner}` : '',
                              meta?.ownedBy ? `Business Owner: ${meta.ownedBy}` : '',
                              meta?.appOwnerTower ? `Owner Tower: ${meta.appOwnerTower}` : '',
                              meta?.bizFunction ? `Biz Function: ${meta.bizFunction}` : '',
                              meta?.appDescription ? `\nDescription: ${meta.appDescription}` : '',
                            ].filter(Boolean).join('\n');

                            return (
                              <span
                                key={app.id}
                                className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium"
                                style={{
                                  backgroundColor: pColor.bg,
                                  color: pColor.text,
                                  borderStyle: gStyle.borderStyle,
                                  borderWidth: gStyle.borderWidth,
                                  borderColor: pColor.border,
                                }}
                                title={tooltipLines}
                              >
                                {app.name}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-300">No applications mapped</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

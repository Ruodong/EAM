'use client';

import { useMemo, useState } from 'react';
import type { Application } from './types';
import { getDomainPalette } from './constants';

interface AppDashboardProps {
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

export function AppDashboard({ applications }: AppDashboardProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const statuses = useMemo(
    () => ['All', ...Array.from(new Set(applications.map((a) => a.appStatus).filter(Boolean)))],
    [applications],
  );

  const filtered = useMemo(() => {
    let list = [...applications];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.appName.toLowerCase().includes(q) ||
          a.appSolutionOwner.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== 'All') {
      list = list.filter((a) => a.appStatus === statusFilter);
    }
    return list;
  }, [applications, search, statusFilter]);

  const activeCount = applications.filter((a) => a.appStatus === 'Active').length;
  const plannedCount = applications.filter((a) => a.appStatus === 'Planned').length;
  const totalMappings = applications.reduce((sum, a) => sum + a.capabilities.length, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Total Applications" value={applications.length} />
        <KpiCard label="Active" value={activeCount} colorClass="text-emerald-600" />
        <KpiCard label="Planned" value={plannedCount} colorClass="text-sky-600" />
        <KpiCard label="Total Mappings" value={totalMappings} colorClass="text-violet-600" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search applications..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm w-64 focus:outline-none focus:border-primary-blue"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary-blue"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="text-xs text-gray-500">
          {filtered.length} of {applications.length} applications
        </span>
      </div>

      {/* App cards */}
      <div className="grid gap-3">
        {filtered.map((app) => (
          <div key={app.appId} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{app.appName}</h3>
                <p className="text-xs text-gray-500">
                  {app.appId} &middot; {app.appSolutionOwner || 'No owner'} &middot; {app.appSolutionType}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  app.appStatus === 'Active'
                    ? 'bg-emerald-50 text-emerald-700'
                    : app.appStatus === 'Planned'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-amber-50 text-amber-700'
                }`}>
                  {app.appStatus}
                </span>
                {app.geo && (
                  <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-50 text-purple-700">
                    {app.geo}
                  </span>
                )}
                {app.portfolioMgt && (
                  <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-orange-50 text-orange-700">
                    {app.portfolioMgt}
                  </span>
                )}
                {app.bizFunction && (
                  <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-cyan-50 text-cyan-700">
                    {app.bizFunction}
                  </span>
                )}
              </div>
            </div>

            {app.capabilities.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {app.capabilities.map((cap) => (
                  <span
                    key={cap.bcId}
                    className="inline-block rounded-md px-2 py-1 text-xs"
                    style={{
                      backgroundColor: getDomainPalette(cap.lv1Domain).fill,
                      color: getDomainPalette(cap.lv1Domain).stroke,
                      border: `1px solid ${getDomainPalette(cap.lv1Domain).stroke}30`,
                    }}
                  >
                    {cap.bcName}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

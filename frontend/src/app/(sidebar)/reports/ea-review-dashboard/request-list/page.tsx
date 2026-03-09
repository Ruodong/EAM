'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { SearchForm, SearchField } from '@/components/ui/SearchForm';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useT } from '@/lib/locale';
import { ArrowLeft } from 'lucide-react';

export default function DashboardRequestListPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract initial filters from URL query params (from dashboard drill-down)
  const urlFilters = useMemo(() => {
    const f: Record<string, string> = {};
    ['status', 'reviewResult', 'organization', 'reviewerName',
     'dateFrom', 'dateTo', 'bizType', 'scoreMin', 'scoreMax', 'requestorName',
     'scope', 'requestId', 'projectName', 'firstPass',
     'leadTimeMin', 'leadTimeMax', 'workerType',
    ].forEach(key => {
      const val = searchParams.get(key);
      if (val) f[key] = val;
    });
    return f;
  }, [searchParams]);

  // Build chart context description from URL params
  const drillContext = useMemo(() => {
    const parts: string[] = [];
    if (urlFilters.status) parts.push(`Status: ${urlFilters.status}`);
    if (urlFilters.reviewResult) parts.push(`Result: ${urlFilters.reviewResult}`);
    if (urlFilters.organization) parts.push(`Org: ${urlFilters.organization}`);
    if (urlFilters.reviewerName) parts.push(`Reviewer: ${urlFilters.reviewerName}`);
    if (urlFilters.dateFrom || urlFilters.dateTo) {
      const from = urlFilters.dateFrom || '...';
      const to = urlFilters.dateTo || '...';
      parts.push(`Date: ${from} ~ ${to}`);
    }
    if (urlFilters.bizType) parts.push(`Diagram: ${urlFilters.bizType}`);
    if (urlFilters.scoreMin || urlFilters.scoreMax) {
      parts.push(`Score: ${urlFilters.scoreMin || '0'} – ${urlFilters.scoreMax || '10'}`);
    }
    if (urlFilters.firstPass === 'true') parts.push('First Pass Only');
    if (urlFilters.workerType) parts.push(`Worker Type: ${urlFilters.workerType}`);
    if (urlFilters.leadTimeMin || urlFilters.leadTimeMax) {
      parts.push(`Lead Time: ${urlFilters.leadTimeMin || '0'} – ${urlFilters.leadTimeMax || '∞'} days`);
    }
    return parts.length ? parts.join('  ·  ') : null;
  }, [urlFilters]);

  const { data: filterOptions } = useQuery({
    queryKey: ['ea-request-filter-options'],
    queryFn: () => api.get<{ projects: string[]; organizations: string[] }>('/ea-requests/filter-options'),
  });

  const searchFields: SearchField[] = useMemo(() => [
    { key: 'requestId', label: 'Request ID', type: 'text' as const, placeholder: 'Request ID' },
    { key: 'status', label: 'Status', type: 'select' as const, options: [
      { label: 'Draft', value: 'Draft' },
      { label: 'Submitted', value: 'Submitted' },
      { label: 'In Progress', value: 'In Progress' },
      { label: 'Completed', value: 'Completed' },
    ]},
    { key: 'reviewResult', label: 'Review Result', type: 'select' as const, options: [
      { label: 'Approved', value: 'Approved' },
      { label: 'Approved with Actions', value: 'Approved with Actions' },
      { label: 'Rejected', value: 'Rejected' },
      { label: 'Accepted by EA', value: 'Accepted by EA' },
      { label: 'Returned by EA', value: 'Returned by EA' },
    ]},
    { key: 'organization', label: 'Organization', type: 'select' as const, options: (filterOptions?.organizations ?? []).map(n => ({ label: n, value: n })) },
    { key: 'reviewerName', label: 'Reviewer', type: 'text' as const, placeholder: 'Reviewer IT code' },
    { key: 'requestorName', label: 'Requestor', type: 'text' as const, placeholder: 'Requestor' },
    { key: 'dateFrom', label: 'Date From', type: 'text' as const, placeholder: 'YYYY-MM-DD' },
    { key: 'dateTo', label: 'Date To', type: 'text' as const, placeholder: 'YYYY-MM-DD' },
  ], [filterOptions]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<Record<string, string>>(urlFilters);
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // When URL params change (e.g. from dashboard nav), reset filters
  useEffect(() => {
    setFilters(urlFilters);
    setPage(1);
  }, [urlFilters]);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboardRequestList', page, pageSize, filters, sortKey, sortDir],
    queryFn: () => api.get<any>('/ea-requests', { page, pageSize, ...filters, sortBy: sortKey || undefined, sortOrder: sortDir }),
  });

  const columns: Column<any>[] = [
    {
      key: 'requestId', title: 'Request ID', sortable: true,
      render: (v) => (
        <Link
          href={`/reports/ea-review-dashboard/request-detail?id=${v}`}
          className="text-primary-blue font-medium hover:underline"
        >{v}</Link>
      ),
    },
    { key: 'status', title: 'Status', sortable: true, render: (v) => <StatusBadge status={v} /> },
    { key: 'reviewResult', title: 'Review Result', sortable: true, render: (v) => v || '' },
    { key: 'organization', title: 'Organization', sortable: true },
    { key: 'projectName', title: 'Project Name', sortable: true },
    { key: 'scope', title: 'Scope', sortable: true },
    { key: 'requestorName', title: 'Requestor', sortable: true },
    { key: 'reviewerName', title: 'Reviewer', sortable: true },
    { key: 'createdAt', title: 'Created At', sortable: true, render: (v) => v ? new Date(v).toLocaleDateString() : '' },
    { key: 'changedAt', title: 'Changed At', sortable: true, render: (v) => v ? new Date(v).toLocaleDateString() : '' },
  ];

  return (
    <div className="p-6">
      {/* Back button + title */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => router.push('/reports/ea-review-dashboard')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-blue transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </button>
        <h1 className="text-lg font-semibold text-text-primary">{t('Request List')}</h1>
      </div>

      {/* Drill-down context banner */}
      {drillContext && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mb-4 flex items-center gap-2">
          <span className="text-xs text-blue-800 font-medium">Filtered by:</span>
          <span className="text-xs text-blue-700">{drillContext}</span>
          <button
            onClick={() => {
              setFilters({});
              router.push('/reports/ea-review-dashboard/request-list');
            }}
            className="ml-auto text-xs text-blue-600 hover:text-blue-800 underline"
          >Clear filters</button>
        </div>
      )}

      <SearchForm
        fields={searchFields}
        initialValues={filters}
        onSearch={(v) => { setFilters(v); setPage(1); }}
        onReset={() => { setFilters({}); setPage(1); }}
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        rowKey="id"
        loading={isLoading}
        sortKey={sortKey}
        sortDirection={sortDir}
        onSort={(key, dir) => { setSortKey(key); setSortDir(dir); }}
        showColumnSettings
      />
      {data && (
        <Pagination
          currentPage={page}
          totalPages={data.totalPages || 1}
          totalItems={data.total || 0}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        />
      )}
    </div>
  );
}

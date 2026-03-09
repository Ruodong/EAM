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

export default function DashboardActionListPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract initial filters from URL query params (from dashboard drill-down)
  const urlFilters = useMemo(() => {
    const f: Record<string, string> = {};
    ['reviewerName', 'title', 'status', 'priority', 'assigneeName', 'requestId', 'projectId',
     'dateFrom', 'dateTo',
    ].forEach(key => {
      const val = searchParams.get(key);
      if (val) f[key] = val;
    });
    return f;
  }, [searchParams]);

  // Build chart context description from URL params
  const drillContext = useMemo(() => {
    const parts: string[] = [];
    if (urlFilters.reviewerName) parts.push(`Reviewer: ${urlFilters.reviewerName}`);
    if (urlFilters.status) parts.push(`Status: ${urlFilters.status}`);
    if (urlFilters.priority) parts.push(`Priority: ${urlFilters.priority}`);
    if (urlFilters.assigneeName) parts.push(`Assignee: ${urlFilters.assigneeName}`);
    if (urlFilters.requestId) parts.push(`Request: ${urlFilters.requestId}`);
    if (urlFilters.dateFrom || urlFilters.dateTo) {
      const from = urlFilters.dateFrom || '...';
      const to = urlFilters.dateTo || '...';
      parts.push(`Date: ${from} ~ ${to}`);
    }
    return parts.length ? parts.join('  ·  ') : null;
  }, [urlFilters]);

  const searchFields: SearchField[] = useMemo(() => [
    { key: 'title', label: 'Action Title', type: 'text' as const, placeholder: 'Action Title' },
    { key: 'status', label: 'Status', type: 'select' as const, options: [
      { label: 'Open', value: 'Open' },
      { label: 'In Validation', value: 'In Validation' },
      { label: 'Closed', value: 'Closed' },
    ]},
    { key: 'priority', label: 'Priority', type: 'select' as const, options: [
      { label: 'High', value: 'High' },
      { label: 'Medium', value: 'Medium' },
      { label: 'Low', value: 'Low' },
    ]},
    { key: 'assigneeName', label: 'Assignee', type: 'text' as const, placeholder: 'Assignee' },
    { key: 'requestId', label: 'Request ID', type: 'text' as const, placeholder: 'Request ID' },
  ], []);

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
    queryKey: ['dashboardActionList', page, pageSize, filters, sortKey, sortDir],
    queryFn: () => api.get<any>('/actions', { page, pageSize, ...filters, sortBy: sortKey || undefined, sortOrder: sortDir }),
  });

  const columns: Column<any>[] = [
    {
      key: 'actionId', title: 'Action ID', sortable: true,
      render: (v) => (
        <Link
          href={`/reports/ea-review-dashboard/action-detail?actionNo=${v}`}
          className="text-primary-blue font-medium hover:underline"
        >{v}</Link>
      ),
    },
    { key: 'requestName', title: 'Request Name', sortable: false },
    { key: 'projectId', title: 'Project ID', sortable: true },
    { key: 'projectName', title: 'Project Name', sortable: false },
    { key: 'title', title: 'Action Title', sortable: true },
    { key: 'type', title: 'Type', sortable: true },
    { key: 'dueDate', title: 'Due Date', sortable: true, render: (v) => v ? new Date(v).toLocaleDateString() : '' },
    { key: 'closeDate', title: 'Close Date', sortable: true, render: (v) => v ? new Date(v).toLocaleDateString() : '' },
    { key: 'assigneeName', title: 'Assignee(s)', sortable: true },
    { key: 'status', title: 'Status', sortable: true, render: (v) => v ? <StatusBadge status={v} /> : '' },
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
        <h1 className="text-lg font-semibold text-text-primary">{t('Action List')}</h1>
      </div>

      {/* Drill-down context banner */}
      {drillContext && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mb-4 flex items-center gap-2">
          <span className="text-xs text-blue-800 font-medium">Filtered by:</span>
          <span className="text-xs text-blue-700">{drillContext}</span>
          <button
            onClick={() => {
              setFilters({});
              router.push('/reports/ea-review-dashboard/action-list');
            }}
            className="ml-auto text-xs text-blue-600 hover:text-blue-800 underline"
          >Clear filters</button>
        </div>
      )}

      <SearchForm
        fields={searchFields}
        initialValues={filters}
        onSearch={(v) => { setFilters({ ...urlFilters, ...v }); setPage(1); }}
        onReset={() => { setFilters(urlFilters); setPage(1); }}
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

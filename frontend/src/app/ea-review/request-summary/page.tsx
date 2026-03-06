'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { SearchForm, SearchField } from '@/components/ui/SearchForm';
import { StatsCard } from '@/components/ui/StatsCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ActionBar } from '@/components/ui/ActionBar';

const searchFields: SearchField[] = [
  { key: 'projectName', label: 'Project', type: 'text', placeholder: 'Project name' },
  { key: 'requestId', label: 'Request ID', type: 'text', placeholder: 'e.g. EA250101' },
  { key: 'status', label: 'Status', type: 'select', options: [
    { label: 'Draft', value: 'Draft' },
    { label: 'Submitted', value: 'Submitted' },
    { label: 'In Progress', value: 'In Progress' },
    { label: 'Completed', value: 'Completed' },
  ]},
  { key: 'scope', label: 'Scope', type: 'select', options: [
    { label: 'Full Review', value: 'Full Review' },
    { label: 'Scope Check', value: 'Scope Check' },
    { label: 'Scope of Change', value: 'Scope of Change' },
    { label: 'Light Review', value: 'Light Review' },
  ]},
  { key: 'reviewResult', label: 'Review Result', type: 'select', options: [
    { label: 'Approved', value: 'Approved' },
    { label: 'Approved with Actions', value: 'Approved with Actions' },
    { label: 'Rejected', value: 'Rejected' },
    { label: 'Accepted by EA', value: 'Accepted by EA' },
  ]},
  { key: 'requestorName', label: 'Requestor', type: 'text', placeholder: 'Requestor name' },
  { key: 'reviewerName', label: 'Reviewer', type: 'text', placeholder: 'Reviewer name' },
];

export default function RequestSummaryPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const { data: stats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => api.get<any>('/dashboard/stats'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['eaRequests', page, pageSize, filters, sortKey, sortDir],
    queryFn: () => api.get<any>('/ea-requests', { page, pageSize, ...filters, sortBy: sortKey || undefined, sortOrder: sortDir }),
  });

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['eaReviewLogs'],
    queryFn: () => api.get<any>('/ea-review-logs', { page: 1, pageSize: 10 }),
  });

  const columns: Column<any>[] = [
    { key: 'requestId', title: 'Request ID', sortable: true, render: (v) => <span className="text-primary-blue font-medium">{v}</span> },
    { key: 'status', title: 'Status', sortable: true, render: (v) => <StatusBadge status={v} /> },
    { key: 'reviewResult', title: 'Review Result', sortable: true, render: (v) => v ? <StatusBadge status={v} variant="text" /> : '-' },
    { key: 'scope', title: 'Scope', sortable: true },
    { key: 'projectName', title: 'Project', sortable: true },
    { key: 'requestorName', title: 'Requestor', sortable: true },
    { key: 'reviewerName', title: 'Reviewer', sortable: true },
    { key: 'pmName', title: 'PM', sortable: true },
    { key: 'organization', title: 'Organization', sortable: true },
    { key: 'createdAt', title: 'Created', sortable: true, render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
  ];

  const logColumns: Column<any>[] = [
    { key: 'projectId', title: 'Project ID', render: (v) => <span className="text-primary-blue">{v}</span> },
    { key: 'projectName', title: 'Project Name' },
    { key: 'user', title: 'User' },
    { key: 'operationTime', title: 'Operation Time', render: (v) => v ? new Date(v).toLocaleString() : '-' },
    { key: 'action', title: 'Action' },
    { key: 'comments', title: 'Comments' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-4">EA Review - Request Summary</h1>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        <StatsCard label="Total Projects" value={stats?.totalProjects ?? 0} color="text-primary-blue" />
        <StatsCard label="In Progress" value={stats?.inProgress ?? 0} color="text-status-in-progress" />
        <StatsCard label="Completed" value={stats?.completed ?? 0} color="text-status-completed" />
        <StatsCard label="Meetings" value={stats?.meetings ?? 0} color="text-primary-blue" />
        <StatsCard label="Actions" value={stats?.actions ?? 0} color="text-status-in-progress" />
        <StatsCard label="Pending" value={stats?.pending ?? 0} color="text-status-draft" />
        <StatsCard label="Scope Check" value={stats?.scopeCheck ?? 0} color="text-status-submitted" />
        <StatsCard label="Scope of Change" value={stats?.scopeOfChange ?? 0} color="text-status-accepted" />
      </div>

      {/* Search Form */}
      <SearchForm
        fields={searchFields}
        onSearch={(v) => { setFilters(v); setPage(1); }}
        onReset={() => { setFilters({}); setPage(1); }}
      />

      {/* Action Bar */}
      <ActionBar showExport showNew newLabel="New Request" />

      {/* Request Table */}
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

      {/* EA Review Log */}
      <div className="mt-8">
        <h2 className="text-base font-semibold text-text-primary mb-3">EA Review Log</h2>
        <DataTable
          columns={logColumns}
          data={logs?.data ?? []}
          rowKey="id"
          loading={logsLoading}
        />
      </div>
    </div>
  );
}

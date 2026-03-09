'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { SearchForm, SearchField } from '@/components/ui/SearchForm';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useT } from '@/lib/locale';

export default function RequestSummaryPage() {
  const t = useT();
  const { data: filterOptions } = useQuery({
    queryKey: ['ea-request-filter-options'],
    queryFn: () => api.get<{ projects: { id: string; name: string }[]; organizations: string[] }>('/ea-requests/filter-options'),
  });

  const searchFields: SearchField[] = useMemo(() => [
    { key: 'projectName', label: 'Project', type: 'combobox' as const, placeholder: 'Project ID or Name', options: (filterOptions?.projects ?? []).map(p => ({ label: `${p.id} - ${p.name}`, value: `${p.id} - ${p.name}` })) },
    { key: 'status', label: 'Request Status', type: 'multiselect' as const, options: [
      { label: 'Draft', value: 'Draft' },
      { label: 'Submitted', value: 'Submitted' },
      { label: 'In Progress', value: 'In Progress' },
      { label: 'Completed', value: 'Completed' },
    ]},
    { key: 'requestId', label: 'Request ID/Name', type: 'text' as const, placeholder: 'Request ID/Name' },
    { key: 'scope', label: 'Review Scope', type: 'multiselect' as const, options: [
      { label: 'All', value: 'All' },
      { label: 'Part of Project', value: 'Part of Project' },
      { label: 'Full Review', value: 'Full Review' },
      { label: 'Scope Check', value: 'Scope Check' },
      { label: 'Scope of Change', value: 'Scope of Change' },
      { label: 'Light Review', value: 'Light Review' },
    ]},
    { key: 'pmName', label: 'PM', type: 'text' as const, placeholder: 'PM' },
    { key: 'reviewResult', label: 'EA Review Result', type: 'multiselect' as const, options: [
      { label: 'Approved', value: 'Approved' },
      { label: 'Approved with Actions', value: 'Approved with Actions' },
      { label: 'Rejected', value: 'Rejected' },
      { label: 'Accepted by EA', value: 'Accepted by EA' },
      { label: 'Returned by EA', value: 'Returned by EA' },
    ]},
    { key: 'organization', label: 'Organization', type: 'multiselect' as const, options: (filterOptions?.organizations ?? []).map(n => ({ label: n, value: n })) },
    { key: 'requestorName', label: 'Requestor', type: 'text' as const, placeholder: 'Requestor' },
    { key: 'reviewerName', label: 'Assigned Reviewer', type: 'text' as const, placeholder: 'Assigned Reviewer' },
  ], [filterOptions]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = useQuery({
    queryKey: ['eaRequests', page, pageSize, filters, sortKey, sortDir],
    queryFn: () => api.get<any>('/ea-requests', { page, pageSize, ...filters, sortBy: sortKey || undefined, sortOrder: sortDir }),
  });

  const columns: Column<any>[] = [
    { key: 'requestId', title: 'Request ID', sortable: true, render: (v) => <Link href={`/ea-review/request/${v}`} className="text-primary-blue font-medium hover:underline">{v}</Link> },
    { key: 'status', title: 'Request Status', sortable: true, render: (v) => <StatusBadge status={v} /> },
    { key: 'reviewResult', title: 'EA Review Result', sortable: true, render: (v) => v || '' },
    { key: 'projectId', title: 'Project ID', sortable: true },
    { key: 'projectName', title: 'Project Name', sortable: true },
    { key: 'scope', title: 'Review Scope', sortable: true },
    { key: 'wsPhase', title: 'WS Name / Phase Name', sortable: true },
    { key: 'requestorName', title: 'Requestor', sortable: true },
    { key: 'reviewerName', title: 'Assigned Reviewer', sortable: true },
    { key: 'pmName', title: 'PM', sortable: true },
    { key: 'dtLeadName', title: 'DT Lead', sortable: true },
    { key: 'changedBy', title: 'Changed By', sortable: true },
    { key: 'changedAt', title: 'Changed At', sortable: true, render: (v) => v ? new Date(v).toLocaleDateString() : '' },
    { key: 'createdBy', title: 'Created By', sortable: true },
    { key: 'createdAt', title: 'Created At', sortable: true, render: (v) => v ? new Date(v).toLocaleDateString() : '' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-4">{t('Request Summary')}</h1>

      <SearchForm
        fields={searchFields}
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
        exportConfig={{ entity: 'ea-requests', params: filters }}
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

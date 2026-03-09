'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { SearchForm, SearchField } from '@/components/ui/SearchForm';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatusTabs } from '@/components/ui/StatusTabs';
import { ClipboardCheck, Clock } from 'lucide-react';

const searchFields: SearchField[] = [
  { key: 'projectName', label: 'Project', type: 'text', placeholder: 'Project name' },
  { key: 'title', label: 'Action Title', type: 'text', placeholder: 'Action title' },
  { key: 'requestId', label: 'Request ID/Name', type: 'text', placeholder: 'e.g. EA250101' },
  { key: 'createdBy', label: 'Created By(IT Code)', type: 'text', placeholder: 'IT Code' },
  { key: 'actionId', label: 'Action ID', type: 'text', placeholder: 'Action ID' },
  { key: 'assigneeName', label: 'Assignee Name', type: 'text', placeholder: 'Assignee' },
  { key: 'status', label: 'Status', type: 'multiselect', options: [
    { label: 'Open', value: 'Open' },
    { label: 'In Validation', value: 'In Validation' },
    { label: 'Closed', value: 'Closed' },
  ]},
  { key: 'createdAt', label: 'Created At From-To', type: 'text', placeholder: 'Date range' },
  { key: 'requestedBy', label: 'Requested By', type: 'text', placeholder: 'Requested by' },
];

export default function ActionsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('all');
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = useQuery({
    queryKey: ['actions', page, pageSize, filters, activeTab, sortKey, sortDir],
    queryFn: () => api.get<any>('/actions', {
      page, pageSize, ...filters,
      ...(activeTab !== 'all' ? { status: activeTab } : {}),
      sortBy: sortKey || undefined, sortOrder: sortDir,
    }),
  });

  const statusTabs = [
    { label: 'Total', value: 'all', count: data?.stats?.total ?? 0 },
    { label: 'Open', value: 'Open', count: data?.stats?.open ?? 0 },
    { label: 'In Validation', value: 'In Validation', count: data?.stats?.inValidation ?? 0 },
    { label: 'Closed', value: 'Closed', count: data?.stats?.closed ?? 0 },
  ];

  const columns: Column<any>[] = [
    { key: 'actionId', title: 'Action ID', sortable: true, render: (v) => <Link href={`/ea-review/actions/${v}`} className="text-primary-blue font-medium hover:underline">{v}</Link> },
    { key: 'requestName', title: 'Request Name', sortable: false },
    { key: 'projectId', title: 'Project ID', sortable: true },
    { key: 'projectName', title: 'Project Name', sortable: false },
    { key: 'title', title: 'Action Title', sortable: true },
    { key: 'type', title: 'Type', sortable: true },
    { key: 'closeDate', title: 'Close Date', sortable: true, render: (v) => v ? new Date(v).toLocaleDateString() : '' },
    { key: 'dueDate', title: 'Due Date', sortable: true, render: (v) => v ? new Date(v).toLocaleDateString() : '' },
    { key: 'requestedBy', title: 'Requested By', sortable: true },
    { key: 'assigneeName', title: 'Assignee(s)', sortable: true },
    { key: 'applicableDomain', title: 'Applicable Domain', sortable: true },
    { key: 'status', title: 'Status', sortable: true },
  ];

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-4">EA Review - Actions</h1>

      <SearchForm
        fields={searchFields}
        onSearch={(v) => { setFilters(v); setPage(1); }}
        onReset={() => { setFilters({}); setPage(1); }}
      />

      {/* Action buttons + Status tabs */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border-default rounded hover:bg-gray-50 text-status-in-progress">
            <ClipboardCheck className="w-3.5 h-3.5" />
            Action Status
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border-default rounded hover:bg-gray-50 text-status-in-progress">
            <Clock className="w-3.5 h-3.5" />
            Action Expiration
          </button>
        </div>
        <StatusTabs tabs={statusTabs} activeTab={activeTab} onTabChange={(v) => { setActiveTab(v); setPage(1); }} />
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        rowKey="id"
        loading={isLoading}
        sortKey={sortKey}
        sortDirection={sortDir}
        onSort={(key, dir) => { setSortKey(key); setSortDir(dir); }}
        showColumnSettings
        exportConfig={{ entity: 'actions', params: filters }}
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

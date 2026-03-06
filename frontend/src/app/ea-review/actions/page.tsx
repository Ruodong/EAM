'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { SearchForm, SearchField } from '@/components/ui/SearchForm';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatusTabs } from '@/components/ui/StatusTabs';
import { ActionBar } from '@/components/ui/ActionBar';

const searchFields: SearchField[] = [
  { key: 'projectName', label: 'Project', type: 'text', placeholder: 'Project name' },
  { key: 'title', label: 'Action Title', type: 'text', placeholder: 'Action title' },
  { key: 'requestId', label: 'Request ID', type: 'text', placeholder: 'e.g. EA250101' },
  { key: 'assigneeName', label: 'Assignee Name', type: 'text', placeholder: 'Assignee' },
  { key: 'status', label: 'Status', type: 'select', options: [
    { label: 'Open', value: 'Open' },
    { label: 'In Validation', value: 'In Validation' },
    { label: 'Closed', value: 'Closed' },
  ]},
];

export default function ActionsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['actions', page, pageSize, filters, activeTab],
    queryFn: () => api.get<any>('/actions', {
      page, pageSize, ...filters,
      ...(activeTab !== 'all' ? { status: activeTab } : {}),
    }),
  });

  const statusTabs = [
    { label: 'Total', value: 'all', count: data?.stats?.total ?? 0 },
    { label: 'Open', value: 'Open', count: data?.stats?.open ?? 0 },
    { label: 'In Validation', value: 'In Validation', count: data?.stats?.inValidation ?? 0 },
    { label: 'Closed', value: 'Closed', count: data?.stats?.closed ?? 0 },
  ];

  const columns: Column<any>[] = [
    { key: 'actionId', title: 'Action ID', sortable: true, render: (v) => <span className="text-primary-blue font-medium">{v}</span> },
    { key: 'requestName', title: 'Request Name', sortable: true },
    { key: 'projectName', title: 'Project', sortable: true },
    { key: 'title', title: 'Action Title', sortable: true },
    { key: 'type', title: 'Type', sortable: true },
    { key: 'priority', title: 'Priority', sortable: true },
    { key: 'assigneeName', title: 'Assignee', sortable: true },
    { key: 'status', title: 'Status', sortable: true, render: (v) => <StatusBadge status={v} /> },
    { key: 'dueDate', title: 'Due Date', sortable: true, render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-4">EA Review - Actions</h1>

      <SearchForm
        fields={searchFields}
        onSearch={(v) => { setFilters(v); setPage(1); }}
        onReset={() => { setFilters({}); setPage(1); }}
      />

      <ActionBar showExport />

      <StatusTabs tabs={statusTabs} activeTab={activeTab} onTabChange={(v) => { setActiveTab(v); setPage(1); }} />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        rowKey="id"
        loading={isLoading}
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

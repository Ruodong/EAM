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
  { key: 'timeFrom', label: 'Time From', type: 'date' },
  { key: 'status', label: 'Status', type: 'multiselect', options: [
    { label: 'Available', value: 'Available' },
    { label: 'Booked', value: 'Booked' },
    { label: 'Expired', value: 'Expired' },
    { label: 'Completed', value: 'Completed' },
  ]},
];

export default function EACalendarPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('all');
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const { data, isLoading } = useQuery({
    queryKey: ['schedules', page, pageSize, filters, activeTab, sortKey, sortDir],
    queryFn: () => api.get<any>('/schedules', {
      page, pageSize, ...filters,
      ...(activeTab !== 'all' ? { status: activeTab } : {}),
      sortBy: sortKey || undefined, sortOrder: sortDir,
    }),
  });

  const statusTabs = [
    { label: 'Total', value: 'all', count: data?.stats?.total ?? 0 },
    { label: 'Available', value: 'Available', count: data?.stats?.available ?? 0 },
    { label: 'Booked', value: 'Booked', count: data?.stats?.booked ?? 0 },
    { label: 'Expired', value: 'Expired', count: data?.stats?.expired ?? 0 },
    { label: 'Completed', value: 'Completed', count: data?.stats?.completed ?? 0 },
  ];

  const columns: Column<any>[] = [
    { key: 'scheduleNo', title: 'Schedule No.', sortable: true, render: (v) => <span className="text-primary-blue font-medium">{v}</span> },
    { key: 'status', title: 'Status', sortable: true, render: (v) => <StatusBadge status={v} /> },
    { key: 'title', title: 'Title', sortable: true },
    { key: 'startTime', title: 'Start Time', sortable: true, render: (v) => v ? new Date(v).toLocaleString() : '-' },
    { key: 'endTime', title: 'End Time', sortable: true, render: (v) => v ? new Date(v).toLocaleString() : '-' },
    { key: 'duration', title: 'Duration (min)', sortable: true },
    { key: 'ownerName', title: 'Owner', sortable: true },
    { key: 'createdAt', title: 'Created', sortable: false, render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-4">EA Review - EA Calendar</h1>

      <SearchForm
        fields={searchFields}
        onSearch={(v) => { setFilters(v); setPage(1); }}
        onReset={() => { setFilters({}); setPage(1); }}
      />

      <ActionBar showNew newLabel="New Schedule" />

      <StatusTabs tabs={statusTabs} activeTab={activeTab} onTabChange={(v) => { setActiveTab(v); setPage(1); }} />

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

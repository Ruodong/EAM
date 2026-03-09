'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { SearchForm, SearchField } from '@/components/ui/SearchForm';
const searchFields: SearchField[] = [
  { key: 'projectName', label: 'Project', type: 'text', placeholder: 'Project' },
  { key: 'title', label: 'Meeting Title', type: 'text', placeholder: 'Meeting Title' },
  { key: 'meetingAgent', label: 'Meeting Agent', type: 'text', placeholder: 'Meeting Agent' },
  { key: 'evReview', label: 'EV Review', type: 'multiselect', options: [
    { label: 'Yes', value: 'Yes' },
    { label: 'No', value: 'No' },
  ]},
  { key: 'requestId', label: 'Request ID/Name', type: 'text', placeholder: 'Request ID/Name' },
  { key: 'createdBy', label: 'Created By', type: 'text', placeholder: 'Created By' },
  { key: 'createdAt', label: 'Created Date', type: 'text', placeholder: 'Created Date' },
];

export default function MeetingsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = useQuery({
    queryKey: ['meetings', page, pageSize, filters, sortKey, sortDir],
    queryFn: () => api.get<any>('/meetings', { page, pageSize, ...filters, sortBy: sortKey || undefined, sortOrder: sortDir }),
  });

  const columns: Column<any>[] = [
    { key: 'meetingNo', title: 'Meeting No.', sortable: true, render: (v) => <span className="text-primary-blue font-medium">{v}</span> },
    { key: 'requestName', title: 'Request Name', sortable: false },
    { key: 'projectId', title: 'Project ID', sortable: true },
    { key: 'projectName', title: 'Project Name', sortable: false },
    { key: 'title', title: 'Meeting Title', sortable: true },
    { key: 'startTime', title: 'Start Time', sortable: true, render: (v) => v ? new Date(v).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '' },
    { key: 'endTime', title: 'End Time', sortable: true, render: (v) => v ? new Date(v).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-4">Meetings</h1>

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
        exportConfig={{ entity: 'meetings', params: filters }}
        onRowClick={(record) => router.push(`/ea-review/meetings/${record.meetingNo}`)}
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

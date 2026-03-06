'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { SearchForm, SearchField } from '@/components/ui/SearchForm';

const searchFields: SearchField[] = [
  { key: 'projectName', label: 'Project', type: 'text', placeholder: 'Project name' },
  { key: 'title', label: 'Meeting Title', type: 'text', placeholder: 'Meeting title' },
  { key: 'requestId', label: 'Request ID', type: 'text', placeholder: 'e.g. EA250101' },
  { key: 'createdBy', label: 'Created By', type: 'text', placeholder: 'Creator name' },
];

export default function MeetingsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['meetings', page, pageSize, filters],
    queryFn: () => api.get<any>('/meetings', { page, pageSize, ...filters }),
  });

  const columns: Column<any>[] = [
    { key: 'meetingNo', title: 'Meeting No.', sortable: true, render: (v) => <span className="text-primary-blue font-medium">{v}</span> },
    { key: 'requestName', title: 'Request Name', sortable: true },
    { key: 'projectName', title: 'Project', sortable: true },
    { key: 'title', title: 'Meeting Title', sortable: true },
    { key: 'startTime', title: 'Start Time', sortable: true, render: (v) => v ? new Date(v).toLocaleString() : '-' },
    { key: 'endTime', title: 'End Time', sortable: true, render: (v) => v ? new Date(v).toLocaleString() : '-' },
    { key: 'createdBy', title: 'Created By', sortable: true },
    { key: 'createdAt', title: 'Created Date', sortable: true, render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-4">EA Review - Meetings</h1>

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

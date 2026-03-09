'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { SearchForm, SearchField } from '@/components/ui/SearchForm';

const searchFields: SearchField[] = [
  { key: 'projectId', label: 'Project', type: 'text', placeholder: 'Project ID' },
];

export default function EmailSendingLogPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [logType, setLogType] = useState<'meetings' | 'actions'>('meetings');

  const { data, isLoading } = useQuery({
    queryKey: ['emailLog', logType, page, pageSize, filters],
    queryFn: () => api.get<any>(`/email-logs/${logType}`, { page, pageSize, ...filters }),
  });

  const columns: Column<any>[] = [
    { key: 'projectId', title: 'Project', sortable: true },
    { key: 'logTime', title: 'Time', sortable: true, render: (v) => v ? new Date(v).toLocaleString() : '' },
    { key: 'from', title: 'From', sortable: true },
    { key: 'recipients', title: 'Recipients', sortable: true },
    { key: 'subject', title: 'Subject', sortable: true },
    { key: 'status', title: 'Status', sortable: true },
    { key: 'meetingId', title: 'Meeting ID', sortable: true },
  ];

  return (
    <div className="p-6">
      <SearchForm
        fields={searchFields}
        onSearch={(v) => { setFilters(v); setPage(1); }}
        onReset={() => { setFilters({}); setPage(1); }}
      />

      <div className="flex items-center gap-4 mb-3">
        <h2 className="text-base font-semibold text-text-primary">Email Sending Log</h2>
        <div className="flex items-center gap-1 bg-gray-100 rounded p-0.5">
          <button
            onClick={() => { setLogType('meetings'); setPage(1); }}
            className={`px-3 py-1 text-xs rounded ${logType === 'meetings' ? 'bg-white shadow text-primary-blue font-medium' : 'text-text-secondary'}`}
          >
            Meetings
          </button>
          <button
            onClick={() => { setLogType('actions'); setPage(1); }}
            className={`px-3 py-1 text-xs rounded ${logType === 'actions' ? 'bg-white shadow text-primary-blue font-medium' : 'text-text-secondary'}`}
          >
            Actions
          </button>
        </div>
      </div>

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

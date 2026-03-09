'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { SearchForm, SearchField } from '@/components/ui/SearchForm';
const searchFields: SearchField[] = [
  { key: 'projectId', label: 'Project ID', type: 'text', placeholder: 'Project ID' },
  { key: 'status', label: 'Status', type: 'select', options: [
    { label: 'Draft', value: 'Draft' },
    { label: 'In Progress', value: 'In Progress' },
    { label: 'Completed', value: 'Completed' },
    { label: 'Submitted', value: 'Submitted' },
  ]},
];

const formatDate = (v: string | null) => v ? new Date(v).toLocaleDateString() : '—';

export default function LeadTimeReportPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['leadTimeReport', page, pageSize, filters],
    queryFn: () => api.get<any>('/reports/lead-time', { page, pageSize, ...filters }),
  });

  const columns: Column<any>[] = [
    { key: 'requestId', title: 'Request ID', sortable: true, render: (v) => <span className="text-primary-blue font-medium">{v}</span> },
    { key: 'projectId', title: 'Project ID', sortable: true },
    { key: 'projectName', title: 'Project Name', sortable: true },
    { key: 'overallStatus', title: 'Overall Status', sortable: true },
    { key: 'draftTime', title: 'Draft Time', sortable: true, render: formatDate },
    { key: 'inProgressTime', title: 'In Progress Time', sortable: true, render: formatDate },
    { key: 'completedTime', title: 'Completed Time', sortable: true, render: formatDate },
    { key: 'totalLeadTimeDays', title: 'Total Lead Time(Days)', sortable: true, render: (v) => v !== null ? `${v} days` : '—' },
  ];

  return (
    <div className="p-6">
      <SearchForm
        fields={searchFields}
        onSearch={(v) => { setFilters(v); setPage(1); }}
        onReset={() => { setFilters({}); setPage(1); }}
      />

      <h2 className="text-base font-semibold text-text-primary mb-3">Lead Time Report</h2>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        rowKey="id"
        loading={isLoading}
        showColumnSettings
        exportConfig={{ entity: 'lead-time', params: filters }}
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

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { SearchForm, SearchField } from '@/components/ui/SearchForm';

const searchFields: SearchField[] = [
  { key: 'objectType', label: 'Object Type', type: 'text', placeholder: 'Object Type' },
  { key: 'createBy', label: 'Changed By', type: 'text', placeholder: 'Changed By' },
  { key: 'projectId', label: 'Project ID', type: 'text', placeholder: 'Project ID' },
];

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['auditLog', page, pageSize, filters],
    queryFn: () => api.get<any>('/audit-log', { page, pageSize, ...filters }),
  });

  const columns: Column<any>[] = [
    { key: 'projectId', title: 'Project', sortable: true },
    { key: 'objectType', title: 'Object Type', sortable: true },
    { key: 'objectId', title: 'Object ID', sortable: true },
    { key: 'field', title: 'Field', sortable: true },
    { key: 'oldValue', title: 'Old Value', sortable: true },
    { key: 'newValue', title: 'New Value', sortable: true },
    { key: 'createdBy', title: 'Changed By', sortable: true },
    { key: 'createdAt', title: 'Changed At', sortable: true, render: (v) => v ? new Date(v).toLocaleString() : '' },
  ];

  return (
    <div className="p-6">
      <SearchForm
        fields={searchFields}
        onSearch={(v) => { setFilters(v); setPage(1); }}
        onReset={() => { setFilters({}); setPage(1); }}
      />

      <h2 className="text-base font-semibold text-text-primary mb-3">Audit Log</h2>

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

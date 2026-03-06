'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { SearchForm, SearchField } from '@/components/ui/SearchForm';
import { StatusBadge } from '@/components/ui/StatusBadge';

const searchFields: SearchField[] = [
  { key: 'name', label: 'Technology Name', type: 'text', placeholder: 'Technology name' },
  { key: 'category', label: 'Category', type: 'select', options: [
    { label: 'Frontend', value: 'Frontend' },
    { label: 'Backend', value: 'Backend' },
    { label: 'Database', value: 'Database' },
    { label: 'Cloud', value: 'Cloud' },
    { label: 'DevOps', value: 'DevOps' },
    { label: 'Security', value: 'Security' },
    { label: 'AI/ML', value: 'AI/ML' },
  ]},
  { key: 'status', label: 'Status', type: 'select', options: [
    { label: 'Approved', value: 'Approved' },
    { label: 'Under Review', value: 'Under Review' },
    { label: 'Deprecated', value: 'Deprecated' },
    { label: 'Restricted', value: 'Restricted' },
  ]},
  { key: 'vendor', label: 'Vendor', type: 'text', placeholder: 'Vendor name' },
];

export default function TechStackPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['techStack', page, pageSize, filters],
    queryFn: () => api.get<any>('/technology-stack', { page, pageSize, ...filters }),
  });

  const columns: Column<any>[] = [
    { key: 'name', title: 'Technology Name', sortable: true, render: (v) => <span className="text-primary-blue font-medium">{v}</span> },
    { key: 'category', title: 'Category', sortable: true },
    { key: 'vendor', title: 'Vendor', sortable: true },
    { key: 'version', title: 'Version', sortable: true },
    { key: 'status', title: 'Status', sortable: true, render: (v) => <StatusBadge status={v} /> },
    { key: 'description', title: 'Description', sortable: false },
    { key: 'updatedAt', title: 'Updated', sortable: true, render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-4">Technology Stack</h1>

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

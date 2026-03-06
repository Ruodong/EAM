'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { SearchForm, SearchField } from '@/components/ui/SearchForm';
import { StatusBadge } from '@/components/ui/StatusBadge';

const searchFields: SearchField[] = [
  { key: 'name', label: 'Certification Name', type: 'text', placeholder: 'Certification name' },
  { key: 'type', label: 'Type', type: 'text', placeholder: 'Certification type' },
  { key: 'status', label: 'Status', type: 'select', options: [
    { label: 'Active', value: 'Active' },
    { label: 'Expired', value: 'Expired' },
    { label: 'Pending', value: 'Pending' },
  ]},
];

export default function CertificationPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['certifications', page, pageSize, filters],
    queryFn: () => api.get<any>('/certifications', { page, pageSize, ...filters }),
  });

  const columns: Column<any>[] = [
    { key: 'certId', title: 'Cert ID', sortable: true, render: (v) => <span className="text-primary-blue font-medium">{v}</span> },
    { key: 'name', title: 'Certification Name', sortable: true },
    { key: 'type', title: 'Type', sortable: true },
    { key: 'status', title: 'Status', sortable: true, render: (v) => <StatusBadge status={v} /> },
    { key: 'issuedDate', title: 'Issued Date', sortable: true, render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
    { key: 'expiryDate', title: 'Expiry Date', sortable: true, render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
    { key: 'ownerName', title: 'Owner', sortable: true },
  ];

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-4">Certification</h1>

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

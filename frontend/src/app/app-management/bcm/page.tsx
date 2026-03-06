'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { SearchForm, SearchField } from '@/components/ui/SearchForm';
import { StatusBadge } from '@/components/ui/StatusBadge';

const searchFields: SearchField[] = [
  { key: 'appId', label: 'App ID', type: 'text', placeholder: 'Application ID' },
  { key: 'name', label: 'App Name', type: 'text', placeholder: 'Application name' },
  { key: 'classification', label: 'Classification', type: 'text', placeholder: 'Classification' },
  { key: 'function', label: 'Function', type: 'text', placeholder: 'Function' },
  { key: 'version', label: 'Version', type: 'text', placeholder: 'Version' },
  { key: 'domainL1', label: 'Domain L1', type: 'text', placeholder: 'Domain L1' },
  { key: 'subDomainL2', label: 'Sub Domain L2', type: 'text', placeholder: 'Sub Domain L2' },
  { key: 'bcName', label: 'BC Name', type: 'text', placeholder: 'BC Name' },
];

export default function BCMPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['applications', page, pageSize, filters],
    queryFn: () => api.get<any>('/applications', { page, pageSize, ...filters }),
  });

  const columns: Column<any>[] = [
    { key: 'appId', title: 'App ID', sortable: true, render: (v) => <span className="text-primary-blue font-medium">{v}</span> },
    { key: 'name', title: 'Application Name', sortable: true },
    { key: 'ownership', title: 'Ownership', sortable: true },
    { key: 'solutionOwner', title: 'Solution Owner', sortable: true },
    { key: 'dtOwner', title: 'DT Owner', sortable: true },
    { key: 'status', title: 'Status', sortable: true, render: (v) => <StatusBadge status={v} /> },
    { key: 'bcId', title: 'BC ID', sortable: true },
    { key: 'bcName', title: 'BC Name', sortable: true },
  ];

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-4">Business Capability Mapping</h1>

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

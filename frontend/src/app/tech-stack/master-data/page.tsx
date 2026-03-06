'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { SearchForm, SearchField } from '@/components/ui/SearchForm';
import { ActionBar } from '@/components/ui/ActionBar';

const searchFields: SearchField[] = [
  { key: 'name', label: 'Technology Name', type: 'text', placeholder: 'Name' },
  { key: 'category', label: 'Category', type: 'text', placeholder: 'Category' },
  { key: 'vendor', label: 'Vendor', type: 'text', placeholder: 'Vendor' },
];

export default function TechStackMasterDataPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['techStackMaster', page, pageSize, filters],
    queryFn: () => api.get<any>('/technology-stack', { page, pageSize, ...filters }),
  });

  const columns: Column<any>[] = [
    { key: 'name', title: 'Technology Name', sortable: true, render: (v) => <span className="text-primary-blue font-medium">{v}</span> },
    { key: 'category', title: 'Category', sortable: true },
    { key: 'vendor', title: 'Vendor', sortable: true },
    { key: 'version', title: 'Version', sortable: true },
    { key: 'status', title: 'Status', sortable: true },
    { key: 'description', title: 'Description' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-4">Technology Stack Master Data</h1>

      <SearchForm
        fields={searchFields}
        onSearch={(v) => { setFilters(v); setPage(1); }}
        onReset={() => { setFilters({}); setPage(1); }}
      />

      <ActionBar showImport showExport />

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

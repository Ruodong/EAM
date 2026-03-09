'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { SearchForm, SearchField } from '@/components/ui/SearchForm';
import { Plus, HelpCircle } from 'lucide-react';

const searchFields: SearchField[] = [
  { key: 'applicationId', label: 'Application ID', type: 'text', placeholder: 'Application ID' },
  { key: 'applicationName', label: 'Application Name', type: 'text', placeholder: 'Application Name' },
  { key: 'applicationOwner', label: 'Application Owner', type: 'text', placeholder: 'Application Owner' },
  { key: 'lifecycleStatus', label: 'Lifecycle Status', type: 'multiselect', options: [
    { label: 'Active', value: 'Active' },
    { label: 'Phase Out', value: 'Phase Out' },
    { label: 'End of Life', value: 'End of Life' },
    { label: 'Retired', value: 'Retired' },
  ]},
];

export default function LifecycleManagementPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['lifecycleManagement', page, pageSize, filters],
    queryFn: () => api.get<any>('/technology-stack/lifecycle', { page, pageSize, ...filters }),
  });

  const columns: Column<any>[] = [
    { key: 'applicationId', title: 'Application ID', sortable: true, render: (v) => <span className="text-primary-blue font-medium">{v}</span> },
    { key: 'applicationName', title: 'Application Name', sortable: true },
    { key: 'applicationOwnership', title: 'Application Ownership', sortable: true },
    { key: 'applicationClassification', title: 'Application Classification', sortable: true },
    { key: 'functionValueChain', title: 'Function (Value Chain)', sortable: true },
    { key: 'applicationOwner', title: 'Application Owner', sortable: true },
    { key: 'lifecycleStatus', title: 'Lifecycle Status', sortable: true },
  ];

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-4">Technology Stack Lifecycle Management</h1>

      {/* Add an Application button */}
      <div className="flex items-center gap-3 mb-4">
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-blue border border-primary-blue rounded hover:bg-blue-50">
          <Plus className="w-3.5 h-3.5" />
          Add an Application
        </button>
        <button className="text-text-secondary hover:text-text-primary">
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

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

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { SearchForm, SearchField } from '@/components/ui/SearchForm';
import { Plus, Upload, Download, Pencil, Trash2 } from 'lucide-react';

const searchFields: SearchField[] = [
  { key: 'category', label: 'Category', type: 'multiselect', options: [
    { label: 'Framework', value: 'Framework' },
    { label: 'Library', value: 'Library' },
    { label: 'Platform', value: 'Platform' },
    { label: 'Database', value: 'Database' },
    { label: 'Language', value: 'Language' },
    { label: 'Tool', value: 'Tool' },
  ]},
  { key: 'subCategory', label: 'Sub-Category', type: 'multiselect', options: [
    { label: 'Gen AI', value: 'Gen AI' },
    { label: 'Frontend', value: 'Frontend' },
    { label: 'Backend', value: 'Backend' },
    { label: 'Logging', value: 'Logging' },
    { label: 'Security', value: 'Security' },
    { label: 'Cloud', value: 'Cloud' },
    { label: 'DevOps', value: 'DevOps' },
  ]},
  { key: 'eaAdvice', label: 'EA Advice', type: 'multiselect', options: [
    { label: 'Adopt', value: 'Adopt' },
    { label: 'Trial', value: 'Trial' },
    { label: 'Assess', value: 'Assess' },
    { label: 'Hold', value: 'Hold' },
  ]},
  { key: 'technologyComponent', label: 'Technology Component', type: 'text', placeholder: 'Technology Component' },
  { key: 'componentPackageName', label: 'Component Package Name', type: 'text', placeholder: 'Component Package Name' },
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
    { key: 'id', title: 'No.', sortable: true },
    { key: 'category', title: 'Category', sortable: true },
    { key: 'subCategory', title: 'Sub Category', sortable: true },
    { key: 'technologyComponent', title: 'Technology Component', sortable: true },
    { key: 'componentPackageName', title: 'Component Package Name', sortable: true },
    { key: 'standard', title: 'Standard', sortable: true, render: (v) => v ? 'Yes' : 'No' },
    { key: 'restricted', title: 'Restricted', sortable: true, render: (v) => v ? 'Yes' : 'No' },
    { key: 'version', title: 'Version', sortable: true },
    { key: 'operation', title: 'Operation', sortable: false, render: () => (
      <div className="flex items-center gap-2">
        <button className="text-text-secondary hover:text-primary-blue"><Pencil className="w-3.5 h-3.5" /></button>
        <button className="text-text-secondary hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    )},
  ];

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-4">Technology Stack Version Master Data</h1>

      <SearchForm
        fields={searchFields}
        onSearch={(v) => { setFilters(v); setPage(1); }}
        onReset={() => { setFilters({}); setPage(1); }}
      />

      {/* Action buttons */}
      <div className="flex items-center gap-2 mb-3">
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-blue border border-primary-blue rounded hover:bg-blue-50">
          <Plus className="w-3.5 h-3.5" />
          New
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border-default rounded hover:bg-gray-50 text-text-secondary">
          <Upload className="w-3.5 h-3.5" />
          Import
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border-default rounded hover:bg-gray-50 text-text-secondary">
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
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

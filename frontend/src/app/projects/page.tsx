'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { SearchForm, SearchField } from '@/components/ui/SearchForm';
import { Plus, Star } from 'lucide-react';

const searchFields: SearchField[] = [
  { key: 'projectId', label: 'Project ID', type: 'text', placeholder: 'Project ID' },
  { key: 'name', label: 'Project Name', type: 'text', placeholder: 'Project Name' },
  { key: 'itCode', label: 'IT Code', type: 'text', placeholder: 'IT Code' },
  { key: 'requestStatus', label: 'Request Status', type: 'select', options: [
    { label: 'Draft', value: 'Draft' },
    { label: 'Submitted', value: 'Submitted' },
    { label: 'In Progress', value: 'In Progress' },
    { label: 'Completed', value: 'Completed' },
  ]},
  { key: 'aiRelated', label: 'AI Related', type: 'select', options: [
    { label: 'Yes', value: 'true' },
    { label: 'No', value: 'false' },
  ]},
];

export default function ProjectsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [highFocus, setHighFocus] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['projects', page, pageSize, filters, sortKey, sortDir],
    queryFn: () => api.get<any>('/projects', { page, pageSize, ...filters, sortBy: sortKey || undefined, sortOrder: sortDir }),
  });

  const columns: Column<any>[] = [
    { key: 'favorite', title: 'High Focus', width: '80px', render: () => <Star className="w-4 h-4 text-text-secondary hover:text-yellow-400 cursor-pointer" /> },
    { key: 'projectId', title: 'Project ID', sortable: true, render: (v) => <span className="text-primary-blue font-medium">{v}</span> },
    { key: 'name', title: 'Project Name', sortable: true },
    { key: 'pmName', title: 'PM', sortable: true },
    { key: 'dtLeadName', title: 'DT Lead', sortable: true },
    { key: 'itLeadName', title: 'IT Lead', sortable: true },
    { key: 'aiRelated', title: 'AI Related', sortable: true, render: (v) => v ? 'Yes' : v === false ? 'No' : '' },
    { key: 'comments', title: 'Comments', sortable: false },
  ];

  return (
    <div className="p-6">
      <SearchForm
        fields={searchFields}
        onSearch={(v) => { setFilters(v); setPage(1); }}
        onReset={() => { setFilters({}); setPage(1); }}
      />

      {/* Action bar: New + High Focus toggle */}
      <div className="flex items-center mb-3 gap-3">
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-blue border border-primary-blue rounded hover:bg-blue-50">
          <Plus className="w-3.5 h-3.5" />
          New
        </button>
        <label className="flex items-center gap-2 cursor-pointer">
          <div className={`relative w-10 h-5 rounded-full transition-colors ${highFocus ? 'bg-primary-blue' : 'bg-gray-300'}`} onClick={() => setHighFocus(!highFocus)}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${highFocus ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm text-text-secondary">High Focus</span>
        </label>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        rowKey="id"
        loading={isLoading}
        sortKey={sortKey}
        sortDirection={sortDir}
        onSort={(key, dir) => { setSortKey(key); setSortDir(dir); }}
        showColumnSettings
        exportConfig={{ entity: 'projects', params: filters }}
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

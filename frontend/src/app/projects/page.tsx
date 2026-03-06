'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { SearchForm, SearchField } from '@/components/ui/SearchForm';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ActionBar } from '@/components/ui/ActionBar';
import { Star } from 'lucide-react';

const searchFields: SearchField[] = [
  { key: 'projectId', label: 'Project ID', type: 'text', placeholder: 'e.g. LI2500001' },
  { key: 'name', label: 'Project Name', type: 'text', placeholder: 'Project name' },
  { key: 'itCode', label: 'IT Code', type: 'text', placeholder: 'IT code' },
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

  const { data, isLoading } = useQuery({
    queryKey: ['projects', page, pageSize, filters, sortKey, sortDir],
    queryFn: () => api.get<any>('/projects', { page, pageSize, ...filters, sortBy: sortKey || undefined, sortOrder: sortDir }),
  });

  const columns: Column<any>[] = [
    { key: 'favorite', title: '', width: '40px', render: () => <Star className="w-4 h-4 text-text-secondary hover:text-yellow-400 cursor-pointer" /> },
    { key: 'projectId', title: 'Project ID', sortable: true, render: (v) => <span className="text-primary-blue font-medium">{v}</span> },
    { key: 'name', title: 'Project Name', sortable: true },
    { key: 'pmName', title: 'PM', sortable: true },
    { key: 'dtLeadName', title: 'DT Lead', sortable: true },
    { key: 'itLeadName', title: 'IT Lead', sortable: true },
    { key: 'aiRelated', title: 'AI Related', sortable: true, render: (v) => v ? 'Yes' : 'No' },
    { key: 'requestStatus', title: 'Request Status', sortable: true, render: (v) => v ? <StatusBadge status={v} /> : '-' },
    { key: 'createdAt', title: 'Created', sortable: true, render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-4">Projects</h1>

      <SearchForm
        fields={searchFields}
        onSearch={(v) => { setFilters(v); setPage(1); }}
        onReset={() => { setFilters({}); setPage(1); }}
      />

      <ActionBar showNew showExport newLabel="New Project" />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        rowKey="id"
        loading={isLoading}
        sortKey={sortKey}
        sortDirection={sortDir}
        onSort={(key, dir) => { setSortKey(key); setSortDir(dir); }}
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

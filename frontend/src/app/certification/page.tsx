'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { SearchForm, SearchField } from '@/components/ui/SearchForm';
import { Plus, Upload, Download, Mail } from 'lucide-react';

const searchFields: SearchField[] = [
  { key: 'certId', label: 'Certificate No.', type: 'text', placeholder: 'Certificate No.' },
  { key: 'name', label: 'Exam Name', type: 'text', placeholder: 'Exam Name' },
  { key: 'type', label: 'Certificate Type', type: 'select', options: [
    { label: 'EA Foundation', value: 'EA Foundation' },
    { label: 'EA Practitioner', value: 'EA Practitioner' },
    { label: 'TOGAF', value: 'TOGAF' },
  ]},
  { key: 'itCode', label: 'IT Code', type: 'text', placeholder: 'IT Code' },
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
    { key: 'certId', title: 'Certificate No.', sortable: true, render: (v) => <span className="text-primary-blue font-medium">{v}</span> },
    { key: 'name', title: 'Exam Name', sortable: true },
    { key: 'itCode', title: 'IT Code', sortable: true },
    { key: 'ownerName', title: 'User Name', sortable: true },
    { key: 'type', title: 'Certificate Type', sortable: true },
    { key: 'issuedDate', title: 'Issue Date', sortable: true, render: (v) => v ? new Date(v).toLocaleDateString() : '' },
    { key: 'expiryDate', title: 'Due Date', sortable: true, render: (v) => v ? new Date(v).toLocaleDateString() : '' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-4">Certification</h1>

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
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border-default rounded hover:bg-gray-50 text-text-secondary">
          <Mail className="w-3.5 h-3.5" />
          Email
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

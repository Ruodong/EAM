'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/ui/DataTable';
import { SearchForm, SearchField } from '@/components/ui/SearchForm';
import { Plus, Download } from 'lucide-react';

const searchFields: SearchField[] = [
  { key: 'title', label: 'Title', type: 'text', placeholder: 'Title' },
  { key: 'description', label: 'Description', type: 'text', placeholder: 'Description' },
];

export default function ScopeOfChangeTemplatePage() {
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['scopeChangeTemplates'],
    queryFn: () => api.get<any[]>('/scope-of-change-templates'),
  });

  // Client-side filter since backend returns all templates
  const filteredData = (data ?? []).filter((item: any) => {
    if (filters.title && !item.title?.toLowerCase().includes(filters.title.toLowerCase())) return false;
    if (filters.description && !item.description?.toLowerCase().includes(filters.description.toLowerCase())) return false;
    return true;
  });

  const columns: Column<any>[] = [
    { key: 'scopeNo', title: 'No.', sortable: true },
    { key: 'title', title: 'Title', sortable: true, render: (v) => <span className="text-primary-blue font-medium">{v}</span> },
    { key: 'description', title: 'Description', sortable: true },
  ];

  return (
    <div className="p-6">
      <SearchForm
        fields={searchFields}
        onSearch={(v) => { setFilters(v); }}
        onReset={() => { setFilters({}); }}
      />

      {/* Action buttons */}
      <div className="flex items-center gap-2 mb-3">
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-blue border border-primary-blue rounded hover:bg-blue-50">
          <Plus className="w-3.5 h-3.5" />
          New
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-blue border border-primary-blue rounded hover:bg-blue-50">
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        rowKey="id"
        loading={isLoading}
        showColumnSettings
      />
      <div className="mt-2 text-xs text-text-secondary">
        {filteredData.length} template(s)
      </div>
    </div>
  );
}

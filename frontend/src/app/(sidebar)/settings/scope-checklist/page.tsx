'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/ui/DataTable';
import { SearchForm, SearchField } from '@/components/ui/SearchForm';
import { Plus, Download, Save, Settings2 } from 'lucide-react';

const searchFields: SearchField[] = [
  { key: 'category', label: 'Category', type: 'multiselect', options: [
    { label: 'Architecture', value: 'Architecture' },
    { label: 'Security', value: 'Security' },
    { label: 'Data', value: 'Data' },
    { label: 'Infrastructure', value: 'Infrastructure' },
  ]},
  { key: 'questions', label: 'Questions', type: 'text', placeholder: 'Questions' },
];

export default function ScopeCheckListTemplatePage() {
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['scopeChecklistTemplates'],
    queryFn: () => api.get<any[]>('/scope-check-list-templates'),
  });

  // Client-side filter since backend returns all templates
  const filteredData = (data ?? []).filter((item: any) => {
    if (filters.category && item.category !== filters.category) return false;
    if (filters.questions && !item.questions?.toLowerCase().includes(filters.questions.toLowerCase())) return false;
    return true;
  });

  const columns: Column<any>[] = [
    { key: 'checklistNo', title: 'Checklist ID', sortable: true },
    { key: 'category', title: 'Category', sortable: true },
    { key: 'subCategory', title: 'Sub Category', sortable: true },
    { key: 'questions', title: 'Questions', sortable: true },
    { key: 'answer', title: 'Answer', sortable: true },
    { key: 'option', title: 'Option', sortable: true },
  ];

  return (
    <div className="p-6">
      <SearchForm
        fields={searchFields}
        onSearch={(v) => { setFilters(v); }}
        onReset={() => { setFilters({}); }}
      />

      {/* Action buttons */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-blue border border-primary-blue rounded hover:bg-blue-50">
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-blue border border-primary-blue rounded hover:bg-blue-50">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-blue border border-primary-blue rounded hover:bg-blue-50">
            <Save className="w-3.5 h-3.5" />
            Save a new version
          </button>
        </div>
        <div className="flex items-center gap-2">
          <select className="px-3 py-1.5 text-sm border border-border-default rounded text-text-secondary">
            <option>Version</option>
          </select>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-blue border border-primary-blue rounded hover:bg-blue-50">
            <Settings2 className="w-3.5 h-3.5" />
            Manage Versions
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        rowKey="id"
        loading={isLoading}
        showColumnSettings
      />
      <div className="mt-2 text-xs text-text-secondary">
        {filteredData.length} checklist item(s)
      </div>
    </div>
  );
}

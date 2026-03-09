'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { SearchForm, SearchField } from '@/components/ui/SearchForm';
import { ActionBar } from '@/components/ui/ActionBar';

const searchFields: SearchField[] = [
  { key: 'version', label: 'Version', type: 'text', placeholder: 'Version' },
  { key: 'domainL1', label: 'Domain L1', type: 'text', placeholder: 'Domain L1' },
  { key: 'subDomainL2', label: 'Sub Domain L2', type: 'text', placeholder: 'Sub Domain L2' },
  { key: 'bcName', label: 'BC Name', type: 'text', placeholder: 'BC Name' },
  { key: 'level', label: 'Level', type: 'multiselect', options: [
    { label: 'L1', value: '1' },
    { label: 'L2', value: '2' },
    { label: 'L3', value: '3' },
    { label: 'L4', value: '4' },
  ]},
];

export default function BCPFMasterDataPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['bcpf', page, pageSize, filters],
    queryFn: () => api.get<any>('/bcpf-master-data', { page, pageSize, ...filters }),
  });

  const columns: Column<any>[] = [
    { key: 'bcId', title: 'BC ID', sortable: true, render: (v) => <span className="text-primary-blue font-medium">{v}</span> },
    { key: 'parentBcId', title: 'Parent BC ID', sortable: true },
    { key: 'bcName', title: 'BC Name', sortable: true },
    { key: 'bcNameCn', title: 'BC Name (CN)' },
    { key: 'domainL1', title: 'Domain L1', sortable: true },
    { key: 'subDomainL2', title: 'Sub Domain L2', sortable: true },
    { key: 'capabilityGroupL3', title: 'Capability Group L3', sortable: true },
    { key: 'level', title: 'Level', sortable: true },
    { key: 'bcDescription', title: 'Description' },
    { key: 'alias', title: 'Alias' },
    { key: 'bizGroup', title: 'Biz Group' },
    { key: 'geo', title: 'Geo' },
    { key: 'bizOwner', title: 'Biz Owner' },
    { key: 'bizTeam', title: 'Biz Team' },
    { key: 'dtOwner', title: 'DT Owner' },
    { key: 'dtTeam', title: 'DT Team' },
    { key: 'remark', title: 'Remark' },
    { key: 'version', title: 'Version', sortable: true },
  ];

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-4">BCPF Master Data</h1>

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

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/ui/DataTable';
import { SearchForm, SearchField } from '@/components/ui/SearchForm';
import { Building2, Server, Network, FolderTree } from 'lucide-react';

type TabKey = 'companies' | 'dataCenters' | 'dataClassification' | 'legalEntities';

const tabs: { key: TabKey; label: string; icon: any }[] = [
  { key: 'companies', label: 'Companies', icon: Building2 },
  { key: 'dataCenters', label: 'Data Centers', icon: Server },
  { key: 'dataClassification', label: 'Data Classification', icon: FolderTree },
  { key: 'legalEntities', label: 'Legal Entities', icon: Network },
];

const companySearchFields: SearchField[] = [
  { key: 'search', label: 'Search', type: 'text', placeholder: 'Company code or name' },
];

const companyColumns: Column<any>[] = [
  { key: 'companyCode', title: 'Company Code', sortable: true, render: (v) => <span className="text-primary-blue font-medium">{v}</span> },
  { key: 'companyName', title: 'Company Name', sortable: true },
  { key: 's4', title: 'S4', sortable: true },
  { key: 'area', title: 'Area', sortable: true },
  { key: 'companyRemark', title: 'Remark', sortable: true },
];

const dataCenterColumns: Column<any>[] = [
  { key: 'name', title: 'Name', sortable: true, render: (v) => <span className="text-primary-blue font-medium">{v}</span> },
  { key: 'createdBy', title: 'Created By', sortable: true },
  { key: 'createdAt', title: 'Created At', sortable: true, render: (v) => v ? new Date(v).toLocaleDateString() : '' },
];

const classificationColumns: Column<any>[] = [
  { key: 'code', title: 'Code', sortable: true },
  { key: 'nameEn', title: 'Name (EN)', sortable: true, render: (v) => <span className="text-primary-blue font-medium">{v}</span> },
  { key: 'nameZh', title: 'Name (ZH)', sortable: true },
  { key: 'method', title: 'Method', sortable: true },
  { key: 'level', title: 'Level', sortable: true },
  { key: 'parent', title: 'Parent', sortable: true },
  { key: 'status', title: 'Status', sortable: true },
];

const legalEntityColumns: Column<any>[] = [
  { key: 'companyCode', title: 'Company Code', sortable: true, render: (v) => <span className="text-primary-blue font-medium">{v}</span> },
  { key: 'appId', title: 'Application ID', sortable: true },
  { key: 'createdAt', title: 'Created At', sortable: true, render: (v) => v ? new Date(v).toLocaleDateString() : '' },
];

export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('companies');
  const [companySearch, setCompanySearch] = useState('');

  const { data: companies, isLoading: loadingCompanies } = useQuery({
    queryKey: ['companies', companySearch],
    queryFn: () => api.get<any[]>('/master-data/companies', companySearch ? { search: companySearch } : {}),
    enabled: activeTab === 'companies',
  });

  const { data: dataCenters, isLoading: loadingDC } = useQuery({
    queryKey: ['dataCenters'],
    queryFn: () => api.get<any[]>('/master-data/data-centers'),
    enabled: activeTab === 'dataCenters',
  });

  const { data: classification, isLoading: loadingClassification } = useQuery({
    queryKey: ['dataClassification'],
    queryFn: () => api.get<any[]>('/master-data/data-classification'),
    enabled: activeTab === 'dataClassification',
  });

  const { data: legalEntities, isLoading: loadingLE } = useQuery({
    queryKey: ['legalEntities'],
    queryFn: () => api.get<any[]>('/master-data/legal-entities'),
    enabled: activeTab === 'legalEntities',
  });

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-4">Master Data</h1>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border-light mb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-blue text-primary-blue'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Companies Tab */}
      {activeTab === 'companies' && (
        <>
          <SearchForm
            fields={companySearchFields}
            onSearch={(v) => setCompanySearch(v.search || '')}
            onReset={() => setCompanySearch('')}
          />
          <DataTable columns={companyColumns} data={companies ?? []} rowKey="id" loading={loadingCompanies} showColumnSettings />
          <div className="mt-2 text-xs text-text-secondary">{(companies ?? []).length} companies</div>
        </>
      )}

      {/* Data Centers Tab */}
      {activeTab === 'dataCenters' && (
        <>
          <DataTable columns={dataCenterColumns} data={dataCenters ?? []} rowKey="id" loading={loadingDC} showColumnSettings />
          <div className="mt-2 text-xs text-text-secondary">{(dataCenters ?? []).length} data centers</div>
        </>
      )}

      {/* Data Classification Tab */}
      {activeTab === 'dataClassification' && (
        <>
          <DataTable columns={classificationColumns} data={classification ?? []} rowKey="id" loading={loadingClassification} showColumnSettings />
          <div className="mt-2 text-xs text-text-secondary">{(classification ?? []).length} classification items</div>
        </>
      )}

      {/* Legal Entities Tab */}
      {activeTab === 'legalEntities' && (
        <>
          <DataTable columns={legalEntityColumns} data={legalEntities ?? []} rowKey="id" loading={loadingLE} showColumnSettings />
          <div className="mt-2 text-xs text-text-secondary">{(legalEntities ?? []).length} legal entities</div>
        </>
      )}
    </div>
  );
}

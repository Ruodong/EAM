'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { SearchForm, SearchField } from '@/components/ui/SearchForm';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { X } from 'lucide-react';

/* ── types ── */

interface CmdbApp {
  appId: string;
  name: string;
  appFullName: string;
  shortDescription: string;
  status: string;
  appOwnership: string;
  ownedBy: string;
  appItOwner: string;
  appDtOwner: string;
  appOperationOwner: string;
  appOwnerTower: string;
  appOwnerDomain: string;
  appOperationOwnerTower: string;
  appOperationOwnerDomain: string;
  portfolioMgt: string;
  appClassification: string;
  appSolutionType: string;
  serviceArea: string;
  patchLevel: string;
  updateAt: string | null;
  decommissionedAt: string | null;
}

/* ── search config ── */

const searchFields: SearchField[] = [
  { key: 'appId', label: 'App ID', type: 'text', placeholder: 'Application ID' },
  { key: 'name', label: 'Name', type: 'text', placeholder: 'Name or Full Name' },
  {
    key: 'status', label: 'Status', type: 'select', placeholder: 'All Statuses',
    options: [
      { label: 'Active', value: 'Active' },
      { label: 'Decommissioned', value: 'Decommissioned' },
      { label: 'Planned', value: 'Planned' },
      { label: 'Retain', value: 'Retain' },
    ],
  },
  { key: 'ownerTower', label: 'Owner Tower', type: 'text', placeholder: 'Owner Tower' },
  { key: 'ownedBy', label: 'Owned By', type: 'text', placeholder: 'Owned By' },
  {
    key: 'portfolio', label: 'Portfolio', type: 'select', placeholder: 'All Portfolios',
    options: [
      { label: 'Invest', value: 'Invest' },
      { label: 'Migrate', value: 'Migrate' },
      { label: 'Retire', value: 'Retire' },
      { label: 'Tolerate', value: 'Tolerate' },
    ],
  },
];

/* ── helper ── */

function FieldRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="py-2 border-b border-gray-100 last:border-b-0">
      <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value || '-'}</p>
    </div>
  );
}

function formatDate(v: string | null) {
  if (!v) return '-';
  return new Date(v).toLocaleDateString('en-CA');
}

/* ── page ── */

export default function CmdbApplicationPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['cmdb', page, pageSize, filters],
    queryFn: () => api.get<any>('/cmdb', { page, pageSize, ...filters }),
  });

  const detail = data?.data?.find((r: CmdbApp) => r.appId === selectedId) as CmdbApp | undefined;

  const columns: Column<CmdbApp>[] = [
    {
      key: 'appId', title: 'App ID', sortable: true,
      render: (v) => <span className="text-primary-blue font-medium">{v}</span>,
    },
    { key: 'name', title: 'Name', sortable: true },
    { key: 'appFullName', title: 'Full Name', sortable: true },
    {
      key: 'status', title: 'Status', sortable: true,
      render: (v) => v ? <StatusBadge status={v} /> : '-',
    },
    { key: 'appOwnerTower', title: 'Owner Tower', sortable: true },
    { key: 'ownedBy', title: 'Owned By', sortable: true },
    { key: 'portfolioMgt', title: 'Portfolio', sortable: true },
    { key: 'appClassification', title: 'Classification', sortable: true },
  ];

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-4">Application Master Data</h1>

      <SearchForm
        fields={searchFields}
        onSearch={(v) => { setFilters(v); setPage(1); }}
        onReset={() => { setFilters({}); setPage(1); }}
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        rowKey="appId"
        loading={isLoading}
        showColumnSettings
        onRowClick={(row: CmdbApp) => setSelectedId(row.appId)}
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

      {/* Detail Drawer */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setSelectedId(null)} />
          <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-base font-semibold text-gray-900">
                {detail?.name || selectedId}
              </h2>
              <button onClick={() => setSelectedId(null)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {detail ? (
              <div className="px-6 py-4 space-y-6">
                {/* Basic Info */}
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-x-6">
                    <FieldRow label="App ID" value={detail.appId} />
                    <FieldRow label="Name" value={detail.name} />
                    <FieldRow label="Full Name" value={detail.appFullName} />
                    <FieldRow label="Status" value={detail.status} />
                    <FieldRow label="Classification" value={detail.appClassification} />
                    <FieldRow label="Solution Type" value={detail.appSolutionType} />
                    <FieldRow label="Portfolio" value={detail.portfolioMgt} />
                    <FieldRow label="Service Area" value={detail.serviceArea} />
                  </div>
                </section>

                {/* Ownership */}
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ownership</h3>
                  <div className="grid grid-cols-2 gap-x-6">
                    <FieldRow label="App Ownership" value={detail.appOwnership} />
                    <FieldRow label="Owned By" value={detail.ownedBy} />
                    <FieldRow label="IT Owner" value={detail.appItOwner} />
                    <FieldRow label="DT Owner" value={detail.appDtOwner} />
                    <FieldRow label="Operation Owner" value={detail.appOperationOwner} />
                    <FieldRow label="Owner Tower" value={detail.appOwnerTower} />
                    <FieldRow label="Owner Domain" value={detail.appOwnerDomain} />
                    <FieldRow label="Operation Owner Tower" value={detail.appOperationOwnerTower} />
                    <FieldRow label="Operation Owner Domain" value={detail.appOperationOwnerDomain} />
                  </div>
                </section>

                {/* Description & Other */}
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description &amp; Other</h3>
                  <FieldRow label="Short Description" value={detail.shortDescription} />
                  <div className="grid grid-cols-2 gap-x-6">
                    <FieldRow label="Patch Level" value={detail.patchLevel} />
                    <FieldRow label="Updated At" value={formatDate(detail.updateAt)} />
                    <FieldRow label="Decommissioned At" value={formatDate(detail.decommissionedAt)} />
                  </div>
                </section>
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-sm text-gray-400">Loading...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

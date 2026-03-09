'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { SearchForm, SearchField } from '@/components/ui/SearchForm';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { X, ArrowLeft, Plus, Trash2, ChevronRight } from 'lucide-react';

const searchFields: SearchField[] = [
  { key: 'appId', label: 'App ID', type: 'text', placeholder: 'Application ID' },
  { key: 'name', label: 'App Name', type: 'text', placeholder: 'Application name' },
  { key: 'domainL1', label: 'Domain L1', type: 'text', placeholder: 'Domain L1' },
  { key: 'subDomainL2', label: 'Sub Domain L2', type: 'text', placeholder: 'Sub Domain L2' },
  { key: 'bcName', label: 'BC Name', type: 'text', placeholder: 'BC Name' },
];

interface BcmRow {
  id: string;
  appId: string;
  appName: string;
  appItOwner: string;
  status: string;
  appOwnership: string;
  appSolutionOwner: string;
  portfolioMgt: string;
  appSolutionType: string;
  appClassification: string;
  businessFunction: string;
  bcId: string;
  bcName: string;
  domainL1: string;
  subDomainL2: string;
  capGroupL3: string;
  version: string;
  level: number;
}

interface BcItem {
  id: number;
  bcId: string;
  bcName: string;
  domainL1: string;
  subDomainL2: string;
  capGroupL3: string;
  version: string;
  level: number;
}

/* ── Cascader tree types & builder ── */
interface L2Node { label: string; items: BcItem[] }
interface L1Node { label: string; children: L2Node[] }

function buildTree(items: BcItem[]): L1Node[] {
  const map = new Map<string, Map<string, BcItem[]>>();
  for (const item of items) {
    if (item.level !== 3 || !item.domainL1) continue;
    if (!map.has(item.domainL1)) map.set(item.domainL1, new Map());
    const sub = map.get(item.domainL1)!;
    const l2 = item.subDomainL2 || '';
    if (!sub.has(l2)) sub.set(l2, []);
    sub.get(l2)!.push(item);
  }
  return Array.from(map.entries()).map(([l1, sub]) => ({
    label: l1,
    children: Array.from(sub.entries()).map(([l2, its]) => ({ label: l2, items: its })),
  }));
}

/* ── 3-level Cascader Select ── */
function BcCascaderSelect({
  tree,
  value,
  onSelect,
  disabled = false,
}: {
  tree: L1Node[];
  value: BcItem | null;
  onSelect: (item: BcItem) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [hovL1, setHovL1] = useState<string | null>(null);
  const [hovL2, setHovL2] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !panelRef.current?.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const toggle = () => {
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    }
    setOpen(v => !v);
  };

  const l1Data = tree.find(n => n.label === hovL1);
  const l2Data = l1Data?.children.find(n => n.label === hovL2);

  const label = value
    ? `${value.domainL1} / ${value.subDomainL2} / ${value.bcName}`
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={toggle}
        className={`flex items-center justify-between w-full border rounded px-3 py-1.5 text-sm text-left
          ${disabled
            ? 'bg-gray-100 cursor-not-allowed text-gray-400 border-gray-200'
            : open
              ? 'border-primary-blue ring-1 ring-primary-blue bg-white'
              : 'border-gray-300 bg-white hover:border-blue-400 cursor-pointer'
          }`}
      >
        <span className={`truncate ${label ? 'text-text-primary' : 'text-gray-400'}`}>
          {label || 'Please select'}
        </span>
        <ChevronRight className={`w-4 h-4 shrink-0 ml-2 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-lg shadow-2xl flex overflow-hidden"
        >
          {/* L1 */}
          <div className="w-52 border-r border-gray-100 overflow-y-auto max-h-72 py-1">
            <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100 mb-1">
              Domain (L1)
            </div>
            {tree.length === 0 && (
              <div className="px-3 py-4 text-xs text-center text-gray-400">No data</div>
            )}
            {tree.map(l1 => (
              <button
                key={l1.label}
                type="button"
                onMouseEnter={() => { setHovL1(l1.label); setHovL2(null); }}
                className={`w-full text-left flex items-center justify-between px-3 py-1.5 text-sm
                  ${hovL1 === l1.label ? 'bg-blue-50 text-primary-blue font-medium' : 'text-text-primary hover:bg-gray-50'}`}
              >
                <span className="truncate">{l1.label}</span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0 text-gray-300" />
              </button>
            ))}
          </div>

          {/* L2 */}
          <div className="w-52 border-r border-gray-100 overflow-y-auto max-h-72 py-1">
            <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100 mb-1">
              Sub Domain (L2)
            </div>
            {!l1Data ? (
              <div className="px-3 py-4 text-xs text-center text-gray-400">← Hover a domain</div>
            ) : l1Data.children.map(l2 => (
              <button
                key={l2.label}
                type="button"
                onMouseEnter={() => setHovL2(l2.label)}
                className={`w-full text-left flex items-center justify-between px-3 py-1.5 text-sm
                  ${hovL2 === l2.label ? 'bg-blue-50 text-primary-blue font-medium' : 'text-text-primary hover:bg-gray-50'}`}
              >
                <span className="truncate">{l2.label}</span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0 text-gray-300" />
              </button>
            ))}
          </div>

          {/* L3 */}
          <div className="w-72 overflow-y-auto max-h-72 py-1">
            <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100 mb-1">
              Capability (L3)
            </div>
            {!l2Data ? (
              <div className="px-3 py-4 text-xs text-center text-gray-400">← Hover a sub-domain</div>
            ) : l2Data.items.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => { onSelect(item); setOpen(false); setHovL1(null); setHovL2(null); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 group"
              >
                <span className="text-primary-blue font-medium mr-1.5 group-hover:underline">{item.bcId}</span>
                <span className="text-text-primary">{item.bcName}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ── Read-only field row ── */
function FieldRow({ label, value, required }: { label: string; value?: string | null; required?: boolean }) {
  return (
    <div className="flex items-center py-2.5">
      <span className="text-sm text-text-secondary w-48 shrink-0 text-right pr-3">
        {required && <span className="text-red-500 mr-0.5">*</span>}
        {label}
      </span>
      <div className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-1.5 text-sm text-text-primary min-h-[32px]">
        {value || ''}
      </div>
    </div>
  );
}

export default function BCMPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['bcm', page, pageSize, filters],
    queryFn: () => api.get<any>('/applications/bcm', { page, pageSize, ...filters }),
  });

  const { data: appDetail, refetch: refetchAppDetail } = useQuery({
    queryKey: ['bcm-app-detail', selectedApp],
    queryFn: () => api.get<any>('/applications/bcm', { page: 1, pageSize: 200, appId: selectedApp! }),
    enabled: !!selectedApp,
  });

  const allRows: BcmRow[] = data?.data ?? [];
  const appInfo = appDetail?.data?.[0] as BcmRow | undefined;
  const appMappings: BcmRow[] = appDetail?.data ?? [];

  const doDelete = useCallback(async (mappingId: string) => {
    setDeleting(mappingId);
    try {
      await api.delete(`/applications/bcm/${mappingId}`);
      refetchAppDetail();
      queryClient.invalidateQueries({ queryKey: ['bcm'] });
    } catch (e) {
      console.error('Failed to delete mapping', e);
    } finally {
      setDeleting(null);
      setConfirmDeleteId(null);
    }
  }, [refetchAppDetail, queryClient]);

  const handleAddSuccess = useCallback(() => {
    setShowAddModal(false);
    refetchAppDetail();
    queryClient.invalidateQueries({ queryKey: ['bcm'] });
  }, [refetchAppDetail, queryClient]);

  const columns: Column<BcmRow>[] = [
    {
      key: 'appId', title: 'App ID', sortable: true,
      render: (v: string) => (
        <button
          className="text-primary-blue font-medium hover:underline"
          onClick={(e) => { e.stopPropagation(); setSelectedApp(v); }}
        >
          {v}
        </button>
      ),
    },
    { key: 'appName', title: 'Application Name', sortable: true },
    { key: 'appItOwner', title: 'IT Owner', sortable: true },
    { key: 'status', title: 'Status', sortable: true, render: (v) => v ? <StatusBadge status={v} /> : '-' },
    { key: 'bcId', title: 'BC ID', sortable: true, render: (v) => <span className="text-primary-blue">{v}</span> },
    { key: 'bcName', title: 'BC Name', sortable: true },
    { key: 'domainL1', title: 'Domain L1', sortable: true },
    { key: 'subDomainL2', title: 'Sub Domain L2', sortable: true },
    { key: 'capGroupL3', title: 'Capability Group L3', sortable: true },
    { key: 'version', title: 'Version', sortable: true },
  ];

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-4">Business Capability Mapping</h1>

      <SearchForm
        fields={searchFields}
        onSearch={(v) => { setFilters(v); setPage(1); }}
        onReset={() => { setFilters({}); setPage(1); }}
      />

      <DataTable
        columns={columns}
        data={allRows}
        rowKey="id"
        loading={isLoading}
        showColumnSettings
        exportConfig={{ entity: 'bcm', params: filters }}
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

      {/* ── Application BCM Detail Drawer ── */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedApp(null)} />
          <div className="relative w-[850px] max-w-[90vw] bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedApp(null)} className="text-text-secondary hover:text-text-primary">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base font-semibold text-text-primary">Application Business Capability Mapping</h2>
              </div>
              <button onClick={() => setSelectedApp(null)} className="p-1 rounded hover:bg-gray-100 text-text-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-text-primary mb-3 pb-2 border-b border-gray-200">General Data</h3>
                <div className="grid grid-cols-2 gap-x-6">
                  <div>
                    <FieldRow label="Application ID" value={selectedApp} required />
                    <FieldRow label="Application Name" value={appInfo?.appName} />
                    <FieldRow label="Application Ownership" value={appInfo?.appOwnership} />
                    <FieldRow label="Solution Owner" value={appInfo?.appSolutionOwner} />
                    <FieldRow label="DT Owner" value={appInfo?.appItOwner} />
                  </div>
                  <div>
                    <FieldRow label="Portfolio Management" value={appInfo?.portfolioMgt} />
                    <FieldRow label="Solution Type" value={appInfo?.appSolutionType} />
                    <FieldRow label="Classification" value={appInfo?.appClassification} />
                    <FieldRow label="Function (Value Chain)" value={appInfo?.businessFunction} />
                    <FieldRow label="Application Status" value={appInfo?.status} />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-text-primary">Business Capability Mapping</h3>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-blue border border-primary-blue rounded hover:bg-blue-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-3 py-2 font-medium text-text-secondary">Versions</th>
                        <th className="text-left px-3 py-2 font-medium text-text-secondary">BC ID</th>
                        <th className="text-left px-3 py-2 font-medium text-text-secondary">Domain(L1)</th>
                        <th className="text-left px-3 py-2 font-medium text-text-secondary">Sub Domain(L2)</th>
                        <th className="text-left px-3 py-2 font-medium text-text-secondary">Capability Group(L3)</th>
                        <th className="text-left px-3 py-2 font-medium text-text-secondary">BC Name</th>
                        <th className="text-center px-3 py-2 font-medium text-text-secondary w-20">Operation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appMappings.map((m) => (
                        <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-3 py-2 text-text-primary">{m.version}</td>
                          <td className="px-3 py-2 text-primary-blue">{m.bcId}</td>
                          <td className="px-3 py-2 text-text-primary">{m.domainL1}</td>
                          <td className="px-3 py-2 text-text-primary">{m.subDomainL2}</td>
                          <td className="px-3 py-2 text-text-primary">{m.capGroupL3}</td>
                          <td className="px-3 py-2 text-text-primary">{m.bcName}</td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => setConfirmDeleteId(m.id)}
                              disabled={deleting === m.id}
                              className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {appMappings.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-3 py-8 text-center text-text-secondary">No data</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-end mt-2 text-xs text-text-secondary">
                  Total {appMappings.length} items
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedApp(null)}
                className="px-6 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 text-text-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add BCPF Master Data Modal ── */}
      {showAddModal && selectedApp && (
        <AddBcmModal
          appId={selectedApp}
          existingBcIds={appMappings.map((m) => m.bcId)}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
        />
      )}

      {/* ── Delete Confirmation Modal ── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative bg-white rounded-lg shadow-2xl w-[400px] p-6">
            <h3 className="text-base font-semibold text-text-primary mb-3">Confirm Delete</h3>
            <p className="text-sm text-text-secondary mb-5">Are you sure you want to delete this mapping?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => doDelete(confirmDeleteId)}
                disabled={!!deleting}
                className="px-4 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Add BCM Modal — cascader version (matches original system)
   ═══════════════════════════════════════════════ */
function AddBcmModal({
  appId,
  existingBcIds,
  onClose,
  onSuccess,
}: {
  appId: string;
  existingBcIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedVersion, setSelectedVersion] = useState('');
  const [selectedBc, setSelectedBc] = useState<BcItem | null>(null);
  const [stagedItems, setStagedItems] = useState<BcItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState('');

  const { data: versions = [] } = useQuery({
    queryKey: ['bcm-versions'],
    queryFn: () => api.get<string[]>('/applications/bcm/versions'),
  });

  const { data: bcItems = [], isLoading: loadingBc } = useQuery({
    queryKey: ['bcm-bc-tree', selectedVersion],
    queryFn: () => api.get<BcItem[]>('/applications/bcm/bc-tree', { version: selectedVersion }),
    enabled: !!selectedVersion,
  });

  // Build tree excluding already-mapped and already-staged items
  const tree = buildTree(
    bcItems.filter(
      (item) =>
        !existingBcIds.includes(item.bcId) &&
        !stagedItems.find((s) => s.id === item.id)
    )
  );

  const handleAdd = () => {
    if (!selectedBc) {
      setAddError('Please select a Business Capability');
      return;
    }
    setAddError('');
    setStagedItems((prev) => [...prev, selectedBc]);
    setSelectedBc(null);
  };

  const handleConfirm = async () => {
    if (stagedItems.length === 0) return;
    setSubmitting(true);
    try {
      await api.post('/applications/bcm', {
        appId,
        bcpfMasterIds: stagedItems.map((s) => s.id),
      });
      onSuccess();
    } catch (e) {
      console.error('Failed to add mappings', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-2xl w-[960px] max-w-[95vw] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="text-base font-semibold text-text-primary">BCPF Master Data</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Selection row: Version + Cascader + Add button */}
          <div className="flex items-end gap-3 mb-5">
            {/* Version */}
            <div className="shrink-0 w-36">
              <label className="block text-xs text-text-secondary mb-1">Version</label>
              <select
                value={selectedVersion}
                onChange={(e) => { setSelectedVersion(e.target.value); setSelectedBc(null); }}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue"
              >
                <option value="">-- Select --</option>
                {(versions as string[]).map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            {/* Cascader */}
            <div className="flex-1 min-w-0">
              <label className="block text-xs text-text-secondary mb-1">
                <span className="text-red-500 mr-0.5">*</span>
                Business Capability Master Data
                {loadingBc && <span className="ml-2 text-gray-400">Loading...</span>}
              </label>
              <BcCascaderSelect
                tree={tree}
                value={selectedBc}
                onSelect={(item) => { setSelectedBc(item); setAddError(''); }}
                disabled={!selectedVersion}
              />
              {addError && <p className="text-xs text-red-500 mt-1">{addError}</p>}
            </div>

            {/* Add button */}
            <div className="shrink-0">
              <button
                onClick={handleAdd}
                disabled={!selectedVersion}
                className="px-6 py-1.5 text-sm bg-primary-blue text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>

          {/* Staged items table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 text-xs font-medium text-text-secondary">Versions</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-text-secondary">BC ID</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-text-secondary">Domain(L1)</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-text-secondary">Sub Domain(L2)</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-text-secondary">Capability Group(L3)</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-text-secondary">BC Name</th>
                  <th className="text-center px-3 py-2 text-xs font-medium text-text-secondary w-20">Operation</th>
                </tr>
              </thead>
              <tbody>
                {stagedItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 text-text-primary">{item.version}</td>
                    <td className="px-3 py-2 text-primary-blue font-medium">{item.bcId}</td>
                    <td className="px-3 py-2 text-text-primary">{item.domainL1}</td>
                    <td className="px-3 py-2 text-text-primary">{item.subDomainL2}</td>
                    <td className="px-3 py-2 text-text-primary">{item.capGroupL3}</td>
                    <td className="px-3 py-2 text-text-primary">{item.bcName}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => setStagedItems((prev) => prev.filter((s) => s.id !== item.id))}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {stagedItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-text-secondary text-sm">
                      No items added yet. Select a version, choose a business capability, then click Add.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 text-text-primary"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={stagedItems.length === 0 || submitting}
            className="px-5 py-1.5 text-sm bg-primary-blue text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Adding...' : `Confirm (${stagedItems.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

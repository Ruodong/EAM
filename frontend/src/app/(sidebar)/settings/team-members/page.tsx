'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { SearchForm, SearchField } from '@/components/ui/SearchForm';
import { ResourceSearch } from '@/components/ui/ResourceSearch';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const searchFields: SearchField[] = [
  { key: 'itcode', label: 'IT Code', type: 'text', placeholder: 'IT Code' },
  { key: 'name', label: 'Name', type: 'text', placeholder: 'Name' },
];

export default function BigEATeamMembersPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [addValue, setAddValue] = useState('');
  const [addResource, setAddResource] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['teamMembers', page, pageSize, filters],
    queryFn: () => api.get<any>('/team-members', { page, pageSize, ...filters }),
  });

  const addMutation = useMutation({
    mutationFn: (body: any) => api.post('/team-members', body),
    onSuccess: () => {
      toast.success('Team member added successfully');
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      setShowAddModal(false);
      setAddValue('');
      setAddResource(null);
    },
    onError: () => toast.error('Failed to add team member'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/team-members/${id}`),
    onSuccess: () => {
      toast.success('Team member removed');
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to remove team member'),
  });

  const handleAdd = () => {
    if (!addResource) return;
    addMutation.mutate({
      itcode: addResource.itcode,
      name: addResource.name,
      email: addResource.email,
    });
  };

  const columns: Column<any>[] = [
    { key: 'itcode', title: 'IT Code', sortable: true, render: (v) => <span className="text-primary-blue font-medium">{v}</span> },
    { key: 'name', title: 'Name', sortable: true },
    { key: 'workerType', title: 'Type of Worker', sortable: true },
    { key: 'email', title: 'Email', sortable: true },
    { key: 'managerName', title: 'Manager', sortable: true },
    { key: 'country', title: 'Region', sortable: true },
    { key: 'location', title: 'Location', sortable: true },
    { key: 'operation', title: 'Operation', sortable: false, render: (_v, record) => (
      <div className="flex items-center gap-2">
        <button className="text-text-secondary hover:text-primary-blue"><Pencil className="w-3.5 h-3.5" /></button>
        <button
          onClick={(e) => { e.stopPropagation(); setDeleteTarget(record); }}
          className="text-text-secondary hover:text-red-500"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    )},
  ];

  return (
    <div className="p-6">
      <SearchForm
        fields={searchFields}
        onSearch={(v) => { setFilters(v); setPage(1); }}
        onReset={() => { setFilters({}); setPage(1); }}
      />

      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-base font-semibold text-text-primary">BigEA Members</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-blue border border-primary-blue rounded hover:bg-blue-50"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        rowKey="itcode"
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

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-base font-semibold text-text-primary mb-4">Add Team Member</h3>
            <label className="block text-sm text-text-secondary mb-1">Search for a person</label>
            <ResourceSearch
              value={addValue}
              onChange={(val, res) => { setAddValue(val); setAddResource(res ?? null); }}
              placeholder="Search by name or IT code..."
            />
            {addResource && (
              <div className="mt-3 p-3 bg-blue-50 rounded text-sm">
                <div><strong>{addResource.name}</strong> ({addResource.itcode})</div>
                <div className="text-text-secondary text-xs">{addResource.email}</div>
              </div>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowAddModal(false); setAddValue(''); setAddResource(null); }}
                className="px-4 py-2 text-sm border border-border-light rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!addResource || addMutation.isPending}
                className="btn-primary !px-4 !py-2 text-sm disabled:opacity-50"
              >
                {addMutation.isPending ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Remove Team Member"
        message={`Are you sure you want to remove ${deleteTarget?.name ?? 'this member'} from the BigEA team?`}
        confirmLabel="Remove"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/* ── Collapsible Section ── */
function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border-default rounded-lg mb-4 bg-white">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-semibold text-text-primary">{title}</span>
        <svg className={`w-4 h-4 text-text-secondary transition-transform ${open ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

/* ── Display Row (read-only) ── */
function GDRow({ label, value, bold }: { label: string; value?: string | null; bold?: boolean }) {
  return (
    <div className="flex py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-text-secondary w-44 shrink-0 text-right pr-3">{label}：</span>
      <span className={`text-sm text-text-primary ${bold ? 'font-semibold' : ''}`}>{value || '-'}</span>
    </div>
  );
}

/* ── Edit Row (editable) ── */
function EditRow({ label, value, onChange, type = 'text', options, bold }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: 'text' | 'select' | 'textarea' | 'date';
  options?: { label: string; value: string }[];
  bold?: boolean;
}) {
  return (
    <div className="flex items-start py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-text-secondary w-44 shrink-0 text-right pr-3 pt-2">{label}：</span>
      <div className="flex-1">
        {type === 'select' && options ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full border border-border-default rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue ${bold ? 'font-semibold' : ''}`}
          >
            <option value="">-</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue min-h-[80px]"
          />
        ) : type === 'date' ? (
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full border border-border-default rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue ${bold ? 'font-semibold' : ''}`}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full border border-border-default rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue ${bold ? 'font-semibold' : ''}`}
          />
        )}
      </div>
    </div>
  );
}

function fmtDate(v?: string | null) {
  if (!v) return '-';
  return new Date(v).toLocaleDateString();
}

function toDateInput(v?: string | null) {
  if (!v) return '';
  try { return new Date(v).toISOString().split('T')[0]; } catch { return ''; }
}

const priorityOptions = [
  { label: 'High', value: 'High' },
  { label: 'Medium', value: 'Medium' },
  { label: 'Low', value: 'Low' },
];

const typeOptions = [
  { label: 'Mandatory', value: 'Mandatory' },
  { label: 'Recommended', value: 'Recommended' },
  { label: 'Optional', value: 'Optional' },
];

const statusOptions = [
  { label: 'Open', value: 'Open' },
  { label: 'In Validation', value: 'In Validation' },
  { label: 'Closed', value: 'Closed' },
];

interface ActionFormData {
  title: string;
  type: string;
  applicableDomain: string;
  requestedBy: string;
  assigneeName: string;
  priority: string;
  dueDate: string;
  startDate: string;
  closeDate: string;
  status: string;
  actionDescription: string;
}

export default function ActionDetailPage() {
  const { actionId } = useParams<{ actionId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ActionFormData>({
    title: '', type: '', applicableDomain: '', requestedBy: '',
    assigneeName: '', priority: '', dueDate: '', startDate: '',
    closeDate: '', status: '', actionDescription: '',
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['action', actionId],
    queryFn: () => api.get<any>(`/actions/${actionId}`),
    enabled: !!actionId,
  });

  // Populate form when data loads
  useEffect(() => {
    if (data) {
      setFormData({
        title: data.title || '',
        type: data.type || '',
        applicableDomain: data.applicableDomain || '',
        requestedBy: data.requestedBy || '',
        assigneeName: data.assigneeName || '',
        priority: data.priority || '',
        dueDate: toDateInput(data.dueDate),
        startDate: toDateInput(data.startDate),
        closeDate: toDateInput(data.closeDate),
        status: data.status || '',
        actionDescription: data.actionDescription || '',
      });
    }
  }, [data]);

  const updateField = (key: keyof ActionFormData) => (value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (payload: ActionFormData) => api.put<any>(`/actions/${actionId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action', actionId] });
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  // Copy mutation
  const copyMutation = useMutation({
    mutationFn: () => api.post<any>('/actions', {
      ...data,
      id: undefined,
      actionId: undefined,
      title: `${data.title} (Copy)`,
      status: 'Open',
      closeDate: null,
    }),
    onSuccess: (newAction: any) => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      if (newAction?.actionId) {
        router.push(`/ea-review/actions/${newAction.actionId}`);
      } else {
        router.push('/ea-review/actions');
      }
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleCancel = () => {
    // Reset form to original data
    if (data) {
      setFormData({
        title: data.title || '',
        type: data.type || '',
        applicableDomain: data.applicableDomain || '',
        requestedBy: data.requestedBy || '',
        assigneeName: data.assigneeName || '',
        priority: data.priority || '',
        dueDate: toDateInput(data.dueDate),
        startDate: toDateInput(data.startDate),
        closeDate: toDateInput(data.closeDate),
        status: data.status || '',
        actionDescription: data.actionDescription || '',
      });
    }
    setIsEditing(false);
  };

  const handleCopy = () => {
    copyMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-40 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center py-12 text-text-secondary">
        <p>Action not found.</p>
        <button onClick={() => router.back()} className="mt-4 text-primary-blue hover:underline">Go Back</button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-text-secondary hover:text-text-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-text-primary">Action Detail</h1>
        </div>
        <button
          onClick={() => router.back()}
          className="px-4 py-1.5 text-sm border border-border-default rounded hover:bg-gray-50"
        >
          Close
        </button>
      </div>

      {/* Success toast */}
      {saveSuccess && (
        <div className="mb-4 px-4 py-2 bg-green-50 border border-green-200 rounded text-sm text-green-700 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Action updated successfully
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mb-4">
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-primary-blue text-white rounded hover:bg-blue-600 disabled:opacity-60"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm border border-border-default rounded hover:bg-gray-50 text-text-secondary"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-primary-blue text-white rounded hover:bg-blue-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Change
            </button>
            <button
              onClick={handleCopy}
              disabled={copyMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-status-in-progress text-white rounded hover:opacity-90 disabled:opacity-60"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              {copyMutation.isPending ? 'Copying...' : 'Copy'}
            </button>
            <button className="flex items-center gap-1.5 px-4 py-1.5 text-sm border border-border-default rounded text-text-secondary cursor-not-allowed opacity-60">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Delete
            </button>
          </>
        )}
      </div>

      {/* General Data */}
      <Section title="General Data">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
          <div>
            <GDRow label="Request Name" value={data.requestName} />
            <GDRow label="Project ID" value={data.projectId} />
          </div>
          <div>
            <GDRow label="Project Name" value={data.projectName} />
          </div>
        </div>
      </Section>

      {/* Action Detail */}
      <Section title={`Action - ${data.actionId}`}>
        {isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
            <div>
              <EditRow label="Action Title" value={formData.title} onChange={updateField('title')} />
              <EditRow label="Type" value={formData.type} onChange={updateField('type')} type="select" options={typeOptions} />
              <EditRow label="Applicable Domain" value={formData.applicableDomain} onChange={updateField('applicableDomain')} />
              <EditRow label="Requested By" value={formData.requestedBy} onChange={updateField('requestedBy')} />
              <EditRow label="Assignee(s)" value={formData.assigneeName} onChange={updateField('assigneeName')} />
            </div>
            <div>
              <EditRow label="Priority" value={formData.priority} onChange={updateField('priority')} type="select" options={priorityOptions} bold />
              <EditRow label="Due Date" value={formData.dueDate} onChange={updateField('dueDate')} type="date" />
              <EditRow label="Start Date" value={formData.startDate} onChange={updateField('startDate')} type="date" />
              <EditRow label="Close Date" value={formData.closeDate} onChange={updateField('closeDate')} type="date" />
              <EditRow label="Status" value={formData.status} onChange={updateField('status')} type="select" options={statusOptions} bold />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
            <div>
              <GDRow label="Action Title" value={data.title} />
              <GDRow label="Type" value={data.type} />
              <GDRow label="Applicable Domain" value={data.applicableDomain} />
              <GDRow label="Requested By" value={data.requestedBy} />
              <GDRow label="Assignee(s)" value={data.assigneeName} />
            </div>
            <div>
              <GDRow label="Priority" value={data.priority} bold />
              <GDRow label="Due Date" value={fmtDate(data.dueDate)} />
              <GDRow label="Start Date" value={fmtDate(data.startDate)} />
              <GDRow label="Close Date" value={fmtDate(data.closeDate)} />
              <GDRow label="Status" value={data.status} bold />
            </div>
          </div>
        )}
        {/* Action Description */}
        <div className="mt-4">
          {isEditing ? (
            <EditRow label="Action Description" value={formData.actionDescription} onChange={updateField('actionDescription')} type="textarea" />
          ) : (
            <div className="flex py-2">
              <span className="text-xs text-text-secondary w-44 shrink-0 text-right pr-3">Action Description：</span>
              <div className="flex-1 bg-gray-50 border border-border-default rounded p-3 text-sm text-text-primary min-h-[80px]">
                {data.actionDescription || data.title || '-'}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Action Update Comment */}
      <Section title="Action Update Comment">
        <p className="text-sm text-text-secondary mb-3">There are no comments yet on this Action.</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add a Comment ..."
            className="flex-1 border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue"
            readOnly
          />
          <button className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </Section>

      {/* Email Sending Log */}
      <Section title="Email Sending Log" defaultOpen={false}>
        <div className="text-center py-6 text-sm text-text-secondary">No email logs</div>
      </Section>

      {/* Audit Log */}
      <Section title="Audit Log" defaultOpen={false}>
        <div className="text-center py-6 text-sm text-text-secondary">No audit logs</div>
      </Section>
    </div>
  );
}

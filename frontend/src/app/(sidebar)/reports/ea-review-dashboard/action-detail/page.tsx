'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';

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
      <span className="text-xs text-text-secondary w-44 shrink-0 text-right pr-3">{label}:</span>
      <span className={`text-sm text-text-primary ${bold ? 'font-semibold' : ''}`}>{value || '-'}</span>
    </div>
  );
}

function fmtDate(v?: string | null) {
  if (!v) return '-';
  return new Date(v).toLocaleDateString();
}

export default function DashboardActionDetailPage() {
  const searchParams = useSearchParams();
  const actionNo = searchParams.get('actionNo');
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboardAction', actionNo],
    queryFn: () => api.get<any>(`/actions/${actionNo}`),
    enabled: !!actionNo,
  });

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
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-text-primary">Action Detail</h1>
          <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">Read Only</span>
        </div>
      </div>

      {/* General Data */}
      <Section title="General Data">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
          <div>
            <GDRow label="Action ID" value={String(data.actionId)} bold />
            <GDRow label="Request ID" value={data.requestId} />
            <GDRow label="Project ID" value={data.projectId} />
          </div>
          <div>
            <GDRow label="Meeting ID" value={data.meetingId ? String(data.meetingId) : null} />
            <GDRow label="Created By" value={data.createdBy} />
            <GDRow label="Created At" value={fmtDate(data.createdAt)} />
          </div>
        </div>
      </Section>

      {/* Action Detail */}
      <Section title={`Action - ${data.actionId}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
          <div>
            <GDRow label="Action Title" value={data.title || data.actionTitle} />
            <GDRow label="Type" value={data.type} />
            <GDRow label="Applicable Domain" value={data.applicableDomain} />
            <GDRow label="Requested By" value={data.requestedByName || data.requestedBy} />
            <GDRow label="Assignee(s)" value={Array.isArray(data.assigneeName) ? data.assigneeName.join(', ') : data.assigneeName} />
          </div>
          <div>
            <GDRow label="Priority" value={data.priority} bold />
            <GDRow label="Due Date" value={fmtDate(data.dueDate)} />
            <GDRow label="Start Date" value={fmtDate(data.startDate)} />
            <GDRow label="Close Date" value={fmtDate(data.closeDate)} />
            <GDRow label="Status" value={data.status} bold />
          </div>
        </div>
        {/* Action Description */}
        <div className="mt-4">
          <div className="flex py-2">
            <span className="text-xs text-text-secondary w-44 shrink-0 text-right pr-3">Action Description:</span>
            <div className="flex-1 bg-gray-50 border border-border-default rounded p-3 text-sm text-text-primary min-h-[80px] whitespace-pre-wrap">
              {data.actionDescription || data.title || '-'}
            </div>
          </div>
        </div>
      </Section>

      {/* Action Update Comment */}
      <Section title="Action Update Comment" defaultOpen={!!data.actionUpdates}>
        {data.actionUpdates ? (
          <div className="bg-gray-50 border border-border-default rounded p-4 text-sm text-text-primary whitespace-pre-wrap">
            {typeof data.actionUpdates === 'string' ? data.actionUpdates : JSON.stringify(data.actionUpdates, null, 2)}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">There are no comments yet on this Action.</p>
        )}
      </Section>

      {/* Audit Log */}
      <Section title="Audit Log" defaultOpen={false}>
        <div className="text-center py-6 text-sm text-text-secondary">No audit logs</div>
      </Section>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable, Column } from '@/components/ui/DataTable';

/* ── Collapsible Section ── */
function Section({ title, defaultOpen = true, badge, children }: {
  title: string; defaultOpen?: boolean; badge?: number; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border-default rounded-lg mb-4 bg-white">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary">{title}</span>
          {badge !== undefined && badge > 0 && (
            <span className="bg-primary-blue text-white text-xs rounded-full px-2 py-0.5">{badge}</span>
          )}
        </div>
        <svg className={`w-4 h-4 text-text-secondary transition-transform ${open ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

/* ── Display Row ── */
function GDRow({ label, value, bold, link }: { label: string; value?: string | null; bold?: boolean; link?: boolean }) {
  return (
    <div className="flex py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-text-secondary w-44 shrink-0 text-right pr-3">{label}:</span>
      {link && value ? (
        <a href={value} target="_blank" rel="noreferrer" className="text-sm text-primary-blue hover:underline break-all">{value}</a>
      ) : (
        <span className={`text-sm text-text-primary ${bold ? 'font-semibold' : ''}`}>{value || '-'}</span>
      )}
    </div>
  );
}

function fmtDateTime(v?: string | null) {
  if (!v) return '-';
  return new Date(v).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function fmtDate(v?: string | null) {
  if (!v) return '-';
  return new Date(v).toLocaleDateString();
}

export default function MeetingDetailPage() {
  const { meetingNo } = useParams<{ meetingNo: string }>();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['meeting', meetingNo],
    queryFn: () => api.get<any>(`/meetings/${meetingNo}`),
    enabled: !!meetingNo,
  });

  // Fetch meeting decks
  const { data: decks = [] } = useQuery({
    queryKey: ['meetingDecks', data?.id],
    queryFn: () => api.get<any[]>('/meeting-decks', { meetingId: data?.id }),
    enabled: !!data?.id,
  });

  // Fetch related actions for this meeting's request
  const { data: actionsData } = useQuery({
    queryKey: ['meetingActions', data?.requestName],
    queryFn: () => api.get<any>('/actions', { requestId: data?.requestName?.split(' - ')[0], page: 1, pageSize: 50 }),
    enabled: !!data?.requestName,
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
        <p>Meeting not found.</p>
        <button onClick={() => router.back()} className="mt-4 text-primary-blue hover:underline">Go Back</button>
      </div>
    );
  }

  const deckColumns: Column<any>[] = [
    { key: 'no', title: 'No.', render: (_v, _r, i) => (i ?? 0) + 1 },
    { key: 'fileName', title: 'File Name', render: (v) => <span className="text-primary-blue">{v || '-'}</span> },
    { key: 'uploadBy', title: 'Uploaded By' },
    { key: 'uploadAt', title: 'Uploaded At', render: (v) => fmtDateTime(v) },
  ];

  const actionColumns: Column<any>[] = [
    { key: 'actionId', title: 'Action ID', render: (v) => (
      <button onClick={() => router.push(`/ea-review/actions/${v}`)} className="text-primary-blue hover:underline">{v}</button>
    )},
    { key: 'title', title: 'Action Title' },
    { key: 'type', title: 'Type' },
    { key: 'priority', title: 'Priority' },
    { key: 'assigneeName', title: 'Assignee' },
    { key: 'status', title: 'Status', render: (v) => <StatusBadge status={v} /> },
    { key: 'dueDate', title: 'Due Date', render: (v) => fmtDate(v) },
  ];

  // Parse attendees if it's a string
  const attendeesList = (() => {
    if (!data.attendees) return [];
    if (Array.isArray(data.attendees)) return data.attendees;
    if (typeof data.attendees === 'string') return data.attendees.split(',').map((s: string) => s.trim()).filter(Boolean);
    return [];
  })();

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
          <h1 className="text-lg font-semibold text-text-primary">Meeting Detail</h1>
          {data.meetingStatus && <StatusBadge status={data.meetingStatus} />}
        </div>
        <button
          onClick={() => router.back()}
          className="px-4 py-1.5 text-sm border border-border-default rounded hover:bg-gray-50"
        >
          Close
        </button>
      </div>

      {/* General Data */}
      <Section title="General Data">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
          <div>
            <GDRow label="Meeting No" value={String(data.meetingNo)} bold />
            <GDRow label="Request Name" value={data.requestName} />
            <GDRow label="Project ID" value={data.projectId} />
            <GDRow label="Project Name" value={data.projectName} />
          </div>
          <div>
            <GDRow label="Meeting Title" value={data.title} bold />
            <GDRow label="Meeting Agent" value={data.meetingAgent} />
            <GDRow label="Meeting Status" value={data.meetingStatus} bold />
            <GDRow label="Created By" value={data.createdBy} />
            <GDRow label="Created At" value={fmtDateTime(data.createdAt)} />
          </div>
        </div>
      </Section>

      {/* Meeting Time */}
      <Section title="Meeting Time">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
          <div>
            <GDRow label="Start Time" value={fmtDateTime(data.startTime)} />
          </div>
          <div>
            <GDRow label="End Time" value={fmtDateTime(data.endTime)} />
          </div>
        </div>
      </Section>

      {/* Attendees */}
      <Section title="Attendees" badge={attendeesList.length}>
        {data.presenters && <GDRow label="Presenter(s)" value={data.presenters} bold />}
        {attendeesList.length > 0 ? (
          <div className="mt-2">
            <GDRow label="Attendees" value={attendeesList.join(', ')} />
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-text-secondary">No attendees listed</div>
        )}
        {data.emailCC && <GDRow label="Email CC" value={data.emailCC} />}
      </Section>

      {/* Meeting Agenda */}
      <Section title="Meeting Agenda" defaultOpen={!!data.meetingAgenda}>
        {data.meetingAgenda ? (
          <div className="bg-gray-50 border border-border-default rounded p-4 text-sm text-text-primary whitespace-pre-wrap">
            {data.meetingAgenda}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-text-secondary">No meeting agenda</div>
        )}
      </Section>

      {/* Key Agreements & Findings */}
      <Section title="Key Agreements & Findings" defaultOpen={!!data.keyAgreementFindings}>
        {data.keyAgreementFindings ? (
          <div className="bg-gray-50 border border-border-default rounded p-4 text-sm text-text-primary whitespace-pre-wrap">
            {data.keyAgreementFindings}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-text-secondary">No findings recorded</div>
        )}
      </Section>

      {/* Review Decks */}
      <Section title="Review Decks" defaultOpen={decks.length > 0} badge={decks.length}>
        {decks.length > 0 ? (
          <DataTable columns={deckColumns} data={decks} rowKey="id" />
        ) : (
          <div className="text-center py-6 text-sm text-text-secondary">No review decks uploaded</div>
        )}
      </Section>

      {/* Review Recording */}
      <Section title="Review Recording" defaultOpen={!!data.reviewRecording}>
        {data.reviewRecording ? (
          <GDRow label="Recording Link" value={data.reviewRecording} link />
        ) : (
          <div className="text-center py-6 text-sm text-text-secondary">No recording available</div>
        )}
      </Section>

      {/* EA Review Result */}
      <Section title="EA Review Result" defaultOpen={!!data.eaReviewResult}>
        {data.eaReviewResult ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
            <GDRow label="EA Review Result" value={data.eaReviewResult} bold />
            <GDRow label="EA Review Remark" value={data.eaReviewRemark} />
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-text-secondary">No review result yet</div>
        )}
      </Section>

      {/* Actions from this meeting */}
      <Section title="Actions" defaultOpen={false} badge={actionsData?.data?.length}>
        {actionsData?.data && actionsData.data.length > 0 ? (
          <DataTable columns={actionColumns} data={actionsData.data} rowKey="id" />
        ) : (
          <div className="text-center py-6 text-sm text-text-secondary">No actions linked to this meeting</div>
        )}
      </Section>

      {/* Audit Log */}
      <Section title="Audit Log" defaultOpen={false}>
        <div className="text-center py-6 text-sm text-text-secondary">No audit logs</div>
      </Section>
    </div>
  );
}

'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { ArrowLeft, FileSearch } from 'lucide-react';

/* ── Status Stepper ── */
const STEPS = ['Draft', 'Submitted', 'In Progress', 'Completed'] as const;

function StatusStepper({ currentStatus }: { currentStatus: string }) {
  const idx = STEPS.indexOf(currentStatus as any);
  const activeIdx = idx === -1 ? 0 : idx;
  return (
    <div className="flex items-center justify-between px-8 py-6">
      {STEPS.map((step, i) => {
        const done = i <= activeIdx;
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {done ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-sm font-medium">{i + 1}</span>
                )}
              </div>
              <span className={`text-xs ${done ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>{step}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 mt-[-1.5rem] ${i < activeIdx ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatusMessage({ status }: { status: string }) {
  const messages: Record<string, { text: string; color: string }> = {
    Draft: { text: 'Request is in Draft.', color: 'text-gray-500' },
    Submitted: { text: 'Waiting for EA to Accept Your Request.', color: 'text-status-in-progress' },
    'In Progress': { text: 'EA Review is In Progress.', color: 'text-primary-blue' },
    Completed: { text: 'EA Review is Completed.', color: 'text-status-completed' },
    'Accepted by EA': { text: 'EA Review is In Progress.', color: 'text-primary-blue' },
  };
  const msg = messages[status] || { text: `Status: ${status}`, color: 'text-text-secondary' };
  return <p className={`text-sm ${msg.color} mb-3`}>{msg.text}</p>;
}

function Section({ title, defaultOpen = true, badge, children }: {
  title: string; defaultOpen?: boolean; badge?: number; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border-default rounded-lg mb-4 bg-white">
      <button className="w-full flex items-center justify-between px-4 py-3 text-left" onClick={() => setOpen(!open)}>
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

function fmtDate(v?: string | null) {
  if (!v) return '-';
  return new Date(v).toLocaleDateString();
}
function fmtDateTime(v?: string | null) {
  if (!v) return '-';
  return new Date(v).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/* ── AI Detail Drawer ── */
function AiDetailDrawer({ detail, onClose }: { detail: any; onClose: () => void }) {
  if (!detail) return null;
  const oe = detail.overall_evaluation;
  const items = detail.evaluation_items || [];
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={onClose}>
      <div className="bg-white w-full max-w-xl shadow-xl overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-border-default px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-text-primary">AI Evaluation Detail</span>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-4">
          {oe && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-text-primary">Overall Score:</span>
                <span className={`text-lg font-bold ${Number(oe.score) >= 7 ? 'text-green-600' : Number(oe.score) >= 4 ? 'text-yellow-600' : 'text-red-600'}`}>{oe.score}</span>
              </div>
              <p className="text-xs text-text-secondary">{oe.summary}</p>
            </div>
          )}
          {items.map((item: any, idx: number) => (
            <div key={idx} className="border border-border-default rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-text-primary">{item.name}</span>
                <span className={`text-sm font-bold ${Number(item.score) >= 7 ? 'text-green-600' : Number(item.score) >= 4 ? 'text-yellow-600' : 'text-red-600'}`}>{item.score}</span>
              </div>
              <p className="text-xs text-text-secondary">{item.evaluation}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardRequestDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [meetingPage, setMeetingPage] = useState(1);
  const [actionPage, setActionPage] = useState(1);
  const [aiDetail, setAiDetail] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['eaRequest', id],
    queryFn: () => api.get<any>(`/ea-requests/${id}`),
    enabled: !!id,
  });

  const { data: processLogs = [] } = useQuery({
    queryKey: ['processLogs', id],
    queryFn: () => api.get<any[]>('/process-logs', { requestId: id }),
    enabled: !!id,
  });

  const { data: scopeOfChange = [] } = useQuery({
    queryKey: ['scopeOfChange', id],
    queryFn: () => api.get<any[]>('/scope-of-change', { requestId: id }),
    enabled: !!id,
  });

  const { data: scopeCheckList = [] } = useQuery({
    queryKey: ['scopeCheckList', id],
    queryFn: () => api.get<any[]>('/scope-check-list', { requestId: id }),
    enabled: !!id,
  });

  const { data: meetings } = useQuery({
    queryKey: ['requestMeetings', id, meetingPage],
    queryFn: () => api.get<any>('/meetings', { requestId: id, page: meetingPage, pageSize: 10 }),
    enabled: !!id,
  });

  const { data: actions } = useQuery({
    queryKey: ['requestActions', id, actionPage],
    queryFn: () => api.get<any>('/actions', { requestId: id, page: actionPage, pageSize: 10 }),
    enabled: !!id,
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
        <p>Request not found.</p>
        <button onClick={() => router.back()} className="mt-4 text-primary-blue hover:underline">Go Back</button>
      </div>
    );
  }

  const logColumns: Column<any>[] = [
    { key: 'operator', title: 'User' },
    { key: 'action', title: 'Action' },
    { key: 'createdAt', title: 'Time', render: (v) => fmtDateTime(v) },
    { key: 'comment', title: 'Comment' },
  ];

  const diagramColumns: Column<any>[] = [
    { key: 'no', title: 'No.', render: (_v, _r, i) => (i ?? 0) + 1 },
    { key: 'aiScore', title: 'AI Evaluation Score', render: (v, row) => {
      if (v == null) return '-';
      const n = Number(v);
      const color = n >= 7 ? 'text-green-600' : n >= 4 ? 'text-yellow-600' : 'text-red-600';
      return (
        <div className="flex items-center gap-1.5">
          {row.aiResult && (
            <button onClick={() => setAiDetail(row.aiResult)} className="text-primary-blue hover:text-blue-700" title="View AI evaluation detail">
              <FileSearch className="w-4 h-4" />
            </button>
          )}
          <span className={`${color} font-bold`}>{v}</span>
        </div>
      );
    }},
    { key: 'fileName', title: 'File Name', render: (v, row) => v ? (
      <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/ea-requests/attachments/${row.id}/download`} target="_blank" rel="noopener noreferrer" className="text-primary-blue hover:underline">{v}</a>
    ) : '-' },
    { key: 'evaluatedAt', title: 'Evaluated At', render: (v) => fmtDateTime(v) },
    { key: 'uploadBy', title: 'Upload By' },
  ];

  const meetingColumns: Column<any>[] = [
    { key: 'meetingNo', title: 'Meeting ID', sortable: true },
    { key: 'requestName', title: 'Request ID', sortable: true },
    { key: 'title', title: 'Meeting Title', sortable: true },
    { key: 'startTime', title: 'Start Time', sortable: true, render: (v) => fmtDateTime(v) },
    { key: 'endTime', title: 'End Time', sortable: true, render: (v) => fmtDateTime(v) },
    { key: 'projectName', title: 'Project', sortable: true },
    { key: 'createdBy', title: 'Created By' },
  ];

  const actionColumns: Column<any>[] = [
    { key: 'actionId', title: 'Action ID', sortable: true },
    { key: 'requestName', title: 'Request ID', sortable: true },
    { key: 'title', title: 'Action Title', sortable: true },
    { key: 'type', title: 'Type', sortable: true },
    { key: 'priority', title: 'Priority', sortable: true },
    { key: 'startDate', title: 'Start Date', sortable: true, render: (v) => fmtDate(v) },
    { key: 'status', title: 'Status', sortable: true, render: (v) => <StatusBadge status={v} /> },
  ];

  const scopeOfChangeColumns: Column<any>[] = [
    { key: 'scopeNo', title: 'No.', sortable: true },
    { key: 'title', title: 'Title', sortable: true, render: (v) => <span className="text-primary-blue font-medium">{v}</span> },
    { key: 'description', title: 'Description', sortable: true },
    { key: 'sample', title: 'Sample' },
  ];

  const scopeCheckColumns: Column<any>[] = [
    { key: 'checklistNo', title: 'No.' },
    { key: 'category', title: 'Category', sortable: true },
    { key: 'subCategory', title: 'Sub-Category', sortable: true },
    { key: 'questions', title: 'Questions' },
    { key: 'answer', title: 'Answer', render: (v) => {
      if (!v) return '-';
      const color = v === 'Yes' ? 'text-green-600' : v === 'No' ? 'text-red-500' : 'text-text-primary';
      return <span className={`font-medium ${color}`}>{v}</span>;
    }},
    { key: 'comment', title: 'Comment' },
  ];

  return (
    <div className="p-6">
      {/* Header — read-only, no action buttons */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-blue transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-lg font-semibold text-text-primary">EA Review Request Details</h1>
        <StatusBadge status={data.status} />
        <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-0.5">Read Only</span>
      </div>

      {/* Processing Log */}
      <Section title="Processing Log" badge={processLogs.length}>
        <StatusStepper currentStatus={data.status} />
        <StatusMessage status={data.status} />
        {processLogs.length > 0 ? (
          <DataTable columns={logColumns} data={processLogs} rowKey="id" />
        ) : (
          <div className="text-center py-4 text-sm text-text-secondary">No process log entries</div>
        )}
      </Section>

      {/* General Data */}
      <Section title="General Data">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
          <div>
            <GDRow label="Request ID" value={data.requestId} bold />
            <GDRow label="Project ID" value={data.projectId} />
            <GDRow label="Project Name" value={data.projectName} />
            <GDRow label="Review Scope" value={data.scope} />
            <GDRow label="WS Name / Phase Name" value={data.wsPhase} />
            <GDRow label="Request Status" value={data.status} bold />
            <GDRow label="Confluence Page (Link)" value={data.link} link />
          </div>
          <div>
            <GDRow label="EA Review Result" value={data.reviewResult} bold />
            <GDRow label="PM" value={data.pmName} />
            <GDRow label="DT Lead" value={data.dtLeadName} />
            <GDRow label="Requestor" value={data.requestorName} />
            <GDRow label="Organization" value={data.organization} />
            <GDRow label="Assigned Reviewer" value={data.reviewerName} />
            <GDRow label="Description" value={data.requestDesc} />
          </div>
        </div>
      </Section>

      {/* Attachments */}
      <Section title="Attachments" defaultOpen={false} badge={data.attachments?.length}>
        {data.attachments && data.attachments.length > 0 ? (
          <DataTable
            columns={[
              { key: 'no', title: 'No.', render: (_v: any, _r: any, i: any) => (i ?? 0) + 1 },
              { key: 'fileName', title: 'File Name', render: (v: any, row: any) => v ? (
                <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/ea-requests/attachments/${row.id}/download`} target="_blank" rel="noopener noreferrer" className="text-primary-blue hover:underline">{v}</a>
              ) : '-' },
              { key: 'uploadBy', title: 'Upload By' },
              { key: 'createdAt', title: 'Upload Time', render: (v: any) => fmtDateTime(v) },
            ] as Column<any>[]}
            data={data.attachments}
            rowKey="id"
          />
        ) : (
          <div className="text-center py-4 text-sm text-text-secondary">No attachments</div>
        )}
      </Section>

      {/* Application Architecture Diagram */}
      <Section title="Application Architecture Diagram">
        <DataTable columns={diagramColumns} data={data.appDiagrams ?? []} rowKey="id" />
        {(!data.appDiagrams || data.appDiagrams.length === 0) && (
          <div className="text-center py-4 text-sm text-text-secondary">No diagrams uploaded</div>
        )}
      </Section>

      {/* Technical Architecture Diagram */}
      <Section title="Technical Architecture Diagram">
        <DataTable columns={diagramColumns} data={data.techDiagrams ?? []} rowKey="id" />
        {(!data.techDiagrams || data.techDiagrams.length === 0) && (
          <div className="text-center py-4 text-sm text-text-secondary">No diagrams uploaded</div>
        )}
      </Section>

      {/* Scope of Change */}
      <Section title="Scope of Change" defaultOpen={scopeOfChange.length > 0} badge={scopeOfChange.length}>
        {scopeOfChange.length > 0 ? (
          <DataTable columns={scopeOfChangeColumns} data={scopeOfChange} rowKey="id" />
        ) : (
          <div className="text-center py-6 text-sm text-text-secondary">No scope of change items for this request</div>
        )}
      </Section>

      {/* Scope Check List */}
      <Section title="Project Scope Check List" defaultOpen={scopeCheckList.length > 0} badge={scopeCheckList.length}>
        {scopeCheckList.length > 0 ? (
          <DataTable columns={scopeCheckColumns} data={scopeCheckList} rowKey="id" />
        ) : (
          <div className="text-center py-6 text-sm text-text-secondary">No checklist items for this request</div>
        )}
      </Section>

      {/* Meetings — read only, no Create button */}
      <Section title="Meetings" badge={meetings?.total}>
        <DataTable columns={meetingColumns} data={meetings?.data ?? []} rowKey="id" />
        {meetings && meetings.total > 0 && (
          <Pagination currentPage={meetingPage} totalPages={meetings.totalPages || 1} totalItems={meetings.total || 0} pageSize={10} onPageChange={setMeetingPage} onPageSizeChange={() => {}} />
        )}
        {(!meetings || meetings.total === 0) && (
          <div className="text-center py-4 text-sm text-text-secondary">No meetings scheduled</div>
        )}
      </Section>

      {/* Actions — read only, no Add button */}
      <Section title="Actions" badge={actions?.total}>
        <DataTable columns={actionColumns} data={actions?.data ?? []} rowKey="id" />
        {actions && actions.total > 0 && (
          <Pagination currentPage={actionPage} totalPages={actions.totalPages || 1} totalItems={actions.total || 0} pageSize={10} onPageChange={setActionPage} onPageSizeChange={() => {}} />
        )}
        {(!actions || actions.total === 0) && (
          <div className="text-center py-4 text-sm text-text-secondary">No actions</div>
        )}
      </Section>

      {/* EA Summary */}
      <Section title="EA Summary" defaultOpen={!!data.reviewResult}>
        {data.reviewResult ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
            <GDRow label="EA Review Result" value={data.reviewResult} bold />
            <GDRow label="Status Remark" value={data.statusRemark} />
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-text-secondary">No summary data yet</div>
        )}
      </Section>

      {/* AI Detail Drawer */}
      {aiDetail && <AiDetailDrawer detail={aiDetail} onClose={() => setAiDetail(null)} />}
    </div>
  );
}

export default function DashboardRequestDetailPage() {
  return (
    <Suspense fallback={<div className="p-6"><div className="animate-pulse space-y-4"><div className="h-6 bg-gray-200 rounded w-1/3" /><div className="h-40 bg-gray-200 rounded" /></div></div>}>
      <DashboardRequestDetailContent />
    </Suspense>
  );
}

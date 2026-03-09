'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { Plus, FileSearch } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';

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

/* ── Status Message ── */
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

/* ── Collapsible Section ── */
function Section({ title, defaultOpen = true, action, badge, children }: {
  title: string; defaultOpen?: boolean; action?: React.ReactNode; badge?: number; children: React.ReactNode;
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
          {action && <span onClick={(e) => e.stopPropagation()}>{action}</span>}
        </div>
        <svg className={`w-4 h-4 text-text-secondary transition-transform ${open ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

/* ── General Data Row ── */
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

/* ── Modal ── */
function Modal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
          <span className="text-sm font-semibold text-text-primary">{title}</span>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/* ── Form Field ── */
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start py-2">
      <span className="text-xs text-text-secondary w-32 shrink-0 text-right pr-3 pt-2">{label}:</span>
      <div className="flex-1">{children}</div>
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

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [meetingPage, setMeetingPage] = useState(1);
  const [actionPage, setActionPage] = useState(1);
  const [showAddAction, setShowAddAction] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState<'accept' | 'return' | null>(null);
  const [aiDetail, setAiDetail] = useState<any>(null);
  const [statusRemark, setStatusRemark] = useState('');
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  const [reviewerSearch, setReviewerSearch] = useState('');
  const [reviewerDropdownOpen, setReviewerDropdownOpen] = useState(false);
  const [actionForm, setActionForm] = useState({ title: '', type: 'Mandatory', priority: 'Medium', assigneeName: '', dueDate: '', actionDescription: '' });
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['eaRequest', id],
    queryFn: () => api.get<any>(`/ea-requests/${id}`),
    enabled: !!id,
  });

  // Team members for reviewer combobox
  const { data: teamMembers } = useQuery({
    queryKey: ['teamMembers', reviewerSearch],
    queryFn: () => api.get<any>('/team-members', {
      itcode: reviewerSearch || undefined,
      pageSize: 100,
    }),
    enabled: showStatusModal === 'accept',
  });

  // Process log for this request
  const { data: processLogs = [] } = useQuery({
    queryKey: ['processLogs', id],
    queryFn: () => api.get<any[]>('/process-logs', { requestId: id }),
    enabled: !!id,
  });

  // Scope of Change
  const { data: scopeOfChange = [] } = useQuery({
    queryKey: ['scopeOfChange', id],
    queryFn: () => api.get<any[]>('/scope-of-change', { requestId: id }),
    enabled: !!id,
  });

  // Scope Check List
  const { data: scopeCheckList = [] } = useQuery({
    queryKey: ['scopeCheckList', id],
    queryFn: () => api.get<any[]>('/scope-check-list', { requestId: id }),
    enabled: !!id,
  });

  // Related meetings
  const { data: meetings } = useQuery({
    queryKey: ['requestMeetings', id, meetingPage],
    queryFn: () => api.get<any>('/meetings', { requestId: id, page: meetingPage, pageSize: 10 }),
    enabled: !!id,
  });

  // Related actions
  const { data: actions } = useQuery({
    queryKey: ['requestActions', id, actionPage],
    queryFn: () => api.get<any>('/actions', { requestId: id, page: actionPage, pageSize: 10 }),
    enabled: !!id,
  });

  // Status update mutation
  const updateStatus = useMutation({
    mutationFn: (payload: { status: string; statusRemark?: string; assignReviewer?: string[] }) =>
      api.put<any>(`/ea-requests/${id}`, { ...payload, updatedBy: 'System' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eaRequest', id] });
      queryClient.invalidateQueries({ queryKey: ['processLogs', id] });
      const wasAccept = showStatusModal === 'accept';
      setShowStatusModal(null);
      setStatusRemark('');
      setSelectedReviewers([]);
      setReviewerSearch('');
      showToast('success', wasAccept ? 'Request accepted successfully' : 'Request returned successfully');
    },
    onError: () => {
      showToast('error', 'Failed to update request status');
    },
  });

  // Create action mutation
  const createAction = useMutation({
    mutationFn: (payload: any) => api.post<any>('/actions', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requestActions', id] });
      setShowAddAction(false);
      setActionForm({ title: '', type: 'Mandatory', priority: 'Medium', assigneeName: '', dueDate: '', actionDescription: '' });
      showToast('success', 'Action created successfully');
    },
  });

  const handleAccept = () => {
    if (selectedReviewers.length === 0) {
      showToast('error', 'Assign Reviewer is mandatory');
      return;
    }
    updateStatus.mutate({ status: 'Accepted by EA', statusRemark, assignReviewer: selectedReviewers });
  };

  const handleReturn = () => {
    updateStatus.mutate({ status: 'Draft', statusRemark });
  };

  const handleAddAction = () => {
    createAction.mutate({
      title: actionForm.title,
      requestName: data?.requestId || '',
      projectId: data?.projectId || '',
      projectName: data?.projectName || '',
      type: actionForm.type,
      priority: actionForm.priority,
      assigneeName: actionForm.assigneeName,
      dueDate: actionForm.dueDate || null,
      actionDescription: actionForm.actionDescription,
      status: 'Open',
    });
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
    { key: 'meetingNo', title: 'Meeting ID', sortable: true, render: (v) => (
      <button onClick={() => router.push(`/ea-review/meetings/${v}`)} className="text-primary-blue hover:underline">{v}</button>
    )},
    { key: 'requestName', title: 'Request ID', sortable: true },
    { key: 'title', title: 'Meeting Title', sortable: true },
    { key: 'startTime', title: 'Start Time', sortable: true, render: (v) => fmtDateTime(v) },
    { key: 'endTime', title: 'End Time', sortable: true, render: (v) => fmtDateTime(v) },
    { key: 'projectName', title: 'Project', sortable: true },
    { key: 'createdBy', title: 'Created By' },
  ];

  const actionColumns: Column<any>[] = [
    { key: 'actionId', title: 'Action ID', sortable: true, render: (v) => (
      <button onClick={() => router.push(`/ea-review/actions/${v}`)} className="text-primary-blue hover:underline">{v}</button>
    )},
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

  const canAccept = data.status === 'Submitted';

  return (
    <div className="p-6">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {toast.type === 'success' ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
          </svg>
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-text-secondary hover:text-text-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-text-primary">EA Review Request Details</h1>
          <StatusBadge status={data.status} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              // Pre-populate with existing assigned reviewers
              if (data.reviewerName) {
                setSelectedReviewers(data.reviewerName.split(', ').filter(Boolean));
              }
              setShowStatusModal('accept');
            }}
            className={`px-4 py-1.5 text-sm rounded text-white ${canAccept ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'}`}
            disabled={!canAccept}
          >
            Accept EA Review Request
          </button>
          <button
            onClick={() => setShowStatusModal('return')}
            className={`px-4 py-1.5 text-sm rounded text-white ${canAccept ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-300 cursor-not-allowed'}`}
            disabled={!canAccept}
          >
            Return EA Review Request
          </button>
        </div>
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

      {/* Meetings */}
      <Section
        title="Meetings"
        badge={meetings?.total}
        action={
          <button onClick={() => router.push(`/ea-review/request/${id}/create-meeting`)} className="w-5 h-5 rounded-full border border-primary-blue text-primary-blue flex items-center justify-center hover:bg-blue-50">
            <Plus className="w-3 h-3" />
          </button>
        }
      >
        <DataTable columns={meetingColumns} data={meetings?.data ?? []} rowKey="id" />
        {meetings && meetings.total > 0 && (
          <Pagination
            currentPage={meetingPage}
            totalPages={meetings.totalPages || 1}
            totalItems={meetings.total || 0}
            pageSize={10}
            onPageChange={setMeetingPage}
            onPageSizeChange={() => {}}
          />
        )}
        {(!meetings || meetings.total === 0) && (
          <div className="text-center py-4 text-sm text-text-secondary">No meetings scheduled</div>
        )}
      </Section>

      {/* Actions */}
      <Section
        title="Actions"
        badge={actions?.total}
        action={
          <button onClick={() => setShowAddAction(true)} className="w-5 h-5 rounded-full border border-primary-blue text-primary-blue flex items-center justify-center hover:bg-blue-50">
            <Plus className="w-3 h-3" />
          </button>
        }
      >
        <DataTable columns={actionColumns} data={actions?.data ?? []} rowKey="id" />
        {actions && actions.total > 0 && (
          <Pagination
            currentPage={actionPage}
            totalPages={actions.totalPages || 1}
            totalItems={actions.total || 0}
            pageSize={10}
            onPageChange={setActionPage}
            onPageSizeChange={() => {}}
          />
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

      {/* Accept/Return Modal */}
      <Modal
        title={showStatusModal === 'accept' ? 'Accept EA Review Request' : 'Return EA Review Request'}
        open={!!showStatusModal}
        onClose={() => { setShowStatusModal(null); setStatusRemark(''); setSelectedReviewers([]); setReviewerSearch(''); setReviewerDropdownOpen(false); }}
      >
        {/* Assigned Reviewer — only for Accept */}
        {showStatusModal === 'accept' && (
          <div className="mb-4">
            <label className="block text-sm text-text-primary mb-1">
              <span className="text-red-500">*</span> Assigned Reviewer
            </label>
            <div className="relative">
              <div
                className="min-h-[38px] w-full border border-border-default rounded px-2 py-1 flex flex-wrap items-center gap-1 cursor-text focus-within:ring-1 focus-within:ring-primary-blue"
                onClick={() => setReviewerDropdownOpen(true)}
              >
                {selectedReviewers.map((itcode) => (
                  <span key={itcode} className="inline-flex items-center gap-1 bg-blue-50 text-primary-blue text-xs rounded px-2 py-0.5">
                    {itcode}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedReviewers((prev) => prev.filter((r) => r !== itcode)); }}
                      className="text-blue-400 hover:text-blue-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={reviewerSearch}
                  onChange={(e) => { setReviewerSearch(e.target.value); setReviewerDropdownOpen(true); }}
                  onFocus={() => setReviewerDropdownOpen(true)}
                  className="flex-1 min-w-[80px] text-sm outline-none bg-transparent py-0.5"
                  placeholder={selectedReviewers.length === 0 ? 'Search by IT code...' : ''}
                />
                <svg className="w-4 h-4 text-text-secondary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Dropdown */}
              {reviewerDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setReviewerDropdownOpen(false)} />
                  <div className="absolute z-20 mt-1 w-full bg-white border border-border-default rounded shadow-lg max-h-48 overflow-auto">
                    {(teamMembers?.data ?? [])
                      .filter((m: any) => !selectedReviewers.includes(m.itcode))
                      .map((m: any) => (
                        <button
                          key={m.itcode}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between"
                          onClick={() => {
                            setSelectedReviewers((prev) => [...prev, m.itcode]);
                            setReviewerSearch('');
                          }}
                        >
                          <span className="font-medium">{m.itcode}</span>
                          {m.name && <span className="text-text-secondary text-xs">{m.name}</span>}
                        </button>
                      ))}
                    {(teamMembers?.data ?? []).filter((m: any) => !selectedReviewers.includes(m.itcode)).length === 0 && (
                      <div className="px-3 py-2 text-sm text-text-secondary">No matching members</div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="mb-2">
          <label className="block text-sm text-text-primary mb-1">Comments</label>
          <textarea
            value={statusRemark}
            onChange={(e) => setStatusRemark(e.target.value)}
            className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue min-h-[80px]"
            placeholder="Enter comments..."
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border-default">
          <button onClick={() => { setShowStatusModal(null); setStatusRemark(''); setSelectedReviewers([]); setReviewerSearch(''); setReviewerDropdownOpen(false); }} className="px-4 py-1.5 text-sm border border-border-default rounded hover:bg-gray-50">Cancel</button>
          <button
            onClick={showStatusModal === 'accept' ? handleAccept : handleReturn}
            disabled={updateStatus.isPending}
            className="px-4 py-1.5 text-sm text-white rounded disabled:opacity-60 bg-primary-blue hover:bg-blue-600"
          >
            {updateStatus.isPending ? 'Updating...' : 'OK'}
          </button>
        </div>
      </Modal>

      {/* AI Evaluation Detail Drawer */}
      <Drawer open={!!aiDetail} onClose={() => setAiDetail(null)} title={aiDetail?.title || 'AI Evaluation Detail'} size="lg">
        {aiDetail && (
          <div className="space-y-6">
            {/* Overall Score */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-medium text-text-secondary">Overall Score</span>
                <span className={`text-2xl font-bold ${
                  (aiDetail.overall_evaluation?.score ?? 0) >= 7 ? 'text-green-600' :
                  (aiDetail.overall_evaluation?.score ?? 0) >= 4 ? 'text-yellow-600' : 'text-red-600'
                }`}>{aiDetail.overall_evaluation?.score ?? '-'}</span>
              </div>
              {aiDetail.overall_evaluation?.summary && (
                <p className="text-sm text-text-secondary">{aiDetail.overall_evaluation.summary}</p>
              )}
            </div>

            {/* Score Breakdown */}
            {aiDetail.score_breakdown && (
              <div>
                <h4 className="text-sm font-semibold text-text-primary mb-2">Score Breakdown</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(aiDetail.score_breakdown).map(([key, val]) => (
                    <div key={key} className="flex justify-between bg-gray-50 rounded px-3 py-2">
                      <span className="text-sm text-text-secondary">{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                      <span className={`text-sm font-bold ${
                        Number(val) >= 7 ? 'text-green-600' : Number(val) >= 4 ? 'text-yellow-600' : 'text-red-600'
                      }`}>{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Issues */}
            {aiDetail.issues && aiDetail.issues.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-text-primary mb-2">Issues ({aiDetail.issues.length})</h4>
                <div className="space-y-3">
                  {aiDetail.issues.map((issue: any) => (
                    <div key={issue.id} className="border border-border-light rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-mono text-text-secondary">{issue.id}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          issue.priority === 'High' ? 'bg-red-100 text-red-700' :
                          issue.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                        }`}>{issue.priority}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          issue.issue_type === 'must_fix' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                        }`}>{issue.issue_type === 'must_fix' ? 'Must Fix' : 'Suggestion'}</span>
                        <span className="text-xs text-text-secondary">{issue.dimension}</span>
                      </div>
                      <p className="text-sm text-text-primary mb-1">{issue.description}</p>
                      {issue.suggestion && (
                        <p className="text-xs text-text-secondary"><span className="font-medium">Suggestion:</span> {issue.suggestion}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {aiDetail.recommendations && aiDetail.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-text-primary mb-2">Recommendations</h4>
                <ol className="list-decimal list-inside space-y-1">
                  {aiDetail.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="text-sm text-text-secondary">{rec}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Add Action Modal */}
      <Modal title="Add Action" open={showAddAction} onClose={() => setShowAddAction(false)}>
        <FormField label="Action Title">
          <input type="text" value={actionForm.title} onChange={(e) => setActionForm((p) => ({ ...p, title: e.target.value }))}
            className="w-full border border-border-default rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue" placeholder="Enter action title" />
        </FormField>
        <FormField label="Type">
          <select value={actionForm.type} onChange={(e) => setActionForm((p) => ({ ...p, type: e.target.value }))}
            className="w-full border border-border-default rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue">
            <option value="Mandatory">Mandatory</option>
            <option value="Recommended">Recommended</option>
            <option value="Optional">Optional</option>
          </select>
        </FormField>
        <FormField label="Priority">
          <select value={actionForm.priority} onChange={(e) => setActionForm((p) => ({ ...p, priority: e.target.value }))}
            className="w-full border border-border-default rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue">
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </FormField>
        <FormField label="Assignee">
          <input type="text" value={actionForm.assigneeName} onChange={(e) => setActionForm((p) => ({ ...p, assigneeName: e.target.value }))}
            className="w-full border border-border-default rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue" placeholder="Enter assignee name" />
        </FormField>
        <FormField label="Due Date">
          <input type="date" value={actionForm.dueDate} onChange={(e) => setActionForm((p) => ({ ...p, dueDate: e.target.value }))}
            className="w-full border border-border-default rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue" />
        </FormField>
        <FormField label="Description">
          <textarea value={actionForm.actionDescription} onChange={(e) => setActionForm((p) => ({ ...p, actionDescription: e.target.value }))}
            className="w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue min-h-[60px]" placeholder="Enter description" />
        </FormField>
        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border-default">
          <button onClick={() => setShowAddAction(false)} className="px-4 py-1.5 text-sm border border-border-default rounded hover:bg-gray-50">Cancel</button>
          <button onClick={handleAddAction} disabled={!actionForm.title || createAction.isPending}
            className="px-4 py-1.5 text-sm bg-primary-blue text-white rounded hover:bg-blue-600 disabled:opacity-60">
            {createAction.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

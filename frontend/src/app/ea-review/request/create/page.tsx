'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ResourceSearch } from '@/components/ui/ResourceSearch';

/* ── Step indicator ── */
const STEPS = [
  { label: 'Select Project', desc: 'Choose a project' },
  { label: 'Request Details', desc: 'Fill in details' },
  { label: 'Assign Reviewer', desc: 'Select reviewer' },
  { label: 'Review & Submit', desc: 'Confirm and submit' },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-between mb-8 px-4">
      {STEPS.map((s, i) => (
        <div key={s.label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium ${
              i < current ? 'bg-green-500 text-white' : i === current ? 'bg-primary-blue text-white' : 'bg-gray-200 text-gray-400'
            }`}>
              {i < current ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              ) : (
                i + 1
              )}
            </div>
            <span className={`text-xs whitespace-nowrap ${i <= current ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>{s.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-3 mt-[-1.2rem] ${i < current ? 'bg-green-500' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Card wrapper ── */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border-default rounded-lg bg-white mb-6">
      <div className="px-4 py-3 border-b border-border-default">
        <span className="text-sm font-semibold text-text-primary">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/* ── Form Row ── */
function FormRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start py-2.5">
      <span className="text-sm text-text-secondary w-44 shrink-0 text-right pr-4 pt-1.5">
        {required && <span className="text-red-500 mr-0.5">*</span>}
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

/* ── Read-only row ── */
function ReadRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-text-secondary w-44 shrink-0 text-right pr-3">{label}:</span>
      <span className="text-sm text-text-primary">{value || '-'}</span>
    </div>
  );
}

const inputCls = 'w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue';

export default function CreateRequestPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Form state
  const [form, setForm] = useState({
    projectId: '',
    reviewScope: '',
    wsPhase: '',
    requester: '',
    organization: '',
    link: '',
    requestDesc: '',
    assignReviewer: '',
    reviewerItcode: '',
  });

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  // Fetch projects for dropdown
  const { data: projectsData } = useQuery({
    queryKey: ['allProjects'],
    queryFn: () => api.get<any>('/projects', { page: 1, pageSize: 500 }),
  });
  const projects = projectsData?.data ?? [];

  // Fetch dict options for review scope (category_id = 2500)
  const { data: scopeOptions = [] } = useQuery({
    queryKey: ['dictReviewScope'],
    queryFn: () => api.get<any[]>('/dict-options', { categoryId: 2500 }),
  });

  // Fetch dict options for organization/domain (category_id = 2600)
  const { data: orgOptions = [] } = useQuery({
    queryKey: ['dictOrganization'],
    queryFn: () => api.get<any[]>('/dict-options', { categoryId: 2600 }),
  });

  // Selected project details
  const selectedProject = projects.find((p: any) => p.projectId === form.projectId);

  // Create mutation
  const createRequest = useMutation({
    mutationFn: (payload: any) => api.post<any>('/ea-requests', payload),
    onSuccess: (data: any) => {
      const rid = data?.requestId;
      if (rid) {
        router.push(`/ea-review/request/${rid}`);
      } else {
        router.push('/ea-review/request-summary');
      }
    },
  });

  const handleSubmit = () => {
    createRequest.mutate({
      projectId: form.projectId,
      reviewScope: form.reviewScope || null,
      wsPhase: form.wsPhase || null,
      requester: form.requester || null,
      organization: form.organization || null,
      link: form.link || null,
      requestDesc: form.requestDesc || null,
      assignReviewer: form.reviewerItcode ? [form.reviewerItcode] : [],
      createdBy: 'System',
    });
  };

  const canNext = () => {
    switch (step) {
      case 0: return !!form.projectId;
      case 1: return !!form.reviewScope;
      case 2: return true; // Reviewer is optional
      case 3: return true;
      default: return false;
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-text-secondary hover:text-text-primary">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-text-primary">Create EA Review Request</h1>
      </div>

      <StepIndicator current={step} />

      {/* Error */}
      {createRequest.isError && (
        <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          Failed to create request. Please try again.
        </div>
      )}

      {/* Step 0: Select Project */}
      {step === 0 && (
        <Card title="Select Project">
          <FormRow label="Project" required>
            <select
              value={form.projectId}
              onChange={(e) => set('projectId', e.target.value)}
              className={inputCls}
            >
              <option value="">-- Select a project --</option>
              {projects.map((p: any) => (
                <option key={p.projectId} value={p.projectId}>
                  {p.projectId} - {p.projectName}
                </option>
              ))}
            </select>
          </FormRow>
          {selectedProject && (
            <div className="mt-4 bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">Project Info</p>
              <div className="grid grid-cols-2 gap-x-8">
                <ReadRow label="Project ID" value={selectedProject.projectId} />
                <ReadRow label="Project Name" value={selectedProject.projectName} />
                <ReadRow label="PM" value={selectedProject.pm} />
                <ReadRow label="DT Lead" value={selectedProject.dtLead} />
                <ReadRow label="IT Lead" value={selectedProject.itLead} />
                <ReadRow label="Status" value={selectedProject.status} />
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Step 1: Request Details */}
      {step === 1 && (
        <Card title="Request Details">
          <FormRow label="Review Scope" required>
            <select value={form.reviewScope} onChange={(e) => set('reviewScope', e.target.value)} className={inputCls}>
              <option value="">-- Select scope --</option>
              {scopeOptions.length > 0 ? (
                scopeOptions.map((o: any) => <option key={o.optionId} value={o.option}>{o.option}</option>)
              ) : (
                <>
                  <option value="Full Review">Full Review</option>
                  <option value="Light Review">Light Review</option>
                  <option value="Scope Check">Scope Check</option>
                  <option value="Scope of Change">Scope of Change</option>
                  <option value="Part of Project">Part of Project</option>
                </>
              )}
            </select>
          </FormRow>
          <FormRow label="WS Name / Phase">
            <input value={form.wsPhase} onChange={(e) => set('wsPhase', e.target.value)} className={inputCls} placeholder="e.g. Phase 1 - Discovery" />
          </FormRow>
          <FormRow label="Requestor">
            <ResourceSearch
              value={form.requester}
              onChange={(val) => set('requester', val)}
              placeholder="Search requestor..."
            />
          </FormRow>
          <FormRow label="Organization">
            <select value={form.organization} onChange={(e) => set('organization', e.target.value)} className={inputCls}>
              <option value="">-- Select --</option>
              {orgOptions.length > 0 ? (
                orgOptions.map((o: any) => <option key={o.optionId} value={o.option}>{o.option}</option>)
              ) : (
                <>
                  <option value="GBS">GBS</option>
                  <option value="DT">DT</option>
                  <option value="FIN">FIN</option>
                  <option value="HR">HR</option>
                  <option value="SCM">SCM</option>
                  <option value="MKT">MKT</option>
                </>
              )}
            </select>
          </FormRow>
          <FormRow label="Confluence Link">
            <input value={form.link} onChange={(e) => set('link', e.target.value)} className={inputCls} placeholder="https://..." />
          </FormRow>
          <FormRow label="Description">
            <textarea
              value={form.requestDesc}
              onChange={(e) => set('requestDesc', e.target.value)}
              className={`${inputCls} min-h-[80px]`}
              placeholder="Describe the request..."
            />
          </FormRow>
        </Card>
      )}

      {/* Step 2: Assign Reviewer */}
      {step === 2 && (
        <Card title="Assign Reviewer">
          <p className="text-sm text-text-secondary mb-4">
            Search and select an EA reviewer from the resource pool. This is optional and can be assigned later.
          </p>
          <FormRow label="Reviewer">
            <ResourceSearch
              value={form.assignReviewer}
              onChange={(val, resource) => {
                set('assignReviewer', val);
                if (resource) set('reviewerItcode', resource.itcode);
              }}
              placeholder="Search reviewer by name or IT code..."
            />
          </FormRow>
        </Card>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && (
        <Card title="Review & Submit">
          <p className="text-sm text-text-secondary mb-4">
            Please review all details before submitting the request.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
            <div>
              <ReadRow label="Project ID" value={form.projectId} />
              <ReadRow label="Project Name" value={selectedProject?.projectName} />
              <ReadRow label="Review Scope" value={form.reviewScope} />
              <ReadRow label="WS / Phase" value={form.wsPhase} />
            </div>
            <div>
              <ReadRow label="Requestor" value={form.requester} />
              <ReadRow label="Organization" value={form.organization} />
              <ReadRow label="Confluence Link" value={form.link} />
              <ReadRow label="Assigned Reviewer" value={form.assignReviewer} />
            </div>
          </div>
          {form.requestDesc && (
            <div className="mt-4">
              <ReadRow label="Description" value={form.requestDesc} />
            </div>
          )}
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => step > 0 ? setStep(step - 1) : router.back()}
          className="px-6 py-2 text-sm border border-border-default rounded hover:bg-gray-50"
        >
          {step === 0 ? 'Cancel' : 'Back'}
        </button>
        <div className="flex gap-3">
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canNext()}
              className="px-6 py-2 text-sm bg-primary-blue text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={createRequest.isPending}
              className="px-6 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
            >
              {createRequest.isPending ? 'Creating...' : 'Submit Request'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

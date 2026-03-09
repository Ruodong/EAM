'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/* ── Read-only Form Row ── */
function ReadOnlyRow({ label, value, textarea }: { label: string; value?: string | null; textarea?: boolean }) {
  return (
    <div className="flex items-start py-3">
      <span className="text-sm text-text-secondary w-44 shrink-0 text-right pr-4 pt-1">{label}</span>
      {textarea ? (
        <textarea
          readOnly
          value={value || ''}
          className="flex-1 border border-border-default rounded px-3 py-2 text-sm bg-gray-50 text-text-primary resize-none min-h-[80px]"
        />
      ) : (
        <input
          readOnly
          value={value || ''}
          className="flex-1 border border-border-default rounded px-3 py-2 text-sm bg-gray-50 text-text-primary"
        />
      )}
    </div>
  );
}

/* ── Editable Form Row ── */
function FormRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start py-3">
      <span className="text-sm text-text-secondary w-44 shrink-0 text-right pr-4 pt-1">
        {required && <span className="text-red-500 mr-0.5">*</span>}
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

const inputCls = 'w-full border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue';
const selectCls = 'border border-border-default rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue';

export default function CreateMeetingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch the parent request data
  const { data: request, isLoading } = useQuery({
    queryKey: ['eaRequest', id],
    queryFn: () => api.get<any>(`/ea-requests/${id}`),
    enabled: !!id,
  });

  // Fetch available EA schedules
  const { data: schedulesData } = useQuery({
    queryKey: ['availableSchedules'],
    queryFn: () => api.get<any>('/schedules', { status: 'Available', page: 1, pageSize: 100 }),
  });

  const [form, setForm] = useState({
    meetingTitle: '',
    scheduleNo: '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '13:00',
    endDate: new Date().toISOString().split('T')[0],
    endTime: '13:30',
    presenters: '',
    attendees: '',
    emailCC: '',
    meetingAgenda: '',
  });

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  // When a schedule is selected, populate the time fields
  const handleScheduleSelect = (scheduleNo: string) => {
    set('scheduleNo', scheduleNo);
    if (scheduleNo && schedulesData?.data) {
      const schedule = schedulesData.data.find((s: any) => String(s.scheduleNo) === scheduleNo);
      if (schedule) {
        const start = new Date(schedule.startTime);
        const end = new Date(schedule.endTime);
        setForm((p) => ({
          ...p,
          scheduleNo,
          startDate: start.toISOString().split('T')[0],
          startTime: start.toTimeString().slice(0, 5),
          endDate: end.toISOString().split('T')[0],
          endTime: end.toTimeString().slice(0, 5),
        }));
      }
    }
  };

  const createMeeting = useMutation({
    mutationFn: (payload: any) => api.post<any>('/meetings', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requestMeetings', id] });
      router.back();
    },
  });

  const handleSubmit = () => {
    const startISO = `${form.startDate}T${form.startTime}:00`;
    const endISO = `${form.endDate}T${form.endTime}:00`;
    createMeeting.mutate({
      title: form.meetingTitle,
      requestName: request?.requestId ? `${request.requestId} - ${request.projectId} - ${request.projectName}` : '',
      projectId: request?.projectId || '',
      projectName: request?.projectName || '',
      meetingAgent: '',
      meetingStatus: 'Open',
      presenters: form.presenters,
      attendees: form.attendees,
      emailCC: form.emailCC,
      meetingAgenda: form.meetingAgenda,
      startTime: startISO,
      endTime: endISO,
      createdBy: 'System',
    });
  };

  const canSubmit = form.meetingTitle.trim() && form.presenters.trim() && form.attendees.trim() && form.meetingAgenda.trim();

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

  const requestName = request ? `${request.requestId} - ${request.projectId} - ${request.projectName}` : '';
  const availableSchedules = schedulesData?.data ?? [];

  // Generate time options (00:00 to 23:30 in 30min increments)
  const timeOptions: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      timeOptions.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-text-secondary hover:text-text-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-text-primary">Create a Meeting</h1>
        </div>
        <button onClick={() => router.back()} className="text-text-secondary hover:text-text-primary">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* General Data (Read-only) */}
      <div className="border border-border-default rounded-lg mb-6 bg-white">
        <div className="px-4 py-3 border-b border-border-default">
          <span className="text-sm font-semibold text-text-primary">General Data</span>
        </div>
        <div className="px-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <ReadOnlyRow label="Request Name" value={requestName} />
              <ReadOnlyRow label="Project Objectives" value={request?.comments || request?.wsName || ''} textarea />
            </div>
            <div>
              <ReadOnlyRow label="Project ID" value={request?.projectId} />
              <ReadOnlyRow label="Project Name" value={request?.projectName} />
              <ReadOnlyRow label="PM" value={request?.pmName} />
            </div>
          </div>
        </div>
      </div>

      {/* Meeting Form */}
      <div className="border border-border-default rounded-lg mb-6 bg-white">
        <div className="px-4 py-3 border-b border-border-default">
          <span className="text-sm font-semibold text-text-primary">Meeting</span>
        </div>
        <div className="px-4 py-2">
          {/* Meeting Title */}
          <FormRow label="Meeting Title" required>
            <input
              type="text"
              value={form.meetingTitle}
              onChange={(e) => set('meetingTitle', e.target.value)}
              className={inputCls}
              placeholder=""
            />
          </FormRow>

          {/* Available EA Schedule + Meeting Status */}
          <FormRow label="Available EA Schedule">
            <div className="flex items-center gap-3">
              <select
                value={form.scheduleNo}
                onChange={(e) => handleScheduleSelect(e.target.value)}
                className={`${selectCls} flex-1`}
              >
                <option value=""></option>
                {availableSchedules.map((s: any) => (
                  <option key={s.scheduleNo} value={s.scheduleNo}>
                    {s.title || s.scheduleTitle} ({new Date(s.startTime).toLocaleDateString()})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['availableSchedules'] })}
                className="w-8 h-8 flex items-center justify-center border border-border-default rounded-full hover:bg-gray-50"
              >
                <svg className="w-4 h-4 text-primary-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <span className="text-sm text-text-secondary ml-4">Meeting Status</span>
              <input readOnly value="Open" className="border border-border-default rounded px-3 py-2 text-sm bg-gray-50 w-32" />
            </div>
          </FormRow>

          {/* Meeting Time */}
          <FormRow label="Meeting Time" required>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => set('startDate', e.target.value)}
                className={`${selectCls} w-40`}
              />
              <select
                value={form.startTime}
                onChange={(e) => set('startTime', e.target.value)}
                className={`${selectCls} w-24`}
              >
                {timeOptions.map((t) => (
                  <option key={`s-${t}`} value={t}>{t}</option>
                ))}
              </select>
              <span className="text-text-secondary mx-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </span>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => set('endDate', e.target.value)}
                className={`${selectCls} w-40`}
              />
              <select
                value={form.endTime}
                onChange={(e) => set('endTime', e.target.value)}
                className={`${selectCls} w-24`}
              >
                {timeOptions.map((t) => (
                  <option key={`e-${t}`} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </FormRow>

          {/* Presenter(s) */}
          <FormRow label="Presenter(s)" required>
            <input
              type="text"
              value={form.presenters}
              onChange={(e) => set('presenters', e.target.value)}
              className={inputCls}
              placeholder="请输入"
            />
          </FormRow>

          {/* Attendees */}
          <FormRow label="Attendees" required>
            <input
              type="text"
              value={form.attendees}
              onChange={(e) => set('attendees', e.target.value)}
              className={inputCls}
              placeholder="请输入"
            />
          </FormRow>

          {/* Email CC */}
          <FormRow label="Email CC">
            <input
              type="text"
              value={form.emailCC}
              onChange={(e) => set('emailCC', e.target.value)}
              className={inputCls}
              placeholder="请输入"
            />
          </FormRow>

          {/* Meeting Agenda */}
          <FormRow label="Meeting Agenda" required>
            <div className="border border-border-default rounded overflow-hidden">
              {/* Simple toolbar */}
              <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border-default bg-gray-50">
                <button type="button" className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-sm font-bold">H</button>
                <button type="button" className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-sm font-bold">B</button>
                <button type="button" className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-sm">T↑</button>
                <button type="button" className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-sm italic">I</button>
                <button type="button" className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-sm underline">U</button>
                <button type="button" className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-sm line-through">S</button>
                <div className="w-px h-5 bg-border-default mx-1" />
                <button type="button" className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-xs">≡</button>
                <button type="button" className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-xs">⊞</button>
                <div className="w-px h-5 bg-border-default mx-1" />
                <button type="button" className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-xs">🔗</button>
              </div>
              <textarea
                value={form.meetingAgenda}
                onChange={(e) => set('meetingAgenda', e.target.value)}
                className="w-full px-3 py-2 text-sm focus:outline-none min-h-[120px] resize-y"
                placeholder=""
              />
            </div>
          </FormRow>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => router.back()}
          className="px-6 py-2 text-sm border border-border-default rounded hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || createMeeting.isPending}
          className="px-6 py-2 text-sm bg-primary-blue text-white rounded hover:bg-blue-600 disabled:opacity-60"
        >
          {createMeeting.isPending ? 'Creating...' : 'Submit'}
        </button>
      </div>
    </div>
  );
}

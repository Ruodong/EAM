'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { HomeLayout } from '@/components/layout/HomeLayout';
import { StatsCard } from '@/components/ui/StatsCard';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Pagination } from '@/components/ui/Pagination';
import { api } from '@/lib/api';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useT } from '@/lib/locale';

interface HomeStats {
  myProjects: number;
  myRequests: number;
  myActions: number;
  requestQueue: number;
}

export default function HomePage() {
  const t = useT();
  const [requestsPage, setRequestsPage] = useState(1);
  const [queuePage, setQueuePage] = useState(1);
  const [actionsPage, setActionsPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: stats } = useQuery({
    queryKey: ['homeStats'],
    queryFn: () => api.get<HomeStats>('/dashboard/home-stats'),
  });

  const { data: myRequests, isLoading: loadingRequests } = useQuery({
    queryKey: ['myRequests', requestsPage, pageSize],
    queryFn: () => api.get<any>('/ea-requests', { page: requestsPage, pageSize }),
  });

  const { data: requestQueue, isLoading: loadingQueue } = useQuery({
    queryKey: ['requestQueue', queuePage, pageSize],
    queryFn: () => api.get<any>('/ea-requests', { page: queuePage, pageSize, status: 'Submitted' }),
  });

  const { data: myActions, isLoading: loadingActions } = useQuery({
    queryKey: ['myActions', actionsPage, pageSize],
    queryFn: () => api.get<any>('/actions', { page: actionsPage, pageSize }),
  });

  const requestColumns: Column<any>[] = [
    { key: 'requestId', title: 'Request ID', sortable: true, render: (v) => <span className="text-primary-blue">{v}</span> },
    { key: 'status', title: 'Status', sortable: true, render: (v) => <StatusBadge status={v} /> },
    { key: 'reviewResult', title: 'Review Result', sortable: true, render: (v) => v ? <StatusBadge status={v} variant="text" /> : '-' },
    { key: 'scope', title: 'Scope', sortable: true },
    { key: 'projectName', title: 'Project Name', sortable: true },
    { key: 'requestorName', title: 'Requestor', sortable: true },
    { key: 'reviewerName', title: 'Reviewer', sortable: true },
    { key: 'createdAt', title: 'Created Date', sortable: true, render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
  ];

  const actionColumns: Column<any>[] = [
    { key: 'actionId', title: 'Action ID', sortable: true, render: (v) => <span className="text-primary-blue">{v}</span> },
    { key: 'requestName', title: 'Request Name', sortable: true },
    { key: 'projectName', title: 'Project', sortable: true },
    { key: 'title', title: 'Action Title', sortable: true },
    { key: 'type', title: 'Type', sortable: true },
    { key: 'status', title: 'Status', sortable: true, render: (v) => <StatusBadge status={v} /> },
    { key: 'dueDate', title: 'Due Date', sortable: true, render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
  ];

  const recommendLinks = [
    { title: 'IT PMO', description: 'Project management and portfolio oversight', href: '#' },
    { title: 'LSSC', description: 'Lenovo Shared Services Center', href: '#' },
    { title: 'IT Service Portal', description: 'IT services and support', href: '#' },
    { title: 'Enterprise Architecture', description: 'EA governance and standards', href: '#' },
  ];

  return (
    <HomeLayout>
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400 rounded-full filter blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-400 rounded-full filter blur-3xl translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-16">
          <h1 className="text-4xl font-bold mb-3">{t('Enterprise Architecture Management')}</h1>
          <p className="text-lg text-blue-100 mb-6 max-w-2xl">
            Streamline your enterprise architecture governance, review processes, and technology management.
          </p>
          <Link href="/ea-review/request/create" className="inline-flex items-center gap-2 bg-white text-blue-700 px-6 py-2.5 rounded-lg font-medium hover:bg-blue-50 transition-colors">
            {t('Create A Request')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="max-w-7xl mx-auto px-6 -mt-6 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard label={t('My Projects')} value={stats?.myProjects ?? 0} color="text-primary-blue" />
          <StatsCard label={t('My Requests')} value={stats?.myRequests ?? 0} color="text-status-in-progress" />
          <StatsCard label={t('My Actions')} value={stats?.myActions ?? 0} color="text-status-completed" />
          <StatsCard label={t('Request Queue')} value={stats?.requestQueue ?? 0} color="text-status-submitted" />
        </div>
      </section>

      {/* My Requests Table */}
      <section className="max-w-7xl mx-auto px-6 mt-8">
        <div className="bg-white rounded-lg border border-border-light">
          <div className="px-4 py-3 border-b border-border-light flex items-center justify-between">
            <h2 className="text-base font-medium text-text-primary">{t('My Requests')}</h2>
            <Link href="/ea-review/request-summary" className="text-sm text-primary-blue hover:text-primary-blue-hover">
              {t('View All')}
            </Link>
          </div>
          <DataTable columns={requestColumns} data={myRequests?.data ?? []} rowKey="id" loading={loadingRequests} />
          {myRequests && (
            <Pagination
              currentPage={requestsPage}
              totalPages={myRequests.totalPages || 1}
              totalItems={myRequests.total || 0}
              pageSize={pageSize}
              onPageChange={setRequestsPage}
              onPageSizeChange={(s) => { setPageSize(s); setRequestsPage(1); }}
            />
          )}
        </div>
      </section>

      {/* Request Queue Table */}
      <section className="max-w-7xl mx-auto px-6 mt-6">
        <div className="bg-white rounded-lg border border-border-light">
          <div className="px-4 py-3 border-b border-border-light flex items-center justify-between">
            <h2 className="text-base font-medium text-text-primary">{t('Request Queue')}</h2>
            <Link href="/ea-review/request-summary" className="text-sm text-primary-blue hover:text-primary-blue-hover">
              {t('View All')}
            </Link>
          </div>
          <DataTable columns={requestColumns} data={requestQueue?.data ?? []} rowKey="id" loading={loadingQueue} />
          {requestQueue && (
            <Pagination
              currentPage={queuePage}
              totalPages={requestQueue.totalPages || 1}
              totalItems={requestQueue.total || 0}
              pageSize={pageSize}
              onPageChange={setQueuePage}
              onPageSizeChange={(s) => { setPageSize(s); setQueuePage(1); }}
            />
          )}
        </div>
      </section>

      {/* My Actions Table */}
      <section className="max-w-7xl mx-auto px-6 mt-6">
        <div className="bg-white rounded-lg border border-border-light">
          <div className="px-4 py-3 border-b border-border-light flex items-center justify-between">
            <h2 className="text-base font-medium text-text-primary">{t('My Actions')}</h2>
            <Link href="/ea-review/actions" className="text-sm text-primary-blue hover:text-primary-blue-hover">
              {t('View All')}
            </Link>
          </div>
          <DataTable columns={actionColumns} data={myActions?.data ?? []} rowKey="id" loading={loadingActions} />
          {myActions && (
            <Pagination
              currentPage={actionsPage}
              totalPages={myActions.totalPages || 1}
              totalItems={myActions.total || 0}
              pageSize={pageSize}
              onPageChange={setActionsPage}
              onPageSizeChange={(s) => { setPageSize(s); setActionsPage(1); }}
            />
          )}
        </div>
      </section>

      {/* Recommend Links */}
      <section className="max-w-7xl mx-auto px-6 mt-8 mb-8">
        <h2 className="text-base font-medium text-text-primary mb-4">{t('Recommend Links')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {recommendLinks.map((link) => (
            <Link
              key={link.title}
              href={link.href}
              className="bg-white rounded-lg border border-border-light p-4 hover:border-primary-blue hover:shadow-sm transition-all group"
            >
              <h3 className="font-medium text-text-primary group-hover:text-primary-blue transition-colors">{link.title}</h3>
              <p className="text-sm text-text-secondary mt-1">{link.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </HomeLayout>
  );
}

'use client';

import { BarChart3 } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-4">Reports</h1>
      <div className="bg-white rounded-lg border border-border-light p-12 text-center">
        <BarChart3 className="w-12 h-12 text-text-secondary mx-auto mb-3" />
        <p className="text-text-secondary">Reports and analytics module coming soon.</p>
      </div>
    </div>
  );
}

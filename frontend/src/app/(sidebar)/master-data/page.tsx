'use client';

import { Database } from 'lucide-react';

export default function MasterDataPage() {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-4">Master Data</h1>
      <div className="bg-white rounded-lg border border-border-light p-12 text-center">
        <Database className="w-12 h-12 text-text-secondary mx-auto mb-3" />
        <p className="text-text-secondary">Master Data management module coming soon.</p>
      </div>
    </div>
  );
}

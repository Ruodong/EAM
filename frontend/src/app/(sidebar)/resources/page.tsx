'use client';

import { BookOpen } from 'lucide-react';

export default function ResourcesPage() {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-4">Resources</h1>
      <div className="bg-white rounded-lg border border-border-light p-12 text-center">
        <BookOpen className="w-12 h-12 text-text-secondary mx-auto mb-3" />
        <p className="text-text-secondary">Resources and documentation module coming soon.</p>
      </div>
    </div>
  );
}

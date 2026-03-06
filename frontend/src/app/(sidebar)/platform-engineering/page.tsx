'use client';

import { Server } from 'lucide-react';

export default function PlatformEngineeringPage() {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-4">Platform Engineering</h1>
      <div className="bg-white rounded-lg border border-border-light p-12 text-center">
        <Server className="w-12 h-12 text-text-secondary mx-auto mb-3" />
        <p className="text-text-secondary">Platform Engineering module coming soon.</p>
      </div>
    </div>
  );
}

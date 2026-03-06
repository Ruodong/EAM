'use client';

import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-4">Settings</h1>
      <div className="bg-white rounded-lg border border-border-light p-12 text-center">
        <Settings className="w-12 h-12 text-text-secondary mx-auto mb-3" />
        <p className="text-text-secondary">System settings module coming soon.</p>
      </div>
    </div>
  );
}

'use client';

import { HelpCircle } from 'lucide-react';

export default function HelpPage() {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-4">Help</h1>
      <div className="bg-white rounded-lg border border-border-light p-12 text-center">
        <HelpCircle className="w-12 h-12 text-text-secondary mx-auto mb-3" />
        <p className="text-text-secondary">Help and documentation coming soon.</p>
        <p className="text-sm text-text-secondary mt-2">
          For support, contact <a href="mailto:EA@lenovo.com" className="text-primary-blue hover:text-primary-blue-hover">EA@lenovo.com</a>
        </p>
      </div>
    </div>
  );
}

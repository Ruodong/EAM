'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';

interface ExportButtonProps {
  entity: string;
  label?: string;
  params?: Record<string, string>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export function ExportButton({ entity, label = 'Export CSV', params }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const query = params && Object.keys(params).length
        ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString()
        : '';
      const res = await fetch(`${API_BASE}/export/${entity}${query}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entity}-export.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border-default rounded hover:bg-gray-50 text-text-secondary disabled:opacity-50"
    >
      <Download className="w-4 h-4" />
      {loading ? 'Exporting...' : label}
    </button>
  );
}

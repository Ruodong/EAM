'use client';

import { Download, Upload, Plus } from 'lucide-react';

interface ActionBarProps {
  onExport?: () => void;
  onImport?: () => void;
  onNew?: () => void;
  showExport?: boolean;
  showImport?: boolean;
  showNew?: boolean;
  newLabel?: string;
  children?: React.ReactNode;
}

export function ActionBar({
  onExport,
  onImport,
  onNew,
  showExport = false,
  showImport = false,
  showNew = false,
  newLabel = 'New',
  children,
}: ActionBarProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">{children}</div>
      <div className="flex items-center gap-2">
        {showImport && (
          <button onClick={onImport} className="btn-default flex items-center gap-1.5 !px-3 !py-1.5 text-sm">
            <Upload className="w-3.5 h-3.5" />
            Import
          </button>
        )}
        {showExport && (
          <button onClick={onExport} className="btn-default flex items-center gap-1.5 !px-3 !py-1.5 text-sm">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        )}
        {showNew && (
          <button onClick={onNew} className="btn-primary flex items-center gap-1.5 !px-3 !py-1.5 text-sm">
            <Plus className="w-3.5 h-3.5" />
            {newLabel}
          </button>
        )}
      </div>
    </div>
  );
}

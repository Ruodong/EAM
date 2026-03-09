'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { ArrowUpDown, ArrowUp, ArrowDown, Settings2, Download } from 'lucide-react';
import { useT } from '@/lib/locale';

export interface Column<T> {
  key: string;
  title: string;
  width?: string;
  sortable?: boolean;
  pinned?: 'left' | 'right';
  hidden?: boolean;
  render?: (value: any, record: T, index: number) => React.ReactNode;
}

export interface ExportConfig {
  /** Backend entity name, e.g. "bcm", "projects", "meetings" */
  entity: string;
  /** Current search filters — forwarded as query params to /api/export/:entity */
  params?: Record<string, string>;
  /** Button label, defaults to "Export CSV" */
  label?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: string;
  loading?: boolean;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onRowClick?: (record: T) => void;
  emptyText?: string;
  showColumnSettings?: boolean;
  /** Pass this to show an Export button in the table toolbar */
  exportConfig?: ExportConfig;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  rowKey,
  loading = false,
  onSort,
  sortKey,
  sortDirection,
  onRowClick,
  emptyText = 'No data',
  showColumnSettings = false,
  exportConfig,
}: DataTableProps<T>) {
  const t = useT();
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const visibleColumns = columns.filter((col) => !col.hidden && !hiddenColumns.has(col.key));

  const handleSort = (key: string) => {
    if (!onSort) return;
    if (sortKey === key) {
      onSort(key, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(key, 'asc');
    }
  };

  const toggleColumn = (key: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleExport = async () => {
    if (!exportConfig) return;
    setExporting(true);
    try {
      const { entity, params } = exportConfig;
      const query =
        params && Object.keys(params).length
          ? '?' +
            new URLSearchParams(
              Object.fromEntries(Object.entries(params).filter(([, v]) => v))
            ).toString()
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
      setExporting(false);
    }
  };

  const showToolbar = showColumnSettings || !!exportConfig;

  return (
    <div className="relative">
      {showToolbar && (
        <div className="flex justify-end items-center gap-2 mb-2">
          {/* Export button */}
          {exportConfig && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary px-2 py-1 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {exporting ? t('Loading...') : (exportConfig.label ?? t('Export') + ' CSV')}
            </button>
          )}

          {/* Column settings */}
          {showColumnSettings && (
            <div className="relative">
              <button
                onClick={() => setColumnSettingsOpen(!columnSettingsOpen)}
                className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary px-2 py-1 rounded hover:bg-gray-50 transition-colors"
              >
                <Settings2 className="w-4 h-4" />
                {t('Column Settings')}
              </button>
              {columnSettingsOpen && (
                <div className="absolute right-0 top-8 z-20 bg-white border border-border-light rounded-lg shadow-lg p-3 min-w-[200px]">
                  <div className="text-sm font-medium mb-2">{t('Column Settings')}</div>
                  {columns.map((col) => (
                    <label key={col.key} className="flex items-center gap-2 py-1 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!hiddenColumns.has(col.key)}
                        onChange={() => toggleColumn(col.key)}
                        className="rounded"
                      />
                      {t(col.title)}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto border border-border-light rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-border-light">
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={clsx(
                    'px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider whitespace-nowrap',
                    col.sortable && 'cursor-pointer select-none hover:text-text-primary'
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {t(col.title)}
                    {col.sortable && (
                      <span className="inline-flex flex-col">
                        {sortKey === col.key ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {loading ? (
              <tr>
                <td colSpan={visibleColumns.length} className="px-4 py-12 text-center text-text-secondary">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-primary-blue border-t-transparent rounded-full animate-spin" />
                    {t('Loading...')}
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length} className="px-4 py-12 text-center text-text-secondary">
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((record, rowIdx) => (
                <tr
                  key={record[rowKey] ?? rowIdx}
                  onClick={() => onRowClick?.(record)}
                  className={clsx(
                    'hover:bg-blue-50/30 transition-colors',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {visibleColumns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-sm text-text-primary whitespace-nowrap">
                      {col.render
                        ? col.render(record[col.key], record, rowIdx)
                        : record[col.key] ?? '-'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

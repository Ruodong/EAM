'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle, Info, Trash2, X } from 'lucide-react';
import clsx from 'clsx';

type DialogVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
  loading?: boolean;
}

const variantConfig: Record<DialogVariant, { icon: typeof AlertTriangle; iconBg: string; iconColor: string; btnClass: string }> = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    btnClass: 'bg-red-600 hover:bg-red-700 text-white',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    btnClass: 'bg-yellow-600 hover:bg-yellow-700 text-white',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    btnClass: 'bg-primary-blue hover:bg-primary-blue-hover text-white',
  },
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const config = variantConfig[variant];
  const Icon = config.icon;

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/40"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4 p-6">
          <div className={clsx('flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center', config.iconBg)}>
            <Icon className={clsx('w-5 h-5', config.iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-text-primary">{title}</h3>
            <div className="mt-2 text-sm text-text-secondary">{message}</div>
          </div>
          <button onClick={onClose} className="flex-shrink-0 p-1 rounded hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-border-light">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded border border-border-light bg-white text-text-primary hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded transition-colors disabled:opacity-50 flex items-center gap-2',
              config.btnClass
            )}
          >
            {loading && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

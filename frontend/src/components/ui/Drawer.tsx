'use client';

import { useEffect, useRef, ReactNode } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

type DrawerPosition = 'right' | 'left';
type DrawerSize = 'sm' | 'md' | 'lg' | 'xl';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  position?: DrawerPosition;
  size?: DrawerSize;
  showOverlay?: boolean;
}

const sizeMap: Record<DrawerSize, string> = {
  sm: 'w-[360px]',
  md: 'w-[480px]',
  lg: 'w-[640px]',
  xl: 'w-[800px]',
};

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  position = 'right',
  size = 'md',
  showOverlay = true,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    // Prevent body scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const isRight = position === 'right';

  return (
    <div className="fixed inset-0 z-[8000]">
      {/* Overlay */}
      {showOverlay && (
        <div
          onClick={onClose}
          className="absolute inset-0 bg-black/30 transition-opacity"
        />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        className={clsx(
          'absolute top-0 bottom-0 bg-white shadow-2xl flex flex-col max-w-full transition-transform duration-300',
          sizeMap[size],
          isRight ? 'right-0' : 'left-0'
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-light flex-shrink-0">
            <h2 className="text-base font-semibold text-text-primary">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex-shrink-0 px-6 py-4 border-t border-border-light bg-gray-50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

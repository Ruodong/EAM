import clsx from 'clsx';
import { statusBgColors, statusColors } from '@/lib/constants';

interface StatusBadgeProps {
  status: string;
  variant?: 'badge' | 'text';
}

export function StatusBadge({ status, variant = 'badge' }: StatusBadgeProps) {
  if (variant === 'text') {
    return (
      <span className={clsx('text-sm font-medium', statusColors[status] || 'text-text-secondary')}>
        {status}
      </span>
    );
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        statusBgColors[status] || 'bg-gray-50 text-text-secondary'
      )}
    >
      {status}
    </span>
  );
}

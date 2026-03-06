import clsx from 'clsx';

interface StatsCardProps {
  label: string;
  value: number | string;
  color?: string;
  className?: string;
}

export function StatsCard({ label, value, color = 'text-primary-blue', className }: StatsCardProps) {
  return (
    <div className={clsx('bg-white rounded-lg border border-border-light p-4 flex flex-col items-center justify-center min-w-[120px]', className)}>
      <span className={clsx('text-2xl font-bold', color)}>{value}</span>
      <span className="text-xs text-text-secondary mt-1 text-center">{label}</span>
    </div>
  );
}

'use client';

import clsx from 'clsx';

interface StatusTab {
  label: string;
  value: string;
  count?: number;
}

interface StatusTabsProps {
  tabs: StatusTab[];
  activeTab: string;
  onTabChange: (value: string) => void;
}

export function StatusTabs({ tabs, activeTab, onTabChange }: StatusTabsProps) {
  return (
    <div className="flex items-center gap-1 mb-4 border-b border-border-light">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          className={clsx(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
            activeTab === tab.value
              ? 'border-primary-blue text-primary-blue'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={clsx(
              'ml-1.5 px-1.5 py-0.5 rounded-full text-xs',
              activeTab === tab.value
                ? 'bg-blue-50 text-primary-blue'
                : 'bg-gray-100 text-text-secondary'
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

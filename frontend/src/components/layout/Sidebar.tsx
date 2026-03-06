'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import { sidebarNavItems, NavItem } from '@/lib/constants';

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

function NavItemComponent({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const hasChildren = item.children && item.children.length > 0;
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const isChildActive = hasChildren && item.children!.some(
    (child) => pathname === child.href || pathname.startsWith(child.href + '/')
  );
  const [expanded, setExpanded] = useState(isActive || isChildActive);

  const Icon = item.icon;

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={clsx(
            'w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded transition-colors',
            isActive || isChildActive
              ? 'bg-red-50 text-lenovo-red font-medium'
              : 'text-text-primary hover:bg-gray-50'
          )}
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left truncate">{item.label}</span>
              <ChevronDown
                className={clsx(
                  'w-3.5 h-3.5 transition-transform flex-shrink-0',
                  expanded ? 'rotate-0' : '-rotate-90'
                )}
              />
            </>
          )}
        </button>
        {expanded && !collapsed && (
          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border-light pl-3">
            {item.children!.map((child) => {
              const isChildItemActive = pathname === child.href;
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={clsx(
                    'block px-3 py-2 text-sm rounded transition-colors',
                    isChildItemActive
                      ? 'text-lenovo-red font-medium bg-red-50'
                      : 'text-text-secondary hover:text-text-primary hover:bg-gray-50'
                  )}
                >
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={clsx(
        'flex items-center gap-3 px-3 py-2.5 text-sm rounded transition-colors',
        isActive
          ? 'bg-red-50 text-lenovo-red font-medium'
          : 'text-text-primary hover:bg-gray-50'
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

export function Sidebar({ collapsed = false, onToggleCollapse }: SidebarProps) {
  return (
    <aside
      className={clsx(
        'h-[calc(100vh-56px)] bg-white border-r border-border-light flex flex-col transition-all duration-200 sticky top-14',
        collapsed ? 'w-14' : 'w-sidebar'
      )}
    >
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {sidebarNavItems.map((item) => (
          <NavItemComponent key={item.href + item.label} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border-light p-2">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-2 hover:bg-gray-50 rounded transition-colors text-text-secondary"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <ChevronLeft
            className={clsx(
              'w-4 h-4 transition-transform',
              collapsed && 'rotate-180'
            )}
          />
        </button>
      </div>
    </aside>
  );
}

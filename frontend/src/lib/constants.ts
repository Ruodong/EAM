import {
  Home,
  FolderKanban,
  ClipboardCheck,
  Award,
  LayoutGrid,
  Layers,
  Server,
  Database,
  BookOpen,
  BarChart3,
  Settings,
  HelpCircle,
  Shield,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: any;
  children?: NavItem[];
}

export const sidebarNavItems: NavItem[] = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  {
    label: 'EA Review',
    href: '/ea-review',
    icon: ClipboardCheck,
    children: [
      { label: 'Request Summary', href: '/ea-review/request-summary', icon: ClipboardCheck },
      { label: 'Meetings', href: '/ea-review/meetings', icon: ClipboardCheck },
      { label: 'Actions', href: '/ea-review/actions', icon: ClipboardCheck },
      { label: 'EA Calendar', href: '/ea-review/calendar', icon: ClipboardCheck },
    ],
  },
  { label: 'Certification', href: '/certification', icon: Award },
  {
    label: 'Application Management',
    href: '/app-management',
    icon: LayoutGrid,
    children: [
      { label: 'Business Capability Mapping', href: '/app-management/bcm', icon: LayoutGrid },
      { label: 'BCPF Master Data', href: '/app-management/bcpf', icon: LayoutGrid },
    ],
  },
  {
    label: 'Technology Stack',
    href: '/tech-stack',
    icon: Layers,
    children: [
      { label: 'Technology Stack', href: '/tech-stack', icon: Layers },
      { label: 'Technology Stack Master Data', href: '/tech-stack/master-data', icon: Layers },
    ],
  },
  { label: 'Platform Engineering', href: '/platform-engineering', icon: Server },
  {
    label: 'Master Data',
    href: '/master-data',
    icon: Database,
    children: [
      { label: 'Master Data', href: '/master-data', icon: Database },
    ],
  },
  { label: 'Resources', href: '/resources', icon: BookOpen },
  {
    label: 'Reports',
    href: '/reports',
    icon: BarChart3,
    children: [
      { label: 'Reports', href: '/reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    children: [
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
  { label: 'Help', href: '/help', icon: HelpCircle },
  {
    label: 'Data Privacy & Protection',
    href: '/data-privacy',
    icon: Shield,
    children: [
      { label: 'Data Privacy & Protection', href: '/data-privacy', icon: Shield },
    ],
  },
];

export const statusColors: Record<string, string> = {
  Completed: 'text-status-completed',
  'In Progress': 'text-status-in-progress',
  Submitted: 'text-status-submitted',
  Draft: 'text-status-draft',
  'Accepted by EA': 'text-status-accepted',
  Approved: 'text-status-completed',
  'Approved with Actions': 'text-status-completed',
  Rejected: 'text-red-500',
  Open: 'text-status-in-progress',
  'In Validation': 'text-status-submitted',
  Closed: 'text-status-completed',
  Available: 'text-status-completed',
  Booked: 'text-status-submitted',
  Expired: 'text-status-draft',
};

export const statusBgColors: Record<string, string> = {
  Completed: 'bg-green-50 text-status-completed',
  'In Progress': 'bg-orange-50 text-status-in-progress',
  Submitted: 'bg-blue-50 text-status-submitted',
  Draft: 'bg-gray-50 text-status-draft',
  'Accepted by EA': 'bg-purple-50 text-status-accepted',
  Approved: 'bg-green-50 text-status-completed',
  Open: 'bg-orange-50 text-status-in-progress',
  Closed: 'bg-green-50 text-status-completed',
};

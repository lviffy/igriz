import type { TabType } from './types';
import { User, Settings, Bell, Star, Database, Cloud, Laptop, Github, Wrench, List } from 'lucide-react';

// Vercel icon component
const VercelIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4">
    <path fill="currentColor" d="M12 2L2 19.777h20L12 2z" />
  </svg>
);

// Supabase icon component
const SupabaseIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4">
    <path
      fill="currentColor"
      d="M21.362 9.354H12V.396a.396.396 0 0 0-.716-.233L2.203 12.424l-.401.562a1.04 1.04 0 0 0 .836 1.659H12V21.6a.396.396 0 0 0 .716.233l9.081-12.261.401-.562a1.04 1.04 0 0 0-.836-1.656z"
    />
  </svg>
);

export const TAB_ICONS: Record<TabType, React.ComponentType<{ className?: string }>> = {
  profile: User,
  settings: Settings,
  notifications: Bell,
  features: Star,
  data: Database,
  'cloud-providers': Cloud,
  'local-providers': Laptop,
  github: Github,
  vercel: () => <VercelIcon />,
  supabase: () => <SupabaseIcon />,
  'event-logs': List,
  mcp: Wrench,
};

export const TAB_LABELS: Record<TabType, string> = {
  profile: 'Profile',
  settings: 'Settings',
  notifications: 'Notifications',
  features: 'Features',
  data: 'Data Management',
  'cloud-providers': 'Cloud Providers',
  'local-providers': 'Local Providers',
  github: 'GitHub',
  vercel: 'Vercel',
  supabase: 'Supabase',
  'event-logs': 'Event Logs',
  mcp: 'MCP Servers',
};

export const TAB_DESCRIPTIONS: Record<TabType, string> = {
  profile: 'Manage your profile and account settings',
  settings: 'Configure application preferences',
  notifications: 'View and manage your notifications',
  features: 'Explore new and upcoming features',
  data: 'Manage your data and storage',
  'cloud-providers': 'Configure cloud AI providers and models',
  'local-providers': 'Configure local AI providers and models',
  github: 'Connect and manage GitHub integration',
  vercel: 'Manage Vercel projects and deployments',
  supabase: 'Setup Supabase database connection',
  'event-logs': 'View system events and logs',
  mcp: 'Configure MCP (Model Context Protocol) servers',
};

export const DEFAULT_TAB_CONFIG = [
  // User Window Tabs (Always visible by default)
  { id: 'features', visible: true, window: 'user' as const, order: 0 },
  { id: 'data', visible: true, window: 'user' as const, order: 1 },
  { id: 'cloud-providers', visible: true, window: 'user' as const, order: 2 },
  { id: 'local-providers', visible: true, window: 'user' as const, order: 3 },
  { id: 'github', visible: true, window: 'user' as const, order: 4 },
  { id: 'vercel', visible: true, window: 'user' as const, order: 5 },
  { id: 'supabase', visible: true, window: 'user' as const, order: 6 },
  { id: 'notifications', visible: true, window: 'user' as const, order: 9 },
  { id: 'event-logs', visible: true, window: 'user' as const, order: 10 },
  { id: 'mcp', visible: true, window: 'user' as const, order: 11 },

  // User Window Tabs (In dropdown, initially hidden)
];

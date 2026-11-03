import {
  LayoutDashboard,
  Armchair,
  BookOpen,
  Users,
  ReceiptText,
  TrendingUp,
  Clock,
  AlertTriangle,
} from 'lucide-react';

// Role-specific navigation. `id` is the internal view id, `path` is the hash route.
export const ADMIN_NAV = [
  { id: 'admin-dashboard', path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'admin-tables', path: '/admin/tables', label: 'Tables', icon: Armchair },
  { id: 'admin-menu', path: '/admin/menu', label: 'Food Menu', icon: BookOpen },
  { id: 'admin-waiters', path: '/admin/waiters', label: 'Waiters', icon: Users },
  { id: 'admin-orders', path: '/admin/orders', label: 'All Orders', icon: Clock },
  { id: 'admin-bills', path: '/admin/bills', label: 'Bills & Approvals', icon: ReceiptText, badge: 'pending' },
  { id: 'admin-revenue', path: '/admin/revenue', label: 'Revenue', icon: TrendingUp },
];

export const WAITER_NAV = [
  { id: 'waiter-tables', path: '/waiter', label: 'Tables', icon: Armchair },
  { id: 'waiter-submitted-bills', path: '/waiter/bills', label: 'My Bills', icon: ReceiptText, badge: 'pending' },
  { id: 'waiter-rejected-bills', path: '/waiter/rejected', label: 'Fix Rejected', icon: AlertTriangle, badge: 'rejected', hideWhenZero: true },
];

export const ROLE_HOME = { admin: '/admin', waiter: '/waiter' };

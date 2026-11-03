import React, { useEffect, useMemo, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DhabaProvider, useDhaba } from './context/DhabaContext';
import { LoginModal } from './components/auth/LoginModal';
import { AppShell } from './components/layout/AppShell';
import { ADMIN_NAV, WAITER_NAV, ROLE_HOME } from './lib/navConfig';
import { useHashRoute } from './lib/useHashRoute';

// Admin Components
import { AdminDashboard } from './components/admin/AdminDashboard';
import { TableManagement } from './components/admin/TableManagement';
import { MenuManagement } from './components/admin/MenuManagement';
import { WaiterManagement } from './components/admin/WaiterManagement';
import { AllOrders } from './components/admin/AllOrders';
import { BillManagement } from './components/admin/BillManagement';
import { RevenueReports } from './components/admin/RevenueReports';
import { BillDetailModal } from './components/admin/BillDetailModal';

// Waiter Components
import { WaiterTableSelection } from './components/waiter/WaiterTableSelection';
import { WaiterOrderManagement } from './components/waiter/WaiterOrderManagement';
import { WaiterSubmittedBills } from './components/waiter/WaiterSubmittedBills';

import { RefreshCw } from 'lucide-react';

const LoadingScreen = () => (
  <div className="min-h-dvh bg-background text-foreground flex items-center justify-center p-4">
    <section role="status" aria-live="polite" className="w-full max-w-sm rounded-2xl border border-border bg-surface px-6 py-8 shadow-md flex flex-col items-center text-center">
      <img src={`${import.meta.env.BASE_URL}logo.webp`} alt="MLA Desi Dhaba" className="w-20 h-20 rounded-full object-cover mb-4 ring-4 ring-primary-soft" />
      <h2 className="text-base font-semibold text-foreground">MLA Desi Dhaba</h2>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
        <RefreshCw className="w-4 h-4 animate-spin text-primary" />
        <span>Loading…</span>
      </div>
    </section>
  </div>
);

// ---------------------------------------------------------------- Admin
const AdminApp = ({ path, navigate }) => {
  const { profile, user, signOut } = useAuth();
  const { bills } = useDhaba();
  const [billModal, setBillModal] = useState(null);

  const active = ADMIN_NAV.find((n) => n.path === path) || ADMIN_NAV[0];
  const goToView = (viewId) => {
    const item = ADMIN_NAV.find((n) => n.id === viewId);
    if (item) navigate(item.path);
  };

  const badges = { pending: bills.filter((b) => b.status === 'pending_approval').length };

  return (
    <AppShell
      navItems={ADMIN_NAV}
      activeId={active.id}
      onNavigate={(item) => navigate(item.path)}
      roleLabel="Admin"
      userName={profile?.full_name || user?.email}
      userEmail={profile?.email || user?.email}
      onSignOut={signOut}
      badges={badges}
    >
      {active.id === 'admin-dashboard' && (
        <AdminDashboard onViewChange={goToView} onSelectBill={setBillModal} />
      )}
      {active.id === 'admin-tables' && <TableManagement />}
      {active.id === 'admin-menu' && <MenuManagement />}
      {active.id === 'admin-waiters' && <WaiterManagement />}
      {active.id === 'admin-orders' && <AllOrders />}
      {active.id === 'admin-bills' && <BillManagement />}
      {active.id === 'admin-revenue' && <RevenueReports />}

      {billModal && (
        <BillDetailModal
          bill={billModal}
          onClose={() => setBillModal(null)}
          onApprove={() => setBillModal(null)}
          onReject={() => setBillModal(null)}
        />
      )}
    </AppShell>
  );
};

// --------------------------------------------------------------- Waiter
const WaiterApp = ({ path, navigate }) => {
  const { profile, user, signOut } = useAuth();
  const { bills, tables, fetchData } = useDhaba();

  // Order page route: /waiter/order/<tableId>
  const orderMatch = path.match(/^\/waiter\/order\/([^/]+)$/);
  const orderTableId = orderMatch ? decodeURIComponent(orderMatch[1]) : null;
  const orderTable = orderTableId ? tables.find((t) => t.id === orderTableId) : null;

  const active = orderMatch
    ? WAITER_NAV[0]
    : WAITER_NAV.find((n) => n.path === path) || WAITER_NAV[0];

  const mine = bills.filter((b) => b.waiter_id === user?.id);
  const badges = {
    pending: mine.filter((b) => b.status === 'pending_approval').length,
    rejected: mine.filter((b) => b.status === 'rejected').length,
  };

  const openTable = (table) => navigate(`/waiter/order/${encodeURIComponent(table.id)}`);

  return (
    <AppShell
      navItems={WAITER_NAV}
      activeId={active.id}
      onNavigate={(item) => navigate(item.path)}
      roleLabel="Waiter"
      userName={profile?.full_name || user?.email}
      userEmail={profile?.email || user?.email}
      onSignOut={signOut}
      badges={badges}
    >
      {!orderMatch && active.id === 'waiter-tables' && <WaiterTableSelection onSelectTable={openTable} />}

      {orderMatch && orderTable && (
        <WaiterOrderManagement
          table={orderTable}
          onBack={() => navigate('/waiter')}
          onBillSubmitted={() => {
            navigate('/waiter/bills');
            fetchData();
          }}
        />
      )}
      {orderMatch && !orderTable && (
        <section role="status" className="mx-4 mt-4 rounded-xl border border-border bg-surface p-5 text-sm text-muted-foreground shadow-sm sm:mx-6 sm:mt-6 sm:p-6">
          <h2 className="text-base font-semibold text-foreground">Table unavailable</h2>
          <p className="mt-1">Table not found. Please pick a table from the list.</p>
        </section>
      )}

      {active.id === 'waiter-submitted-bills' && (
        <WaiterSubmittedBills onCorrectOrder={openTable} defaultFilter="all" />
      )}
      {active.id === 'waiter-rejected-bills' && (
        <WaiterSubmittedBills onCorrectOrder={openTable} defaultFilter="rejected" />
      )}
    </AppShell>
  );
};

// ------------------------------------------------------- Route guard
const DhabaAppContent = () => {
  const { user, role, isAdmin, isWaiter, loading } = useAuth();
  const [path, navigate] = useHashRoute();

  // Which role-area the current URL belongs to
  const area = useMemo(() => {
    if (path === '/admin' || path.startsWith('/admin/')) return 'admin';
    if (path === '/waiter' || path.startsWith('/waiter/')) return 'waiter';
    return null;
  }, [path]);

  // Central redirect logic. The role always comes from the verified profile.
  useEffect(() => {
    if (loading) return;
    if (!user || !role) {
      if (path !== '/login') navigate('/login', { replace: true });
      return;
    }
    const home = ROLE_HOME[role];
    if (area !== role) navigate(home, { replace: true });
  }, [loading, user, role, area, path, navigate]);

  if (loading) return <LoadingScreen />;

  if (!user || !role) return <LoginModal />;

  // While the redirect effect runs, never render another role's UI.
  if (isAdmin && area === 'admin') return <AdminApp path={path} navigate={navigate} />;
  if (isWaiter && area === 'waiter') return <WaiterApp path={path} navigate={navigate} />;
  return <LoadingScreen />;
};

export default function App() {
  return (
    <AuthProvider>
      <DhabaProviderGate />
    </AuthProvider>
  );
}

// Only mount data fetching / realtime once a verified session exists.
const DhabaProviderGate = () => {
  const { user, role } = useAuth();
  if (user && role) {
    return (
      <DhabaProvider>
        <DhabaAppContent />
      </DhabaProvider>
    );
  }
  return <DhabaAppContentNoData />;
};

const DhabaAppContentNoData = () => {
  const { user, role, loading } = useAuth();
  const [path, navigate] = useHashRoute();
  useEffect(() => {
    if (!loading && (!user || !role) && path !== '/login') navigate('/login', { replace: true });
  }, [loading, user, role, path, navigate]);
  if (loading) return <LoadingScreen />;
  return <LoginModal />;
};
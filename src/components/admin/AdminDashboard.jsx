import React, { useMemo, useState } from 'react';
import { useDhaba } from '../../context/DhabaContext';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../lib/supabase';
import { 
  TrendingUp, 
  Calendar, 
  Clock, 
  Armchair, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ReceiptText, 
  ArrowRight,
  Eye,
  Check,
  X,
  Users,
  UserRound,
  ShoppingBag
} from 'lucide-react';
import { notify } from '../../lib/notifications';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const AdminDashboard = ({ onViewChange, onSelectBill }) => {
  const { user } = useAuth();
  const { tables, orders, waiters, getMetrics, approveBill, rejectBill } = useDhaba();
  const metrics = getMetrics();
  const activeOrders = orders.filter((order) => ['active', 'in_review', 'correction'].includes(order.status));
  const availableTables = tables.filter((table) => table.is_active && table.status === 'available').length;
  const weeklyRevenue = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = date.toLocaleDateString('en-CA');
    const amount = metrics.allApprovedList.reduce((total, bill) =>
      bill.approved_at?.slice(0, 10) === key ? total + Number(bill.total_amount || 0) : total, 0);
    return { key, label: date.toLocaleDateString([], { weekday: 'short' }), amount };
  }), [metrics.allApprovedList]);
  const maxDailyRevenue = Math.max(...weeklyRevenue.map((day) => day.amount), 1);

  const [rejectingBillId, setRejectingBillId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const handleApprove = async (billId) => {
    setActionLoading(true);
    setActionError('');
    try {
      await approveBill(billId, user.id);
      notify.success('Bill approved. The table is available again.', 'bill-approved');
    } catch (err) {
      console.error('Bill approval failed:', err);
      setActionError('Could not approve this bill. Please try again.');
      notify.error('Could not approve this bill.', 'bill-approval-error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setActionError('Please specify a rejection reason');
      notify.warning('A rejection reason is required.', 'bill-rejection-validation');
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      await rejectBill(rejectingBillId, user.id, rejectionReason.trim());
      notify.success('Bill returned to the waiter for correction.', 'bill-rejected');
      setRejectingBillId(null);
      setRejectionReason('');
    } catch (err) {
      console.error('Bill rejection failed:', err);
      setActionError('Could not reject this bill. Please try again.');
      notify.error('Could not reject this bill.', 'bill-rejection-error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-3 py-4 text-foreground sm:px-6 sm:py-6">
      {/* Welcome & Live Status Header */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-surface p-4 text-foreground shadow-sm sm:flex-row sm:items-center sm:p-5">
        <div>
          <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            Admin Control Center
          </span>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground">
            MLA Desi Dhaba Operations
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time revenue, running table orders, and pending bill approvals.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onViewChange('admin-bills')}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover"
          >
            <ReceiptText className="w-3.5 h-3.5" />
            <span>Pending Bills ({metrics.pendingBillsCount})</span>
          </button>
          <button
            onClick={() => onViewChange('admin-revenue')}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Revenue Breakdown</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger-foreground">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-6 sm:gap-4">
        {/* Today's Revenue */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="mb-1 flex items-center justify-between text-sm font-semibold text-muted-foreground">
            <span>Today's Revenue</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success-soft text-success-foreground">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-success-foreground">
            {formatINR(metrics.todayRevenue)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs font-medium text-foreground">
            <CheckCircle2 className="h-3 w-3 text-success" />
            <span>{metrics.todayCount} approved {metrics.todayCount === 1 ? 'bill' : 'bills'} today</span>
          </div>
        </div>

        {/* This Month's Revenue */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="mb-1 flex items-center justify-between text-sm font-semibold text-muted-foreground">
            <span>This Month's Revenue</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-foreground">
            {formatINR(metrics.monthRevenue)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs font-medium text-foreground">
            <CheckCircle2 className="h-3 w-3 text-primary" />
            <span>{metrics.monthCount} bills approved this month</span>
          </div>
        </div>

        {/* Currently Occupied Tables */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="mb-1 flex items-center justify-between text-sm font-semibold text-muted-foreground">
            <span>Occupied Tables</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning-soft text-warning-foreground">
              <Armchair className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-primary">
            {metrics.occupiedTablesCount} <span className="text-sm font-normal text-muted-foreground">/ {tables.length}</span>
          </div>
          <div className="mt-1 text-xs font-medium text-foreground">
            Active dining guests
          </div>
        </div>

        {/* Pending Bills Awaiting Approval */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="mb-1 flex items-center justify-between text-sm font-semibold text-muted-foreground">
            <span>Pending Approvals</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              metrics.pendingBillsCount > 0 ? 'bg-danger-soft text-danger-foreground' : 'bg-surface-muted text-muted-foreground'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl sm:text-xl font-bold ${
            metrics.pendingBillsCount > 0 ? 'text-danger-foreground' : 'text-foreground'
          }`}>
            {metrics.pendingBillsCount}
          </div>
          <div className="mt-1 text-xs font-medium text-foreground">
            Requires admin action
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="mb-1 flex items-center justify-between text-sm font-semibold text-muted-foreground"><span>Total Orders</span><ShoppingBag className="h-4 w-4 text-primary" /></div>
          <div className="text-xl font-bold text-foreground">{orders.length}</div>
          <div className="mt-1 text-xs text-muted-foreground">{activeOrders.length} currently open</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="mb-1 flex items-center justify-between text-sm font-semibold text-muted-foreground"><span>Available Tables</span><Armchair className="h-4 w-4 text-success" /></div>
          <div className="text-xl font-bold text-foreground">{availableTables}</div>
          <div className="mt-1 text-xs text-muted-foreground">Ready for new guests</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <section className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5 xl:col-span-2">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Approved bill revenue</p><h3 className="mt-1 text-lg font-bold text-foreground">Last seven days</h3></div>
            <span className="rounded-full bg-surface-muted px-3 py-1.5 text-xs text-muted-foreground">Live data</span>
          </div>
          <div className="h-56 w-full" role="img" aria-label="Daily approved revenue over the last seven days">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyRevenue} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} />
                <YAxis hide domain={[0, maxDailyRevenue]} />
                <Tooltip formatter={(value) => formatINR(value)} labelFormatter={(label, payload) => payload?.[0]?.payload?.key || label} contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: 10, color: 'var(--color-foreground)' }} />
                <Bar dataKey="amount" name="Approved revenue" fill={getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()} radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">On the floor</p><h3 className="mt-1 text-lg font-bold text-foreground">Waiter team</h3></div><Users className="h-5 w-5 text-primary" /></div>
          {waiters.length ? <div className="space-y-3 max-h-52 overflow-y-auto">
            {waiters.slice(0, 6).map((waiter) => {
              const assigned = activeOrders.filter((order) => order.waiter_id === waiter.id).length;
              return <div key={waiter.id} className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary"><UserRound className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-foreground">{waiter.full_name}</p><p className="text-xs text-muted-foreground">{assigned} open {assigned === 1 ? 'table' : 'tables'}</p></div><span className="h-2 w-2 rounded-full bg-success" title="Active" /></div>;
            })}
          </div> : <p className="py-8 text-center text-sm text-muted-foreground">No active waiter profiles.</p>}
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Service activity</p><h3 className="mt-1 text-lg font-bold text-foreground">Recent orders</h3></div><button onClick={() => onViewChange('admin-orders')} className="min-h-10 rounded-md px-2 text-sm font-semibold text-primary hover:bg-primary-soft">View all <ArrowRight className="inline h-4 w-4" /></button></div>
        {orders.slice(0, 5).length ? <div className="divide-y divide-border">{orders.slice(0, 5).map((order) => {
          const amount = order.order_items?.reduce((sum, item) => sum + Number(item.unit_price) * Number(item.quantity), 0) || 0;
          return <div key={order.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:gap-5 sm:px-5"><div className="min-w-20"><p className="text-sm font-bold text-foreground">{order.restaurant_tables?.table_number || 'Table'}</p><p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p></div><p className="min-w-28 flex-1 text-sm text-muted-foreground">{order.profiles?.full_name || 'Waiter not available'}</p><span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-foreground">{order.status.replace('_', ' ')}</span><strong className="text-sm text-success-foreground">{formatINR(amount)}</strong></div>;
        })}</div> : <div className="py-10 text-center text-sm text-muted-foreground">Orders will appear here as service begins.</div>}
      </section>

      {/* Main Grid: Pending Action Items & Recent Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Bills Requiring Admin Action */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border bg-surface-muted px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground sm:text-base">
                Pending Bills Requiring Action
              </h3>
            </div>
            <button
              onClick={() => onViewChange('admin-bills')}
              className="inline-flex min-h-10 items-center gap-1 rounded-md px-2 text-sm font-semibold text-primary hover:bg-primary-soft"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 flex-1">
            {metrics.pendingBillsList.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-success" />
                <p className="text-sm font-semibold text-foreground">All Clear!</p>
                <p className="text-sm text-muted-foreground">There are no pending bills waiting for approval right now.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.pendingBillsList.map((bill) => (
                  <div 
                    key={bill.id} 
                    className="flex flex-col justify-between gap-4 rounded-lg border border-border bg-surface-muted p-4 transition-all hover:border-primary/40 sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded-md bg-primary-soft px-2 py-1 font-mono text-xs font-bold text-primary">
                          {bill.bill_number}
                        </span>
                        <span className="rounded-md bg-success-soft px-2 py-1 text-xs font-semibold text-success-foreground">
                          Table: {bill.restaurant_tables?.table_number || 'N/A'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Waiter: {bill.waiter?.full_name || 'Waiter'}
                        </span>
                      </div>
                      
                      {/* Summary of items */}
                      <div className="mt-2 text-sm text-foreground">
                        {bill.bill_items?.slice(0, 3).map((item, idx) => (
                          <span key={idx} className="inline-block mr-2">
                            {item.quantity}× {item.item_name}
                          </span>
                        ))}
                        {bill.bill_items?.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{bill.bill_items.length - 3} more</span>
                        )}
                      </div>

                      <div className="mt-1 text-sm font-bold text-success-foreground">
                        Total: {formatINR(bill.total_amount)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onSelectBill ? onSelectBill(bill) : onViewChange('admin-bills')}
                        className="inline-flex min-h-10 items-center gap-1 rounded-md border border-border bg-surface px-3 text-sm font-semibold text-foreground hover:bg-surface-muted"
                        title="View Full Bill Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Details</span>
                      </button>

                      <button
                        disabled={actionLoading}
                        onClick={() => handleApprove(bill.id)}
                        className="inline-flex min-h-10 items-center gap-1 rounded-md bg-primary px-3.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>

                      <button
                        disabled={actionLoading}
                        onClick={() => setRejectingBillId(bill.id)}
                        className="inline-flex min-h-10 items-center gap-1 rounded-md bg-danger-soft px-3.5 text-sm font-semibold text-danger-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Approved Bills */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-border bg-surface-muted px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <h3 className="text-sm font-bold text-foreground sm:text-base">
                Recent Approved Bills
              </h3>
            </div>
            <button
              onClick={() => onViewChange('admin-revenue')}
              className="min-h-10 rounded-md px-2 text-sm font-semibold text-primary hover:bg-primary-soft"
            >
              Reports
            </button>
          </div>

          <div className="p-4 flex-1">
            {metrics.recentApprovedList.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <ReceiptText className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-xs">No approved bills yet today.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.recentApprovedList.map((bill) => (
                  <div 
                    key={bill.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-surface-muted p-3 transition-colors hover:bg-surface"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {bill.bill_number}
                        </span>
                        <span className="rounded-full bg-success-soft px-2 py-1 text-xs font-semibold text-success-foreground">
                          {bill.restaurant_tables?.table_number || 'T-?'}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {bill.approved_at ? new Date(bill.approved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-success-foreground">
                        {formatINR(bill.total_amount)}
                      </div>
                      <span className="text-xs font-semibold text-success-foreground">
                        Added to Revenue
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectingBillId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/45 sm:items-center sm:p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="dashboard-reject-title" className="w-full rounded-t-xl border border-border bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-lg sm:max-w-md sm:rounded-xl sm:p-6">
            <div className="mb-2 flex items-center gap-2 text-lg font-bold text-danger-foreground">
              <XCircle className="w-5 h-5" />
              <span id="dashboard-reject-title">Reject Bill & Return to Waiter</span>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Please specify why this bill is being rejected. The waiter will be notified and can correct the items before resubmitting.
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label htmlFor="dashboard-rejection-reason" className="mb-1 block text-sm font-semibold uppercase text-foreground">
                  Rejection Reason *
                </label>
                <textarea
                  id="dashboard-rejection-reason"
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Table 2 ordered 2 Dal Makhani instead of 3, or price mismatch..."
                  className="min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger/20 sm:text-sm"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingBillId(null);
                    setRejectionReason('');
                  }}
                  className="min-h-10 rounded-md border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:bg-surface-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="min-h-10 rounded-md bg-danger-soft px-4 text-sm font-semibold text-danger-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
                >
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

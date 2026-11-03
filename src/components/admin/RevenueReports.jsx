import React, { useState, useMemo } from 'react';
import { useDhaba } from '../../context/DhabaContext';
import { formatINR } from '../../lib/supabase';
import { notify } from '../../lib/notifications';
import { 
  TrendingUp, 
  Calendar, 
  ReceiptText, 
  Download, 
  Filter, 
  CheckCircle2, 
  ArrowUpRight,
  ChevronRight
} from 'lucide-react';

export const RevenueReports = () => {
  const { getMetrics } = useDhaba();
  const metrics = getMetrics();

  const [dateFilter, setDateFilter] = useState(''); // 'YYYY-MM-DD' or ''

  // Group approved bills by day (based on approved_at timestamp)
  const dailyBreakdown = useMemo(() => {
    const map = {};

    metrics.allApprovedList.forEach((bill) => {
      if (!bill.approved_at) return;
      const dayKey = bill.approved_at.slice(0, 10); // 'YYYY-MM-DD'
      if (!map[dayKey]) {
        map[dayKey] = {
          date: dayKey,
          count: 0,
          totalRevenue: 0,
          bills: []
        };
      }
      map[dayKey].count += 1;
      map[dayKey].totalRevenue += Number(bill.total_amount) || 0;
      map[dayKey].bills.push(bill);
    });

    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }, [metrics.allApprovedList]);

  // Filtered bills based on user date filter
  const filteredApprovedBills = useMemo(() => {
    if (!dateFilter) return metrics.allApprovedList;
    return metrics.allApprovedList.filter((b) => b.approved_at && b.approved_at.startsWith(dateFilter));
  }, [metrics.allApprovedList, dateFilter]);

  const filteredTotal = useMemo(() => {
    return filteredApprovedBills.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
  }, [filteredApprovedBills]);

  const exportCSV = () => {
    const headers = ['Bill Number,Table,Waiter,Total Amount (INR),Approved At\n'];
    const rows = filteredApprovedBills.map((b) => {
      return `"${b.bill_number}","${b.restaurant_tables?.table_number || ''}","${b.waiter?.full_name || ''}",${b.total_amount},"${b.approved_at}"`;
    });

    const blob = new Blob([headers.concat(rows.join('\n'))], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mla_revenue_report_${dateFilter || 'all'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    notify.success('Revenue report exported.', 'revenue-exported');
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-3 py-4 text-foreground sm:px-6 sm:py-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:p-5">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <TrendingUp className="h-6 w-6 text-primary" />
            <span>Revenue & Financial Reports</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Audited revenue calculated strictly from approved bills in the database.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Revenue */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          <div className="mb-2 flex items-center justify-between text-sm font-semibold text-muted-foreground">
            <span>Today's Total Revenue</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success-soft text-success-foreground">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-success-foreground sm:text-3xl">
            {formatINR(metrics.todayRevenue)}
          </div>
          <div className="mt-1 text-sm font-medium text-muted-foreground">
            From {metrics.todayCount} approved bills today
          </div>
        </div>

        {/* Daily Approved Bill Count */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          <div className="mb-2 flex items-center justify-between text-sm font-semibold text-muted-foreground">
            <span>Today's Bill Count</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success-soft text-success-foreground">
              <ReceiptText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground sm:text-3xl">
            {metrics.todayCount}
          </div>
          <div className="mt-1 text-sm font-medium text-muted-foreground">
            Daily approved table settlements
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          <div className="mb-2 flex items-center justify-between text-sm font-semibold text-muted-foreground">
            <span>Monthly Total Revenue</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-primary sm:text-3xl">
            {formatINR(metrics.monthRevenue)}
          </div>
          <div className="mt-1 text-sm font-medium text-muted-foreground">
            For current calendar month
          </div>
        </div>

        {/* Monthly Approved Bill Count */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          <div className="mb-2 flex items-center justify-between text-sm font-semibold text-muted-foreground">
            <span>Monthly Bill Count</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning-soft text-warning-foreground">
              <ReceiptText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground sm:text-3xl">
            {metrics.monthCount}
          </div>
          <div className="mt-1 text-sm font-medium text-muted-foreground">
            Total approved bills this month
          </div>
        </div>
      </div>

      {/* Date Filter & Breakdown Section */}
      <div className="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
            <Calendar className="h-4 w-4 text-primary" />
            <span>Audited Bill History</span>
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="revenue-date-filter" className="text-sm font-semibold text-muted-foreground">Filter Date:</label>
            <input
              id="revenue-date-filter"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="min-h-11 rounded-md border border-border bg-surface-muted px-3 text-base font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="min-h-10 rounded-md px-2 text-sm font-semibold text-muted-foreground underline hover:text-danger-foreground"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {dateFilter && (
          <div className="flex flex-col justify-between gap-2 rounded-lg border border-border bg-surface-muted p-3 text-sm sm:flex-row sm:items-center">
            <span className="font-semibold text-foreground">
              Filtered Date: {dateFilter} ({filteredApprovedBills.length} approved bills)
            </span>
            <span className="font-bold text-success-foreground">
              Total: {formatINR(filteredTotal)}
            </span>
          </div>
        )}

        {/* Daily Grouped Summary Table */}
        <div className="space-y-3 md:overflow-x-auto">
          <table className="hidden w-full text-left text-sm md:table">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 text-center">Approved Bills Count</th>
                <th className="py-2.5 px-3 text-right">Recognized Revenue</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {dailyBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    No approved revenue history recorded yet.
                  </td>
                </tr>
              ) : (
                dailyBreakdown.map((row) => (
                  <tr key={row.date} className="transition-colors hover:bg-surface-muted">
                    <td className="px-3 py-3 font-semibold text-foreground">
                      {new Date(row.date).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-3 py-3 text-center font-medium text-muted-foreground">
                      {row.count} bills
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-success-foreground">
                      {formatINR(row.totalRevenue)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success-foreground">
                        <CheckCircle2 className="w-3 h-3" />
                        Audited
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {dailyBreakdown.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground md:hidden">No approved revenue history recorded yet.</div>
          ) : (
            <div className="space-y-3 md:hidden">
              {dailyBreakdown.map((row) => (
                <article key={row.date} className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-semibold text-foreground">{new Date(row.date).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p><p className="mt-1 text-sm text-muted-foreground">{row.count} bills</p></div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success-foreground"><CheckCircle2 className="h-3 w-3" />Audited</span>
                  </div>
                  <p className="mt-3 border-t border-border pt-3 text-lg font-bold text-success-foreground">{formatINR(row.totalRevenue)}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

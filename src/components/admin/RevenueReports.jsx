import React, { useState, useMemo } from 'react';
import { useDhaba } from '../../context/DhabaContext';
import { formatINR } from '../../lib/supabase';
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
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E8E4DE] rounded-xl p-5 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-xl font-bold text-[#2B2623] flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#14532D]" />
            <span>Revenue & Financial Reports</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#6B635C] mt-1">
            Audited revenue calculated strictly from approved bills in the database.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-[#C2570C] hover:bg-[#A8480A] text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Revenue */}
        <div className="bg-white border border-[#E8E4DE] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#6B635C] font-semibold mb-2">
            <span>Today's Total Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#14532D] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#14532D]">
            {formatINR(metrics.todayRevenue)}
          </div>
          <div className="text-xs text-[#2B2623] mt-1 font-medium">
            From {metrics.todayCount} approved bills today
          </div>
        </div>

        {/* Daily Approved Bill Count */}
        <div className="bg-white border border-[#E8E4DE] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#6B635C] font-semibold mb-2">
            <span>Today's Bill Count</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ReceiptText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#2B2623]">
            {metrics.todayCount}
          </div>
          <div className="text-xs text-[#2B2623] mt-1 font-medium">
            Daily approved table settlements
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-white border border-[#E8E4DE] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#6B635C] font-semibold mb-2">
            <span>Monthly Total Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-[#C2570C]/10 text-[#C2570C] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#C2570C]">
            {formatINR(metrics.monthRevenue)}
          </div>
          <div className="text-xs text-[#2B2623] mt-1 font-medium">
            For current calendar month
          </div>
        </div>

        {/* Monthly Approved Bill Count */}
        <div className="bg-white border border-[#E8E4DE] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#6B635C] font-semibold mb-2">
            <span>Monthly Bill Count</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <ReceiptText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#2B2623]">
            {metrics.monthCount}
          </div>
          <div className="text-xs text-[#2B2623] mt-1 font-medium">
            Total approved bills this month
          </div>
        </div>
      </div>

      {/* Date Filter & Breakdown Section */}
      <div className="bg-white border border-[#E8E4DE] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-bold text-base text-[#2B2623] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#C2570C]" />
            <span>Audited Bill History</span>
          </h3>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#6B635C] font-bold">Filter Date:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#FAF9F7] border border-[#E8E4DE] rounded-xl text-xs font-semibold text-[#2B2623]"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-xs text-slate-500 hover:text-red-600 underline font-semibold"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {dateFilter && (
          <div className="bg-[#FAF9F7] p-3 rounded-xl border border-[#E8E4DE] flex items-center justify-between text-xs">
            <span className="font-bold text-[#2B2623]">
              Filtered Date: {dateFilter} ({filteredApprovedBills.length} approved bills)
            </span>
            <span className="font-bold text-[#14532D] text-sm">
              Total: {formatINR(filteredTotal)}
            </span>
          </div>
        )}

        {/* Daily Grouped Summary Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#FAF9F7] border-b border-[#E8E4DE] text-[#6B635C] uppercase tracking-wider font-bold">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 text-center">Approved Bills Count</th>
                <th className="py-2.5 px-3 text-right">Recognized Revenue</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailyBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No approved revenue history recorded yet.
                  </td>
                </tr>
              ) : (
                dailyBreakdown.map((row) => (
                  <tr key={row.date} className="hover:bg-[#FAF9F7] transition-colors">
                    <td className="py-3 px-3 font-bold text-[#2B2623]">
                      {new Date(row.date).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-700">
                      {row.count} bills
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-sm text-[#14532D]">
                      {formatINR(row.totalRevenue)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Audited
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

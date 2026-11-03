import React, { useState } from 'react';
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
  X
} from 'lucide-react';

export const AdminDashboard = ({ onViewChange, onSelectBill }) => {
  const { user } = useAuth();
  const { tables, getMetrics, approveBill, rejectBill } = useDhaba();
  const metrics = getMetrics();

  const [rejectingBillId, setRejectingBillId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const handleApprove = async (billId) => {
    setActionLoading(true);
    setActionError('');
    try {
      await approveBill(billId, user.id);
    } catch (err) {
      setActionError(err.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setActionError('Please specify a rejection reason');
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      await rejectBill(rejectingBillId, user.id, rejectionReason.trim());
      setRejectingBillId(null);
      setRejectionReason('');
    } catch (err) {
      setActionError(err.message || 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-6 py-6">
      {/* Welcome & Live Status Header */}
      <div className="bg-white border border-[#E8E4DE] rounded-xl p-5 sm:p-6 text-[#2B2623] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase font-semibold tracking-wider text-[#C2570C] bg-[#FDF3EA] px-2 py-0.5 rounded-md">
            Admin Control Center
          </span>
          <h2 className="text-xl font-semibold mt-2 tracking-tight">
            MLA Desi Dhaba Operations
          </h2>
          <p className="text-xs sm:text-sm text-[#6B635C] mt-1">
            Real-time revenue, running table orders, and pending bill approvals.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onViewChange('admin-bills')}
            className="px-4 py-2 bg-[#C2570C] hover:bg-[#A8480A] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
          >
            <ReceiptText className="w-3.5 h-3.5" />
            <span>Pending Bills ({metrics.pendingBillsCount})</span>
          </button>
          <button
            onClick={() => onViewChange('admin-revenue')}
            className="px-4 py-2 bg-[#C2570C] hover:bg-[#A8480A] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Revenue Breakdown</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Today's Revenue */}
        <div className="bg-white border border-[#E8E4DE] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#6B635C] font-semibold mb-1">
            <span>Today's Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#14532D] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-xl font-bold text-[#14532D]">
            {formatINR(metrics.todayRevenue)}
          </div>
          <div className="text-[11px] text-[#2B2623] mt-1 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#14532D]" />
            <span>{metrics.todayCount} approved {metrics.todayCount === 1 ? 'bill' : 'bills'} today</span>
          </div>
        </div>

        {/* This Month's Revenue */}
        <div className="bg-white border border-[#E8E4DE] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#6B635C] font-semibold mb-1">
            <span>This Month's Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-[#C2570C]/10 text-[#C2570C] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-xl font-bold text-[#2B2623]">
            {formatINR(metrics.monthRevenue)}
          </div>
          <div className="text-[11px] text-[#2B2623] mt-1 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#C2570C]" />
            <span>{metrics.monthCount} bills approved this month</span>
          </div>
        </div>

        {/* Currently Occupied Tables */}
        <div className="bg-white border border-[#E8E4DE] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#6B635C] font-semibold mb-1">
            <span>Occupied Tables</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Armchair className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-xl font-bold text-[#C2570C]">
            {metrics.occupiedTablesCount} <span className="text-sm font-normal text-slate-500">/ {tables.length}</span>
          </div>
          <div className="text-[11px] text-[#2B2623] mt-1 font-medium">
            Active dining guests
          </div>
        </div>

        {/* Pending Bills Awaiting Approval */}
        <div className="bg-white border border-[#E8E4DE] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#6B635C] font-semibold mb-1">
            <span>Pending Approvals</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              metrics.pendingBillsCount > 0 ? 'bg-red-100 text-red-600 ' : 'bg-slate-100 text-slate-500'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl sm:text-xl font-bold ${
            metrics.pendingBillsCount > 0 ? 'text-red-600' : 'text-[#2B2623]'
          }`}>
            {metrics.pendingBillsCount}
          </div>
          <div className="text-[11px] text-[#2B2623] mt-1 font-medium">
            Requires admin action
          </div>
        </div>
      </div>

      {/* Main Grid: Pending Action Items & Recent Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Bills Requiring Admin Action */}
        <div className="lg:col-span-2 bg-white border border-[#E8E4DE] rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="bg-[#FAF9F7] px-5 py-4 border-b border-[#E8E4DE] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#C2570C]" />
              <h3 className="font-bold text-sm sm:text-base text-[#2B2623]">
                Pending Bills Requiring Action
              </h3>
            </div>
            <button
              onClick={() => onViewChange('admin-bills')}
              className="text-xs text-[#14532D] font-bold hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 flex-1">
            {metrics.pendingBillsList.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 mx-auto text-[#14532D]/40 mb-2" />
                <p className="text-sm font-semibold text-[#2B2623]">All Clear!</p>
                <p className="text-xs text-slate-500">There are no pending bills waiting for approval right now.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.pendingBillsList.map((bill) => (
                  <div 
                    key={bill.id} 
                    className="border border-[#E8E4DE] rounded-xl p-4 bg-[#FAF9F7] hover:border-[#D6CFC6] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs bg-[#C2570C] text-white px-2 py-0.5 rounded-md">
                          {bill.bill_number}
                        </span>
                        <span className="text-xs font-bold text-[#14532D] bg-emerald-50 px-2 py-0.5 rounded-md">
                          Table: {bill.restaurant_tables?.table_number || 'N/A'}
                        </span>
                        <span className="text-xs text-[#6B635C]">
                          Waiter: {bill.waiter?.full_name || 'Waiter'}
                        </span>
                      </div>
                      
                      {/* Summary of items */}
                      <div className="mt-2 text-xs text-[#2B2623]">
                        {bill.bill_items?.slice(0, 3).map((item, idx) => (
                          <span key={idx} className="inline-block mr-2">
                            {item.quantity}× {item.item_name}
                          </span>
                        ))}
                        {bill.bill_items?.length > 3 && (
                          <span className="text-xs text-slate-500">+{bill.bill_items.length - 3} more</span>
                        )}
                      </div>

                      <div className="mt-1 text-sm font-bold text-[#14532D]">
                        Total: {formatINR(bill.total_amount)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onSelectBill ? onSelectBill(bill) : onViewChange('admin-bills')}
                        className="p-2 text-slate-600 hover:text-[#2B2623] bg-white border border-[#E8E4DE] hover:bg-[#FAF9F7] rounded-xl text-xs font-semibold flex items-center gap-1"
                        title="View Full Bill Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Details</span>
                      </button>

                      <button
                        disabled={actionLoading}
                        onClick={() => handleApprove(bill.id)}
                        className="px-3.5 py-2 bg-[#C2570C] hover:bg-[#A8480A] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 active:scale-95 disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>

                      <button
                        disabled={actionLoading}
                        onClick={() => setRejectingBillId(bill.id)}
                        className="px-3.5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 active:scale-95 disabled:opacity-50"
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
        <div className="bg-white border border-[#E8E4DE] rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="bg-[#FAF9F7] px-5 py-4 border-b border-[#E8E4DE] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#14532D]" />
              <h3 className="font-bold text-sm sm:text-base text-[#2B2623]">
                Recent Approved Bills
              </h3>
            </div>
            <button
              onClick={() => onViewChange('admin-revenue')}
              className="text-xs text-[#14532D] font-bold hover:underline"
            >
              Reports
            </button>
          </div>

          <div className="p-4 flex-1">
            {metrics.recentApprovedList.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <ReceiptText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs">No approved bills yet today.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.recentApprovedList.map((bill) => (
                  <div 
                    key={bill.id}
                    className="p-3 rounded-xl border border-slate-100 bg-[#FAF9F7] hover:bg-[#FAF9F7] transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#2B2623]">
                          {bill.bill_number}
                        </span>
                        <span className="text-[10px] bg-emerald-50 text-[#14532D] px-1.5 py-0.5 rounded font-bold">
                          {bill.restaurant_tables?.table_number || 'T-?'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {bill.approved_at ? new Date(bill.approved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm text-[#14532D]">
                        {formatINR(bill.total_amount)}
                      </div>
                      <span className="text-[10px] text-emerald-600 font-semibold">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 ">
          <div className="bg-white border-2 border-red-300 rounded-xl w-full max-w-md shadow-sm p-6">
            <div className="flex items-center gap-2 text-red-700 font-bold text-lg mb-2">
              <XCircle className="w-5 h-5" />
              <span>Reject Bill & Return to Waiter</span>
            </div>
            <p className="text-xs text-[#2B2623] mb-4">
              Please specify why this bill is being rejected. The waiter will be notified and can correct the items before resubmitting.
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#2B2623] mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Table 2 ordered 2 Dal Makhani instead of 3, or price mismatch..."
                  className="w-full p-3 border border-[#E8E4DE] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-600 text-[#2B2623]"
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
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold shadow-sm active:scale-95 disabled:opacity-50"
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

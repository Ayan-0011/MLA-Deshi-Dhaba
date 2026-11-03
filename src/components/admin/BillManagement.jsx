import React, { useState } from 'react';
import { useDhaba } from '../../context/DhabaContext';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../lib/supabase';
import { BillDetailModal } from './BillDetailModal';
import { 
  ReceiptText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Eye, 
  Check, 
  X, 
  AlertCircle,
  FileText
} from 'lucide-react';

export const BillManagement = () => {
  const { user } = useAuth();
  const { bills, approveBill, rejectBill } = useDhaba();

  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'approved' | 'rejected'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);

  const [rejectingBillId, setRejectingBillId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const pendingBills = bills.filter(b => b.status === 'pending_approval');
  const approvedBills = bills.filter(b => b.status === 'approved');
  const rejectedBills = bills.filter(b => b.status === 'rejected');

  const currentList = activeTab === 'pending' 
    ? pendingBills 
    : activeTab === 'approved' 
    ? approvedBills 
    : rejectedBills;

  const filteredBills = currentList.filter(b => {
    const q = searchQuery.toLowerCase();
    return b.bill_number.toLowerCase().includes(q) ||
           (b.restaurant_tables?.table_number && b.restaurant_tables.table_number.toLowerCase().includes(q)) ||
           (b.waiter?.full_name && b.waiter.full_name.toLowerCase().includes(q));
  });

  const handleApprove = async (billId) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await approveBill(billId, user.id);
      setSuccess('Bill approved! Table is now available and revenue is recorded.');
      setSelectedBill(null);
    } catch (err) {
      setError(err.message || 'Approval failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await rejectBill(rejectingBillId, user.id, rejectionReason.trim());
      setSuccess('Bill rejected and returned to waiter for correction.');
      setRejectingBillId(null);
      setRejectionReason('');
      setSelectedBill(null);
    } catch (err) {
      setError(err.message || 'Rejection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E8E4DE] rounded-xl p-5 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-xl font-bold text-[#2B2623] flex items-center gap-2">
            <ReceiptText className="w-6 h-6 text-[#C2570C]" />
            <span>Bill Management & Approvals</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#6B635C] mt-1">
            Review bills submitted by waiters. Only admin-approved bills enter revenue reports.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1.5 bg-[#FAF9F7] p-1.5 rounded-xl border border-[#E8E4DE] text-xs font-bold">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'pending' ? 'bg-[#C2570C] text-white shadow-xs' : 'text-[#2B2623] hover:bg-white/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending</span>
            {pendingBills.length > 0 && (
              <span className="px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[10px]">
                {pendingBills.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('approved')}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'approved' ? 'bg-[#C2570C] text-white shadow-xs' : 'text-[#2B2623] hover:bg-white/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved ({approvedBills.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'rejected' ? 'bg-red-700 text-white shadow-xs' : 'text-[#2B2623] hover:bg-white/60'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected ({rejectedBills.length})</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#6B635C] absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Bill #, Table number, or Waiter..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E8E4DE] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C2570C]"
        />
      </div>

      {/* Bill List */}
      {filteredBills.length === 0 ? (
        <div className="bg-white border border-[#E8E4DE] rounded-xl p-12 text-center text-slate-400">
          <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-[#2B2623]">No Bills in this section</h3>
          <p className="text-xs text-slate-500 mt-1">There are no {activeTab} bills matching your criteria.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBills.map((bill) => {
            const isPending = bill.status === 'pending_approval';
            const isApproved = bill.status === 'approved';
            const isRejected = bill.status === 'rejected';

            return (
              <div
                key={bill.id}
                className="bg-white border border-[#E8E4DE] rounded-xl p-4 sm:p-5 shadow-xs hover:border-[#D6CFC6] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-mono font-bold text-sm bg-[#C2570C] text-white px-2.5 py-0.5 rounded-lg">
                      {bill.bill_number}
                    </span>
                    <span className="text-xs font-bold text-[#14532D] bg-emerald-50 px-2.5 py-0.5 rounded-lg">
                      Table: {bill.restaurant_tables?.table_number || 'N/A'}
                    </span>
                    <span className="text-xs text-[#6B635C] font-semibold">
                      Waiter: {bill.waiter?.full_name || 'Staff'}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      isApproved ? 'bg-emerald-100 text-emerald-800' :
                      isPending ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {bill.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Items snapshot summary */}
                  <div className="text-xs text-[#2B2623] space-y-0.5">
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {bill.bill_items?.map((item) => (
                        <span key={item.id} className="bg-[#FAF9F7] px-2 py-0.5 rounded border border-[#E8E4DE] font-medium">
                          {item.quantity}× {item.item_name} ({formatINR(item.unit_price)})
                        </span>
                      ))}
                    </div>
                  </div>

                  {isRejected && bill.rejection_reason && (
                    <div className="mt-2 text-xs text-red-700 bg-red-50 p-2 rounded-lg font-medium">
                      <strong>Reason:</strong> {bill.rejection_reason}
                    </div>
                  )}

                  <div className="mt-2 text-xs text-slate-400">
                    Submitted: {new Date(bill.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                    {isApproved && bill.approved_at && (
                      <span className="ml-3 text-emerald-700 font-semibold">
                        • Approved at: {new Date(bill.approved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-left md:text-right">
                    <div className="text-xs font-semibold text-slate-500">Bill Total</div>
                    <div className="text-xl font-bold text-[#14532D]">
                      {formatINR(bill.total_amount)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedBill(bill)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-[#2B2623] rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>

                    {isPending && (
                      <>
                        <button
                          disabled={loading}
                          onClick={() => handleApprove(bill.id)}
                          className="px-4 py-2 bg-[#C2570C] hover:bg-[#A8480A] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 active:scale-95 disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>

                        <button
                          disabled={loading}
                          onClick={() => setRejectingBillId(bill.id)}
                          className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 active:scale-95 disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bill Details Modal */}
      {selectedBill && (
        <BillDetailModal
          bill={selectedBill}
          onClose={() => setSelectedBill(null)}
          onApprove={(id) => handleApprove(id)}
          onReject={(id) => setRejectingBillId(id)}
        />
      )}

      {/* Reject Reason Modal */}
      {rejectingBillId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 ">
          <div className="bg-white border-2 border-red-300 rounded-xl w-full max-w-md shadow-sm p-6">
            <div className="flex items-center gap-2 text-red-700 font-bold text-lg mb-2">
              <XCircle className="w-5 h-5" />
              <span>Reject Bill & Require Correction</span>
            </div>
            <p className="text-xs text-[#2B2623] mb-4">
              Enter the reason why this bill cannot be approved. The order will be unlocked for the waiter to update and resubmit.
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
                  placeholder="e.g. Correct 2 Rotis to 4 Rotis, or customer did not take Dal..."
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
                  disabled={loading}
                  className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

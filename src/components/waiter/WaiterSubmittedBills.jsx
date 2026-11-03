import React, { useState } from 'react';
import { useDhaba } from '../../context/DhabaContext';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../lib/supabase';
import { BillDetailModal } from '../admin/BillDetailModal';
import { 
  ReceiptText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Eye, 
  RotateCcw,
  Search,
  FileText
} from 'lucide-react';

export const WaiterSubmittedBills = ({ onCorrectOrder, defaultFilter = 'all' }) => {
  const { user } = useAuth();
  const { bills, tables } = useDhaba();

  const [activeTab, setActiveTab] = useState(defaultFilter); // 'all' | 'pending' | 'rejected' | 'approved'
  const [selectedBill, setSelectedBill] = useState(null);

  // Filter bills submitted by this waiter (or all if waiter_id is null/matching)
  const waiterBills = bills.filter(b => !user?.id || b.waiter_id === user.id);

  const pendingBills = waiterBills.filter(b => b.status === 'pending_approval');
  const rejectedBills = waiterBills.filter(b => b.status === 'rejected');
  const approvedBills = waiterBills.filter(b => b.status === 'approved');

  const currentList = activeTab === 'pending'
    ? pendingBills
    : activeTab === 'rejected'
    ? rejectedBills
    : activeTab === 'approved'
    ? approvedBills
    : waiterBills;

  const handleFixOrder = (bill) => {
    // Find the corresponding table
    const table = tables.find(t => t.id === bill.table_id);
    if (table && onCorrectOrder) {
      onCorrectOrder(table);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-6 py-6 pb-24">
      {/* Header */}
      <div className="bg-white border border-[#E8E4DE] rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-xl font-bold text-[#2B2623] flex items-center gap-2">
            <ReceiptText className="w-6 h-6 text-[#C2570C]" />
            <span>My Submitted Bills</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#6B635C] mt-1">
            Track status of final bills submitted to admin. Correct and resubmit any rejected bills.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 bg-[#FAF9F7] p-1.5 rounded-xl border border-[#E8E4DE] text-xs font-bold">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'all' ? 'bg-[#C2570C] text-white shadow-xs' : 'text-[#2B2623] hover:bg-white/60'
            }`}
          >
            All ({waiterBills.length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
              activeTab === 'pending' ? 'bg-[#C2570C] text-white shadow-xs' : 'text-[#2B2623] hover:bg-white/60'
            }`}
          >
            <span>Pending</span>
            {pendingBills.length > 0 && (
              <span className="px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[10px]">
                {pendingBills.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
              activeTab === 'rejected' ? 'bg-red-700 text-white shadow-xs' : 'text-[#2B2623] hover:bg-white/60'
            }`}
          >
            <span>Rejected</span>
            {rejectedBills.length > 0 && (
              <span className="px-1.5 py-0.2 bg-white text-red-700 rounded-full text-[10px] font-bold">
                {rejectedBills.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'approved' ? 'bg-[#C2570C] text-white shadow-xs' : 'text-[#2B2623] hover:bg-white/60'
            }`}
          >
            Approved ({approvedBills.length})
          </button>
        </div>
      </div>

      {/* Bills List */}
      {currentList.length === 0 ? (
        <div className="bg-white border border-[#E8E4DE] rounded-xl p-12 text-center text-slate-400">
          <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-[#2B2623]">No Bills Found</h3>
          <p className="text-xs text-slate-500 mt-1">No submitted bills match this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentList.map((bill) => {
            const isPending = bill.status === 'pending_approval';
            const isApproved = bill.status === 'approved';
            const isRejected = bill.status === 'rejected';

            return (
              <div
                key={bill.id}
                className={`bg-white border rounded-xl p-4 sm:p-5 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isRejected 
                    ? 'border-red-300 bg-red-50/20' 
                    : isPending 
                    ? 'border-amber-300 bg-amber-50/10' 
                    : 'border-[#E8E4DE]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-mono font-bold text-sm bg-[#C2570C] text-white px-2.5 py-0.5 rounded-lg">
                      {bill.bill_number}
                    </span>
                    <span className="text-xs font-bold text-[#14532D] bg-emerald-50 px-2.5 py-0.5 rounded-lg">
                      Table: {bill.restaurant_tables?.table_number || 'N/A'}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                      isApproved ? 'bg-emerald-100 text-emerald-800' :
                      isPending ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {bill.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Items snapshot */}
                  <div className="text-xs text-[#2B2623] space-y-0.5">
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {bill.bill_items?.map((item) => (
                        <span key={item.id} className="bg-[#FAF9F7] px-2 py-0.5 rounded border border-[#E8E4DE] font-medium">
                          {item.quantity}× {item.item_name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Rejection notice */}
                  {isRejected && (
                    <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-xl text-xs text-red-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-red-700" />
                        <span>Admin Rejection Reason:</span>
                      </div>
                      <p className="font-semibold text-red-800 pl-5">
                        "{bill.rejection_reason || 'Correction required by admin'}"
                      </p>
                    </div>
                  )}

                  <div className="mt-2 text-xs text-slate-400">
                    Submitted: {new Date(bill.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-left md:text-right">
                    <div className="text-xs font-semibold text-slate-500">Bill Amount</div>
                    <div className="text-xl font-bold text-[#14532D]">
                      {formatINR(bill.total_amount)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedBill(bill)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-[#2B2623] rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>

                    {isRejected && (
                      <button
                        onClick={() => handleFixOrder(bill)}
                        className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Fix & Resubmit</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bill Preview Modal */}
      {selectedBill && (
        <BillDetailModal
          bill={selectedBill}
          onClose={() => setSelectedBill(null)}
          onApprove={() => {}}
          onReject={() => {}}
        />
      )}
    </div>
  );
};

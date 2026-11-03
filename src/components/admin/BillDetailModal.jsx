import React from 'react';
import { formatINR } from '../../lib/supabase';
import { ReceiptText, X, CheckCircle, XCircle, Clock, Calendar, User, Armchair, Printer } from 'lucide-react';

export const BillDetailModal = ({ bill, onClose, onApprove, onReject }) => {
  if (!bill) return null;

  const isPending = bill.status === 'pending_approval';
  const isApproved = bill.status === 'approved';
  const isRejected = bill.status === 'rejected';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 ">
      <div className="bg-[#FAF9F7] border border-[#E8E4DE] rounded-xl w-full max-w-lg shadow-sm overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#FAF9F7] text-[#2B2623] border-b border-[#E8E4DE] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-[#C2570C]" />
            <div>
              <h3 className="font-bold text-base sm:text-lg">MLA Desi Dhaba</h3>
              <p className="text-[11px] text-[#6B635C] font-mono">Bill #{bill.bill_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg bg-white border border-[#E8E4DE] hover:bg-[#FAF9F7] text-[#2B2623] transition-colors"
              title="Print Receipt"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#6B635C] hover:text-[#2B2623] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Bill Receipt Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Metadata Cards */}
          <div className="bg-white border border-[#E8E4DE] rounded-xl p-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[#6B635C] font-semibold block">Table</span>
              <span className="font-bold text-sm text-[#2B2623]">
                {bill.restaurant_tables?.table_number || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[#6B635C] font-semibold block">Status</span>
              <span className={`inline-block font-bold text-[11px] px-2 py-0.5 rounded-full uppercase ${isApproved ? 'bg-emerald-100 text-emerald-800' :
                  isPending ? 'bg-amber-100 text-amber-800' :
                    'bg-red-100 text-red-800'
                }`}>
                {bill.status.replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className="text-[#6B635C] font-semibold block">Waiter</span>
              <span className="font-medium text-[#2B2623]">{bill.waiter?.full_name || 'Staff'}</span>
            </div>
            <div>
              <span className="text-[#6B635C] font-semibold block">Submitted At</span>
              <span className="font-medium text-[#2B2623]">
                {new Date(bill.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
              </span>
            </div>
          </div>

          {/* Rejection Alert if rejected */}
          {isRejected && bill.rejection_reason && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 space-y-1">
              <span className="font-bold flex items-center gap-1 text-red-900">
                <XCircle className="w-4 h-4 text-red-700" />
                Admin Rejection Reason:
              </span>
              <p className="font-medium pl-5">{bill.rejection_reason}</p>
            </div>
          )}

          {/* Items Table Snapshot */}
          <div className="bg-white border border-[#E8E4DE] rounded-xl overflow-hidden">
            <div className="bg-[#FAF9F7] px-3 py-2 border-b border-[#E8E4DE] grid grid-cols-12 text-[11px] font-bold text-[#6B635C] uppercase tracking-wider">
              <span className="col-span-6">Item Description</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-2 text-right">Price</span>
              <span className="col-span-2 text-right">Total</span>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {bill.bill_items?.map((item) => (
                <div key={item.id} className="px-3 py-2.5 grid grid-cols-12 items-center">
                  <span className="col-span-6 font-semibold text-[#2B2623]">{item.item_name}</span>
                  <span className="col-span-2 text-center text-slate-600 font-bold">{item.quantity}</span>
                  <span className="col-span-2 text-right text-slate-600">{formatINR(item.unit_price)}</span>
                  <span className="col-span-2 text-right font-bold text-[#2B2623]">
                    {formatINR(item.line_total || (item.unit_price * item.quantity))}
                  </span>
                </div>
              ))}
            </div>

            {/* Bill Grand Total Bar */}
            <div className="bg-[#FAF9F7] px-4 py-3 border-t-2 border-[#E8E4DE] flex items-center justify-between">
              <span className="font-bold text-sm text-[#2B2623] uppercase tracking-wider">
                Grand Total
              </span>
              <span className="text-xl font-bold text-[#14532D]">
                {formatINR(bill.total_amount)}
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

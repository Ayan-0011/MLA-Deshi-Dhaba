import React, { useState } from 'react';
import { formatINR } from '../../lib/supabase';
import { ReceiptText, X, AlertCircle, CheckCircle, Clock, Utensils, ShieldCheck } from 'lucide-react';

export const FinalBillModal = ({ order, table, waiterName, onClose, onConfirmSubmit, isSubmitting }) => {
  const [error, setError] = useState('');

  if (!order || !table) return null;

  const items = order.items || [];
  const grandTotal = items.reduce(
    (sum, item) => sum + (Number(item.unit_price) * Number(item.quantity)),
    0
  );

  const todayStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const timeStr = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const handleSubmit = async () => {
    setError('');
    try {
      await onConfirmSubmit();
    } catch (err) {
      setError(err.message || 'Failed to submit bill');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 ">
      <div className="bg-[#FAF9F7] border border-[#E8E4DE] rounded-xl w-full max-w-lg shadow-sm overflow-hidden flex flex-col max-h-[90vh]">
        {/* Bill Receipt Header */}
        <div className="bg-[#FAF9F7] text-[#2B2623] border-b border-[#E8E4DE] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C2570C] text-white flex items-center justify-center">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-[#2B2623]">MLA Desi Dhaba</h3>
              <p className="text-[11px] text-[#C2570C] font-semibold tracking-wider uppercase">
                Final Bill Verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#6B635C] hover:text-[#2B2623] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bill Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Receipt Info Box */}
          <div className="bg-white border border-[#E8E4DE] rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-[#6B635C] font-semibold">Table</span>
              <span className="font-bold text-sm text-[#2B2623]">
                {table.table_number}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-[#6B635C] font-semibold">Attending Waiter</span>
              <span className="font-bold text-[#2B2623]">{waiterName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#6B635C] font-semibold">Date & Time</span>
              <span className="font-medium text-slate-700">{todayStr} • {timeStr}</span>
            </div>
          </div>

          {/* Items Breakdown Table */}
          <div className="bg-white border border-[#E8E4DE] rounded-xl overflow-hidden shadow-xs">
            <div className="bg-[#FAF9F7] px-3 py-2 border-b border-[#E8E4DE] grid grid-cols-12 text-[11px] font-bold text-[#6B635C] uppercase tracking-wider">
              <span className="col-span-6">Item Description</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-2 text-right">Price</span>
              <span className="col-span-2 text-right">Line Total</span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {items.map((item, idx) => {
                const lineTotal = Number(item.unit_price) * Number(item.quantity);
                return (
                  <div key={idx} className="px-3 py-2.5 grid grid-cols-12 items-center">
                    <span className="col-span-6 font-semibold text-[#2B2623]">{item.item_name}</span>
                    <span className="col-span-2 text-center font-bold text-slate-700">{item.quantity}</span>
                    <span className="col-span-2 text-right text-slate-600">{formatINR(item.unit_price)}</span>
                    <span className="col-span-2 text-right font-bold text-[#2B2623]">
                      {formatINR(lineTotal)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Grand Total Footer */}
            <div className="bg-[#FAF9F7] px-4 py-3 border-t-2 border-[#E8E4DE] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#6B635C] uppercase tracking-wider block">
                  Grand Total
                </span>
                <span className="text-[11px] text-slate-500">
                  Total {items.reduce((acc, i) => acc + Number(i.quantity), 0)} items ordered
                </span>
              </div>
              <span className="text-2xl font-bold text-[#14532D]">
                {formatINR(grandTotal)}
              </span>
            </div>
          </div>

          
        </div>

        {/* Action Buttons */}
        <div className="bg-white border-t border-[#E8E4DE] p-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            Modify Items
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="flex-1 py-3 px-4 bg-[#C2570C] hover:bg-[#A8480A] text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{isSubmitting ? 'Submitting...' : 'Confirm & Submit to Admin'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

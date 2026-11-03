import React from 'react';
import { formatINR } from '../../lib/supabase';
import { ReceiptText, X, CheckCircle, XCircle, Clock, Calendar, User, Armchair, Printer } from 'lucide-react';

export const BillDetailModal = ({ bill, onClose }) => {
  if (!bill) return null;

  const isPending = bill.status === 'pending_approval';
  const isApproved = bill.status === 'approved';
  const isRejected = bill.status === 'rejected';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/45 sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="bill-detail-title" className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-xl border border-border bg-surface shadow-lg sm:max-w-lg sm:rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface-muted px-4 py-4 text-foreground sm:px-5">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" />
            <div>
              <h3 id="bill-detail-title" className="text-base font-bold sm:text-lg">MLA Desi Dhaba</h3>
              <p className="font-mono text-xs text-muted-foreground">Bill #{bill.bill_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="grid min-h-10 min-w-10 place-items-center rounded-md border border-border bg-surface text-foreground hover:bg-surface-muted"
              title="Print Receipt"
              aria-label="Print receipt"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="grid min-h-10 min-w-10 place-items-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground"
              aria-label="Close bill details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Bill Receipt Body */}
        <div className="space-y-4 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5">
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-surface p-3 text-sm min-[420px]:grid-cols-2">
            <div>
              <span className="block text-xs font-semibold text-muted-foreground">Table</span>
              <span className="text-sm font-bold text-foreground">
                {bill.restaurant_tables?.table_number || 'N/A'}
              </span>
            </div>
            <div>
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Status</span>
              <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${isApproved ? 'bg-success-soft text-success-foreground' :
                  isPending ? 'bg-warning-soft text-warning-foreground' :
                    'bg-danger-soft text-danger-foreground'
                }`}>
                {bill.status.replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-muted-foreground">Waiter</span>
              <span className="font-medium text-foreground">{bill.waiter?.full_name || 'Staff'}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-muted-foreground">Submitted At</span>
              <span className="font-medium text-foreground">
                {new Date(bill.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
              </span>
            </div>
          </div>

          {/* Rejection Alert if rejected */}
          {isRejected && bill.rejection_reason && (
            <div className="space-y-1 rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger-foreground">
              <span className="flex items-center gap-1 font-bold">
                <XCircle className="h-4 w-4" />
                Admin Rejection Reason:
              </span>
              <p className="pl-5 font-medium">{bill.rejection_reason}</p>
            </div>
          )}

          {/* Items Table Snapshot */}
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="hidden grid-cols-12 border-b border-border bg-surface-muted px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground min-[420px]:grid">
                  <span className="col-span-5">Item Description</span>
                  <span className="col-span-1 text-center">Qty</span>
                  <span className="col-span-3 text-right">Price</span>
                  <span className="col-span-3 text-right">Total</span>
            </div>
            <div className="divide-y divide-border text-sm">
              {bill.bill_items?.map((item) => (
                <div key={item.id} className="grid grid-cols-2 items-center gap-x-2 gap-y-2 px-3 py-3 min-[420px]:grid-cols-12 min-[420px]:gap-x-1">
                  <span className="col-span-2 min-w-0 wrap-break-word font-semibold text-foreground min-[420px]:col-span-5">{item.item_name}</span>
                  <span className="text-muted-foreground min-[420px]:col-span-1 min-[420px]:text-center"><span className="min-[420px]:sr-only">Qty: </span>{item.quantity}</span>
                  <span className="text-right text-muted-foreground min-[420px]:col-span-3">{formatINR(item.unit_price)}</span>
                  <span className="text-right font-bold text-foreground min-[420px]:col-span-3">
                    {formatINR(item.line_total || (item.unit_price * item.quantity))}
                  </span>
                </div>
              ))}
            </div>

            {/* Bill Grand Total Bar */}
            <div className="flex items-center justify-between border-t border-border bg-surface-muted px-4 py-3">
              <span className="text-sm font-bold uppercase tracking-wider text-foreground">
                Grand Total
              </span>
              <span className="text-xl font-bold text-success-foreground">
                {formatINR(bill.total_amount)}
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

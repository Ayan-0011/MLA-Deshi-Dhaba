import React, { useState } from 'react';
import { formatINR } from '../../lib/supabase';
import { AlertCircle, CheckCircle, Utensils } from 'lucide-react';
import { Button, Modal } from '../ui';

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
      console.error('Final bill confirmation failed:', err);
      setError('Could not submit the bill. Please try again.');
    }
  };

  return (
    <Modal
      open={Boolean(order && table)}
      onClose={onClose}
      title="Final bill verification"
      className="sm:max-w-lg"
      footer={(
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">Modify items</Button>
          <Button type="button" disabled={isSubmitting} loading={isSubmitting} onClick={handleSubmit} className="w-full sm:w-auto">
            <CheckCircle aria-hidden="true" className="h-4 w-4" />
            <span>{isSubmitting ? 'Submitting...' : 'Confirm & submit to admin'}</span>
          </Button>
        </div>
      )}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary">
            <Utensils aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-bold text-foreground">MLA Desi Dhaba</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Review before sending</p>
          </div>
        </div>
        {error && (
          <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger-soft p-3 text-sm text-danger-foreground" role="alert">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="space-y-2 rounded-md border border-border bg-surface-muted p-3 text-sm">
          <div className="flex items-start justify-between gap-3 border-b border-border pb-2">
            <span className="text-muted-foreground">Table</span>
            <span className="text-right font-semibold text-foreground">{table.table_number}</span>
          </div>
          <div className="flex items-start justify-between gap-3 border-b border-border pb-2">
            <span className="shrink-0 text-muted-foreground">Attending waiter</span>
            <span className="min-w-0 wrap-break-word text-right font-semibold text-foreground">{waiterName}</span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="text-muted-foreground">Date &amp; time</span>
            <span className="text-right text-foreground">{todayStr} · {timeStr}</span>
          </div>
        </div>
        <section className="overflow-hidden rounded-md border border-border bg-surface" aria-label="Bill items">
          <div className="hidden grid-cols-[minmax(0,1fr)_3rem_5.5rem_5.5rem] gap-2 border-b border-border bg-surface-muted px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground sm:grid">
            <span>Item</span><span className="text-center">Qty</span><span className="text-right">Price</span><span className="text-right">Total</span>
          </div>
          <div className="divide-y divide-border">
            {items.map((item, idx) => {
              const lineTotal = Number(item.unit_price) * Number(item.quantity);
              return (
                <div key={idx} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 px-3 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_3rem_5.5rem_5.5rem] sm:items-center">
                  <span className="min-w-0 wrap-break-word font-semibold text-foreground">{item.item_name}</span>
                  <span className="text-xs text-muted-foreground sm:hidden">Qty {item.quantity} · {formatINR(item.unit_price)} each</span>
                  <span className="hidden text-right font-bold text-foreground sm:block sm:text-center">{item.quantity}</span>
                  <span className="hidden text-right text-muted-foreground sm:block">{formatINR(item.unit_price)}</span>
                  <span className="col-start-2 row-start-2 whitespace-nowrap text-right font-bold text-foreground sm:col-start-auto sm:row-start-auto">{formatINR(lineTotal)}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-muted px-3 py-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">Grand total</p>
              <p className="text-xs text-muted-foreground">Total {items.reduce((acc, i) => acc + Number(i.quantity), 0)} items ordered</p>
            </div>
            <p className="shrink-0 text-xl font-bold tracking-tight text-primary">{formatINR(grandTotal)}</p>
          </div>
        </section>
      </div>
    </Modal>
  );
};

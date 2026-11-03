import React, { useState } from 'react';
import { useDhaba } from '../../context/DhabaContext';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../lib/supabase';
import { BillDetailModal } from '../admin/BillDetailModal';
import { 
  ReceiptText, 
  AlertTriangle, 
  Eye, 
  RotateCcw,
  FileText
} from 'lucide-react';
import { Badge, Button, Card, EmptyState, Tabs } from '../ui';

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
    <div className="mx-auto max-w-7xl space-y-5 px-3 py-5 pb-24 sm:px-6 sm:py-6">
      <Card className="space-y-4 p-4 sm:p-6">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-primary">Service history</p>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
            <ReceiptText aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
            <span>My submitted bills</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Track bills sent to admin and correct any that need attention.</p>
        </div>
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          items={[
            { value: 'all', label: `All (${waiterBills.length})` },
            { value: 'pending', label: `Pending${pendingBills.length > 0 ? ` (${pendingBills.length})` : ''}` },
            { value: 'rejected', label: `Rejected${rejectedBills.length > 0 ? ` (${rejectedBills.length})` : ''}` },
            { value: 'approved', label: `Approved (${approvedBills.length})` },
          ]}
        />
      </Card>

      {currentList.length === 0 ? (
        <EmptyState icon={FileText} title="No bills found" description="No submitted bills match this filter." />
      ) : (
        <div className="space-y-3">
          {currentList.map((bill) => {
            const isPending = bill.status === 'pending_approval';
            const isApproved = bill.status === 'approved';
            const isRejected = bill.status === 'rejected';
            const statusTone = isApproved ? 'success' : isPending ? 'pending' : 'danger';

            return (
              <Card key={bill.id} className={`p-4 sm:p-5 ${isRejected ? 'border-danger/40' : isPending ? 'border-warning/40' : ''}`}>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge tone="primary" className="font-mono">{bill.bill_number}</Badge>
                      <Badge tone="success">Table: {bill.restaurant_tables?.table_number || 'N/A'}</Badge>
                      <Badge tone={statusTone}>{bill.status.replace('_', ' ')}</Badge>
                    </div>

                    <div className="flex flex-wrap gap-2" aria-label="Bill items">
                      {bill.bill_items?.map((item) => (
                        <span key={item.id} className="max-w-full wrap-break-word rounded border border-border bg-surface-muted px-2 py-1 text-xs font-medium text-foreground">
                          {item.quantity}× {item.item_name}
                        </span>
                      ))}
                    </div>

                    {isRejected && (
                      <div className="mt-3 space-y-1 rounded-md border border-danger/30 bg-danger-soft p-3 text-sm text-danger-foreground">
                        <div className="flex items-center gap-2 font-semibold">
                          <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />
                          <span>Admin rejection reason</span>
                        </div>
                        <p className="wrap-break-word">“{bill.rejection_reason || 'Correction required by admin'}”</p>
                      </div>
                    )}

                    <p className="mt-3 text-xs text-muted-foreground">
                      Submitted: {new Date(bill.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 md:min-w-56 md:flex-col md:items-end md:border-0 md:pt-0">
                    <div className="md:text-right">
                      <p className="text-xs font-medium text-muted-foreground">Bill amount</p>
                      <p className="text-xl font-bold text-primary">{formatINR(bill.total_amount)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" size="sm" onClick={() => setSelectedBill(bill)}>
                        <Eye aria-hidden="true" className="h-4 w-4" /><span>View</span>
                      </Button>
                      {isRejected && (
                        <Button type="button" variant="danger" size="sm" onClick={() => handleFixOrder(bill)}>
                          <RotateCcw aria-hidden="true" className="h-4 w-4" /><span>Fix &amp; resubmit</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

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

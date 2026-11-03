import React, { useState } from 'react';
import { useDhaba } from '../../context/DhabaContext';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../lib/supabase';
import { BillDetailModal } from './BillDetailModal';
import { notify } from '../../lib/notifications';
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
      notify.success('Bill approved. The table is available again.', 'bill-approved');
      setSelectedBill(null);
    } catch (err) {
      console.error('Bill approval failed:', err);
      setError('Could not approve this bill. Please try again.');
      notify.error('Could not approve this bill.', 'bill-approval-error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setError('Please provide a rejection reason');
      notify.warning('A rejection reason is required.', 'bill-rejection-validation');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await rejectBill(rejectingBillId, user.id, rejectionReason.trim());
      setSuccess('Bill rejected and returned to waiter for correction.');
      notify.success('Bill returned to the waiter for correction.', 'bill-rejected');
      setRejectingBillId(null);
      setRejectionReason('');
      setSelectedBill(null);
    } catch (err) {
      console.error('Bill rejection failed:', err);
      setError('Could not reject this bill. Please try again.');
      notify.error('Could not reject this bill.', 'bill-rejection-error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-3 py-4 text-foreground sm:px-6 sm:py-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:p-5">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <ReceiptText className="h-6 w-6 text-primary" />
            <span>Bill Management & Approvals</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review bills submitted by waiters. Only admin-approved bills enter revenue reports.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-md border border-border bg-surface-muted p-1 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('pending')}
              className={`min-h-10 shrink-0 rounded px-3 transition-all flex items-center gap-1.5 ${
              activeTab === 'pending' ? 'bg-surface text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending</span>
            {pendingBills.length > 0 && (
              <span className="rounded-full bg-danger-soft px-1.5 py-0.5 text-xs text-danger-foreground">
                {pendingBills.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('approved')}
              className={`min-h-10 shrink-0 rounded px-3 transition-all flex items-center gap-1.5 ${
              activeTab === 'approved' ? 'bg-surface text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved ({approvedBills.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('rejected')}
              className={`min-h-10 shrink-0 rounded px-3 transition-all flex items-center gap-1.5 ${
              activeTab === 'rejected' ? 'bg-danger-soft text-danger-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected ({rejectedBills.length})</span>
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger-foreground">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div role="status" className="flex items-center gap-2 rounded-lg border border-success/30 bg-success-soft p-3 text-sm text-success-foreground">
          <Check className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Bill #, Table number, or Waiter..."
          className="min-h-11 w-full rounded-md border border-border bg-surface py-2.5 pl-10 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm"
        />
      </div>

      {/* Bill List */}
      {filteredBills.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
          <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
          <h3 className="text-base font-bold text-foreground">No Bills in this section</h3>
          <p className="mt-1 text-sm text-muted-foreground">There are no {activeTab} bills matching your criteria.</p>
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
                className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm transition-all hover:border-primary/40 sm:p-5 md:flex-row md:items-center"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="rounded-md bg-primary-soft px-2.5 py-1 font-mono text-sm font-bold text-primary">
                      {bill.bill_number}
                    </span>
                    <span className="rounded-md bg-success-soft px-2.5 py-1 text-xs font-semibold text-success-foreground">
                      Table: {bill.restaurant_tables?.table_number || 'N/A'}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      Waiter: {bill.waiter?.full_name || 'Staff'}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      isApproved ? 'bg-success-soft text-success-foreground' :
                      isPending ? 'bg-warning-soft text-warning-foreground' :
                      'bg-danger-soft text-danger-foreground'
                    }`}>
                      {bill.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Items snapshot summary */}
                  <div className="space-y-1 text-sm text-foreground">
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {bill.bill_items?.map((item) => (
                        <span key={item.id} className="rounded-md border border-border bg-surface-muted px-2 py-1 font-medium text-foreground">
                          {item.quantity}× {item.item_name} ({formatINR(item.unit_price)})
                        </span>
                      ))}
                    </div>
                  </div>

                  {isRejected && bill.rejection_reason && (
                    <div className="mt-2 rounded-md bg-danger-soft p-2 text-sm font-medium text-danger-foreground">
                      <strong>Reason:</strong> {bill.rejection_reason}
                    </div>
                  )}

                  <div className="mt-2 text-xs text-muted-foreground">
                    Submitted: {new Date(bill.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                    {isApproved && bill.approved_at && (
                      <span className="ml-3 font-semibold text-success-foreground">
                        • Approved at: {new Date(bill.approved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-start gap-3 border-t border-border pt-3 sm:flex-row sm:items-center md:border-t-0 md:pt-0">
                  <div className="text-left md:text-right">
                    <div className="text-xs font-semibold text-muted-foreground">Bill Total</div>
                    <div className="text-xl font-bold text-success-foreground">
                      {formatINR(bill.total_amount)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedBill(bill)}
                      className="inline-flex min-h-10 items-center gap-1 rounded-md border border-border bg-surface-muted px-3 text-sm font-semibold text-foreground hover:bg-border"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>

                    {isPending && (
                      <>
                        <button
                          disabled={loading}
                          onClick={() => handleApprove(bill.id)}
                          className="inline-flex min-h-10 items-center gap-1 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>

                        <button
                          disabled={loading}
                          onClick={() => setRejectingBillId(bill.id)}
                          className="inline-flex min-h-10 items-center gap-1 rounded-md bg-danger-soft px-4 text-sm font-semibold text-danger-foreground hover:opacity-90 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/45 sm:items-center sm:p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="reject-bill-title" className="w-full rounded-t-xl border border-border bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-lg sm:max-w-md sm:rounded-xl sm:p-6">
            <div className="mb-2 flex items-center gap-2 text-lg font-bold text-danger-foreground">
              <XCircle className="w-5 h-5" />
              <span id="reject-bill-title">Reject Bill & Require Correction</span>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Enter the reason why this bill cannot be approved. The order will be unlocked for the waiter to update and resubmit.
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label htmlFor="bill-rejection-reason" className="mb-1 block text-sm font-semibold uppercase text-foreground">
                  Rejection Reason *
                </label>
                <textarea
                  id="bill-rejection-reason"
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Correct 2 Rotis to 4 Rotis, or customer did not take Dal..."
                  className="min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger/20 sm:text-sm"
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
                  className="min-h-10 rounded-md border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:bg-surface-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="min-h-10 rounded-md bg-danger-soft px-4 text-sm font-semibold text-danger-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
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

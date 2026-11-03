import React, { useEffect, useState } from 'react';
import { useDhaba } from '../../context/DhabaContext';
import { 
  Armchair, 
  Plus, 
  Edit2, 
  Check, 
  X, 
  Users, 
  AlertCircle, 
  RotateCcw
} from 'lucide-react';
import { ToggleSwitch } from '../common/ToggleSwitch';
import { notify } from '../../lib/notifications';

export const TableManagement = () => {
  const { tables, orders, waiters, addTable, updateTable, reassignOrderWaiter } = useDhaba();

  const [isAdding, setIsAdding] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newCapacity, setNewCapacity] = useState('4');

  const [editingTableId, setEditingTableId] = useState(null);
  const [editTableNumber, setEditTableNumber] = useState('');
  const [editCapacity, setEditCapacity] = useState('4');
  const [selectedWaiters, setSelectedWaiters] = useState({});
  const [assigningOrderId, setAssigningOrderId] = useState(null);
  const [updatingTableId, setUpdatingTableId] = useState(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setSelectedWaiters({});
  }, [orders]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newTableNumber.trim()) {
      setError('Table number or name is required');
      notify.warning('Enter a table number or name.', 'table-create-validation');
      return;
    }

    try {
      await addTable({
        table_number: newTableNumber.trim(),
        capacity: Number(newCapacity) || 4
      });
      setSuccess(`Table ${newTableNumber.trim()} added successfully!`);
      notify.success(`Table ${newTableNumber.trim()} added.`, 'table-created');
      setNewTableNumber('');
      setNewCapacity('4');
      setIsAdding(false);
    } catch (err) {
      console.error('Table creation failed:', err);
      setError('Could not add this table. Check the table details and try again.');
      notify.error('Could not add this table. Check the details and try again.', 'table-create-error');
    }
  };

  const startEdit = (table) => {
    setEditingTableId(table.id);
    setEditTableNumber(table.table_number);
    setEditCapacity(table.capacity.toString());
  };

  const handleUpdate = async (id) => {
    setError('');
    setSuccess('');
    try {
      await updateTable(id, {
        table_number: editTableNumber.trim(),
        capacity: Number(editCapacity) || 4
      });
      setSuccess('Table updated successfully');
      notify.success('Table details updated.', 'table-updated');
      setEditingTableId(null);
    } catch (err) {
      console.error('Table update failed:', err);
      setError('Could not update this table. Please try again.');
      notify.error('Could not update this table.', `table-update-error-${id}`);
    }
  };

  const handleToggleActive = async (table) => {
    setError('');
    setSuccess('');
    setUpdatingTableId(table.id);
    try {
      await updateTable(table.id, {
        is_active: !table.is_active
      });
      setSuccess(`Table ${table.table_number} ${table.is_active ? 'deactivated' : 'activated'}`);
      notify.success(`Table ${table.table_number} ${table.is_active ? 'deactivated' : 'activated'}.`, `table-status-${table.id}`);
    } catch (err) {
      console.error('Table status update failed:', err);
      setError('Could not update table status. Please try again.');
      notify.error('Could not update table status.', `table-status-error-${table.id}`);
    } finally {
      setUpdatingTableId(null);
    }
  };

  const handleResetStatus = async (table) => {
    // Admin override if table is stuck in occupied/pending without active orders
    if (!window.confirm(`Force reset Table ${table.table_number} to Available?`)) return;
    try {
      await updateTable(table.id, { status: 'available' });
      setSuccess(`Table ${table.table_number} reset to Available.`);
      notify.info(`Table ${table.table_number} is now available.`, `table-reset-${table.id}`);
    } catch (err) {
      console.error('Table reset failed:', err);
      setError('Could not reset this table. Please try again.');
      notify.error('Could not reset this table.', `table-reset-error-${table.id}`);
    }
  };

  const handleReassign = async (order) => {
    const waiterId = selectedWaiters[order.id] || order.waiter_id;
    if (waiterId === order.waiter_id) return;
    setError('');
    setSuccess('');
    setAssigningOrderId(order.id);
    try {
      await reassignOrderWaiter(order.id, waiterId);
      const waiterName = waiters.find((waiter) => waiter.id === waiterId)?.full_name || 'selected waiter';
      notify.success(`Table reassigned to ${waiterName}.`, `reassign-${order.id}`);
    } catch (err) {
      console.error('Waiter reassignment failed:', err);
      setError('Could not reassign the waiter. Please try again.');
      notify.error('Could not reassign the waiter.', `reassign-error-${order.id}`);
    } finally {
      setAssigningOrderId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-3 py-4 text-foreground sm:px-6 sm:py-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:p-5">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <Armchair className="h-6 w-6 text-primary" />
            <span>Restaurant Tables Management</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure dhaba seating capacity, table numbers, and monitor live table occupancy.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{isAdding ? 'Cancel' : 'Add New Table'}</span>
        </button>
      </div>

      {/* Notification alerts */}
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

      {/* Add Table Form */}
      {isAdding && (
        <form onSubmit={handleCreate} className="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          <h3 className="text-sm font-bold text-foreground">Create New Dhaba Table</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                Table Name / Number *
              </label>
              <input
                type="text"
                value={newTableNumber}
                onChange={(e) => setNewTableNumber(e.target.value)}
                placeholder="e.g. T-13 or Khatiya-1"
                className="min-h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                Seating Capacity *
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
                className="min-h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="min-h-10 rounded-md border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:bg-surface-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-10 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover"
            >
              Save Table
            </button>
          </div>
        </form>
      )}

      {/* Table Status Legend */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-3 text-xs text-muted-foreground">
        <span className="mr-1 font-bold text-foreground">Status Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-success"></span>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-warning"></span>
          <span>Occupied (Running Order)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-info"></span>
          <span>Bill Pending Approval</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-muted-foreground">
          <span>Total Tables: {tables.length}</span>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {tables.map((table) => {
          const isOccupied = table.status === 'occupied';
          const isAvailable = table.status === 'available';
          const activeOrder = orders.find((order) =>
            order.table_id === table.id && ['active', 'correction', 'in_review'].includes(order.status)
          );

          const statusColor = isAvailable
            ? 'border-success/30 bg-surface'
            : isOccupied
            ? 'border-accent/40 bg-surface'
            : 'border-warning/40 bg-surface';

          const badgeColor = isAvailable
            ? 'bg-success-soft text-success-foreground'
            : isOccupied
            ? 'bg-accent-soft text-warning-foreground'
            : 'bg-warning-soft text-warning-foreground';

          return (
            <div
              key={table.id}
              className={`relative flex flex-col justify-between rounded-xl border p-4 transition-all ${statusColor} ${
                !table.is_active ? 'opacity-50 grayscale' : 'shadow-xs hover:shadow-sm'
              }`}
            >
              {editingTableId === table.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editTableNumber}
                    onChange={(e) => setEditTableNumber(e.target.value)}
                    className="min-h-10 w-full rounded-md border border-border bg-surface px-3 text-base text-foreground sm:text-sm"
                  />
                  <input
                    type="number"
                    min="1"
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(e.target.value)}
                    className="min-h-10 w-full rounded-md border border-border bg-surface px-3 text-base text-foreground sm:text-sm"
                  />
                  <div className="flex gap-1 justify-end">
                    <button
                      onClick={() => setEditingTableId(null)}
                      className="grid h-9 w-9 place-items-center rounded-md bg-surface-muted text-foreground hover:bg-border"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleUpdate(table.id)}
                      className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground hover:bg-primary-hover"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xl font-bold tracking-tight text-foreground">
                        {table.table_number}
                      </span>
                      <button
                        onClick={() => startEdit(table)}
                        className="grid min-h-10 min-w-10 place-items-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                        title="Edit Table"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="mb-3 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{table.capacity} Seats</span>
                    </div>

                    <div className="mb-3">
                      <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
                        {isAvailable ? 'Available' : isOccupied ? 'Occupied' : 'Bill Pending'}
                      </span>
                    </div>

                    {activeOrder && (
                      <div className="mb-3 space-y-1.5">
                        <label htmlFor={`waiter-${activeOrder.id}`} className="block text-xs font-semibold text-muted-foreground">
                          Assigned: {activeOrder.profiles?.full_name || 'Waiter'}
                        </label>
                        <select
                          id={`waiter-${activeOrder.id}`}
                          value={selectedWaiters[activeOrder.id] || activeOrder.waiter_id}
                          onChange={(event) => setSelectedWaiters((previous) => ({
                            ...previous,
                            [activeOrder.id]: event.target.value
                          }))}
                          className="min-h-10 w-full rounded-md border border-border bg-surface px-3 text-base text-foreground sm:text-sm"
                        >
                          {!waiters.some((waiter) => waiter.id === activeOrder.waiter_id) && (
                            <option value={activeOrder.waiter_id}>
                              {activeOrder.profiles?.full_name || 'Current waiter'} (inactive)
                            </option>
                          )}
                          {waiters.map((waiter) => (
                            <option key={waiter.id} value={waiter.id}>{waiter.full_name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={assigningOrderId === activeOrder.id || (selectedWaiters[activeOrder.id] || activeOrder.waiter_id) === activeOrder.waiter_id}
                          onClick={() => handleReassign(activeOrder)}
                          className="min-h-10 w-full rounded-md border border-border bg-surface px-2 text-xs font-semibold text-primary hover:bg-primary-soft disabled:opacity-40"
                        >
                          {assigningOrderId === activeOrder.id ? 'Reassigning…' : 'Reassign Waiter'}
                        </button>
                      </div>
                    )}
                  </div>

                    <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <span>{table.is_active ? 'Active' : 'Off'}</span>
                        <ToggleSwitch checked={table.is_active} loading={updatingTableId === table.id} onChange={() => handleToggleActive(table)} label={`${table.table_number} table status`} />
                      </div>

                    {!isAvailable && (
                      <button
                        onClick={() => handleResetStatus(table)}
                        className="inline-flex min-h-10 items-center gap-1 rounded-md px-2 text-xs font-semibold text-muted-foreground hover:bg-surface-muted hover:text-primary"
                        title="Force Reset Status to Available"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

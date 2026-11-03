import React, { useState } from 'react';
import { useDhaba } from '../../context/DhabaContext';
import { 
  Armchair, 
  Plus, 
  Edit2, 
  Check, 
  X, 
  Users, 
  AlertCircle, 
  Power,
  RotateCcw
} from 'lucide-react';

export const TableManagement = () => {
  const { tables, addTable, updateTable } = useDhaba();

  const [isAdding, setIsAdding] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newCapacity, setNewCapacity] = useState('4');

  const [editingTableId, setEditingTableId] = useState(null);
  const [editTableNumber, setEditTableNumber] = useState('');
  const [editCapacity, setEditCapacity] = useState('4');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newTableNumber.trim()) {
      setError('Table number or name is required');
      return;
    }

    try {
      await addTable({
        table_number: newTableNumber.trim(),
        capacity: Number(newCapacity) || 4
      });
      setSuccess(`Table ${newTableNumber.trim()} added successfully!`);
      setNewTableNumber('');
      setNewCapacity('4');
      setIsAdding(false);
    } catch (err) {
      setError(err.message || 'Failed to add table');
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
      setEditingTableId(null);
    } catch (err) {
      setError(err.message || 'Failed to update table');
    }
  };

  const handleToggleActive = async (table) => {
    setError('');
    setSuccess('');
    try {
      await updateTable(table.id, {
        is_active: !table.is_active
      });
      setSuccess(`Table ${table.table_number} ${table.is_active ? 'deactivated' : 'activated'}`);
    } catch (err) {
      setError(err.message || 'Failed to update table status');
    }
  };

  const handleResetStatus = async (table) => {
    // Admin override if table is stuck in occupied/pending without active orders
    if (!window.confirm(`Force reset Table ${table.table_number} to Available?`)) return;
    try {
      await updateTable(table.id, { status: 'available' });
      setSuccess(`Table ${table.table_number} reset to Available.`);
    } catch (err) {
      setError(err.message || 'Failed to reset table');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E8E4DE] rounded-xl p-5 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-xl font-bold text-[#2B2623] flex items-center gap-2">
            <Armchair className="w-6 h-6 text-[#C2570C]" />
            <span>Restaurant Tables Management</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#6B635C] mt-1">
            Configure dhaba seating capacity, table numbers, and monitor live table occupancy.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#C2570C] hover:bg-[#A8480A] text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{isAdding ? 'Cancel' : 'Add New Table'}</span>
        </button>
      </div>

      {/* Notification alerts */}
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

      {/* Add Table Form */}
      {isAdding && (
        <form onSubmit={handleCreate} className="bg-[#FAF9F7] border-2 border-[#C2570C]/40 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-[#2B2623]">Create New Dhaba Table</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#6B635C] uppercase mb-1">
                Table Name / Number *
              </label>
              <input
                type="text"
                value={newTableNumber}
                onChange={(e) => setNewTableNumber(e.target.value)}
                placeholder="e.g. T-13 or Khatiya-1"
                className="w-full px-3.5 py-2.5 bg-white border border-[#E8E4DE] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C2570C]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#6B635C] uppercase mb-1">
                Seating Capacity *
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E8E4DE] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C2570C]"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 bg-white text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold border border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#C2570C] hover:bg-[#A8480A] text-white rounded-xl text-xs font-bold shadow-sm active:scale-95"
            >
              Save Table
            </button>
          </div>
        </form>
      )}

      {/* Table Status Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs bg-white border border-[#E8E4DE] p-3 rounded-xl">
        <span className="font-bold text-[#2B2623] mr-1">Status Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500"></span>
          <span>Occupied (Running Order)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-purple-600"></span>
          <span>Bill Pending Approval</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto text-slate-500">
          <span>Total Tables: {tables.length}</span>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {tables.map((table) => {
          const isOccupied = table.status === 'occupied';
          const isAvailable = table.status === 'available';

          const statusColor = isAvailable 
            ? 'border-emerald-500/40 bg-emerald-50/40 text-emerald-950'
            : isOccupied 
            ? 'border-amber-500/60 bg-amber-50/50 text-amber-950' 
            : 'border-purple-500/60 bg-purple-50/50 text-purple-950';

          const badgeColor = isAvailable 
            ? 'bg-emerald-600 text-white' 
            : isOccupied 
            ? 'bg-amber-600 text-white' 
            : 'bg-purple-600 text-white';

          return (
            <div
              key={table.id}
              className={`border-2 rounded-xl p-3.5 sm:p-4 flex flex-col justify-between transition-all relative ${statusColor} ${
                !table.is_active ? 'opacity-50 grayscale' : 'shadow-xs hover:shadow-sm'
              }`}
            >
              {editingTableId === table.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editTableNumber}
                    onChange={(e) => setEditTableNumber(e.target.value)}
                    className="w-full text-xs p-1.5 bg-white border border-[#E8E4DE] rounded-lg"
                  />
                  <input
                    type="number"
                    min="1"
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(e.target.value)}
                    className="w-full text-xs p-1.5 bg-white border border-[#E8E4DE] rounded-lg"
                  />
                  <div className="flex gap-1 justify-end">
                    <button
                      onClick={() => setEditingTableId(null)}
                      className="p-1 bg-slate-200 text-slate-700 rounded-md"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleUpdate(table.id)}
                      className="p-1 bg-emerald-600 text-white rounded-md"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-base sm:text-lg font-bold tracking-tight text-[#2B2623]">
                        {table.table_number}
                      </span>
                      <button
                        onClick={() => startEdit(table)}
                        className="p-1 text-slate-400 hover:text-[#2B2623] rounded-md transition-colors"
                        title="Edit Table"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-slate-600 font-medium mb-3">
                      <Users className="w-3.5 h-3.5 text-[#6B635C]" />
                      <span>{table.capacity} Seats</span>
                    </div>

                    <div className="mb-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
                        {isAvailable ? 'Available' : isOccupied ? 'Occupied' : 'Bill Pending'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-black/10 flex items-center justify-between text-xs">
                    <button
                      onClick={() => handleToggleActive(table)}
                      className={`flex items-center gap-1 text-[11px] font-bold ${
                        table.is_active ? 'text-slate-500 hover:text-red-700' : 'text-emerald-700'
                      }`}
                      title={table.is_active ? 'Deactivate Table' : 'Activate Table'}
                    >
                      <Power className="w-3 h-3" />
                      <span>{table.is_active ? 'Active' : 'Off'}</span>
                    </button>

                    {!isAvailable && (
                      <button
                        onClick={() => handleResetStatus(table)}
                        className="text-[10px] text-slate-500 hover:text-[#C2570C] flex items-center gap-0.5"
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

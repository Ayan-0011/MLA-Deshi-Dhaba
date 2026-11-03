import React, { useState } from 'react';
import { useDhaba } from '../../context/DhabaContext';
import { formatINR } from '../../lib/supabase';
import { 
  Armchair, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ReceiptText,
  Search,
  ArrowRight
} from 'lucide-react';

export const WaiterTableSelection = ({ onSelectTable }) => {
  const { tables, orders } = useDhaba();
  const [filter, setFilter] = useState('all'); // 'all' | 'available' | 'occupied' | 'bill_pending'
  const [search, setSearch] = useState('');

  // Find active orders map by table_id
  const activeOrdersMap = orders.reduce((map, order) => {
    if (order.status === 'active' || order.status === 'correction') {
      map[order.table_id] = order;
    }
    return map;
  }, {});

  const filteredTables = tables.filter((t) => {
    if (!t.is_active) return false;
    const matchesFilter = filter === 'all' || t.status === filter;
    const matchesSearch = t.table_number.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-6 py-6 pb-24">
      {/* Header */}
      <div className="bg-white border border-[#E8E4DE] rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-xl font-bold text-[#2B2623] flex items-center gap-2">
            <Armchair className="w-6 h-6 text-[#C2570C]" />
            <span>Select Dining Table</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#6B635C] mt-1">
            Tap a table to take order, manage running items, or review bill status.
          </p>
        </div>

        {/* Quick status counter summary */}
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800">
            {tables.filter(t => t.status === 'available' && t.is_active).length} Available
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800">
            {tables.filter(t => t.status === 'occupied' && t.is_active).length} Occupied
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-purple-100 text-purple-800">
            {tables.filter(t => t.status === 'bill_pending' && t.is_active).length} Pending
          </span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#6B635C] absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search table number (e.g. T-1, T-5)..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E8E4DE] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C2570C]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs font-bold">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-2 rounded-xl whitespace-nowrap transition-colors ${
              filter === 'all'
                ? 'bg-[#C2570C] text-white shadow-xs'
                : 'bg-white text-[#2B2623] border border-[#E8E4DE] hover:bg-[#FAF9F7]'
            }`}
          >
            All Tables
          </button>
          <button
            onClick={() => setFilter('available')}
            className={`px-3 py-2 rounded-xl whitespace-nowrap transition-colors ${
              filter === 'available'
                ? 'bg-[#C2570C] text-white shadow-xs'
                : 'bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50'
            }`}
          >
            Available Only
          </button>
          <button
            onClick={() => setFilter('occupied')}
            className={`px-3 py-2 rounded-xl whitespace-nowrap transition-colors ${
              filter === 'occupied'
                ? 'bg-[#C2570C] text-white shadow-xs'
                : 'bg-white text-amber-800 border border-amber-300 hover:bg-amber-50'
            }`}
          >
            Occupied Only
          </button>
          <button
            onClick={() => setFilter('bill_pending')}
            className={`px-3 py-2 rounded-xl whitespace-nowrap transition-colors ${
              filter === 'bill_pending'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-white text-purple-800 border border-purple-300 hover:bg-purple-50'
            }`}
          >
            Bill Pending
          </button>
        </div>
      </div>

      {/* Tables Grid (Touch-friendly large cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
        {filteredTables.map((table) => {
          const isAvailable = table.status === 'available';
          const isOccupied = table.status === 'occupied';
          const isPending = table.status === 'bill_pending';

          const activeOrder = activeOrdersMap[table.id];
          const runningTotal = activeOrder?.order_items?.reduce(
            (sum, item) => sum + (Number(item.unit_price) * Number(item.quantity)),
            0
          ) || 0;

          const cardTheme = isAvailable
            ? 'border-emerald-500/50 bg-emerald-50/50 hover:border-emerald-600 hover:bg-emerald-50'
            : isOccupied
            ? 'border-amber-500/60 bg-amber-50/60 hover:border-amber-600 hover:bg-amber-50'
            : 'border-purple-500/60 bg-purple-50/60 hover:border-purple-600 hover:bg-purple-50';

          const badgeTheme = isAvailable
            ? 'bg-emerald-600 text-white'
            : isOccupied
            ? 'bg-amber-600 text-white'
            : 'bg-purple-600 text-white';

          return (
            <button
              key={table.id}
              onClick={() => onSelectTable(table)}
              disabled={isPending}
              className={`p-4 rounded-xl border-2 text-left flex flex-col justify-between transition-all relative shadow-xs hover:shadow-sm active:scale-97 disabled:cursor-not-allowed ${cardTheme}`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xl font-bold text-[#2B2623]">
                    {table.table_number}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
                    <Users className="w-3.5 h-3.5 text-[#6B635C]" />
                    <span>{table.capacity}</span>
                  </div>
                </div>

                <div className="mt-1">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeTheme}`}>
                    {isAvailable ? 'Available' : isOccupied ? 'Occupied' : 'Bill Pending'}
                  </span>
                </div>
              </div>

              {/* Status details */}
              <div className="mt-4 pt-2.5 border-t border-black/10">
                {isAvailable && (
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                    <span>Take Order</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                )}

                {isOccupied && (
                  <div>
                    <div className="text-[10px] text-amber-900 font-semibold uppercase">
                      Running Total
                    </div>
                    <div className="text-base font-bold text-[#14532D]">
                      {formatINR(runningTotal)}
                    </div>
                  </div>
                )}

                {isPending && (
                  <div className="text-[11px] text-purple-900 font-bold leading-tight">
                    Awaiting Admin Approval
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useDhaba } from '../../context/DhabaContext';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../lib/supabase';
import { 
  Armchair, 
  Users, 
  Search,
  ArrowRight,
  UserRound,
  LockKeyhole
} from 'lucide-react';
import { Badge, Card, Tabs } from '../ui';

export const WaiterTableSelection = ({ onSelectTable }) => {
  const { tables, orders } = useDhaba();
  const { user } = useAuth();
  const [filter, setFilter] = useState('all'); // 'all' | 'available' | 'occupied' | 'bill_pending'
  const [search, setSearch] = useState('');

  // Find active orders map by table_id
  const activeOrdersMap = orders.reduce((map, order) => {
    if (order.status === 'active' || order.status === 'correction' || order.status === 'in_review') {
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
    <div className="mx-auto max-w-7xl space-y-5 px-3 py-5 pb-24 sm:px-6 sm:py-6">
      <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-primary">Floor service</p>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
            <Armchair aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
            <span>Select dining table</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose a table to take an order, manage running items, or review bill status.</p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Table status totals">
          <Badge tone="success">{tables.filter(t => t.status === 'available' && t.is_active).length} Available</Badge>
          <Badge tone="occupied">{tables.filter(t => t.status === 'occupied' && t.is_active).length} Occupied</Badge>
          <Badge tone="pending">{tables.filter(t => t.status === 'bill_pending' && t.is_active).length} Pending</Badge>
        </div>
      </Card>

      <div className="space-y-3 sm:flex sm:items-center sm:gap-3 sm:space-y-0">
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Search table number</span>
          <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search table number (e.g. T-1)"
            className="min-h-11 w-full rounded-md border border-border bg-surface pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </label>
        <Tabs
          value={filter}
          onChange={setFilter}
          className="sm:max-w-full"
          items={[
            { value: 'all', label: 'All tables' },
            { value: 'available', label: 'Available' },
            { value: 'occupied', label: 'Occupied' },
            { value: 'bill_pending', label: 'Bill pending' },
          ]}
        />
      </div>

      {filteredTables.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-semibold text-foreground">No tables match this view</p>
          <p className="mt-1 text-sm text-muted-foreground">Try another status or search term.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
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
                type="button"
                onClick={() => onSelectTable(table)}
                disabled={isPending}
                aria-label={`Table ${table.table_number}, ${isAvailable ? 'available' : isOccupied ? 'occupied' : 'bill pending'}${isPending ? ', awaiting admin approval' : ''}`}
                className={`flex min-h-40 flex-col justify-between rounded-lg border border-border bg-surface p-4 text-left shadow-sm transition hover:border-primary hover:shadow-md focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-70 ${isAvailable ? 'hover:bg-success-soft/40' : isOccupied ? 'hover:bg-accent-soft/40' : 'hover:bg-warning-soft/40'}`}
              >
                <div className="min-w-0">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="truncate text-2xl font-bold tracking-tight text-foreground">{table.table_number}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-muted-foreground">
                      <Users aria-hidden="true" className="h-4 w-4" /> {table.capacity}
                    </span>
                  </div>
                  <Badge tone={statusTone}>{isAvailable ? 'Available' : isOccupied ? 'Occupied' : 'Bill pending'}</Badge>
                  {activeOrder && (
                    <div className="mt-3 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                      {isLocked ? <LockKeyhole aria-hidden="true" className="h-4 w-4 shrink-0 text-warning" /> : <UserRound aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />}
                      <span className="truncate">{isAssignedWaiter ? 'Assigned to you' : assignedWaiter}</span>
                      {isLocked && <Badge tone="warning" className="ml-auto shrink-0">View only</Badge>}
                    </div>
                  )}
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

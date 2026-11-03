import React, { useState } from 'react';
import { useDhaba } from '../../context/DhabaContext';
import { formatINR } from '../../lib/supabase';
import { Clock, UserRound, Utensils } from 'lucide-react';

export const AllOrders = () => {
  const { orders } = useDhaba();
  const [filter, setFilter] = useState('active'); // 'active' | 'all'

  const filteredOrders = orders.filter((order) => {
    if (filter === 'active') {
      return order.status === 'active' || order.status === 'in_review' || order.status === 'correction';
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-3 py-4 text-foreground sm:px-6 sm:py-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:p-5">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <Clock className="h-6 w-6 text-primary" />
            <span>All Dhaba Orders</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Live overview of running, in-review, and completed table orders.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-md border border-border bg-surface-muted p-1">
          <button
            onClick={() => setFilter('active')}
            className={`min-h-10 shrink-0 rounded px-3 text-sm font-semibold transition-all ${
              filter === 'active' ? 'bg-surface text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Live Running Orders
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`min-h-10 shrink-0 rounded px-3 text-sm font-semibold transition-all ${
              filter === 'all' ? 'bg-surface text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Order History
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
          <Utensils className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
          <h3 className="text-base font-bold text-foreground">No Orders Found</h3>
          <p className="mt-1 text-sm text-muted-foreground">There are currently no orders matching this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const total = order.order_items?.reduce(
              (sum, item) => sum + (Number(item.unit_price) * Number(item.quantity)),
              0
            ) || 0;

            const isCorrection = order.status === 'correction';
            const isReview = order.status === 'in_review';
            const isActive = order.status === 'active';

            return (
              <div
                key={order.id}
                className="flex flex-col justify-between rounded-xl border border-border bg-surface p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-foreground">
                        {order.restaurant_tables?.table_number || 'Table'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        isActive ? 'bg-accent-soft text-warning-foreground' :
                        isReview ? 'bg-warning-soft text-warning-foreground' :
                        isCorrection ? 'bg-danger-soft text-danger-foreground' :
                        'bg-success-soft text-success-foreground'
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                    <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <UserRound className="h-4 w-4" />
                    <span>Waiter: {order.profiles?.full_name || 'Staff'}</span>
                  </div>

                  {/* Items List */}
                  <div className="mb-4 space-y-2 rounded-lg border border-border bg-surface-muted p-3 text-sm">
                    {order.order_items?.map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <span className="font-medium text-foreground">
                          {item.quantity} × {item.item_name}
                        </span>
                        <span className="font-semibold text-muted-foreground">
                          {formatINR(Number(item.unit_price) * Number(item.quantity))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Running Total
                  </span>
                  <span className="text-base font-bold text-success-foreground">
                    {formatINR(total)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

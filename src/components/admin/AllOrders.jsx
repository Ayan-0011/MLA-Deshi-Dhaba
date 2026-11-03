import React, { useState } from 'react';
import { useDhaba } from '../../context/DhabaContext';
import { formatINR } from '../../lib/supabase';
import { Clock, Armchair, User, Utensils, CheckCircle, AlertTriangle } from 'lucide-react';

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
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E8E4DE] rounded-xl p-5 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-xl font-bold text-[#2B2623] flex items-center gap-2">
            <Clock className="w-6 h-6 text-[#C2570C]" />
            <span>All Dhaba Orders</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#6B635C] mt-1">
            Live overview of running, in-review, and completed table orders.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2 bg-[#FAF9F7] p-1 rounded-xl border border-[#E8E4DE]">
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === 'active' ? 'bg-[#C2570C] text-white shadow-xs' : 'text-[#2B2623] hover:bg-white/60'
            }`}
          >
            Live Running Orders
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === 'all' ? 'bg-[#C2570C] text-white shadow-xs' : 'text-[#2B2623] hover:bg-white/60'
            }`}
          >
            All Order History
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white border border-[#E8E4DE] rounded-xl p-12 text-center text-slate-400">
          <Utensils className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-[#2B2623]">No Orders Found</h3>
          <p className="text-xs text-slate-500 mt-1">There are currently no orders matching this filter.</p>
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
                className="bg-white border border-[#E8E4DE] rounded-xl p-5 shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-[#2B2623]">
                        {order.restaurant_tables?.table_number || 'Table'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        isActive ? 'bg-amber-100 text-amber-800' :
                        isReview ? 'bg-purple-100 text-purple-800' :
                        isCorrection ? 'bg-red-100 text-red-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <div className="text-xs text-[#6B635C] font-semibold flex items-center gap-1.5 mb-3">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Waiter: {order.profiles?.full_name || 'Staff'}</span>
                  </div>

                  {/* Items List */}
                  <div className="bg-[#FAF9F7] rounded-xl p-3 border border-[#E8E4DE] space-y-1.5 text-xs mb-4">
                    {order.order_items?.map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <span className="font-medium text-[#2B2623]">
                          {item.quantity} × {item.item_name}
                        </span>
                        <span className="font-semibold text-slate-700">
                          {formatINR(Number(item.unit_price) * Number(item.quantity))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Running Total
                  </span>
                  <span className="text-base font-bold text-[#14532D]">
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

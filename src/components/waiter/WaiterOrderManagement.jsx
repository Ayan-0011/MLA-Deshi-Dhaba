import React, { useState, useEffect, useMemo } from 'react';
import { useDhaba } from '../../context/DhabaContext';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../lib/supabase';
import { FinalBillModal } from './FinalBillModal';
import { 
  Armchair, 
  ArrowLeft, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Save, 
  ReceiptText, 
  Check, 
  AlertCircle, 
  UtensilsCrossed, 
  ShoppingBag,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

export const WaiterOrderManagement = ({ table, onBack, onBillSubmitted }) => {
  const { user, profile } = useAuth();
  const { categories, menuItems, orders, saveRunningOrder, generateFinalBill } = useDhaba();

  // Find existing active or correction order for this table
  const activeOrder = useMemo(() => {
    return orders.find(
      (o) => o.table_id === table.id && (o.status === 'active' || o.status === 'correction')
    );
  }, [orders, table.id]);

  // Local cart state for live manipulation
  const [cartItems, setCartItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState('');

  // Mobile cart drawer expand state

  // Bill preview modal state
  const [showBillModal, setShowBillModal] = useState(false);
  const [isSubmittingBill, setIsSubmittingBill] = useState(false);

  const [savingOrder, setSavingOrder] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  // Initialize cart from database order on table open or change
  useEffect(() => {
    if (activeOrder && activeOrder.order_items && activeOrder.order_items.length > 0) {
      const items = activeOrder.order_items.map((oi) => ({
        menu_item_id: oi.menu_item_id,
        item_name: oi.item_name,
        unit_price: Number(oi.unit_price),
        quantity: Number(oi.quantity)
      }));
      setCartItems(items);
      setNotes(activeOrder.notes || '');
    } else {
      setCartItems([]);
      setNotes('');
    }
  }, [activeOrder, table.id]);

  // Live calculations
  const grandTotal = useMemo(() => {
    return cartItems.reduce(
      (sum, item) => sum + (Number(item.unit_price) * Number(item.quantity)),
      0
    );
  }, [cartItems]);

  const totalItemCount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + Number(item.quantity), 0);
  }, [cartItems]);

  // Cart operations
  const handleAddItem = (menuItem) => {
    if (!menuItem.is_available) return;

    setCartItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.menu_item_id === menuItem.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            menu_item_id: menuItem.id,
            item_name: menuItem.name,
            unit_price: Number(menuItem.price),
            quantity: 1
          }
        ];
      }
    });
  };

  const handleIncrement = (menuItemId) => {
    setCartItems((prev) =>
      prev.map((i) => (i.menu_item_id === menuItemId ? { ...i, quantity: i.quantity + 1 } : i))
    );
  };

  const handleDecrement = (menuItemId) => {
    setCartItems((prev) =>
      prev
        .map((i) => (i.menu_item_id === menuItemId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const handleRemoveItem = (menuItemId) => {
    setCartItems((prev) => prev.filter((i) => i.menu_item_id !== menuItemId));
  };

  // Save order to Supabase
  const handleSaveOrder = async (notify = true) => {
    if (cartItems.length === 0) {
      setStatusMessage({ type: 'error', text: 'Cannot save an empty order. Please add items.' });
      return null;
    }

    setSavingOrder(true);
    setStatusMessage({ type: '', text: '' });
    try {
      const orderId = await saveRunningOrder(table.id, user.id, cartItems, notes);
      if (notify) {
        setStatusMessage({ type: 'success', text: `Order for ${table.table_number} saved in database!` });
      }
      return orderId;
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save order' });
      return null;
    } finally {
      setSavingOrder(false);
    }
  };

  // Open Final Bill Modal
  const handleOpenFinalBill = async () => {
    if (cartItems.length === 0) {
      setStatusMessage({ type: 'error', text: 'Please add items before generating a bill.' });
      return;
    }
    // First save the latest order to database
    const savedOrderId = await handleSaveOrder(false);
    if (savedOrderId || activeOrder?.id) {
      setShowBillModal(true);
    }
  };

  // Confirm final bill submission to admin
  const handleConfirmFinalBill = async () => {
    setIsSubmittingBill(true);
    try {
      const orderIdToBill = activeOrder?.id || (await handleSaveOrder(false));
      if (!orderIdToBill) throw new Error('Could not verify order');

      await generateFinalBill(orderIdToBill, user.id);
      setShowBillModal(false);
      if (onBillSubmitted) onBillSubmitted();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Bill submission failed' });
    } finally {
      setIsSubmittingBill(false);
    }
  };

  // Filter food menu
  const filteredMenuItems = menuItems.filter((item) => {
    const matchesCat = selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 pb-32">
      {/* Top Header Bar */}
      <div className="bg-white border border-[#E8E4DE] rounded-xl p-4 shadow-sm flex items-center justify-between gap-3 mb-4 sticky top-14 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-[#FAF9F7] hover:bg-[#FAF9F7] text-[#2B2623] transition-colors"
            title="Back to tables"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-[#2B2623]">
                Table {table.table_number}
              </h2>
              <span className="text-xs bg-[#FAF9F7] text-[#6B635C] px-2 py-0.5 rounded-md font-bold">
                {table.capacity} Seats
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Waiter: {profile?.full_name || user?.email?.split('@')[0]}
            </p>
          </div>
        </div>

        {/* Action button in header */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={savingOrder || cartItems.length === 0}
            onClick={() => handleSaveOrder(true)}
            className="px-3.5 py-2 bg-[#FAF9F7] hover:bg-[#FAF9F7] text-[#2B2623] border border-[#E8E4DE] rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-40"
          >
            <Save className="w-3.5 h-3.5 text-[#C2570C]" />
            <span className="hidden sm:inline">{savingOrder ? 'Saving...' : 'Save Order'}</span>
          </button>

          <button
            type="button"
            disabled={cartItems.length === 0}
            onClick={handleOpenFinalBill}
            className="px-4 py-2 bg-[#C2570C] hover:bg-[#A8480A] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95 disabled:opacity-40"
          >
            <ReceiptText className="w-3.5 h-3.5" />
            <span>Generate Bill</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {statusMessage.text && (
        <div className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
          statusMessage.type === 'error' ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
        }`}>
          {statusMessage.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Split Layout: Left Menu, Right Cart (Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Food Menu Selection */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Search & Category Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-[#6B635C] absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search food items (Roti, Dal, Paneer, Chai...)"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E8E4DE] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C2570C]"
              />
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-[#C2570C] text-white shadow-xs'
                    : 'bg-white text-[#2B2623] border border-[#E8E4DE] hover:bg-[#FAF9F7]'
                }`}
              >
                All Menu
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-[#C2570C] text-white shadow-xs'
                      : 'bg-white text-[#2B2623] border border-[#E8E4DE] hover:bg-[#FAF9F7]'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredMenuItems.map((item) => {
              const cartItem = cartItems.find((i) => i.menu_item_id === item.id);
              const qty = cartItem ? cartItem.quantity : 0;

              return (
                <div
                  key={item.id}
                  className={`bg-white border rounded-xl p-3.5 flex flex-col justify-between transition-all ${
                    !item.is_available 
                      ? 'border-slate-200 opacity-50 bg-slate-50' 
                      : qty > 0 
                      ? 'border-[#C2570C]/40 ring-2 ring-[#C2570C]/20 shadow-xs' 
                      : 'border-[#E8E4DE] hover:border-[#D6CFC6] shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm sm:text-base text-[#2B2623]">
                          {item.name}
                        </h4>
                        <span className="text-[10px] font-semibold text-[#C2570C] bg-[#FAF9F7] px-1.5 py-0.5 rounded">
                          {item.menu_categories?.name || 'Item'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-bold text-[#14532D]">
                          {formatINR(item.price)}
                        </span>
                      </div>
                    </div>

                    {item.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Add / Quantity buttons */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    {!item.is_available ? (
                      <span className="text-xs font-semibold text-slate-400">Unavailable</span>
                    ) : qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => handleAddItem(item)}
                        className="w-full py-2 bg-[#FAF9F7] hover:bg-[#A8480A] text-[#2B2623] hover:text-white border border-[#E8E4DE] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to Order</span>
                      </button>
                    ) : (
                      <div className="w-full flex items-center justify-between bg-emerald-50 rounded-xl p-1 border border-[#C2570C]/40">
                        <button
                          type="button"
                          onClick={() => handleDecrement(item.id)}
                          className="w-8 h-8 rounded-lg bg-white text-[#14532D] hover:bg-slate-100 flex items-center justify-center shadow-xs active:scale-90 font-bold"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-bold text-sm text-[#14532D] px-2">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleIncrement(item.id)}
                          className="w-8 h-8 rounded-lg bg-[#C2570C] text-white hover:bg-[#A8480A] flex items-center justify-center shadow-xs active:scale-90 font-bold"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Running Order Cart Drawer (Desktop sticky, Mobile collapsible) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white border border-[#E8E4DE] rounded-xl shadow-sm overflow-hidden flex flex-col sticky top-20">
          <div className="bg-[#FAF9F7] text-[#2B2623] border-b border-[#E8E4DE] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#C2570C]" />
              <h3 className="font-bold text-sm sm:text-base">
                Running Order — Table {table.table_number}
              </h3>
            </div>
            <span className="text-xs font-mono font-bold bg-[#C2570C] text-white px-2 py-0.5 rounded-full">
              {totalItemCount} items
            </span>
          </div>

          <div className="p-4 flex-1 flex flex-col justify-between max-h-[60vh] overflow-y-auto">
            {cartItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <UtensilsCrossed className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-[#2B2623]">Order is empty</p>
                <p className="text-[11px] text-slate-500">Tap items from the food menu to add them to this table's running order.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {cartItems.map((item) => {
                  const lineTotal = Number(item.unit_price) * Number(item.quantity);

                  return (
                    <div key={item.menu_item_id} className="py-3 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-xs sm:text-sm text-[#2B2623] truncate">
                          {item.item_name}
                        </h5>
                        <div className="text-[11px] text-slate-500">
                          {formatINR(item.unit_price)} × {item.quantity} = <strong className="text-[#14532D]">{formatINR(lineTotal)}</strong>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDecrement(item.menu_item_id)}
                          className="w-7 h-7 rounded-lg bg-[#FAF9F7] hover:bg-slate-200 text-[#2B2623] flex items-center justify-center font-bold text-xs active:scale-90"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-[#2B2623]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleIncrement(item.menu_item_id)}
                          className="w-7 h-7 rounded-lg bg-[#FAF9F7] hover:bg-slate-200 text-[#2B2623] flex items-center justify-center font-bold text-xs active:scale-90"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.menu_item_id)}
                          className="w-7 h-7 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 flex items-center justify-center ml-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart Grand Total & Actions */}
          <div className="p-4 bg-[#FAF9F7] border-t border-[#E8E4DE] space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-[#6B635C] uppercase tracking-wider block">
                  Running Grand Total
                </span>
                <span className="text-[11px] text-slate-500">
                  Auto-calculated from items & quantities
                </span>
              </div>
              <span className="text-2xl font-bold text-[#14532D]">
                {formatINR(grandTotal)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={savingOrder || cartItems.length === 0}
                onClick={() => handleSaveOrder(true)}
                className="py-2.5 px-3 bg-white hover:bg-slate-50 border border-[#E8E4DE] text-[#2B2623] rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 active:scale-95 disabled:opacity-40"
              >
                <Save className="w-3.5 h-3.5 text-[#C2570C]" />
                <span>{savingOrder ? 'Saving...' : 'Save Order'}</span>
              </button>

              <button
                type="button"
                disabled={cartItems.length === 0}
                onClick={handleOpenFinalBill}
                className="py-2.5 px-3 bg-[#C2570C] hover:bg-[#A8480A] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1 active:scale-95 disabled:opacity-40"
              >
                <ReceiptText className="w-3.5 h-3.5" />
                <span>Final Bill</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar (Always clearly visible with running total!) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white text-[#2B2623] border-t border-[#E8E4DE] p-3 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] text-[#6B635C] uppercase tracking-wider font-bold">
              Table {table.table_number} • {totalItemCount} Items
            </div>
            <div className="text-xl font-bold text-emerald-600">
              {formatINR(grandTotal)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={savingOrder || cartItems.length === 0}
              onClick={() => handleSaveOrder(true)}
              className="py-2 px-3 bg-[#FAF9F7] text-[#2B2623] rounded-xl text-xs font-bold shadow-xs active:scale-95 disabled:opacity-40 flex items-center gap-1"
            >
              <Save className="w-3 h-3 text-[#C2570C]" />
              <span>Save</span>
            </button>

            <button
              type="button"
              disabled={cartItems.length === 0}
              onClick={handleOpenFinalBill}
              className="py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-[#2B2623] font-bold rounded-xl text-xs shadow-sm active:scale-95 disabled:opacity-40 flex items-center gap-1"
            >
              <ReceiptText className="w-3.5 h-3.5" />
              <span>Final Bill</span>
            </button>
          </div>
        </div>
      </div>

      {/* Final Bill Review & Submission Modal */}
      {showBillModal && (
        <FinalBillModal
          order={{ items: cartItems, notes }}
          table={table}
          waiterName={profile?.full_name || user?.email?.split('@')[0]}
          onClose={() => setShowBillModal(false)}
          onConfirmSubmit={handleConfirmFinalBill}
          isSubmitting={isSubmittingBill}
        />
      )}
    </div>
  );
};

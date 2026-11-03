import React, { useState, useEffect, useMemo } from 'react';
import { useDhaba } from '../../context/DhabaContext';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../lib/supabase';
import { FinalBillModal } from './FinalBillModal';
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Trash2, 
  Save, 
  ReceiptText, 
  Check, 
  AlertCircle, 
  UtensilsCrossed, 
  ShoppingBag,
  LockKeyhole
} from 'lucide-react';
import { notify } from '../../lib/notifications';
import { Badge, Button, Card, EmptyState, QuantityStepper, Tabs } from '../ui';

export const WaiterOrderManagement = ({ table, onBack, onBillSubmitted }) => {
  const { user, profile } = useAuth();
  const { categories, menuItems, orders, saveRunningOrder, generateFinalBill } = useDhaba();

  // Find existing active or correction order for this table
  const activeOrder = useMemo(() => {
    return orders.find(
      (o) => o.table_id === table.id && (o.status === 'active' || o.status === 'correction')
    );
  }, [orders, table.id]);
  const isReadOnly = Boolean(activeOrder && activeOrder.waiter_id !== user?.id);
  const assignedWaiterName = activeOrder?.profiles?.full_name ||
    (activeOrder?.waiter_id === user?.id ? profile?.full_name : null) ||
    'Assigned waiter';

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
    if (isReadOnly || !menuItem.is_available) return;

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
    if (isReadOnly) return;
    setCartItems((prev) =>
      prev.map((i) => (i.menu_item_id === menuItemId ? { ...i, quantity: i.quantity + 1 } : i))
    );
  };

  const handleDecrement = (menuItemId) => {
    if (isReadOnly) return;
    setCartItems((prev) =>
      prev
        .map((i) => (i.menu_item_id === menuItemId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const handleRemoveItem = (menuItemId) => {
    if (isReadOnly) return;
    setCartItems((prev) => prev.filter((i) => i.menu_item_id !== menuItemId));
  };

  // Save order to Supabase
  const handleSaveOrder = async (showSuccessToast = true) => {
    if (isReadOnly) {
      setStatusMessage({ type: 'error', text: `Only ${assignedWaiterName} can modify this order.` });
      return null;
    }
    if (cartItems.length === 0) {
      setStatusMessage({ type: 'error', text: 'Cannot save an empty order. Please add items.' });
      notify.warning('Add at least one item before saving the order.', `order-empty-${table.id}`);
      return null;
    }

    setSavingOrder(true);
    setStatusMessage({ type: '', text: '' });
    try {
      const orderId = await saveRunningOrder(table.id, user.id, cartItems, notes);
      if (showSuccessToast) {
        setStatusMessage({ type: 'success', text: `Order for ${table.table_number} saved in database!` });
        notify.success(`Order for ${table.table_number} saved.`, `order-saved-${table.id}`);
      }
      return orderId;
    } catch (err) {
      console.error('Order save failed:', err);
      const message = err.message?.includes('assigned to another waiter')
        ? `This order is assigned to ${assignedWaiterName} and is read-only for you.`
        : 'Could not save this order. Please refresh and try again.';
      setStatusMessage({ type: 'error', text: message });
      notify.error(message, `order-save-error-${table.id}`);
      return null;
    } finally {
      setSavingOrder(false);
    }
  };

  // Open Final Bill Modal
  const handleOpenFinalBill = async () => {
    if (isReadOnly) return;
    if (cartItems.length === 0) {
      setStatusMessage({ type: 'error', text: 'Please add items before generating a bill.' });
      notify.warning('Add at least one item before generating a bill.', `bill-empty-${table.id}`);
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
    if (isReadOnly) return;
    setIsSubmittingBill(true);
    try {
      const orderIdToBill = activeOrder?.id || (await handleSaveOrder(false));
      if (!orderIdToBill) throw new Error('Could not verify order');

      await generateFinalBill(orderIdToBill, user.id);
      notify.success('Final bill sent for admin approval.', `bill-submitted-${orderIdToBill}`);
      setShowBillModal(false);
      if (onBillSubmitted) onBillSubmitted();
    } catch (err) {
      console.error('Final bill submission failed:', err);
      const message = err.message?.includes('assigned to another waiter')
        ? `Only ${assignedWaiterName} can submit this bill.`
        : 'Could not submit the bill. Please try again.';
      setStatusMessage({ type: 'error', text: message });
      notify.error(message, `bill-submit-error-${table.id}`);
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
    <div className="mx-auto max-w-7xl px-3 py-4 pb-40 sm:px-6 lg:pb-8">
      <Card className="sticky top-14 z-30 mb-4 flex items-center justify-between gap-2 p-3 sm:gap-4 sm:p-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Button type="button" variant="secondary" size="sm" onClick={onBack} aria-label="Back to tables" title="Back to tables" className="shrink-0 px-2">
            <ArrowLeft aria-hidden="true" className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">Table {table.table_number}</h2>
              <Badge>{table.capacity} seats</Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              Assigned waiter: {activeOrder ? assignedWaiterName : (profile?.full_name || user?.email?.split('@')[0])}
            </p>
          </div>
        </div>
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <Button type="button" variant="secondary" size="sm" disabled={isReadOnly || savingOrder || cartItems.length === 0} onClick={() => handleSaveOrder(true)}>
            <Save aria-hidden="true" className="h-4 w-4" /><span>{savingOrder ? 'Saving...' : 'Save order'}</span>
          </Button>
          <Button type="button" size="sm" disabled={isReadOnly || cartItems.length === 0} onClick={handleOpenFinalBill}>
            <ReceiptText aria-hidden="true" className="h-4 w-4" /><span>Generate bill</span>
          </Button>
        </div>
      </Card>

      {isReadOnly && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-warning/30 bg-warning-soft p-3 text-sm text-warning-foreground" role="status">
          <LockKeyhole aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Read-only order — assigned to {assignedWaiterName}. You can view items, but only the assigned waiter can make changes or submit the final bill.</span>
        </div>
      )}

      {statusMessage.text && (
        <div className={`mb-4 flex items-start gap-2 rounded-md border p-3 text-sm ${statusMessage.type === 'error' ? 'border-danger/30 bg-danger-soft text-danger-foreground' : 'border-success/30 bg-success-soft text-success-foreground'}`} role="status">
          {statusMessage.type === 'error' ? <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /> : <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12 lg:gap-6">
        <section className="min-w-0 space-y-4 lg:col-span-7 xl:col-span-8" aria-label="Food menu">
          <div className="space-y-3">
            <label className="relative block">
              <span className="sr-only">Search menu items</span>
              <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search food items"
                className="min-h-11 w-full rounded-md border border-border bg-surface pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
            </label>
            <Tabs
              value={selectedCategory}
              onChange={setSelectedCategory}
              items={[{ value: 'all', label: 'All menu' }, ...categories.map((cat) => ({ value: cat.id, label: cat.name }))]}
            />
          </div>

          {filteredMenuItems.length === 0 ? (
            <EmptyState icon={UtensilsCrossed} title="No menu items found" description="Try another category or search term." />
          ) : (
            <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2">
              {filteredMenuItems.map((item) => {
                const cartItem = cartItems.find((i) => i.menu_item_id === item.id);
                const qty = cartItem ? cartItem.quantity : 0;

                return (
                  <Card key={item.id} className={`flex min-w-0 flex-col justify-between p-4 transition-shadow hover:shadow-md ${!item.is_available ? 'opacity-60' : qty > 0 ? 'border-primary/50 ring-1 ring-primary/15' : ''}`}>
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="wrap-break-word font-bold text-foreground">{item.name}</h3>
                          <Badge tone="neutral" className="mt-1">{item.menu_categories?.name || 'Item'}</Badge>
                        </div>
                        <span className="shrink-0 text-base font-bold text-primary">{formatINR(item.price)}</span>
                      </div>
                      {item.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>}
                    </div>

                    <div className="mt-4 flex min-h-11 items-center border-t border-border pt-3">
                      {!item.is_available ? (
                        <span className="text-sm font-medium text-muted-foreground">Unavailable</span>
                      ) : qty === 0 ? (
                        <Button type="button" variant="secondary" disabled={isReadOnly} onClick={() => handleAddItem(item)} className="w-full">
                          <Plus aria-hidden="true" className="h-4 w-4" /><span>Add to order</span>
                        </Button>
                      ) : (
                        <QuantityStepper
                          value={qty}
                          label={`${item.name} quantity`}
                          disabled={isReadOnly}
                          onDecrease={() => handleDecrement(item.id)}
                          onIncrease={() => handleIncrement(item.id)}
                        />
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <Card className="flex min-w-0 flex-col overflow-hidden lg:sticky lg:top-20 lg:col-span-5 xl:col-span-4">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-muted px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <ShoppingBag aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
              <h3 className="truncate font-bold text-foreground">Running order · {table.table_number}</h3>
            </div>
            <Badge tone="primary" className="shrink-0">{totalItemCount} items</Badge>
          </div>

          <div className="max-h-[45vh] min-h-28 flex-1 overflow-y-auto p-4 lg:max-h-[55vh]">
            {cartItems.length === 0 ? (
              <EmptyState icon={UtensilsCrossed} title="Order is empty" description="Choose items from the menu to start this table's running order." />
            ) : (
              <div className="divide-y divide-border">
                {cartItems.map((item) => {
                  const lineTotal = Number(item.unit_price) * Number(item.quantity);
                  return (
                    <div key={item.menu_item_id} className="flex items-start justify-between gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="wrap-break-word text-sm font-semibold text-foreground">{item.item_name}</h4>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatINR(item.unit_price)} × {item.quantity} = <strong className="text-foreground">{formatINR(lineTotal)}</strong>
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <QuantityStepper
                          value={item.quantity}
                          label={`${item.item_name} quantity`}
                          disabled={isReadOnly}
                          onDecrease={() => handleDecrement(item.menu_item_id)}
                          onIncrease={() => handleIncrement(item.menu_item_id)}
                        />
                        <Button type="button" variant="ghost" size="sm" disabled={isReadOnly} onClick={() => handleRemoveItem(item.menu_item_id)} aria-label={`Remove ${item.item_name}`} title="Remove item" className="min-h-10 text-danger-foreground">
                          <Trash2 aria-hidden="true" className="h-4 w-4" /><span>Remove</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-3 border-t border-border bg-surface-muted p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">Running total</p>
                <p className="text-xs text-muted-foreground">Calculated from items and quantities</p>
              </div>
              <p className="shrink-0 text-xl font-bold text-primary">{formatINR(grandTotal)}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="secondary" disabled={isReadOnly || savingOrder || cartItems.length === 0} onClick={() => handleSaveOrder(true)}>
                <Save aria-hidden="true" className="h-4 w-4" /><span>{savingOrder ? 'Saving...' : 'Save order'}</span>
              </Button>
              <Button type="button" disabled={isReadOnly || cartItems.length === 0} onClick={handleOpenFinalBill}>
                <ReceiptText aria-hidden="true" className="h-4 w-4" /><span>Final bill</span>
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-3 pt-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] shadow-lg backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-muted-foreground">Table {table.table_number} · {totalItemCount} items</p>
            <p className="text-lg font-bold text-primary">{formatINR(grandTotal)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={isReadOnly || savingOrder || cartItems.length === 0} onClick={() => handleSaveOrder(true)} aria-label={savingOrder ? 'Saving order' : 'Save order'}>
              <Save aria-hidden="true" className="h-4 w-4" /><span className="hidden min-[380px]:inline">Save</span>
            </Button>
            <Button type="button" size="sm" disabled={isReadOnly || cartItems.length === 0} onClick={handleOpenFinalBill}>
              <ReceiptText aria-hidden="true" className="h-4 w-4" /><span>Final bill</span>
            </Button>
          </div>
        </div>
      </div>

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

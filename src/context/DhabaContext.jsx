import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, getSupabaseConfig } from '../lib/supabase';

// RPC missing from the database (not deployed yet) -> allow direct-table fallback.
// Any other RPC error (permission denied, validation failed...) must be surfaced, not bypassed.
const isRpcMissing = (error) =>
  error?.code === 'PGRST202' || error?.code === '42883' || /could not find the function/i.test(error?.message || '');

const DhabaContext = createContext(null);

export const DhabaProvider = ({ children }) => {
  const [tables, setTables] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all core Dhaba data from Supabase
  const fetchData = useCallback(async () => {
    const { isConfigured } = getSupabaseConfig();
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch Tables
      const { data: tablesData, error: tablesErr } = await supabase
        .from('restaurant_tables')
        .select('*')
        .order('table_number', { ascending: true });

      if (tablesErr) console.warn('Error fetching tables:', tablesErr.message);
      else setTables(tablesData || []);

      // Fetch Menu Categories
      const { data: catData, error: catErr } = await supabase
        .from('menu_categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (catErr) console.warn('Error fetching categories:', catErr.message);
      else setCategories(catData || []);

      // Fetch Menu Items
      const { data: menuData, error: menuErr } = await supabase
        .from('menu_items')
        .select('*, menu_categories(name)')
        .order('name', { ascending: true });

      if (menuErr) console.warn('Error fetching menu items:', menuErr.message);
      else setMenuItems(menuData || []);

      // Fetch Orders with items and table details
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select(`
          *,
          restaurant_tables(*),
          profiles(full_name, email),
          order_items(*)
        `)
        .order('created_at', { ascending: false });

      if (ordersErr) console.warn('Error fetching orders:', ordersErr.message);
      else setOrders(ordersData || []);

      // Fetch Bills with items and table details
      const { data: billsData, error: billsErr } = await supabase
        .from('bills')
        .select(`
          *,
          restaurant_tables(*),
          waiter:waiter_id(full_name, email),
          admin:admin_id(full_name, email),
          bill_items(*),
          bill_history(*)
        `)
        .order('submitted_at', { ascending: false });

      if (billsErr) console.warn('Error fetching bills:', billsErr.message);
      else setBills(billsData || []);

    } catch (err) {
      console.error('Error fetching dhaba data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Setup real-time listeners for updates
    const channel = supabase
      .channel('dhaba_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // ===================== TABLE ACTIONS =====================
  const addTable = async ({ table_number, capacity }) => {
    const { data, error } = await supabase
      .from('restaurant_tables')
      .insert({
        table_number: table_number.trim(),
        capacity: Number(capacity) || 4,
        status: 'available',
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    await fetchData();
    return data;
  };

  const updateTable = async (id, updates) => {
    const { data, error } = await supabase
      .from('restaurant_tables')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await fetchData();
    return data;
  };

  // ===================== MENU ACTIONS =====================
  const addMenuItem = async (item) => {
    const { data, error } = await supabase
      .from('menu_items')
      .insert({
        name: item.name.trim(),
        category_id: item.category_id,
        price: Number(item.price) || 0,
        description: item.description?.trim() || null,
        is_available: item.is_available ?? true
      })
      .select()
      .single();

    if (error) throw error;
    await fetchData();
    return data;
  };

  const updateMenuItem = async (id, updates) => {
    const { data, error } = await supabase
      .from('menu_items')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await fetchData();
    return data;
  };

  const addCategory = async (name, displayOrder = 0) => {
    const { data, error } = await supabase
      .from('menu_categories')
      .insert({
        name: name.trim(),
        display_order: Number(displayOrder) || 0,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    await fetchData();
    return data;
  };

  // ===================== ORDER ACTIONS =====================
  // Save or update a running order for a table (Waiter workflow)
  const saveRunningOrder = async (tableId, waiterId, items, notes = null) => {
    if (!items || items.length === 0) {
      throw new Error('Order must have at least one item');
    }

    try {
      // 1. Try atomic RPC if available
      const { data: rpcData, error: rpcError } = await supabase.rpc('save_running_order', {
        p_table_id: tableId,
        p_waiter_id: waiterId,
        p_items: items,
        p_notes: notes
      });

      if (!rpcError) {
        await fetchData();
        return rpcData;
      }
      if (!isRpcMissing(rpcError)) throw rpcError;
    } catch (e) {
      if (!isRpcMissing(e)) throw e;
      console.warn('RPC save_running_order not available, using fallback:', e);
    }

    // Direct Database Fallback:
    // 1. Check for existing active or correction order for this table
    let orderId;
    const { data: existingOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('table_id', tableId)
      .in('status', ['active', 'correction'])
      .maybeSingle();

    if (existingOrders?.id) {
      orderId = existingOrders.id;
      await supabase
        .from('orders')
        .update({
          waiter_id: waiterId,
          notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
    } else {
      const { data: newOrder, error: createErr } = await supabase
        .from('orders')
        .insert({
          table_id: tableId,
          waiter_id: waiterId,
          status: 'active',
          notes: notes
        })
        .select()
        .single();

      if (createErr) throw createErr;
      orderId = newOrder.id;
    }

    // 2. Update table status to 'occupied'
    await supabase
      .from('restaurant_tables')
      .update({ status: 'occupied', updated_at: new Date().toISOString() })
      .eq('id', tableId);

    // 3. Clear old items and insert updated items with price snapshots
    await supabase.from('order_items').delete().eq('order_id', orderId);

    const formattedItems = items.map(item => ({
      order_id: orderId,
      menu_item_id: item.menu_item_id || item.id,
      item_name: item.item_name || item.name,
      unit_price: Number(item.unit_price || item.price),
      quantity: Number(item.quantity)
    }));

    const { error: itemsErr } = await supabase
      .from('order_items')
      .insert(formattedItems);

    if (itemsErr) throw itemsErr;

    await fetchData();
    return orderId;
  };

  // ===================== BILL ACTIONS =====================
  // Waiter generates final bill preview and submits to admin
  const generateFinalBill = async (orderId, waiterId) => {
    try {
      // 1. Try atomic RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc('generate_final_bill', {
        p_order_id: orderId,
        p_waiter_id: waiterId
      });

      if (!rpcError) {
        await fetchData();
        return rpcData;
      }
      if (!isRpcMissing(rpcError)) throw rpcError;
    } catch (e) {
      if (!isRpcMissing(e)) throw e;
      console.warn('RPC generate_final_bill not available, using fallback:', e);
    }

    // Direct Database Fallback:
    // 1. Fetch order details with order_items
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) throw new Error('Order not found');
    if (!order.order_items || order.order_items.length === 0) {
      throw new Error('Order has no items');
    }

    const totalAmount = order.order_items.reduce((sum, item) => {
      return sum + (Number(item.unit_price) * Number(item.quantity));
    }, 0);

    // Unique bill number: MLA-YYYYMMDD-RANDOM4
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const billNumber = `MLA-${todayStr}-${randNum}`;

    // 2. Insert bill
    const { data: bill, error: billErr } = await supabase
      .from('bills')
      .insert({
        bill_number: billNumber,
        order_id: orderId,
        table_id: order.table_id,
        waiter_id: waiterId,
        status: 'pending_approval',
        total_amount: totalAmount,
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (billErr) throw billErr;

    // 3. Snapshot items into bill_items
    const billItems = order.order_items.map(item => ({
      bill_id: bill.id,
      menu_item_id: item.menu_item_id,
      item_name: item.item_name,
      unit_price: Number(item.unit_price),
      quantity: Number(item.quantity),
      line_total: Number(item.unit_price) * Number(item.quantity)
    }));

    await supabase.from('bill_items').insert(billItems);

    // 4. Update order status -> in_review
    await supabase
      .from('orders')
      .update({ status: 'in_review', updated_at: new Date().toISOString() })
      .eq('id', orderId);

    // 5. Update table status -> bill_pending
    await supabase
      .from('restaurant_tables')
      .update({ status: 'bill_pending', updated_at: new Date().toISOString() })
      .eq('id', order.table_id);

    // 6. Record in bill_history
    await supabase.from('bill_history').insert({
      bill_id: bill.id,
      action: 'submitted',
      performed_by: waiterId,
      notes: 'Final bill submitted for admin review'
    });

    await fetchData();
    return bill;
  };

  // Admin approves bill: atomically marks bill approved, closes order, frees table
  const approveBill = async (billId, adminId) => {
    try {
      // 1. Try atomic RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc('approve_bill', {
        p_bill_id: billId,
        p_admin_id: adminId
      });

      if (!rpcError) {
        await fetchData();
        return rpcData;
      }
      if (!isRpcMissing(rpcError)) throw rpcError;
    } catch (e) {
      if (!isRpcMissing(e)) throw e;
      console.warn('RPC approve_bill not available, using fallback:', e);
    }

    // Direct Database Fallback:
    const { data: bill, error: fetchErr } = await supabase
      .from('bills')
      .select('*')
      .eq('id', billId)
      .single();

    if (fetchErr || !bill) throw new Error('Bill not found');
    if (bill.status !== 'pending_approval') {
      throw new Error(`Bill is already processed (${bill.status})`);
    }

    const now = new Date().toISOString();

    // 1. Mark bill as approved
    const { error: billUpdateErr } = await supabase
      .from('bills')
      .update({
        status: 'approved',
        admin_id: adminId,
        approved_at: now
      })
      .eq('id', billId);

    if (billUpdateErr) throw billUpdateErr;

    // 2. Close order
    await supabase
      .from('orders')
      .update({ status: 'closed', updated_at: now })
      .eq('id', bill.order_id);

    // 3. Mark table available
    await supabase
      .from('restaurant_tables')
      .update({ status: 'available', updated_at: now })
      .eq('id', bill.table_id);

    // 4. Log in history
    await supabase.from('bill_history').insert({
      bill_id: billId,
      action: 'approved',
      performed_by: adminId,
      notes: 'Bill approved by admin'
    });

    await fetchData();
    return true;
  };

  // Admin rejects bill: requires rejection reason, returns order to waiter correction
  const rejectBill = async (billId, adminId, reason) => {
    if (!reason || !reason.trim()) {
      throw new Error('Rejection reason is required');
    }

    try {
      // 1. Try atomic RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc('reject_bill', {
        p_bill_id: billId,
        p_admin_id: adminId,
        p_reason: reason.trim()
      });

      if (!rpcError) {
        await fetchData();
        return rpcData;
      }
      if (!isRpcMissing(rpcError)) throw rpcError;
    } catch (e) {
      if (!isRpcMissing(e)) throw e;
      console.warn('RPC reject_bill not available, using fallback:', e);
    }

    // Direct Database Fallback:
    const { data: bill, error: fetchErr } = await supabase
      .from('bills')
      .select('*')
      .eq('id', billId)
      .single();

    if (fetchErr || !bill) throw new Error('Bill not found');
    if (bill.status !== 'pending_approval') {
      throw new Error(`Bill cannot be rejected from status: ${bill.status}`);
    }

    const now = new Date().toISOString();

    // 1. Mark bill as rejected
    await supabase
      .from('bills')
      .update({
        status: 'rejected',
        admin_id: adminId,
        rejected_at: now,
        rejection_reason: reason.trim()
      })
      .eq('id', billId);

    // 2. Return order to correction status
    await supabase
      .from('orders')
      .update({ status: 'correction', updated_at: now })
      .eq('id', bill.order_id);

    // 3. Table remains occupied
    await supabase
      .from('restaurant_tables')
      .update({ status: 'occupied', updated_at: now })
      .eq('id', bill.table_id);

    // 4. Record in bill_history
    await supabase.from('bill_history').insert({
      bill_id: billId,
      action: 'rejected',
      performed_by: adminId,
      notes: reason.trim()
    });

    await fetchData();
    return true;
  };

  // ===================== METRICS CALCULATION =====================
  // Calculate revenue and counts strictly from approved bills in the database!
  const getMetrics = useCallback(() => {
    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();

    let todayRev = 0;
    let todayCount = 0;
    let monthRev = 0;
    let monthCount = 0;

    // Filter ONLY approved bills
    const approvedBills = bills.filter(b => b.status === 'approved' && b.approved_at);

    approvedBills.forEach(b => {
      const appDate = new Date(b.approved_at);
      const amount = Number(b.total_amount) || 0;

      // Check month
      if (appDate.getFullYear() === todayYear && appDate.getMonth() === todayMonth) {
        monthRev += amount;
        monthCount += 1;

        // Check day
        if (appDate.getDate() === todayDate) {
          todayRev += amount;
          todayCount += 1;
        }
      }
    });

    const occupiedTables = tables.filter(t => t.status === 'occupied' && t.is_active).length;
    const pendingBills = bills.filter(b => b.status === 'pending_approval');
    const recentApproved = approvedBills.slice(0, 5);

    return {
      todayRevenue: todayRev,
      todayCount: todayCount,
      monthRevenue: monthRev,
      monthCount: monthCount,
      occupiedTablesCount: occupiedTables,
      pendingBillsCount: pendingBills.length,
      pendingBillsList: pendingBills,
      recentApprovedList: recentApproved,
      allApprovedList: approvedBills
    };
  }, [bills, tables]);

  return (
    <DhabaContext.Provider
      value={{
        tables,
        categories,
        menuItems,
        orders,
        bills,
        loading,
        error,
        fetchData,
        addTable,
        updateTable,
        addMenuItem,
        updateMenuItem,
        addCategory,
        saveRunningOrder,
        generateFinalBill,
        approveBill,
        rejectBill,
        getMetrics
      }}
    >
      {children}
    </DhabaContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useDhaba = () => {
  const context = useContext(DhabaContext);
  if (!context) {
    throw new Error('useDhaba must be used within a DhabaProvider');
  }
  return context;
};

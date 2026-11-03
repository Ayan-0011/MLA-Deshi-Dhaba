-- Waiter assignment and table locking.
-- Run after schema.sql, seed.sql, and 002_security_hardening.sql.

-- Waiters may read every running order, but all writes go through the checked
-- SECURITY DEFINER RPCs below. Admins retain direct full access.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('orders', 'order_items')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

CREATE POLICY orders_select_staff ON public.orders
    FOR SELECT TO authenticated USING (public.is_waiter_or_admin());
CREATE POLICY orders_admin_all ON public.orders
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY order_items_select_staff ON public.order_items
    FOR SELECT TO authenticated USING (public.is_waiter_or_admin());
CREATE POLICY order_items_admin_all ON public.order_items
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- A waiter can save only their own active/correction order. Locking the table
-- serializes first-order creation, item snapshots, and admin reassignment.
CREATE OR REPLACE FUNCTION public.save_running_order(
    p_table_id UUID,
    p_waiter_id UUID,
    p_items JSONB,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_table public.restaurant_tables%ROWTYPE;
    v_order public.orders%ROWTYPE;
    v_item RECORD;
    v_is_admin BOOLEAN;
BEGIN
    IF v_uid IS NULL OR NOT public.is_waiter_or_admin() THEN
        RAISE EXCEPTION 'Not authorised';
    END IF;

    v_is_admin := public.is_admin();
    IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'Order items must be a JSON array';
    END IF;
    IF jsonb_array_length(p_items) = 0 OR EXISTS (
        SELECT 1 FROM jsonb_to_recordset(p_items) AS x(quantity INT)
        WHERE quantity IS NULL OR quantity <= 0
    ) THEN
        RAISE EXCEPTION 'Order must contain items with positive quantities';
    END IF;

    SELECT * INTO v_table
    FROM public.restaurant_tables
    WHERE id = p_table_id AND is_active
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Table not found or inactive';
    END IF;

    SELECT * INTO v_order
    FROM public.orders
    WHERE table_id = p_table_id
      AND status IN ('active', 'correction', 'in_review')
    FOR UPDATE;

    IF FOUND THEN
        IF v_order.status = 'in_review' THEN
            RAISE EXCEPTION 'This table is awaiting bill approval';
        END IF;
        IF NOT v_is_admin AND v_order.waiter_id <> v_uid THEN
            RAISE EXCEPTION 'This order is assigned to another waiter';
        END IF;
    ELSE
        IF v_is_admin THEN
            RAISE EXCEPTION 'Only a waiter can start a new table order';
        END IF;
        IF v_table.status <> 'available' THEN
            RAISE EXCEPTION 'Table is not available for a new order';
        END IF;

        INSERT INTO public.orders (table_id, waiter_id, status, notes)
        VALUES (p_table_id, v_uid, 'active', p_notes)
        RETURNING * INTO v_order;
    END IF;

    UPDATE public.orders
    SET notes = COALESCE(p_notes, notes), updated_at = now()
    WHERE id = v_order.id;

    UPDATE public.restaurant_tables
    SET status = 'occupied', updated_at = now()
    WHERE id = p_table_id;

    DELETE FROM public.order_items WHERE order_id = v_order.id;

    FOR v_item IN
        SELECT * FROM jsonb_to_recordset(p_items) AS x(
            menu_item_id UUID,
            item_name TEXT,
            unit_price NUMERIC,
            quantity INT
        )
    LOOP
        IF v_item.quantity > 0 THEN
            INSERT INTO public.order_items (order_id, menu_item_id, item_name, unit_price, quantity)
            SELECT v_order.id, v_item.menu_item_id,
                   COALESCE(m.name, v_item.item_name),
                   COALESCE(m.price, v_item.unit_price),
                   v_item.quantity
            FROM (SELECT 1) AS source
            LEFT JOIN public.menu_items AS m ON m.id = v_item.menu_item_id;
        END IF;
    END LOOP;

    RETURN v_order.id;
END;
$$;

-- Final bills can only be submitted by the assigned waiter (or an admin).
-- Lock table before order to use the same lock order as save/reassignment.
CREATE OR REPLACE FUNCTION public.generate_final_bill(
    p_order_id UUID,
    p_waiter_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_order public.orders%ROWTYPE;
    v_table_id UUID;
    v_bill_id UUID;
    v_bill_num TEXT;
    v_total NUMERIC(10, 2) := 0;
    v_count INT := 0;
BEGIN
    IF v_uid IS NULL OR NOT public.is_waiter_or_admin() THEN
        RAISE EXCEPTION 'Not authorised';
    END IF;

    SELECT table_id INTO v_table_id FROM public.orders WHERE id = p_order_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

    PERFORM 1 FROM public.restaurant_tables WHERE id = v_table_id FOR UPDATE;
    SELECT * INTO v_order FROM public.orders
    WHERE id = p_order_id AND status IN ('active', 'correction') FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order is not in active or correction status'; END IF;
    IF NOT public.is_admin() AND v_order.waiter_id <> v_uid THEN
        RAISE EXCEPTION 'This order is assigned to another waiter';
    END IF;

    SELECT COUNT(*), COALESCE(SUM(unit_price * quantity), 0)
    INTO v_count, v_total
    FROM public.order_items WHERE order_id = p_order_id;
    IF v_count = 0 THEN RAISE EXCEPTION 'Cannot generate bill for an empty order'; END IF;

    v_bill_num := 'MLA-' || to_char(now(), 'YYYYMMDD') || '-' ||
                  LPAD(nextval('bill_number_seq')::TEXT, 4, '0');

    INSERT INTO public.bills (bill_number, order_id, table_id, waiter_id, status, total_amount, submitted_at)
    VALUES (v_bill_num, p_order_id, v_table_id, v_uid, 'pending_approval', v_total, now())
    RETURNING id INTO v_bill_id;

    INSERT INTO public.bill_items (bill_id, menu_item_id, item_name, unit_price, quantity, line_total)
    SELECT v_bill_id, menu_item_id, item_name, unit_price, quantity, unit_price * quantity
    FROM public.order_items WHERE order_id = p_order_id;

    UPDATE public.orders SET status = 'in_review', updated_at = now() WHERE id = p_order_id;
    UPDATE public.restaurant_tables SET status = 'bill_pending', updated_at = now() WHERE id = v_table_id;
    INSERT INTO public.bill_history (bill_id, action, performed_by, notes)
    VALUES (v_bill_id, 'submitted', v_uid, 'Bill submitted for admin approval');

    RETURN jsonb_build_object('bill_id', v_bill_id, 'bill_number', v_bill_num, 'total_amount', v_total);
END;
$$;

-- Admin-only reassignment; locks table then order to serialize with waiter saves.
CREATE OR REPLACE FUNCTION public.reassign_order_waiter(
    p_order_id UUID,
    p_waiter_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_table_id UUID;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only administrators can reassign orders';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_waiter_id AND role = 'waiter' AND is_active
    ) THEN
        RAISE EXCEPTION 'Select an active waiter';
    END IF;

    SELECT table_id INTO v_table_id FROM public.orders WHERE id = p_order_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

    PERFORM 1 FROM public.restaurant_tables WHERE id = v_table_id FOR UPDATE;
    PERFORM 1 FROM public.orders
    WHERE id = p_order_id AND status IN ('active', 'correction', 'in_review')
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Only an active table order can be reassigned'; END IF;

    UPDATE public.orders SET waiter_id = p_waiter_id, updated_at = now()
    WHERE id = p_order_id;
    RETURN p_order_id;
END;
$$;

-- Approval/rejection lock table before bill/order. Approval closes the only active
-- order for that table; its waiter_id remains as historical order attribution.
CREATE OR REPLACE FUNCTION public.approve_bill(p_bill_id UUID, p_admin_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_bill public.bills%ROWTYPE;
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Only administrators can approve bills'; END IF;

    SELECT * INTO v_bill FROM public.bills WHERE id = p_bill_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Bill not found'; END IF;
    PERFORM 1 FROM public.restaurant_tables WHERE id = v_bill.table_id FOR UPDATE;
    SELECT * INTO v_bill FROM public.bills WHERE id = p_bill_id FOR UPDATE;
    IF v_bill.status <> 'pending_approval' THEN
        RAISE EXCEPTION 'Bill has already been processed (Current status: %)', v_bill.status;
    END IF;

    UPDATE public.bills SET status = 'approved', admin_id = auth.uid(), approved_at = now()
    WHERE id = p_bill_id;
    UPDATE public.orders SET status = 'closed', updated_at = now() WHERE id = v_bill.order_id;
    UPDATE public.restaurant_tables SET status = 'available', updated_at = now() WHERE id = v_bill.table_id;
    INSERT INTO public.bill_history (bill_id, action, performed_by, notes)
    VALUES (p_bill_id, 'approved', auth.uid(), 'Bill approved. Revenue recognized.');

    RETURN jsonb_build_object('success', true, 'bill_id', p_bill_id, 'approved_at', now());
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_bill(p_bill_id UUID, p_admin_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_bill public.bills%ROWTYPE;
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Only administrators can reject bills'; END IF;
    IF p_reason IS NULL OR trim(p_reason) = '' THEN RAISE EXCEPTION 'A rejection reason is required'; END IF;

    SELECT * INTO v_bill FROM public.bills WHERE id = p_bill_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Bill not found'; END IF;
    PERFORM 1 FROM public.restaurant_tables WHERE id = v_bill.table_id FOR UPDATE;
    SELECT * INTO v_bill FROM public.bills WHERE id = p_bill_id FOR UPDATE;
    IF v_bill.status <> 'pending_approval' THEN
        RAISE EXCEPTION 'Bill cannot be rejected from status: %', v_bill.status;
    END IF;

    UPDATE public.bills SET status = 'rejected', admin_id = auth.uid(), rejected_at = now(),
        rejection_reason = p_reason WHERE id = p_bill_id;
    UPDATE public.orders SET status = 'correction', updated_at = now() WHERE id = v_bill.order_id;
    UPDATE public.restaurant_tables SET status = 'occupied', updated_at = now() WHERE id = v_bill.table_id;
    INSERT INTO public.bill_history (bill_id, action, performed_by, notes)
    VALUES (p_bill_id, 'rejected', auth.uid(), p_reason);

    RETURN jsonb_build_object('success', true, 'bill_id', p_bill_id, 'rejected_at', now(), 'reason', p_reason);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.save_running_order(UUID, UUID, JSONB, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_final_bill(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reassign_order_waiter(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_bill(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_bill(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_running_order(UUID, UUID, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_final_bill(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reassign_order_waiter(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_bill(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_bill(UUID, UUID, TEXT) TO authenticated;

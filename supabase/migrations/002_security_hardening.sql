-- ==============================================================================
-- MLA DESI DHABA - Security hardening (run ONCE in the Supabase SQL Editor,
-- after schema.sql and seed.sql). Safe to re-run.
--
-- Fixes confirmed issues in the original schema:
--  1. Anyone could self-register as admin (role taken from signup metadata or
--     from an "admin@" email) -> role is now ALWAYS 'waiter' on signup.
--  2. Users could UPDATE their own profile row, including `role` -> blocked.
--  3. RLS policies on orders / order_items / bills were USING (true).
--  4. Waiters could read every bill (revenue) -> now only their own bills.
--  5. Deactivated staff were still authorised -> is_active enforced everywhere.
--  6. RPCs trusted client-supplied waiter/admin ids -> now use auth.uid().
-- Function signatures are unchanged, so the frontend API contract is preserved.
-- ==============================================================================

-- 1. Signup always creates a waiter. Admins are promoted only by an existing admin
--    (or via the SQL editor, see bottom of this file).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, is_active)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), split_part(NEW.email, '@', 1)),
        'waiter',
        true
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = now();   -- role is deliberately NOT updated here
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Non-admins may not change role / active flag / email / id of any profile.
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS TRIGGER AS $$
BEGIN
    -- auth.uid() is NULL for the SQL editor / service role, which may bootstrap admins.
    IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
        IF NEW.role IS DISTINCT FROM OLD.role
           OR NEW.is_active IS DISTINCT FROM OLD.is_active
           OR NEW.email IS DISTINCT FROM OLD.email
           OR NEW.id IS DISTINCT FROM OLD.id THEN
            RAISE EXCEPTION 'Not allowed to change role, status or email';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS protect_profile_privileges ON public.profiles;
CREATE TRIGGER protect_profile_privileges
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

-- Helper: pin search_path on the existing helpers
ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.is_waiter_or_admin() SET search_path = public;

-- 3/4/5. Replace permissive policies ------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT policyname, tablename FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('profiles','restaurant_tables','menu_categories','menu_items',
                            'orders','order_items','bills','bill_items','bill_history')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- Profiles: staff can read profiles; only admins write (the trigger above guards self-updates).
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
    USING (id = auth.uid() OR public.is_waiter_or_admin());
CREATE POLICY profiles_admin_all ON public.profiles FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE TO authenticated
    USING (id = auth.uid() AND public.is_waiter_or_admin())
    WITH CHECK (id = auth.uid());

-- Tables / menu: readable by active staff, writable by admins only.
CREATE POLICY tables_select ON public.restaurant_tables FOR SELECT TO authenticated USING (public.is_waiter_or_admin());
CREATE POLICY tables_admin ON public.restaurant_tables FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY categories_select ON public.menu_categories FOR SELECT TO authenticated USING (public.is_waiter_or_admin());
CREATE POLICY categories_admin ON public.menu_categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY menu_items_select ON public.menu_items FOR SELECT TO authenticated USING (public.is_waiter_or_admin());
CREATE POLICY menu_items_admin ON public.menu_items FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Orders / items: active staff can read (waiters need to see which tables are busy);
-- writes only by admins or the waiter who owns the order. (RPCs are SECURITY DEFINER.)
CREATE POLICY orders_select ON public.orders FOR SELECT TO authenticated USING (public.is_waiter_or_admin());
CREATE POLICY orders_admin ON public.orders FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY orders_waiter_write ON public.orders FOR ALL TO authenticated
    USING (waiter_id = auth.uid() AND public.is_waiter_or_admin())
    WITH CHECK (waiter_id = auth.uid() AND public.is_waiter_or_admin());

CREATE POLICY order_items_select ON public.order_items FOR SELECT TO authenticated USING (public.is_waiter_or_admin());
CREATE POLICY order_items_admin ON public.order_items FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY order_items_waiter_write ON public.order_items FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.waiter_id = auth.uid()) AND public.is_waiter_or_admin())
    WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.waiter_id = auth.uid()) AND public.is_waiter_or_admin());

-- Bills (revenue data): admins see all; a waiter sees only their own bills.
CREATE POLICY bills_select ON public.bills FOR SELECT TO authenticated
    USING (public.is_admin() OR (waiter_id = auth.uid() AND public.is_waiter_or_admin()));
CREATE POLICY bills_insert ON public.bills FOR INSERT TO authenticated
    WITH CHECK (public.is_waiter_or_admin() AND waiter_id = auth.uid() AND status = 'pending_approval');
CREATE POLICY bills_admin_update ON public.bills FOR UPDATE TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY bill_items_select ON public.bill_items FOR SELECT TO authenticated
    USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.bills b WHERE b.id = bill_id AND b.waiter_id = auth.uid()));
CREATE POLICY bill_items_insert ON public.bill_items FOR INSERT TO authenticated
    WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.bills b WHERE b.id = bill_id AND b.waiter_id = auth.uid() AND b.status = 'pending_approval'));

CREATE POLICY bill_history_select ON public.bill_history FOR SELECT TO authenticated
    USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.bills b WHERE b.id = bill_id AND b.waiter_id = auth.uid()));
CREATE POLICY bill_history_insert ON public.bill_history FOR INSERT TO authenticated
    WITH CHECK (public.is_waiter_or_admin() AND performed_by = auth.uid());

-- 6. RPCs: identity comes from the verified JWT (auth.uid()), never from arguments.
CREATE OR REPLACE FUNCTION public.save_running_order(
    p_table_id UUID, p_waiter_id UUID, p_items JSONB, p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_order_id UUID;
    v_item RECORD;
BEGIN
    IF v_uid IS NULL OR NOT public.is_waiter_or_admin() THEN
        RAISE EXCEPTION 'Not authorised';
    END IF;

    SELECT id INTO v_order_id FROM public.orders
    WHERE table_id = p_table_id AND status IN ('active', 'correction') LIMIT 1;

    IF v_order_id IS NULL THEN
        INSERT INTO public.orders (table_id, waiter_id, status, notes)
        VALUES (p_table_id, v_uid, 'active', p_notes) RETURNING id INTO v_order_id;
    ELSE
        UPDATE public.orders SET waiter_id = v_uid, notes = COALESCE(p_notes, notes), updated_at = now()
        WHERE id = v_order_id;
    END IF;

    UPDATE public.restaurant_tables SET status = 'occupied', updated_at = now() WHERE id = p_table_id;
    DELETE FROM public.order_items WHERE order_id = v_order_id;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items)
        AS x(menu_item_id UUID, item_name TEXT, unit_price NUMERIC, quantity INT)
    LOOP
        IF v_item.quantity > 0 THEN
            -- Price is taken from the menu, not from the client, when the item exists.
            INSERT INTO public.order_items (order_id, menu_item_id, item_name, unit_price, quantity)
            SELECT v_order_id, v_item.menu_item_id,
                   COALESCE(m.name, v_item.item_name),
                   COALESCE(m.price, v_item.unit_price),
                   v_item.quantity
            FROM (SELECT 1) d
            LEFT JOIN public.menu_items m ON m.id = v_item.menu_item_id;
        END IF;
    END LOOP;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.generate_final_bill(p_order_id UUID, p_waiter_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_order RECORD;
    v_bill_id UUID;
    v_bill_num TEXT;
    v_total NUMERIC(10, 2) := 0;
    v_count INT := 0;
BEGIN
    IF v_uid IS NULL OR NOT public.is_waiter_or_admin() THEN
        RAISE EXCEPTION 'Not authorised';
    END IF;

    SELECT * INTO v_order FROM public.orders
    WHERE id = p_order_id AND status IN ('active', 'correction') FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order is not in active or correction status'; END IF;

    SELECT COUNT(*), COALESCE(SUM(unit_price * quantity), 0) INTO v_count, v_total
    FROM public.order_items WHERE order_id = p_order_id;
    IF v_count = 0 THEN RAISE EXCEPTION 'Cannot generate bill for an empty order'; END IF;

    v_bill_num := 'MLA-' || to_char(now(), 'YYYYMMDD') || '-' || LPAD(nextval('bill_number_seq')::TEXT, 4, '0');

    INSERT INTO public.bills (bill_number, order_id, table_id, waiter_id, status, total_amount, submitted_at)
    VALUES (v_bill_num, p_order_id, v_order.table_id, v_uid, 'pending_approval', v_total, now())
    RETURNING id INTO v_bill_id;

    INSERT INTO public.bill_items (bill_id, menu_item_id, item_name, unit_price, quantity, line_total)
    SELECT v_bill_id, menu_item_id, item_name, unit_price, quantity, unit_price * quantity
    FROM public.order_items WHERE order_id = p_order_id;

    UPDATE public.orders SET status = 'in_review', updated_at = now() WHERE id = p_order_id;
    UPDATE public.restaurant_tables SET status = 'bill_pending', updated_at = now() WHERE id = v_order.table_id;

    INSERT INTO public.bill_history (bill_id, action, performed_by, notes)
    VALUES (v_bill_id, 'submitted', v_uid, 'Bill submitted for admin approval');

    RETURN jsonb_build_object('bill_id', v_bill_id, 'bill_number', v_bill_num, 'total_amount', v_total);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.approve_bill(p_bill_id UUID, p_admin_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_bill RECORD;
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Only administrators can approve bills'; END IF;

    SELECT * INTO v_bill FROM public.bills WHERE id = p_bill_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Bill not found'; END IF;
    IF v_bill.status != 'pending_approval' THEN
        RAISE EXCEPTION 'Bill has already been processed (Current status: %)', v_bill.status;
    END IF;

    UPDATE public.bills SET status = 'approved', admin_id = auth.uid(), approved_at = now() WHERE id = p_bill_id;
    UPDATE public.orders SET status = 'closed', updated_at = now() WHERE id = v_bill.order_id;
    UPDATE public.restaurant_tables SET status = 'available', updated_at = now() WHERE id = v_bill.table_id;

    INSERT INTO public.bill_history (bill_id, action, performed_by, notes)
    VALUES (p_bill_id, 'approved', auth.uid(), 'Bill approved. Revenue recognized.');

    RETURN jsonb_build_object('success', true, 'bill_id', p_bill_id, 'approved_at', now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.reject_bill(p_bill_id UUID, p_admin_id UUID, p_reason TEXT)
RETURNS JSONB AS $$
DECLARE
    v_bill RECORD;
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Only administrators can reject bills'; END IF;
    IF p_reason IS NULL OR trim(p_reason) = '' THEN RAISE EXCEPTION 'A rejection reason is required'; END IF;

    SELECT * INTO v_bill FROM public.bills WHERE id = p_bill_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Bill not found'; END IF;
    IF v_bill.status != 'pending_approval' THEN
        RAISE EXCEPTION 'Bill cannot be rejected from status: %', v_bill.status;
    END IF;

    UPDATE public.bills SET status = 'rejected', admin_id = auth.uid(), rejected_at = now(), rejection_reason = p_reason
    WHERE id = p_bill_id;
    UPDATE public.orders SET status = 'correction', updated_at = now() WHERE id = v_bill.order_id;
    UPDATE public.restaurant_tables SET status = 'occupied', updated_at = now() WHERE id = v_bill.table_id;

    INSERT INTO public.bill_history (bill_id, action, performed_by, notes)
    VALUES (p_bill_id, 'rejected', auth.uid(), p_reason);

    RETURN jsonb_build_object('success', true, 'bill_id', p_bill_id, 'rejected_at', now(), 'reason', p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revenue metrics are admin-only.
CREATE OR REPLACE FUNCTION public.get_revenue_metrics()
RETURNS JSONB AS $$
DECLARE
    v_today_rev NUMERIC(10,2) := 0; v_today_count INT := 0;
    v_month_rev NUMERIC(10,2) := 0; v_month_count INT := 0;
    v_occupied INT := 0; v_pending INT := 0;
    v_today_start TIMESTAMPTZ := date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata';
    v_month_start TIMESTAMPTZ := date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata';
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Only administrators can view revenue'; END IF;

    SELECT COALESCE(SUM(total_amount),0), COUNT(*) INTO v_today_rev, v_today_count
    FROM public.bills WHERE status='approved' AND approved_at >= v_today_start;
    SELECT COALESCE(SUM(total_amount),0), COUNT(*) INTO v_month_rev, v_month_count
    FROM public.bills WHERE status='approved' AND approved_at >= v_month_start;
    SELECT COUNT(*) INTO v_occupied FROM public.restaurant_tables WHERE status='occupied' AND is_active;
    SELECT COUNT(*) INTO v_pending FROM public.bills WHERE status='pending_approval';

    RETURN jsonb_build_object('today_revenue', v_today_rev, 'today_count', v_today_count,
        'month_revenue', v_month_rev, 'month_count', v_month_count,
        'occupied_tables', v_occupied, 'pending_bills', v_pending);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Don't let anonymous (not logged in) callers execute the business RPCs.
REVOKE EXECUTE ON FUNCTION public.save_running_order(UUID, UUID, JSONB, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_final_bill(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_bill(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_bill(UUID, UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_revenue_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_running_order(UUID, UUID, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_final_bill(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_bill(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_bill(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_revenue_metrics() TO authenticated;

-- ------------------------------------------------------------------------------
-- Creating the FIRST admin (the app no longer lets anyone self-register as admin):
--   1. Supabase Dashboard > Authentication > Users > Add user (email + password)
--   2. Then run, with your admin's email:
--        UPDATE public.profiles SET role = 'admin' WHERE email = 'owner@example.com';
-- Existing admin/waiter rows are NOT changed by this migration.
-- ------------------------------------------------------------------------------

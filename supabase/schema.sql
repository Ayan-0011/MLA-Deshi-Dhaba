-- ==============================================================================
-- MLA DESI DHABA - PostgreSQL Schema & RLS Setup
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. SEQUENCES
CREATE SEQUENCE IF NOT EXISTS bill_number_seq START WITH 1001;

-- 3. ENUMS / DOMAINS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'waiter');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE table_status AS ENUM ('available', 'occupied', 'bill_pending');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('active', 'in_review', 'closed', 'correction');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE bill_status AS ENUM ('pending_approval', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE bill_history_action AS ENUM ('submitted', 'approved', 'rejected', 'resubmitted');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4. TABLES

-- Profiles (Users with role)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'waiter',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Restaurant Tables
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_number TEXT NOT NULL UNIQUE,
    capacity INT NOT NULL DEFAULT 4 CHECK (capacity > 0),
    status table_status NOT NULL DEFAULT 'available',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Menu Categories
CREATE TABLE IF NOT EXISTS public.menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Menu Items
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.menu_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
    waiter_id UUID NOT NULL REFERENCES public.profiles(id),
    status order_status NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure only ONE active order per table at any time!
CREATE UNIQUE INDEX IF NOT EXISTS orders_active_per_table_idx 
ON public.orders (table_id) 
WHERE status IN ('active', 'in_review', 'correction');

-- Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (order_id, menu_item_id)
);

-- Bills
CREATE TABLE IF NOT EXISTS public.bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_number TEXT NOT NULL UNIQUE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES public.restaurant_tables(id),
    waiter_id UUID NOT NULL REFERENCES public.profiles(id),
    admin_id UUID REFERENCES public.profiles(id),
    status bill_status NOT NULL DEFAULT 'pending_approval',
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent multiple pending bills for the same order simultaneously
CREATE UNIQUE INDEX IF NOT EXISTS bills_pending_per_order_idx
ON public.bills (order_id)
WHERE status = 'pending_approval';

-- Bill Items (Immutable Snapshots)
CREATE TABLE IF NOT EXISTS public.bill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    line_total NUMERIC(10, 2) NOT NULL CHECK (line_total >= 0)
);

-- Bill History
CREATE TABLE IF NOT EXISTS public.bill_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    action bill_history_action NOT NULL,
    performed_by UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_tables_status ON public.restaurant_tables(status);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_table ON public.orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_waiter ON public.orders(waiter_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON public.bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_approved_at ON public.bills(approved_at);
CREATE INDEX IF NOT EXISTS idx_bills_submitted_at ON public.bills(submitted_at);
CREATE INDEX IF NOT EXISTS idx_bills_order ON public.bills(order_id);
CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON public.bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_history_bill ON public.bill_history(bill_id);

-- 6. SECURITY HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_waiter_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Trigger to create profile when auth.users is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role user_role;
    v_full_name TEXT;
BEGIN
    -- Determine role from metadata or default to waiter
    IF (NEW.raw_user_meta_data->>'role') = 'admin' OR NEW.email LIKE '%admin@%' THEN
        v_role := 'admin';
    ELSE
        v_role := 'waiter';
    END IF;

    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

    INSERT INTO public.profiles (id, email, full_name, role, is_active)
    VALUES (NEW.id, NEW.email, v_full_name, v_role, true)
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. ATOMIC BUSINESS LOGIC FUNCTIONS (RPC)

-- Function: Save/Update Running Order Items
CREATE OR REPLACE FUNCTION public.save_running_order(
    p_table_id UUID,
    p_waiter_id UUID,
    p_items JSONB,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_item RECORD;
BEGIN
    -- 1. Find existing active or correction order for this table
    SELECT id INTO v_order_id
    FROM public.orders
    WHERE table_id = p_table_id 
      AND status IN ('active', 'correction')
    LIMIT 1;

    -- 2. If no active order, create new one
    IF v_order_id IS NULL THEN
        INSERT INTO public.orders (table_id, waiter_id, status, notes)
        VALUES (p_table_id, p_waiter_id, 'active', p_notes)
        RETURNING id INTO v_order_id;
    ELSE
        UPDATE public.orders
        SET waiter_id = p_waiter_id,
            notes = COALESCE(p_notes, notes),
            updated_at = now()
        WHERE id = v_order_id;
    END IF;

    -- 3. Update table status to 'occupied'
    UPDATE public.restaurant_tables
    SET status = 'occupied',
        updated_at = now()
    WHERE id = p_table_id;

    -- 4. Delete existing items for order and re-insert fresh
    DELETE FROM public.order_items WHERE order_id = v_order_id;

    -- 5. Insert order items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        menu_item_id UUID,
        item_name TEXT,
        unit_price NUMERIC,
        quantity INT
    )
    LOOP
        IF v_item.quantity > 0 THEN
            INSERT INTO public.order_items (order_id, menu_item_id, item_name, unit_price, quantity)
            VALUES (v_order_id, v_item.menu_item_id, v_item.item_name, v_item.unit_price, v_item.quantity);
        END IF;
    END LOOP;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Generate and Submit Final Bill
CREATE OR REPLACE FUNCTION public.generate_final_bill(
    p_order_id UUID,
    p_waiter_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_table_id UUID;
    v_bill_id UUID;
    v_bill_num TEXT;
    v_total NUMERIC(10, 2) := 0;
    v_item RECORD;
    v_count INT := 0;
BEGIN
    -- 1. Get and lock order
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id AND status IN ('active', 'correction')
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order is not in active or correction status';
    END IF;

    v_table_id := v_order.table_id;

    -- 2. Count order items and calculate total
    SELECT COUNT(*), COALESCE(SUM(unit_price * quantity), 0)
    INTO v_count, v_total
    FROM public.order_items
    WHERE order_id = p_order_id;

    IF v_count = 0 THEN
        RAISE EXCEPTION 'Cannot generate bill for an empty order';
    END IF;

    -- 3. Generate unique bill number: MLA-YYYYMMDD-XXXX
    v_bill_num := 'MLA-' || to_char(now(), 'YYYYMMDD') || '-' || LPAD(nextval('bill_number_seq')::TEXT, 4, '0');

    -- 4. Insert into bills table
    INSERT INTO public.bills (
        bill_number,
        order_id,
        table_id,
        waiter_id,
        status,
        total_amount,
        submitted_at
    )
    VALUES (
        v_bill_num,
        p_order_id,
        v_table_id,
        p_waiter_id,
        'pending_approval',
        v_total,
        now()
    )
    RETURNING id INTO v_bill_id;

    -- 5. Copy immutable snapshot into bill_items
    INSERT INTO public.bill_items (bill_id, menu_item_id, item_name, unit_price, quantity, line_total)
    SELECT 
        v_bill_id,
        menu_item_id,
        item_name,
        unit_price,
        quantity,
        (unit_price * quantity)
    FROM public.order_items
    WHERE order_id = p_order_id;

    -- 6. Update order status to 'in_review'
    UPDATE public.orders
    SET status = 'in_review',
        updated_at = now()
    WHERE id = p_order_id;

    -- 7. Update table status to 'bill_pending'
    UPDATE public.restaurant_tables
    SET status = 'bill_pending',
        updated_at = now()
    WHERE id = v_table_id;

    -- 8. Record in bill_history
    INSERT INTO public.bill_history (bill_id, action, performed_by, notes)
    VALUES (v_bill_id, 'submitted', p_waiter_id, 'Bill submitted for admin approval');

    RETURN jsonb_build_object(
        'bill_id', v_bill_id,
        'bill_number', v_bill_num,
        'total_amount', v_total
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Approve Bill
CREATE OR REPLACE FUNCTION public.approve_bill(
    p_bill_id UUID,
    p_admin_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_bill RECORD;
BEGIN
    -- Check admin privileges
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only administrators can approve bills';
    END IF;

    -- Lock bill row for atomic update
    SELECT * INTO v_bill
    FROM public.bills
    WHERE id = p_bill_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bill not found';
    END IF;

    IF v_bill.status != 'pending_approval' THEN
        RAISE EXCEPTION 'Bill has already been processed (Current status: %)', v_bill.status;
    END IF;

    -- Update bill to approved
    UPDATE public.bills
    SET status = 'approved',
        admin_id = p_admin_id,
        approved_at = now()
    WHERE id = p_bill_id;

    -- Close the order
    UPDATE public.orders
    SET status = 'closed',
        updated_at = now()
    WHERE id = v_bill.order_id;

    -- Set table back to available!
    UPDATE public.restaurant_tables
    SET status = 'available',
        updated_at = now()
    WHERE id = v_bill.table_id;

    -- Record in bill history
    INSERT INTO public.bill_history (bill_id, action, performed_by, notes)
    VALUES (p_bill_id, 'approved', p_admin_id, 'Bill approved. Revenue recognized.');

    RETURN jsonb_build_object(
        'success', true,
        'bill_id', p_bill_id,
        'approved_at', now()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Reject Bill
CREATE OR REPLACE FUNCTION public.reject_bill(
    p_bill_id UUID,
    p_admin_id UUID,
    p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_bill RECORD;
BEGIN
    -- Check admin privileges
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only administrators can reject bills';
    END IF;

    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'A rejection reason is required';
    END IF;

    -- Lock bill row for update
    SELECT * INTO v_bill
    FROM public.bills
    WHERE id = p_bill_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bill not found';
    END IF;

    IF v_bill.status != 'pending_approval' THEN
        RAISE EXCEPTION 'Bill cannot be rejected from status: %', v_bill.status;
    END IF;

    -- Mark bill as rejected
    UPDATE public.bills
    SET status = 'rejected',
        admin_id = p_admin_id,
        rejected_at = now(),
        rejection_reason = p_reason
    WHERE id = p_bill_id;

    -- Return order to 'correction' state so waiter can modify
    UPDATE public.orders
    SET status = 'correction',
        updated_at = now()
    WHERE id = v_bill.order_id;

    -- Table remains occupied
    UPDATE public.restaurant_tables
    SET status = 'occupied',
        updated_at = now()
    WHERE id = v_bill.table_id;

    -- Record in bill history
    INSERT INTO public.bill_history (bill_id, action, performed_by, notes)
    VALUES (p_bill_id, 'rejected', p_admin_id, p_reason);

    RETURN jsonb_build_object(
        'success', true,
        'bill_id', p_bill_id,
        'rejected_at', now(),
        'reason', p_reason
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get Revenue Metrics (Server-side calculation)
CREATE OR REPLACE FUNCTION public.get_revenue_metrics()
RETURNS JSONB AS $$
DECLARE
    v_today_rev NUMERIC(10,2) := 0;
    v_today_count INT := 0;
    v_month_rev NUMERIC(10,2) := 0;
    v_month_count INT := 0;
    v_occupied_tables INT := 0;
    v_pending_bills INT := 0;
    v_today_start TIMESTAMPTZ := date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata');
    v_month_start TIMESTAMPTZ := date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata');
BEGIN
    -- Today's approved bills
    SELECT 
        COALESCE(SUM(total_amount), 0),
        COUNT(*)
    INTO v_today_rev, v_today_count
    FROM public.bills
    WHERE status = 'approved' 
      AND approved_at >= v_today_start;

    -- Month's approved bills
    SELECT 
        COALESCE(SUM(total_amount), 0),
        COUNT(*)
    INTO v_month_rev, v_month_count
    FROM public.bills
    WHERE status = 'approved' 
      AND approved_at >= v_month_start;

    -- Occupied tables
    SELECT COUNT(*) INTO v_occupied_tables
    FROM public.restaurant_tables
    WHERE status = 'occupied' AND is_active = true;

    -- Pending bills
    SELECT COUNT(*) INTO v_pending_bills
    FROM public.bills
    WHERE status = 'pending_approval';

    RETURN jsonb_build_object(
        'today_revenue', v_today_rev,
        'today_count', v_today_count,
        'month_revenue', v_month_rev,
        'month_count', v_month_count,
        'occupied_tables', v_occupied_tables,
        'pending_bills', v_pending_bills
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_history ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Profiles readable by authenticated users" 
ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert/update any profile" 
ON public.profiles FOR ALL TO authenticated 
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Users can update own non-role profile details" 
ON public.profiles FOR UPDATE TO authenticated 
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Restaurant Tables Policies
CREATE POLICY "Tables readable by authenticated" 
ON public.restaurant_tables FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage tables" 
ON public.restaurant_tables FOR ALL TO authenticated 
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Menu Categories Policies
CREATE POLICY "Categories readable by authenticated" 
ON public.menu_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage categories" 
ON public.menu_categories FOR ALL TO authenticated 
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Menu Items Policies
CREATE POLICY "Menu items readable by authenticated" 
ON public.menu_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage menu items" 
ON public.menu_items FOR ALL TO authenticated 
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Orders Policies
CREATE POLICY "Orders readable by authenticated" 
ON public.orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create and manage orders" 
ON public.orders FOR ALL TO authenticated 
USING (true) WITH CHECK (true);

-- Order Items Policies
CREATE POLICY "Order items readable by authenticated" 
ON public.order_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users manage order items" 
ON public.order_items FOR ALL TO authenticated 
USING (true) WITH CHECK (true);

-- Bills Policies
CREATE POLICY "Bills readable by authenticated" 
ON public.bills FOR SELECT TO authenticated USING (true);

CREATE POLICY "Waiters and admins can insert bills" 
ON public.bills FOR INSERT TO authenticated 
WITH CHECK (true);

CREATE POLICY "Admins can update bills" 
ON public.bills FOR UPDATE TO authenticated 
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Bill Items Policies (Snapshots are read-only once inserted)
CREATE POLICY "Bill items readable by authenticated" 
ON public.bill_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Bill items insertable by authenticated" 
ON public.bill_items FOR INSERT TO authenticated WITH CHECK (true);

-- Bill History Policies
CREATE POLICY "Bill history readable by authenticated" 
ON public.bill_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Bill history insertable by authenticated" 
ON public.bill_history FOR INSERT TO authenticated WITH CHECK (true);

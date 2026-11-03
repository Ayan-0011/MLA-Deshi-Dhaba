# 🍲 MLA Desi Dhaba — Full-Stack Dhaba Management System

A mobile-first Dhaba Management System built for Indian dhabas. Waiters can manage running orders across multiple tables simultaneously, view live auto-calculated line totals and running grand totals, and generate final bills for admin approval. Only admin-approved bills enter revenue reports.

Built with **React**, **Tailwind CSS**, and **Supabase (PostgreSQL, Auth, RLS, & Atomic RPCs)** as the permanent source of truth.

---

## 🚀 Key Features

### 👨‍🍳 Waiter Workflow (Mobile-First)
- **Table Selection Grid**: Touch-friendly cards with visual status indicators:
  - 🟢 **Available**: Tap to start a fresh order.
  - 🟡 **Occupied**: Tap to load the existing saved order with all items and quantities.
  - 🟣 **Bill Pending Approval**: Awaiting admin review.
- **Order Management**:
  - Filter menu by authentic Dhaba categories (Roti, Sabzi, Dal, Rice, Snacks, Beverages, Specials).
  - Search items with instant feedback.
  - Large touch-friendly `[+]` and `[-]` quantity adjusters.
  - Automatic calculation for every item: $\text{Line Total} = \text{Quantity} \times \text{Unit Price}$.
  - Live sticky bottom order bar with running grand total in Indian Rupees (₹).
- **Multiple Tables & Saved Orders**:
  - Save an order on Table 1, switch to Table 2, take Table 2's order, save it, and return to Table 1 without losing items or duplicating orders.
- **Final Bill Generation**:
  - Waiter taps "Generate Final Bill" to view a dhaba receipt preview:
    - Dhaba name: **MLA Desi Dhaba**
    - Unique Bill Number (e.g. `MLA-20261026-1001`)
    - Table number, Waiter name, Date & Time
    - Itemized breakdown with snapshot unit prices, quantities, and line totals
    - Grand Total in ₹
  - Confirms submission $\rightarrow$ creates immutable database snapshot in `bills` & `bill_items`, sets status to `pending_approval`, and table status to `bill_pending`.
- **Submitted & Rejected Bills Tracking**:
  - View status of submitted bills.
  - If rejected, waiter sees admin's rejection reason and can tap **"Fix & Resubmit"** to correct quantities and resubmit.

---

### 🛡️ Admin Panel
- **Dashboard & Revenue Metrics**:
  - Today's approved bill count & today's revenue (₹).
  - This month's approved bill count & this month's revenue (₹).
  - Occupied tables count and pending approval bills count.
  - Pending bills requiring immediate action with one-click approve/reject.
  - Recent approved bills.
- **Table Management**:
  - Add, edit, activate, or deactivate tables with custom seating capacity.
- **Food Menu Management**:
  - Manage categories and dishes with prices in ₹.
  - **Price Protection**: Updating menu prices never alters items already added to existing running orders or finalized bills.
- **Waiter Staff Management**:
  - Register new waiter accounts with secure Supabase authentication.
  - Activate/deactivate staff access.
- **All Orders Live Monitor**:
  - Real-time overview of running, in-review, and correction table orders across the dhaba.
- **Bill Approvals**:
  - **Approve Bill**: Atomically marks bill approved, records approving admin and timestamp, closes associated table order, sets table to Available, and records revenue exactly once.
  - **Reject Bill**: Requires mandatory rejection reason, logs reason and timestamp, returns order to waiter correction mode, and table remains occupied.
- **Revenue & Reports**:
  - Date-based bill history.
  - Daily & monthly audited revenue reports.
  - Export to CSV.
  - Excludes pending and rejected bills strictly.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Tailwind CSS v4, Lucide Icons, Vite
- **Backend & Database**: Supabase (PostgreSQL 15+)
- **Authentication**: Supabase Auth (Email & Password, role metadata)
- **Security**: Supabase Row Level Security (RLS) on all 9 relational tables
- **Atomicity**: PostgreSQL Stored Procedures / RPCs with row-level locking (`FOR UPDATE`)

---

## 🗄️ Database Architecture

1. `profiles`: User information, full name, role (`admin` or `waiter`), and active status.
2. `restaurant_tables`: Table numbers (e.g. T-1, T-2), seating capacity, status (`available`, `occupied`, `bill_pending`).
3. `menu_categories`: Food categories (Roti, Sabzi, Dal, Rice, Snacks, Beverages, Specials).
4. `menu_items`: Food names, descriptions, prices in ₹, availability.
5. `orders`: Order reference per table, assigned waiter, status (`active`, `in_review`, `closed`, `correction`).
6. `order_items`: Menu item reference, item name, unit price snapshot, quantity.
7. `bills`: Unique bill number (`MLA-YYYYMMDD-XXXX`), order reference, table, waiter, admin, status (`pending_approval`, `approved`, `rejected`), total amount, rejection reason, approval timestamp.
8. `bill_items`: Immutable snapshots of item names, quantities, unit prices, and line totals.
9. `bill_history`: Audit trail for submission, rejection, correction, and approval events.

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Supabase Database
1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to the **SQL Editor**.
3. Run the schema script located at:
   ```
   supabase/schema.sql
   ```
4. Run the seed data script located at:
   ```
   supabase/seed.sql
   ```
5. Run the migrations in order from the Supabase SQL Editor:
   - `supabase/migrations/002_security_hardening.sql`
   - `supabase/migrations/003_waiter_assignment_locking.sql`
   The second migration enforces waiter ownership in database RPCs/RLS, serializes
   order creation and reassignment, and adds admin waiter reassignment. Do not rely
   on the UI alone for these permissions.
6. Copy your **Project URL** and **Anon Public Key**.

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Run Development Server
```bash
npm run dev
```

---

## 👥 Demo Accounts

You can sign up with your own accounts or use the one-click demo credentials in the app:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Admin** | created in Supabase, then promoted (see SETUP_GUIDE) | — | Dashboard, Menu, Tables, Waiters, Approvals, Revenue |
| **Waiter** | created by the Admin in the Waiters screen | — | Tables, Running Orders, Bill Submission, Corrections |

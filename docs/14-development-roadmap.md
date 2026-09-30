# 14 — Development Roadmap

## Overview

| Phase | Focus | Estimated Duration | Status |
|---|---|---|---|
| Phase 1 | Foundation & Auth | Week 1 | Complete ✅ |
| Phase 2 | Voucher Module | Week 2 | Up Next ⏳ |
| Phase 3 | BRI Fund Module | Week 3 | Planned |
| Phase 4 | Cash Opname Engine | Week 4-5 | Planned |
| Phase 5 | Reports & Excel Export | Week 5-6 | Planned |
| Phase 6 | Polish & Production | Week 6-7 | Planned |

**MVP Definition**: Phase 1-5 complete = KAS_KECIL fully production-ready

---

## Phase 1 — Foundation & Auth (Week 1) — Complete ✅

### Objectives
- Project scaffold with all tooling configured
- Database schema ready (all tables, multi-store)
- Authentication working
- RBAC enforced
- Base layout rendered

### Tasks

#### 1.1 Project Setup
- [x] Create Laravel 13 project with Inertia + React + TypeScript
- [x] Install & configure: shadcn/ui, Tailwind CSS v4
- [x] Install official shadcn skill: `npx skills add shadcn/ui` (reads `components.json`)
- [x] Install & configure: Spatie Permission, Spatie Activitylog
- [x] Install & configure: Maatwebsite/Excel
- [x] Install & configure: Laravel Boost
- [x] Configure SQLite database (WAL mode, pragmas)
- [x] Setup `.agents/` folder with AGENTS.md and G-COINS-specific shadcn SKILL.md

#### 1.2 Database Migrations
- [x] `stores` table
- [x] `store_opname_configs` table
- [x] `opname_item_definitions` table
- [x] `users` table (with `store_id` FK)
- [x] `cash_opname_sessions` table
- [x] `opname_item_counts` table
- [x] `bri_sub_ledgers` table
- [x] `bri_custom_allocations` table
- [x] `bri_fund_postings` table
- [x] `petty_cash_vouchers` table (with soft delete)
- [x] `audit_logs` table
- [x] `attachments` table
- [x] `notifications` table

#### 1.3 Seeders
- [x] Default store: code `10435`, name "Gramedia World Karawang"
- [x] Store opname config: KAS_KECIL, imprest Rp 5.000.000
- [x] 11 denomination item definitions for KAS_KECIL
- [x] SYSTEM_ADMIN user (NIK: `ADMIN001`, PIN: `123456`)
- [x] Sample SM user for default store
- [x] Sample SAC, SS, SOA users for testing

#### 1.4 Authentication
- [x] Login page (NIK + PIN)
- [x] LoginAction with bcrypt verification
- [x] Session cookie (HTTP-Only, 24h TTL, database driver)
- [x] Logout
- [x] Auth middleware
- [x] CSRF protection

#### 1.5 RBAC Setup
- [x] Define 5 roles in Spatie Permission
- [x] Define all permissions per role (from `04-users-and-roles.md`)
- [x] StoreScope global scope
- [x] EnsureStoreScope middleware
- [x] Policy base classes

#### 1.6 Base Layout
- [x] AppLayout component (sidebar + topbar)
- [x] Sidebar navigation (role-aware menu items)
- [x] Topbar (store name, notification bell placeholder, user dropdown)
- [x] Mobile responsive drawer
- [x] Dashboard page (placeholder cards)

#### 1.7 User Management
- [x] User list page (DataTable)
- [x] Create user form
- [x] Edit user form
- [x] Reset PIN action
- [x] Activate/deactivate toggle
- [x] CreateUserAction, DeactivateUserAction

### Acceptance Criteria
- ✅ Can login with NIK + PIN
- ✅ Unauthorized routes redirect to login
- ✅ Role-based menu items shown/hidden correctly
- ✅ Users can only see their store's data
- ✅ SYSTEM_ADMIN can create stores and assign SM
- ✅ All migrations run cleanly on fresh SQLite

---

## Phase 2 — Voucher Module (Week 2)

### Objectives
- Complete voucher lifecycle (DRAFT → SETTLED)
- Anti self-approval enforced
- Client-side image compression working
- Batch settlement functional

### Tasks

#### 2.1 Core Voucher CRUD
- [x] PettyCashVoucher model, factory, policy
- [x] CreateVoucherAction (draft/submit)
- [x] Document number generator (sequential per month/store)
- [x] Voucher create page (form + photo upload)
- [x] ImageCompressor component (Canvas API → WebP)
- [x] MoneyInput component (Rupiah formatting)
- [x] Voucher list page (DataTable with filters)
- [x] Voucher detail page (info + photos + timeline)

#### 2.2 Approval Flow
- [x] SubmitVoucherAction
- [x] ApproveVoucherAction (with anti self-approval check)
- [x] RejectVoucherAction (reason required)
- [x] Pending approvals page (queue for SS/SAC)
- [x] StatusBadge component

#### 2.3 Disbursement & Settlement
- [x] DisburseVoucherAction (SAC only)
- [x] BatchSettleVouchersAction (multi-select)
- [x] Settlement page with checkbox selection
- [x] CancelVoucherAction (post-disbursement)
- [x] RefundVoucherAction

#### 2.4 Supporting Features
- [x] Soft delete for DRAFT vouchers
- [x] Attachments system (polymorphic upload)
- [x] Audit logging for all status changes
- [x] Notification dispatch on status changes

#### 2.5 Tests
- [x] T-SAP-01, T-SAP-02, T-SAP-03 (self-approval prevention)
- [x] T-STM-01 through T-STM-05 (state transitions)
- [x] T-NUM-01 through T-NUM-03 (document numbering)
- [x] T-DEL-01, T-DEL-02 (soft delete)

### Acceptance Criteria
- ✅ Full voucher lifecycle works end-to-end
- ✅ SAC cannot approve own voucher (tested)
- ✅ Photos compressed client-side to < 250KB WebP
- ✅ Batch settlement works for multiple vouchers
- ✅ Audit trail records every status change

---

## Phase 3 — BRI Fund Module (Week 3)

### Objectives
- INFLOW/OUTFLOW posting system working
- Running balances calculated correctly
- Dual control on outflows enforced
- Zero-deficit guard active

### Tasks

#### 3.1 Fund Posting CRUD
- [x] BriFundPosting model, factory, policy
- [x] CreatePostingAction (INFLOW → immediate APPROVED, OUTFLOW → PENDING_SS)
- [x] Posting create page (form + proof upload)
- [x] Posting list page (DataTable with filters)

#### 3.2 Approval Flow
- [x] ApproveOutflowAction (dual control check)
- [x] RejectOutflowAction (reason required)
- [x] Pending outflows page

#### 3.3 Balance Dashboard
- [x] Balance calculation service (running balances per entity/category)
- [x] Balance overview page (cards per category)
- [x] Entity detail page (posting history per entity)
- [x] Breakdown modal component

#### 3.4 Tests
- [x] T-AMN-01 through T-AMN-03 (zero-deficit guard)
- [x] T-DC-01, T-DC-02 (dual control)
- [x] T-BRI-01 through T-BRI-03 (balance calculations)

### Acceptance Criteria
- ✅ INFLOW immediately approved and increases balance
- ✅ OUTFLOW requires SS/SM approval before balance decreases
- ✅ Outflow rejected if amount > running balance (tested)
- ✅ Creator cannot approve own outflow (tested)
- ✅ Balance dashboard shows correct aggregations

---

## Phase 4 — Cash Opname Engine (Week 4-5)

### Objectives
- Full opname session lifecycle working
- Denomination counting with numpad navigation
- BRI sub-ledger auto-populated from fund postings
- Live variance preview
- Immutable lock on approval
- Carry-forward chain working

### Tasks

#### 4.1 Session Management
- [x] CashOpnameSession model, factory, policy
- [x] OpenSessionAction (fetch V_prev, init items, auto-populate BRI)
- [x] OpnameItemCount model
- [x] BriSubLedger model
- [x] Document number generator for opname

#### 4.2 Denomination Input
- [x] Active session page (workspace UI)
- [x] Denomination input table (configurable items from definitions)
- [x] UpdateDenominationsAction
- [x] Keyboard navigation (Enter/Tab → next row)
- [x] Auto-calculate subtotals and K_fisik total
- [x] Auto-heal: ensure all defined items present

#### 4.3 BRI Sub-Ledger
- [x] BRI section in active session page
- [x] Manual input: BRI mutation balance
- [x] Auto-calculated: category allocations from bri_fund_postings
- [x] Custom allocations management
- [x] UpdateBriSubledgerAction
- [x] Statement photo upload
- [x] Breakdown modal per category/entity
- [x] Manual sync button (refresh allocations)

#### 4.4 Variance Engine
- [x] Live variance calculation (real-time as inputs change)
- [x] K_bon auto-sum from DISBURSED vouchers
- [x] Variance status badge (BALANCED/SURPLUS/SHORTAGE)
- [x] Sticky summary bar at bottom of workspace

#### 4.5 Sign-Off Workflow
- [x] SubmitSessionAction (→ SUBMITTED)
- [x] VerifySessionAction (SS witness → VERIFIED_SS)
- [x] SignOffSessionAction (SM approval → APPROVED, lock all data)
- [x] RejectSessionAction (SS or SM → back to DRAFT)
- [x] SS verification workspace & modal
- [x] SM sign-off workspace & modal

#### 4.6 Immutable Snapshot
- [x] Lock check on every update operation
- [x] Snapshot BRI allocations at approval time
- [x] Snapshot DISBURSED voucher IDs at approval time
- [x] V_current stored and linked as V_prev for next session

#### 4.7 Session History
- [x] Session list page (DataTable)
- [x] Session detail page (read-only view)

#### 4.8 Tests
- [x] T-VAR-01 through T-VAR-08 (variance calculations)
- [x] T-LCK-01 through T-LCK-03 (immutable lock)
- [x] T-DEN-01 through T-DEN-03 (denomination calculations)
- [x] T-STM-06 through T-STM-08 (opname state transitions)
- [x] Carry-forward chain test

### Acceptance Criteria
- ✅ Full opname lifecycle works end-to-end
- ✅ Variance formula produces correct results (tested)
- ✅ Carry-forward chain: new session reads V_prev from last approved
- ✅ APPROVED session is completely immutable (tested)
- ✅ BRI allocations auto-populated from fund postings
- ✅ Denomination input is numpad-friendly

---

## Phase 5 — Reports & Excel Export (Week 5-6)

### Tasks
- [x] BACO Excel export (Maatwebsite/Excel)
  - [x] Native Excel formulas (=SUM, =C×D)
  - [x] Accounting format: `"Rp "#,##0`
  - [x] A4 portrait, narrow margins, fit-to-page
  - [x] Sign-off section with names and NIKs
- [x] Print-friendly HTML view (`@media print` CSS)
- [x] Voucher recap report (.xlsx)
- [x] BRI fund posting summary report (.xlsx)
- [x] Signed BA scan upload feature
- [x] Export tests (T-XLS-01, T-XLS-02)

### Acceptance Criteria
- ✅ Excel opens in MS Excel with working formulas
- ✅ Print view produces clean A4 output via Ctrl+P
- ✅ Sign-off section has correct names from session data

---

## Phase 6 — Polish & Production (Week 6-7)

### Tasks
- [x] In-app notification system (bell icon, dropdown, mark read)
- [x] Notification page (full list)
- [x] Audit log viewer page (DataTable with filters)
- [x] Import/Export center
  - [x] Export all data types as .xlsx/.csv
  - [x] Import users from .xlsx (with validation preview)
  - [x] Import historical vouchers
  - [x] Import BRI fund postings
- [x] Profile page (change PIN)
- [x] Store settings page (SM: edit name, plafon)
- [x] Performance optimization
  - [x] Eager loading on all queries
  - [x] Query count optimization (N+1 prevention)
  - [x] Asset bundling optimization (Vite)
- [x] Security hardening
  - [x] Rate limiting on login
  - [x] Input sanitization review
  - [x] CSRF token verification
- [x] Remaining tests (Medium priority)
- [x] VPS deployment
  - [x] Nginx config
  - [x] PHP-FPM config
  - [x] Supervisor config (queue worker)
  - [x] SSL setup (Certbot)
  - [x] Cron job for backups
  - [x] Initial seed data (production store, SM account)

### Acceptance Criteria
- ✅ All critical and high-priority tests pass
- ✅ Application deployed and accessible via HTTPS subdomain
- ✅ No N+1 query issues
- ✅ Import/export works for all data types
- ✅ Notification system functional

---

## Future Phases (Post-MVP)

### Phase 7 — Additional Opname Types
- [ ] KAS_BESAR implementation
- [ ] ACTIVE_SELLING implementation
- [ ] MATERAI implementation (2 item definitions: 10k, 6k)
- [ ] VOUCHER implementation (gift card denominations)
- [ ] Per-type Excel export templates

### Phase 8 — Enhancements
- [ ] Dashboard analytics (charts, trends)
- [ ] PWA installability (Add to Home Screen)
- [ ] Offline draft saving (Service Worker)
- [ ] WhatsApp notification integration
- [ ] Multi-store dashboard for SYSTEM_ADMIN
- [ ] Dark mode theme option

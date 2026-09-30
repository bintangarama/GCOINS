# 02 — Functional Requirements

## Module 1: Authentication & User Management

### FR-AUTH-01: Login
- User logs in with NIK (employee ID) + PIN/Password
- PIN is 6-digit minimum, hashed with bcrypt/Argon2id
- On success: create session cookie (HTTP-Only, 24h TTL)
- On failure: show error, no hint about which field is wrong

### FR-AUTH-02: Logout
- Destroy session cookie, redirect to login page

### FR-AUTH-03: Session Check
- Every page load validates active session
- Auto-redirect to login if session expired

### FR-AUTH-04: Change PIN
- Authenticated user can change their own PIN
- Requires current PIN verification before change

### FR-AUTH-05: User CRUD (SAC, SM, SYSTEM_ADMIN)
- Create user: NIK, name, role, initial PIN, phone number (optional)
- Edit user: name, role, phone number, active status
- Deactivate user: soft — set `is_active = false`
- Reset PIN: SAC/SM can reset any user's PIN in their store; SYSTEM_ADMIN can reset any user

### FR-AUTH-06: SYSTEM_ADMIN Store Management
- Create new store (code, name, address, imprest fund)
- Assign initial SM to a new store
- Configure opname types per store (plafon, active/inactive)
- Configure item definitions per opname type per store

---

## Module 2: Voucher Bon Kas Kecil (Petty Cash Voucher)

### FR-VCH-01: Create Draft
- Roles: SOA, SS, SAC
- Fields: amount (> 0, ≤ imprest fund), purpose, category, receipt photo, item photo
- Auto-generate voucher number: `{SEQ}/{TYPE_CODE}/{STORE_CODE}/{ROMAN_MONTH}/{YEAR}`
- Status: `DRAFT`
- Photos compressed client-side to WebP (≤ 250KB)

### FR-VCH-02: Delete Draft
- Only draft owner can delete their own draft
- Soft delete (`deleted_at` timestamp)

### FR-VCH-03: Submit for Review
- Owner submits draft → status becomes `SUBMITTED`
- Appears in approval queue for SS/SAC

### FR-VCH-04: Approve Voucher
- Roles: SS, SAC, SM
- **Anti Self-Approval**: If requester is SAC, SAC cannot approve their own voucher. Must be approved by SS or SM.
- Status: `SUBMITTED` → `APPROVED_SS`
- Triggers in-app notification to SAC for disbursement

### FR-VCH-05: Reject Voucher
- Roles: SS, SAC, SM
- Rejection reason is **mandatory**
- Status: `SUBMITTED` → `REJECTED`
- Triggers in-app notification to requester

### FR-VCH-06: Disburse Cash
- Role: SAC only
- SAC hands physical cash to requester
- Status: `APPROVED_SS` → `DISBURSED`
- Records `disbursed_by_id` and `disbursed_at`
- Voucher now counts as **active outstanding voucher (K_bon)**

### FR-VCH-07: Batch Settlement
- Role: SAC only
- Multi-select DISBURSED vouchers → mark as `SETTLED`
- Records `settled_at`
- Vouchers exit K_bon calculation

### FR-VCH-08: Post-Disbursement Cancellation
- Roles: SAC, SM
- Status: `DISBURSED` → `REJECTED_REFUND_PENDING`
- Staff must return physical cash to cashier

### FR-VCH-09: Confirm Refund
- Role: SAC only
- Status: `REJECTED_REFUND_PENDING` → `REFUNDED`
- Voucher exits K_bon

### FR-VCH-10: Voucher List & Filter
- Filterable by: status, date range, requester, category
- Searchable by: voucher number, purpose
- Paginated (default 20 per page)
- Sortable by: date, amount, status

### FR-VCH-11: Voucher Detail View
- Full voucher info + attached photos (zoomable)
- Status timeline with timestamps and actor names
- Action buttons shown based on current user's role and voucher status

---

## Module 3: BRI Fund Posting (Bank Sub-Ledger)

### FR-BRI-01: Record INFLOW
- Roles: SAC, SS
- Fields: category, entity name, amount (> 0), purpose, proof attachment
- Status: immediately `APPROVED`
- Running balance increases instantly

### FR-BRI-02: Record OUTFLOW
- Roles: SAC, SS
- Fields: same as INFLOW + destination account
- Validation: amount ≤ entity's current running balance (Zero-Deficit Guard)
- Status: `PENDING_SS`
- Running balance does **not** decrease until approved

### FR-BRI-03: Approve OUTFLOW
- Roles: SS, SM
- **Dual Control**: SAC cannot approve their own outflow
- Status: `PENDING_SS` → `APPROVED`
- Running balance decreases

### FR-BRI-04: Reject OUTFLOW
- Roles: SS, SM
- Rejection reason mandatory
- Status: `PENDING_SS` → `REJECTED`
- Running balance unchanged

### FR-BRI-05: Balance Overview Dashboard
- Show running balance per category (B2B, EVENT, AKSEL, ANONYMOUS, CUSTOM total)
- Show per-entity breakdown within each category
- Auto-refreshed when postings change

### FR-BRI-06: Posting History
- Filterable by: category, entity, type (INFLOW/OUTFLOW), status, date range
- Paginated, sortable

### FR-BRI-07: Entity Detail
- Drill-down view showing all postings for a specific entity
- Running balance calculation visible

---

## Module 4: Cash Opname Session

### FR-OPN-01: Open Session
- Role: SAC only
- Check for existing DRAFT session (resume if exists)
- If none: create new session with auto-generated number
- Auto-fetch V_prev from last APPROVED session (or 0 if first-ever)
- Initialize item counts to 0 (based on opname type's item definitions)
- Auto-populate BRI running balances

### FR-OPN-02: Input Denomination Counts
- Role: SAC only (during DRAFT)
- Display all item definitions for this opname type
- Input count per item, auto-calculate subtotal and K_fisik
- Keyboard navigation: Enter/Tab moves to next row (numpad-friendly)
- Auto-heal: ensure all defined items appear even if DB records are missing

### FR-OPN-03: BRI Sub-Ledger Input
- Role: SAC only (during DRAFT)
- Manual input: BRI mutation balance (from bank statement photo)
- Auto-calculated: category allocations (from BRI fund postings)
- Auto-calculated: K_bri = mutation - Σ allocations
- Upload bank statement photo
- Manual sync button to refresh allocations
- Breakdown modal per category/entity

### FR-OPN-04: Live Variance Preview
- Real-time calculation shown while DRAFT:
  - Total Actual = K_fisik + K_bon + K_bri
  - Target = Imprest + V_prev
  - V_current = Total - Target
  - Status badge: BALANCED / SURPLUS / SHORTAGE

### FR-OPN-05: Submit to Supervisor
- Role: SAC
- Status: `DRAFT` → `SUBMITTED`
- Triggers in-app notification to SS

### FR-OPN-06: SS Verification (Witness)
- Role: SS only
- SS physically verifies cash in safe matches the counts
- Status: `SUBMITTED` → `VERIFIED_SS`
- Records `verified_by_ss_id` and `verified_ss_at`
- Can reject → status back to `DRAFT` with reason

### FR-OPN-07: SM Sign-Off (Final Approval)
- Role: SM only
- SM reviews reconciliation, variance status, and notes
- Requires `confirm_understanding: true` checkbox
- Status: `VERIFIED_SS` → `APPROVED`
- **Triggers permanent lock**: all values become read-only
- V_current becomes V_prev for next session
- Records `approved_by_sm_id` and `approved_sm_at`
- Can reject → status back to `DRAFT` with reason

### FR-OPN-08: Session History
- List of all sessions (past and current)
- Filterable by: status, date range, opname type
- Status badges with color coding

### FR-OPN-09: Session Detail (Read-Only)
- Full breakdown of all values
- Denomination table, BRI sub-ledger, voucher list
- Sign-off timeline

---

## Module 5: Reports & Excel Export

### FR-RPT-01: BACO Excel Export
- Generate Berita Acara Cash Opname as .xlsx
- Native Excel formulas (=SUM, =C×D)
- Accounting format: `"Rp "#,##0`
- A4 portrait, narrow margins, fit-to-page
- Sign-off section with names and NIKs

### FR-RPT-02: Print View (HTML)
- `@media print` optimized A4 layout
- No navigation/buttons visible when printing
- Ctrl+P shortcut compatible

### FR-RPT-03: Voucher Recap Report
- Export list of vouchers as .xlsx/.csv
- Filterable by date range, status, category

### FR-RPT-04: BRI Fund Summary Report
- Export posting history and running balances

### FR-RPT-05: Signed BA Scan Upload
- Upload scanned signed Berita Acara (physical document with wet signatures)
- Attached to the opname session

---

## Module 6: Notifications

### FR-NTF-01: In-App Notification Center
- Bell icon in topbar with unread count badge
- Dropdown list of recent notifications
- Click to navigate to relevant page
- Mark as read (individual or all)

### FR-NTF-02: Notification Triggers
- Voucher submitted → notify SS/SAC (approvers)
- Voucher approved → notify SAC (for disbursement)
- Voucher rejected → notify requester
- BRI outflow created → notify SS/SM (for approval)
- Opname submitted → notify SS
- Opname verified → notify SM
- Opname approved → notify SAC

---

## Module 7: Import/Export

### FR-IMP-01: Data Export (All Modules)
- Export vouchers, BRI postings, users, audit logs as .xlsx or .csv
- Respect current filters when exporting

### FR-IMP-02: Data Import (Migration Support)
- Import users from .xlsx/.csv (with validation preview)
- Import historical vouchers from .xlsx
- Import BRI fund postings from .xlsx
- Preview with row-by-row validation before commit
- Error rows highlighted, downloadable error report

---

## Module 8: Audit Logs

### FR-AUD-01: Automatic Logging
- Every status change on voucher, opname session, BRI posting → logged
- Every user action (login, logout, create, update, delete) → logged
- Captures: who, what, when, old values, new values, IP address

### FR-AUD-02: Audit Log Viewer
- Roles: SAC, SM, SYSTEM_ADMIN
- Filterable by: entity type, entity ID, action, actor, date range
- Searchable by actor name
- Paginated, sortable by date

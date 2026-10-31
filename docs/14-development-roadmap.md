# 14 — Development Roadmap

## Overview

| Phase | Focus | Estimated Duration | Status |
|---|---|---|---|
| Phase 1 | Foundation & Auth | Week 1 | Complete ✅ |
| Phase 2 | Voucher Module | Week 2 | Complete ✅ |
| Phase 3 | BRI Fund Module | Week 3 | Complete ✅ |
| Phase 4 | Cash Opname Engine (KAS_KECIL) | Week 4-5 | Complete ✅ |
| Phase 5 | Reports & Excel Export | Week 5-6 | Complete ✅ |
| Phase 6 | Polish & Production Baseline | Week 6-7 | Complete ✅ |
| Phase 7 | Full 5 Item Engine, Precision Ledger & UX | Week 8 | Complete ✅ |
| Phase 8 | Operational Ergonomics, Dark Mode & Table UX | Week 9 | Complete ✅ |
| Phase 9 | Security Hardening & Complete Voucher Lifecycle | Week 10 | Complete ✅ |
| Phase 10 | Analytics & Mobile Enhancements | Future | Planned ⏳ |

**Scope Status**: Scope Penuh 5 Item Cash Count Engine, Comprehensive Security Hardening, Universal Anti Self-Approval, Complete Voucher Lifecycle (Draft Edit, Recall `SUBMITTED → DRAFT`, Pre-Settlement Category Reclassification, PDF Attachment Support), Deep Midnight Slate Dark Mode, Layout Ergonomics, dan Dual Selective Bulk Actions selesai diimplementasikan dengan 242 pengujian unit & fitur lulus 100% (931 assertions).

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
- [x] Receipt date tracking (`receipt_date` on vouchers & reports)
- [x] Storage URL normalization (relative `/storage` paths & localhost sanitization)
- [x] Audit logging for all status changes
- [x] Notification dispatch on status changes

#### 2.5 Tests
- [x] T-SAP-01, T-SAP-02, T-SAP-03 (self-approval prevention)
- [x] T-STM-01 through T-STM-05 (state transitions)
- [x] T-VCH-01, T-VCH-02 (receipt date & localhost URL normalization)
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
- [x] CreatePostingAction (INFLOW → immediate APPROVED; OUTFLOW → immediate APPROVED under SAC operational control with Zero-Deficit Guard; Legacy: PENDING_SS)
- [x] Posting create page (form + proof upload)
- [x] Posting list page (DataTable with filters)

#### 3.2 Approval Flow
- [x] ApproveOutflowAction (dual control check on legacy pending outflows)
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
- ✅ INFLOW & OUTFLOW immediately approved under SAC operational control
- ✅ Legacy PENDING_SS OUTFLOW requires SS/SM approval before balance decreases
- ✅ Outflow rejected if amount > running balance (Zero-Deficit Guard enforced)
- ✅ Creator cannot approve own legacy outflow (anti self-approval tested)
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

## Phase 7 — Full 5 Item Engine, Precision Ledger & Modular UX (Week 8) — Complete ✅

### Objectives
- Scope penuh 5 tipe kas opname: `KAS_KECIL`, `KAS_BESAR`, `ACTIVE_SELLING`, `MATERAI`, `GIFT_VOUCHER`
- Eliminasi bug osilasi variansi melalui model akuntansi: **Outstanding Variance + Resolution Ledger**
- Rename tipe `VOUCHER` → `GIFT_VOUCHER` (`GVCH`) untuk membedakan dari `PettyCashVoucher`
- Segregation of Duties (SoD) & Anti-Privilege Escalation security safeguards
- Tiered Dual Control: BRI Outflows (> Rp 500.000) & Write-Off Approvals (> Rp 1.000.000) WAJIB SM
- Modular Frontend Workspace (`<CountGrid>`, `<DailyClosingSwitcher>`, `<KasBesarForm>`, `<MobileApprovalCard>`)
- Kasir Numpad traversal keyboard navigation & 800ms debounce autosave
- Multi-tier client-side WebP image compression with canvas dimension fallback ($\le$ 250KB)

### Tasks

#### 7.1 Backend Polymorphic Strategy & Accounting
- [x] Reconciler Strategy Pattern (`ThreePocketsReconciler`, `CashFlowReconciler`, `ConsignmentReconciler`)
- [x] Rename `TYPE_VOUCHER` → `TYPE_GIFT_VOUCHER` dan update `DocumentNumberGenerator` (`GVCH`)
- [x] Migration `variance_resolutions` table (`id`, `store_id`, `session_id`, `opname_type`, `kind`, `amount_cents`, `status`, `notes`, `approved_by_id`, `approved_at`)
- [x] Migration `opname_reference_lines` table (`session_id`, `line_type`, `label`, `amount_cents`, `system_reference`, `photo_path`)
- [x] Migration update `cash_opname_sessions` (`raw_discrepancy_cents`, `cumulative_resolved_cents`, `outstanding_variance_cents`, partial unique index)
- [x] Migration update `opname_item_counts` (`condition`, `expected_count`)
- [x] Action classes: `StoreResolutionAction`, `ApproveResolutionAction`, `RejectResolutionAction`
- [x] Action classes: `SaveReferenceLinesAction`, `SyncBriMutationAction`

#### 7.2 Security Hardening (SoD & Tiered Dual Control)
- [x] `StoreUserRequest` & `UpdateUserRequest`: SAC dilarang membuat atau mengedit user dengan role $\ge$ SS
- [x] Anti-Privilege Escalation: User dilarang memodifikasi rolenya sendiri
- [x] `UserPolicy`: Batasi update, toggle status, dan reset PIN agar user tidak bisa memanipulasi diri sendiri
- [x] SAC dilarang me-reset PIN milik user dengan role `SS`, `SM`, atau `SYSTEM_ADMIN`
- [x] `ApproveOutflowAction`: Outflow > Rp 500.000 wajib SM approval (SS ditolak)
- [x] `ApproveResolutionAction`: Write-off > Rp 1.000.000 wajib SM approval (SS ditolak)

#### 7.3 Frontend Modular Architecture & UX
- [x] Modularisasi `Active.tsx` (dari 1.664 baris menjadi arsitektur komponen bersih)
- [x] `<CountGrid>`: Pengelompokan dinamis berdasarkan `group_label`, rendering elegan untuk materai & voucher
- [x] Numpad Traversal: Enter / Panah Bawah otomatis berpindah dan memanggil `select()` input berikutnya
- [x] Autosave 800ms dengan visual status indicator (`tersimpan`, `menyimpan...`, `perubahan belum disimpan`)
- [x] `beforeunload` guard untuk mencegah kehilangan data saat autosave pending
- [x] `<DailyClosingSwitcher>`: Tab switcher 5 tipe opname dengan badge status real-time
- [x] `<KasBesarForm>`: Input dinamis baris referensi (Z-Report, Modal Awal, DRO) & bukti foto Z-Report
- [x] `<MobileApprovalCard>`: Tampilan ringkas touch-friendly untuk approval cepat SS/SM via smartphone
- [x] Hardening `image-compressor.ts`: Multi-stage resizing fallback (max 1280x1920 px, $\le$ 250KB WebP)

#### 7.4 Tests & Verification
- [x] `tests/Feature/Opname/Strategy/ThreePocketsReconcilerTest.php`
- [x] `tests/Feature/Opname/Strategy/CashFlowReconcilerTest.php`
- [x] `tests/Feature/Opname/Strategy/ConsignmentReconcilerTest.php`
- [x] `tests/Feature/User/UserSodSecurityTest.php`
- [x] `tests/Feature/Resolution/ApproveResolutionActionTest.php`
- [x] 55 Feature & Strategy tests passed (302 assertions)
- [x] TypeScript build clean (`npm run build` sukses 0 errors)
- [x] Laravel Pint formatting clean (`./vendor/bin/pint --dirty --format agent`)

### Acceptance Criteria
- ✅ Scope penuh 5 tipe opname berjalan mulus dengan Strategy Pattern Reconcilers
- ✅ Selisih osilasi hilang sepenuhnya dengan Outstanding Variance + Resolution Ledger
- ✅ SAC tidak dapat membobol wewenang user management (SoD terisolasi ketat)
- ✅ Approval bertingkat untuk transaksi sensitif (> 500rb BRI & > 1jt Write-Off) tervalidasi
- ✅ UI kasir responsif, modular, mendukung numpad kasir dan autosave 800ms tanpa data loss

---

## Phase 8 — Operational Ergonomics, Dark Mode & Table UX (Week 9) — Complete ✅

### Objectives
- Area vertikal kerja kasir lebih luas dan bebas distraksi
- Mode gelap Deep Midnight Slate yang nyaman di mata kasir
- Dashboard interaktif dan adaptif terhadap peran pengguna
- Universal Interactive Column Sorting di seluruh tabel data operasional
- Selective Bulk Action Architecture yang patuh pada batas-batas Invariant Finansial

### Tasks

#### 8.1 Workspace & Layout Ergonomics
- [x] Breadcrumb terintegrasi di Topbar dengan penanganan overflow adaptif
- [x] Pembersihan redundansi nama toko ("Toko Gramedia Gramedia...") menjadi format ringkas `[Kode] Nama Toko`
- [x] Collapsible Desktop Sidebar dengan toggle animasi dan penyimpanan state
- [x] Perampingan menu sidebar (menghilangkan duplikasi tombol primer formulir)

#### 8.2 Deep Midnight Slate Dark Mode
- [x] Implementasi palet `#0b1120` (background), `#151e32` (elevated card), `#1e293b` (border), `#f1f5f9` (teks utama)
- [x] Pembersihan hardcoded classes `bg-white` dan `border-slate-200` pada seluruh tabel admin dan modal
- [x] Kontras tinggi WCAG AAA untuk teks monospaced nominal keuangan

#### 8.3 Role-Aware Interactive Dashboard
- [x] Clickable metric cards menghubungkan langsung ke modul terkait
- [x] Filter metrik berbasis peran (SOA tidak dibebani metrik opname brankas kasir)
- [x] Optimasi aktivitas terbaru dibatasi ke 5 item teratas

#### 8.5 Universal Table Sorting & Selective Bulk Actions
- [x] Komponen `DataTableHeaderCell` dengan indikator visual panah aktif/netral
- [x] Server-side sorting pada 6 tabel utama: `Voucher/Index`, `Voucher/Pending`, `BriFund/Postings`, `Opname/Index`, `Admin/Users`, `Admin/AuditLogs`
- [x] Zebra striping lembut `even:bg-muted/20` dan highlight baris terpilih `bg-primary/10 border-l-2 border-l-primary`
- [x] Floating glassmorphic action bar `DataTableBulkBar`
- [x] `BulkApproveVouchersAction` & endpoint `POST /vouchers/bulk-approve` dengan pengawalan Rule 5 Anti Self-Approval atomik
- [x] Bulk export Excel selektif via query parameter `voucher_ids` pada `/vouchers`
- [x] Penegakan aturan larangan bulk action pada Opname (Rule 2, 3, 4), Outflow BRI (Rule 6, 7), dan Audit Log (Rule 10)

#### 8.6 Mobile Photo & File Upload Options & SAC Instant Outflow Approval
- [x] Dual action buttons pada `ImageUploader.tsx`: `[ 📷 Buka Kamera ]` (`capture="environment"`) & `[ 📁 Pilih File / Galeri ]` (standard picker tanpa capture)
- [x] Opsi ganti foto langsung via `DropdownMenu` ("Ambil Foto Baru" & "Pilih dari Galeri/Berkas") tanpa harus menghapus foto terlebih dahulu
- [x] Dukungan dokumen PDF (hingga 2MB) pada upload rekening koran bank BRI (`/opname/active`)
- [x] Kendali operasional penuh kasir/SAC (Rule 6): Seluruh mutasi OUTFLOW BRI langsung disetujui seketika (`STATUS_APPROVED`) saat dicatat oleh SAC
- [x] Validasi ketat *Zero-Deficit Guard* (Rule 7) saat pencatatan OUTFLOW untuk mencegah saldo negatif
- [x] Pengiriman notifikasi informatif `BRI_OUTFLOW_RECORDED` ke SS dan SM
- [x] Kompatibilitas antrean persetujuan mutasi lama (`PENDING_SS`) melalui `ApproveOutflowAction` & `RejectOutflowAction`
- [x] Feature tests disesuaikan (214 tests, 799 assertions, 100% lulus)

### Acceptance Criteria
- ✅ Area vertikal bertambah signifikan untuk efisiensi pandang kasir
- ✅ Pengurutan kolom berfungsi mulus dan persisten via URL di seluruh modul
- ✅ Pengguna mobile memiliki kendali penuh memilih kamera langsung atau galeri perangkat
- ✅ SAC dapat mengeksekusi penarikan BRI instan tanpa hambatan persetujuan dengan saldo terlindungi
- ✅ Seluruh pengujian unit & fitur hijau tanpa regresi

---

## Phase 9 — Security Hardening & Complete Voucher Lifecycle (Week 10) — Complete ✅

### Objectives
- Penutupan celah keamanan menyeluruh (Import Commit Re-Validation, Strict File/PDF MIME Validation, RBAC Authorization Audit, Immediate Session Revocation, Deployment Script Hardening)
- Penegakan **Universal Anti Self-Approval (Rule 5)** untuk seluruh role approver (`SAC`, `SS`, `SM`) pada persetujuan tunggal maupun massal
- Dual Bulk Action Bar pada `/vouchers` (Bulk Approve berdampingan dengan Bulk Export Excel)
- Fleksibilitas siklus hidup Bon Kas Kecil yang patuh audit: **Edit Draft**, **Recall `SUBMITTED → DRAFT`**, dan **Reklasifikasi Kategori Sebelum `SETTLED`**

### Tasks

#### 9.1 Comprehensive Security Hardening & PDF Support
- [x] Server-side row re-validation & role hierarchy enforcement pada `/admin/import-export/commit` (`ImportUsersAction`, `ImportVouchersAction`, `ImportBriPostingsAction`, `ImportCategoriesAction`)
- [x] Hardening validasi unggah berkas bon kas kecil (`'file'`, `'mimes:jpg,jpeg,png,webp,pdf'`, `'max:5120'`) beserta dukungan upload & pratinjau dokumen `.pdf` (hingga 5 MB)
- [x] Penambahan `Gate::authorize` pada titik endpoint yang belum terlindungi (`OpnameController::storeReferenceLine`/`destroyReferenceLine`, `PettyCashCategoryController::index`, `VoucherController::pending`, `PettyCashSettlementController`)
- [x] Pencabutan sesi aktif seketika (`sessions` purge + `EnsureStoreScope` active user guard) saat akun dinonaktifkan (`DeactivateUserAction`) atau PIN di-reset (`ResetPinAction`)
- [x] Hardening script produksi VPS: `deploy/cron-backup.sh` (`umask 077`, `chmod 700/600`), `deploy/deploy.sh` (opsional `DEPLOY_BYPASS_SECRET` tanpa hardcoded secret), dan panduan permission `ug+rwX` + SGID + `git config core.fileMode false`

#### 9.2 Universal Anti Self-Approval & Dual Bulk Actions
- [x] Ekspansi Rule 5 Anti Self-Approval ke seluruh role (`SAC`, `SS`, `SM`) pada `PettyCashVoucherPolicy`, `ApproveVoucherAction`, `BulkApproveVouchersAction`, dan `RejectVoucherAction`
- [x] Proteksi UI universal pada `/vouchers/pending`, `/vouchers`, dan `/vouchers/{voucher}` (checkbox disabled / indikator `Milik Sendiri`)
- [x] Integrasi tombol `Setujui Bon Terpilih` berdampingan dengan `Export Excel Terpilih` pada `DataTableBulkBar` halaman `/vouchers`

#### 9.3 Editable Draft, Voucher Recall & Pre-Settlement Category Reclassification
- [x] Fitur **Edit Draft** (`GET /vouchers/{voucher}/edit`, `PUT /vouchers/{voucher}`, `UpdateVoucherRequest`, `UpdateVoucherAction`, `Voucher/Edit.tsx`) dengan opsi pertahankan/ganti/hapus berkas bukti dan log `UPDATE_VOUCHER` / `SUBMIT_VOUCHER`
- [x] Fitur **Tarik Kembali ke Draft (`SUBMITTED → DRAFT`)** (`POST /vouchers/{voucher}/recall`, `RecallVoucherAction`) khusus pemohon asli sebelum diproses approver dengan log `RECALL_VOUCHER`
- [x] Fitur **Ubah Kategori Pos Beban Sebelum `SETTLED`** (`PUT /vouchers/{voucher}/category`, `ReclassifyVoucherCategoryAction`, `ReclassifyCategoryDialog.tsx`) pada halaman Detail Bon & persiapan Rekap KKCL `/vouchers/settlement` dengan log `RECLASSIFY_CATEGORY` tanpa menyentuh nominal/status
- [x] Penambahan suite pengujian lengkap (`SecurityHardeningTest`, `UpdateDraftVoucherTest`, `RecallAndReclassifyVoucherTest`, ekspansi `SelfApprovalPreventionTest` & `BulkApproveVouchersTest` — total **242 tests, 931 assertions, 100% lulus**)

#### 9.4 Cash Opname Dual Indicator & UI Polish
- [x] Pemisahan tampilan hasil rekonsiliasi kas pada *Sticky Bottom Bar* Sesi Aktif Cash Opname (`Active.tsx`) menjadi dua indikator mandiri: **Acuan Target / Plafon** (bernilai `0` saat surplus/pas terpenuhi, minus saat kurang) dan **Selisih Kasir** (nilai surplus `+`, seimbang `0`, atau tekor `-`)
- [x] Sinkronisasi ringkasan dialog konfirmasi pengajuan verifikasi saksi (`SubmitModal`) dan persetujuan Store Manager (`SignOffModal`) dengan dua indikator rekonsiliasi
- [x] Pembaruan dokumentasi spesifikasi antarmuka pengguna (`docs/10-ui-ux-specification.md`)

### Acceptance Criteria
- ✅ Seluruh celah keamanan (import tampering, MIME bypass, session zombie, self-approval lintas role) tertutup dan teruji otomatis
- ✅ Dokumen nota/invoice berformat `.pdf` (≤ 5 MB) dapat diunggah dan dipratinjau pada bon kas kecil
- ✅ Pemohon dapat mengedit bon `DRAFT` atau menarik bon `SUBMITTED` kembali ke `DRAFT` sebelum disetujui
- ✅ `SS`/`SAC`/`SM` dapat mereklasifikasi kategori bon yang salah pilih hingga sebelum dikunci ke Rekap KKCL (`SETTLED`) dengan jejak audit lengkap
- ✅ Sesi aktif cash opname menyajikan pemisahan acuan pokok plafon 5 juta dan selisih kas secara transparan dan mudah dipahami kasir/auditor

---

## Phase 10 — Analytics & Mobile Enhancements (Future / Post-MVP)

### Planned Enhancements
- [ ] Dashboard analytics (grafik tren variansi per tipe, velocity rekonsiliasi kasir)
- [ ] PWA installability (Add to Home Screen untuk smartphone supervisor/manager)
- [ ] WhatsApp notification webhook integration
- [ ] Multi-store aggregated dashboard untuk SYSTEM_ADMIN & Regional Auditor

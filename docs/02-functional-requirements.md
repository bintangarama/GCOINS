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

### FR-AUTH-05: User CRUD & Segregation of Duties (SoD)
- Create user: NIK, name, role, initial PIN (min 6 digits), phone number (optional)
- Edit user: name, role, phone number, active status
- **Segregation of Duties (SoD)**:
  - SAC DILARANG membuat atau mengubah user dengan role `SS`, `SM`, atau `SYSTEM_ADMIN`. Hanya SM dan SYSTEM_ADMIN yang berwenang mengelola role $\ge$ SS.
  - User DILARANG mengubah rolenya sendiri (anti-privilege escalation).
- Deactivate user: soft — set `is_active = false`. User tidak bisa menonaktifkan dirinya sendiri.
- **PIN Reset Safeguards**:
  - SAC hanya boleh me-reset PIN user dengan role `SOA` atau `SAC`.
  - SAC DILARANG me-reset PIN milik `SS`, `SM`, atau `SYSTEM_ADMIN`.
  - User tidak boleh me-reset PIN miliknya sendiri via endpoint admin.
  - Reset PIN menghasilkan PIN sementara 6 digit tanpa mencetak PIN terbuka di response log.

### FR-AUTH-06: SYSTEM_ADMIN Store Management
- Create new store (code, name, address, imprest fund)
- Assign initial SM to a new store
- Configure opname types per store (plafon, active/inactive)
- Configure item definitions per opname type per store

---

## Module 2: Voucher Bon Kas Kecil (Petty Cash Voucher)

### FR-VCH-01: Create Draft
- Roles: SOA, SS, SAC
- Fields: amount (> 0, ≤ imprest fund), receipt_date (optional, default: today), purpose, category, receipt photo, item photo
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

### FR-VCH-12: Master Kategori Kas Kecil (Expense Categories)
- **Roles**: `SYSTEM_ADMIN` (Global Nasional), `SAC`/`SM` (Custom Store)
- **10 Kategori Standar Gramedia**: `BDL`, `BBM_MOBIL`, `BBM_MOTOR`, `KERTAS_FORMULIR`, `BIAYA_PEMASARAN`, `IKLAN`, `ONGKIR`, `EMBALLAGE`, `KEP_RT`, `LAINNYA`
- **Scope Isolation**: Store SAC/SM can only add/edit categories belonging to their store (`store_id`)
- **Ordering**: Kolom `order` untuk menentukan urutan kolom pada tabel matriks rekap
- **Status Toggle**: Aktif / Nonaktif tanpa menghapus data historis voucher yang ada

### FR-VCH-13: Rekapitulasi Kas Kecil (KKCL Columnar Matrix Settlement)
- **Role**: SAC only
- **Batch Settle**: Memilih voucher `DISBURSED` secara massal untuk diselesaikan
- **Penomoran Dokumen Otomatis**: Format resmi `{SEQ}/KKCL/{STORE_CODE}/{ROMAN_MONTH}/{YEAR}`
- **Binding Transaksional**: Seluruh voucher terpilih otomatis terikat ke `settlement_id` dan berstatus `SETTLED`
- **Status Rekap Selesai Seketika**: Rekap berstatus `SETTLED` langsung saat dibuat oleh SAC (tanpa blocking approval SM)
- **Dual Format Output**:
  - Direct Web Print A4 Landscape (`@media print` CSS 1:1 replika fisik lembar Karawang `GAM435`)
  - Excel Columnar Matrix Pivot (`.xlsx`) dengan formula `=SUM()` dan kotak tanda tangan SAC & SM

### FR-VCH-14: Validasi Foto Bukti Pengajuan (Receipt Image Guard)
- Pengajuan langsung (`is_submit: true` atau tombol "Ajukan Sekarang") **WAJIB** melampirkan foto kuitansi/struk fisik
- Pembuatan draft (`is_submit: false` atau tombol "Simpan Sebagai Draft") mengizinkan penyimpanan tanpa foto bukti
- Validasi FormRequest mengembalikan error HTTP 422 (*Foto kuitansi/bukti wajib dilampirkan sebelum pengajuan.*) dan ditampilkan langsung di bawah input uploader tanpa menyebabkan crash 500
- Action layer dilindungi dengan `ValidationException` jika dipanggil di luar FormRequest

### FR-VCH-15: Tanggal Bon Fisik (Receipt Date)
- Field `receipt_date` (DATE nullable, default otomatis: tanggal hari ini `YYYY-MM-DD`)
- Staf pengaju (SOA/SS/SAC) dapat menentukan tanggal aktual belanja fisik saat pengajuan (mendukung pencatatan tanggal mundur/back-dated)
- Filter daftar voucher (`date_from`, `date_to`) memprioritaskan tanggal bon fisik (`receipt_date`), dengan fallback ke `created_at` untuk data historis
- Ditampilkan secara konsisten pada antarmuka tabel daftar voucher, detail voucher, ekspor Excel rekapitulasi voucher (`VoucherRecapExport`), serta rekap matriks KKCL (`PettyCashMatrixRecapExport`)
- Impor data voucher historis dari Excel otomatis memetakan tanggal dokumen ke kolom `receipt_date`

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

### FR-BRI-03: Approve OUTFLOW (Tiered Dual Control)
- Roles: SS, SM
- **Tiered Dual Control & Anti Self-Approval**:
  - Creator DILARANG meng-approve outflow buatannya sendiri (anti self-approval).
  - Outflow $\le$ Rp 500.000: dapat disetujui oleh **SS** atau **SM**.
  - Outflow > Rp 500.000: **WAJIB SM** (Store Manager). Upaya approval oleh SS akan ditolak (403 Forbidden).
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

## Module 4: Polymorphic Cash Opname Engine & Resolution Ledger

### FR-OPN-01: Open Session (Polymorphic Engine)
- Role: SAC only
- Mendukung 5 tipe kas opname: `KAS_KECIL`, `KAS_BESAR`, `ACTIVE_SELLING`, `MATERAI`, `GIFT_VOUCHER`
- Resume existing DRAFT session jika ada di tanggal dan tipe yang sama (didukung SQLite partial unique index)
- Auto-fetch unresolved outstanding variance dari sesi APPROVED sebelumnya per tipe opname
- Inisialisasi item counts (sesuai `opname_item_definitions` toko)
- Inisialisasi dynamic reference lines (Z-Report, Modal Awal, Setoran DRO)

### FR-OPN-02: Input Denomination & Item Counts
- Role: SAC only (selama status DRAFT)
- Menampilkan item counts secara dinamis berdasarkan `group_label` dan tipe opname:
  - Uang Kertas & Uang Logam (KAS_KECIL, KAS_BESAR, ACTIVE_SELLING)
  - Keping Materai 10k/6k (MATERAI) dengan status kondisi Fisik Baik / Rusak
  - Lembar Gift Voucher (GIFT_VOUCHER)
- Keyboard traversal kasir: Enter / Panah Bawah otomatis berpindah dan menyeleksi (`select()`) input berikutnya
- Debounce autosave 800ms: perubahan nominal tersimpan otomatis di latar belakang tanpa refresh

### FR-OPN-03: Strategy Reconcilers & Reference Lines
- **Strategy Pattern Reconciler** mengeksekusi rekonsiliasi sesuai tipe:
  1. `ThreePocketsReconciler` (`KAS_KECIL`): Fisik safe + Bon gantung (DISBURSED) + Net BRI pooling vs Plafon Imprest
  2. `CashFlowReconciler` (`KAS_BESAR`): Fisik safe vs (Opening Float + Sales Z-Report - Bank Drops - Payouts)
  3. `ConsignmentReconciler` (`ACTIVE_SELLING`): Fisik safe vs (Modal Awal + Hasil Jual Konsinyasi - Biaya Event - Setor Toko)
  4. `StockCountReconciler` (`MATERAI`): Fisik materai kondisi baik vs Saldo buku (Opening + Received - Used - Damaged)
  5. `SerialStockReconciler` (`GIFT_VOUCHER`): Fisik lembar voucher vs Kartu stok / Rentang nomor seri
- **Reference Lines**: Input dinamis baris referensi (Z-Report, Modal Awal, Setoran Bank/DRO)
- **Bukti Fisik Z-Report**: Pada `KAS_BESAR`, wajib menginput minimal 1 Z-Report dan mengunggah foto struk Z-Report fisik sebelum submit

### FR-OPN-04: Precision Accounting (Outstanding Variance & Resolution Ledger)
- Menghilangkan bug osilasi variance dengan formula akuntansi standar buku besar:
  - $\text{RawDiscrepancy} = \text{TotalActual} - \text{TargetAmount}$
  - $\text{CumulativeResolved} = \sum \text{approved resolutions}$
  - $\text{OutstandingVariance} = \text{RawDiscrepancy} + \text{CumulativeResolved}$
- Status variance dievaluasi murni dari $\text{OutstandingVariance}$:
  - `BALANCED` ($\text{OutstandingVariance} = 0$)
  - `SURPLUS` ($\text{OutstandingVariance} > 0$)
  - `SHORTAGE` ($\text{OutstandingVariance} < 0$)

### FR-OPN-05: Variance Resolution Management
- SAC dapat mengajukan penyelesaian selisih (`REPLACED`, `WRITE_OFF`, `FOUND`)
- **Tiered Write-Off Approval**:
  - Write-off $\le$ Rp 1.000.000: dapat disetujui oleh **SS** atau **SM**
  - Write-off > Rp 1.000.000: **WAJIB SM** (Store Manager)
- Resolusi yang disetujui (`APPROVED`) langsung menambah `cumulative_resolved_cents` dan menetralkan outstanding variance

### FR-OPN-06: Submit to Supervisor
- Role: SAC
- Validasi: semua item telah diisi. Jika `KAS_BESAR`, minimal 1 Z-report dan foto bukti fisik telah diunggah
- Status: `DRAFT` → `SUBMITTED`
- Triggers in-app notification ke SS

### FR-OPN-07: SS Verification (Witness)
- Role: SS only
- SS memverifikasi fisik uang di brankas cocok dengan input SAC
- Status: `SUBMITTED` → `VERIFIED_SS`
- Rekam `verified_by_ss_id` dan `verified_ss_at`
- Jika tidak sesuai: Reject → kembali ke `DRAFT` dengan alasan wajib

### FR-OPN-08: SM Sign-Off (Final Approval & Immutable Lock)
- Role: SM only
- SM meninjau rekonsiliasi, reference lines, foto bukti, dan resolusi selisih
- Wajib mencentang persetujuan `confirm_understanding: true`
- Status: `VERIFIED_SS` → `APPROVED`
- **Permanent Lock**: Semua data item counts, reference lines, dan resolusi terkunci permanen
- Outstanding variance yang belum selesai terbawa ke sesi berikutnya per tipe opname

### FR-OPN-09: Session History & Detail View
- Filter riwayat sesi berdasarkan status, rentang tanggal, dan 5 tipe opname
- Tampilan detail read-only lengkap dengan tab reference lines, audit timeline, dan resolusi selisih

### FR-OPN-10: Client-Side Resilience & UX Enhancements
- **Multi-tier WebP Compressor**: Kompresi foto bukti di browser (max 1280x1920 px, $\le$ 250KB WebP) dengan fallback penskalaan dimensi
- **Unsaved Changes Guard**: Peringatan `beforeunload` jika user bernavigasi saat autosave sedang berlangsung

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
- **Kolom M (Nomor Rekap KKCL)**: Menyertakan nomor dokumen settlement bagi voucher yang sudah direkap

### FR-RPT-04: BRI Fund Summary Report
- Export posting history and running balances

### FR-RPT-05: Signed BA Scan Upload
- Upload scanned signed Berita Acara (physical document with wet signatures)
- Attached to the opname session

### FR-RPT-06: Petty Cash Matrix Recap Export (.xlsx)
- Export dokumen KKCL dalam format matriks akuntansi berkolom
- Pivot horizontal kategori pos beban toko
- Format akuntansi `#,##0`, formula `=SUM()`, tanggal cetak, dan kotak tanda tangan SAC & SM

### FR-RPT-07: Petty Cash Settlements List Export (.xlsx)
- Export daftar seluruh arsip dokumen rekapitulasi kas kecil toko

### FR-RPT-08: Master Categories Export (.xlsx)
- Export seluruh daftar master kategori pos beban (Global & Khusus Toko)

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
- Export vouchers, BRI postings, users, audit logs, categories, settlements as .xlsx
- Respect current store scope and query filters

### FR-IMP-02: Data Import (Migration Support)
- Import users from .xlsx/.csv (with validation preview)
- Import historical vouchers from .xlsx (multi-sheet template dengan Sheet 1 Format Data & Sheet 2 Katalog Kategori Referensi)
- Import BRI fund postings from .xlsx
- Import master categories from .xlsx (kode unik, lingkup toko/global, urutan kolom)
- Preview dengan row-by-row validation sebelum commit ke database
- Error rows highlighted dengan penyebab kesalahan detail

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

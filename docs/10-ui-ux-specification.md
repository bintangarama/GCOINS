# 10 — UI/UX Specification

## 1. Design Principles

- **Corporate Clean**: Professional, minimal, no decorative noise
- **Desktop-First**: Primary layout optimized for cashier PC with numpad
- **Fully Responsive**: All pages usable on mobile (especially voucher submission)
- **Bilingual**: Indonesian + English labels where appropriate, professional tone
- **Functional Focus**: Prioritize clarity and efficiency over aesthetics
- **Print-Ready**: `@media print` CSS on report pages

## 2. Design System

### Typography
- Primary font: **Inter** (Google Fonts) — clean, professional, excellent readability
- Monospace (numbers): **JetBrains Mono** or system mono — for financial figures

### Color Palette & Theme Tokens

#### Light Mode (Clean Corporate)
- Background: `hsl(0 0% 100%)` (clean white)
- Card / Panel: `hsl(0 0% 100%)` with subtle border `hsl(220 13% 91%)`
- Foreground: `hsl(224 71% 4%)` (slate near-black)
- Primary: `hsl(220 70% 50%)` (Gramedia professional blue)
- Destructive: `hsl(0 84% 60%)` (red for errors, shortages, negative variance)
- Success: `hsl(142 71% 45%)` (emerald green for balanced, approved)
- Warning: `hsl(38 92% 50%)` (amber for pending, surplus)
- Muted Background: `hsl(220 14% 96%)` / `bg-muted/20` for gentle zebra striping
- Border: `hsl(220 13% 91%)`

#### Dark Mode (Deep Midnight Slate — Ergonomic & High Contrast)
Untuk menjamin kenyamanan mata di lingkungan kerja kasir yang minim pencahayaan dan mencegah kelelahan mata (*eye-strain*), tema gelap menggunakan palet **Deep Midnight Slate** (bukan hitam pekat #000000):
- Background Halaman: `#0b1120` (slate-950 pekat elegan)
- Card / Table / Dialog: `#151e32` (slate-900 elevated)
- Border / Divider: `#1e293b` (slate-800 subtle)
- Teks Utama (Foreground): `#f1f5f9` (slate-100 kontras tinggi WCAG AAA)
- Teks Sekunder (Muted): `#94a3b8` (slate-400 jelas terbaca)
- Highlight Baris Terpilih: `bg-primary/10 border-l-2 border-l-primary`
- Zebra Striping: `even:bg-muted/20` (lembut, tidak silau)

### Status Badge Colors
| Status | Color | Context |
|---|---|---|
| DRAFT | Gray | Not yet submitted |
| SUBMITTED | Blue | Awaiting review |
| PENDING_SS | Amber | Awaiting supervisor approval |
| APPROVED / APPROVED_SS | Green | Approved |
| VERIFIED_SS | Teal | Supervisor verified |
| DISBURSED | Purple | Cash handed out |
| SETTLED | Green (dark) | Fully reconciled |
| REJECTED | Red | Rejected |
| REJECTED_REFUND_PENDING | Orange | Awaiting refund |
| REFUNDED | Gray (dark) | Cash returned |
| BALANCED | Green | Variance = 0 |
| SURPLUS | Blue | Variance > 0 |
| SHORTAGE | Red | Variance < 0 |

## 3. Layout Structure

### Workspace Optimization & Vertical Space Ergonomics
Untuk memberikan area kerja vertikal yang lebih luas bagi data tabel keuangan dan rekonsiliasi kasir, arsitektur layout mengadopsi prinsip:
1. **Breadcrumb Terintegrasi di Topbar**: Jalur navigasi breadcrumb dipindahkan langsung ke dalam Topbar header utama, mengeliminasi baris kosong redundan di atas konten halaman.
2. **Eliminasi Redundansi Teks Toko**: Penulisan toko yang berulang ("Toko Gramedia Gramedia...") dibersihkan menjadi format ringkas: `[Kode Toko] Nama Toko` di Topbar.
3. **Desktop Collapsible Sidebar**: Sidebar desktop dapat di-minimize/expand secara dinamis via tombol collapse, memberikan lebar horizontal penuh saat meninjau tabel laporan lebar atau matriks kolom.
4. **Perampingan Menu Navigasi**: Menu aksi yang redundan (seperti sub-menu "Buat Bon" di sidebar utama) dirampingkan karena tombol primer "Buat Bon" sudah tersemat langsung pada action bar halaman Daftar Bon.

### Desktop Layout (≥ 1024px)

```
┌────────────────────────────────────────────────────────────────────────┐
│  Topbar [☰ Collapse] [Breadcrumb Nav]        [🔔 Notifications] [User ▾]│
├──────────────┬─────────────────────────────────────────────────────────┤
│              │                                                         │
│ Sidebar      │                     Main Content                        │
│ (Collapsible)│                                                         │
│              │  ┌───────────────────────────────────────────────────┐  │
│ 📊 Dashboard │  │ Page Header (Title + Action Buttons)              │  │
│ 📝 Bon Kas   │  ├───────────────────────────────────────────────────┤  │
│ 💰 Opname    │  │ Filter Bar / Summary Metrics                      │  │
│ 🏦 BRI Fund  │  ├───────────────────────────────────────────────────┤  │
│ ⚙️ Admin     │  │ Data Table (Sortable, Zebra, Multi-Select)        │  │
│              │  └───────────────────────────────────────────────────┘  │
│              │      [Floating Bulk Action Bar (if items selected)]     │
└──────────────┴─────────────────────────────────────────────────────────┘
```

### Mobile Layout (< 1024px)

```
┌──────────────────────────────────────┐
│  Topbar [☰] [G-COINS]          [🔔]   │
├──────────────────────────────────────┤
│  Page Header                         │
│  ├── Title                           │
│  └── Action Buttons                  │
├──────────────────────────────────────┤
│  Page Content                        │
│  (stacked cards, touch-friendly)     │
│                                      │
│  [Floating Bulk Bar on Selection]    │
└──────────────────────────────────────┘

[☰] → Slide-out responsive drawer
```

### Sidebar Navigation Tree

```
📊 Dashboard
📝 Bon Kas Kecil
   ├── Daftar Bon (Akses langsung ke Buat Bon & Export)
   ├── Antrean Approval (SS/SAC/SM - Multi-select Bulk Approve)
   └── Settlement (Matriks Rekapitulasi KKCL)
💰 Cash Opname
   ├── Riwayat Sesi (Semua tipe opname)
   └── Sesi Aktif (Workspace 5 tipe opname)
🏦 Mutasi BRI
   ├── Overview Saldo (Sub-ledger & breakdown)
   ├── Riwayat Mutasi (Sortable INFLOW & OUTFLOW)
   ├── Catat Mutasi Baru
   └── Antrean Outflow (Persetujuan pengeluaran legacy)
⚙️ Administrasi (Role $\ge$ SAC / SM / SYSTEM_ADMIN)
   ├── Manajemen User (NIK, Role, Status)
   ├── Master Kategori Kas Kecil (Dual-scope)
   ├── Pengaturan Toko
   ├── Audit Log (Immutable append-only)
   └── Import/Export Center
```

## 4. Page Specifications

### 4.1. Login Page (`/login`)
- Centered card layout
- Fields: NIK (text), PIN (password, masked)
- "Masuk" button
- Error message on invalid credentials
- No registration link (users are created by admin)

### 4.2. Dashboard (`/dashboard`)
- **Interactive Clickable Summary Cards**:
  - Setiap kartu metrik berfungsi sebagai tautan navigasi langsung ke modul terkait.
  - Kartu disesuaikan secara dinamis berdasarkan peran (**Role-Based Metrics**):
    - **SOA**: Hanya melihat status bon miliknya, plafon kas kecil, dan saldo berjalan (tidak dibebani metrik sesi cash opname kasir).
    - **SAC**: Status kas fisik aktif, antrean bon siap cair (`APPROVED_SS`), total bon gantung ($K_{bon}$), dan status rekening pooling BRI.
    - **SS / SM**: Antrean persetujuan bon (`SUBMITTED`), antrean persetujuan outflow BRI (legacy), status sesi opname butuh verifikasi/sign-off, dan integritas variansi.
- **Recent Activities Feed**:
  - Dibatasi secara optimal ke **5 aktivitas terbaru** untuk menjaga kerapian vertikal dashboard tanpa scroll berlebih.
- **Quick Action Bar**:
  - Shortcut cepat sesuai hak akses (Buat Bon, Mulai Opname, Catat Mutasi BRI).

### 4.3. Voucher List (`/vouchers`)
- **Tabel Data Interaktif**:
  - Kolom: Checkbox Pilihan, No. Voucher, Tanggal Struk, Pemohon, Kategori, Keperluan, Nominal, Status, Aksi (`Detail`, serta tombol cepat `Edit` bagi pemilik bon berstatus `DRAFT`).
  - **Sorting Kolom Interaktif**: Pengurutan instan *ascending* / *descending* pada kolom No. Voucher, Tanggal, Kategori, Nominal, dan Status.
  - Filter: Status, Rentang Tanggal, Kategori, Pemohon.
  - Pencarian Real-Time: Nomor voucher dan keperluan.
  - Pagination: 20 data per halaman dengan link navigasi responsif.
  - **Dual Bulk Action Bar (`DataTableBulkBar`)**:
    - **Bulk Approve (`Setujui Bon Terpilih (N)`)**: Tampil bagi role approver (`SS`, `SAC`, `SM`) ketika baris terpilih mencakup bon berstatus `SUBMITTED` milik pengguna lain. Jika baris `SUBMITTED` yang dicentang seluruhnya milik pengguna sendiri, tampil indikator nonaktif `Milik Sendiri (Anti Self-Approve)`.
    - **Bulk Export Excel (`Export Excel Terpilih (N)`)**: Tampil berdampingan bagi role yang memiliki wewenang ekspor (`SAC`, `SS`, `SM`, `SYSTEM_ADMIN`; disembunyikan untuk `SOA`).

### 4.3.1. Voucher Pending Approval Queue (`/vouchers/pending`)
- Antrean khusus bagi supervisor/kasir/manager untuk meninjau bon yang menunggu persetujuan.
- **Bulk Approve (Persetujuan Massal)**:
  - Checkbox multi-select di header dan setiap baris bon yang berhak disetujui.
  - **Universal Anti Self-Approval Enforcement (Rule 5)**:
    - Berlaku untuk **seluruh role approver (`SAC`, `SS`, `SM`)**: baris bon yang diajukan oleh pengguna yang sedang login otomatis dinonaktifkan (`disabled`) dengan badge penanda `"Milik Sendiri (Perlu Approver Lain)"`.
    - Checkbox "Pilih Semua" hanya mencentang bon yang berhak disetujui (mengecualikan bon milik sendiri).
  - **Floating Bulk Action Bar (`DataTableBulkBar`)**:
    - Bar melayang di bagian bawah layar menampilkan: Jumlah item terpilih, Akumulasi nominal (Rp), Tombol "Setujui X Voucher Sekaligus", dan Tombol Batalkan Pilihan.
    - Konfirmasi tindakan massal melalui `ConfirmDialog` sebelum mutasi dieksekusi secara atomik (`DB::transaction`).

### 4.4. Create & Edit Draft Voucher (`/vouchers/create` & `/vouchers/:id/edit`)
- Form fields:
  - Nominal (Rupiah formatted input, auto-convert to cents)
  - Tanggal Bon / Struk (Date input, defaults to today `YYYY-MM-DD`, allows setting back-dated physical receipt date)
  - Keperluan (text)
  - Kategori (dynamic select dropdown from `PettyCashCategory::forStore()`)
  - Bukti Struk / Kuitansi (`ImageUploader` dengan kompresi WebP $\le$ 250KB untuk foto **atau** unggah dokumen `.pdf` hingga 5 MB, dilengkapi pratinjau)
  - Foto / Dokumen Barang (`ImageUploader` opsional, mendukung foto WebP $\le$ 250KB atau `.pdf` hingga 5 MB)
- **Edit Draft (`/vouchers/:id/edit`)**:
  - Hanya dapat diakses oleh pemohon asli selama status bon masih `DRAFT`.
  - Memuat data awal bon serta pratinjau lampiran yang sudah tersimpan (mendukung pertahankan berkas lama, ganti berkas baru, atau hapus berkas).
  - Pilihan simpan: `"Simpan Perubahan Draft"` (tetap `DRAFT`, log `UPDATE_VOUCHER`) atau `"Simpan & Ajukan Sekarang"` (transisi ke `SUBMITTED`, log `SUBMIT_VOUCHER`).
- **Mandatory Receipt Evidence Guard**:
  - Tombol `"Ajukan"` / `"Simpan & Ajukan Sekarang"` otomatis disabled jika Bukti Struk belum tersedia.
  - Server-side validation via `StoreVoucherRequest` & `UpdateVoucherRequest` mengembalikan error HTTP 422 jika diajukan tanpa bukti struk.
- Submit options (Create): `"Ajukan"` (creates as `SUBMITTED`) or `"Simpan Draft"` (creates as `DRAFT`, bukti struk opsional).
- Cancel: navigate back

### 4.5. Voucher Detail (`/vouchers/:id`)
- Header: voucher number, status badge, dates
- Content: amount, purpose, category (dengan tombol koreksi `Ubah Kategori` sebelum `SETTLED`), requester info
- Attachments: receipt and item evidence (zoomable photo lightbox atau kartu pratinjau `Buka Dokumen PDF` di tab baru untuk berkas `.pdf`)
- Banner Peringatan Anti Self-Approval: ditampilkan secara informatif apabila approver (`SAC`/`SS`/`SM`) membuka bon `SUBMITTED` miliknya sendiri
- Timeline: status & audit history with timestamps and actor names (`CREATE`, `UPDATE_VOUCHER`, `SUBMIT`, `RECALL_VOUCHER`, `RECLASSIFY_CATEGORY`, `APPROVE`, `DISBURSE`, `SETTLE`)
- Action buttons (contextual per role and status):
  - `Edit Draft` / `Ajukan` / `Hapus Draft` (Owner, when `DRAFT`)
  - `Tarik ke Draft` (Owner, when `SUBMITTED` — mengembalikan status ke `DRAFT` via dialog konfirmasi untuk revisi sebelum diproses approver)
  - `Approve` / `Reject` (`SS`/`SAC`/`SM`, when `SUBMITTED` dan **bukan** pemohon sendiri)
  - `Ubah Kategori` (`SS`/`SAC`/`SM`, when `SUBMITTED`, `APPROVED_SS`, atau `DISBURSED` — membuka `ReclassifyCategoryDialog` tanpa mengubah nominal/status; juga tersedia inline pada halaman `/vouchers/settlement` sebelum membuat Rekap KKCL)
  - `Disburse` (`SAC`, when `APPROVED_SS`)
  - `Cancel` (`SAC`/`SM`, when `DISBURSED`)
  - `Confirm Refund` (`SAC`, when `REJECTED_REFUND_PENDING`)

### 4.5.1. Petty Cash Settlement Matrix Workspace (`/vouchers/settlements/:id`)
- Rekapitulasi Pengeluaran Kas Kecil (KKCL) berbasis **Matriks Akuntansi Kolom Kolom (Columnar Matrix)** sesuai standar fisik Toko Gramedia Karawang:
  - **Header Dokumen**:
    - Judul: REKAPITULASI PENGELUARAN KAS KECIL (KKCL)
    - Metadata: Toko / Store Code, Periode Tanggal, No. Dokumen KKCL (`{SEQ}/KKCL/{STORE}/{MONTH}/{YEAR}`), Dibuat oleh (SAC).
  - **Tabel Matriks Kolom**:
    - Kolom Tetap Kiri: No., Tanggal, No. Bon, Uraian Keperluan.
    - Kolom Dinamis Kategori: Kolom 1 s/d Kolom N mewakili kategori aktif (misal: Perlengkapan Toko, Konsumsi, Transport, Fotocopy/Materai, dll.).
    - Sel Nominal: Nilai voucher diletakkan tepat pada perpotongan baris voucher dan kolom kategori yang dipilih.
    - Kolom Total Kanan: Jumlah Rupiah per baris voucher.
  - **Footer Total**:
    - Baris Total per Kategori: $\sum \text{Nominal per Kolom Kategori}$.
    - Grand Total: Total keseluruhan pengeluaran kas kecil periode rekap.
  - **Area Tanda Tangan 3 Pihak**:
    - Dibuat Oleh (SAC), Diperiksa Oleh (SS / Spv Keuangan), Disetujui Oleh (Store Manager).
  - **Action Bar**:
    - Tombol "Cetak Dokumen" &rarr; memicu dialog cetak peramban (`window.print()`) dengan stylesheet khusus **A4 Landscape**.
    - Tombol "Download Excel (.xlsx)" &rarr; mengunduh berkas spreadsheet resmi dengan formula native `=SUM(...)`.

### 4.5.2. Petty Cash Settlements Archive (`/vouchers/settlements`)
- Riwayat seluruh dokumen rekapitulasi KKCL yang pernah diterbitkan.
- Tabel daftar: No. Rekap, Periode, Jumlah Voucher, Total Nominal (Rp), Kasir Pembuat, Tanggal Dibuat, Aksi (Lihat Detail Matriks, Download Excel).
- Filter rentang tanggal dan pencarian nomor rekap.

### 4.6. Active Opname Workspace (`/opname/active`)

- **Top Indicator: Daily Closing Switcher (`<DailyClosingSwitcher>`)**
  - 5 interactive cards showing daily status: `KAS_KECIL`, `KAS_BESAR`, `ACTIVE_SELLING`, `MATERAI`, `GIFT_VOUCHER`.
  - Badges: `NOT_STARTED` (abu-abu), `DRAFT` (biru), `SUBMITTED` (amber), `VERIFIED_SS` (indigo), `APPROVED` (hijau).
  - One-click navigation and instant creation for unstarted sessions.

- **Section 1: Generic Count Grid (`<CountGrid>`)**
  - Dynamically groups items by `item_definition.group_label` (tidak lagi hardcoded terbatas pada Uang Kertas & Logam).
  - Renders physical units cleanly: lembar, keping, pcs.
  - Traversal Numpad Kasir:
    - Tombol <kbd>Enter</kbd> / <kbd>Panah Bawah</kbd> otomatis memindahkan fokus ke input berikutnya dan memilih teks (`select()`).
    - Tombol <kbd>Panah Atas</kbd> memindahkan fokus ke input sebelumnya.
    - Pada baris item terakhir, menekan <kbd>Enter</kbd> otomatis memindahkan fokus ke tombol **Simpan Pecahan**.
  - Autosave dengan debounce 800ms setelah kasir selesai mengetik pecahan.
  - `beforeunload` guard aktif jika status input dirty (`isDenomDirty === true`).

- **Section 2: Sub-Panel KAS_BESAR (`<KasBesarForm>`)** *(Hanya untuk tipe KAS_BESAR)*
  - Register POS Z-Report: No. Mesin Kasir, No. Z-Report, Total Penjualan Tunai Sistem, dan upload foto fisik struk Z-Report.
  - Setoran Bank: No. Slip Setoran Bank, nominal disetor, dan upload foto slip setoran bank.
  - Client-Side Validation: Tombol "Ajukan Verifikasi Saksi" dinonaktifkan jika belum ada minimal 1 data Z-Report atau ada Z-Report yang belum melampirkan foto bukti fisik struk Z-Report.

- **Section 3: Outstanding Vouchers (K_bon) & Mutasi BRI (K_bri)** *(Khusus KAS_KECIL)*
  - Auto-populated list of DISBURSED vouchers.
  - Mutasi Rekening Koran BRI dan alokasi dana non-kas kecil (B2B, Event, Aksel, Anonymous, Custom).
  - Breakdown modal per entitas alokasi.

- **Section 4: Mobile Approval Card (`<MobileApprovalCard>`)** *(Viewport mobile `< lg`)*
  - Ringkasan 1-kolom padat: Total Fisik, Target Baseline, Outstanding Variance.
  - Checkbox `confirm_understanding` dengan area sentuh ramah jempol tangan (touch-target min 48px).
  - Tombol aksi verifikasi SS dan sign-off SM yang mudah dijangkau dengan satu tangan di depan brankas.

- **Section 5: Sticky Live Discrepancy & Action Bar**
  - Floating bottom bar menampilkan metrik aktual, target plafon, dan pemisahan hasil rekonsiliasi menjadi dua indikator mandiri:
    1. **Acuan Target / Plafon** (`Acuan ke 5Jt` untuk Kas Kecil, `Acuan Expected` untuk Kas Besar):
       - Jika surplus atau pas seimbang: bernilai **`Rp 0`** dengan badge **`[Terpenuhi]`** (pokok dana plafon 5 juta sudah tercapai penuh).
       - Jika kurang: bernilai nominal minus (misal **`-Rp 900`** atau **`-Rp 1.813.193`**) dengan badge **`[Kurang Target]`**.
    2. **Selisih Kasir**:
       - Menampilkan deviasi murni fisik kasir:
         - Surplus: **`+Rp X.XXX`** dengan badge **`[Lebih Kas]`** ↗️
         - Seimbang: **`Rp 0`** dengan badge **`[Balanced]`** ⚖️
         - Kurang: **`-Rp X.XXX`** dengan badge **`[Selisih Kurang]`** ↘️
  - Action buttons kontekstual: Simpan Pecahan, Simpan BRI, Ajukan Verifikasi (SAC), Verifikasi Saksi (SS), Sign-Off & Setujui (SM).

### 4.7. Print/Report View (`/opname/:id/report`)
- Clean A4 layout matching Excel BACO format
- No navigation, no buttons (hidden via `@media print`)
- Download buttons: .xlsx, .pdf (visible on screen, hidden on print)
- Ctrl+P compatible

### 4.11. Master Petty Cash Categories Management (`/admin/categories`)
- Workspace pengelolaan master kategori pengeluaran kas kecil toko.
- **Tabel Kategori**:
  - Kolom: Urutan, Kode, Nama Kategori, Deskripsi, Lingkup (Badge: `Global (Pusat)` vs `Kustom Toko`), Status (Switch Toggle: `Aktif` / `Nonaktif`), Aksi (Edit, Toggle).
  - Scope Guard: Pengguna toko (`SAC`/`SM`) hanya dapat mengubah data kategori bertanda `Kustom Toko`. Kategori `Global` berstatus read-only bagi pengguna toko dan hanya dapat diedit/ditoggle oleh `SYSTEM_ADMIN`.
- **Modal Tambah / Edit Kategori**:
  - Field: Nama Kategori, Kode Kategori (auto-slug UPPERCASE), Deskripsi, Urutan Tampilan (Sort Order).
  - Preview real-time bagaimana nama kategori akan muncul di dropdown formulir voucher dan header matriks rekapitulasi.

## 5. Key Interaction Patterns

### Data Table UX & Selective Bulk Action Architecture (`DataTable.tsx`)
Seluruh modul operasional (`Voucher`, `Opname`, `BriFund`, `Users`, `AuditLogs`) menggunakan komponen tabel terstandarisasi dengan spesifikasi interaksi:
1. **Interactive Column Sorting (`DataTableHeaderCell`)**:
   - Kolom yang dapat diurutkan menampilkan indikator visual:
     - Netral: `ArrowUpDown` redup (`opacity-50`).
     - Ascending (A-Z / Terkecil): `ArrowUp` tajam berwarna primer.
     - Descending (Z-A / Terbesar): `ArrowDown` tajam berwarna primer.
   - Terintegrasi dengan URL query parameters (`sort={field}&direction={asc|desc}`) dan whitelist ketat di controller backend.
   - Kolom monospaced angka/nominal memiliki perataan kanan (`align="right"`), dengan ikon sort otomatis berada di posisi yang harmonis.
2. **Visual Ergonomics & Row Scanning (`DataTableRow`)**:
   - **Gentle Zebra Striping**: Baris genap menggunakan `even:bg-muted/20` untuk memandu pandangan mata saat memindai puluhan baris data keuangan.
   - **Active Row Selection**: Baris yang dicentang diberi highlight kontras lembut `bg-primary/10` dan garis aksen tepi kiri `border-l-2 border-l-primary`.
3. **Floating Glassmorphic Bulk Action Bar (`DataTableBulkBar`)**:
   - Muncul otomatis dengan animasi transisi saat minimal 1 item baris dicentang (`selectedCount > 0`).
   - Melayang di tengah bawah layar (*bottom-fixed pill*) dengan efek glassmorphism (`backdrop-blur-md bg-card/95 border shadow-2xl`).
   - Komponen internal:
     - Badge jumlah item terpilih (`{count} item dipilih`).
     - Akumulasi total nilai uang (Rp) dari seluruh baris terpilih jika modul keuangan.
     - Slot tombol aksi kontekstual (misal: "Setujui Bon", "Export Excel Terpilih").
     - Tombol batal / bersihkan pilihan (`X Batal`).
4. **Selective Bulk Action vs Non-Bulk Financial Invariant Matrix**:
   - **Persetujuan Massal (Bulk Approve)**: Diizinkan pada antrean bon kas kecil (`/vouchers/pending`) maupun daftar bon (`/vouchers`) bagi `SS`, `SAC`, dan `SM`, dilindungi penuh oleh **Rule 5 Universal Anti Self-Approval** (tidak ada role yang dapat menyetujui bon miliknya sendiri; diblokir di UI dan ditolak atomik di Action layer).
   - **Ekspor Massal (Bulk Export)**: Diizinkan pada daftar bon kas kecil (`/vouchers`) bagi role berewenang (`SAC`, `SS`, `SM`, `SYSTEM_ADMIN`) berdampingan dengan tombol Bulk Approve untuk mengunduh rekap Excel berdasarkan seleksi checkbox.
   - **DILARANG UNTUK BULK ACTION**:
     - *Cash Opname (`/opname`)*: Setiap sesi fisik wajib diverifikasi dan disetujui satu per satu (Rule 2, 3, 4).
     - *Mutasi Outflow BRI (`/bri-funds/pending`)*: Setiap pengeluaran bank pada antrean pending (legacy) wajib diverifikasi maker-checker secara terpisah dengan pengecekan running balance (Rule 6, 7).
     - *Audit Logs (`/admin/audit-logs`)*: Log bersifat *append-only* dan *strictly immutable* (Rule 10).

### Money Input Component
- Display: `Rp 5.000.000` (formatted with thousand separators)
- Storage: `500000000` (integer cents)
- Input: user types digits, auto-formats as they type
- No decimals (Rupiah only, no sen in daily cash operations)

### ImageUploader Component & Hardened Client-Side Compression (`ImageUploader.tsx` & `image-compressor.ts`)
1. **Opsi Kamera vs File/Galeri (Mobile-Friendly)**:
   - Area dropzone menyediakan 2 tombol aksi interaktif:
     - `[ 📷 Buka Kamera ]`: Menggunakan `capture="environment"` untuk mengaktifkan kamera belakang perangkat mobile secara instan.
     - `[ 📁 Pilih File / Galeri ]`: Menggunakan input file standar tanpa atribut `capture` sehingga perangkat mobile membuka sheet pemilihan sistem (Galeri foto, Media picker, Dokumen/Files) dan desktop membuka file explorer.
   - Mengetuk area kartu atau *drag & drop* mengarahkan ke pemilih berkas secara aman.
2. **Menu Ganti Berkas (`DropdownMenu`)**:
   - Saat foto/berkas telah terunggah, pengguna dapat mengganti foto langsung via menu dropdown ("Ambil Foto Baru" atau "Pilih dari Galeri/Berkas") tanpa harus menghapus terlebih dahulu.
3. **Dukungan Dokumen PDF Opsional (`allowPdf?: boolean`, `maxPdfSizeMB?: number`)**:
   - Pada formulir Bon Kas Kecil (`/vouchers/create` & `/vouchers/:id/edit`), uploader menerima berkas PDF (maksimal 5 MB) selain foto terkompresi untuk mengakomodasi invoice/nota elektronik berformat PDF.
   - Untuk berkas rekening koran bank BRI (`/opname/active`), uploader menerima berkas PDF (maksimal 2 MB) dengan kartu pratinjau dokumen khusus dan tautan untuk membuka PDF di tab baru.
4. **Hardened Client-Side Image Compression**:
   - Dimensi dibatasi maksimal proporsional $1280 \times 1920\text{ px}$.
   - Strict Size Guard ($\le 250\text{ KB}$):
     - Iterasi kualitas Canvas dari 0.85 turun bertahap hingga 0.3.
     - Jika pada kualitas 0.3 ukuran masih $> 250\text{ KB}$, kompresor otomatis melakukan *two-stage dimensional scaling* (skala turun 80% &rarr; 60%) hingga ukuran file wajib $\le 250\text{ KB}$.
   - Fallback Safari iOS: Jika `canvas.toBlob` tidak menghasilkan tipe `image/webp`, file otomatis disimpan sebagai format JPEG terkompresi dengan ekstensi `.jpg` yang valid (mencegah file JPEG yang dinamai `.webp` palsu).


### Denomination Numpad Traversal
- Input numerik besar dengan format font monospaced.
- <kbd>Enter</kbd> / <kbd>Panah Bawah</kbd> &rarr; loncat ke pecahan berikutnya dan langsung `select()`.
- <kbd>Panah Atas</kbd> &rarr; kembali ke pecahan sebelumnya.
- <kbd>Enter</kbd> pada baris pecahan terakhir &rarr; langsung memindahkan fokus ke tombol simpan.
- Debounce 800ms menyimpan otomatis tanpa mengganggu alur ketik kasir.

### Notification Bell
- Bell icon in topbar with unread count badge (red circle)
- Click → dropdown with recent 10 notifications
- Each notification: icon, title, time ago, read/unread indicator
- Click notification → navigate to relevant page
- "Tandai Semua Dibaca" link
- "Lihat Semua" link → full notification page

## 6. Responsive Breakpoints

| Breakpoint | Width | Behavior |
|---|---|---|
| Mobile | < 640px | Single column, stacked layout, hamburger menu |
| Tablet | 640px - 1023px | Sidebar hidden, content adjusts |
| Desktop | ≥ 1024px | Sidebar visible, full layout |
| Wide | ≥ 1440px | Wider content area, more table columns |

## 7. Print Styles

```css
@media print {
  /* Hide non-printable elements */
  nav, .sidebar, .topbar, button, .no-print { display: none !important; }

  /* Reset backgrounds and shadows */
  * { background: white !important; box-shadow: none !important; }

  /* Default A4 Portrait (BACO Cash Opname) */
  @page {
    size: A4 portrait;
    margin: 0.5in;
  }

  /* Specific A4 Landscape for KKCL Columnar Settlement Matrix */
  .settlement-print-landscape {
    @page {
      size: A4 landscape;
      margin: 8mm;
    }
  }

  /* Ensure tables don't break across pages */
  table { page-break-inside: avoid; }
  tr { page-break-inside: avoid; }
}
```

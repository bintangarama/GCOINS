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

### Color Palette (shadcn/ui default theme, customized)
- Background: `hsl(0 0% 100%)` (white)
- Foreground: `hsl(224 71% 4%)` (near-black)
- Primary: `hsl(220 70% 50%)` (professional blue)
- Destructive: `hsl(0 84% 60%)` (red for errors, shortages)
- Success: `hsl(142 71% 45%)` (green for balanced, approved)
- Warning: `hsl(38 92% 50%)` (amber for pending, surplus)
- Muted: `hsl(220 14% 96%)` (light gray backgrounds)
- Border: `hsl(220 13% 91%)`

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

### Desktop Layout (≥ 1024px)

```
┌──────────────────────────────────────────────────────┐
│  Topbar [Logo] [Store Name]     [Notifications 🔔] [User ▾]  │
├──────────┬───────────────────────────────────────────┤
│          │                                           │
│ Sidebar  │              Main Content                 │
│ (fixed)  │                                           │
│          │  ┌─────────────────────────────────────┐   │
│ Dashboard│  │  Page Header                        │   │
│ Vouchers │  │  ├── Title                          │   │
│ Opname   │  │  ├── Breadcrumbs                    │   │
│ BRI Fund │  │  └── Action Buttons                 │   │
│ Admin ▾  │  ├─────────────────────────────────────┤   │
│          │  │                                     │   │
│          │  │  Page Content                       │   │
│          │  │  (tables, forms, cards)              │   │
│          │  │                                     │   │
│          │  └─────────────────────────────────────┘   │
│          │                                           │
└──────────┴───────────────────────────────────────────┘
```

### Mobile Layout (< 1024px)

```
┌──────────────────────────┐
│  Topbar [☰] [Logo] [🔔]  │
├──────────────────────────┤
│                          │
│  Page Header             │
│  ├── Title               │
│  └── Action Buttons      │
├──────────────────────────┤
│                          │
│  Page Content            │
│  (stacked, full-width)   │
│                          │
└──────────────────────────┘

[☰] → Slide-out sidebar (sheet/drawer)
```

### Sidebar Navigation

```
📊 Dashboard
📝 Bon Kas Kecil
   ├── Daftar Bon
   ├── Buat Pengajuan
   ├── Antrean Approval
   └── Settlement
💰 Cash Opname
   ├── Riwayat Sesi
   └── Sesi Aktif
🏦 Mutasi BRI
   ├── Overview Saldo
   ├── Daftar Transaksi
   ├── Catat Mutasi
   └── Antrean Outflow
⚙️ Administrasi
   ├── Manajemen User
   ├── Pengaturan Toko
   ├── Audit Log
   └── Import/Export
```

> Note: Menu items shown/hidden based on user's role permissions.

## 4. Page Specifications

### 4.1. Login Page (`/login`)
- Centered card layout
- Fields: NIK (text), PIN (password, masked)
- "Masuk" button
- Error message on invalid credentials
- No registration link (users are created by admin)

### 4.2. Dashboard (`/dashboard`)
- **Top row**: Summary cards
  - Current cash status (if active opname exists)
  - Pending vouchers count (for approvers)
  - Pending BRI outflows count (for approvers)
  - Last opname date & status
- **Middle**: Recent activity feed (last 10 actions)
- **Bottom**: Quick action buttons based on role

### 4.3. Voucher List (`/vouchers`)
- Data table with columns: No. Voucher, Tanggal, Pemohon, Keperluan, Nominal, Status, Aksi
- Filters: Status dropdown, Date range picker, Category
- Search: voucher number, purpose text
- Pagination: 20 per page
- Status badges with colors
- Click row → navigate to detail

### 4.4. Create Voucher (`/vouchers/create`)
- Form fields:
  - Nominal (Rupiah formatted input, auto-convert to cents)
  - Keperluan (text)
  - Kategori (dynamic select dropdown from `PettyCashCategory::forStore()`)
  - Foto Struk (upload with client-side WebP compression, preview)
  - Foto Barang (upload with client-side WebP compression, preview)
- **Mandatory Receipt Evidence Guard**:
  - Tombol "Ajukan" otomatis disabled jika Foto Struk belum dipilih.
  - Server-side validation via `FormRequest` returns 422 error jika diajukan tanpa foto struk.
- Submit options: "Ajukan" (creates as `SUBMITTED`) or "Simpan Draft" (creates as `DRAFT`, foto struk opsional).
- Cancel: navigate back

### 4.5. Voucher Detail (`/vouchers/:id`)
- Header: voucher number, status badge, dates
- Content: amount, purpose, category, requester info
- Photos: receipt and item photos (clickable to zoom/lightbox)
- Timeline: status history with timestamps and actor names
- Action buttons (contextual per role and status):
  - Approve / Reject (SS/SAC/SM, when SUBMITTED)
  - Disburse (SAC, when APPROVED_SS)
  - Cancel (SAC/SM, when DISBURSED)
  - Confirm Refund (SAC, when REJECTED_REFUND_PENDING)

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
  - Floating bottom bar menampilkan metrik aktual, target plafon, dan status `Outstanding Variance` (`BALANCED` / `SURPLUS` / `SHORTAGE`).
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

### Money Input Component
- Display: `Rp 5.000.000` (formatted with thousand separators)
- Storage: `500000000` (integer cents)
- Input: user types digits, auto-formats as they type
- No decimals (Rupiah only, no sen in daily cash operations)

### Hardened Client-Side Image Compression (`image-compressor.ts`)
1. User clicks upload / captures photo via mobile camera.
2. Dimensi dibatasi maksimal proporsional $1280 \times 1920\text{ px}$.
3. Strict Size Guard ($\le 250\text{ KB}$):
   - Iterasi kualitas Canvas dari 0.85 turun bertahap hingga 0.3.
   - Jika pada kualitas 0.3 ukuran masih $> 250\text{ KB}$, kompresor otomatis melakukan *two-stage dimensional scaling* (skala turun 80% &rarr; 60%) hingga ukuran file wajib $\le 250\text{ KB}$.
4. Fallback Safari iOS: Jika `canvas.toBlob` tidak menghasilkan tipe `image/webp`, file otomatis disimpan sebagai format JPEG terkompresi dengan ekstensi `.jpg` yang valid (mencegah file JPEG yang dinamai `.webp` palsu).

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

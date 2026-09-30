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
  - Kategori (select dropdown)
  - Foto Struk (upload with client-side WebP compression, preview)
  - Foto Barang (upload with client-side WebP compression, preview)
- Submit button: "Ajukan" (creates as SUBMITTED) or "Simpan Draft"
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

### 4.6. Active Opname Session (`/opname/active`)
- **Section 1: Denomination Input**
  - Table: 11 rows (or per item definitions)
  - Columns: No, Group, Pecahan, Jumlah (editable input), Subtotal (auto-calc)
  - Total K_fisik at bottom
  - Numpad-friendly: Enter/Tab moves to next row

- **Section 2: Outstanding Vouchers (K_bon)**
  - Auto-populated list of DISBURSED vouchers
  - Columns: No. Voucher, Pemohon, Keperluan, Nominal
  - Total K_bon at bottom
  - Read-only (informational)

- **Section 3: BRI Reconciliation (K_bri)**
  - Input: Saldo Mutasi BRI (manual from bank statement)
  - Auto-calculated rows: B2B, Event, Aksel, Anonymous, Custom
  - Each row has breakdown button `[👁️ Detail]` → modal with entity list
  - Upload: bank statement photo
  - Net K_bri at bottom

- **Section 4: Variance Summary (sticky/fixed at bottom)**
  - Total Actual = K_fisik + K_bon + K_bri
  - Target = Imprest + V_prev
  - **V_current = Total - Target** (large, prominent)
  - Status badge: BALANCED (green) / SURPLUS (blue) / SHORTAGE (red)
  - Submit button: "Ajukan Verifikasi Saksi"

### 4.7. Print/Report View (`/opname/:id/report`)
- Clean A4 layout matching Excel BACO format
- No navigation, no buttons (hidden via `@media print`)
- Download buttons: .xlsx, .pdf (visible on screen, hidden on print)
- Ctrl+P compatible

## 5. Key Interaction Patterns

### Money Input Component
- Display: `Rp 5.000.000` (formatted with thousand separators)
- Storage: `500000000` (integer cents)
- Input: user types digits, auto-formats as they type
- No decimals (Rupiah only, no sen in daily cash operations)

### Image Upload with Compression
1. User clicks upload / takes photo (mobile camera)
2. Client-side: read file → Canvas API → resize (max 1280×1920) → WebP 75%
3. Show preview with compressed size indicator
4. On form submit: upload compressed WebP to server

### Denomination Numpad Input
- Large input fields for easy numpad entry
- Enter key → move to next denomination row
- Tab key → move to next denomination row
- Auto-calculate subtotal (count × nominal) and grand total in real-time
- Visual highlight on currently active row

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

  /* A4 page setup */
  @page {
    size: A4 portrait;
    margin: 0.5in;
  }

  /* Ensure tables don't break across pages */
  table { page-break-inside: avoid; }
  tr { page-break-inside: avoid; }
}
```

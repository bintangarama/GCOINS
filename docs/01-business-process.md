# 01 — Business Process

## 1. Imprest Fund System (Dana Tetap)

Gramedia retail stores operate a **fixed petty cash fund** (Imprest Fund System). The fund ceiling is **configurable per store** (default: Rp 5.000.000,00).

At any point in time, the total value of all petty cash components must equal the imprest fund ceiling (adjusted by any carried-forward variance from the previous period).

## 2. Three Pockets Model (Model 3 Kantong)

The petty cash fund is distributed across three financial "pockets":

```
┌────────────────────────────────────────────────────────────────────────┐
│                   IMPREST FUND CEILING (configurable)                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│    POCKET 1      │       │    POCKET 2      │       │    POCKET 3      │
│  Physical Cash   │       │   Outstanding    │       │  Petty Cash      │
│    (K_fisik)     │       │   Vouchers       │       │  Portion in BRI  │
│                  │       │    (K_bon)       │       │     (K_bri)      │
│                  │       │                  │       │                  │
│ Bills & coins in │       │ Sum of DISBURSED │       │ Net BRI balance  │
│ the cashier safe │       │ vouchers not yet │       │ after deducting  │
│ counted via 11   │       │ reimbursed       │       │ non-petty-cash   │
│ denominations    │       │                  │       │ fund allocations │
└──────────────────┘       └──────────────────┘       └──────────────────┘
```

### Pocket 1 — Physical Cash in Safe (K_fisik)

Actual currency (bills and coins) stored in the cashier's safe. Counted by tallying 11 standard Rupiah denominations (configurable per opname type).

```
K_fisik = Σ (count_j × nominal_j) for j = 1..11
```

### Pocket 2 — Outstanding Vouchers (K_bon)

Accumulated value of petty cash vouchers that have been disbursed (cash handed to requester) but not yet reimbursed by head office.

```
K_bon = Σ voucher.amount WHERE voucher.status = 'DISBURSED'
```

### Pocket 3 — Petty Cash Portion in BRI Bank (K_bri)

The store's BRI operational bank account is a **pooling account** containing multiple fund types. The petty cash portion is isolated by subtracting all non-petty-cash allocations:

```
K_bri = BRI_mutation_balance - (S_b2b + S_event + S_aksel + S_anonymous + Σ S_custom)
```

Where each `S_category` is the **running balance** of that fund category, calculated from incremental BRI fund postings (INFLOW - OUTFLOW).

## 3. BRI Pooling Account — Sub-Ledger Architecture

The BRI bank account pools multiple fund types:

| Fund Category | Code | Description |
|---|---|---|
| Kas Operasional | (petty cash) | Isolated via subtraction |
| B2B Transactions | `B2B` | School/corporate book sales |
| Events & Exhibitions | `EVENT` | Mall bazaars, book fairs |
| Active Selling | `AKSEL` | Mobile selling program |
| Anonymous Funds | `ANONYMOUS` | Unidentified incoming transfers |
| Custom Allocations | `CUSTOM` | Ad-hoc items (booth rental, etc.) |

### Sub-Ledger Posting Rules

1. **INFLOW** (incoming fund): Status immediately `APPROVED`. Running balance increases.
2. **OUTFLOW** (fund withdrawal): Status `PENDING_SS`. Running balance does **not** decrease until approved by SS/SM (Dual Control).
3. **Zero-Deficit Guard**: Outflow amount must not exceed the entity's current running balance.
4. **Running Balance Formula**:
   ```
   S_entity = Σ INFLOW_approved - Σ OUTFLOW_approved
   S_category = Σ S_entity for all entities in category
   ```

### Auto-Population to Cash Opname

When a cash opname session is opened:
- System automatically calculates aggregate running balances from all `APPROVED` postings
- Values are injected into the BRI reconciliation form
- Manual sync button available as fallback
- Breakdown modal shows per-entity detail

## 4. Outstanding Variance Engine & Resolution Ledger

### Mathematical Model (Anti-Oscillation)

Model rekonsiliasi G-COINS menggunakan model akuntansi presisi berbasis buku besar resolusi:

```
1. RawDiscrepancy      = Total_Actual - Target_Baseline
2. CumulativeResolved  = Σ (amount WHERE resolution.status = 'APPROVED')
3. OutstandingVariance = RawDiscrepancy + CumulativeResolved
```

Dimana:
- **`Total_Actual`**: Total nilai aktual yang dihitung (sesuai mode rekonsiliasi tipe opname).
- **`Target_Baseline`**: Plafon dana tetap (imprest fund) atau saldo harapan kasir.
- **`RawDiscrepancy`**: Selisih mentah sebelum resolusi audit disahkan.
- **`CumulativeResolved`**: Akumulasi nilai tindakan penyelesaian yang telah disetujui resmi.
- **`OutstandingVariance`**: Nilai selisih bersih yang belum terselesaikan dan menjadi dasar status audit.

### Variance Status

Status opname ditentukan secara langsung oleh `OutstandingVariance`:

| Outstanding Variance | Status | Arti Akuntansi |
|---|---|---|
| = 0 | `BALANCED` | Kas fisik dan administrasi seimbang sempurna |
| > 0 | `SURPLUS` | Kelebihan kas fisik terhadap catatan administrasi |
| < 0 | `SHORTAGE` | Kekurangan kas fisik terhadap catatan administrasi |

### Resolution Ledger Lifecycle

Jika terjadi selisih (`SURPLUS` atau `SHORTAGE`), selisih dicatat dan diselesaikan melalui entitas `variance_resolutions`:

1. **Jenis Resolusi (`kind`)**:
   - `REPLACED`: Kasir mengganti kekurangan uang tunai ke dalam brankas.
   - `WRITE_OFF`: Penghapusan selisih atas persetujuan pimpinan (toleransi selisih kasir).
   - `FOUND`: Penemuan uang atau struk bukti transaksi yang sebelumnya tertinggal/terselip.
2. **Ambang Batas Wewenang Approval Write-Off**:
   - Write-off $\le \text{Rp } 1.000.000$: Dapat disetujui oleh Store Supervisor (SS) atau Store Manager (SM).
   - Write-off $> \text{Rp } 1.000.000$: **Wajib disetujui oleh Store Manager (SM)**.
3. Setelah resolusi disetujui (`status = APPROVED`), nilai `amount_cents` langsung diakumulasikan ke `cumulative_resolved_cents`, menetralkan `OutstandingVariance`.

## 5. Five Opname Types (Fully Implemented Engine)

Sistem G-COINS mendukung 5 tipe cash count harian secara polimorfik tanpa skema database terfragmentasi:

| Tipe | Kode Enum | Dokumen | Strategi Reconciler | Komponen yang Dihitung |
|---|---|---|---|---|
| Kas Kecil (Imprest) | `KAS_KECIL` | KKCL | `ThreePocketsReconciler` | Kantong 1 (Kas Fisik) + Kantong 2 (Bon Gantung) + Kantong 3 (Net BRI) |
| Kas Besar (Turnover) | `KAS_BESAR` | KBSR | `CashFlowReconciler` | Fisik Brankas vs. (Saldo Awal + Register POS Z-Report - Setoran Bank) |
| Kas Bazar / Event | `ACTIVE_SELLING` | AKSL | `ConsignmentReconciler` | Kas Fisik Bazar vs. (Modal Awal + Penjualan Tunai - Setoran Kasir) |
| Bea Materai Toko | `MATERAI` | MTR | `StockCountReconciler` | Stok Fisik Materai (keping/lembar) vs. Saldo Buku Materai Toko |
| Gift Voucher Gramedia | `GIFT_VOUCHER` | GVCH | `StockCountReconciler` | Stok Fisik Lembar Voucher Gramedia vs. Saldo Buku Voucher Toko |

### Karakteristik Bersama Semua Tipe:
- Menggunakan siklus workflow yang sama: `DRAFT` → `SUBMITTED` → `VERIFIED_SS` → `APPROVED`.
- Dual control penandatanganan: Kasir (SAC) → Saksi Fisik (SS) → Persetujuan Final (SM).
- `CountGrid` generik dengan numpad traversal, autosave 800ms, dan dynamic item grouping.
- Kunci permanen tidak dapat diubah setelah approval (`Rule 4: Immutable Snapshot`).
- Ekspor Berita Acara (BACO) Excel & PDF cetak.

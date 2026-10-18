# 05 — Business Rules (Non-Negotiable Invariants)

> These rules are **absolute** and must NEVER be bypassed, regardless of UI state, API call, or edge case. Every rule must be enforced at the **service/action layer** (not just UI validation).

---

## Rule 1: Financial Precision — No Floating Point

**All monetary values MUST be stored as INTEGER cents (smallest unit).**

```
Storage:  5000000 (INTEGER) = Rp 5.000.000,00
Display:  amount / 100 → formatted with thousand separators

NEVER use FLOAT, DOUBLE, or REAL for money.
```

- Calculation: all arithmetic done on integers
- Display: divide by 100 only at presentation layer
- Input: user enters Rupiah, system converts to cents before storage

## Rule 2: Outstanding Variance & Resolution Ledger Formula

```
Raw_Discrepancy      = Total_Actual - Target_Baseline
Cumulative_Resolved  = Σ (resolution.amount_cents WHERE status = 'APPROVED')
Outstanding_Variance = Raw_Discrepancy + Cumulative_Resolved
```

Dimana:
- `Total_Actual`: Nilai aktual terhitung (pada KAS_KECIL: $K_{\text{fisik}} + K_{\text{bon}} + K_{\text{bri}}$).
- `Target_Baseline`: Plafon dana tetap / expected cash target.
- `Raw_Discrepancy`: Selisih mentah sebelum resolusi disahkan.
- `Cumulative_Resolved`: Total resolusi selisih yang disetujui (REPLACED / WRITE_OFF / FOUND).
- `Outstanding_Variance`: Selisih riil yang belum diselesaikan dan menentukan status `BALANCED` (0), `SURPLUS` (> 0), atau `SHORTAGE` (< 0).

**Menghilangkan bug osilasi**: Model ini mencegah selisih hilang semu pada sesi genap jika kasir belum mengganti uang tunai.

## Rule 3: Carry-Forward Chain

- New opname session MUST read V_prev from the most recent `APPROVED` session of the **same opname type** in the **same store**
- If no previous approved session exists: V_prev = 0
- Once a session is `APPROVED`, Outstanding_Variance is **permanently locked** and recorded in the audit snapshot
- The chain must NEVER break — there must be no orphaned or skipped sessions

**Atomicity**: Session creation must be atomic (database transaction) with SQLite partial unique index to prevent double active sessions per store per date.

## Rule 4: Immutable Snapshot on Approval

When SM executes sign-off (status → `APPROVED`):

1. All numerical values are **permanently frozen**:
   - K_fisik, K_bon, K_bri
   - Raw_Discrepancy, Cumulative_Resolved, Outstanding_Variance
   - All denomination counts and subtotals
   - BRI sub-ledger snapshot values
   - Imprest fund / expected target amount at time of approval

2. **No role** (including SYSTEM_ADMIN) can modify these values after approval

3. Implementation: check status in every update operation. If `APPROVED`, return error `SESSION_LOCKED`.

## Rule 5: Anti Self-Approval

```
IF voucher.requester_id == current_user.id
   AND current_user.role == 'SAC'
THEN REJECT with error code FORBIDDEN_SELF_APPROVAL
```

SAC can approve vouchers from others. SAC cannot approve their own vouchers. This rule prevents embezzlement.

## Rule 6: Tiered Dual Control — BRI Outflow Approval

```
IF bri_posting.type == 'OUTFLOW':
   CANNOT be approved by the user who created it (Anti-Maker-Checker)
   IF amount <= Rp 500.000:
      CAN be approved by SS or SM
   ELSE (amount > Rp 500.000):
      MUST be approved by SM
```

This ensures high-value bank withdrawals undergo top-level store manager scrutiny.

## Rule 7: Zero-Deficit Guard (Anti-Minus)

```
IF bri_posting.type == 'OUTFLOW'
   AND bri_posting.amount > entity_running_balance
THEN REJECT with error code INSUFFICIENT_RUNNING_BALANCE
```

No outflow posting can cause an entity's running balance to go negative. Check must happen at creation time AND at approval time (balance may have changed between creation and approval).

## Rule 8: Complete Item Definitions

Every opname session MUST have count records for ALL items defined for that opname type in that store.

- If a session has fewer item count records than item definitions: auto-heal by creating missing records with count = 0
- If item definitions change after a session is approved: the approved session retains its original snapshot (immutable)
- New sessions use the current item definitions at time of creation

## Rule 9: Valid State Transitions Only

### Voucher State Machine
```
DRAFT → SUBMITTED → APPROVED_SS → DISBURSED → SETTLED
                                  ↘ REJECTED_REFUND_PENDING → REFUNDED
       ↘ REJECTED
```

Any transition not shown above must be **rejected** with error `VOUCHER_INVALID_STATE`.

### Opname Session State Machine
```
DRAFT → SUBMITTED → VERIFIED_SS → APPROVED
                   ↘ DRAFT (reject by SS)
                                  ↘ DRAFT (reject by SM)
```

### BRI Fund Posting State Machine
```
INFLOW  → APPROVED (immediate)
OUTFLOW → PENDING_SS → APPROVED
                      ↘ REJECTED
```

## Rule 10: Audit Trail for All Financial Changes

Every status change on:
- `petty_cash_vouchers`
- `cash_opname_sessions`
- `bri_fund_postings`

MUST generate an `audit_log` entry with:
- Actor ID (who did it)
- Old values (JSON snapshot before change)
- New values (JSON snapshot after change)
- Timestamp
- IP address

No financial state change may occur without an audit log entry.

## Rule 11: Store Data Isolation

- Every query for financial data MUST be scoped by `store_id`
- A user MUST NOT be able to view or modify data from another store
- SYSTEM_ADMIN can view cross-store data but CANNOT modify financial data
- This is enforced via Eloquent Global Scope on all models with `store_id`

## Rule 12: Document Number Uniqueness

- Voucher numbers: `{SEQ}/{TYPE_CODE}/{STORE_CODE}/{ROMAN_MONTH}/{YEAR}`
- Opname session numbers: `{SEQ}/{TYPE_CODE}/{STORE_CODE}/{ROMAN_MONTH}/{YEAR}`
- Sequential counter resets per month per store per type
- UNIQUE constraint in database prevents duplicates
- Generation must be atomic (transaction + lock) to prevent collisions under concurrent access

## Rule 13: Segregation of Duties (SoD) & Anti-Escalation Safeguard

1. **Role Assignment Hierarchy**:
   - Petugas kasir (SAC) DILARANG membuat atau mengubah user dengan role $\ge \text{SS}$ (`SS`, `SM`, `SYSTEM_ADMIN`).
   - Penugasan role supervisor ke atas hanya dapat dilakukan oleh Store Manager (SM) atau `SYSTEM_ADMIN`.
2. **Anti Self-Role Escalation**:
   - Pengguna DILARANG mengubah level rolenya sendiri.
3. **PIN Reset Isolation**:
   - SAC DILARANG me-reset PIN milik user dengan role `SS`, `SM`, atau `SYSTEM_ADMIN`.
   - Panjang PIN minimal 6 digit numerik dan tidak boleh di-echo dalam plain text.

## Rule 14: Polymorphic Cash Opname & Physical Audit Evidence

1. **5 Polymorphic Cash Types**:
   Sistem mendukung 5 tipe cash count harian: `KAS_KECIL`, `KAS_BESAR`, `ACTIVE_SELLING`, `MATERAI`, dan `GIFT_VOUCHER`.
2. **Z-Report Physical Proof Guard (KAS_BESAR)**:
   - Sesi opname bertipe `KAS_BESAR` wajib memiliki minimal 1 baris referensi Register POS (Z-Report).
   - Seluruh baris referensi Z-Report wajib melampirkan foto fisik struk Z-Report asli (`proof_attachment_url != null`).
   - Tombol pengajuan verifikasi (`SUBMITTED`) **wajib dinonaktifkan di sisi klien dan ditolak di sisi server** jika bukti fisik Z-Report belum terlampir lengkap.
3. **Strict Client Image Compression**:
   - Berkas foto bukti fisik wajib dikompresi di sisi browser maksimal $1280 \times 1920\text{ px}$ dan ukuran akhir $\le 250\text{ KB}$ sebelum diunggah ke server.

## Rule 15: Mandatory Receipt Evidence Guard on Voucher Submission

1. **Submission Guard (HTTP 422)**:
   - Saat mengajukan voucher untuk ditinjau (`is_submit: true` atau transisi ke `SUBMITTED`), **foto bukti fisik struk/kuitansi (`receipt_image`) WAJIB dilampirkan**.
   - Validasi sisi server (`CreateVoucherRequest` & Action layer) wajib mengembalikan HTTP 422 `ValidationException` dengan pesan jelas: *"Foto bukti fisik bon/kuitansi wajib dilampirkan sebelum voucher diajukan."*
   - Dilarang melempar `InvalidArgumentException` tanpa penanganan yang memicu HTTP 500 Unhandled Exception.
2. **Client-Side Submit Disabled**:
   - Tombol "Ajukan Bon" pada formulir wajib otomatis dinonaktifkan (`disabled`) jika berkas foto struk belum dipilih/diunggah.
3. **Draft Exemption**:
   - Penyimpanan draf awal (`is_submit: false` / status `DRAFT`) diperbolehkan tanpa foto struk untuk memfasilitasi pencatatan cepat di lantai toko sebelum nota difoto.
4. **Historical Import Exemption & Approval Attribution**:
   - Impor voucher massal melalui spreadsheet (.xlsx) diizinkan tanpa berkas foto struk (`receipt_image_url = null`) guna mendukung migrasi data lampau/tutup buku toko. Bukti fisik kertas tetap diarsipkan secara fisik di ordner toko sesuai kaidah audit.
   - Pilihan status pada berkas impor terbatas pada `SETTLED` (tutup buku rekapitulasi, keluar dari $K_{bon}$) dan `DISBURSED` (bon cair gantung, masuk $K_{bon}$ kas opname).
   - Otorisasi persetujuan dan pencairan (`approved_by_id`, `disbursed_by_id`) otomatis dicatat atas nama aktor yang mengeksekusi commit (SM atau SAC), dengan tanggal persetujuan disamakan dengan tanggal transaksi bon.

## Rule 16: Columnar Matrix Settlement & Scope Governance

1. **Nomor Dokumen Rekapitulasi Kas Kecil (KKCL)**:
   - Format: `{SEQ}/KKCL/{STORE_CODE}/{ROMAN_MONTH}/{YEAR}` (Contoh: `001/KKCL/TG-001/X/2026`).
   - Penomoran bersifat atomik berbasis transaksi database dan reset setiap pergantian bulan kalender per toko.
2. **One-Click Instant Settlement by SAC**:
   - Alur settlement rekapitulasi diselesaikan langsung saat dibuat oleh SAC (Status langsung `SETTLED`).
   - Tidak memerlukan alur multi-step approval tambahan di level toko karena SAC memegang tanggung jawab fisik kasir.
3. **Anti Double-Settlement Locking**:
   - Seluruh voucher berstatus `DISBURSED` yang dipilih diikat secara permanen ke `settlement_id`.
   - Status voucher seketika beralih ke `SETTLED` dan tidak dapat diikutsertakan pada rekapitulasi lain.
4. **Dual-Scope Category Governance**:
   - Kategori Kas Kecil beroperasi dalam 2 skop: **Global** (`store_id = NULL`) dan **Store-Specific** (`store_id = current_store_id`).
   - Dropdown formulir voucher dan matriks rekapitulasi menggabungkan seluruh kategori global aktif dan kategori kustom aktif milik toko pemohon (`scopeForStore`).
   - Pengguna toko dilarang memodifikasi atau menonaktifkan kategori global.
5. **Columnar Accounting Matrix Invariant**:
   - Rekapitulasi menyajikan pivot matriks: setiap voucher dipetakan ke 1 kolom kategori yang sesuai.
   - Total per baris voucher = jumlah kolom kategori.
   - Total per kolom kategori = akumulasi voucher pada kategori tersebut.
   - Grand Total = $\sum \text{Total Kategori} = \sum \text{Total Baris Voucher}$.



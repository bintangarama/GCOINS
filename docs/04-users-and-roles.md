# 04 — Users & Roles

## 1. Role Definitions

### SYSTEM_ADMIN — System Administrator
- **Scope**: Global (cross-store)
- **Purpose**: Technical/IT role for system management
- **NOT a business role** — cannot perform financial operations

### SM — Store Manager
- **Scope**: Per-store
- **Purpose**: Top-level store authority. Final sign-off on cash opname, manages store users.

### SAC — Staff Administrative Clerk
- **Scope**: Per-store
- **Purpose**: Cashier and financial administrator. Holds safe keys, disburses cash, records BRI mutations, inputs opname data.

### SS — Store Supervisor
- **Scope**: Per-store
- **Purpose**: Operations supervisor. Approves vouchers, witnesses physical cash counting, approves legacy BRI outflows.

### SOA — Store Operation Associate
- **Scope**: Per-store
- **Purpose**: Floor staff across departments. Can only submit petty cash voucher requests.

## 2. Role Hierarchy

```
SYSTEM_ADMIN (Global)
    └── Can create stores and assign initial SM

SM (Per-store, top tier)
    ├── Final sign-off on opname sessions
    ├── Approve/reject vouchers and legacy BRI outflows
    └── Manage users within their store

SAC (Per-store, financial operator)
    ├── Open and operate opname sessions
    ├── Disburse cash for approved vouchers
    ├── Record BRI fund postings (instant approved under operational control)
    └── Generate reports

SS (Per-store, operational supervisor)
    ├── Approve/reject voucher requests
    ├── Witness physical cash counting
    └── Approve/reject legacy BRI outflows

SOA (Per-store, basic)
    └── Submit petty cash voucher requests only
```

## 3. Permission Matrix

### Authentication & Account Management

| Action | SOA | SS | SAC | SM | SYSADMIN |
|---|:---:|:---:|:---:|:---:|:---:|
| Login via NIK + PIN | ✅ | ✅ | ✅ | ✅ | ✅ |
| Change own PIN | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reset other user's PIN (role SOA / SAC) | ❌ | ❌ | ✅ | ✅ | ✅ |
| Reset PIN for user with role ≥ SS | ❌ | ❌ | ❌ | ✅ | ✅ |
| Create user (role SOA / SAC) | ❌ | ❌ | ✅ | ✅ | ✅ |
| Create user (role ≥ SS: SS, SM, SYSADMIN) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Change user role (role ≥ SS) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Self-role modification | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create new store | ❌ | ❌ | ❌ | ❌ | ✅ |
| Configure opname types/items | ❌ | ❌ | ❌ | ❌ | ✅ |

### Voucher Bon Kas Kecil & Settlement Rekap (KKCL)

| Action | SOA | SS | SAC | SM | SYSADMIN |
|---|:---:|:---:|:---:|:---:|:---:|
| Create draft & upload photos | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete own draft (soft delete) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Submit for review (foto struk wajib) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Approve voucher | ❌ | ✅ | ✅* | ✅ | ❌ |
| Reject voucher (reason required) | ❌ | ✅ | ✅ | ✅ | ❌ |
| Disburse cash (DISBURSED) | ❌ | ❌ | ✅ | ❌ | ❌ |
| Generate & Settle Rekap KKCL (SETTLED) | ❌ | ❌ | ✅ | ❌ | ❌ |
| View Settlement Matrix & Archive | ❌ | ✅ | ✅ | ✅ | ❌ |
| Print KKCL A4 Landscape & Export Excel | ❌ | ✅ | ✅ | ✅ | ❌ |
| Cancel post-disbursement | ❌ | ❌ | ✅ | ✅ | ❌ |
| Confirm refund (REFUNDED) | ❌ | ❌ | ✅ | ❌ | ❌ |

### Master Kategori Kas Kecil

| Action | SOA | SS | SAC | SM | SYSADMIN |
|---|:---:|:---:|:---:|:---:|:---:|
| View active categories (dropdowns) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage Master Categories Index | ❌ | ❌ | ✅ | ✅ | ✅ |
| Create/Edit Store-Specific Category | ❌ | ❌ | ✅ | ✅ | ❌ |
| Toggle Store-Specific Category Status | ❌ | ❌ | ✅ | ✅ | ❌ |
| Create/Edit Global Category | ❌ | ❌ | ❌ | ❌ | ✅ |
| Toggle Global Category Status | ❌ | ❌ | ❌ | ❌ | ✅ |

### Cash Opname Session & Resolution Ledger

| Action | SOA | SS | SAC | SM | SYSADMIN |
|---|:---:|:---:|:---:|:---:|:---:|
| Open new opname session (5 Types) | ❌ | ❌ | ✅ | ❌ | ❌ |
| Input/edit counts & POS Z-Report | ❌ | ❌ | ✅ | ❌ | ❌ |
| Input BRI mutation & sub-ledger | ❌ | ❌ | ✅ | ❌ | ❌ |
| Submit to supervisor | ❌ | ❌ | ✅ | ❌ | ❌ |
| Verify physical safe (VERIFIED_SS) | ❌ | ✅ | ❌ | ❌ | ❌ |
| Reject back to draft (SS) | ❌ | ✅ | ❌ | ❌ | ❌ |
| Final sign-off (APPROVED) | ❌ | ❌ | ❌ | ✅ | ❌ |
| Reject session (SM) | ❌ | ❌ | ❌ | ✅ | ❌ |
| Create Variance Resolution | ❌ | ❌ | ✅ | ✅ | ❌ |
| Approve Resolution (≤ Rp 1.000.000) | ❌ | ✅ | ❌ | ✅ | ❌ |
| Approve Write-Off (> Rp 1.000.000) | ❌ | ❌ | ❌ | ✅ | ❌ |

### BRI Fund Postings & Outflow Management

| Action | SOA | SS | SAC | SM | SYSADMIN |
|---|:---:|:---:|:---:|:---:|:---:|
| Record INFLOW + proof (Instant APPROVED) | ❌ | ✅ | ✅ | ❌ | ❌ |
| Record OUTFLOW + proof (Instant APPROVED under SAC control) | ❌ | ✅ | ✅ | ❌ | ❌ |
| Approve Legacy OUTFLOW ≤ Rp 500.000 | ❌ | ✅ | ❌** | ✅ | ❌ |
| Approve Legacy OUTFLOW > Rp 500.000 | ❌ | ❌ | ❌** | ✅ | ❌ |
| Reject Legacy OUTFLOW | ❌ | ✅ | ❌ | ✅ | ❌ |
| View posting history & balances | ❌ | ✅ | ✅ | ✅ | ❌ |

### Reports & Admin

| Action | SOA | SS | SAC | SM | SYSADMIN |
|---|:---:|:---:|:---:|:---:|:---:|
| Download BACO Excel (.xlsx) | ❌ | ✅ | ✅ | ✅ | ❌ |
| Download voucher recap (incl. KKCL col) | ❌ | ✅ | ✅ | ✅ | ❌ |
| Download settlement matrix Excel | ❌ | ✅ | ✅ | ✅ | ❌ |
| Print-friendly A4 view (BACO & KKCL) | ❌ | ✅ | ✅ | ✅ | ❌ |
| View audit logs | ❌ | ❌ | ✅ | ✅ | ✅ |
| Import/Export data (vouchers, cats, etc.)| ❌ | ❌ | ✅ | ✅ | ✅ |

## 4. Integrity & Security Rules (SoD)

### Rule 1: Anti Self-Approval (*)
SAC can approve vouchers submitted by **other** users (SOA/SS). However, if SAC submits a voucher for themselves (`requester_id == current_user.id && current_user.role == SAC`), the system **strictly prohibits self-approval**. That voucher must be approved by SS or SM.

### Rule 2: SAC Operational Control & Tiered Dual Control on Legacy Outflows (**)
Sesuai kebutuhan operasional kasir toko (analogi dengan Rule 16 pada *Voucher Settlement*), SAC memegang kendali operasional penuh atas fisik kasir dan rekening pooling BRI toko. Mutasi penarikan dana (OUTFLOW) langsung berstatus `APPROVED` seketika saat dicatat oleh SAC dengan penegakan ketat **Rule 7 (Zero-Deficit Guard)** guna mencegah saldo negatif.

Untuk mutasi berstatus `PENDING_SS` (legacy/riwayat lampau), persetujuan tetap tunduk pada aturan Tiered Dual Control:
- **Nominal $\le \text{Rp } 500.000$**: Dapat disetujui oleh Store Supervisor (SS) atau Store Manager (SM).
- **Nominal $> \text{Rp } 500.000$**: **Wajib disetujui oleh Store Manager (SM)**.
- **Anti Self-Approval**: Pembuat mutasi DILARANG menyetujui mutasi `PENDING_SS` buatannya sendiri.

### Rule 3: Segregation of Duties (SoD) pada User Management
1. **Pencegahan Privilege Escalation**:
   - SAC DILARANG membuat atau mengedit user dengan role `SS`, `SM`, atau `SYSTEM_ADMIN`.
   - Hanya Store Manager (SM) dan `SYSTEM_ADMIN` yang berwenang menugaskan role $\ge \text{SS}$.
2. **Anti Self-Role Escalation**:
   - User DILARANG mengubah role-nya sendiri pada permintaan update profile/user.
3. **Pembatasan Reset PIN**:
   - SAC DILARANG me-reset PIN milik user dengan role `SS`, `SM`, atau `SYSTEM_ADMIN`.
   - User tidak diperbolehkan me-reset PIN akunnya sendiri melalui endpoint reset (wajib menggunakan alur ubah PIN dengan verifikasi PIN lama).
   - Panjang PIN minimal 6 digit numerik.

### Rule 4: Store Isolation & Multi-Tenancy Binding
- Users belong to exactly **one** store (`users.store_id` → `stores.id`).
- All queries automatically scoped by `store_id` via Eloquent Global Scope (`HasStoreScope`).
- SYSTEM_ADMIN can view cross-store data but cannot perform financial business operations.
- Cross-tenant data leakage dicegah di level database dan authorization policy.

### Rule 5: Dual-Scope Category Protection & Settlement Finality
1. **Isolasi Master Kategori Global vs Toko**:
   - Kategori Global (`store_id = NULL`) hanya boleh dikelola (create/update/toggle) oleh `SYSTEM_ADMIN`. Staf toko (`SAC`/`SM`) DILARANG mengubah nama, kode, atau status keaktifan kategori global.
   - Kategori Khusus Toko (`store_id != NULL`) hanya boleh dibuat dan dikelola oleh `SAC` atau `SM` pada toko yang bersangkutan.
2. **Finalitas Rekapitulasi (KKCL Lock)**:
   - Voucher berstatus `DISBURSED` yang telah diikat ke dalam nomor rekapitulasi `PettyCashSettlement` seketika bertransisi menjadi `SETTLED`.
   - Voucher berstatus `SETTLED` yang telah memiliki `settlement_id` tidak dapat dimasukkan kembali ke rekapitulasi lain (*anti double-claim/double-settle*).

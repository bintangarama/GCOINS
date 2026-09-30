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
- **Purpose**: Operations supervisor. Approves vouchers, witnesses physical cash counting, approves BRI outflows.

### SOA — Store Operation Associate
- **Scope**: Per-store
- **Purpose**: Floor staff across departments. Can only submit petty cash voucher requests.

## 2. Role Hierarchy

```
SYSTEM_ADMIN (Global)
    └── Can create stores and assign initial SM

SM (Per-store, top tier)
    ├── Final sign-off on opname sessions
    ├── Approve/reject vouchers and BRI outflows
    └── Manage users within their store

SAC (Per-store, financial operator)
    ├── Open and operate opname sessions
    ├── Disburse cash for approved vouchers
    ├── Record BRI fund postings
    └── Generate reports

SS (Per-store, operational supervisor)
    ├── Approve/reject voucher requests
    ├── Witness physical cash counting
    └── Approve/reject BRI outflows

SOA (Per-store, basic)
    └── Submit petty cash voucher requests only
```

## 3. Permission Matrix

### Authentication & Account

| Action | SOA | SS | SAC | SM | SYSADMIN |
|---|:---:|:---:|:---:|:---:|:---:|
| Login via NIK + PIN | ✅ | ✅ | ✅ | ✅ | ✅ |
| Change own PIN | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reset other user's PIN (same store) | ❌ | ❌ | ✅ | ✅ | ✅ |
| Create/deactivate user (same store) | ❌ | ❌ | ✅ | ✅ | ✅ |
| Create new store | ❌ | ❌ | ❌ | ❌ | ✅ |
| Configure opname types/items | ❌ | ❌ | ❌ | ❌ | ✅ |

### Voucher Bon Kas Kecil

| Action | SOA | SS | SAC | SM | SYSADMIN |
|---|:---:|:---:|:---:|:---:|:---:|
| Create draft & upload photos | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete own draft (soft delete) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Submit for review | ✅ | ✅ | ✅ | ❌ | ❌ |
| Approve voucher | ❌ | ✅ | ✅* | ✅ | ❌ |
| Reject voucher (reason required) | ❌ | ✅ | ✅ | ✅ | ❌ |
| Disburse cash (DISBURSED) | ❌ | ❌ | ✅ | ❌ | ❌ |
| Batch settle (SETTLED) | ❌ | ❌ | ✅ | ❌ | ❌ |
| Cancel post-disbursement | ❌ | ❌ | ✅ | ✅ | ❌ |
| Confirm refund (REFUNDED) | ❌ | ❌ | ✅ | ❌ | ❌ |

### Cash Opname Session

| Action | SOA | SS | SAC | SM | SYSADMIN |
|---|:---:|:---:|:---:|:---:|:---:|
| Open new session | ❌ | ❌ | ✅ | ❌ | ❌ |
| Input/edit denomination counts | ❌ | ❌ | ✅ | ❌ | ❌ |
| Input BRI mutation & sub-ledger | ❌ | ❌ | ✅ | ❌ | ❌ |
| Submit to supervisor | ❌ | ❌ | ✅ | ❌ | ❌ |
| Verify as witness (VERIFIED_SS) | ❌ | ✅ | ❌ | ❌ | ❌ |
| Reject back to draft (SS) | ❌ | ✅ | ❌ | ❌ | ❌ |
| Final sign-off (APPROVED) | ❌ | ❌ | ❌ | ✅ | ❌ |
| Reject session (SM) | ❌ | ❌ | ❌ | ✅ | ❌ |

### BRI Fund Postings

| Action | SOA | SS | SAC | SM | SYSADMIN |
|---|:---:|:---:|:---:|:---:|:---:|
| Record INFLOW + proof | ❌ | ✅ | ✅ | ❌ | ❌ |
| Record OUTFLOW + proof | ❌ | ✅ | ✅ | ❌ | ❌ |
| Approve OUTFLOW (Dual Control) | ❌ | ✅ | ❌** | ✅ | ❌ |
| Reject OUTFLOW | ❌ | ✅ | ❌ | ✅ | ❌ |
| View posting history & balances | ❌ | ✅ | ✅ | ✅ | ❌ |

### Reports & Admin

| Action | SOA | SS | SAC | SM | SYSADMIN |
|---|:---:|:---:|:---:|:---:|:---:|
| Download BACO Excel (.xlsx) | ❌ | ✅ | ✅ | ✅ | ❌ |
| Download voucher recap | ❌ | ✅ | ✅ | ✅ | ❌ |
| Print-friendly A4 view | ❌ | ✅ | ✅ | ✅ | ❌ |
| View audit logs | ❌ | ❌ | ✅ | ✅ | ✅ |
| Import/Export data | ❌ | ❌ | ✅ | ✅ | ✅ |

## 4. Integrity Rules

### Rule 1: Anti Self-Approval (*)
SAC can approve vouchers submitted by **other** users (SOA/SS). However, if SAC submits a voucher for themselves (`requester_id == current_user.id && current_user.role == SAC`), the system **strictly prohibits self-approval**. That voucher must be approved by SS or SM.

**Implementation**: Check at Action/Service layer, not just UI. Return error code `FORBIDDEN_SELF_APPROVAL`.

### Rule 2: Dual Control BRI Outflow (**)
All OUTFLOW postings recorded by SAC **cannot be approved by SAC**. Must be approved by SS or SM before the running balance is deducted.

**Implementation**: Check at Action/Service layer. Only SS and SM roles can approve outflow postings.

### Rule 3: Store Isolation
- Users belong to exactly **one** store
- All queries automatically scoped by `store_id` via Eloquent Global Scope
- SYSTEM_ADMIN can view cross-store data but cannot perform business operations
- No user can access data from a store they don't belong to (except SYSTEM_ADMIN)

### Rule 4: Multi-Tenancy Binding
- `users.store_id` → `stores.id`
- Every major table has `store_id` column
- Laravel middleware sets the current store context from the authenticated user
- Global Scope on all relevant models: `WHERE store_id = {current_store_id}`

# 07 — Database Design

## Conventions

- **Primary Key**: CUID v2 (string, collision-resistant, time-sortable). Column: `id VARCHAR(32)`.
- **Money**: All monetary values stored as `INTEGER` (cents). Rp 5.000.000,00 → `500000000`. Column suffix: `_cents`.
- **Timestamps**: Stored as UTC. Displayed as WIB (UTC+7). Laravel auto-manages `created_at` / `updated_at`.
- **Soft Delete**: Tables with soft delete use `deleted_at DATETIME NULL`.
- **Multi-Tenancy**: Most tables have `store_id` FK for data isolation.
- **Naming**: snake_case for tables and columns. Singular table names avoided — use plural (Laravel convention).

---

## Table: `stores`

| Column | Type | Nullable | Default | Description |
|---|---|:---:|:---:|---|
| `id` | VARCHAR(32) | NO | CUID | PK |
| `code` | VARCHAR(10) | NO | — | Store code (e.g., `10435`). UNIQUE. |
| `name` | VARCHAR(150) | NO | — | Full store name |
| `address` | TEXT | YES | NULL | Physical address |
| `is_active` | BOOLEAN | NO | TRUE | Store active status |
| `created_at` | DATETIME | NO | NOW() | |
| `updated_at` | DATETIME | NO | NOW() | |

**Indexes**: UNIQUE(`code`)

---

## Table: `store_opname_configs`

| Column | Type | Nullable | Default | Description |
|---|---|:---:|:---:|---|
| `id` | VARCHAR(32) | NO | CUID | PK |
| `store_id` | VARCHAR(32) | NO | — | FK → `stores.id` |
| `opname_type` | VARCHAR(20) | NO | — | `KAS_KECIL`, `KAS_BESAR`, `ACTIVE_SELLING`, `MATERAI`, `VOUCHER` |
| `imprest_fund_cents` | INTEGER | NO | 500000000 | Plafon for this type (in cents) |
| `reconciliation_mode` | VARCHAR(20) | NO | `THREE_POCKETS` | `THREE_POCKETS`, `TWO_POCKETS`, `PHYSICAL_ONLY`, `CUSTOM` |
| `has_voucher_integration` | BOOLEAN | NO | TRUE | Whether this type tracks outstanding vouchers |
| `has_bank_reconciliation` | BOOLEAN | NO | TRUE | Whether this type has BRI bank component |
| `is_active` | BOOLEAN | NO | TRUE | Whether this type is active for this store |
| `config_json` | TEXT | YES | NULL | Additional JSON config (future-proof) |
| `created_at` | DATETIME | NO | NOW() | |
| `updated_at` | DATETIME | NO | NOW() | |

**Indexes**: UNIQUE(`store_id`, `opname_type`)

---

## Table: `opname_item_definitions`

| Column | Type | Nullable | Default | Description |
|---|---|:---:|:---:|---|
| `id` | VARCHAR(32) | NO | CUID | PK |
| `store_id` | VARCHAR(32) | NO | — | FK → `stores.id` |
| `opname_type` | VARCHAR(20) | NO | — | Same ENUM as store_opname_configs |
| `label` | VARCHAR(100) | NO | — | Display label (e.g., "Rp 100.000") |
| `nominal_cents` | INTEGER | NO | — | Item value in cents (e.g., 10000000 for Rp 100.000) |
| `unit` | VARCHAR(20) | NO | `Lembar` | "Lembar", "Keping", "Buah" |
| `group_label` | VARCHAR(50) | NO | — | "Uang Kertas", "Uang Logam", "Materai", "Voucher Gramedia" |
| `sort_order` | INTEGER | NO | 0 | Display order |
| `is_active` | BOOLEAN | NO | TRUE | |
| `created_at` | DATETIME | NO | NOW() | |
| `updated_at` | DATETIME | NO | NOW() | |

**Indexes**: UNIQUE(`store_id`, `opname_type`, `nominal_cents`, `group_label`), INDEX(`store_id`, `opname_type`, `is_active`)

---

## Table: `users`

| Column | Type | Nullable | Default | Description |
|---|---|:---:|:---:|---|
| `id` | VARCHAR(32) | NO | CUID | PK |
| `store_id` | VARCHAR(32) | YES | NULL | FK → `stores.id`. NULL for SYSTEM_ADMIN. |
| `nik` | VARCHAR(20) | NO | — | Employee ID. UNIQUE. |
| `name` | VARCHAR(100) | NO | — | Full name |
| `role` | VARCHAR(20) | NO | `SOA` | `SYSTEM_ADMIN`, `SM`, `SAC`, `SS`, `SOA` |
| `pin_hash` | VARCHAR(255) | NO | — | bcrypt/Argon2id hash |
| `phone_number` | VARCHAR(20) | YES | NULL | WhatsApp contact |
| `is_active` | BOOLEAN | NO | TRUE | |
| `created_at` | DATETIME | NO | NOW() | |
| `updated_at` | DATETIME | NO | NOW() | |

**Indexes**: UNIQUE(`nik`), INDEX(`store_id`, `role`, `is_active`)

---

## Table: `cash_opname_sessions`

| Column | Type | Nullable | Default | Description |
|---|---|:---:|:---:|---|
| `id` | VARCHAR(32) | NO | CUID | PK |
| `store_id` | VARCHAR(32) | NO | — | FK → `stores.id` |
| `opname_number` | VARCHAR(50) | NO | — | `001/KKCL/10435/IX/2026`. UNIQUE. |
| `opname_type` | VARCHAR(20) | NO | `KAS_KECIL` | `KAS_KECIL`, `KAS_BESAR`, `ACTIVE_SELLING`, `MATERAI`, `GIFT_VOUCHER` |
| `status` | VARCHAR(20) | NO | `DRAFT` | `DRAFT`, `SUBMITTED`, `VERIFIED_SS`, `APPROVED`, `REJECTED` |
| `date` | DATE | NO | TODAY() | Opname date |
| `imprest_fund_cents` | INTEGER | NO | 500000000 | Plafon / Target baseline at session creation |
| `previous_variance_cents` | INTEGER | NO | 0 | V_prev from last approved session |
| `physical_total_cents` | INTEGER | NO | 0 | K_fisik = sum of item counts |
| `vouchers_total_cents` | INTEGER | NO | 0 | K_bon = sum of DISBURSED vouchers (KAS_KECIL only) |
| `bri_clean_balance_cents` | INTEGER | NO | 0 | K_bri = net BRI petty cash portion (KAS_KECIL only) |
| `total_actual_cents` | INTEGER | NO | 0 | Total real actual count |
| `target_reconciled_cents` | INTEGER | NO | 500000000 | Target baseline ceiling |
| `current_variance_cents` | INTEGER | NO | 0 | Legacy compatibility variance |
| `raw_discrepancy_cents` | INTEGER | NO | 0 | Total_Actual - Target_Baseline |
| `cumulative_resolved_cents` | INTEGER | NO | 0 | Sum of approved variance resolutions |
| `outstanding_variance_cents` | INTEGER | NO | 0 | Raw_Discrepancy + Cumulative_Resolved |
| `variance_status` | VARCHAR(10) | NO | `BALANCED` | `BALANCED`, `SURPLUS`, `SHORTAGE` |
| `created_by_id` | VARCHAR(32) | NO | — | FK → `users.id` (SAC) |
| `verified_by_ss_id` | VARCHAR(32) | YES | NULL | FK → `users.id` (SS) |
| `approved_by_sm_id` | VARCHAR(32) | YES | NULL | FK → `users.id` (SM) |
| `verified_ss_at` | DATETIME | YES | NULL | SS verification timestamp |
| `approved_sm_at` | DATETIME | YES | NULL | SM sign-off timestamp (triggers lock) |
| `generated_excel_url` | VARCHAR(255) | YES | NULL | Path to generated .xlsx |
| `generated_pdf_url` | VARCHAR(255) | YES | NULL | Path to generated PDF |
| `signed_ba_scan_url` | VARCHAR(255) | YES | NULL | Path to signed document scan |
| `notes` | TEXT | YES | NULL | Operational notes |
| `created_at` | DATETIME | NO | NOW() | |
| `updated_at` | DATETIME | NO | NOW() | |

**Indexes**:
- UNIQUE(`opname_number`)
- INDEX(`store_id`, `opname_type`, `status`)
- INDEX(`store_id`, `opname_type`, `status`, `approved_sm_at`)
- Partial UNIQUE Index (SQLite/DB): `unique_active_session_per_store_type_date` ON `cash_opname_sessions (store_id, opname_type, date)` WHERE `status IN ('DRAFT', 'SUBMITTED', 'VERIFIED_SS')`

---

## Table: `variance_resolutions`

Resolution ledger documenting accounting actions taken to resolve cash count variances.

| Column | Type | Nullable | Default | Description |
|---|---|:---:|:---:|---|
| `id` | VARCHAR(32) | NO | CUID | PK |
| `store_id` | VARCHAR(32) | NO | — | FK → `stores.id` |
| `session_id` | VARCHAR(32) | NO | — | FK → `cash_opname_sessions.id` (CASCADE) |
| `opname_type` | VARCHAR(20) | NO | — | `KAS_KECIL`, `KAS_BESAR`, `ACTIVE_SELLING`, `MATERAI`, `GIFT_VOUCHER` |
| `kind` | VARCHAR(20) | NO | — | `REPLACED` (ganti fisik), `WRITE_OFF` (penghapusan selisih), `FOUND` (ditemukan) |
| `amount_cents` | INTEGER | NO | 0 | Resolution amount in cents |
| `reason` | TEXT | NO | — | Explanation / rationale for the resolution |
| `proof_attachment_url` | VARCHAR(255) | YES | NULL | Slip setoran / nota bukti pendukung |
| `status` | VARCHAR(20) | NO | `PENDING` | `PENDING`, `APPROVED`, `REJECTED` |
| `created_by_id` | VARCHAR(32) | NO | — | FK → `users.id` (SAC / Pembuat) |
| `approved_by_id` | VARCHAR(32) | YES | NULL | FK → `users.id` (SS / SM penyetuju) |
| `created_at` | DATETIME | NO | NOW() | |
| `updated_at` | DATETIME | NO | NOW() | |

**Indexes**: INDEX(`store_id`, `session_id`, `status`), INDEX(`store_id`, `kind`)

---

## Table: `opname_reference_lines`

Polymorphic supporting documents for non-imprest opname sessions (e.g. POS register Z-Reports and bank cash deposits for KAS_BESAR, or float tracking).

| Column | Type | Nullable | Default | Description |
|---|---|:---:|:---:|---|
| `id` | VARCHAR(32) | NO | CUID | PK |
| `session_id` | VARCHAR(32) | NO | — | FK → `cash_opname_sessions.id` (CASCADE) |
| `store_id` | VARCHAR(32) | NO | — | FK → `stores.id` |
| `line_type` | VARCHAR(30) | NO | — | `Z_REPORT`, `BANK_DEPOSIT`, `FLOAT_INITIAL`, `FLOAT_RETURN` |
| `reference_number` | VARCHAR(100) | NO | — | Z-Report Number, Register No, Slip No |
| `amount_cents` | INTEGER | NO | 0 | Amount in cents |
| `proof_attachment_url` | VARCHAR(255) | YES | NULL | Photo of physical receipt/slip |
| `notes` | TEXT | YES | NULL | Extra details (e.g., POS terminal name) |
| `created_at` | DATETIME | NO | NOW() | |
| `updated_at` | DATETIME | NO | NOW() | |

**Indexes**: INDEX(`session_id`, `line_type`), INDEX(`store_id`, `line_type`)

---

## Table: `opname_item_counts`

| Column | Type | Nullable | Default | Description |
|---|---|:---:|:---:|---|
| `id` | VARCHAR(32) | NO | CUID | PK |
| `session_id` | VARCHAR(32) | NO | — | FK → `cash_opname_sessions.id` (CASCADE) |
| `item_definition_id` | VARCHAR(32) | NO | — | FK → `opname_item_definitions.id` |
| `count` | INTEGER | NO | 0 | Number of items (≥ 0) |
| `condition` | VARCHAR(20) | NO | `GOOD` | Physical condition (`GOOD`, `DAMAGED`) |
| `expected_count` | INTEGER | NO | 0 | Expected book balance count (if stock-based) |
| `subtotal_cents` | INTEGER | NO | 0 | count × nominal_cents |
| `created_at` | DATETIME | NO | NOW() | |
| `updated_at` | DATETIME | NO | NOW() | |

**Indexes**: UNIQUE(`session_id`, `item_definition_id`)

---

## Table: `bri_sub_ledgers`

Snapshot of BRI allocation balances at the time of a cash opname session. Computed from `bri_fund_postings`.

| Column | Type | Nullable | Default | Description |
|---|---|:---:|:---:|---|
| `id` | VARCHAR(32) | NO | CUID | PK |
| `session_id` | VARCHAR(32) | NO | — | FK → `cash_opname_sessions.id` (CASCADE). UNIQUE. |
| `bri_mutation_total_cents` | INTEGER | NO | 0 | Manual input: BRI statement balance |
| `b2b_allocation_cents` | INTEGER | NO | 0 | Computed: running balance of B2B |
| `event_allocation_cents` | INTEGER | NO | 0 | Computed: running balance of EVENT |
| `aksel_allocation_cents` | INTEGER | NO | 0 | Computed: running balance of AKSEL |
| `anonymous_allocation_cents` | INTEGER | NO | 0 | Computed: running balance of ANONYMOUS |
| `custom_allocations_total_cents` | INTEGER | NO | 0 | Computed: sum of all CUSTOM |
| `statement_proof_url` | VARCHAR(255) | YES | NULL | Bank statement photo path |
| `net_kas_kecil_bri_cents` | INTEGER | NO | 0 | mutation - all allocations |
| `created_at` | DATETIME | NO | NOW() | |
| `updated_at` | DATETIME | NO | NOW() | |

**Indexes**: UNIQUE(`session_id`)

---

## Table: `bri_custom_allocations`

| Column | Type | Nullable | Default | Description |
|---|---|:---:|:---:|---|
| `id` | VARCHAR(32) | NO | CUID | PK |
| `sub_ledger_id` | VARCHAR(32) | NO | — | FK → `bri_sub_ledgers.id` (CASCADE) |
| `name` | VARCHAR(100) | NO | — | Custom fund name |
| `amount_cents` | INTEGER | NO | 0 | Fund balance (≥ 0) |
| `notes` | VARCHAR(255) | YES | NULL | |
| `proof_attachment_url` | VARCHAR(255) | YES | NULL | |
| `created_at` | DATETIME | NO | NOW() | |

---

## Table: `bri_fund_postings`

| Column | Type | Nullable | Default | Description |
|---|---|:---:|:---:|---|
| `id` | VARCHAR(32) | NO | CUID | PK |
| `store_id` | VARCHAR(32) | NO | — | FK → `stores.id` |
| `category` | VARCHAR(20) | NO | — | `B2B`, `EVENT`, `AKSEL`, `ANONYMOUS`, `CUSTOM` |
| `custom_category_name` | VARCHAR(100) | YES | NULL | Name if category=CUSTOM |
| `entity_name` | VARCHAR(150) | NO | — | Partner/activity name |
| `type` | VARCHAR(10) | NO | — | `INFLOW` or `OUTFLOW` |
| `amount_cents` | INTEGER | NO | — | Posting amount (> 0) |
| `purpose` | VARCHAR(255) | NO | — | Description / destination account |
| `proof_attachment_url` | VARCHAR(255) | YES | NULL | Transfer slip photo |
| `status` | VARCHAR(15) | NO | — | `PENDING_SS`, `APPROVED`, `REJECTED` |
| `created_by_id` | VARCHAR(32) | NO | — | FK → `users.id` |
| `approved_by_id` | VARCHAR(32) | YES | NULL | FK → `users.id` |
| `approved_at` | DATETIME | YES | NULL | Approval timestamp |
| `rejection_reason` | VARCHAR(255) | YES | NULL | If rejected |
| `created_at` | DATETIME | NO | NOW() | |
| `updated_at` | DATETIME | NO | NOW() | |

**Indexes**: INDEX(`store_id`, `category`, `status`), INDEX(`store_id`, `entity_name`, `status`)

---

## Table: `petty_cash_vouchers`

| Column | Type | Nullable | Default | Description |
|---|---|:---:|:---:|---|
| `id` | VARCHAR(32) | NO | CUID | PK |
| `store_id` | VARCHAR(32) | NO | — | FK → `stores.id` |
| `voucher_number` | VARCHAR(50) | NO | — | `024/KKCL/10435/IX/2026`. UNIQUE. |
| `requester_id` | VARCHAR(32) | NO | — | FK → `users.id` |
| `amount_cents` | INTEGER | NO | — | > 0, ≤ imprest fund |
| `purpose` | VARCHAR(255) | NO | — | Expenditure description |
| `category` | VARCHAR(20) | NO | `OPERASIONAL` | `OPERASIONAL`, `STRUK_KASIR`, `LOGISTIK`, `KONSUMSI`, `MAINTENANCE`, `LAINNYA` |
| `status` | VARCHAR(30) | NO | `DRAFT` | `DRAFT`, `SUBMITTED`, `APPROVED_SS`, `DISBURSED`, `SETTLED`, `REJECTED`, `REJECTED_REFUND_PENDING`, `REFUNDED` |
| `receipt_image_url` | VARCHAR(255) | YES | NULL | Receipt photo (WebP) |
| `item_photo_url` | VARCHAR(255) | YES | NULL | Item/delivery photo (WebP) |
| `approved_by_id` | VARCHAR(32) | YES | NULL | FK → `users.id` (approver) |
| `approved_at` | DATETIME | YES | NULL | |
| `disbursed_by_id` | VARCHAR(32) | YES | NULL | FK → `users.id` (SAC) |
| `disbursed_at` | DATETIME | YES | NULL | Cash handover timestamp |
| `settled_at` | DATETIME | YES | NULL | Reimbursement timestamp |
| `rejection_reason` | VARCHAR(255) | YES | NULL | |
| `deleted_at` | DATETIME | YES | NULL | Soft delete for DRAFT |
| `created_at` | DATETIME | NO | NOW() | |
| `updated_at` | DATETIME | NO | NOW() | |

**Indexes**: UNIQUE(`voucher_number`), INDEX(`store_id`, `status`), INDEX(`store_id`, `requester_id`, `status`), INDEX(`deleted_at`)

---

## Table: `audit_logs`

| Column | Type | Nullable | Default | Description |
|---|---|:---:|:---:|---|
| `id` | VARCHAR(32) | NO | CUID | PK |
| `store_id` | VARCHAR(32) | YES | NULL | FK → `stores.id`. NULL for global actions. |
| `entity_name` | VARCHAR(50) | NO | — | Model class name |
| `entity_id` | VARCHAR(32) | NO | — | Target record ID |
| `action` | VARCHAR(50) | NO | — | e.g., `LOGIN`, `DISBURSE`, `SIGN_OFF_SM` |
| `performed_by_id` | VARCHAR(32) | NO | — | FK → `users.id` |
| `old_values` | TEXT | YES | NULL | JSON snapshot before |
| `new_values` | TEXT | YES | NULL | JSON snapshot after |
| `ip_address` | VARCHAR(45) | YES | NULL | |
| `created_at` | DATETIME | NO | NOW() | |

**Indexes**: INDEX(`store_id`, `entity_name`, `entity_id`), INDEX(`performed_by_id`, `created_at`)

---

## Table: `attachments`

| Column | Type | Nullable | Default | Description |
|---|---|:---:|:---:|---|
| `id` | VARCHAR(32) | NO | CUID | PK |
| `store_id` | VARCHAR(32) | NO | — | FK → `stores.id` |
| `entity_type` | VARCHAR(30) | NO | — | `VOUCHER`, `CASH_OPNAME_SESSION`, `BRI_SUB_LEDGER`, `BRI_CUSTOM_ALLOCATION`, `BRI_FUND_POSTING` |
| `entity_id` | VARCHAR(32) | NO | — | Parent record ID |
| `category` | VARCHAR(30) | NO | — | `RECEIPT_PHOTO`, `ITEM_PHOTO`, `BANK_STATEMENT`, etc. |
| `file_name` | VARCHAR(255) | NO | — | Original filename |
| `file_path` | VARCHAR(255) | NO | — | Server disk path |
| `file_size_bytes` | INTEGER | NO | — | Compressed file size |
| `mime_type` | VARCHAR(100) | NO | — | `image/webp`, `application/pdf`, etc. |
| `uploaded_by_id` | VARCHAR(32) | NO | — | FK → `users.id` |
| `created_at` | DATETIME | NO | NOW() | |

**Indexes**: INDEX(`entity_type`, `entity_id`), INDEX(`store_id`)

---

## Table: `notifications`

| Column | Type | Nullable | Default | Description |
|---|---|:---:|:---:|---|
| `id` | VARCHAR(32) | NO | CUID | PK |
| `store_id` | VARCHAR(32) | NO | — | FK → `stores.id` |
| `user_id` | VARCHAR(32) | NO | — | FK → `users.id` (recipient) |
| `type` | VARCHAR(50) | NO | — | `VOUCHER_SUBMITTED`, `VOUCHER_APPROVED`, `OPNAME_SUBMITTED`, etc. |
| `title` | VARCHAR(150) | NO | — | Notification title |
| `message` | TEXT | NO | — | Notification body |
| `entity_type` | VARCHAR(30) | YES | NULL | Related entity type |
| `entity_id` | VARCHAR(32) | YES | NULL | Related entity ID (for navigation) |
| `read_at` | DATETIME | YES | NULL | NULL = unread |
| `created_at` | DATETIME | NO | NOW() | |

**Indexes**: INDEX(`user_id`, `read_at`, `created_at`), INDEX(`store_id`)

---

## SQLite-Specific Notes

1. **No ENUM type**: Use VARCHAR with CHECK constraints or validate at application layer
2. **Foreign keys**: `PRAGMA foreign_keys = ON;` — must be enabled per connection
3. **WAL mode**: `PRAGMA journal_mode = WAL;` for concurrent read performance
4. **Busy timeout**: `PRAGMA busy_timeout = 5000;` (5s wait on lock)
5. **Integer cents**: All `_cents` columns are standard INTEGER — no precision issues
6. **JSON columns**: Use TEXT type, parse/serialize in application (Eloquent `$casts`)
7. **Boolean**: Stored as INTEGER (0/1) in SQLite — Laravel handles transparently

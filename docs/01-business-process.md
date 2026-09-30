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

## 4. Variance Engine & Carry-Forward

### Formulas

```
Total Actual     = K_fisik + K_bon + K_bri
Target Reconciled = Imprest_Fund + V_prev
V_current        = Total_Actual - Target_Reconciled
```

### Variance Status

| V_current | Status | Meaning |
|---|---|---|
| = 0 | `BALANCED` | Cash matches perfectly |
| > 0 | `SURPLUS` | More cash than expected |
| < 0 | `SHORTAGE` | Less cash than expected |

### Carry-Forward Chain

1. While session is DRAFT/SUBMITTED/VERIFIED_SS: V_current is **live** (real-time preview)
2. When SM approves (sign-off): All values are **permanently locked** (immutable snapshot)
3. Next session automatically reads the approved V_current as its V_prev
4. **First-ever session**: V_prev = 0 (configurable via store settings)

### Edge Cases

- **Shortage Replacement**: Session approved with SHORTAGE status. When cashier deposits replacement money, next session's physical cash increases, neutralizing the negative V_prev.
- **Post-Disbursement Cancellation**: Voucher status → `REJECTED_REFUND_PENDING`. Staff returns cash → status → `REFUNDED` (exits K_bon).

## 5. Five Opname Types (Extensible Architecture)

| Type | Code | Reconciliation Mode | Status |
|---|---|---|---|
| Kas Kecil | `KAS_KECIL` | THREE_POCKETS (physical + vouchers + bank) | **Phase 1 — Active** |
| Kas Besar | `KAS_BESAR` | TBD (likely TWO_POCKETS or THREE_POCKETS) | Phase 2 |
| Active Selling | `ACTIVE_SELLING` | TBD | Phase 2 |
| Materai | `MATERAI` | PHYSICAL_ONLY (stamp counting) | Phase 2 |
| Voucher Gramedia | `VOUCHER` | PHYSICAL_ONLY (gift card counting) | Phase 2 |

All types share the same:
- Session lifecycle (DRAFT → SUBMITTED → VERIFIED_SS → APPROVED)
- Sign-off workflow (SAC → SS → SM)
- Variance engine (V_prev → V_current → carry-forward)
- Immutable snapshot on approval
- Excel/PDF export

Type-specific elements:
- Different item definitions (11 denominations for KAS_KECIL, 2 stamps for MATERAI, etc.)
- Different reconciliation modes (which "pockets" are active)
- Different plafon amounts

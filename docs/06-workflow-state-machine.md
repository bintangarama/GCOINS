# 06 — Workflow & State Machine

## 1. Voucher Bon Kas Kecil Lifecycle

```mermaid
stateDiagram-v2
    [*] --> DRAFT: SOA/SS/SAC creates voucher

    DRAFT --> SUBMITTED: Owner uploads receipt & submits
    DRAFT --> [*]: Owner deletes draft (soft delete)

    SUBMITTED --> APPROVED_SS: SS/SAC/SM approves\n(Anti self-approval enforced)
    SUBMITTED --> REJECTED: SS/SAC/SM rejects\n(reason mandatory)

    APPROVED_SS --> DISBURSED: SAC hands physical cash\n(enters K_bon)
    APPROVED_SS --> REJECTED: Cancelled before disbursement

    DISBURSED --> SETTLED: SAC batch settles\n(reimbursement received, exits K_bon)
    DISBURSED --> REJECTED_REFUND_PENDING: Auditor rejects post-disbursement

    REJECTED_REFUND_PENDING --> REFUNDED: Staff returns cash to cashier\n(exits K_bon)

    REJECTED --> [*]: Terminal state
    SETTLED --> [*]: Terminal state
    REFUNDED --> [*]: Terminal state
```

### Transition Table

| From | To | Actor | Conditions | Side Effects |
|---|---|---|---|---|
| - | DRAFT | SOA/SS/SAC | — | Generate voucher number |
| DRAFT | SUBMITTED | Owner | Receipt photo attached | Notify SS/SAC |
| DRAFT | (deleted) | Owner | Only own drafts | Soft delete |
| SUBMITTED | APPROVED_SS | SS/SAC/SM | Anti self-approval check | Notify SAC |
| SUBMITTED | REJECTED | SS/SAC/SM | Reason text required | Notify requester |
| APPROVED_SS | DISBURSED | SAC | — | Set disbursed_at, enters K_bon |
| APPROVED_SS | REJECTED | SAC/SM | — | Notify requester |
| DISBURSED | SETTLED | SAC | Batch operation | Set settled_at, exits K_bon |
| DISBURSED | REJECTED_REFUND_PENDING | SAC/SM | — | Staff must return cash |
| REJECTED_REFUND_PENDING | REFUNDED | SAC | Cash returned confirmed | Exits K_bon |

---

## 2. Cash Opname Session Lifecycle

```mermaid
stateDiagram-v2
    [*] --> DRAFT: SAC opens session\n(auto-fetch V_prev, init items)

    state DRAFT {
        [*] --> InputItems: Count denomination items
        InputItems --> SyncBRI: Input BRI mutation,\nauto-sync allocations
        SyncBRI --> LiveVariance: Review live variance\npreview
    }

    DRAFT --> SUBMITTED: SAC submits for\nSS verification
    SUBMITTED --> VERIFIED_SS: SS witnesses physical cash\n& signs off
    SUBMITTED --> DRAFT: SS rejects\n(physical count mismatch)

    VERIFIED_SS --> APPROVED: SM reviews & signs off\n(final approval)
    VERIFIED_SS --> DRAFT: SM rejects\n(reconciliation issues)

    state APPROVED {
        [*] --> LOCKED: All values frozen\n(immutable snapshot)
        LOCKED --> CARRY_FORWARD: V_current becomes\nV_prev for next session
    }
```

### Transition Table

| From | To | Actor | Conditions | Side Effects |
|---|---|---|---|---|
| - | DRAFT | SAC | No existing active draft | Fetch V_prev, init items, populate BRI |
| DRAFT | SUBMITTED | SAC | All items inputted | Notify SS, lock draft temporarily |
| SUBMITTED | VERIFIED_SS | SS | Physical verification done | Set verified_by_ss, verified_ss_at |
| SUBMITTED | DRAFT | SS | Count mismatch | Reason text, unlock for SAC edit |
| VERIFIED_SS | APPROVED | SM | confirm_understanding = true | **LOCK ALL DATA**, set approved_sm_at, carry-forward V_current |
| VERIFIED_SS | DRAFT | SM | Reconciliation issues | Reason text, unlock for SAC edit |

---

## 3. BRI Fund Posting Lifecycle

```mermaid
stateDiagram-v2
    [*] --> APPROVED: SAC/SS records INFLOW\n(immediately approved)

    [*] --> PENDING_SS: SAC/SS records OUTFLOW\n(zero-deficit validated)

    PENDING_SS --> APPROVED: SS/SM approves\n(balance deducted)
    PENDING_SS --> REJECTED: SS/SM rejects\n(reason mandatory, balance unchanged)

    state APPROVED {
        [*] --> BALANCE_UPDATED: Running balance\nrecalculated
    }
```

### Transition Table

| From | To | Actor | Conditions | Side Effects |
|---|---|---|---|---|
| - | APPROVED | SAC/SS | type=INFLOW, proof attached | Running balance increases |
| - | PENDING_SS | SAC/SS | type=OUTFLOW, amount ≤ balance, proof attached | Notify SS/SM |
| PENDING_SS | APPROVED | SS/SM | Dual control (not creator) | Running balance decreases |
| PENDING_SS | REJECTED | SS/SM | Reason required | Balance unchanged |

---

## 4. Cross-Module Interactions

```mermaid
flowchart TD
    subgraph VoucherModule["Voucher Module"]
        V1[DISBURSED vouchers]
    end

    subgraph BRIModule["BRI Fund Module"]
        B1[Fund postings with APPROVED status]
    end

    subgraph OpnameModule["Cash Opname Module"]
        O1[K_fisik: denomination counts]
        O2[K_bon: sum of DISBURSED vouchers]
        O3[K_bri: net BRI after allocations]
        O4[Variance Engine]
    end

    V1 -->|"auto-sum to K_bon"| O2
    B1 -->|"auto-aggregate to allocations"| O3
    O1 --> O4
    O2 --> O4
    O3 --> O4
    O4 -->|"V_current"| RESULT["BALANCED / SURPLUS / SHORTAGE"]
```

### Key Integration Points

1. **Voucher → Opname**: K_bon is the real-time sum of all DISBURSED vouchers for the current store. When a voucher is SETTLED or REFUNDED, K_bon decreases.

2. **BRI Postings → Opname**: BRI allocation values in the opname sub-ledger are computed from the aggregate running balances of all APPROVED fund postings, grouped by category.

3. **Opname Approval → Next Session**: When an opname is APPROVED, its V_current is atomically stored and will be read as V_prev by the next session.

4. **Opname Approval → Snapshot**: At approval time, system snapshots:
   - All denomination counts
   - All BRI allocation balances at that moment
   - All DISBURSED voucher IDs and amounts at that moment
   - These snapshots are stored in related tables and become immutable

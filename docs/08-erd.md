# 08 — Entity Relationship Diagram

## Full ERD

```mermaid
erDiagram
    stores ||--o{ users : "has many"
    stores ||--o{ store_opname_configs : "has many"
    stores ||--o{ opname_item_definitions : "has many"
    stores ||--o{ cash_opname_sessions : "has many"
    stores ||--o{ petty_cash_vouchers : "has many"
    stores ||--o{ bri_fund_postings : "has many"
    stores ||--o{ audit_logs : "has many"
    stores ||--o{ attachments : "has many"
    stores ||--o{ notifications : "has many"

    users ||--o{ petty_cash_vouchers : "requests"
    users ||--o{ cash_opname_sessions : "creates"
    users ||--o{ bri_fund_postings : "creates"
    users ||--o{ audit_logs : "performs"
    users ||--o{ attachments : "uploads"
    users ||--o{ notifications : "receives"

    cash_opname_sessions ||--o{ opname_item_counts : "has many"
    cash_opname_sessions ||--|| bri_sub_ledgers : "has one"

    opname_item_definitions ||--o{ opname_item_counts : "defines"

    bri_sub_ledgers ||--o{ bri_custom_allocations : "has many"

    stores {
        varchar id PK
        varchar code UK
        varchar name
        text address
        boolean is_active
    }

    store_opname_configs {
        varchar id PK
        varchar store_id FK
        varchar opname_type
        integer imprest_fund_cents
        varchar reconciliation_mode
        boolean has_voucher_integration
        boolean has_bank_reconciliation
        boolean is_active
    }

    opname_item_definitions {
        varchar id PK
        varchar store_id FK
        varchar opname_type
        varchar label
        integer nominal_cents
        varchar unit
        varchar group_label
        integer sort_order
        boolean is_active
    }

    users {
        varchar id PK
        varchar store_id FK
        varchar nik UK
        varchar name
        varchar role
        varchar pin_hash
        varchar phone_number
        boolean is_active
    }

    cash_opname_sessions {
        varchar id PK
        varchar store_id FK
        varchar opname_number UK
        varchar opname_type
        varchar status
        date date
        integer imprest_fund_cents
        integer previous_variance_cents
        integer physical_total_cents
        integer vouchers_total_cents
        integer bri_clean_balance_cents
        integer total_actual_cents
        integer target_reconciled_cents
        integer current_variance_cents
        varchar variance_status
        varchar created_by_id FK
        varchar verified_by_ss_id FK
        varchar approved_by_sm_id FK
    }

    opname_item_counts {
        varchar id PK
        varchar session_id FK
        varchar item_definition_id FK
        integer count
        integer subtotal_cents
    }

    bri_sub_ledgers {
        varchar id PK
        varchar session_id FK
        integer bri_mutation_total_cents
        integer b2b_allocation_cents
        integer event_allocation_cents
        integer aksel_allocation_cents
        integer anonymous_allocation_cents
        integer custom_allocations_total_cents
        integer net_kas_kecil_bri_cents
        varchar statement_proof_url
    }

    bri_custom_allocations {
        varchar id PK
        varchar sub_ledger_id FK
        varchar name
        integer amount_cents
        varchar notes
    }

    bri_fund_postings {
        varchar id PK
        varchar store_id FK
        varchar category
        varchar entity_name
        varchar type
        integer amount_cents
        varchar purpose
        varchar status
        varchar created_by_id FK
        varchar approved_by_id FK
    }

    petty_cash_vouchers {
        varchar id PK
        varchar store_id FK
        varchar voucher_number UK
        varchar requester_id FK
        integer amount_cents
        varchar purpose
        varchar category
        varchar status
        varchar approved_by_id FK
        varchar disbursed_by_id FK
        datetime deleted_at
    }

    audit_logs {
        varchar id PK
        varchar store_id FK
        varchar entity_name
        varchar entity_id
        varchar action
        varchar performed_by_id FK
        text old_values
        text new_values
        varchar ip_address
    }

    attachments {
        varchar id PK
        varchar store_id FK
        varchar entity_type
        varchar entity_id
        varchar category
        varchar file_name
        varchar file_path
        integer file_size_bytes
        varchar mime_type
        varchar uploaded_by_id FK
    }

    notifications {
        varchar id PK
        varchar store_id FK
        varchar user_id FK
        varchar type
        varchar title
        text message
        varchar entity_type
        varchar entity_id
        datetime read_at
    }
```

## Relationship Summary

| Parent | Child | Cardinality | On Delete |
|---|---|---|---|
| stores | users | 1:N | RESTRICT |
| stores | store_opname_configs | 1:N | CASCADE |
| stores | opname_item_definitions | 1:N | CASCADE |
| stores | cash_opname_sessions | 1:N | RESTRICT |
| stores | petty_cash_vouchers | 1:N | RESTRICT |
| stores | bri_fund_postings | 1:N | RESTRICT |
| cash_opname_sessions | opname_item_counts | 1:N | CASCADE |
| cash_opname_sessions | bri_sub_ledgers | 1:1 | CASCADE |
| opname_item_definitions | opname_item_counts | 1:N | RESTRICT |
| bri_sub_ledgers | bri_custom_allocations | 1:N | CASCADE |
| users | petty_cash_vouchers | 1:N (requester) | RESTRICT |
| users | cash_opname_sessions | 1:N (creator) | RESTRICT |
| users | bri_fund_postings | 1:N (creator) | RESTRICT |
| users | notifications | 1:N | CASCADE |

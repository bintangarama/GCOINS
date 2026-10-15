export type OpnameType =
    | 'KAS_KECIL'
    | 'KAS_BESAR'
    | 'ACTIVE_SELLING'
    | 'MATERAI'
    | 'GIFT_VOUCHER';

export interface OpnameItemDefinition {
    id: string;
    store_id: string;
    opname_type: OpnameType | string;
    label: string;
    nominal_cents: number;
    unit: string;
    group_label: string;
    sort_order: number;
    is_active: boolean;
}

export interface OpnameItemCount {
    id: string;
    session_id: string;
    item_definition_id: string;
    count: number;
    subtotal_cents: number;
    expected_count?: number;
    condition?: 'GOOD' | 'DAMAGED' | 'EXPIRED' | string;
    item_definition?: OpnameItemDefinition;
}

export interface OpnameReferenceLine {
    id: string;
    session_id: string;
    line_type: string;
    reference_number: string;
    quantity?: number;
    amount_cents: number;
    proof_attachment_url?: string | null;
    notes?: string | null;
    meta_json?: Record<string, unknown> | null;
    created_at?: string;
    updated_at?: string;
}

export interface BriCustomAllocation {
    id: string;
    sub_ledger_id: string;
    name: string;
    amount_cents: number;
    notes: string | null;
    proof_attachment_url: string | null;
}

export interface BriSubLedger {
    id: string;
    session_id: string;
    bri_mutation_total_cents: number;
    b2b_allocation_cents: number;
    event_allocation_cents: number;
    aksel_allocation_cents: number;
    anonymous_allocation_cents: number;
    custom_allocations_total_cents: number;
    statement_proof_url: string | null;
    net_kas_kecil_bri_cents: number;
    custom_allocations?: BriCustomAllocation[];
}

export type OpnameStatus = 'DRAFT' | 'SUBMITTED' | 'VERIFIED_SS' | 'APPROVED' | 'REJECTED';
export type VarianceStatus = 'BALANCED' | 'SURPLUS' | 'SHORTAGE';

export interface DailyOpnameSummary {
    type: OpnameType;
    label: string;
    description: string;
    status: OpnameStatus | 'NOT_STARTED';
    session_id?: string | null;
    opname_number?: string | null;
    variance_status?: VarianceStatus | null;
    total_actual_cents?: number;
    current_variance_cents?: number;
}

export interface CashOpnameSession {
    id: string;
    store_id: string;
    opname_number: string;
    opname_type: OpnameType | string;
    status: OpnameStatus;
    date: string;
    imprest_fund_cents: number;
    previous_variance_cents: number;
    physical_total_cents: number;
    vouchers_total_cents: number;
    bri_clean_balance_cents: number;
    total_actual_cents: number;
    target_reconciled_cents: number;
    current_variance_cents: number;
    raw_discrepancy_cents?: number;
    cumulative_resolved_cents?: number;
    outstanding_variance_cents?: number;
    variance_status: VarianceStatus;
    created_by_id: string;
    verified_by_ss_id: string | null;
    approved_by_sm_id: string | null;
    verified_ss_at: string | null;
    approved_sm_at: string | null;
    generated_excel_url: string | null;
    generated_pdf_url: string | null;
    signed_ba_scan_url: string | null;
    notes: string | null;
    created_at?: string;
    updated_at?: string;
    created_by?: { id: string; name: string; nik: string; role?: string };
    verified_by_ss?: { id: string; name: string; nik: string; role?: string };
    approved_by_sm?: { id: string; name: string; nik: string; role?: string };
    store?: { id: string; name: string; code: string; address?: string };
    item_counts?: OpnameItemCount[];
    sub_ledger?: BriSubLedger;
    variance_resolutions?: VarianceResolution[];
    reference_lines?: OpnameReferenceLine[];
}

export type VarianceResolutionKind = 'REPLACED' | 'WRITE_OFF' | 'FOUND';
export type VarianceResolutionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface VarianceResolution {
    id: string;
    store_id: string;
    session_id: string;
    opname_type: string;
    kind: VarianceResolutionKind;
    amount_cents: number;
    reason: string;
    proof_attachment_url?: string | null;
    status: VarianceResolutionStatus;
    created_by_id: string;
    approved_by_id?: string | null;
    approved_at?: string | null;
    rejection_reason?: string | null;
    created_at?: string;
    updated_at?: string;
    created_by?: { id: string; name: string; nik: string; role?: string };
    approved_by?: { id: string; name: string; nik: string; role?: string };
}

export interface DisbursedVoucher {
    id: string;
    voucher_number: string;
    requester_id: string;
    purpose: string;
    amount_cents: number;
    category: string;
    disbursed_at: string;
    requester?: { id: string; name: string; nik: string };
}

export interface PaginatedOpnameSessions {
    data: CashOpnameSession[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    prev_page_url: string | null;
    next_page_url: string | null;
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

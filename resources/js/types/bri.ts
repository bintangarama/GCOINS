import { User } from './auth';

export type BriPostingCategory = 'B2B' | 'EVENT' | 'AKSEL' | 'ANONYMOUS' | 'CUSTOM';
export type BriPostingType = 'INFLOW' | 'OUTFLOW';
export type BriPostingStatus = 'PENDING_SS' | 'APPROVED' | 'REJECTED';

export interface BriFundPosting {
    id: string;
    store_id: string;
    category: BriPostingCategory;
    custom_category_name: string | null;
    entity_name: string;
    type: BriPostingType;
    amount_cents: number;
    purpose: string;
    proof_attachment_url: string | null;
    status: BriPostingStatus;
    created_by_id: string;
    approved_by_id: string | null;
    approved_at: string | null;
    rejection_reason: string | null;
    created_at: string;
    updated_at: string;
    created_by?: User;
    approved_by?: User;
    current_entity_balance_cents?: number;
    is_balance_sufficient?: boolean;
}

export interface BriEntityBalance {
    entity_name: string;
    category: string;
    custom_category_name: string | null;
    inflow_total_cents: number;
    outflow_total_cents: number;
    running_balance_cents: number;
    pending_outflow_cents: number;
    postings_count: number;
    last_posting_at: string | null;
}

export interface BriCategoryBalances {
    B2B: number;
    EVENT: number;
    AKSEL: number;
    ANONYMOUS: number;
    CUSTOM: number;
    TOTAL: number;
}

export interface PaginatedBriPostings {
    data: BriFundPosting[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

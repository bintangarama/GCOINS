import { User } from './auth';

export type VoucherStatus =
    | 'DRAFT'
    | 'SUBMITTED'
    | 'APPROVED_SS'
    | 'DISBURSED'
    | 'SETTLED'
    | 'REJECTED'
    | 'REJECTED_REFUND_PENDING'
    | 'REFUNDED';

export type VoucherCategory =
    | 'OPERASIONAL'
    | 'STRUK_KASIR'
    | 'LOGISTIK'
    | 'KONSUMSI'
    | 'MAINTENANCE'
    | 'LAINNYA';

export interface Attachment {
    id: string;
    store_id: string;
    entity_type: string;
    entity_id: string;
    category: string;
    file_name: string;
    file_path: string;
    file_size_bytes: number;
    mime_type: string;
    uploaded_by_id: string;
    created_at?: string;
}

export interface AuditLog {
    id: string;
    store_id: string | null;
    entity_name: string;
    entity_id: string;
    action: string;
    performed_by_id: string;
    performed_by?: User | null;
    old_values?: Record<string, unknown> | null;
    new_values?: Record<string, unknown> | null;
    ip_address?: string | null;
    created_at?: string;
}

export interface PettyCashVoucher {
    id: string;
    store_id: string;
    voucher_number: string;
    requester_id: string;
    amount_cents: number;
    purpose: string;
    category: VoucherCategory;
    status: VoucherStatus;
    receipt_image_url: string | null;
    item_photo_url: string | null;
    approved_by_id: string | null;
    approved_at: string | null;
    disbursed_by_id: string | null;
    disbursed_at: string | null;
    settled_at: string | null;
    rejection_reason: string | null;
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
    requester?: User;
    approved_by?: User;
    disbursed_by?: User;
    attachments?: Attachment[];
    audit_logs?: AuditLog[];
}

export interface PaginatedVouchers {
    data: PettyCashVoucher[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

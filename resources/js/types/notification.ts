export interface NotificationItem {
    id: string;
    store_id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    entity_type?: string | null;
    entity_id?: string | null;
    read_at?: string | null;
    created_at: string;
}

export interface NotificationState {
    unread_count: number;
    recent: NotificationItem[];
}

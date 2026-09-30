export type Role = 'SYSTEM_ADMIN' | 'SM' | 'SAC' | 'SS' | 'SOA';

export type Store = {
    id: string;
    code: string;
    name: string;
    address?: string | null;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
};

export type User = {
    id: string;
    store_id: string | null;
    nik: string;
    name: string;
    role: Role;
    phone_number: string | null;
    is_active: boolean;
    store?: Store | null;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User | null;
};

export type Flash = {
    success?: string | null;
    error?: string | null;
};

import { NotificationState } from './notification';

export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & {
    auth: Auth;
    flash: Flash;
    name: string;
    notifications?: NotificationState | null;
    sidebarOpen: boolean;
};

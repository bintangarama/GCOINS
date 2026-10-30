import React from 'react';
import {
    CheckCircle2,
    Clock,
    FileEdit,
    Scale,
    TrendingDown,
    TrendingUp,
    XCircle,
    Shield,
    UserCheck,
    Coins,
    type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type StatusTone = 'neutral' | 'info' | 'warning' | 'progress' | 'success' | 'danger' | 'surplus';

export interface StatusMeta {
    label: string;
    tone: StatusTone;
    icon?: LucideIcon;
}

export const TONE_STYLES: Record<StatusTone, string> = {
    neutral: 'bg-muted text-muted-foreground border-border',
    info: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900',
    warning: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900',
    progress: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-900',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900',
    danger: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900',
    surplus: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-900',
};

export const STATUS_META: Record<string, StatusMeta> = {
    NOT_STARTED: { label: 'Belum Dibuka', tone: 'neutral' },
    DRAFT: { label: 'Draft', tone: 'neutral', icon: FileEdit },
    SUBMITTED: { label: 'Menunggu Saksi (SS)', tone: 'info', icon: Clock },
    PENDING_SS: { label: 'Menunggu SS', tone: 'warning', icon: Clock },
    VERIFIED_SS: { label: 'Terverifikasi SS', tone: 'progress', icon: UserCheck },
    APPROVED: { label: 'Disetujui Final', tone: 'success', icon: CheckCircle2 },
    APPROVED_SS: { label: 'Disetujui SS', tone: 'progress', icon: CheckCircle2 },
    DISBURSED: { label: 'Dicairkan', tone: 'progress', icon: Coins },
    SETTLED: { label: 'Penyelesaian Selesai', tone: 'success', icon: CheckCircle2 },
    REJECTED: { label: 'Ditolak', tone: 'danger', icon: XCircle },
    REJECTED_REFUND_PENDING: { label: 'Tolak (Refund Pending)', tone: 'warning', icon: XCircle },
    REFUNDED: { label: 'Dikembalikan (Refund)', tone: 'neutral', icon: CheckCircle2 },
    BALANCED: { label: 'Balanced', tone: 'success', icon: Scale },
    SURPLUS: { label: 'Lebih Kas', tone: 'surplus', icon: TrendingUp },
    SHORTAGE: { label: 'Selisih Kurang', tone: 'danger', icon: TrendingDown },
    ACTIVE: { label: 'Aktif', tone: 'success' },
    INACTIVE: { label: 'Nonaktif', tone: 'neutral' },

    // Role tags
    SYSTEM_ADMIN: { label: 'Admin Sistem', tone: 'danger', icon: Shield },
    SM: { label: 'Store Manager', tone: 'warning', icon: Shield },
    SAC: { label: 'Kasir Utama (SAC)', tone: 'info', icon: UserCheck },
    SS: { label: 'Sales Superintendent (SS)', tone: 'progress', icon: UserCheck },
    SOA: { label: 'Officer (SOA)', tone: 'neutral', icon: UserCheck },
};

export function getVarianceMeta(cents: number): StatusMeta {
    if (cents === 0) return STATUS_META.BALANCED;
    if (cents > 0) return STATUS_META.SURPLUS;
    return STATUS_META.SHORTAGE;
}

export type StatusType = keyof typeof STATUS_META | string;

export interface StatusBadgeProps {
    status: StatusType;
    className?: string;
    showIcon?: boolean;
}

export function StatusBadge({ status, className = '', showIcon = true }: StatusBadgeProps) {
    const meta = STATUS_META[status] ?? {
        label: String(status).replaceAll('_', ' '),
        tone: 'neutral' as StatusTone,
    };
    const Icon = meta.icon;

    return (
        <Badge
            variant="outline"
            className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-md border transition-colors',
                TONE_STYLES[meta.tone],
                className
            )}
        >
            {showIcon && Icon && <Icon className="size-3.5 shrink-0" aria-hidden="true" />}
            <span>{meta.label}</span>
        </Badge>
    );
}

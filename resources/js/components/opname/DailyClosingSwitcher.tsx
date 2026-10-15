import React from 'react';
import {
    Wallet,
    Landmark,
    ShoppingBag,
    Stamp,
    Gift,
    CheckCircle2,
} from 'lucide-react';
import { OpnameType, OpnameStatus } from '@/types/opname';
import { formatMoney } from '@/lib/money';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';

export interface TypeSummary {
    type: OpnameType;
    label: string;
    sublabel: string;
    status: OpnameStatus | 'NOT_STARTED';
    opname_number?: string | null;
    total_actual_cents?: number;
    variance_status?: string | null;
}

interface DailyClosingSwitcherProps {
    activeType: string;
    onSelectType: (type: OpnameType) => void;
    summaries: Record<string, TypeSummary>;
    disabled?: boolean;
}

const TYPE_CONFIGS: {
    type: OpnameType;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
}[] = [
    {
        type: 'KAS_KECIL',
        title: 'Kas Kecil (Imprest)',
        description: 'Three Pockets: Safe + Bon + BRI',
        icon: Wallet,
        accentColor: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    },
    {
        type: 'KAS_BESAR',
        title: 'Kas Besar (Turnover)',
        description: 'Arus Kas: Z-Report & Setor Bank',
        icon: Landmark,
        accentColor: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    },
    {
        type: 'ACTIVE_SELLING',
        title: 'Kas Bazar / Event',
        description: 'Konsinyasi: Modal, Jual & Setor',
        icon: ShoppingBag,
        accentColor: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    },
    {
        type: 'MATERAI',
        title: 'Stok Bea Materai',
        description: 'Pencacahan Lembar Kondisi Baik',
        icon: Stamp,
        accentColor: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
    },
    {
        type: 'GIFT_VOUCHER',
        title: 'Stok Gift Voucher',
        description: 'Pencacahan Nomor Seri Voucher',
        icon: Gift,
        accentColor: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
    },
];

export function DailyClosingSwitcher({
    activeType,
    onSelectType,
    summaries,
    disabled = false,
}: DailyClosingSwitcherProps) {
    const approvedCount = TYPE_CONFIGS.filter(
        ({ type }) => summaries[type]?.status === 'APPROVED'
    ).length;

    return (
        <div className="space-y-3">
            {/* Header & Progress Indicator */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Penutupan Kas Harian (5 Item Cash Count)
                    </h2>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1">
                        {approvedCount === 5 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCircle2 className="size-3.5" /> 5/5 Selesai Ditutup
                            </span>
                        ) : (
                            <span>
                                Progres: <strong className="text-foreground font-mono">{approvedCount}</strong> dari <strong className="text-foreground">5</strong> selesai
                            </span>
                        )}
                    </span>
                    <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                            className={cn(
                                'h-full transition-all duration-300',
                                approvedCount === 5 ? 'bg-emerald-600' : 'bg-primary'
                            )}
                            style={{ width: `${(approvedCount / 5) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Switcher Cards: Horizontal Snap on Mobile, Grid on Tablet/Desktop */}
            <div
                role="tablist"
                aria-label="Tipe Cash Opname"
                className="flex sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 overflow-x-auto pb-1 sm:pb-0 sm:overflow-visible snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {TYPE_CONFIGS.map(({ type, title, description, icon: Icon, accentColor }) => {
                    const isSelected = activeType === type;
                    const summary = summaries[type] || {
                        type,
                        label: title,
                        sublabel: description,
                        status: 'NOT_STARTED',
                    };

                    return (
                        <button
                            key={type}
                            role="tab"
                            aria-selected={isSelected}
                            type="button"
                            disabled={disabled}
                            onClick={() => onSelectType(type)}
                            className={cn(
                                'group relative text-left rounded-xl p-3 border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40 shrink-0 w-60 sm:w-auto snap-start',
                                isSelected
                                    ? 'bg-card border-primary shadow-sm ring-2 ring-primary/20'
                                    : 'bg-card/80 border-border hover:border-border/80 hover:bg-muted/40'
                            )}
                        >
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <div className={cn('p-2 rounded-lg border', accentColor)}>
                                    <Icon className="size-4" />
                                </div>
                                <div>
                                    <StatusBadge status={summary.status} showIcon={false} />
                                </div>
                            </div>

                            <div className="space-y-0.5">
                                <span
                                    className={cn(
                                        'text-xs font-bold block truncate',
                                        isSelected ? 'text-foreground' : 'text-foreground/90'
                                    )}
                                >
                                    {title}
                                </span>
                                <p className="text-[11px] text-muted-foreground line-clamp-1">
                                    {description}
                                </p>
                            </div>

                            {summary.total_actual_cents !== undefined && summary.status !== 'NOT_STARTED' && (
                                <div className="mt-2.5 pt-2 border-t border-border flex items-center justify-between text-[11px]">
                                    <span className="text-muted-foreground">Total:</span>
                                    <span className="font-mono num font-semibold text-foreground">
                                        {formatMoney(summary.total_actual_cents)}
                                    </span>
                                </div>
                            )}

                            {isSelected && (
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

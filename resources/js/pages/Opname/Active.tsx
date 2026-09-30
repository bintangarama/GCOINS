import React, { useState, useEffect, useRef } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Coins,
    Banknote,
    Receipt,
    Building2,
    Save,
    RotateCcw,
    CheckCircle2,
    AlertCircle,
    Info,
    Calendar,
    User as UserIcon,
    ArrowRight,
    TrendingUp,
    TrendingDown,
    Scale,
    RefreshCw,
    Layers,
    Plus,
    Trash2,
    Eye,
    Lock,
    ShieldCheck,
    Check,
    XCircle,
    Clock,
    CircleDot,
    Send,
    ShieldAlert,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { ImageUploader } from '@/components/shared/ImageUploader';
import { BreakdownModal } from '@/components/bri/BreakdownModal';
import { PageProps } from '@/types/auth';
import { CashOpnameSession, DisbursedVoucher } from '@/types/opname';
import { BriCategoryBalances, BriEntityBalance } from '@/types/bri';
import { formatMoney } from '@/lib/money';

interface ActiveOpnameProps {
    session: CashOpnameSession | null;
    disbursedVouchers: DisbursedVoucher[];
    briCategoryBalances?: BriCategoryBalances;
    briEntities?: BriEntityBalance[];
    canManage: boolean;
    permissions?: {
        canSubmit?: boolean;
        canVerify?: boolean;
        canRejectSs?: boolean;
        canSignOff?: boolean;
        canRejectSm?: boolean;
        canUpdateDenominations?: boolean;
        canUpdateBri?: boolean;
    };
}

export default function Active({
    session,
    disbursedVouchers = [],
    briCategoryBalances = {
        B2B: 0,
        EVENT: 0,
        AKSEL: 0,
        ANONYMOUS: 0,
        CUSTOM: 0,
        TOTAL: 0,
    },
    briEntities = [],
    canManage = false,
    permissions = {},
}: ActiveOpnameProps) {
    const { auth } = usePage<PageProps>().props;
    const isSac = auth.user?.role === 'SAC';
    const isSs = auth.user?.role === 'SS';
    const isSm = auth.user?.role === 'SM';

    const canSubmit = permissions.canSubmit ?? (isSac && session?.status === 'DRAFT');
    const canVerify = permissions.canVerify ?? (isSs && session?.status === 'SUBMITTED');
    const canRejectSs = permissions.canRejectSs ?? (isSs && session?.status === 'SUBMITTED');
    const canSignOff = permissions.canSignOff ?? (isSm && session?.status === 'VERIFIED_SS');
    const canRejectSm = permissions.canRejectSm ?? (isSm && session?.status === 'VERIFIED_SS');

    // Local state for denomination counts
    const [counts, setCounts] = useState<{ [itemDefinitionId: string]: number }>({});
    const [isDenomDirty, setIsDenomDirty] = useState(false);
    const [isSavingDenom, setIsSavingDenom] = useState(false);
    const [isStarting, setIsStarting] = useState(false);

    // Local state for BRI Sub-Ledger
    const [briMutationCents, setBriMutationCents] = useState<number>(
        session?.sub_ledger?.bri_mutation_total_cents || 0
    );
    const [statementFile, setStatementFile] = useState<File | null>(null);
    const [customAllocations, setCustomAllocations] = useState<
        Array<{ name: string; amount_cents: number; notes?: string | null }>
    >(
        session?.sub_ledger?.custom_allocations?.map((c) => ({
            name: c.name,
            amount_cents: c.amount_cents,
            notes: c.notes,
        })) || []
    );
    const [newCustomName, setNewCustomName] = useState('');
    const [newCustomAmountCents, setNewCustomAmountCents] = useState(0);
    const [showAddCustom, setShowAddCustom] = useState(false);
    const [isBriDirty, setIsBriDirty] = useState(false);
    const [isSavingBri, setIsSavingBri] = useState(false);
    const [isSyncingBri, setIsSyncingBri] = useState(false);

    // Workflow dialog states
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [isRejecting, setIsRejecting] = useState(false);

    const [showSignOffModal, setShowSignOffModal] = useState(false);
    const [confirmUnderstanding, setConfirmUnderstanding] = useState(false);
    const [smNotes, setSmNotes] = useState('');
    const [isSigningOff, setIsSigningOff] = useState(false);

    // Refs for keyboard navigation between denomination inputs
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Initialize counts from session
    useEffect(() => {
        if (session?.item_counts) {
            const initialCounts: { [id: string]: number } = {};
            session.item_counts.forEach((ic) => {
                initialCounts[ic.item_definition_id] = ic.count;
            });
            setCounts(initialCounts);
            setIsDenomDirty(false);
        }

        if (session?.sub_ledger) {
            setBriMutationCents(session.sub_ledger.bri_mutation_total_cents || 0);
            if (session.sub_ledger.custom_allocations) {
                setCustomAllocations(
                    session.sub_ledger.custom_allocations.map((c) => ({
                        name: c.name,
                        amount_cents: c.amount_cents,
                        notes: c.notes,
                    }))
                );
            }
            setIsBriDirty(false);
        }
    }, [session]);

    // Group items by group_label
    const itemCounts = session?.item_counts || [];
    const paperMoney = itemCounts.filter((item) => item.item_definition?.group_label === 'Uang Kertas');
    const coinMoney = itemCounts.filter((item) => item.item_definition?.group_label === 'Uang Logam');
    const otherItems = itemCounts.filter(
        (item) => item.item_definition?.group_label !== 'Uang Kertas' && item.item_definition?.group_label !== 'Uang Logam'
    );

    // Flattened ordered list for linear keyboard navigation
    const allOrderedItems = [...paperMoney, ...coinMoney, ...otherItems];

    // Handle count change for a denomination item
    const handleCountChange = (itemDefinitionId: string, value: string) => {
        const parsed = parseInt(value.replace(/[^0-9]/g, ''), 10) || 0;
        setCounts((prev) => ({
            ...prev,
            [itemDefinitionId]: Math.max(0, parsed),
        }));
        setIsDenomDirty(true);
    };

    // Calculate live K_fisik (Pocket 1)
    const livePhysicalTotalCents = allOrderedItems.reduce((acc, item) => {
        const count = counts[item.item_definition_id] ?? item.count ?? 0;
        const nominal = item.item_definition?.nominal_cents ?? 0;
        return acc + count * nominal;
    }, 0);

    // Pocket 2: K_bon (sum of outstanding vouchers)
    const vouchersTotalCents = session ? session.vouchers_total_cents : 0;

    // Pocket 3: K_bri live calculations
    const b2bAllocation = session?.sub_ledger?.b2b_allocation_cents ?? briCategoryBalances.B2B ?? 0;
    const eventAllocation = session?.sub_ledger?.event_allocation_cents ?? briCategoryBalances.EVENT ?? 0;
    const akselAllocation = session?.sub_ledger?.aksel_allocation_cents ?? briCategoryBalances.AKSEL ?? 0;
    const anonymousAllocation = session?.sub_ledger?.anonymous_allocation_cents ?? briCategoryBalances.ANONYMOUS ?? 0;

    // Custom allocations total: system postings + session custom allocations
    const systemCustomTotal = briCategoryBalances.CUSTOM ?? 0;
    const extraCustomTotal = customAllocations.reduce((acc, c) => acc + (c.amount_cents || 0), 0);
    const customAllocationTotal = systemCustomTotal + extraCustomTotal;

    const totalBriAllocations =
        b2bAllocation + eventAllocation + akselAllocation + anonymousAllocation + customAllocationTotal;

    // Net Kas Kecil BRI (K_bri)
    const liveBriCleanBalanceCents = briMutationCents - totalBriAllocations;

    // Three Pockets Formulas
    const liveTotalActualCents = livePhysicalTotalCents + vouchersTotalCents + liveBriCleanBalanceCents;
    const targetReconciledCents = session ? session.imprest_fund_cents + session.previous_variance_cents : 0;
    const liveCurrentVarianceCents = liveTotalActualCents - targetReconciledCents;

    let liveVarianceStatus: 'BALANCED' | 'SURPLUS' | 'SHORTAGE' = 'BALANCED';
    if (liveCurrentVarianceCents > 0) {
        liveVarianceStatus = 'SURPLUS';
    } else if (liveCurrentVarianceCents < 0) {
        liveVarianceStatus = 'SHORTAGE';
    }

    // Save denominations
    const handleSaveDenominations = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!session) return;

        setIsSavingDenom(true);
        const payload = {
            items: Object.entries(counts).map(([defId, count]) => ({
                item_definition_id: defId,
                count,
            })),
        };

        router.put(`/opname/${session.id}/denominations`, payload, {
            preserveScroll: true,
            onSuccess: () => {
                setIsDenomDirty(false);
                setIsSavingDenom(false);
            },
            onError: () => {
                setIsSavingDenom(false);
            },
        });
    };

    // Save BRI Sub-Ledger
    const handleSaveBri = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!session) return;

        setIsSavingBri(true);
        const payload: any = {
            _method: 'put',
            bri_mutation_total_cents: briMutationCents,
            custom_allocations: customAllocations,
        };

        if (statementFile) {
            payload.statement_proof = statementFile;
        }

        router.post(`/opname/${session.id}/bri-subledger`, payload, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setIsBriDirty(false);
                setIsSavingBri(false);
            },
            onError: () => {
                setIsSavingBri(false);
            },
        });
    };

    // Sync BRI Allocations
    const handleSyncBri = () => {
        if (!session) return;
        setIsSyncingBri(true);
        router.post(
            `/opname/${session.id}/bri-sync`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setIsSyncingBri(false),
            }
        );
    };

    // Add custom allocation
    const handleAddCustomAllocation = () => {
        if (!newCustomName.trim() || newCustomAmountCents <= 0) return;
        setCustomAllocations((prev) => [
            ...prev,
            { name: newCustomName.trim(), amount_cents: newCustomAmountCents },
        ]);
        setNewCustomName('');
        setNewCustomAmountCents(0);
        setShowAddCustom(false);
        setIsBriDirty(true);
    };

    // Remove custom allocation
    const handleRemoveCustomAllocation = (index: number) => {
        setCustomAllocations((prev) => prev.filter((_, i) => i !== index));
        setIsBriDirty(true);
    };

    // Keyboard navigation for denominations: Enter / Tab / ArrowDown -> next, ArrowUp -> prev
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentIndex: number) => {
        if (e.key === 'Enter' || e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIndex = currentIndex + 1;
            if (nextIndex < allOrderedItems.length && inputRefs.current[nextIndex]) {
                inputRefs.current[nextIndex]?.focus();
                inputRefs.current[nextIndex]?.select();
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIndex = currentIndex - 1;
            if (prevIndex >= 0 && inputRefs.current[prevIndex]) {
                inputRefs.current[prevIndex]?.focus();
                inputRefs.current[prevIndex]?.select();
            }
        }
    };

    // Open/Start session
    const handleStartSession = () => {
        setIsStarting(true);
        router.post(
            '/opname/start',
            {},
            {
                onFinish: () => setIsStarting(false),
            }
        );
    };

    const formatDate = (isoString?: string | null) => {
        if (!isoString) return '-';
        try {
            const d = new Date(isoString);
            return d.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return isoString;
        }
    };

    const handleSubmitSession = () => {
        if (!session) return;
        setIsSubmitting(true);
        router.post(
            `/opname/${session.id}/submit`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => setShowSubmitModal(false),
                onFinish: () => setIsSubmitting(false),
            }
        );
    };

    const handleVerifySession = () => {
        if (!session) return;
        setIsVerifying(true);
        router.post(
            `/opname/${session.id}/verify`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => setShowVerifyModal(false),
                onFinish: () => setIsVerifying(false),
            }
        );
    };

    const handleRejectSession = () => {
        if (!session || !rejectReason.trim()) return;
        setIsRejecting(true);
        const endpoint =
            session.status === 'SUBMITTED'
                ? `/opname/${session.id}/reject-ss`
                : `/opname/${session.id}/reject-sm`;
        router.post(
            endpoint,
            { reason: rejectReason.trim() },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowRejectModal(false);
                    setRejectReason('');
                },
                onFinish: () => setIsRejecting(false),
            }
        );
    };

    const handleSignOffSession = () => {
        if (!session || !confirmUnderstanding) return;
        setIsSigningOff(true);
        router.post(
            `/opname/${session.id}/sign-off`,
            {
                confirm_understanding: true,
                notes: smNotes.trim() || undefined,
            },
            {
                preserveScroll: true,
                onSuccess: () => setShowSignOffModal(false),
                onFinish: () => setIsSigningOff(false),
            }
        );
    };

    // Render Empty State if no active session
    if (!session) {
        return (
            <AppLayout title="Sesi Cash Opname Aktif">
                <Head title="Sesi Cash Opname Aktif" />
                <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
                    <Card className="border-dashed border-2 border-border text-center p-8 bg-muted/30">
                        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                            <Coins className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground">
                            Tidak Ada Sesi Cash Opname yang Aktif
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                            Saat ini belum ada sesi rekonsiliasi kas kecil yang sedang berjalan untuk toko Anda.
                            {isSac
                                ? ' Silakan buka sesi baru untuk memulai penghitungan kas fisik, bon gantung, dan mutasi BRI.'
                                : ' Sesi baru hanya dapat dibuka oleh staf Senior Accounting (SAC).'}
                        </p>

                        <div className="mt-6 flex justify-center gap-3">
                            {isSac && (
                                <Button
                                    onClick={handleStartSession}
                                    disabled={isStarting}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                                >
                                    <Coins className="w-4 h-4 mr-2" />
                                    {isStarting ? 'Membuka Sesi...' : 'Buka Sesi Cash Opname Baru'}
                                </Button>
                            )}
                        </div>
                    </Card>
                </div>
            </AppLayout>
        );
    }

    const isReadOnly = !canManage || session.status !== 'DRAFT';

    return (
        <AppLayout title={`Cash Opname — ${session.opname_number}`}>
            <Head title={`Cash Opname — ${session.opname_number}`} />

            <div className="pb-56 sm:pb-40 space-y-6">
                {/* Header Information Bar */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-card p-5 rounded-xl border border-border shadow-xs">
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                Sesi Cash Opname
                            </h1>
                            <span className="font-mono text-base font-semibold px-2.5 py-0.5 rounded-md bg-muted text-foreground border border-border">
                                {session.opname_number}
                            </span>
                            <StatusBadge status={session.status} />
                            {(isDenomDirty || isBriDirty) && (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 animate-pulse text-xs">
                                    Perubahan Belum Disimpan
                                </Badge>
                            )}
                        </div>

                        <div className="mt-2 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                            <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                Tanggal: <strong>{session.date}</strong>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <UserIcon className="w-3.5 h-3.5" />
                                Petugas SAC: <strong>{session.created_by?.name || 'SAC'}</strong>
                            </span>
                            <span className="flex items-center gap-1.5">
                                Plafon Imprest: <strong>{formatMoney(session.imprest_fund_cents)}</strong>
                            </span>
                            <span className="flex items-center gap-1.5">
                                Selisih Lalu (V_prev): <strong>{formatMoney(session.previous_variance_cents)}</strong>
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {!isReadOnly && (
                            <>
                                <Button
                                    onClick={() => handleSaveDenominations()}
                                    disabled={isSavingDenom || !isDenomDirty}
                                    variant="outline"
                                    className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                                >
                                    <Save className="w-4 h-4 mr-1.5" />
                                    {isSavingDenom ? 'Menyimpan...' : 'Simpan Pecahan'}
                                </Button>

                                <Button
                                    onClick={() => handleSaveBri()}
                                    disabled={isSavingBri || !isBriDirty}
                                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                                >
                                    <Save className="w-4 h-4 mr-1.5" />
                                    {isSavingBri ? 'Menyimpan...' : 'Simpan BRI'}
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Rejection Alert Banner */}
                {session.status === 'DRAFT' && session.notes && session.notes.startsWith('Ditolak') && (
                    <Alert className="border-red-300 dark:border-red-900 bg-red-50/70 dark:bg-red-950/40 text-red-900 dark:text-red-200">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        <AlertTitle className="font-bold text-sm">Catatan Pengembalian ke Status DRAFT</AlertTitle>
                        <AlertDescription className="text-xs mt-1 text-red-800 dark:text-red-300">
                            {session.notes}
                            <div className="mt-1.5 font-medium text-red-700 dark:text-red-400">
                                Mohon lakukan penyesuaian pada perhitungan fisik uang tunai atau rekonsiliasi mutasi BRI sesuai catatan saksi/SM sebelum mengajukan kembali.
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Approved & Locked Banner (Immutable Snapshot) */}
                {session.status === 'APPROVED' && (
                    <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-emerald-900 dark:text-emerald-100 text-base">
                                    Sesi Resmi Disetujui & Dikunci Permanen (Immutable Snapshot)
                                </h3>
                                <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                                    Seluruh data perhitungan fisik kas, bon gantung, dan rekonsiliasi BRI telah terkunci permanen sesuai <strong>Rule 4 (Immutable Snapshot)</strong>. Selisih akhir <strong>{session.current_variance_cents > 0 ? '+' : ''}{formatMoney(session.current_variance_cents)}</strong> tersimpan sebagai saldo awal selisih (V_prev) untuk sesi berikutnya.
                                </p>
                                {session.notes && (
                                    <p className="text-xs text-emerald-900 dark:text-emerald-200 mt-1.5 font-medium italic">
                                        Catatan SM: "{session.notes}"
                                    </p>
                                )}
                            </div>
                        </div>

                        {isSac && (
                            <Button
                                onClick={handleStartSession}
                                disabled={isStarting}
                                className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 shadow-xs"
                            >
                                <Plus className="w-4 h-4 mr-1.5" />
                                {isStarting ? 'Membuka...' : 'Buka Sesi Baru'}
                            </Button>
                        )}
                    </div>
                )}

                {/* Workflow Stepper & Sign-off Status Card */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                    {/* Stepper Steps */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Step 1: DRAFT */}
                        <div className={`p-3 rounded-lg border flex items-center gap-3 ${
                            session.status === 'DRAFT'
                                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-blue-400'
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                        }`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                session.status !== 'DRAFT'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-blue-600 text-white'
                            }`}>
                                {session.status !== 'DRAFT' ? <Check className="w-4 h-4" /> : '1'}
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs font-bold truncate text-foreground">1. Draft Persiapan</div>
                                <div className="text-[11px] text-muted-foreground truncate">Kasir (SAC)</div>
                            </div>
                        </div>

                        {/* Step 2: SUBMITTED */}
                        <div className={`p-3 rounded-lg border flex items-center gap-3 ${
                            session.status === 'SUBMITTED'
                                ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 ring-1 ring-amber-400'
                                : session.status === 'VERIFIED_SS' || session.status === 'APPROVED'
                                ? 'border-border bg-muted/30'
                                : 'border-border opacity-60'
                        }`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                session.status === 'VERIFIED_SS' || session.status === 'APPROVED'
                                    ? 'bg-emerald-600 text-white'
                                    : session.status === 'SUBMITTED'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-muted text-muted-foreground'
                            }`}>
                                {session.status === 'VERIFIED_SS' || session.status === 'APPROVED' ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    '2'
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs font-bold truncate text-foreground">2. Verifikasi Saksi</div>
                                <div className="text-[11px] text-muted-foreground truncate">Supervisor (SS)</div>
                            </div>
                        </div>

                        {/* Step 3: VERIFIED_SS */}
                        <div className={`p-3 rounded-lg border flex items-center gap-3 ${
                            session.status === 'VERIFIED_SS'
                                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-400'
                                : session.status === 'APPROVED'
                                ? 'border-border bg-muted/30'
                                : 'border-border opacity-60'
                        }`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                session.status === 'APPROVED'
                                    ? 'bg-emerald-600 text-white'
                                    : session.status === 'VERIFIED_SS'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-muted text-muted-foreground'
                            }`}>
                                {session.status === 'APPROVED' ? <Check className="w-4 h-4" /> : '3'}
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs font-bold truncate text-foreground">3. Final Sign-Off</div>
                                <div className="text-[11px] text-muted-foreground truncate">Store Manager (SM)</div>
                            </div>
                        </div>

                        {/* Step 4: APPROVED */}
                        <div className={`p-3 rounded-lg border flex items-center gap-3 ${
                            session.status === 'APPROVED'
                                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                                : 'border-border opacity-60'
                        }`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                session.status === 'APPROVED'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-muted text-muted-foreground'
                            }`}>
                                <Lock className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs font-bold truncate text-foreground">4. Terkunci</div>
                                <div className="text-[11px] text-muted-foreground truncate">Immutable Snapshot</div>
                            </div>
                        </div>
                    </div>

                    {/* Stakeholders Signatures Detail */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                        {/* Stakeholder 1: SAC */}
                        <div className="flex items-start gap-2.5">
                            <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 shrink-0">
                                <UserIcon className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-slate-500 text-[11px]">Pembuat Sesi (Kasir / SAC):</div>
                                <div className="font-semibold text-slate-800 dark:text-slate-200">
                                    {session.created_by?.name || 'SAC Kasir'} {session.created_by?.nik ? `(${session.created_by.nik})` : ''}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                    Dibuka: {formatDate(session.created_at)}
                                </div>
                            </div>
                        </div>

                        {/* Stakeholder 2: SS */}
                        <div className="flex items-start gap-2.5">
                            <div className={`p-1.5 rounded-md shrink-0 ${
                                session.verified_by_ss_id
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                            }`}>
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-slate-500 text-[11px]">Saksi Fisik Brankas (SS):</div>
                                <div className="font-semibold text-slate-800 dark:text-slate-200">
                                    {session.verified_by_ss?.name ? `${session.verified_by_ss.name} (${session.verified_by_ss.nik})` : 'Belum Diverifikasi'}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                    {session.verified_ss_at ? `Diverifikasi: ${formatDate(session.verified_ss_at)}` : session.status === 'SUBMITTED' ? 'Menunggu Verifikasi SS' : '-'}
                                </div>
                            </div>
                        </div>

                        {/* Stakeholder 3: SM */}
                        <div className="flex items-start gap-2.5">
                            <div className={`p-1.5 rounded-md shrink-0 ${
                                session.approved_by_sm_id
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                            }`}>
                                <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-slate-500 text-[11px]">Penyetujuan Final (SM):</div>
                                <div className="font-semibold text-slate-800 dark:text-slate-200">
                                    {session.approved_by_sm?.name ? `${session.approved_by_sm.name} (${session.approved_by_sm.nik})` : 'Belum Disetujui'}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                    {session.approved_sm_at ? `Disetujui: ${formatDate(session.approved_sm_at)}` : session.status === 'VERIFIED_SS' ? 'Menunggu Sign-off SM' : '-'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Grid of Pockets */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Pocket 1: Denomination Table (7 cols on lg) */}
                    <div className="lg:col-span-7 space-y-6">
                        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
                            <CardHeader className="bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 pb-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                                            <Banknote className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                                                Kantong 1 — Kas Fisik Safe (K_fisik)
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                                Hitung fisik lembar dan keping uang tunai di brankas kasir
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-slate-500 uppercase font-semibold">Subtotal K_fisik</span>
                                        <p className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                            {formatMoney(livePhysicalTotalCents)}
                                        </p>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {/* Section Uang Kertas */}
                                    {paperMoney.length > 0 && (
                                        <div>
                                            <div className="bg-slate-100/70 dark:bg-slate-800/50 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex justify-between items-center">
                                                <span>Uang Kertas (7 Pecahan)</span>
                                                <span className="font-mono text-emerald-700 dark:text-emerald-400">
                                                    {formatMoney(
                                                        paperMoney.reduce(
                                                            (acc, item) =>
                                                                acc +
                                                                (counts[item.item_definition_id] ?? item.count ?? 0) *
                                                                    (item.item_definition?.nominal_cents ?? 0),
                                                            0
                                                        )
                                                    )}
                                                </span>
                                            </div>

                                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {paperMoney.map((item, idx) => {
                                                    const currentCount = counts[item.item_definition_id] ?? item.count ?? 0;
                                                    const subtotal = currentCount * (item.item_definition?.nominal_cents ?? 0);
                                                    const linearIndex = idx;

                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors gap-2"
                                                        >
                                                            <div className="flex-1 min-w-[70px] sm:min-w-[100px]">
                                                                <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 block">
                                                                    {item.item_definition?.label}
                                                                </span>
                                                                <span className="text-[10px] sm:text-xs text-slate-400">
                                                                    {item.item_definition?.unit}
                                                                </span>
                                                            </div>

                                                            <div className="shrink-0 flex justify-center">
                                                                <div className="relative w-20 sm:w-28 md:w-32">
                                                                    <Input
                                                                        ref={(el) => {
                                                                            inputRefs.current[linearIndex] = el;
                                                                        }}
                                                                        type="text"
                                                                        inputMode="numeric"
                                                                        disabled={isReadOnly}
                                                                        value={currentCount === 0 ? '' : currentCount.toString()}
                                                                        placeholder="0"
                                                                        onChange={(e) =>
                                                                            handleCountChange(item.item_definition_id, e.target.value)
                                                                        }
                                                                        onKeyDown={(e) => handleKeyDown(e, linearIndex)}
                                                                        className="text-right font-mono font-bold text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="flex-1 min-w-[70px] sm:min-w-[100px] text-right">
                                                                <span className="font-mono text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate block">
                                                                    {formatMoney(subtotal)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Section Uang Logam */}
                                    {coinMoney.length > 0 && (
                                        <div>
                                            <div className="bg-slate-100/70 dark:bg-slate-800/50 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex justify-between items-center">
                                                <span>Uang Logam (4 Pecahan)</span>
                                                <span className="font-mono text-emerald-700 dark:text-emerald-400">
                                                    {formatMoney(
                                                        coinMoney.reduce(
                                                            (acc, item) =>
                                                                acc +
                                                                (counts[item.item_definition_id] ?? item.count ?? 0) *
                                                                    (item.item_definition?.nominal_cents ?? 0),
                                                            0
                                                        )
                                                    )}
                                                </span>
                                            </div>

                                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {coinMoney.map((item, idx) => {
                                                    const currentCount = counts[item.item_definition_id] ?? item.count ?? 0;
                                                    const subtotal = currentCount * (item.item_definition?.nominal_cents ?? 0);
                                                    const linearIndex = paperMoney.length + idx;

                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors gap-2"
                                                        >
                                                            <div className="flex-1 min-w-[70px] sm:min-w-[100px]">
                                                                <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 block">
                                                                    {item.item_definition?.label}
                                                                </span>
                                                                <span className="text-[10px] sm:text-xs text-slate-400">
                                                                    {item.item_definition?.unit}
                                                                </span>
                                                            </div>

                                                            <div className="shrink-0 flex justify-center">
                                                                <div className="relative w-20 sm:w-28 md:w-32">
                                                                    <Input
                                                                        ref={(el) => {
                                                                            inputRefs.current[linearIndex] = el;
                                                                        }}
                                                                        type="text"
                                                                        inputMode="numeric"
                                                                        disabled={isReadOnly}
                                                                        value={currentCount === 0 ? '' : currentCount.toString()}
                                                                        placeholder="0"
                                                                        onChange={(e) =>
                                                                            handleCountChange(item.item_definition_id, e.target.value)
                                                                        }
                                                                        onKeyDown={(e) => handleKeyDown(e, linearIndex)}
                                                                        className="text-right font-mono font-bold text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="flex-1 min-w-[70px] sm:min-w-[100px] text-right">
                                                                <span className="font-mono text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate block">
                                                                    {formatMoney(subtotal)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Pocket 2 & Pocket 3 (5 cols on lg) */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* Pocket 3: BRI Sub-Ledger (K_bri) */}
                        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
                            <CardHeader className="bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
                                            <Building2 className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                                Kantong 3 — Rekonsiliasi BRI (K_bri)
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                                Isolasi porsi kas kecil di rekening pooling BRI
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!isReadOnly && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleSyncBri}
                                                disabled={isSyncingBri}
                                                title="Sinkronisasi alokasi pos BRI terkini"
                                                className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                            >
                                                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingBri ? 'animate-spin' : ''}`} />
                                            </Button>
                                        )}
                                        <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                                            {formatMoney(liveBriCleanBalanceCents)}
                                        </span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4 text-xs">
                                {/* Input Mutasi BRI */}
                                <div className="space-y-1.5 bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900">
                                    <div className="flex justify-between items-center">
                                        <label className="font-semibold text-slate-700 dark:text-slate-300">
                                            Saldo Rekening Koran BRI (Mutasi)
                                        </label>
                                        <span className="text-[11px] text-slate-400">Input manual dari bukti koran</span>
                                    </div>
                                    <MoneyInput
                                        disabled={isReadOnly}
                                        value={briMutationCents}
                                        onChange={(val) => {
                                            setBriMutationCents(val);
                                            setIsBriDirty(true);
                                        }}
                                        className="h-10 text-base font-mono font-bold bg-white dark:bg-slate-900"
                                        placeholder="0"
                                    />
                                </div>

                                {/* Bukti Rekening Koran Upload */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="font-semibold text-slate-700 dark:text-slate-300">
                                            Foto / Berkas Bukti Rekening Koran
                                        </label>
                                        {session.sub_ledger?.statement_proof_url && (
                                            <a
                                                href={session.sub_ledger.statement_proof_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-blue-600 hover:underline flex items-center gap-1 text-[11px]"
                                            >
                                                <Eye className="w-3 h-3" /> Lihat Bukti
                                            </a>
                                        )}
                                    </div>

                                    {!isReadOnly ? (
                                        <ImageUploader
                                            label="Unggah Rekening Koran"
                                            description="Format: WebP / JPG / PNG / PDF (maks. 2MB)"
                                            initialUrl={session.sub_ledger?.statement_proof_url}
                                            onChange={(file) => {
                                                setStatementFile(file);
                                                setIsBriDirty(true);
                                            }}
                                        />
                                    ) : session.sub_ledger?.statement_proof_url ? (
                                        <div className="p-2 border rounded-md bg-slate-50 flex items-center justify-between text-[11px]">
                                            <span className="text-slate-600 truncate">Bukti telah dilampirkan</span>
                                            <a
                                                href={session.sub_ledger.statement_proof_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-blue-600 font-semibold"
                                            >
                                                Buka
                                            </a>
                                        </div>
                                    ) : (
                                        <p className="text-slate-400 italic text-[11px]">Tidak ada berkas bukti.</p>
                                    )}
                                </div>

                                {/* Table of Category Allocations */}
                                <div className="space-y-1 border-t pt-3">
                                    <div className="flex justify-between items-center text-slate-500 font-semibold uppercase text-[11px] mb-1">
                                        <span>Pos Alokasi Non-Kas Kecil</span>
                                        <span>Saldo Berjalan</span>
                                    </div>

                                    {/* B2B */}
                                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-slate-700 dark:text-slate-300">1. Alokasi B2B</span>
                                            <BreakdownModal
                                                categoryBalances={briCategoryBalances}
                                                entities={briEntities}
                                                initialCategory="B2B"
                                                trigger={
                                                    <button className="text-blue-600 hover:text-blue-700 p-0.5" title="Detail B2B">
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                }
                                            />
                                        </div>
                                        <span className="font-mono text-slate-800 dark:text-slate-200">
                                            {formatMoney(b2bAllocation)}
                                        </span>
                                    </div>

                                    {/* EVENT */}
                                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-slate-700 dark:text-slate-300">2. Alokasi Event / Pameran</span>
                                            <BreakdownModal
                                                categoryBalances={briCategoryBalances}
                                                entities={briEntities}
                                                initialCategory="EVENT"
                                                trigger={
                                                    <button className="text-blue-600 hover:text-blue-700 p-0.5" title="Detail Event">
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                }
                                            />
                                        </div>
                                        <span className="font-mono text-slate-800 dark:text-slate-200">
                                            {formatMoney(eventAllocation)}
                                        </span>
                                    </div>

                                    {/* AKSEL */}
                                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-slate-700 dark:text-slate-300">3. Active Selling (AKSEL)</span>
                                            <BreakdownModal
                                                categoryBalances={briCategoryBalances}
                                                entities={briEntities}
                                                initialCategory="AKSEL"
                                                trigger={
                                                    <button className="text-blue-600 hover:text-blue-700 p-0.5" title="Detail Aksel">
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                }
                                            />
                                        </div>
                                        <span className="font-mono text-slate-800 dark:text-slate-200">
                                            {formatMoney(akselAllocation)}
                                        </span>
                                    </div>

                                    {/* ANONYMOUS */}
                                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-slate-700 dark:text-slate-300">4. Dana Titipan Anonim</span>
                                            <BreakdownModal
                                                categoryBalances={briCategoryBalances}
                                                entities={briEntities}
                                                initialCategory="ANONYMOUS"
                                                trigger={
                                                    <button className="text-blue-600 hover:text-blue-700 p-0.5" title="Detail Anonim">
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                }
                                            />
                                        </div>
                                        <span className="font-mono text-slate-800 dark:text-slate-200">
                                            {formatMoney(anonymousAllocation)}
                                        </span>
                                    </div>

                                    {/* CUSTOM ALLOCATIONS */}
                                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-slate-700 dark:text-slate-300">5. Alokasi Kustom</span>
                                            <BreakdownModal
                                                categoryBalances={briCategoryBalances}
                                                entities={briEntities}
                                                initialCategory="CUSTOM"
                                                trigger={
                                                    <button className="text-blue-600 hover:text-blue-700 p-0.5" title="Detail Custom">
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                }
                                            />
                                        </div>
                                        <span className="font-mono text-slate-800 dark:text-slate-200">
                                            {formatMoney(customAllocationTotal)}
                                        </span>
                                    </div>

                                    {/* List extra session custom allocations if any */}
                                    {customAllocations.length > 0 && (
                                        <div className="pl-4 py-1 space-y-1 bg-slate-50 dark:bg-slate-900/50 rounded-md">
                                            {customAllocations.map((ca, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-[11px] pr-2">
                                                    <span className="text-slate-500">• {ca.name}:</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-medium">{formatMoney(ca.amount_cents)}</span>
                                                        {!isReadOnly && (
                                                            <button
                                                                onClick={() => handleRemoveCustomAllocation(idx)}
                                                                className="text-red-500 hover:text-red-700"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Add Custom Allocation button / form */}
                                    {!isReadOnly && (
                                        <div className="pt-1">
                                            {!showAddCustom ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setShowAddCustom(true)}
                                                    className="h-7 text-[11px] text-blue-600 hover:text-blue-700 p-0"
                                                >
                                                    <Plus className="w-3 h-3 mr-1" /> Tambah Pos Kustom Tambahan
                                                </Button>
                                            ) : (
                                                <div className="p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 space-y-2 mt-1">
                                                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                                        Pos Alokasi Kustom Baru
                                                    </p>
                                                    <Input
                                                        placeholder="Nama Pos (misal: Sewa Booth)"
                                                        value={newCustomName}
                                                        onChange={(e) => setNewCustomName(e.target.value)}
                                                        className="h-8 text-xs bg-white dark:bg-slate-950"
                                                    />
                                                    <MoneyInput
                                                        placeholder="Nominal"
                                                        value={newCustomAmountCents}
                                                        onChange={(val) => setNewCustomAmountCents(val)}
                                                        className="h-8 text-xs font-mono bg-white dark:bg-slate-950"
                                                    />
                                                    <div className="flex justify-end gap-1.5 pt-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setShowAddCustom(false)}
                                                            className="h-7 text-xs"
                                                        >
                                                            Batal
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            onClick={handleAddCustomAllocation}
                                                            className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                                        >
                                                            Simpan Pos
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Total Alokasi Summary */}
                                    <div className="flex justify-between items-center py-2 border-t font-semibold">
                                        <span className="text-slate-700 dark:text-slate-300">Total Seluruh Alokasi:</span>
                                        <span className="font-mono text-slate-900 dark:text-slate-100">
                                            {formatMoney(totalBriAllocations)}
                                        </span>
                                    </div>

                                    {/* Net Kas Kecil BRI Result */}
                                    <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex justify-between items-center mt-2">
                                        <div>
                                            <span className="font-bold text-blue-900 dark:text-blue-200 block text-xs">
                                                Net Kas Kecil di BRI (K_bri)
                                            </span>
                                            <span className="text-[11px] text-blue-700 dark:text-blue-300">
                                                Saldo Mutasi - Total Alokasi
                                            </span>
                                        </div>
                                        <span className="font-mono text-base font-extrabold text-blue-700 dark:text-blue-300">
                                            {formatMoney(liveBriCleanBalanceCents)}
                                        </span>
                                    </div>

                                    {/* Action button inside card */}
                                    {!isReadOnly && (
                                        <div className="pt-2">
                                            <Button
                                                onClick={() => handleSaveBri()}
                                                disabled={isSavingBri || !isBriDirty}
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium h-9 text-xs"
                                            >
                                                <Save className="w-3.5 h-3.5 mr-1.5" />
                                                {isSavingBri ? 'Menyimpan...' : 'Simpan Rekonsiliasi BRI'}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Pocket 2: Outstanding Vouchers (K_bon) */}
                        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
                            <CardHeader className="bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400">
                                            <Receipt className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                                Kantong 2 — Bon Gantung (K_bon)
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                                Akumulasi voucher berstatus DISBURSED
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <span className="font-mono text-sm font-bold text-purple-600 dark:text-purple-400">
                                        {formatMoney(vouchersTotalCents)}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-3">
                                {disbursedVouchers.length === 0 ? (
                                    <div className="text-center py-6 text-slate-400 text-xs">
                                        Tidak ada bon gantung aktif saat ini.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto pr-1">
                                        {disbursedVouchers.map((v) => (
                                            <div key={v.id} className="py-2 flex items-center justify-between text-xs">
                                                <div className="truncate mr-2">
                                                    <p className="font-mono font-medium text-slate-800 dark:text-slate-200 truncate">
                                                        {v.voucher_number}
                                                    </p>
                                                    <p className="text-slate-400 truncate text-[11px]">
                                                        {v.requester?.name} • {v.purpose}
                                                    </p>
                                                </div>
                                                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 shrink-0">
                                                    {formatMoney(v.amount_cents)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Section 4: Live Sticky Bottom Variance Summary Bar */}
            <div className="fixed bottom-0 left-0 lg:left-64 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-lg px-3 sm:px-4 py-2.5 sm:py-3">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
                    {/* 3 Pockets formula values */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-4 text-xs w-full md:w-auto">
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-1.5 sm:p-0 rounded sm:bg-transparent">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px] sm:text-[11px] truncate">K_fisik (Safe)</span>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                                {formatMoney(livePhysicalTotalCents)}
                            </span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-1.5 sm:p-0 rounded sm:bg-transparent">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px] sm:text-[11px] truncate">K_bon (Bon)</span>
                            <span className="font-mono font-bold text-purple-600 dark:text-purple-400 text-xs sm:text-sm">
                                {formatMoney(vouchersTotalCents)}
                            </span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-1.5 sm:p-0 rounded sm:bg-transparent">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px] sm:text-[11px] truncate">K_bri (Net BRI)</span>
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs sm:text-sm">
                                {formatMoney(liveBriCleanBalanceCents)}
                            </span>
                        </div>
                        <div className="hidden sm:block">
                            <span className="text-slate-500 dark:text-slate-400 block text-[11px] truncate">Target (Imprest+V_prev)</span>
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-sm">
                                {formatMoney(targetReconciledCents)}
                            </span>
                        </div>
                    </div>

                    {/* Prominent Live Variance Result & Status */}
                    <div className="flex items-center gap-3 sm:gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-100 dark:border-slate-800">
                        <div className="text-left md:text-right">
                            <div className="flex items-center gap-1.5 justify-start md:justify-end">
                                <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold uppercase">
                                    V_current
                                </span>
                                <StatusBadge status={liveVarianceStatus} />
                            </div>
                            <div className="flex items-center gap-1 justify-start md:justify-end mt-0.5">
                                {liveVarianceStatus === 'BALANCED' && (
                                    <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0" />
                                )}
                                {liveVarianceStatus === 'SURPLUS' && (
                                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 shrink-0" />
                                )}
                                {liveVarianceStatus === 'SHORTAGE' && (
                                    <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 shrink-0" />
                                )}
                                <span
                                    className={`font-mono font-extrabold text-base sm:text-xl ${
                                        liveVarianceStatus === 'BALANCED'
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : liveVarianceStatus === 'SURPLUS'
                                            ? 'text-indigo-600 dark:text-indigo-400'
                                            : 'text-red-600 dark:text-red-400'
                                    }`}
                                >
                                    {liveCurrentVarianceCents > 0 ? '+' : ''}
                                    {formatMoney(liveCurrentVarianceCents)}
                                </span>
                            </div>
                        </div>

                        {/* Action buttons based on Role and Workflow State */}
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
                            {!isReadOnly && isDenomDirty && (
                                <Button
                                    onClick={() => handleSaveDenominations()}
                                    disabled={isSavingDenom}
                                    variant="outline"
                                    size="sm"
                                    className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 h-10 px-3 text-xs"
                                >
                                    <Save className="w-3.5 h-3.5 mr-1" />
                                    Simpan Pecahan
                                </Button>
                            )}

                            {!isReadOnly && isBriDirty && (
                                <Button
                                    onClick={() => handleSaveBri()}
                                    disabled={isSavingBri}
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-3 text-xs"
                                >
                                    <Save className="w-3.5 h-3.5 mr-1" />
                                    Simpan BRI
                                </Button>
                            )}

                            {/* SAC: Submit to SS */}
                            {canSubmit && (
                                <Button
                                    onClick={() => setShowSubmitModal(true)}
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-4 text-xs font-semibold shadow-xs"
                                >
                                    <Send className="w-3.5 h-3.5 mr-1.5" />
                                    Ajukan Verifikasi Saksi
                                </Button>
                            )}

                            {/* SS: Witness Verification & Reject */}
                            {canVerify && (
                                <>
                                    <Button
                                        onClick={() => setShowRejectModal(true)}
                                        variant="outline"
                                        size="sm"
                                        className="border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 h-10 px-3 text-xs"
                                    >
                                        <XCircle className="w-3.5 h-3.5 mr-1.5" />
                                        Tolak ke Draft
                                    </Button>
                                    <Button
                                        onClick={() => setShowVerifyModal(true)}
                                        size="sm"
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-4 text-xs font-semibold shadow-xs"
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                        Verifikasi Saksi Fisik
                                    </Button>
                                </>
                            )}

                            {/* SM: Sign-Off & Reject */}
                            {canSignOff && (
                                <>
                                    <Button
                                        onClick={() => setShowRejectModal(true)}
                                        variant="outline"
                                        size="sm"
                                        className="border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 h-10 px-3 text-xs"
                                    >
                                        <XCircle className="w-3.5 h-3.5 mr-1.5" />
                                        Tolak ke Draft
                                    </Button>
                                    <Button
                                        onClick={() => setShowSignOffModal(true)}
                                        size="sm"
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-4 text-xs font-semibold shadow-xs"
                                    >
                                        <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                                        Sign-Off & Setujui
                                    </Button>
                                </>
                            )}

                            {/* Locked session indicator */}
                            {session.status === 'APPROVED' && (
                                <Badge variant="outline" className="h-10 px-3 border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold gap-1.5 text-xs">
                                    <Lock className="w-3.5 h-3.5" />
                                    Terkunci Permanen
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Submit Confirmation Dialog */}
            <Dialog open={showSubmitModal} onOpenChange={setShowSubmitModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                            <Send className="w-5 h-5 text-blue-600" />
                            Ajukan Verifikasi Saksi
                        </DialogTitle>
                        <DialogDescription className="text-slate-600 dark:text-slate-400 text-sm">
                            Sesi Cash Opname akan diteruskan ke Store Supervisor (SS) untuk menyaksikan dan memverifikasi fisik uang di brankas toko.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                        <div className="flex justify-between font-mono">
                            <span className="text-slate-500">Total Fisik (K_fisik):</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{formatMoney(livePhysicalTotalCents)}</span>
                        </div>
                        <div className="flex justify-between font-mono">
                            <span className="text-slate-500">Total Bon (K_bon):</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{formatMoney(vouchersTotalCents)}</span>
                        </div>
                        <div className="flex justify-between font-mono">
                            <span className="text-slate-500">Mutasi Bersih BRI (K_bri):</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{formatMoney(liveBriCleanBalanceCents)}</span>
                        </div>
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between font-mono font-bold text-sm">
                            <span>Selisih Berjalan (V_current):</span>
                            <span className={liveVarianceStatus === 'BALANCED' ? 'text-emerald-600' : liveVarianceStatus === 'SURPLUS' ? 'text-indigo-600' : 'text-red-600'}>
                                {liveCurrentVarianceCents > 0 ? '+' : ''}{formatMoney(liveCurrentVarianceCents)}
                            </span>
                        </div>
                    </div>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                        * Catatan: Setelah diajukan, rincian pecahan dan BRI tidak dapat diubah kembali kecuali sesi ditolak kembali ke Draft oleh saksi atau Store Manager.
                    </p>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setShowSubmitModal(false)} disabled={isSubmitting}>
                            Batal
                        </Button>
                        <Button onClick={handleSubmitSession} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Send className="w-4 h-4 mr-1.5" />
                            {isSubmitting ? 'Mengajukan...' : 'Ya, Ajukan Verifikasi'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* SS Witness Verification Dialog */}
            <Dialog open={showVerifyModal} onOpenChange={setShowVerifyModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            Verifikasi Saksi Fisik Brankas
                        </DialogTitle>
                        <DialogDescription className="text-slate-600 dark:text-slate-400 text-sm">
                            Sebagai Store Supervisor (SS), Anda bertindak sebagai saksi fisik dalam penghitungan uang kas di brankas toko.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="bg-emerald-50/60 dark:bg-emerald-950/40 p-4 rounded-lg border border-emerald-200 dark:border-emerald-900 text-xs space-y-2 text-emerald-900 dark:text-emerald-200">
                        <p className="font-semibold text-sm">Pernyataan Saksi Fisik:</p>
                        <p>
                            Dengan mengklik tombol verifikasi di bawah ini, saya menyatakan telah menyaksikan dan menghitung secara langsung seluruh kas fisik di brankas toko sesuai dengan rincian Rp {formatMoney(session.physical_total_cents)}.
                        </p>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setShowVerifyModal(false)} disabled={isVerifying}>
                            Batal
                        </Button>
                        <Button onClick={handleVerifySession} disabled={isVerifying} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                            {isVerifying ? 'Memverifikasi...' : 'Verifikasi & Tanda Tangani'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* SM Sign-Off Final Approval Dialog */}
            <Dialog open={showSignOffModal} onOpenChange={setShowSignOffModal}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                            Persetujuan Final (Sign-Off SM)
                        </DialogTitle>
                        <DialogDescription className="text-slate-600 dark:text-slate-400 text-sm">
                            Persetujuan ini akan mengunci seluruh nilai kas secara permanen (Rule 4: Immutable Snapshot).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs space-y-2 font-mono">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Total Fisik (K_fisik):</span>
                                <span className="font-semibold">{formatMoney(session.physical_total_cents)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Total Bon (K_bon):</span>
                                <span className="font-semibold">{formatMoney(session.vouchers_total_cents)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Mutasi Bersih BRI (K_bri):</span>
                                <span className="font-semibold">{formatMoney(session.bri_clean_balance_cents)}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1.5">
                                <span className="text-slate-500">Total Aktual:</span>
                                <span className="font-bold">{formatMoney(session.total_actual_cents)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Target Rekonsiliasi:</span>
                                <span className="font-bold">{formatMoney(session.target_reconciled_cents)}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 text-sm font-bold">
                                <span>Selisih Akhir (V_current):</span>
                                <span className={session.variance_status === 'BALANCED' ? 'text-emerald-600' : session.variance_status === 'SURPLUS' ? 'text-indigo-600' : 'text-red-600'}>
                                    {session.current_variance_cents > 0 ? '+' : ''}{formatMoney(session.current_variance_cents)} ({session.variance_status})
                                </span>
                            </div>
                        </div>

                        <div className="text-xs text-slate-500 space-y-1">
                            <div>Saksi Fisik: <strong>{session.verified_by_ss?.name || 'SS'}</strong> {session.verified_by_ss?.nik ? `(${session.verified_by_ss.nik})` : ''}</div>
                            <div>Waktu Saksi: <strong>{formatDate(session.verified_ss_at)}</strong></div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="smNotes" className="text-xs font-semibold">Catatan Store Manager (Opsional)</Label>
                            <Textarea
                                id="smNotes"
                                value={smNotes}
                                onChange={(e) => setSmNotes(e.target.value)}
                                placeholder="Masukkan catatan evaluasi atau keterangan selisih jika ada..."
                                className="text-xs min-h-[60px]"
                            />
                        </div>

                        <div className="flex items-start gap-2.5 p-3 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30">
                            <Checkbox
                                id="confirm_understanding"
                                checked={confirmUnderstanding}
                                onCheckedChange={(checked) => setConfirmUnderstanding(Boolean(checked))}
                                className="mt-0.5"
                            />
                            <Label htmlFor="confirm_understanding" className="text-xs text-slate-700 dark:text-slate-300 leading-snug cursor-pointer">
                                Saya menyatakan telah memeriksa seluruh rincian kas, memahami selisih yang terjadi, dan menyetujui penutupan sesi cash opname ini.
                            </Label>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setShowSignOffModal(false)} disabled={isSigningOff}>
                            Batal
                        </Button>
                        <Button
                            onClick={handleSignOffSession}
                            disabled={isSigningOff || !confirmUnderstanding}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <ShieldCheck className="w-4 h-4 mr-1.5" />
                            {isSigningOff ? 'Mengunci Sesi...' : 'Tanda Tangan & Setujui'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject to Draft Dialog (SS / SM) */}
            <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <XCircle className="w-5 h-5" />
                            Tolak Sesi Cash Opname
                        </DialogTitle>
                        <DialogDescription className="text-slate-600 dark:text-slate-400 text-sm">
                            Sesi ini akan dikembalikan ke status DRAFT agar petugas kasir (SAC) dapat memperbaiki data fisik atau mutasi BRI.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="rejectReason" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Alasan Penolakan <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                                id="rejectReason"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Contoh: Fisik uang pecahan Rp 100.000 kurang 1 lembar, mohon hitung ulang..."
                                className="text-xs min-h-[80px]"
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setShowRejectModal(false)} disabled={isRejecting}>
                            Batal
                        </Button>
                        <Button
                            onClick={handleRejectSession}
                            disabled={isRejecting || !rejectReason.trim()}
                            variant="destructive"
                        >
                            <XCircle className="w-4 h-4 mr-1.5" />
                            {isRejecting ? 'Menolak...' : 'Kembalikan ke Draft'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

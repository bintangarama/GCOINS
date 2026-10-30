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
    Camera,
    UploadCloud,
    FileText,
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
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { BreakdownModal } from '@/components/bri/BreakdownModal';
import { PageProps } from '@/types/auth';
import {
    CashOpnameSession,
    DisbursedVoucher,
    OpnameType,
    OpnameReferenceLine,
} from '@/types/opname';
import { BriCategoryBalances, BriEntityBalance } from '@/types/bri';
import { formatMoney } from '@/lib/money';
import { CountGrid } from '@/components/opname/CountGrid';
import { DailyClosingSwitcher, TypeSummary } from '@/components/opname/DailyClosingSwitcher';
import { KasBesarForm } from '@/components/opname/KasBesarForm';
import { MobileApprovalCard } from '@/components/opname/MobileApprovalCard';

interface ActiveOpnameProps {
    session: CashOpnameSession | null;
    activeType?: string;
    dailySummaries?: Record<string, TypeSummary>;
    disbursedVouchers?: DisbursedVoucher[];
    briCategoryBalances?: BriCategoryBalances;
    briEntities?: BriEntityBalance[];
    canManage?: boolean;
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
    activeType = 'KAS_KECIL',
    dailySummaries = {},
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

    const currentType: OpnameType = (session?.opname_type || activeType || 'KAS_KECIL') as OpnameType;

    const canSubmit = permissions.canSubmit ?? (isSac && session?.status === 'DRAFT');
    const canVerify = permissions.canVerify ?? (isSs && session?.status === 'SUBMITTED');
    const canRejectSs = permissions.canRejectSs ?? (isSs && session?.status === 'SUBMITTED');
    const canSignOff = permissions.canSignOff ?? (isSm && session?.status === 'VERIFIED_SS');
    const canRejectSm = permissions.canRejectSm ?? (isSm && session?.status === 'VERIFIED_SS');

    // Local state for denomination counts & conditions
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [conditions, setConditions] = useState<Record<string, string>>({});
    const [isDenomDirty, setIsDenomDirty] = useState(false);
    const [isSavingDenom, setIsSavingDenom] = useState(false);
    const [isAutosaving, setIsAutosaving] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [isStarting, setIsStarting] = useState(false);

    // Save button ref for numpad traversal
    const saveButtonRef = useRef<HTMLButtonElement | null>(null);

    // Local state for BRI Sub-Ledger (Only relevant for KAS_KECIL)
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
    const [pendingSwitchType, setPendingSwitchType] = useState<OpnameType | null>(null);

    const isReadOnly = !canManage || session?.status !== 'DRAFT';

    // Initialize counts and conditions from session
    useEffect(() => {
        if (session?.item_counts) {
            const initialCounts: Record<string, number> = {};
            const initialConditions: Record<string, string> = {};
            session.item_counts.forEach((ic) => {
                initialCounts[ic.item_definition_id] = ic.count;
                if (ic.condition) {
                    initialConditions[ic.item_definition_id] = ic.condition;
                }
            });
            setCounts(initialCounts);
            setConditions(initialConditions);
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

    // Handle count change for a denomination item
    const handleCountChange = (itemDefinitionId: string, value: number) => {
        setCounts((prev) => ({
            ...prev,
            [itemDefinitionId]: Math.max(0, value),
        }));
        setIsDenomDirty(true);
    };

    const handleConditionChange = (itemDefinitionId: string, condition: string) => {
        setConditions((prev) => ({
            ...prev,
            [itemDefinitionId]: condition,
        }));
        setIsDenomDirty(true);
    };

    // Save denominations logic
    const handleSaveDenominations = (e?: React.FormEvent, isAutosave = false) => {
        if (e) e.preventDefault();
        if (!session || isReadOnly) return;

        if (isAutosave) {
            setIsAutosaving(true);
        } else {
            setIsSavingDenom(true);
        }

        const snapshotCounts = { ...counts };
        const snapshotConditions = { ...conditions };

        const payload = {
            items: Object.entries(snapshotCounts).map(([defId, count]) => ({
                item_definition_id: defId,
                count,
                condition: snapshotConditions[defId] || 'GOOD',
            })),
        };

        router.put(`/opname/${session.id}/denominations`, payload, {
            preserveScroll: true,
            onSuccess: () => {
                // Only mark clean if user hasn't typed newer changes during network request
                setCounts((currentCounts) => {
                    const isStillSame = Object.entries(snapshotCounts).every(
                        ([k, v]) => currentCounts[k] === v
                    );
                    if (isStillSame) {
                        setIsDenomDirty(false);
                    }
                    return currentCounts;
                });
                setLastSavedAt(new Date());
                setIsSavingDenom(false);
                setIsAutosaving(false);
            },
            onError: () => {
                setIsSavingDenom(false);
                setIsAutosaving(false);
            },
        });
    };

    // Autosave with debounce (800ms)
    useEffect(() => {
        if (!isDenomDirty || isReadOnly || !session) return;

        const timer = setTimeout(() => {
            handleSaveDenominations(undefined, true);
        }, 800);

        return () => clearTimeout(timer);
    }, [counts, conditions, isDenomDirty]);

    // Unsaved changes guard (beforeunload)
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDenomDirty || isBriDirty) {
                e.preventDefault();
                e.returnValue = 'Perubahan data opname belum disimpan. Yakin ingin keluar?';
                return 'Perubahan data opname belum disimpan. Yakin ingin keluar?';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDenomDirty, isBriDirty]);

    // Save BRI Sub-Ledger
    const handleSaveBri = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!session || isReadOnly) return;

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

    // Handle Start Session
    const handleStartSession = (typeToStart?: OpnameType) => {
        setIsStarting(true);
        router.post(
            '/opname/start',
            {
                opname_type: typeToStart || currentType,
            },
            {
                onFinish: () => setIsStarting(false),
            }
        );
    };

    // Format Date utility
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

    // Workflow Actions
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

    const handleSignOffSession = (confirmed = confirmUnderstanding, notes = smNotes) => {
        if (!session || !confirmed) return;
        setIsSigningOff(true);
        router.post(
            `/opname/${session.id}/sign-off`,
            {
                confirm_understanding: true,
                notes: notes.trim() || undefined,
            },
            {
                preserveScroll: true,
                onSuccess: () => setShowSignOffModal(false),
                onFinish: () => setIsSigningOff(false),
            }
        );
    };

    // Reference lines handlers for KAS_BESAR
    const handleAddReferenceLine = (line: {
        line_type: string;
        reference_number: string;
        amount_cents: number;
        proof_attachment_url?: string | null;
        notes?: string | null;
    }) => {
        if (!session) return;
        router.post(`/opname/${session.id}/reference-lines`, line, {
            preserveScroll: true,
        });
    };

    const handleRemoveReferenceLine = (lineId: string) => {
        if (!session) return;
        router.delete(`/opname/${session.id}/reference-lines/${lineId}`, {
            preserveScroll: true,
        });
    };

    // Calculate live physical cash / items count
    const itemCounts = session?.item_counts || [];
    const livePhysicalTotalCents = itemCounts.reduce((acc, item) => {
        const count = counts[item.item_definition_id] ?? item.count ?? 0;
        const nominal = item.item_definition?.nominal_cents ?? 0;
        return acc + count * nominal;
    }, 0);

    // KAS_KECIL specific calculations
    const vouchersTotalCents = currentType === 'KAS_KECIL' ? (session?.vouchers_total_cents || 0) : 0;
    const b2bAllocation = session?.sub_ledger?.b2b_allocation_cents ?? briCategoryBalances.B2B ?? 0;
    const eventAllocation = session?.sub_ledger?.event_allocation_cents ?? briCategoryBalances.EVENT ?? 0;
    const akselAllocation = session?.sub_ledger?.aksel_allocation_cents ?? briCategoryBalances.AKSEL ?? 0;
    const anonymousAllocation = session?.sub_ledger?.anonymous_allocation_cents ?? briCategoryBalances.ANONYMOUS ?? 0;
    const systemCustomTotal = briCategoryBalances.CUSTOM ?? 0;
    const extraCustomTotal = customAllocations.reduce((acc, c) => acc + (c.amount_cents || 0), 0);
    const customAllocationTotal = systemCustomTotal + extraCustomTotal;
    const totalBriAllocations =
        b2bAllocation + eventAllocation + akselAllocation + anonymousAllocation + customAllocationTotal;
    const liveBriCleanBalanceCents =
        currentType === 'KAS_KECIL' ? briMutationCents - totalBriAllocations : 0;

    // KAS_BESAR specific calculations
    const refLines = session?.reference_lines || [];
    const zReports = refLines.filter((l) => l.line_type === 'Z_REPORT');
    const bankDeposits = refLines.filter((l) => l.line_type === 'BANK_DEPOSIT');
    const totalZReportCents = zReports.reduce((sum, l) => sum + (l.amount_cents || 0), 0);
    const totalDepositCents = bankDeposits.reduce((sum, l) => sum + (l.amount_cents || 0), 0);
    const kasBesarOpeningBalance = session?.imprest_fund_cents || 0;
    const kasBesarExpectedCents = kasBesarOpeningBalance + totalZReportCents - totalDepositCents;

    // Client-side validation for KAS_BESAR submission:
    // Wajib ada minimal 1 Z-Report dan SELURUH Z-Report harus melampirkan foto fisik struk Z-Report
    const hasZReport = zReports.length > 0;
    const allZReportsHaveProof = hasZReport && zReports.every((l) => Boolean(l.proof_attachment_url));
    const isKasBesarSubmitBlocked =
        currentType === 'KAS_BESAR' && (!hasZReport || !allZReportsHaveProof);

    // Dynamic Live Total Actual, Target, and Outstanding Variance based on opname type
    let liveTotalActualCents = 0;
    let targetBaselineCents = 0;
    let liveRawDiscrepancyCents = 0;

    if (currentType === 'KAS_KECIL') {
        liveTotalActualCents = livePhysicalTotalCents + vouchersTotalCents + liveBriCleanBalanceCents;
        targetBaselineCents = session?.imprest_fund_cents || 0;
        liveRawDiscrepancyCents = liveTotalActualCents - targetBaselineCents;
    } else if (currentType === 'KAS_BESAR') {
        liveTotalActualCents = livePhysicalTotalCents;
        targetBaselineCents = kasBesarExpectedCents;
        liveRawDiscrepancyCents = livePhysicalTotalCents - kasBesarExpectedCents;
    } else {
        // ACTIVE_SELLING, MATERAI, GIFT_VOUCHER
        liveTotalActualCents = livePhysicalTotalCents;
        targetBaselineCents = session?.imprest_fund_cents || 0;
        liveRawDiscrepancyCents = livePhysicalTotalCents - targetBaselineCents;
    }

    const cumulativeResolvedCents = session?.cumulative_resolved_cents ?? 0;
    const liveOutstandingVarianceCents = liveRawDiscrepancyCents + cumulativeResolvedCents;

    let liveVarianceStatus: 'BALANCED' | 'SURPLUS' | 'SHORTAGE' = 'BALANCED';
    if (liveOutstandingVarianceCents > 0) {
        liveVarianceStatus = 'SURPLUS';
    } else if (liveOutstandingVarianceCents < 0) {
        liveVarianceStatus = 'SHORTAGE';
    }

    // Handle Switcher Select Type
    const handleSelectType = (selected: OpnameType) => {
        if (isDenomDirty || isBriDirty) {
            setPendingSwitchType(selected);
            return;
        }
        router.get(`/opname/active?type=${selected}`, {}, { preserveState: false });
    };

    const handleConfirmSwitchType = () => {
        if (pendingSwitchType) {
            router.get(`/opname/active?type=${pendingSwitchType}`, {}, { preserveState: false });
            setPendingSwitchType(null);
        }
    };

    return (
        <AppLayout title={session ? `Cash Opname — ${session.opname_number}` : `Cash Opname — ${currentType}`}>
            <div className="pb-36 sm:pb-32 space-y-6">
                {/* 1. Daily Closing Multi-Type Switcher */}
                <DailyClosingSwitcher
                    activeType={currentType}
                    summaries={dailySummaries}
                    onSelectType={handleSelectType}
                    disabled={isStarting}
                />

                {/* If No Active Session For This Type */}
                {!session ? (
                    <Card className="border-dashed border-2 border-border text-center p-8 bg-muted/30">
                        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                            <Coins className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground">
                            Belum Ada Sesi Aktif untuk Tipe {currentType.replace('_', ' ')}
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                            Saat ini belum ada sesi penghitungan fisik untuk tipe ini yang berstatus Draft atau Pending.
                            {isSac
                                ? ' Silakan buka sesi baru untuk memulai penghitungan fisik kasir dan rekonsiliasi hari ini.'
                                : ' Sesi baru hanya dapat dibuka oleh petugas Senior Accounting (SAC).'}
                        </p>

                        <div className="mt-6 flex justify-center gap-3">
                            {isSac && (
                                <Button
                                    onClick={() => handleStartSession(currentType)}
                                    disabled={isStarting}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm font-semibold"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    {isStarting ? 'Membuka Sesi...' : `Buka Sesi ${currentType.replace('_', ' ')} Baru`}
                                </Button>
                            )}
                        </div>
                    </Card>
                ) : (
                    <>
                        {/* 2. Header Information Bar */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-card p-5 rounded-xl border border-border shadow-xs">
                            <div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                        Sesi {session.opname_type.replace('_', ' ')}
                                    </h1>
                                    <span className="font-mono text-base font-semibold px-2.5 py-0.5 rounded-md bg-muted text-foreground border border-border">
                                        {session.opname_number}
                                    </span>
                                    <StatusBadge status={session.status} />

                                    {/* Unsaved / Autosave status indicators */}
                                    {isDenomDirty && (
                                        <Badge
                                            variant="outline"
                                            className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 animate-pulse text-xs"
                                        >
                                            {isAutosaving ? 'Menyimpan Otomatis...' : 'Perubahan Belum Disimpan'}
                                        </Badge>
                                    )}

                                    {!isDenomDirty && lastSavedAt && (
                                        <Badge
                                            variant="outline"
                                            className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 text-[11px] gap-1"
                                        >
                                            <Check className="w-3 h-3" />
                                            Tersimpan {lastSavedAt.toLocaleTimeString('id-ID')}
                                        </Badge>
                                    )}
                                </div>

                                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                                    <span className="flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5" />
                                        Tanggal: <strong className="text-foreground">{session.date}</strong>
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <UserIcon className="w-3.5 h-3.5" />
                                        Petugas SAC: <strong className="text-foreground">{session.created_by?.name || 'SAC'}</strong>
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        Target/Plafon: <strong className="text-foreground">{formatMoney(session.imprest_fund_cents)}</strong>
                                    </span>
                                    {session.previous_variance_cents !== 0 && (
                                        <span className="flex items-center gap-1.5">
                                            Selisih Lalu (V_prev): <strong className="text-foreground">{formatMoney(session.previous_variance_cents)}</strong>
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                {!isReadOnly && (
                                    <>
                                        <Button
                                            ref={saveButtonRef}
                                            id="btn-save-denominations"
                                            onClick={() => {
                                                if (!isSavingDenom && isDenomDirty) {
                                                    handleSaveDenominations();
                                                }
                                            }}
                                            aria-disabled={isSavingDenom || !isDenomDirty}
                                            variant="outline"
                                            className={`border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-xs font-semibold ${
                                                isSavingDenom || !isDenomDirty ? 'opacity-50 cursor-not-allowed' : ''
                                            }`}
                                        >
                                            <Save className="w-4 h-4 mr-1.5" />
                                            {isSavingDenom ? 'Menyimpan...' : 'Simpan Pecahan'}
                                        </Button>

                                        {currentType === 'KAS_KECIL' && (
                                            <Button
                                                onClick={() => handleSaveBri()}
                                                disabled={isSavingBri || !isBriDirty}
                                                className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs text-xs font-semibold"
                                            >
                                                <Save className="w-4 h-4 mr-1.5" />
                                                {isSavingBri ? 'Menyimpan...' : 'Simpan BRI'}
                                            </Button>
                                        )}
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
                                        Mohon lakukan penyesuaian pada perhitungan fisik atau kelengkapan berkas bukti sebelum mengajukan kembali.
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Approved & Locked Banner */}
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
                                            Seluruh data perhitungan fisik dan rekonsiliasi telah terkunci permanen sesuai <strong>Rule 4 (Immutable Snapshot)</strong>.
                                            Selisih akhir <strong>{session.current_variance_cents > 0 ? '+' : ''}{formatMoney(session.current_variance_cents)}</strong> tercatat di audit log.
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
                                        onClick={() => handleStartSession(currentType)}
                                        disabled={isStarting}
                                        className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 shadow-xs"
                                    >
                                        <Plus className="w-4 h-4 mr-1.5" />
                                        {isStarting ? 'Membuka...' : `Buka Sesi ${currentType.replace('_', ' ')} Baru`}
                                    </Button>
                                )}
                            </div>
                        )}

                        {/* Workflow Stepper & Sign-off Status Card */}
                        <div className="bg-card p-5 rounded-xl border border-border shadow-xs space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className={`p-3 rounded-lg border flex items-center gap-3 ${
                                    session.status === 'DRAFT'
                                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-blue-400'
                                        : 'border-border bg-muted/30'
                                }`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                        session.status !== 'DRAFT' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                                    }`}>
                                        {session.status !== 'DRAFT' ? <Check className="w-4 h-4" /> : '1'}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold truncate text-foreground">1. Draft Persiapan</div>
                                        <div className="text-[11px] text-muted-foreground truncate">Kasir (SAC)</div>
                                    </div>
                                </div>

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
                                        {session.status === 'VERIFIED_SS' || session.status === 'APPROVED' ? <Check className="w-4 h-4" /> : '2'}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold truncate text-foreground">2. Verifikasi Saksi</div>
                                        <div className="text-[11px] text-muted-foreground truncate">Supervisor (SS)</div>
                                    </div>
                                </div>

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

                                <div className={`p-3 rounded-lg border flex items-center gap-3 ${
                                    session.status === 'APPROVED'
                                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                                        : 'border-border opacity-60'
                                }`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                        session.status === 'APPROVED' ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'
                                    }`}>
                                        <Lock className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold truncate text-foreground">4. Terkunci</div>
                                        <div className="text-[11px] text-muted-foreground truncate">Immutable Snapshot</div>
                                    </div>
                                </div>
                            </div>

                            {/* Signatures Timeline Detail */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-border text-xs">
                                <div className="flex items-start gap-2.5">
                                    <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 shrink-0">
                                        <UserIcon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground text-[11px]">Pembuat Sesi (Kasir / SAC):</div>
                                        <div className="font-semibold text-foreground">
                                            {session.created_by?.name || 'SAC Kasir'} {session.created_by?.nik ? `(${session.created_by.nik})` : ''}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground">
                                            Dibuka: {formatDate(session.created_at)}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2.5">
                                    <div className={`p-1.5 rounded-md shrink-0 ${
                                        session.verified_by_ss_id
                                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                                            : 'bg-muted text-muted-foreground'
                                    }`}>
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground text-[11px]">Saksi Fisik Brankas (SS):</div>
                                        <div className="font-semibold text-foreground">
                                            {session.verified_by_ss?.name ? `${session.verified_by_ss.name} (${session.verified_by_ss.nik})` : 'Belum Diverifikasi'}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground">
                                            {session.verified_ss_at ? `Diverifikasi: ${formatDate(session.verified_ss_at)}` : session.status === 'SUBMITTED' ? 'Menunggu Verifikasi SS' : '-'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2.5">
                                    <div className={`p-1.5 rounded-md shrink-0 ${
                                        session.approved_by_sm_id
                                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                                            : 'bg-muted text-muted-foreground'
                                    }`}>
                                        <ShieldCheck className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground text-[11px]">Penyetujuan Final (SM):</div>
                                        <div className="font-semibold text-foreground">
                                            {session.approved_by_sm?.name ? `${session.approved_by_sm.name} (${session.approved_by_sm.nik})` : 'Belum Disetujui'}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground">
                                            {session.approved_sm_at ? `Disetujui: ${formatDate(session.approved_sm_at)}` : session.status === 'VERIFIED_SS' ? 'Menunggu Sign-off SM' : '-'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Main Operational Grids Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Column Left: Modular CountGrid (Pecahan Fisik Uang / Materai / Voucher) */}
                            <div className={currentType === 'KAS_KECIL' ? 'lg:col-span-7 space-y-6' : 'lg:col-span-12 space-y-6'}>
                                <CountGrid
                                    itemCounts={session.item_counts || []}
                                    counts={counts}
                                    conditions={conditions}
                                    onCountChange={handleCountChange}
                                    onConditionChange={handleConditionChange}
                                    disabled={isReadOnly}
                                    opnameType={currentType}
                                    submitButtonRef={saveButtonRef}
                                />
                            </div>

                            {/* Column Right: Sub-Ledger BRI & Bon Gantung (Khusus KAS_KECIL) */}
                            {currentType === 'KAS_KECIL' && (
                                <div className="lg:col-span-5 space-y-6">
                                    {/* Pocket 3: BRI Sub-Ledger (K_bri) */}
                                    <Card className="border-border shadow-xs">
                                        <CardHeader className="bg-muted/40 border-b border-border pb-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
                                                        <Building2 className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-sm font-bold text-foreground">
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
                                            <div className="space-y-1.5 bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900">
                                                <div className="flex justify-between items-center">
                                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                                        Saldo Rekening Koran BRI (Mutasi)
                                                    </label>
                                                    <span className="text-[11px] text-muted-foreground">Input manual dari bukti koran</span>
                                                </div>
                                                <MoneyInput
                                                    disabled={isReadOnly}
                                                    value={briMutationCents}
                                                    onChange={(val) => {
                                                        setBriMutationCents(val);
                                                        setIsBriDirty(true);
                                                    }}
                                                    className="h-10 text-base font-mono font-bold bg-background"
                                                    placeholder="0"
                                                />
                                            </div>

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
                                                        allowPdf={true}
                                                        maxPdfSizeMb={2}
                                                        onChange={(file) => {
                                                            setStatementFile(file);
                                                            setIsBriDirty(true);
                                                        }}
                                                    />
                                                ) : session.sub_ledger?.statement_proof_url ? (
                                                    <div className="p-2 border rounded-md bg-muted/40 flex items-center justify-between text-[11px]">
                                                        <span className="text-muted-foreground truncate">Bukti telah dilampirkan</span>
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
                                                    <p className="text-muted-foreground italic text-[11px]">Tidak ada berkas bukti.</p>
                                                )}
                                            </div>

                                            <div className="space-y-1 border-t border-border pt-3">
                                                <div className="flex justify-between items-center text-muted-foreground font-semibold uppercase text-[11px] mb-1">
                                                    <span>Pos Alokasi Non-Kas Kecil</span>
                                                    <span>Saldo Berjalan</span>
                                                </div>

                                                <div className="flex justify-between items-center py-1.5 border-b border-border">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-foreground">1. Alokasi B2B</span>
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
                                                    <span className="font-mono text-foreground">{formatMoney(b2bAllocation)}</span>
                                                </div>

                                                <div className="flex justify-between items-center py-1.5 border-b border-border">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-foreground">2. Alokasi Event / Pameran</span>
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
                                                    <span className="font-mono text-foreground">{formatMoney(eventAllocation)}</span>
                                                </div>

                                                <div className="flex justify-between items-center py-1.5 border-b border-border">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-foreground">3. Active Selling (AKSEL)</span>
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
                                                    <span className="font-mono text-foreground">{formatMoney(akselAllocation)}</span>
                                                </div>

                                                <div className="flex justify-between items-center py-1.5 border-b border-border">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-foreground">4. Dana Titipan Anonim</span>
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
                                                    <span className="font-mono text-foreground">{formatMoney(anonymousAllocation)}</span>
                                                </div>

                                                <div className="flex justify-between items-center py-1.5 border-b border-border">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-foreground">5. Alokasi Kustom</span>
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
                                                    <span className="font-mono text-foreground">{formatMoney(customAllocationTotal)}</span>
                                                </div>

                                                {customAllocations.length > 0 && (
                                                    <div className="pl-4 py-1 space-y-1 bg-muted/30 rounded-md">
                                                        {customAllocations.map((ca, idx) => (
                                                            <div key={idx} className="flex justify-between items-center text-[11px] pr-2">
                                                                <span className="text-muted-foreground">• {ca.name}:</span>
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
                                                            <div className="p-2.5 border rounded-lg bg-muted/40 space-y-2 mt-1">
                                                                <p className="text-[11px] font-semibold text-foreground">
                                                                    Pos Alokasi Kustom Baru
                                                                </p>
                                                                <Input
                                                                    placeholder="Nama Pos (misal: Sewa Booth)"
                                                                    value={newCustomName}
                                                                    onChange={(e) => setNewCustomName(e.target.value)}
                                                                    className="h-8 text-xs bg-background"
                                                                />
                                                                <MoneyInput
                                                                    placeholder="Nominal"
                                                                    value={newCustomAmountCents}
                                                                    onChange={(val) => setNewCustomAmountCents(val)}
                                                                    className="h-8 text-xs font-mono bg-background"
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
                                                                        className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                                                    >
                                                                        Simpan Pos
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex justify-between items-center py-2 border-t border-border font-semibold">
                                                <span className="text-foreground">Total Seluruh Alokasi:</span>
                                                <span className="font-mono text-foreground">{formatMoney(totalBriAllocations)}</span>
                                            </div>

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
                                        </CardContent>
                                    </Card>

                                    {/* Pocket 2: Outstanding Vouchers (K_bon) */}
                                    <Card className="border-border shadow-xs">
                                        <CardHeader className="bg-muted/40 border-b border-border pb-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400">
                                                        <Receipt className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-sm font-bold text-foreground">
                                                            Kantong 2 — Bon Gantung (K_bon)
                                                        </CardTitle>
                                                        <CardDescription className="text-xs">
                                                            Akumulasi voucher kas kecil berstatus DISBURSED
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
                                                <div className="text-center py-6 text-muted-foreground text-xs">
                                                    Tidak ada bon gantung aktif saat ini.
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-border max-h-60 overflow-y-auto pr-1">
                                                    {disbursedVouchers.map((v) => (
                                                        <div key={v.id} className="py-2 flex items-center justify-between text-xs">
                                                            <div className="truncate mr-2">
                                                                <p className="font-mono font-medium text-foreground truncate">
                                                                    {v.voucher_number}
                                                                </p>
                                                                <p className="text-muted-foreground truncate text-[11px]">
                                                                    {v.requester?.name} • {v.purpose}
                                                                </p>
                                                            </div>
                                                            <span className="font-mono font-semibold text-foreground shrink-0">
                                                                {formatMoney(v.amount_cents)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </div>

                        {/* 4. Sub-Panel Register POS Z-Report untuk KAS_BESAR */}
                        {currentType === 'KAS_BESAR' && (
                            <div className="space-y-4">
                                <KasBesarForm
                                    referenceLines={session.reference_lines || []}
                                    onAddReferenceLine={handleAddReferenceLine}
                                    onRemoveReferenceLine={handleRemoveReferenceLine}
                                    openingBalanceCents={session.imprest_fund_cents || 0}
                                    disabled={isReadOnly}
                                />

                                {isKasBesarSubmitBlocked && session.status === 'DRAFT' && (
                                    <Alert className="border-amber-300 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200">
                                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                        <AlertTitle className="font-bold text-sm">Validasi Dokumen Fisik Z-Report Diperlukan</AlertTitle>
                                        <AlertDescription className="text-xs mt-1 text-amber-800 dark:text-amber-300">
                                            Pengajuan verifikasi Kas Besar dinonaktifkan karena Anda wajib menginput minimal satu No. Register POS (Z-Report)
                                            serta melampirkan foto fisik struk Z-Report sebagai bukti audit rekonsiliasi brankas.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        )}

                        {/* 5. Mobile Approval Card (Khusus Tampilan Layar Kecil < lg) */}
                        <div className="block lg:hidden mt-4">
                            <MobileApprovalCard
                                session={session}
                                role={auth.user?.role || ''}
                                canVerify={canVerify}
                                canSignOff={canSignOff}
                                canRejectSs={canRejectSs}
                                canRejectSm={canRejectSm}
                                onVerify={() => setShowVerifyModal(true)}
                                onSignOff={(confirm, notes) => {
                                    setConfirmUnderstanding(confirm);
                                    if (notes) setSmNotes(notes);
                                    handleSignOffSession(confirm, notes || smNotes);
                                }}
                                onOpenRejectDialog={() => setShowRejectModal(true)}
                                disabled={isStarting || isVerifying || isSigningOff}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* 6. Sticky Bottom Live Discrepancy & Action Bar */}
            {session && (
                <div className="fixed bottom-0 left-0 lg:left-64 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border shadow-lg px-3 sm:px-4 py-2.5 sm:py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
                        {/* Formula values */}
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-4 text-xs w-full md:w-auto">
                            <div className="bg-muted/40 p-1.5 sm:p-0 rounded sm:bg-transparent">
                                <span className="text-muted-foreground block text-[10px] sm:text-[11px] truncate">
                                    {currentType === 'KAS_BESAR' ? 'Kas Fisik Brankas' : 'Kas Fisik (Safe)'}
                                </span>
                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                                    {formatMoney(livePhysicalTotalCents)}
                                </span>
                            </div>

                            {currentType === 'KAS_KECIL' ? (
                                <>
                                    <div className="bg-muted/40 p-1.5 sm:p-0 rounded sm:bg-transparent">
                                        <span className="text-muted-foreground block text-[10px] sm:text-[11px] truncate">K_bon (Bon)</span>
                                        <span className="font-mono font-bold text-purple-600 dark:text-purple-400 text-xs sm:text-sm">
                                            {formatMoney(vouchersTotalCents)}
                                        </span>
                                    </div>
                                    <div className="bg-muted/40 p-1.5 sm:p-0 rounded sm:bg-transparent">
                                        <span className="text-muted-foreground block text-[10px] sm:text-[11px] truncate">K_bri (Net BRI)</span>
                                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs sm:text-sm">
                                            {formatMoney(liveBriCleanBalanceCents)}
                                        </span>
                                    </div>
                                </>
                            ) : currentType === 'KAS_BESAR' ? (
                                <>
                                    <div className="bg-muted/40 p-1.5 sm:p-0 rounded sm:bg-transparent">
                                        <span className="text-muted-foreground block text-[10px] sm:text-[11px] truncate">Z-Report Cash</span>
                                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs sm:text-sm">
                                            +{formatMoney(totalZReportCents)}
                                        </span>
                                    </div>
                                    <div className="bg-muted/40 p-1.5 sm:p-0 rounded sm:bg-transparent">
                                        <span className="text-muted-foreground block text-[10px] sm:text-[11px] truncate">Setor Bank</span>
                                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs sm:text-sm">
                                            -{formatMoney(totalDepositCents)}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="bg-muted/40 p-1.5 sm:p-0 rounded sm:bg-transparent">
                                    <span className="text-muted-foreground block text-[10px] sm:text-[11px] truncate">Target Saldo</span>
                                    <span className="font-mono font-bold text-foreground text-xs sm:text-sm">
                                        {formatMoney(targetBaselineCents)}
                                    </span>
                                </div>
                            )}

                            <div className="hidden sm:block">
                                <span className="text-muted-foreground block text-[11px] truncate">
                                    {currentType === 'KAS_BESAR' ? 'Expected In Safe' : 'Target Plafon'}
                                </span>
                                <span className="font-mono font-bold text-foreground text-sm">
                                    {formatMoney(targetBaselineCents)}
                                </span>
                            </div>
                        </div>

                        {/* Prominent Live Variance Result & Actions */}
                        <div className="flex items-center gap-3 sm:gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-border">
                            <div className="text-left md:text-right">
                                <div className="flex items-center gap-1.5 justify-start md:justify-end">
                                    <span className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold uppercase">
                                        Outstanding
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
                                        {liveOutstandingVarianceCents > 0 ? '+' : ''}
                                        {formatMoney(liveOutstandingVarianceCents)}
                                    </span>
                                </div>
                            </div>

                            {/* Action buttons based on Role and Workflow State */}
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
                                {/* SAC: Submit to SS */}
                                {canSubmit && (
                                    <Button
                                        onClick={() => setShowSubmitModal(true)}
                                        disabled={isKasBesarSubmitBlocked}
                                        size="sm"
                                        title={
                                            isKasBesarSubmitBlocked
                                                ? 'Wajib melampirkan minimal 1 data Z-Report beserta foto bukti fisik struk'
                                                : undefined
                                        }
                                        className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-4 text-xs font-semibold shadow-xs disabled:opacity-50"
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
                                    <Badge
                                        variant="outline"
                                        className="h-10 px-3 border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold gap-1.5 text-xs"
                                    >
                                        <Lock className="w-3.5 h-3.5" />
                                        Terkunci Permanen
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Workflow Modals */}
            {/* Submit Confirmation Dialog */}
            <Dialog open={showSubmitModal} onOpenChange={setShowSubmitModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-foreground">
                            <Send className="w-5 h-5 text-blue-600" />
                            Ajukan Verifikasi Saksi
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground text-sm">
                            Sesi Cash Opname akan diteruskan ke Store Supervisor (SS) untuk menyaksikan dan memverifikasi fisik uang di brankas toko.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="bg-muted/40 p-4 rounded-lg border border-border text-xs space-y-2">
                        <div className="flex justify-between font-mono">
                            <span className="text-muted-foreground">Total Fisik:</span>
                            <span className="font-semibold text-foreground">{formatMoney(livePhysicalTotalCents)}</span>
                        </div>
                        {currentType === 'KAS_KECIL' && (
                            <>
                                <div className="flex justify-between font-mono">
                                    <span className="text-muted-foreground">Total Bon (K_bon):</span>
                                    <span className="font-semibold text-foreground">{formatMoney(vouchersTotalCents)}</span>
                                </div>
                                <div className="flex justify-between font-mono">
                                    <span className="text-muted-foreground">Mutasi Bersih BRI (K_bri):</span>
                                    <span className="font-semibold text-foreground">{formatMoney(liveBriCleanBalanceCents)}</span>
                                </div>
                            </>
                        )}
                        {currentType === 'KAS_BESAR' && (
                            <>
                                <div className="flex justify-between font-mono">
                                    <span className="text-muted-foreground">Z-Report Cash:</span>
                                    <span className="font-semibold text-foreground">{formatMoney(totalZReportCents)}</span>
                                </div>
                                <div className="flex justify-between font-mono">
                                    <span className="text-muted-foreground">Setoran Bank:</span>
                                    <span className="font-semibold text-foreground">-{formatMoney(totalDepositCents)}</span>
                                </div>
                            </>
                        )}
                        <div className="border-t border-border pt-2 flex justify-between font-mono font-bold text-sm">
                            <span>Outstanding Variance:</span>
                            <span className={liveVarianceStatus === 'BALANCED' ? 'text-emerald-600' : liveVarianceStatus === 'SURPLUS' ? 'text-indigo-600' : 'text-red-600'}>
                                {liveOutstandingVarianceCents > 0 ? '+' : ''}{formatMoney(liveOutstandingVarianceCents)}
                            </span>
                        </div>
                    </div>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                        * Catatan: Setelah diajukan, rincian fisik tidak dapat diubah kembali kecuali sesi ditolak ke Draft oleh saksi atau Store Manager.
                    </p>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setShowSubmitModal(false)} disabled={isSubmitting}>
                            Batal
                        </Button>
                        <Button onClick={handleSubmitSession} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
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
                        <DialogTitle className="flex items-center gap-2 text-foreground">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            Verifikasi Saksi Fisik Brankas
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground text-sm">
                            Sebagai Store Supervisor (SS), Anda bertindak sebagai saksi fisik dalam penghitungan uang kas di brankas toko.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="bg-emerald-50/60 dark:bg-emerald-950/40 p-4 rounded-lg border border-emerald-200 dark:border-emerald-900 text-xs space-y-2 text-emerald-900 dark:text-emerald-200">
                        <p className="font-semibold text-sm">Pernyataan Saksi Fisik:</p>
                        <p>
                            Dengan mengklik tombol verifikasi di bawah ini, saya menyatakan telah menyaksikan dan menghitung secara langsung seluruh kas fisik di brankas toko sesuai dengan rincian {formatMoney(livePhysicalTotalCents)}.
                        </p>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setShowVerifyModal(false)} disabled={isVerifying}>
                            Batal
                        </Button>
                        <Button onClick={handleVerifySession} disabled={isVerifying} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
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
                        <DialogTitle className="flex items-center gap-2 text-foreground">
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                            Persetujuan Final (Sign-Off SM)
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground text-sm">
                            Persetujuan ini akan mengunci seluruh nilai kas secara permanen (Rule 4: Immutable Snapshot).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="bg-muted/40 p-3.5 rounded-lg border border-border text-xs space-y-2 font-mono">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Fisik:</span>
                                <span className="font-semibold">{formatMoney(session?.physical_total_cents || livePhysicalTotalCents)}</span>
                            </div>
                            <div className="flex justify-between border-t border-border pt-1.5">
                                <span className="text-muted-foreground">Total Aktual:</span>
                                <span className="font-bold">{formatMoney(session?.total_actual_cents || liveTotalActualCents)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Target / Plafon:</span>
                                <span className="font-bold">{formatMoney(session?.imprest_fund_cents || targetBaselineCents)}</span>
                            </div>
                            <div className="flex justify-between border-t border-border pt-2 text-sm font-bold">
                                <span>Outstanding Variance:</span>
                                <span className={liveVarianceStatus === 'BALANCED' ? 'text-emerald-600' : liveVarianceStatus === 'SURPLUS' ? 'text-indigo-600' : 'text-red-600'}>
                                    {liveOutstandingVarianceCents > 0 ? '+' : ''}
                                    {formatMoney(liveOutstandingVarianceCents)} ({liveVarianceStatus})
                                </span>
                            </div>
                        </div>

                        <div className="text-xs text-muted-foreground space-y-1">
                            <div>Saksi Fisik: <strong>{session?.verified_by_ss?.name || 'SS'}</strong> {session?.verified_by_ss?.nik ? `(${session.verified_by_ss.nik})` : ''}</div>
                            <div>Waktu Saksi: <strong>{formatDate(session?.verified_ss_at)}</strong></div>
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
                            <Label htmlFor="confirm_understanding" className="text-xs text-foreground leading-snug cursor-pointer font-medium">
                                Saya menyatakan telah memeriksa seluruh rincian kas, memahami selisih yang terjadi, dan menyetujui penutupan sesi cash opname ini.
                            </Label>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setShowSignOffModal(false)} disabled={isSigningOff}>
                            Batal
                        </Button>
                        <Button
                            onClick={() => handleSignOffSession()}
                            disabled={isSigningOff || !confirmUnderstanding}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
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
                        <DialogDescription className="text-muted-foreground text-sm">
                            Sesi ini akan dikembalikan ke status DRAFT agar petugas kasir (SAC) dapat memperbaiki data fisik atau kelengkapan bukti.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="rejectReason" className="text-xs font-semibold text-foreground">
                                Alasan Penolakan <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                                id="rejectReason"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Contoh: Fisik uang pecahan Rp 100.000 kurang 1 lembar, atau bukti foto struk Z-Report buram..."
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
                            className="font-semibold"
                        >
                            <XCircle className="w-4 h-4 mr-1.5" />
                            {isRejecting ? 'Menolak...' : 'Kembalikan ke Draft'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Unsaved Changes Switch Confirmation */}
            <ConfirmDialog
                open={Boolean(pendingSwitchType)}
                onOpenChange={(open) => {
                    if (!open) setPendingSwitchType(null);
                }}
                title="Pindah Tipe Opname?"
                description="Ada perubahan data penghitungan kas yang belum disimpan. Jika Anda berpindah tipe opname sekarang, perubahan tersebut akan hilang."
                riskNote="Pastikan Anda telah mengklik tombol 'Simpan Pecahan' terlebih dahulu jika ingin mempertahankan data hitungan terkini."
                confirmText="Pindah Tanpa Menyimpan"
                cancelText="Tetap di Sini"
                variant="destructive"
                onConfirm={handleConfirmSwitchType}
            />
        </AppLayout>
    );
}

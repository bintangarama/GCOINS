import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    ShieldCheck,
    CheckCircle2,
    XCircle,
    Eye,
    TrendingUp,
    TrendingDown,
    Scale,
    AlertCircle,
    FileText,
} from 'lucide-react';
import { CashOpnameSession } from '@/types/opname';
import { formatMoney } from '@/lib/money';

interface MobileApprovalCardProps {
    session: CashOpnameSession;
    role: 'SS' | 'SM' | 'SAC' | string;
    canVerify?: boolean;
    canSignOff?: boolean;
    canRejectSs?: boolean;
    canRejectSm?: boolean;
    onVerify: () => void;
    onSignOff: (confirmUnderstanding: boolean, notes?: string) => void;
    onOpenRejectDialog: (role: 'SS' | 'SM') => void;
    disabled?: boolean;
}

export function MobileApprovalCard({
    session,
    role,
    canVerify = false,
    canSignOff = false,
    canRejectSs = false,
    canRejectSm = false,
    onVerify,
    onSignOff,
    onOpenRejectDialog,
    disabled = false,
}: MobileApprovalCardProps) {
    const [confirmUnderstanding, setConfirmUnderstanding] = useState(false);

    const isSsAction = role === 'SS' && canVerify;
    const isSmAction = role === 'SM' && canSignOff;

    if (!isSsAction && !isSmAction) {
        return null;
    }

    const varianceCents = session.outstanding_variance_cents ?? session.current_variance_cents ?? 0;
    const isBalanced = session.variance_status === 'BALANCED' || varianceCents === 0;
    const isSurplus = session.variance_status === 'SURPLUS' || varianceCents > 0;
    const isShortage = session.variance_status === 'SHORTAGE' || varianceCents < 0;

    return (
        <div className="block lg:hidden w-full my-4">
            <Card className="border border-border shadow-xs bg-card">
                <CardContent className="p-3.5 sm:p-4 space-y-3.5">
                    {/* Header: Title & Badges */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            <span className="text-xs font-bold text-foreground">
                                {isSsAction ? 'Verifikasi Saksi (SS)' : 'Persetujuan Final (SM)'}
                            </span>
                        </div>
                        <Badge
                            variant="outline"
                            className={`text-xs px-2.5 py-0.5 font-bold ${
                                isBalanced
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                    : isSurplus
                                    ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                                    : 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800'
                            }`}
                        >
                            {isBalanced ? 'BALANCED' : isSurplus ? 'LEBIH KAS' : 'SELISIH KURANG'}
                        </Badge>
                    </div>

                    {/* Compact Metrics */}
                    <div className="grid grid-cols-3 gap-2 py-2 px-2.5 rounded-xl bg-muted/40 border border-border text-center">
                        <div>
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                                Fisik
                            </span>
                            <span className="text-xs font-bold font-mono text-foreground">
                                {formatMoney(session.total_actual_cents)}
                            </span>
                        </div>
                        <div>
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                                Target
                            </span>
                            <span className="text-xs font-bold font-mono text-foreground">
                                {formatMoney(session.target_reconciled_cents || session.imprest_fund_cents)}
                            </span>
                        </div>
                        <div>
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                                Selisih
                            </span>
                            <span
                                className={`text-xs font-bold font-mono ${
                                    isBalanced
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : isSurplus
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : 'text-red-600 dark:text-red-400'
                                }`}
                            >
                                {formatMoney(varianceCents)}
                            </span>
                        </div>
                    </div>

                    {/* Single-Thumb Touch Checkbox for SM Sign-Off */}
                    {isSmAction && (
                        <Label
                            htmlFor="mobile-confirm-understanding"
                            className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer min-h-[52px] select-none ${
                                confirmUnderstanding
                                    ? 'bg-primary/5 border-primary/50'
                                    : 'bg-background border-border hover:bg-muted/30'
                            }`}
                        >
                            <Checkbox
                                id="mobile-confirm-understanding"
                                checked={confirmUnderstanding}
                                onCheckedChange={(val) => setConfirmUnderstanding(Boolean(val))}
                                className="mt-0.5 size-5 rounded-md"
                            />
                            <span className="text-xs leading-snug cursor-pointer font-medium text-foreground">
                                Saya telah memeriksa kebenaran fisik uang kas &amp; memahami angka selisih di atas.
                            </span>
                        </Label>
                    )}

                    {/* Action Buttons: 1 Tap Approval & Reject */}
                    <div className="flex items-center gap-2 pt-1">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={disabled}
                            onClick={() => onOpenRejectDialog(isSsAction ? 'SS' : 'SM')}
                            className="flex-1 h-11 text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10"
                        >
                            <XCircle className="h-4 w-4 mr-1 text-destructive" /> Tolak
                        </Button>

                        {isSsAction && (
                            <Button
                                type="button"
                                size="sm"
                                disabled={disabled}
                                onClick={onVerify}
                                className="flex-2 h-11 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                            >
                                <CheckCircle2 className="h-4 w-4 mr-1" /> Verifikasi Fisik (SS)
                            </Button>
                        )}

                        {isSmAction && (
                            <Button
                                type="button"
                                size="sm"
                                disabled={disabled || !confirmUnderstanding}
                                onClick={() => onSignOff(confirmUnderstanding)}
                                className="flex-2 h-11 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-50"
                            >
                                <ShieldCheck className="h-4 w-4 mr-1" /> Sign-Off Final (SM)
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

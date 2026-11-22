import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { AlertCircle, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatMoney } from '@/lib/money';

export interface CancelSettlementTarget {
    id: string;
    settlement_number: string;
    total_amount_cents: number;
    voucher_count?: number;
}

interface CancelSettlementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    settlement: CancelSettlementTarget | null;
}

export function CancelSettlementDialog({
    open,
    onOpenChange,
    settlement,
}: CancelSettlementDialogProps) {
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    if (!settlement) return null;

    const isReasonValid = reason.trim().length >= 5;

    const handleConfirm = () => {
        if (!isReasonValid) {
            setErrorMsg('Alasan pembatalan wajib diisi minimal 5 karakter.');
            return;
        }

        setErrorMsg('');
        setIsSubmitting(true);

        router.delete(`/vouchers/settlements/${settlement.id}`, {
            data: { reason: reason.trim() },
            preserveScroll: true,
            onSuccess: () => {
                onOpenChange(false);
                setReason('');
            },
            onError: (errors) => {
                setErrorMsg(errors.reason || 'Gagal membatalkan rekapitulasi. Pastikan Anda memiliki hak akses.');
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !isSubmitting && onOpenChange(val)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <RotateCcw className="size-5 shrink-0" />
                        <span>Batalkan Rekapitulasi Kas Kecil</span>
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-xs pt-1">
                        Dokumen rekapitulasi ini akan dibatalkan dan seluruh bon kas kecil di dalamnya akan dikembalikan ke status aktif.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Settlement Summary Box */}
                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3.5 space-y-2 text-xs">
                        <div className="flex justify-between items-center text-foreground font-medium">
                            <span className="text-muted-foreground">No. Rekap Invoice:</span>
                            <span className="font-mono font-semibold">{settlement.settlement_number}</span>
                        </div>
                        <div className="flex justify-between items-center text-foreground font-medium">
                            <span className="text-muted-foreground">Total Pengeluaran:</span>
                            <span className="font-bold text-destructive">
                                {formatMoney(settlement.total_amount_cents)}
                            </span>
                        </div>
                        {typeof settlement.voucher_count === 'number' && (
                            <div className="flex justify-between items-center text-foreground font-medium">
                                <span className="text-muted-foreground">Jumlah Voucher:</span>
                                <span className="font-semibold">{settlement.voucher_count} Transaksi</span>
                            </div>
                        )}
                        <p className="text-[11px] text-muted-foreground leading-relaxed pt-1 border-t border-destructive/10">
                            <strong>Dampak Kas:</strong> Seluruh voucher akan kembali berstatus{' '}
                            <code className="text-destructive font-semibold">DISBURSED</code> dan otomatis masuk kembali ke perhitungan{' '}
                            <strong>Kantong 2 (K_bon)</strong> pada Cash Opname harian toko.
                        </p>
                    </div>

                    {/* Reason Field */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="cancel-reason" className="text-xs font-semibold text-foreground">
                                Alasan Pembatalan <span className="text-destructive">*</span>
                            </Label>
                            <span className="text-[11px] text-muted-foreground">
                                Min. 5 karakter ({reason.trim().length}/5)
                            </span>
                        </div>
                        <Textarea
                            id="cancel-reason"
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value);
                                if (errorMsg) setErrorMsg('');
                            }}
                            placeholder="Contoh: Kesalahan input nominal kas / revisi lampiran bon..."
                            className="text-xs min-h-[75px]"
                            disabled={isSubmitting}
                        />
                        {errorMsg && (
                            <p className="text-[11px] text-destructive flex items-center gap-1 font-medium">
                                <AlertCircle className="size-3.5 shrink-0" />
                                {errorMsg}
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isSubmitting}
                        onClick={() => {
                            onOpenChange(false);
                            setReason('');
                            setErrorMsg('');
                        }}
                        className="text-xs"
                    >
                        Batal
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={!isReasonValid || isSubmitting}
                        onClick={handleConfirm}
                        className="text-xs gap-1.5 shadow-xs"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="size-3.5 animate-spin" />
                                Membatalkan...
                            </>
                        ) : (
                            <>
                                <RotateCcw className="size-3.5" />
                                Ya, Batalkan Rekap
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

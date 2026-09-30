import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PageHeader } from '@/components/shared/PageHeader';
import { BriFundPosting } from '@/types/bri';
import { PageProps } from '@/types/auth';
import { formatMoney } from '@/lib/money';
import {
    CheckCircle2,
    XCircle,
    Shield,
    ArrowUpRight,
    Image,
    Coins,
    User as UserIcon,
    AlertTriangle,
} from 'lucide-react';

interface BriFundPendingProps {
    pendingPostings: BriFundPosting[];
}

export default function BriFundPending({ pendingPostings }: BriFundPendingProps) {
    const { auth } = usePage<PageProps>().props;
    const currentUser = auth.user;

    const [selectedPosting, setSelectedPosting] = useState<BriFundPosting | null>(null);
    const [postingToApprove, setPostingToApprove] = useState<BriFundPosting | null>(null);
    const [rejectDialogOpen, setRejectDialogOpen] = useState<boolean>(false);
    const [rejectionReason, setRejectionReason] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);

    const handleConfirmApprove = () => {
        if (!postingToApprove) return;

        setIsSubmitting(true);
        router.post(
            `/bri-funds/${postingToApprove.id}/approve`,
            {},
            {
                onSuccess: () => setPostingToApprove(null),
                onFinish: () => setIsSubmitting(false),
            }
        );
    };

    const handleRejectSubmit = () => {
        if (!selectedPosting || !rejectionReason.trim()) return;

        setIsSubmitting(true);
        router.post(
            `/bri-funds/${selectedPosting.id}/reject`,
            { rejection_reason: rejectionReason.trim() },
            {
                onSuccess: () => {
                    setRejectDialogOpen(false);
                    setSelectedPosting(null);
                    setRejectionReason('');
                },
                onFinish: () => setIsSubmitting(false),
            }
        );
    };

    const isSupervisorOrManager = currentUser && ['SS', 'SM'].includes(currentUser.role);

    return (
        <AppLayout title="Antrean Persetujuan Pengeluaran BRI">
            <Head title="Antrean Persetujuan Pengeluaran BRI — Dual Control" />

            <div className="flex flex-col gap-6 max-w-7xl">
                <PageHeader
                    title="Antrean Persetujuan Pengeluaran Dana BRI"
                    description="Persetujuan pengeluaran (OUTFLOW) oleh Supervisor atau Manager untuk memotong saldo berjalan bank"
                    icon={Shield}
                >
                    <Button asChild variant="outline" size="sm">
                        <Link href="/bri-funds">Overview Saldo</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                        <Link href="/bri-funds/postings">Semua Riwayat</Link>
                    </Button>
                </PageHeader>

                {/* Dual Control Information Alert */}
                <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                    <Shield className="size-4 text-amber-600 dark:text-amber-400" />
                    <AlertTitle className="font-semibold text-amber-900 dark:text-amber-200">
                        Aturan Dual Control & Zero-Deficit Guard:
                    </AlertTitle>
                    <AlertDescription className="text-amber-800 dark:text-amber-300/90 text-xs leading-relaxed">
                        <span>
                            1. <strong>Dual Control:</strong> Petugas yang membuat pengajuan (creator) dilarang menyetujui pengajuannya sendiri. Persetujuan wajib dilakukan oleh Supervisor (SS) atau Store Manager (SM) lain.
                        </span>
                        <br />
                        <span>
                            2. <strong>Zero-Deficit Guard:</strong> Sistem memverifikasi kembali saldo berjalan saat tombol persetujuan ditekan. Pengeluaran yang melebihi saldo berjalan tidak dapat disetujui.
                        </span>
                    </AlertDescription>
                </Alert>

                {/* Queue List */}
                {pendingPostings.length === 0 ? (
                    <Card className="border-dashed border-2 p-12 text-center">
                        <div className="mx-auto size-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                            <CheckCircle2 className="size-6" />
                        </div>
                        <h3 className="text-base font-semibold text-foreground">Tidak Ada Antrean Persetujuan</h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                            Semua pengajuan pengeluaran dana BRI telah diproses. Antrean baru akan muncul saat petugas mencatat mutasi OUTFLOW.
                        </p>
                        <div className="mt-4">
                            <Button asChild size="sm" variant="outline">
                                <Link href="/bri-funds">Kembali ke Overview Saldo</Link>
                            </Button>
                        </div>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {pendingPostings.map((posting) => {
                            const isCreator = currentUser?.id === posting.created_by_id;
                            const isSufficient = posting.is_balance_sufficient !== false;
                            const currentBalance = posting.current_entity_balance_cents ?? 0;
                            const canApprove = isSupervisorOrManager && !isCreator && isSufficient;

                            return (
                                <Card key={posting.id} className="border-border hover:shadow-md transition-all overflow-hidden">
                                    <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                                        {/* Left Details */}
                                        <div className="flex flex-col gap-2 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold gap-1 text-xs">
                                                    <ArrowUpRight className="size-3.5" />
                                                    OUTFLOW
                                                </Badge>
                                                <Badge variant="outline" className="font-mono text-xs">
                                                    {posting.category}
                                                </Badge>
                                                <StatusBadge status={posting.status} />
                                                <span className="text-xs text-muted-foreground font-mono">
                                                    {new Date(posting.created_at).toLocaleDateString('id-ID', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </span>
                                            </div>

                                            <div>
                                                <h3 className="text-lg font-bold text-foreground">
                                                    {posting.entity_name}
                                                </h3>
                                                {posting.custom_category_name && (
                                                    <span className="text-xs text-muted-foreground block">
                                                        Kategori Khusus: {posting.custom_category_name}
                                                    </span>
                                                )}
                                                <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                                                    <strong>Tujuan / Rekening:</strong> {posting.purpose}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                                                <UserIcon className="size-3.5" />
                                                <span>Diajukan oleh: <strong>{posting.created_by?.name}</strong> ({posting.created_by?.role})</span>
                                                {posting.proof_attachment_url && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedProofUrl(posting.proof_attachment_url)}
                                                        className="text-primary hover:underline ml-2 inline-flex items-center gap-1 font-medium cursor-pointer"
                                                    >
                                                        <Image className="size-3.5" />
                                                        Lihat Bukti Slip
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Financial & Guard Box */}
                                        <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 p-4 rounded-xl bg-muted/40 border border-border/60 min-w-[280px]">
                                            <div>
                                                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                                                    Nominal Pengeluaran
                                                </span>
                                                <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                                                    {formatMoney(posting.amount_cents)}
                                                </span>
                                            </div>

                                            <div className="text-left sm:text-right lg:text-right border-t sm:border-t-0 lg:border-t border-border/40 pt-2 sm:pt-0 lg:pt-2 w-full">
                                                <div className="flex items-center sm:justify-end gap-1.5 text-xs text-muted-foreground">
                                                    <Coins className="size-3.5 text-primary" />
                                                    <span>Saldo Entitas:</span>
                                                    <strong className="font-mono text-foreground">{formatMoney(currentBalance)}</strong>
                                                </div>

                                                {!isSufficient && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive mt-1">
                                                        <AlertTriangle className="size-3.5" />
                                                        Defisit! Saldo tidak mencukupi
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Buttons & Guard Badges */}
                                        <div className="flex flex-row lg:flex-col items-center lg:items-end justify-end gap-2 border-t lg:border-t-0 pt-3 lg:pt-0">
                                            {isCreator ? (
                                                <div className="text-right">
                                                    <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs py-1">
                                                        Dual Control: Anda pembuat pengajuan
                                                    </Badge>
                                                    <span className="text-[10px] text-muted-foreground block mt-1">
                                                        Menunggu persetujuan SS/SM lain
                                                    </span>
                                                </div>
                                            ) : !isSupervisorOrManager ? (
                                                <Badge variant="outline" className="text-muted-foreground text-xs py-1">
                                                    Hanya SS / SM yang dapat menyetujui
                                                </Badge>
                                            ) : (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => setPostingToApprove(posting)}
                                                        disabled={!canApprove || isSubmitting}
                                                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
                                                    >
                                                        <CheckCircle2 className="size-4" />
                                                        Setujui Outflow
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSelectedPosting(posting);
                                                            setRejectDialogOpen(true);
                                                        }}
                                                        disabled={isSubmitting}
                                                        className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 text-xs"
                                                    >
                                                        <XCircle className="size-4" />
                                                        Tolak
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Approval Confirmation Dialog */}
            <Dialog open={!!postingToApprove} onOpenChange={(open) => !open && setPostingToApprove(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                            <CheckCircle2 className="size-5 text-emerald-600" />
                            Konfirmasi Persetujuan Pengeluaran
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Persetujuan pengeluaran ini akan langsung memotong saldo berjalan sub-ledger entitas dan dicatat dalam audit trail.
                        </DialogDescription>
                    </DialogHeader>

                    {postingToApprove && (
                        <div className="flex flex-col gap-3 py-2 text-xs">
                            <div className="p-3.5 rounded-lg bg-muted/60 border border-border/60 flex flex-col gap-1.5">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Entitas:</span>
                                    <strong className="text-foreground">{postingToApprove.entity_name} ({postingToApprove.category})</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Nominal:</span>
                                    <strong className="text-amber-600 dark:text-amber-400 font-mono text-sm">{formatMoney(postingToApprove.amount_cents)}</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Tujuan:</span>
                                    <span className="text-foreground truncate max-w-[200px]">{postingToApprove.purpose}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Pemohon:</span>
                                    <span className="text-foreground">{postingToApprove.created_by?.name}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isSubmitting}
                            onClick={() => setPostingToApprove(null)}
                        >
                            Batal
                        </Button>
                        <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                            disabled={isSubmitting}
                            onClick={handleConfirmApprove}
                        >
                            {isSubmitting ? 'Memproses...' : 'Ya, Setujui Pengeluaran'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Rejection Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-destructive flex items-center gap-2">
                            <XCircle className="size-5" />
                            Tolak Pengeluaran Dana BRI
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Masukkan alasan penolakan secara jelas. Alasan penolakan bersifat wajib dan akan dicatat dalam audit trail.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedPosting && (
                        <div className="flex flex-col gap-4 py-2">
                            <div className="p-3 rounded-lg bg-muted text-xs flex flex-col gap-1">
                                <div><strong>Entitas:</strong> {selectedPosting.entity_name} ({selectedPosting.category})</div>
                                <div><strong>Nominal:</strong> {formatMoney(selectedPosting.amount_cents)}</div>
                                <div><strong>Pemohon:</strong> {selectedPosting.created_by?.name}</div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-foreground">
                                    Alasan Penolakan <span className="text-destructive">*</span>
                                </label>
                                <Textarea
                                    rows={3}
                                    placeholder="Contoh: Bukti transfer tidak jelas / nomor rekening tujuan tidak sesuai SPK..."
                                    value={rejectionReason}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectionReason(e.target.value)}
                                    className="text-xs"
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setRejectDialogOpen(false);
                                setSelectedPosting(null);
                                setRejectionReason('');
                            }}
                        >
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            disabled={!rejectionReason.trim() || isSubmitting}
                            onClick={handleRejectSubmit}
                        >
                            {isSubmitting ? 'Memproses...' : 'Konfirmasi Penolakan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Proof Modal */}
            <Dialog open={!!selectedProofUrl} onOpenChange={() => setSelectedProofUrl(null)}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold">Bukti Transfer / Mutasi Bank</DialogTitle>
                    </DialogHeader>
                    {selectedProofUrl && (
                        <div className="p-2 bg-muted/40 rounded-lg flex items-center justify-center">
                            <img
                                src={selectedProofUrl}
                                alt="Bukti Mutasi"
                                className="max-h-[70vh] object-contain rounded"
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

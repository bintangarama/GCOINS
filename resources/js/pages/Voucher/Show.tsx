import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle,
    XCircle,
    Banknote,
    Clock,
    FileText,
    Trash2,
    Send,
    ZoomIn,
    RotateCcw,
    ShieldAlert,
    AlertCircle,
    User as UserIcon,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatMoney } from '@/lib/money';
import { PettyCashVoucher } from '@/types/voucher';

interface VoucherShowProps {
    voucher: PettyCashVoucher;
    can: {
        update: boolean;
        delete: boolean;
        submit: boolean;
        approve: boolean;
        reject: boolean;
        disburse: boolean;
        settle: boolean;
        cancel: boolean;
        refund: boolean;
    };
}

export default function VoucherShowPage({ voucher, can }: VoucherShowProps) {
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [cancellationReason, setCancellationReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAction = (endpoint: string, data?: Record<string, any>, onSuccess?: () => void) => {
        setIsSubmitting(true);
        router.post(
            `/vouchers/${voucher.id}/${endpoint}`,
            (data || {}) as any,
            {
                onSuccess: () => {
                    setIsSubmitting(false);
                    if (onSuccess) onSuccess();
                },
                onError: () => setIsSubmitting(false),
            }
        );
    };

    const handleDelete = () => {
        if (confirm('Yakin ingin menghapus draft voucher ini?')) {
            router.delete(`/vouchers/${voucher.id}`);
        }
    };

    return (
        <AppLayout
            title={`Voucher ${voucher.voucher_number}`}
            breadcrumbs={[
                { title: 'Dashboard', href: '/dashboard' },
                { title: 'Bon Kas Kecil', href: '/vouchers' },
                { title: voucher.voucher_number, href: `/vouchers/${voucher.id}` },
            ]}
        >
            <Head title={`Voucher ${voucher.voucher_number}`} />

            <div className="max-w-5xl flex flex-col gap-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
                    <div className="flex items-center gap-3">
                        <Button asChild variant="ghost" size="icon" className="size-9">
                            <Link href="/vouchers">
                                <ArrowLeft className="size-4" />
                            </Link>
                        </Button>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h1 className="text-xl font-bold font-mono tracking-tight text-foreground">
                                    {voucher.voucher_number}
                                </h1>
                                <StatusBadge status={voucher.status} />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Dibuat pada {new Date(voucher.created_at).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })} WIB
                            </p>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center gap-2">
                        {can.delete && (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleDelete}
                                className="text-xs h-8 gap-1.5"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Hapus Draft
                            </Button>
                        )}

                        {can.submit && (
                            <Button
                                size="sm"
                                disabled={isSubmitting}
                                onClick={() => handleAction('submit')}
                                className="text-xs h-8 gap-1.5"
                            >
                                <Send className="w-3.5 h-3.5" />
                                Ajukan Voucher
                            </Button>
                        )}

                        {can.approve && (
                            <Button
                                size="sm"
                                disabled={isSubmitting}
                                onClick={() => handleAction('approve')}
                                className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Setujui (Approve)
                            </Button>
                        )}

                        {can.reject && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setRejectDialogOpen(true)}
                                className="text-xs h-8 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                            >
                                <XCircle className="w-3.5 h-3.5" />
                                Tolak (Reject)
                            </Button>
                        )}

                        {can.disburse && (
                            <Button
                                size="sm"
                                disabled={isSubmitting}
                                onClick={() => handleAction('disburse')}
                                className="text-xs h-8 gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                <Banknote className="w-3.5 h-3.5" />
                                Cairkan Kas (Disburse)
                            </Button>
                        )}

                        {can.cancel && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCancelDialogOpen(true)}
                                className="text-xs h-8 gap-1.5 text-orange-600 border-orange-300 hover:bg-orange-50"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Batalkan (Refund Kasir)
                            </Button>
                        )}

                        {can.refund && (
                            <Button
                                size="sm"
                                disabled={isSubmitting}
                                onClick={() => handleAction('refund')}
                                className="text-xs h-8 gap-1.5 bg-slate-700 hover:bg-slate-800 text-white"
                            >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Konfirmasi Pengembalian Kas
                            </Button>
                        )}
                    </div>
                </div>

                {/* Rejection / Cancellation alerts if any */}
                {voucher.rejection_reason && (
                    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3.5 text-xs text-destructive flex items-start gap-2.5">
                        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-semibold">Catatan / Alasan: </span>
                            {voucher.rejection_reason}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Column: Details & Photos */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Details */}
                        <Card className="border shadow-sm">
                            <CardHeader className="pb-3 border-b">
                                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                                    <span>Informasi Pengeluaran</span>
                                    <span className="text-lg font-bold font-mono text-primary">
                                        {formatMoney(voucher.amount_cents)}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3.5 text-xs">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-muted-foreground">Kategori</span>
                                        <p className="font-mono font-medium mt-0.5">{voucher.category}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Pemohon</span>
                                        <p className="font-medium mt-0.5">
                                            {voucher.requester?.name} ({voucher.requester?.nik})
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <span className="text-muted-foreground">Keperluan / Keterangan</span>
                                    <p className="mt-1 p-2.5 rounded bg-muted/40 border text-foreground leading-relaxed">
                                        {voucher.purpose}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Photos */}
                        <Card className="border shadow-sm">
                            <CardHeader className="pb-3 border-b">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-primary" />
                                    Bukti & Dokumentasi Fisik
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Receipt Photo */}
                                <div className="space-y-2">
                                    <span className="text-xs font-semibold text-foreground">
                                        Kuitansi / Struk Pembayaran
                                    </span>
                                    {voucher.receipt_image_url ? (
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <div className="relative group cursor-pointer border rounded-lg overflow-hidden bg-muted/20 aspect-video flex items-center justify-center">
                                                    <img
                                                        src={voucher.receipt_image_url}
                                                        alt="Receipt"
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-medium">
                                                        <ZoomIn className="w-4 h-4" />
                                                        Perbesar
                                                    </div>
                                                </div>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-3xl p-2 bg-background/95">
                                                <img
                                                    src={voucher.receipt_image_url}
                                                    alt="Enlarged Receipt"
                                                    className="w-full max-h-[80vh] object-contain rounded-md"
                                                />
                                            </DialogContent>
                                        </Dialog>
                                    ) : (
                                        <div className="border border-dashed rounded-lg p-6 text-center text-xs text-muted-foreground aspect-video flex items-center justify-center">
                                            Tidak ada bukti struk
                                        </div>
                                    )}
                                </div>

                                {/* Item Photo */}
                                <div className="space-y-2">
                                    <span className="text-xs font-semibold text-foreground">
                                        Foto Barang / Pengiriman
                                    </span>
                                    {voucher.item_photo_url ? (
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <div className="relative group cursor-pointer border rounded-lg overflow-hidden bg-muted/20 aspect-video flex items-center justify-center">
                                                    <img
                                                        src={voucher.item_photo_url}
                                                        alt="Item"
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-medium">
                                                        <ZoomIn className="w-4 h-4" />
                                                        Perbesar
                                                    </div>
                                                </div>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-3xl p-2 bg-background/95">
                                                <img
                                                    src={voucher.item_photo_url}
                                                    alt="Enlarged Item"
                                                    className="w-full max-h-[80vh] object-contain rounded-md"
                                                />
                                            </DialogContent>
                                        </Dialog>
                                    ) : (
                                        <div className="border border-dashed rounded-lg p-6 text-center text-xs text-muted-foreground aspect-video flex items-center justify-center">
                                            Tidak ada foto barang
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Timeline & Audit Trail */}
                    <div className="space-y-6">
                        {/* Timeline */}
                        <Card className="border shadow-sm">
                            <CardHeader className="pb-3 border-b">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-primary" />
                                    Jejak Proses
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                <div className="relative border-l border-border pl-4 space-y-4 text-xs">
                                    {/* Created */}
                                    <div className="relative">
                                        <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-primary" />
                                        <p className="font-semibold text-foreground">Voucher Dibuat</p>
                                        <p className="text-muted-foreground text-[11px]">
                                            Oleh {voucher.requester?.name} ({voucher.requester?.role})
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {new Date(voucher.created_at).toLocaleString('id-ID')}
                                        </p>
                                    </div>

                                    {/* Approved */}
                                    {voucher.approved_at && (
                                        <div className="relative">
                                            <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                            <p className="font-semibold text-foreground">Disetujui</p>
                                            <p className="text-muted-foreground text-[11px]">
                                                Oleh {voucher.approved_by?.name} ({voucher.approved_by?.role})
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {new Date(voucher.approved_at).toLocaleString('id-ID')}
                                            </p>
                                        </div>
                                    )}

                                    {/* Disbursed */}
                                    {voucher.disbursed_at && (
                                        <div className="relative">
                                            <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-purple-500" />
                                            <p className="font-semibold text-foreground">Kas Dicairkan (K_bon)</p>
                                            <p className="text-muted-foreground text-[11px]">
                                                Oleh {voucher.disbursed_by?.name} (SAC)
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {new Date(voucher.disbursed_at).toLocaleString('id-ID')}
                                            </p>
                                        </div>
                                    )}

                                    {/* Settled */}
                                    {voucher.settled_at && (
                                        <div className="relative">
                                            <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-green-600" />
                                            <p className="font-semibold text-foreground">Selesai (Settled)</p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {new Date(voucher.settled_at).toLocaleString('id-ID')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Audit Logs list */}
                        {voucher.audit_logs && voucher.audit_logs.length > 0 && (
                            <Card className="border shadow-sm">
                                <CardHeader className="pb-2 border-b">
                                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                                        Audit Trail ({voucher.audit_logs.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 divide-y divide-border text-[11px]">
                                    {voucher.audit_logs.map((log) => (
                                        <div key={log.id} className="py-2 first:pt-0 last:pb-0 space-y-0.5">
                                            <div className="flex justify-between items-center font-mono font-medium">
                                                <span>{log.action}</span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {log.performed_by?.name || 'User'}
                                                </span>
                                            </div>
                                            {log.ip_address && (
                                                <p className="text-[10px] text-muted-foreground">IP: {log.ip_address}</p>
                                            )}
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>

            {/* Reject Modal */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-base text-destructive">Tolak Pengajuan Voucher</DialogTitle>
                        <DialogDescription className="text-xs">
                            Masukkan alasan penolakan secara jelas. Alasan ini akan tercatat dalam audit log dan disampaikan ke pemohon.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label htmlFor="reason" className="text-xs font-semibold">
                            Alasan Penolakan <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="reason"
                            placeholder="Contoh: Kuitansi tidak ada stempel toko atau nominal buram"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="text-xs"
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRejectDialogOpen(false)}
                            className="text-xs"
                        >
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            disabled={!rejectionReason.trim() || isSubmitting}
                            onClick={() =>
                                handleAction('reject', { reason: rejectionReason }, () =>
                                    setRejectDialogOpen(false)
                                )
                            }
                            className="text-xs"
                        >
                            Konfirmasi Tolak
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cancel Modal */}
            <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-base text-orange-600">
                            Batalkan Voucher Setelah Pencairan
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Pembatalan ini menandai bahwa uang kas kecil telah dikeluarkan tetapi transaksi dibatalkan. Staf pemohon wajib mengembalikan uang fisik ke kasir.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label htmlFor="cancelReason" className="text-xs font-semibold">
                            Alasan Pembatalan <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="cancelReason"
                            placeholder="Contoh: Barang diretur ke toko atau pesanan dibatalkan"
                            value={cancellationReason}
                            onChange={(e) => setCancellationReason(e.target.value)}
                            className="text-xs"
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCancelDialogOpen(false)}
                            className="text-xs"
                        >
                            Kembali
                        </Button>
                        <Button
                            size="sm"
                            disabled={!cancellationReason.trim() || isSubmitting}
                            onClick={() =>
                                handleAction('cancel', { reason: cancellationReason }, () =>
                                    setCancelDialogOpen(false)
                                )
                            }
                            className="text-xs bg-orange-600 hover:bg-orange-700 text-white"
                        >
                            Batalkan & Tagih Refund
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

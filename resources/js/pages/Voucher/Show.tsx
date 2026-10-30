import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
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
    Pencil,
    Undo2,
    Tags,
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
import { PageHeader } from '@/components/shared/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ReclassifyCategoryDialog } from '@/components/shared/ReclassifyCategoryDialog';
import { formatMoney } from '@/lib/money';
import { PageProps } from '@/types/auth';
import { PettyCashCategoryItem, PettyCashVoucher } from '@/types/voucher';

interface VoucherShowProps {
    voucher: PettyCashVoucher;
    categories?: (string | PettyCashCategoryItem)[];
    can: {
        update: boolean;
        delete: boolean;
        submit: boolean;
        recall?: boolean;
        reclassifyCategory?: boolean;
        approve: boolean;
        reject: boolean;
        disburse: boolean;
        settle: boolean;
        cancel: boolean;
        refund: boolean;
    };
}

export default function VoucherShowPage({ voucher, categories = [], can }: VoucherShowProps) {
    const { auth } = usePage<PageProps>().props;
    const currentUser = auth.user;
    const isOwnSubmittedVoucher =
        voucher.status === 'SUBMITTED' &&
        Boolean(currentUser && currentUser.id === voucher.requester_id && ['SS', 'SAC', 'SM'].includes(currentUser.role));

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

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showRecallConfirm, setShowRecallConfirm] = useState(false);
    const [reclassifyDialogOpen, setReclassifyDialogOpen] = useState(false);

    const handleDelete = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        router.delete(`/vouchers/${voucher.id}`, {
            onSuccess: () => setShowDeleteConfirm(false),
        });
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
                <PageHeader
                    title={voucher.voucher_number}
                    description={`Dibuat pada ${new Date(voucher.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    })} WIB`}
                    backHref="/vouchers"
                    backLabel="Kembali ke Daftar Bon"
                    badge={<StatusBadge status={voucher.status} />}
                >
                    <div className="flex flex-wrap items-center gap-2">
                        {can.update && (
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="text-xs h-8 gap-1.5"
                            >
                                <Link href={`/vouchers/${voucher.id}/edit`}>
                                    <Pencil className="w-3.5 h-3.5" />
                                    Edit Draft
                                </Link>
                            </Button>
                        )}

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

                        {can.recall && (
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={isSubmitting}
                                onClick={() => setShowRecallConfirm(true)}
                                className="text-xs h-8 gap-1.5"
                            >
                                <Undo2 className="size-3.5" />
                                Tarik ke Draft
                            </Button>
                        )}

                        {can.reclassifyCategory && (
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={isSubmitting}
                                onClick={() => setReclassifyDialogOpen(true)}
                                className="text-xs h-8 gap-1.5"
                            >
                                <Tags className="size-3.5" />
                                Ubah Kategori
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
                </PageHeader>

                {/* Anti Self-Approval notice when an approver views their own submitted voucher */}
                {isOwnSubmittedVoucher && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3.5 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                        <div>
                            <span className="font-semibold">Aturan Anti Self-Approval: </span>
                            Anda tidak dapat menyetujui atau menolak pengajuan bon yang Anda buat sendiri. Bon ini harus diverifikasi oleh approver lain ({currentUser?.role === 'SAC' ? 'SS atau SM' : 'SAC, SS lain, atau SM'}). Jika perlu merevisi data, klik <b>Tarik ke Draft</b>.
                        </div>
                    </div>
                )}

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
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <span className="text-muted-foreground">Tanggal Bon / Struk</span>
                                        <p className="font-medium mt-0.5 text-foreground">
                                            {voucher.receipt_date
                                                ? new Date(voucher.receipt_date).toLocaleDateString('id-ID', {
                                                      day: 'numeric',
                                                      month: 'long',
                                                      year: 'numeric',
                                                  })
                                                : new Date(voucher.created_at).toLocaleDateString('id-ID', {
                                                      day: 'numeric',
                                                      month: 'long',
                                                      year: 'numeric',
                                                  })}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Kategori</span>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <p className="font-mono font-medium">{voucher.category}</p>
                                            {can.reclassifyCategory && (
                                                <button
                                                    type="button"
                                                    onClick={() => setReclassifyDialogOpen(true)}
                                                    className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline cursor-pointer"
                                                    title="Ubah / reklasifikasi kategori biaya"
                                                >
                                                    <Pencil className="size-3" />
                                                    Ubah
                                                </button>
                                            )}
                                        </div>
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
                                {/* Receipt Photo / PDF */}
                                <div className="space-y-2">
                                    <span className="text-xs font-semibold text-foreground">
                                        Kuitansi / Struk Pembayaran
                                    </span>
                                    {voucher.receipt_image_url ? (
                                        voucher.receipt_image_url.toLowerCase().endsWith('.pdf') ? (
                                            <a
                                                href={voucher.receipt_image_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="border rounded-lg p-6 bg-red-50/40 dark:bg-red-950/20 hover:bg-red-50/80 transition-colors aspect-video flex flex-col items-center justify-center gap-2 text-red-600 dark:text-red-400"
                                            >
                                                <FileText className="w-8 h-8" />
                                                <span className="text-xs font-semibold">Buka Dokumen Kuitansi (PDF)</span>
                                            </a>
                                        ) : (
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
                                        )
                                    ) : (
                                        <div className="border border-dashed rounded-lg p-6 text-center text-xs text-muted-foreground aspect-video flex items-center justify-center">
                                            Tidak ada bukti struk
                                        </div>
                                    )}
                                </div>

                                {/* Item Photo / PDF */}
                                <div className="space-y-2">
                                    <span className="text-xs font-semibold text-foreground">
                                        Foto Barang / Pengiriman
                                    </span>
                                    {voucher.item_photo_url ? (
                                        voucher.item_photo_url.toLowerCase().endsWith('.pdf') ? (
                                            <a
                                                href={voucher.item_photo_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="border rounded-lg p-6 bg-red-50/40 dark:bg-red-950/20 hover:bg-red-50/80 transition-colors aspect-video flex flex-col items-center justify-center gap-2 text-red-600 dark:text-red-400"
                                            >
                                                <FileText className="w-8 h-8" />
                                                <span className="text-xs font-semibold">Buka Dokumen Lampiran (PDF)</span>
                                            </a>
                                        ) : (
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
                                        )
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

            <ConfirmDialog
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
                title="Hapus Draft Bon?"
                description={`Apakah Anda yakin ingin menghapus pengajuan bon kas kecil nomor ${voucher.voucher_number}?`}
                riskNote="Draft voucher yang dihapus tidak dapat dipulihkan kembali."
                confirmText="Hapus Draft"
                variant="destructive"
                onConfirm={confirmDelete}
            />

            <ConfirmDialog
                open={showRecallConfirm}
                onOpenChange={setShowRecallConfirm}
                title="Tarik Pengajuan Kembali ke Draft?"
                description={`Pengajuan bon ${voucher.voucher_number} akan dikembalikan ke status DRAFT agar Anda dapat merevisi kategori, nominal, maupun lampiran bukti, lalu mengajukannya kembali.`}
                confirmText="Ya, Tarik ke Draft"
                isLoading={isSubmitting}
                onConfirm={() =>
                    handleAction('recall', undefined, () => setShowRecallConfirm(false))
                }
            />

            <ReclassifyCategoryDialog
                open={reclassifyDialogOpen}
                onOpenChange={setReclassifyDialogOpen}
                voucher={voucher}
                categories={categories}
            />
        </AppLayout>
    );
}

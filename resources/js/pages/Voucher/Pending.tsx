import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    Clock,
    CheckCircle,
    XCircle,
    Eye,
    ShieldAlert,
    AlertCircle,
    Check,
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
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
    DataTable,
    DataTableHead,
    DataTableHeaderCell,
    DataTableBody,
    DataTableRow,
    DataTableCell,
    DataTableEmpty,
} from '@/components/shared/DataTable';
import { formatMoney } from '@/lib/money';
import { PaginatedVouchers, PettyCashVoucher } from '@/types/voucher';

interface PendingApprovalsProps {
    vouchers: PaginatedVouchers;
    currentUserId: string;
    currentUserRole: string;
}

export default function PendingApprovalsPage({
    vouchers,
    currentUserId,
    currentUserRole,
}: PendingApprovalsProps) {
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState<PettyCashVoucher | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleApprove = (voucher: PettyCashVoucher) => {
        setIsProcessing(true);
        router.post(`/vouchers/${voucher.id}/approve`, {}, {
            onFinish: () => setIsProcessing(false),
        });
    };

    const handleReject = () => {
        if (!selectedVoucher || !rejectionReason.trim()) return;

        setIsProcessing(true);
        router.post(
            `/vouchers/${selectedVoucher.id}/reject`,
            { reason: rejectionReason },
            {
                onSuccess: () => {
                    setRejectDialogOpen(false);
                    setSelectedVoucher(null);
                    setRejectionReason('');
                },
                onFinish: () => setIsProcessing(false),
            }
        );
    };

    return (
        <AppLayout title="Antrean Persetujuan Voucher">
            <Head title="Antrean Persetujuan Voucher" />

            <div className="space-y-6">
                <PageHeader
                    title="Antrean Persetujuan Voucher"
                    icon={Clock}
                    description="Voucher kas kecil yang diajukan dan menunggu verifikasi serta persetujuan"
                >
                    <span className="text-xs font-semibold px-3 py-1 bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-full">
                        {vouchers.total} Menunggu Persetujuan
                    </span>
                </PageHeader>

                {/* Anti self-approval alert reminder if SAC */}
                {currentUserRole === 'SAC' && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2.5">
                        <AlertCircle className="w-4 h-4 shrink-0 text-blue-600" />
                        <span>
                            <b>Aturan Anti Self-Approval:</b> Sebagai SAC, Anda tidak dapat menyetujui pengajuan voucher yang Anda buat sendiri. Voucher milik Anda harus disetujui oleh Supervisor (SS) atau Store Manager (SM).
                        </span>
                    </div>
                )}

                {/* Table */}
                <Card className="border shadow-sm overflow-hidden">
                    <DataTable>
                        <DataTableHead>
                            <tr>
                                <DataTableHeaderCell>No. Voucher</DataTableHeaderCell>
                                <DataTableHeaderCell>Tanggal Diajukan</DataTableHeaderCell>
                                <DataTableHeaderCell>Pemohon</DataTableHeaderCell>
                                <DataTableHeaderCell>Kategori</DataTableHeaderCell>
                                <DataTableHeaderCell>Keperluan</DataTableHeaderCell>
                                <DataTableHeaderCell align="right">Nominal</DataTableHeaderCell>
                                <DataTableHeaderCell align="center">Status Anti-Self</DataTableHeaderCell>
                                <DataTableHeaderCell align="center">Aksi Cepat</DataTableHeaderCell>
                            </tr>
                        </DataTableHead>
                        <DataTableBody>
                            {vouchers.data.length === 0 ? (
                                <DataTableEmpty
                                    colSpan={8}
                                    icon={<Check className="w-10 h-10 text-emerald-500 stroke-1" />}
                                    message="Semua voucher telah diproses"
                                    description="Tidak ada antrean voucher yang menunggu verifikasi atau persetujuan saat ini."
                                    action={
                                        <Link href="/vouchers">
                                            <Button variant="outline" size="sm" className="text-xs h-8">
                                                Lihat Riwayat Voucher
                                            </Button>
                                        </Link>
                                    }
                                />
                            ) : (
                                vouchers.data.map((v) => {
                                    const isSelfApprovalBlocked =
                                        currentUserRole === 'SAC' && v.requester_id === currentUserId;

                                    return (
                                        <DataTableRow key={v.id}>
                                            <DataTableCell className="font-mono font-semibold text-primary">
                                                {v.voucher_number}
                                            </DataTableCell>
                                            <DataTableCell className="text-muted-foreground whitespace-nowrap">
                                                {new Date(v.created_at).toLocaleDateString('id-ID', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                })}
                                            </DataTableCell>
                                            <DataTableCell>
                                                <div className="font-medium text-foreground">{v.requester?.name}</div>
                                                <div className="text-[10px] text-muted-foreground font-mono">
                                                    {v.requester?.nik} ({v.requester?.role})
                                                </div>
                                            </DataTableCell>
                                            <DataTableCell>
                                                <span className="font-mono text-[11px] bg-muted px-2 py-0.5 rounded">
                                                    {v.category}
                                                </span>
                                            </DataTableCell>
                                            <DataTableCell className="max-w-xs truncate text-muted-foreground" title={v.purpose}>
                                                {v.purpose}
                                            </DataTableCell>
                                            <DataTableCell align="right" mono className="font-bold text-foreground whitespace-nowrap">
                                                {formatMoney(v.amount_cents)}
                                            </DataTableCell>
                                            <DataTableCell align="center" className="whitespace-nowrap">
                                                {isSelfApprovalBlocked ? (
                                                    <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                                        <ShieldAlert className="w-3 h-3" />
                                                        Milik Sendiri (Perlu SS/SM)
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                                                        Siap Diverifikasi
                                                    </span>
                                                )}
                                            </DataTableCell>
                                            <DataTableCell align="center" className="whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <Link href={`/vouchers/${v.id}`}>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 px-2 text-xs"
                                                            title="Buka Detail"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </Link>

                                                    {!isSelfApprovalBlocked && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                disabled={isProcessing}
                                                                onClick={() => handleApprove(v)}
                                                                className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                                            >
                                                                <CheckCircle className="w-3.5 h-3.5" />
                                                                Setujui
                                                            </Button>

                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                disabled={isProcessing}
                                                                onClick={() => {
                                                                    setSelectedVoucher(v);
                                                                    setRejectDialogOpen(true);
                                                                }}
                                                                className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                                                            >
                                                                <XCircle className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </DataTableCell>
                                        </DataTableRow>
                                    );
                                })
                            )}
                        </DataTableBody>
                    </DataTable>
                </Card>
            </div>

            {/* Reject Modal */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-base text-destructive">Tolak Pengajuan Voucher</DialogTitle>
                        <DialogDescription className="text-xs">
                            Masukkan alasan penolakan untuk voucher{' '}
                            <b>{selectedVoucher?.voucher_number}</b>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label htmlFor="reason" className="text-xs font-semibold">
                            Alasan Penolakan <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="reason"
                            placeholder="Alasan penolakan..."
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
                            disabled={!rejectionReason.trim() || isProcessing}
                            onClick={handleReject}
                            className="text-xs"
                        >
                            Konfirmasi Tolak
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

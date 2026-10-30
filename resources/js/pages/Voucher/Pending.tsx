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
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
    DataTable,
    DataTableHead,
    DataTableHeaderCell,
    DataTableBody,
    DataTableRow,
    DataTableCell,
    DataTableEmpty,
    DataTableMobileList,
    DataTableMobileCard,
    DataTableBulkBar,
} from '@/components/shared/DataTable';
import { Pagination } from '@/components/shared/Pagination';
import { formatMoney } from '@/lib/money';
import { PaginatedVouchers, PettyCashVoucher } from '@/types/voucher';

interface PendingApprovalsProps {
    vouchers: PaginatedVouchers;
    currentUserId: string;
    currentUserRole: string;
    filters?: {
        sort?: string;
        direction?: 'asc' | 'desc';
    };
}

export default function PendingApprovalsPage({
    vouchers,
    currentUserId,
    currentUserRole,
    filters = { sort: 'created_at', direction: 'desc' },
}: PendingApprovalsProps) {
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState<PettyCashVoucher | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Eligible vouchers for approval (Rule 5: universal anti self-approval across all roles)
    const eligibleVouchers = vouchers.data.filter(
        (v) => v.requester_id !== currentUserId
    );
    const hasOwnPendingVoucher = vouchers.data.some((v) => v.requester_id === currentUserId);

    const isAllEligibleSelected =
        eligibleVouchers.length > 0 &&
        eligibleVouchers.every((v) => selectedIds.includes(v.id));

    const selectedTotalAmount = vouchers.data
        .filter((v) => selectedIds.includes(v.id))
        .reduce((sum, v) => sum + v.amount_cents, 0);

    const handleSelectAll = () => {
        if (isAllEligibleSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(eligibleVouchers.map((v) => v.id));
        }
    };

    const handleToggleRow = (id: string, isBlocked: boolean) => {
        if (isBlocked) return;
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleSort = (field: string) => {
        const isCurrent = filters?.sort === field;
        const nextDirection = isCurrent && filters?.direction === 'asc' ? 'desc' : 'asc';
        router.get(
            '/vouchers/pending',
            {
                ...filters,
                sort: field,
                direction: nextDirection,
            },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleApprove = (voucher: PettyCashVoucher) => {
        setIsProcessing(true);
        router.post(`/vouchers/${voucher.id}/approve`, {}, {
            onFinish: () => setIsProcessing(false),
        });
    };

    const handleBulkApprove = () => {
        if (selectedIds.length === 0) return;

        setIsProcessing(true);
        router.post(
            '/vouchers/bulk-approve',
            { voucher_ids: selectedIds },
            {
                onSuccess: () => {
                    setSelectedIds([]);
                    setBulkConfirmOpen(false);
                },
                onFinish: () => setIsProcessing(false),
            }
        );
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
                    description="Voucher kas kecil yang diajukan dan menunggu verifikasi serta persetujuan supervisor"
                >
                    <span className="text-xs font-semibold px-3 py-1 bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-full">
                        {vouchers.total} Menunggu Persetujuan
                    </span>
                </PageHeader>

                {/* Anti self-approval alert reminder */}
                {(currentUserRole === 'SAC' || currentUserRole === 'SS' || hasOwnPendingVoucher) && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2.5">
                        <AlertCircle className="w-4 h-4 shrink-0 text-blue-600" />
                        <span>
                            <b>Aturan Anti Self-Approval:</b> Pembuat bon tidak dapat menyetujui atau menolak pengajuan miliknya sendiri. Bon yang Anda ajukan harus diverifikasi oleh approver lain ({currentUserRole === 'SAC' ? 'SS atau SM' : 'SAC, SS lain, atau SM'}).
                        </span>
                    </div>
                )}

                {/* Table */}
                <Card className="border shadow-xs overflow-hidden">
                    {/* Desktop View */}
                    <div className="hidden sm:block">
                        <DataTable>
                            <DataTableHead>
                                <tr>
                                    <DataTableHeaderCell className="w-12 text-center">
                                        <Checkbox
                                            checked={isAllEligibleSelected}
                                            disabled={eligibleVouchers.length === 0}
                                            onCheckedChange={handleSelectAll}
                                            aria-label="Pilih semua voucher yang memenuhi syarat"
                                        />
                                    </DataTableHeaderCell>
                                    <DataTableHeaderCell
                                        sortable
                                        sortField="voucher_number"
                                        currentSort={filters?.sort}
                                        currentDirection={filters?.direction}
                                        onSort={handleSort}
                                    >
                                        No. Voucher
                                    </DataTableHeaderCell>
                                    <DataTableHeaderCell
                                        sortable
                                        sortField="created_at"
                                        currentSort={filters?.sort}
                                        currentDirection={filters?.direction}
                                        onSort={handleSort}
                                    >
                                        Tanggal Diajukan
                                    </DataTableHeaderCell>
                                    <DataTableHeaderCell>Pemohon</DataTableHeaderCell>
                                    <DataTableHeaderCell
                                        sortable
                                        sortField="category"
                                        currentSort={filters?.sort}
                                        currentDirection={filters?.direction}
                                        onSort={handleSort}
                                    >
                                        Kategori
                                    </DataTableHeaderCell>
                                    <DataTableHeaderCell>Keperluan</DataTableHeaderCell>
                                    <DataTableHeaderCell
                                        align="right"
                                        sortable
                                        sortField="amount_cents"
                                        currentSort={filters?.sort}
                                        currentDirection={filters?.direction}
                                        onSort={handleSort}
                                    >
                                        Nominal
                                    </DataTableHeaderCell>
                                    <DataTableHeaderCell align="center">Status Anti-Self</DataTableHeaderCell>
                                    <DataTableHeaderCell align="center">Aksi Cepat</DataTableHeaderCell>
                                </tr>
                            </DataTableHead>
                            <DataTableBody>
                                {vouchers.data.length === 0 ? (
                                    <DataTableEmpty
                                        colSpan={9}
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
                                        const isSelfApprovalBlocked = v.requester_id === currentUserId;
                                        const isSelected = selectedIds.includes(v.id);

                                        return (
                                            <DataTableRow
                                                key={v.id}
                                                selected={isSelected}
                                                onClick={() => handleToggleRow(v.id, isSelfApprovalBlocked)}
                                            >
                                                <DataTableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={isSelected}
                                                        disabled={isSelfApprovalBlocked}
                                                        onCheckedChange={() => handleToggleRow(v.id, isSelfApprovalBlocked)}
                                                        aria-label={`Pilih voucher ${v.voucher_number}`}
                                                    />
                                                </DataTableCell>
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
                                                            {currentUserRole === 'SAC'
                                                                ? 'Milik Sendiri (Perlu SS/SM)'
                                                                : 'Milik Sendiri (Perlu Approver Lain)'}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                                                            Siap Verifikasi
                                                        </span>
                                                    )}
                                                </DataTableCell>
                                                <DataTableCell align="center" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <Link href={`/vouchers/${v.id}`}>
                                                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
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
                    </div>

                    {/* Mobile View */}
                    <div className="sm:hidden">
                        {vouchers.data.length === 0 ? (
                            <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                                <Check className="w-10 h-10 text-emerald-500 stroke-1 mb-1" />
                                <p className="text-sm font-semibold text-foreground">Semua voucher telah diproses</p>
                                <p className="text-xs text-muted-foreground">Tidak ada antrean voucher saat ini.</p>
                                <Link href="/vouchers" className="mt-2">
                                    <Button variant="outline" size="sm" className="text-xs h-9">
                                        Lihat Riwayat Voucher
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <DataTableMobileList>
                                {vouchers.data.map((v) => {
                                    const isSelfApprovalBlocked = v.requester_id === currentUserId;
                                    const isSelected = selectedIds.includes(v.id);

                                    return (
                                        <DataTableMobileCard
                                            key={v.id}
                                            selected={isSelected}
                                            onClick={() => handleToggleRow(v.id, isSelfApprovalBlocked)}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={isSelected}
                                                        disabled={isSelfApprovalBlocked}
                                                        onCheckedChange={() => handleToggleRow(v.id, isSelfApprovalBlocked)}
                                                    />
                                                    <span className="font-mono font-semibold text-xs text-primary">
                                                        {v.voucher_number}
                                                    </span>
                                                </div>
                                                {isSelfApprovalBlocked ? (
                                                    <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                                        <ShieldAlert className="w-3 h-3" />
                                                        {currentUserRole === 'SAC' ? 'Perlu SS/SM' : 'Milik Sendiri'}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                                                        Siap Verifikasi
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <span className="font-medium text-foreground">{v.requester?.name}</span>
                                                <span>
                                                    {new Date(v.created_at).toLocaleDateString('id-ID', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                    })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-2">{v.purpose}</p>
                                            <div className="flex items-center justify-between pt-2 border-t border-border/60">
                                                <span className="font-mono num font-bold text-sm text-foreground">
                                                    {formatMoney(v.amount_cents)}
                                                </span>
                                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                    <Link href={`/vouchers/${v.id}`}>
                                                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </Link>
                                                    {!isSelfApprovalBlocked && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                disabled={isProcessing}
                                                                onClick={() => handleApprove(v)}
                                                                className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
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
                                                                className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                                                            >
                                                                <XCircle className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </DataTableMobileCard>
                                    );
                                })}
                            </DataTableMobileList>
                        )}
                    </div>

                    <Pagination
                        links={vouchers.links}
                        currentPage={vouchers.current_page}
                        lastPage={vouchers.last_page}
                        from={vouchers.from}
                        to={vouchers.to}
                        total={vouchers.total}
                    />
                </Card>

                {/* Floating Bulk Action Bar */}
                <DataTableBulkBar
                    selectedCount={selectedIds.length}
                    totalAmountCents={selectedTotalAmount}
                    onClearSelection={() => setSelectedIds([])}
                >
                    <Button
                        size="sm"
                        disabled={isProcessing}
                        onClick={() => setBulkConfirmOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs text-xs h-8 gap-1.5"
                    >
                        <CheckCircle className="size-3.5" />
                        Setujui {selectedIds.length} Bon Terpilih
                    </Button>
                </DataTableBulkBar>
            </div>

            {/* Bulk Approve Confirmation Dialog */}
            <ConfirmDialog
                open={bulkConfirmOpen}
                onOpenChange={setBulkConfirmOpen}
                title="Persetujuan Massal Voucher Kas Kecil"
                description={`Apakah Anda yakin ingin menyetujui ${selectedIds.length} voucher bon kas kecil terpilih dengan total nominal ${formatMoney(selectedTotalAmount)}?`}
                confirmText="Ya, Setujui Semua"
                cancelText="Batal"
                isLoading={isProcessing}
                onConfirm={handleBulkApprove}
            />

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

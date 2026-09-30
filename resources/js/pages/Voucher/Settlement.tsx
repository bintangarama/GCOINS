import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    CheckCircle2,
    DollarSign,
    Layers,
    Receipt,
    Eye,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
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
import { PettyCashVoucher } from '@/types/voucher';

interface SettlementProps {
    vouchers: PettyCashVoucher[];
}

export default function VoucherSettlementPage({ vouchers }: SettlementProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const toggleSelectAll = () => {
        if (selectedIds.length === vouchers.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(vouchers.map((v) => v.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const selectedTotalCents = vouchers
        .filter((v) => selectedIds.includes(v.id))
        .reduce((sum, v) => sum + v.amount_cents, 0);

    const handleBatchSettle = () => {
        if (selectedIds.length === 0) return;

        if (
            confirm(
                `Yakin ingin menyelesaikan (settle) ${selectedIds.length} voucher dengan total ${formatMoney(
                    selectedTotalCents
                )}? Voucher yang diselesaikan akan keluar dari perhitungan K_bon.`
            )
        ) {
            setIsSubmitting(true);
            router.post(
                '/vouchers/batch-settle',
                { voucher_ids: selectedIds },
                {
                    onSuccess: () => setSelectedIds([]),
                    onFinish: () => setIsSubmitting(false),
                }
            );
        }
    };

    return (
        <AppLayout title="Penyelesaian Bon Kas Kecil (Settlement)">
            <Head title="Penyelesaian Bon Kas Kecil (Settlement)" />

            <div className="space-y-6">
                <PageHeader
                    title="Penyelesaian Bon Kas Kecil (Settlement)"
                    icon={Layers}
                    description="Pilih voucher tercairkan (DISBURSED) yang dananya telah diganti untuk dikeluarkan dari K_bon"
                >
                    <Button
                        size="sm"
                        disabled={selectedIds.length === 0 || isSubmitting}
                        onClick={handleBatchSettle}
                        className="gap-2 shadow-xs"
                    >
                        <CheckCircle2 className="size-4" />
                        Selesaikan Terpilih ({selectedIds.length})
                    </Button>
                </PageHeader>

                {/* Info Card & Selected Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border shadow-sm p-4 flex items-center gap-3 bg-muted/20">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Receipt className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[11px] text-muted-foreground">Voucher Menggantung (K_bon)</span>
                            <div className="text-base font-bold text-foreground">
                                {vouchers.length} Transaksi
                            </div>
                        </div>
                    </Card>

                    <Card className="border shadow-sm p-4 flex items-center gap-3 bg-muted/20">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center shrink-0">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[11px] text-muted-foreground">Total Nilai K_bon</span>
                            <div className="text-base font-bold font-mono text-foreground">
                                {formatMoney(vouchers.reduce((acc, v) => acc + v.amount_cents, 0))}
                            </div>
                        </div>
                    </Card>

                    <Card className="border shadow-sm p-4 flex items-center gap-3 bg-primary/5 dark:bg-primary/10 border-primary/20 dark:border-primary/30">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 font-bold text-xs">
                            {selectedIds.length}
                        </div>
                        <div>
                            <span className="text-[11px] text-primary font-medium">
                                Siap Diselesaikan (Tercentang)
                            </span>
                            <div className="text-base font-bold font-mono text-primary">
                                {formatMoney(selectedTotalCents)}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Table */}
                <Card className="border shadow-sm overflow-hidden">
                    <DataTable>
                        <DataTableHead>
                            <tr>
                                <DataTableHeaderCell align="center" className="w-12">
                                    <div className="flex items-center justify-center">
                                        <Checkbox
                                            checked={
                                                vouchers.length > 0 && selectedIds.length === vouchers.length
                                                    ? true
                                                    : selectedIds.length > 0
                                                    ? 'indeterminate'
                                                    : false
                                            }
                                            onCheckedChange={toggleSelectAll}
                                            aria-label="Pilih Semua"
                                        />
                                    </div>
                                </DataTableHeaderCell>
                                <DataTableHeaderCell>No. Voucher</DataTableHeaderCell>
                                <DataTableHeaderCell>Tgl Cair (Disbursed)</DataTableHeaderCell>
                                <DataTableHeaderCell>Pemohon</DataTableHeaderCell>
                                <DataTableHeaderCell>Kategori</DataTableHeaderCell>
                                <DataTableHeaderCell>Keperluan</DataTableHeaderCell>
                                <DataTableHeaderCell align="right">Nominal</DataTableHeaderCell>
                                <DataTableHeaderCell align="center">Status</DataTableHeaderCell>
                                <DataTableHeaderCell align="center">Lihat</DataTableHeaderCell>
                            </tr>
                        </DataTableHead>
                        <DataTableBody>
                            {vouchers.length === 0 ? (
                                <DataTableEmpty
                                    colSpan={9}
                                    icon={<CheckCircle2 className="w-10 h-10 text-muted-foreground stroke-1" />}
                                    message="Tidak ada voucher yang perlu diselesaikan"
                                    description="Semua voucher kas kecil berstatus DISBURSED telah selesai diselesaikan (settled)."
                                    action={
                                        <Link href="/vouchers">
                                            <Button variant="outline" size="sm" className="text-xs h-8">
                                                Kembali ke Daftar Voucher
                                            </Button>
                                        </Link>
                                    }
                                />
                            ) : (
                                vouchers.map((v) => {
                                    const isSelected = selectedIds.includes(v.id);

                                    return (
                                        <DataTableRow
                                            key={v.id}
                                            onClick={() => toggleSelect(v.id)}
                                            className={
                                                isSelected ? 'bg-primary/5 dark:bg-primary/10' : undefined
                                            }
                                        >
                                            <DataTableCell align="center" onClick={(e: React.MouseEvent) => e?.stopPropagation()}>
                                                <div className="flex items-center justify-center">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={() => toggleSelect(v.id)}
                                                        aria-label={`Pilih voucher ${v.voucher_number}`}
                                                    />
                                                </div>
                                            </DataTableCell>
                                            <DataTableCell className="font-mono font-semibold text-primary">
                                                {v.voucher_number}
                                            </DataTableCell>
                                            <DataTableCell className="text-muted-foreground whitespace-nowrap">
                                                {v.disbursed_at
                                                    ? new Date(v.disbursed_at).toLocaleDateString('id-ID', {
                                                          day: '2-digit',
                                                          month: 'short',
                                                          year: 'numeric',
                                                      })
                                                    : '-'}
                                            </DataTableCell>
                                            <DataTableCell>
                                                <div className="font-medium text-foreground">{v.requester?.name}</div>
                                                <div className="text-[10px] text-muted-foreground font-mono">
                                                    {v.requester?.nik}
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
                                                <StatusBadge status={v.status} />
                                            </DataTableCell>
                                            <DataTableCell align="center" className="whitespace-nowrap" onClick={(e: React.MouseEvent) => e?.stopPropagation()}>
                                                <Link href={`/vouchers/${v.id}`}>
                                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                                                    </Button>
                                                </Link>
                                            </DataTableCell>
                                        </DataTableRow>
                                    );
                                })
                            )}
                        </DataTableBody>
                    </DataTable>
                </Card>
            </div>
        </AppLayout>
    );
}

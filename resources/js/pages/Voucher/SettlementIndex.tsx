import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    FileText,
    Search,
    Calendar,
    Eye,
    FileSpreadsheet,
    Layers,
    ArrowLeft,
    CheckCircle2,
    Download,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import {
    DataTable,
    DataTableHead,
    DataTableHeaderCell,
    DataTableBody,
    DataTableRow,
    DataTableCell,
    DataTableEmpty,
} from '@/components/shared/DataTable';
import { Pagination } from '@/components/shared/Pagination';
import { formatMoney } from '@/lib/money';
import { PaginatedSettlements, PettyCashSettlement } from '@/types/voucher';

interface SettlementIndexProps {
    settlements: PaginatedSettlements;
    filters: {
        search?: string;
        date_from?: string;
        date_to?: string;
    };
}

export default function SettlementIndexPage({ settlements, filters }: SettlementIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    const applyFilters = () => {
        router.get(
            '/vouchers/settlements',
            {
                search: search || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            },
            { preserveState: true }
        );
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            applyFilters();
        }
    };

    return (
        <AppLayout title="Riwayat Rekap Pengeluaran Kas Kecil">
            <Head title="Riwayat Rekap Pengeluaran Kas Kecil" />

            <div className="space-y-6">
                <PageHeader
                    title="Riwayat Rekap Pengeluaran Kas Kecil"
                    icon={FileText}
                    description="Arsip dokumen rekapitulasi pengeluaran kas kecil berkolom matriks (Settlement)"
                >
                    <div className="flex items-center gap-2">
                        <a
                            href={`/admin/import-export/export/settlements?${new URLSearchParams({
                                ...(search ? { search } : {}),
                                ...(dateFrom ? { date_from: dateFrom } : {}),
                                ...(dateTo ? { date_to: dateTo } : {}),
                            }).toString()}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors shadow-2xs"
                        >
                            <Download className="size-3.5 text-blue-600" />
                            <span>Ekspor Excel (.xlsx)</span>
                        </a>
                        <Link href="/vouchers/settlement">
                            <Button variant="outline" size="sm" className="gap-2 shadow-xs">
                                <ArrowLeft className="size-4" />
                                Kembali ke Settlement
                            </Button>
                        </Link>
                    </div>
                </PageHeader>

                {/* Filter Toolbar */}
                <Card className="border shadow-sm">
                    <CardContent className="p-4 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                            {/* Search */}
                            <div className="sm:col-span-2 relative">
                                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
                                <Input
                                    placeholder="Cari nomor rekap invoice (misal: 026/KKCL/...)"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="pl-9 h-9 text-xs"
                                />
                            </div>

                            {/* Date From */}
                            <div>
                                <Input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="h-9 text-xs"
                                    placeholder="Dari tanggal"
                                />
                            </div>

                            {/* Date To */}
                            <div>
                                <Input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="h-9 text-xs"
                                    placeholder="Sampai tanggal"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setSearch('');
                                    setDateFrom('');
                                    setDateTo('');
                                    router.get('/vouchers/settlements');
                                }}
                                className="text-xs h-8"
                            >
                                Reset Filter
                            </Button>
                            <Button size="sm" onClick={applyFilters} className="text-xs h-8 gap-1.5">
                                <Search className="w-3.5 h-3.5" />
                                Terapkan Filter
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card className="border shadow-sm overflow-hidden">
                    <DataTable>
                        <DataTableHead>
                            <tr>
                                <DataTableHeaderCell align="center" className="w-12">No</DataTableHeaderCell>
                                <DataTableHeaderCell>No. Rekap Invoice</DataTableHeaderCell>
                                <DataTableHeaderCell>Tanggal Dibuat</DataTableHeaderCell>
                                <DataTableHeaderCell>Penyusun (SAC)</DataTableHeaderCell>
                                <DataTableHeaderCell align="center">Jumlah Voucher</DataTableHeaderCell>
                                <DataTableHeaderCell align="right">Total Pengeluaran</DataTableHeaderCell>
                                <DataTableHeaderCell align="center" className="w-32">Aksi</DataTableHeaderCell>
                            </tr>
                        </DataTableHead>
                        <DataTableBody>
                            {settlements.data.length === 0 ? (
                                <DataTableEmpty
                                    colSpan={7}
                                    icon={<FileText className="w-10 h-10 text-muted-foreground stroke-1" />}
                                    message="Belum ada riwayat rekap pengeluaran"
                                    description="Dokumen rekap pengeluaran kas kecil akan otomatis terbentuk saat SAC melakukan penyelesaian voucher."
                                    action={
                                        <Link href="/vouchers/settlement">
                                            <Button size="sm" className="text-xs h-8 gap-2">
                                                <Layers className="size-4" />
                                                Buka Halaman Settlement
                                            </Button>
                                        </Link>
                                    }
                                />
                            ) : (
                                settlements.data.map((item, idx) => (
                                    <DataTableRow key={item.id}>
                                        <DataTableCell align="center" className="text-muted-foreground">
                                            {(settlements.current_page - 1) * settlements.per_page + idx + 1}
                                        </DataTableCell>
                                        <DataTableCell className="font-mono font-semibold text-primary">
                                            <Link
                                                href={`/vouchers/settlements/${item.id}`}
                                                className="hover:underline"
                                            >
                                                {item.settlement_number}
                                            </Link>
                                        </DataTableCell>
                                        <DataTableCell className="text-muted-foreground whitespace-nowrap">
                                            {item.created_at
                                                ? new Date(item.created_at).toLocaleDateString('id-ID', {
                                                      day: '2-digit',
                                                      month: 'short',
                                                      year: 'numeric',
                                                      hour: '2-digit',
                                                      minute: '2-digit',
                                                  })
                                                : '-'}
                                        </DataTableCell>
                                        <DataTableCell>
                                            <div className="font-medium text-foreground">
                                                {item.settled_by?.name || '-'}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground font-mono">
                                                {item.settled_by?.nik}
                                            </div>
                                        </DataTableCell>
                                        <DataTableCell align="center" mono className="font-semibold">
                                            {item.vouchers_count ?? item.vouchers?.length ?? 0} Transaksi
                                        </DataTableCell>
                                        <DataTableCell align="right" mono className="font-bold text-foreground">
                                            {formatMoney(item.total_amount_cents)}
                                        </DataTableCell>
                                        <DataTableCell align="center" className="whitespace-nowrap">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <Link href={`/vouchers/settlements/${item.id}`}>
                                                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2.5">
                                                        <Eye className="w-3.5 h-3.5" />
                                                        Lihat
                                                    </Button>
                                                </Link>
                                                <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
                                                    <a
                                                        href={`/vouchers/settlements/${item.id}/export-excel`}
                                                        title="Download Excel Matriks"
                                                        download
                                                    >
                                                        <FileSpreadsheet className="w-4 h-4" />
                                                    </a>
                                                </Button>
                                            </div>
                                        </DataTableCell>
                                    </DataTableRow>
                                ))
                            )}
                        </DataTableBody>
                    </DataTable>
                </Card>

                {/* Pagination */}
                {settlements.last_page > 1 && (
                    <Pagination
                        currentPage={settlements.current_page}
                        lastPage={settlements.last_page}
                        total={settlements.total}
                        links={settlements.links}
                    />
                )}
            </div>
        </AppLayout>
    );
}

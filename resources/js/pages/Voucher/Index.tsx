import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    Plus,
    Search,
    Filter,
    Calendar,
    Receipt,
    Eye,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    FileSpreadsheet,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
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
import { formatMoney } from '@/lib/money';
import { PaginatedVouchers, VoucherCategory, VoucherStatus } from '@/types/voucher';
import { User } from '@/types/auth';

interface VoucherIndexProps {
    vouchers: PaginatedVouchers;
    filters: {
        status?: string;
        category?: string;
        requester_id?: string;
        date_from?: string;
        date_to?: string;
        search?: string;
    };
    categories: VoucherCategory[];
    requesters: Pick<User, 'id' | 'name' | 'nik' | 'role'>[];
}

export default function VoucherIndexPage({
    vouchers,
    filters,
    categories,
    requesters,
}: VoucherIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'ALL');
    const [category, setCategory] = useState(filters.category || 'ALL');
    const [requesterId, setRequesterId] = useState(filters.requester_id || 'ALL');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    const applyFilters = () => {
        router.get(
            '/vouchers',
            {
                search: search || undefined,
                status: status !== 'ALL' ? status : undefined,
                category: category !== 'ALL' ? category : undefined,
                requester_id: requesterId !== 'ALL' ? requesterId : undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            },
            {
                preserveState: true,
                replace: true,
            }
        );
    };

    const resetFilters = () => {
        setSearch('');
        setStatus('ALL');
        setCategory('ALL');
        setRequesterId('ALL');
        setDateFrom('');
        setDateTo('');
        router.get('/vouchers');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            applyFilters();
        }
    };

    return (
        <AppLayout>
            <Head title="Daftar Bon Kas Kecil" />

            <div className="space-y-6">
                <PageHeader
                    title="Daftar Bon Kas Kecil"
                    icon={Receipt}
                    description="Kelola riwayat pengeluaran kas kecil, status persetujuan, dan pencairan"
                >
                    <Button asChild variant="outline" size="sm" className="gap-1.5 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-semibold shadow-xs">
                        <a
                            href={`/vouchers/export?${new URLSearchParams({
                                status: status !== 'ALL' ? status : '',
                                category: category !== 'ALL' ? category : '',
                                requester_id: requesterId !== 'ALL' ? requesterId : '',
                                date_from: dateFrom,
                                date_to: dateTo,
                                search: search,
                            }).toString()}`}
                            download
                        >
                            <FileSpreadsheet className="size-4" />
                            Export Excel
                        </a>
                    </Button>
                    <Button asChild size="sm" className="gap-2 shadow-xs">
                        <Link href="/vouchers/create">
                            <Plus className="size-4" />
                            Buat Voucher Baru
                        </Link>
                    </Button>
                </PageHeader>

                {/* Filter Toolbar */}
                <Card className="border shadow-sm">
                    <CardContent className="p-4 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                            {/* Search */}
                            <div className="lg:col-span-2 relative">
                                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
                                <Input
                                    placeholder="Cari nomor voucher / keperluan..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="pl-9 h-9 text-xs"
                                />
                            </div>

                            {/* Status Filter */}
                            <div>
                                <Select value={status} onValueChange={(val) => setStatus(val)}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Semua Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL" className="text-xs font-medium">Semua Status</SelectItem>
                                        <SelectItem value="DRAFT" className="text-xs">DRAFT</SelectItem>
                                        <SelectItem value="SUBMITTED" className="text-xs">SUBMITTED</SelectItem>
                                        <SelectItem value="APPROVED_SS" className="text-xs">APPROVED_SS</SelectItem>
                                        <SelectItem value="DISBURSED" className="text-xs">DISBURSED</SelectItem>
                                        <SelectItem value="SETTLED" className="text-xs">SETTLED</SelectItem>
                                        <SelectItem value="REJECTED" className="text-xs">REJECTED</SelectItem>
                                        <SelectItem value="REJECTED_REFUND_PENDING" className="text-xs">REFUND_PENDING</SelectItem>
                                        <SelectItem value="REFUNDED" className="text-xs">REFUNDED</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Category Filter */}
                            <div>
                                <Select value={category} onValueChange={(val) => setCategory(val)}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Semua Kategori" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL" className="text-xs font-medium">Semua Kategori</SelectItem>
                                        {categories.map((c) => (
                                            <SelectItem key={c} value={c} className="text-xs font-mono">
                                                {c}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Date From */}
                            <div>
                                <Input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="h-9 text-xs"
                                    placeholder="Dari tgl"
                                />
                            </div>

                            {/* Date To */}
                            <div>
                                <Input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="h-9 text-xs"
                                    placeholder="Sampai tgl"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t">
                            <span className="text-xs text-muted-foreground">
                                Ditemukan <b>{vouchers.total}</b> transaksi
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={resetFilters}
                                    className="text-xs h-8 gap-1.5"
                                >
                                    <RefreshCw className="w-3 h-3" />
                                    Reset
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={applyFilters}
                                    className="text-xs h-8 gap-1.5"
                                >
                                    <Filter className="w-3 h-3" />
                                    Terapkan Filter
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Voucher Data Table */}
                <Card className="border shadow-sm overflow-hidden">
                    <DataTable>
                        <DataTableHead>
                            <tr>
                                <DataTableHeaderCell>No. Voucher</DataTableHeaderCell>
                                <DataTableHeaderCell>Tanggal</DataTableHeaderCell>
                                <DataTableHeaderCell>Pemohon</DataTableHeaderCell>
                                <DataTableHeaderCell>Kategori</DataTableHeaderCell>
                                <DataTableHeaderCell>Keperluan</DataTableHeaderCell>
                                <DataTableHeaderCell align="right">Nominal</DataTableHeaderCell>
                                <DataTableHeaderCell align="center">Status</DataTableHeaderCell>
                                <DataTableHeaderCell align="center">Aksi</DataTableHeaderCell>
                            </tr>
                        </DataTableHead>
                        <DataTableBody>
                            {vouchers.data.length === 0 ? (
                                <DataTableEmpty
                                    colSpan={8}
                                    icon={<Receipt className="w-10 h-10 stroke-1" />}
                                    message="Tidak ada voucher yang ditemukan"
                                    description="Coba sesuaikan filter pencarian atau buat pengajuan bon kas kecil baru."
                                    action={
                                        <div className="flex items-center gap-2 mt-1">
                                            {(filters.search || filters.status || filters.category || filters.requester_id || filters.date_from || filters.date_to) && (
                                                <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs h-8">
                                                    Reset Filter
                                                </Button>
                                            )}
                                            <Link href="/vouchers/create">
                                                <Button size="sm" className="text-xs h-8 gap-1.5">
                                                    <Plus className="w-3.5 h-3.5" />
                                                    Buat Pengajuan
                                                </Button>
                                            </Link>
                                        </div>
                                    }
                                />
                            ) : (
                                vouchers.data.map((v) => (
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
                                            <div className="font-medium text-foreground">{v.requester?.name || '-'}</div>
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
                                            <StatusBadge status={v.status} />
                                        </DataTableCell>
                                        <DataTableCell align="center" className="whitespace-nowrap">
                                            <Link href={`/vouchers/${v.id}`}>
                                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                                                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                                                    Detail
                                                </Button>
                                            </Link>
                                        </DataTableCell>
                                    </DataTableRow>
                                ))
                            )}
                        </DataTableBody>
                    </DataTable>

                    {/* Pagination */}
                    {vouchers.last_page > 1 && (
                        <div className="p-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                            <div>
                                Halaman <b>{vouchers.current_page}</b> dari <b>{vouchers.last_page}</b>
                            </div>
                            <div className="flex items-center gap-1">
                                {vouchers.links.map((link, idx) => {
                                    if (link.label.includes('Previous')) {
                                        return (
                                            <Button
                                                key={idx}
                                                variant="outline"
                                                size="sm"
                                                disabled={!link.url}
                                                onClick={() => link.url && router.visit(link.url)}
                                                className="h-7 w-7 p-0"
                                            >
                                                <ChevronLeft className="w-3.5 h-3.5" />
                                            </Button>
                                        );
                                    }
                                    if (link.label.includes('Next')) {
                                        return (
                                            <Button
                                                key={idx}
                                                variant="outline"
                                                size="sm"
                                                disabled={!link.url}
                                                onClick={() => link.url && router.visit(link.url)}
                                                className="h-7 w-7 p-0"
                                            >
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </Button>
                                        );
                                    }
                                    return (
                                        <Button
                                            key={idx}
                                            variant={link.active ? 'default' : 'outline'}
                                            size="sm"
                                            disabled={!link.url}
                                            onClick={() => link.url && router.visit(link.url)}
                                            className="h-7 w-7 p-0 text-xs"
                                        >
                                            <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}

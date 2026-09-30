import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { PaginatedBriPostings, BriFundPosting } from '@/types/bri';
import { formatMoney } from '@/lib/money';
import {
    Building2,
    PlusCircle,
    ArrowDownLeft,
    ArrowUpRight,
    Search,
    Filter,
    X,
    FileText,
    Image,
    CheckCircle2,
    XCircle,
    Clock,
    Eye,
    FileSpreadsheet,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface BriFundPostingsProps {
    postings: PaginatedBriPostings;
    filters: {
        category?: string;
        entity_name?: string;
        type?: string;
        status?: string;
        date_from?: string;
        date_to?: string;
        search?: string;
    };
    categories: string[];
    entities: string[];
}

export default function BriFundPostings({
    postings,
    filters,
    categories,
    entities,
}: BriFundPostingsProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [category, setCategory] = useState(filters.category || 'all');
    const [entityName, setEntityName] = useState(filters.entity_name || 'all');
    const [type, setType] = useState(filters.type || 'all');
    const [status, setStatus] = useState(filters.status || 'all');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);

    const handleFilter = (customParams = {}) => {
        const params: Record<string, string> = {
            ...(search ? { search } : {}),
            ...(category !== 'all' ? { category } : {}),
            ...(entityName !== 'all' ? { entity_name: entityName } : {}),
            ...(type !== 'all' ? { type } : {}),
            ...(status !== 'all' ? { status } : {}),
            ...(dateFrom ? { date_from: dateFrom } : {}),
            ...(dateTo ? { date_to: dateTo } : {}),
            ...customParams,
        };

        router.get('/bri-funds/postings', params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleReset = () => {
        setSearch('');
        setCategory('all');
        setEntityName('all');
        setType('all');
        setStatus('all');
        setDateFrom('');
        setDateTo('');
        router.get('/bri-funds/postings');
    };

    return (
        <AppLayout title="Riwayat Mutasi BRI — Bank Sub-Ledger">
            <Head title="Riwayat Mutasi BRI — Bank Sub-Ledger" />

            <div className="flex flex-col gap-6 max-w-7xl">
                <PageHeader
                    title="Riwayat Posting Rekening BRI"
                    description="Daftar seluruh transaksi pemasukan (INFLOW) dan pengeluaran (OUTFLOW) dana pooling bank"
                    icon={Building2}
                >
                    <Button asChild variant="outline" size="sm">
                        <Link href="/bri-funds">Overview Saldo</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="gap-1.5 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-semibold shadow-xs">
                        <a
                            href={`/bri-funds/export?${new URLSearchParams({
                                category: category !== 'all' ? category : '',
                                entity_name: entityName !== 'all' ? entityName : '',
                                type: type !== 'all' ? type : '',
                                status: status !== 'all' ? status : '',
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
                    <Button asChild size="sm" className="gap-2 bg-primary text-primary-foreground shadow-xs">
                        <Link href="/bri-funds/create">
                            <PlusCircle className="size-4" />
                            Catat Mutasi Baru
                        </Link>
                    </Button>
                </PageHeader>

                {/* Filter Bar */}
                <Card className="border-border shadow-sm">
                    <CardHeader className="pb-3 pt-4 px-4 sm:px-6">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Filter className="h-4 w-4 text-primary" />
                                Filter Riwayat Mutasi
                            </CardTitle>
                            {(search || category !== 'all' || entityName !== 'all' || type !== 'all' || status !== 'all' || dateFrom || dateTo) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleReset}
                                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-3.5 w-3.5 mr-1" />
                                    Reset Filter
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6 pb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                            {/* Search */}
                            <div className="lg:col-span-2">
                                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Pencarian</label>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        placeholder="Cari entitas / keperluan..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
                                        className="pl-8 h-9 text-xs"
                                    />
                                </div>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Kategori</label>
                                <Select
                                    value={category}
                                    onValueChange={(val) => {
                                        setCategory(val);
                                        handleFilter({ category: val !== 'all' ? val : '' });
                                    }}
                                >
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Semua Kategori" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Kategori</SelectItem>
                                        {categories.map((c) => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Type */}
                            <div>
                                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Tipe</label>
                                <Select
                                    value={type}
                                    onValueChange={(val) => {
                                        setType(val);
                                        handleFilter({ type: val !== 'all' ? val : '' });
                                    }}
                                >
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Semua Tipe" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Tipe</SelectItem>
                                        <SelectItem value="INFLOW">INFLOW (Masuk)</SelectItem>
                                        <SelectItem value="OUTFLOW">OUTFLOW (Keluar)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Status</label>
                                <Select
                                    value={status}
                                    onValueChange={(val) => {
                                        setStatus(val);
                                        handleFilter({ status: val !== 'all' ? val : '' });
                                    }}
                                >
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Semua Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Status</SelectItem>
                                        <SelectItem value="APPROVED">APPROVED</SelectItem>
                                        <SelectItem value="PENDING_SS">PENDING_SS</SelectItem>
                                        <SelectItem value="REJECTED">REJECTED</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Date From */}
                            <div>
                                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Dari Tanggal</label>
                                <Input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => {
                                        setDateFrom(e.target.value);
                                        handleFilter({ date_from: e.target.value });
                                    }}
                                    className="h-9 text-xs"
                                />
                            </div>

                            {/* Date To */}
                            <div>
                                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Sampai Tanggal</label>
                                <Input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => {
                                        setDateTo(e.target.value);
                                        handleFilter({ date_to: e.target.value });
                                    }}
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Postings Table */}
                <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                    <DataTable>
                        <DataTableHead>
                            <tr>
                                <DataTableHeaderCell>Tanggal & Waktu</DataTableHeaderCell>
                                <DataTableHeaderCell>Tipe & Kategori</DataTableHeaderCell>
                                <DataTableHeaderCell>Entitas / Rekanan</DataTableHeaderCell>
                                <DataTableHeaderCell>Keterangan / Keperluan</DataTableHeaderCell>
                                <DataTableHeaderCell align="right">Nominal</DataTableHeaderCell>
                                <DataTableHeaderCell align="center">Bukti</DataTableHeaderCell>
                                <DataTableHeaderCell align="center">Status</DataTableHeaderCell>
                                <DataTableHeaderCell>Petugas</DataTableHeaderCell>
                            </tr>
                        </DataTableHead>
                        <DataTableBody>
                            {postings.data.length === 0 ? (
                                <DataTableEmpty
                                    colSpan={8}
                                    icon={<Building2 className="w-10 h-10 text-muted-foreground/40 stroke-1" />}
                                    message="Tidak ada mutasi yang sesuai filter"
                                    description="Coba ubah kata kunci pencarian, rentang tanggal, atau kriteria filter lainnya."
                                    action={
                                        <div className="flex items-center gap-2 mt-1">
                                            {(search || category !== 'all' || entityName !== 'all' || type !== 'all' || status !== 'all' || dateFrom || dateTo) && (
                                                <Button variant="outline" size="sm" onClick={handleReset} className="text-xs h-8">
                                                    Reset Filter
                                                </Button>
                                            )}
                                            <Link href="/bri-funds/create">
                                                <Button size="sm" className="text-xs h-8 gap-1.5">
                                                    <PlusCircle className="w-3.5 h-3.5" />
                                                    Catat Mutasi Baru
                                                </Button>
                                            </Link>
                                        </div>
                                    }
                                />
                            ) : (
                                postings.data.map((item) => (
                                    <DataTableRow key={item.id}>
                                        <DataTableCell className="font-mono text-muted-foreground whitespace-nowrap">
                                            {new Date(item.created_at).toLocaleDateString('id-ID', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                            })}{' '}
                                            <span className="text-[10px] block opacity-70">
                                                {new Date(item.created_at).toLocaleTimeString('id-ID', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </DataTableCell>
                                        <DataTableCell className="whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                {item.type === 'INFLOW' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                        <ArrowDownLeft className="h-3 w-3" />
                                                        INFLOW
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                        <ArrowUpRight className="h-3 w-3" />
                                                        OUTFLOW
                                                    </span>
                                                )}
                                                <span className="font-mono text-[10px] text-muted-foreground px-1 py-0.5 rounded bg-muted">
                                                    {item.category}
                                                </span>
                                            </div>
                                        </DataTableCell>
                                        <DataTableCell>
                                            <Link
                                                href={`/bri-funds/entity/${encodeURIComponent(item.entity_name)}`}
                                                className="font-semibold text-foreground hover:text-primary transition-colors"
                                            >
                                                {item.entity_name}
                                            </Link>
                                            {item.custom_category_name && (
                                                <span className="text-[10px] text-muted-foreground block">
                                                    {item.custom_category_name}
                                                </span>
                                            )}
                                        </DataTableCell>
                                        <DataTableCell className="max-w-xs truncate text-muted-foreground" title={item.purpose}>
                                            {item.purpose}
                                        </DataTableCell>
                                        <DataTableCell align="right" mono className="font-bold whitespace-nowrap">
                                            <span className={item.type === 'INFLOW' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                                                {item.type === 'INFLOW' ? '+' : '-'} {formatMoney(item.amount_cents)}
                                            </span>
                                        </DataTableCell>
                                        <DataTableCell align="center">
                                            {item.proof_attachment_url ? (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                    onClick={() => setSelectedProofUrl(item.proof_attachment_url)}
                                                >
                                                    <Image className="h-4 w-4" />
                                                </Button>
                                            ) : (
                                                <span className="text-[11px] text-muted-foreground">-</span>
                                            )}
                                        </DataTableCell>
                                        <DataTableCell align="center" className="whitespace-nowrap">
                                            <StatusBadge status={item.status} />
                                            {item.rejection_reason && (
                                                <span className="text-[10px] text-destructive block mt-0.5 max-w-[150px] truncate" title={item.rejection_reason}>
                                                    {item.rejection_reason}
                                                </span>
                                            )}
                                        </DataTableCell>
                                        <DataTableCell className="whitespace-nowrap">
                                            <div className="text-[11px]">
                                                <span className="font-medium text-foreground">{item.created_by?.name || '-'}</span>
                                                {item.approved_by && (
                                                    <span className="text-[10px] text-muted-foreground block">
                                                        Acc: {item.approved_by.name}
                                                    </span>
                                                )}
                                            </div>
                                        </DataTableCell>
                                    </DataTableRow>
                                ))
                            )}
                        </DataTableBody>
                    </DataTable>

                    {/* Pagination */}
                    {postings.last_page > 1 && (
                        <div className="flex items-center justify-between p-4 border-t border-border bg-muted/20">
                            <span className="text-xs text-muted-foreground font-mono">
                                Menampilkan {postings.data.length} dari {postings.total} mutasi
                            </span>
                            <div className="flex items-center gap-1">
                                {postings.links.map((link, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => link.url && router.get(link.url)}
                                        disabled={!link.url}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                                            link.active
                                                ? 'bg-primary text-primary-foreground border-primary font-bold'
                                                : link.url
                                                ? 'hover:bg-muted text-foreground border-border'
                                                : 'opacity-40 cursor-not-allowed border-transparent text-muted-foreground'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Proof Preview Modal */}
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

import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    Coins,
    Search,
    Filter,
    Calendar,
    Eye,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    CheckCircle2,
    Clock,
    ShieldCheck,
    FileText,
    ArrowUpRight,
    Lock,
    Scale,
    TrendingUp,
    TrendingDown,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
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
import { PaginatedOpnameSessions, CashOpnameSession } from '@/types/opname';

interface OpnameIndexProps {
    sessions: PaginatedOpnameSessions;
    filters: {
        status?: string;
        opname_type?: string;
        date_from?: string;
        date_to?: string;
        search?: string;
    };
    stats: {
        total_sessions: number;
        approved_count: number;
        pending_review: number;
        draft_count: number;
    };
    canCreate: boolean;
}

export default function OpnameIndexPage({
    sessions,
    filters,
    stats,
    canCreate,
}: OpnameIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'ALL');
    const [opnameType, setOpnameType] = useState(filters.opname_type || 'ALL');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    const applyFilters = () => {
        router.get(
            '/opname',
            {
                search: search || undefined,
                status: status !== 'ALL' ? status : undefined,
                opname_type: opnameType !== 'ALL' ? opnameType : undefined,
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
        setOpnameType('ALL');
        setDateFrom('');
        setDateTo('');
        router.get('/opname');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            applyFilters();
        }
    };

    return (
        <AppLayout title="Riwayat Cash Opname">
            <Head title="Riwayat Cash Opname" />

            <div className="space-y-6">
                <PageHeader
                    title="Riwayat Cash Opname"
                    icon={Coins}
                    description="Arsip seluruh sesi rekonsiliasi kas brankas, bon gantung, dan mutasi bank BRI toko."
                >
                    <Button asChild>
                        <Link href="/opname/active">
                            <Coins className="size-4 mr-1.5" />
                            Workspace Sesi Aktif
                        </Link>
                    </Button>
                </PageHeader>

                {/* Summary Metric Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="shadow-xs border-slate-200 dark:border-slate-800">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">Total Sesi</p>
                                <p className="text-2xl font-bold text-foreground mt-1">
                                    {stats.total_sessions}
                                </p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                                <FileText className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-xs border-slate-200 dark:border-slate-800">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">Disetujui & Dikunci</p>
                                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                                    {stats.approved_count}
                                </p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-xs border-slate-200 dark:border-slate-800">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">Menunggu Verifikasi/SM</p>
                                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                                    {stats.pending_review}
                                </p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                                <Clock className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-xs border-slate-200 dark:border-slate-800">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">Draft Berjalan</p>
                                <p className="text-2xl font-bold text-slate-700 dark:text-slate-300 mt-1">
                                    {stats.draft_count}
                                </p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                <RotateCcw className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter Bar */}
                <Card className="shadow-xs border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-3 pt-4 px-4">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Filter className="w-4 h-4 text-muted-foreground" />
                            Filter & Pencarian Sesi
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
                            <div className="md:col-span-2">
                                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                                    Cari No. Opname
                                </label>
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                                    <Input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="001/KKCL/..."
                                        className="text-xs pl-8 h-9"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                                    Status
                                </label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="text-xs h-9">
                                        <SelectValue placeholder="Semua Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Semua Status</SelectItem>
                                        <SelectItem value="DRAFT">DRAFT (Kasir)</SelectItem>
                                        <SelectItem value="SUBMITTED">SUBMITTED (Menunggu Saksi)</SelectItem>
                                        <SelectItem value="VERIFIED_SS">VERIFIED_SS (Menunggu SM)</SelectItem>
                                        <SelectItem value="APPROVED">APPROVED (Selesai)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                                    Dari Tanggal
                                </label>
                                <Input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="text-xs h-9"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                                    Sampai Tanggal
                                </label>
                                <Input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="text-xs h-9"
                                />
                            </div>

                            <div className="flex items-end gap-2">
                                <Button
                                    onClick={applyFilters}
                                    size="sm"
                                    className="h-9 px-3 text-xs bg-primary text-primary-foreground font-medium flex-1"
                                >
                                    Filter
                                </Button>
                                <Button
                                    onClick={resetFilters}
                                    variant="outline"
                                    size="sm"
                                    className="h-9 px-2 text-xs text-muted-foreground"
                                    title="Reset filter"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Data Table */}
                <Card className="shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden">
                    <DataTable>
                        <DataTableHead>
                            <tr>
                                <DataTableHeaderCell>No. Opname</DataTableHeaderCell>
                                <DataTableHeaderCell>Tanggal</DataTableHeaderCell>
                                <DataTableHeaderCell>Petugas</DataTableHeaderCell>
                                <DataTableHeaderCell align="right">K_fisik (Safe)</DataTableHeaderCell>
                                <DataTableHeaderCell align="right">K_bon</DataTableHeaderCell>
                                <DataTableHeaderCell align="right">K_bri</DataTableHeaderCell>
                                <DataTableHeaderCell align="right">Total Aktual</DataTableHeaderCell>
                                <DataTableHeaderCell align="right">Target</DataTableHeaderCell>
                                <DataTableHeaderCell align="right">Selisih (V_current)</DataTableHeaderCell>
                                <DataTableHeaderCell align="center">Status</DataTableHeaderCell>
                                <DataTableHeaderCell align="center">Aksi</DataTableHeaderCell>
                            </tr>
                        </DataTableHead>
                        <DataTableBody>
                            {sessions.data.length === 0 ? (
                                <DataTableEmpty
                                    colSpan={11}
                                    icon={<Coins className="w-10 h-10 text-slate-300 dark:text-slate-600 stroke-1" />}
                                    message="Tidak ada sesi cash opname yang ditemukan"
                                    description="Coba ubah kata kunci pencarian atau reset filter untuk melihat data lainnya."
                                    action={
                                        <div className="flex items-center gap-2 mt-1">
                                            {(filters.search || filters.status !== 'ALL' || filters.opname_type !== 'ALL' || filters.date_from || filters.date_to) && (
                                                <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs h-8">
                                                    Reset Filter
                                                </Button>
                                            )}
                                            {canCreate && (
                                                <Link href="/opname/create">
                                                    <Button size="sm" className="text-xs h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                                                        Mulai Sesi Opname
                                                    </Button>
                                                </Link>
                                            )}
                                        </div>
                                    }
                                />
                            ) : (
                                sessions.data.map((session: CashOpnameSession) => (
                                    <DataTableRow key={session.id}>
                                        <DataTableCell className="font-mono font-bold text-foreground">
                                            <Link
                                                href={`/opname/${session.id}`}
                                                className="hover:text-blue-600 transition-colors hover:underline"
                                            >
                                                {session.opname_number}
                                            </Link>
                                        </DataTableCell>
                                        <DataTableCell className="text-muted-foreground whitespace-nowrap">
                                            {session.date}
                                        </DataTableCell>
                                        <DataTableCell>
                                            <div className="font-medium text-foreground">
                                                {session.created_by?.name || 'SAC'}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">
                                                {session.verified_by_ss ? `Saksi: ${session.verified_by_ss.name}` : 'Belum diverifikasi'}
                                            </div>
                                        </DataTableCell>
                                        <DataTableCell align="right" mono className="text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap">
                                            {formatMoney(session.physical_total_cents)}
                                        </DataTableCell>
                                        <DataTableCell align="right" mono className="text-purple-600 dark:text-purple-400 whitespace-nowrap">
                                            {formatMoney(session.vouchers_total_cents)}
                                        </DataTableCell>
                                        <DataTableCell align="right" mono className="text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                            {formatMoney(session.bri_clean_balance_cents)}
                                        </DataTableCell>
                                        <DataTableCell align="right" mono className="font-bold text-foreground whitespace-nowrap">
                                            {formatMoney(session.total_actual_cents)}
                                        </DataTableCell>
                                        <DataTableCell align="right" mono className="text-muted-foreground whitespace-nowrap">
                                            {formatMoney(session.target_reconciled_cents)}
                                        </DataTableCell>
                                        <DataTableCell align="right" whitespace-nowrap>
                                            <span
                                                className={`font-mono font-extrabold ${
                                                    session.variance_status === 'BALANCED'
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : session.variance_status === 'SURPLUS'
                                                        ? 'text-indigo-600 dark:text-indigo-400'
                                                        : 'text-red-600 dark:text-red-400'
                                                }`}
                                            >
                                                {session.current_variance_cents > 0 ? '+' : ''}
                                                {formatMoney(session.current_variance_cents)}
                                            </span>
                                        </DataTableCell>
                                        <DataTableCell align="center" className="whitespace-nowrap">
                                            <StatusBadge status={session.status} />
                                        </DataTableCell>
                                        <DataTableCell align="center" className="whitespace-nowrap">
                                            <Link href={`/opname/${session.id}`}>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 px-2.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950 font-medium"
                                                >
                                                    <Eye className="w-3.5 h-3.5 mr-1" />
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
                    {sessions.total > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border bg-slate-50/50 dark:bg-slate-900/50 text-xs">
                            <span className="text-muted-foreground">
                                Menampilkan{' '}
                                <strong className="font-semibold text-foreground">
                                    {sessions.from || 0}
                                </strong>{' '}
                                -{' '}
                                <strong className="font-semibold text-foreground">
                                    {sessions.to || 0}
                                </strong>{' '}
                                dari{' '}
                                <strong className="font-semibold text-foreground">
                                    {sessions.total}
                                </strong>{' '}
                                sesi
                            </span>

                            <div className="flex items-center gap-1">
                                {sessions.prev_page_url ? (
                                    <Link href={sessions.prev_page_url} preserveState>
                                        <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs">
                                            <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                                            Sebelumnya
                                        </Button>
                                    </Link>
                                ) : (
                                    <Button variant="outline" size="sm" disabled className="h-8 px-2.5 text-xs opacity-50">
                                        <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                                        Sebelumnya
                                    </Button>
                                )}

                                <span className="px-2 text-xs text-muted-foreground">
                                    Hal. {sessions.current_page} dari {sessions.last_page}
                                </span>

                                {sessions.next_page_url ? (
                                    <Link href={sessions.next_page_url} preserveState>
                                        <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs">
                                            Berikutnya
                                            <ChevronRight className="w-3.5 h-3.5 ml-1" />
                                        </Button>
                                    </Link>
                                ) : (
                                    <Button variant="outline" size="sm" disabled className="h-8 px-2.5 text-xs opacity-50">
                                        Berikutnya
                                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}

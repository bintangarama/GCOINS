import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BriCategoryBalances, BriEntityBalance } from '@/types/bri';
import { formatMoney } from '@/lib/money';
import { BreakdownModal } from '@/components/bri/BreakdownModal';
import { PageHeader } from '@/components/shared/PageHeader';
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
} from '@/components/shared/DataTable';
import {
    Building2,
    PlusCircle,
    ArrowUpRight,
    ArrowDownLeft,
    Clock,
    AlertCircle,
    ExternalLink,
    ChevronRight,
    Layers,
    History,
    Store as StoreIcon,
} from 'lucide-react';

interface BriFundOverviewProps {
    categoryBalances: BriCategoryBalances;
    entities: BriEntityBalance[];
    selectedCategory?: string | null;
    pendingCount: number;
}

export default function BriFundOverview({
    categoryBalances,
    entities,
    pendingCount,
}: BriFundOverviewProps) {
    const categoryCards = [
        {
            key: 'B2B',
            title: 'Transaksi B2B',
            code: 'B2B',
            desc: 'Penjualan buku sekolah / korporasi',
            amount: categoryBalances.B2B,
            color: 'from-blue-600 to-indigo-600',
            badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
        },
        {
            key: 'EVENT',
            title: 'Event & Pameran',
            code: 'EVENT',
            desc: 'Bazaar mall, pameran buku',
            amount: categoryBalances.EVENT,
            color: 'from-emerald-600 to-teal-600',
            badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
        },
        {
            key: 'AKSEL',
            title: 'Active Selling',
            code: 'AKSEL',
            desc: 'Program penjualan mobile / kanvasing',
            amount: categoryBalances.AKSEL,
            color: 'from-amber-600 to-orange-600',
            badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        },
        {
            key: 'ANONYMOUS',
            title: 'Dana Belum Teridentifikasi',
            code: 'ANONYMOUS',
            desc: 'Transfer masuk belum diketahui pengirimnya',
            amount: categoryBalances.ANONYMOUS,
            color: 'from-purple-600 to-violet-600',
            badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
        },
        {
            key: 'CUSTOM',
            title: 'Alokasi Khusus',
            code: 'CUSTOM',
            desc: 'Sewa booth & titipan khusus lainnya',
            amount: categoryBalances.CUSTOM,
            color: 'from-pink-600 to-rose-600',
            badgeBg: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
        },
    ];

    return (
        <AppLayout title="Mutasi BRI — Ringkasan Saldo">
            <Head title="Mutasi BRI — Ringkasan Saldo" />

            <div className="flex flex-col gap-6 max-w-7xl">
                <PageHeader
                    title="Ringkasan Saldo Rekening BRI"
                    description="Rincian saldo dana titipan non-kas kecil (B2B, Event, Active Selling, dan alokasi khusus) di rekening BRI toko"
                    icon={Building2}
                >
                    <BreakdownModal
                        categoryBalances={categoryBalances}
                        entities={entities}
                    />
                    <Button asChild variant="outline" size="sm" className="gap-2">
                        <Link href="/bri-funds/postings">
                            <History className="size-4" />
                            Riwayat Mutasi
                        </Link>
                    </Button>
                    <Button asChild size="sm" className="gap-2 bg-primary text-primary-foreground shadow-xs">
                        <Link href="/bri-funds/create">
                            <PlusCircle className="size-4" />
                            Catat Mutasi
                        </Link>
                    </Button>
                </PageHeader>

                {/* Pending Approval Alert Banner */}
                {pendingCount > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between gap-4 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                <Clock className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                                    Terdapat {pendingCount} pengajuan penarikan dana menunggu persetujuan
                                </h4>
                                <p className="text-xs text-amber-700 dark:text-amber-300/80">
                                    Supervisor (SS) atau Store Manager (SM) perlu memeriksa pengajuan sebelum saldo dipotong.
                                </p>
                            </div>
                        </div>
                        <Link href="/bri-funds/pending">
                            <Button size="sm" variant="outline" className="border-amber-500/40 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20">
                                Buka Antrean ({pendingCount})
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </Link>
                    </div>
                )}

                {/* Grand Total Card */}
                <Card className="relative overflow-hidden border-border/80 shadow-sm bg-gradient-to-br from-card to-muted/30">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Total Dana Titipan Non-Kas Kecil
                            </span>
                            <Badge variant="outline" className="font-mono text-xs">
                                5 Kategori Aktif
                            </Badge>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pt-1">
                            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-foreground tracking-tight">
                                {formatMoney(categoryBalances.TOTAL)}
                            </div>
                            <div className="text-xs text-muted-foreground sm:text-right">
                                Nilai ini otomatis dikurangkan dari saldo rekening koran BRI saat menghitung porsi Kas Kecil
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2 text-xs text-muted-foreground border-t border-border/40 mt-3 flex flex-wrap items-center justify-between gap-2">
                        <span>Total akumulasi saldo aktif dari kategori B2B, Event, Active Selling, Dana Belum Teridentifikasi, dan Alokasi Khusus</span>
                        <BreakdownModal
                            categoryBalances={categoryBalances}
                            entities={entities}
                            trigger={
                                <button className="text-primary hover:underline font-medium inline-flex items-center gap-1">
                                    Lihat rincian alokasi <ExternalLink className="h-3 w-3" />
                                </button>
                            }
                        />
                    </CardContent>
                </Card>

                {/* Category Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryCards.map((cat) => {
                        const count = entities.filter((e) => e.category === cat.key).length;
                        return (
                            <Card key={cat.key} className="hover:shadow-md transition-all border-border/70 flex flex-col justify-between">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <Badge className={`font-mono text-xs font-semibold ${cat.badgeBg}`}>
                                            {cat.code}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground font-mono">
                                            {count} entitas
                                        </span>
                                    </div>
                                    <CardTitle className="text-base font-semibold mt-2 text-foreground">
                                        {cat.title}
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground">
                                        {cat.desc}
                                    </p>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="p-3 bg-muted/40 rounded-lg border border-border/50">
                                        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                            Saldo Berjalan
                                        </div>
                                        <div className="text-xl font-bold font-mono text-foreground mt-0.5">
                                            {formatMoney(cat.amount)}
                                        </div>
                                    </div>

                                    <div className="mt-3 flex items-center justify-between text-xs">
                                        <BreakdownModal
                                            categoryBalances={categoryBalances}
                                            entities={entities}
                                            initialCategory={cat.key}
                                            trigger={
                                                <button className="text-primary hover:underline font-medium flex items-center gap-1 text-xs">
                                                    Lihat Entitas <ChevronRight className="h-3 w-3" />
                                                </button>
                                            }
                                        />
                                        <Link
                                            href={`/bri-funds/postings?category=${cat.key}`}
                                            className="text-muted-foreground hover:text-foreground text-xs"
                                        >
                                            Riwayat Mutasi
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Entity Balances Table */}
                <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-foreground">Daftar Rekanan & Saldo Aktif</h2>
                            <p className="text-xs text-muted-foreground">
                                Saldo per rekanan atau kegiatan yang tersedia untuk penarikan dana
                            </p>
                        </div>
                        <BreakdownModal
                            categoryBalances={categoryBalances}
                            entities={entities}
                        />
                    </div>

                    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                        {/* Desktop View */}
                        <div className="hidden md:block">
                            <DataTable>
                                <DataTableHead>
                                    <tr>
                                        <DataTableHeaderCell>Nama Entitas / Rekanan</DataTableHeaderCell>
                                        <DataTableHeaderCell>Kategori</DataTableHeaderCell>
                                        <DataTableHeaderCell align="right">Total Pemasukan</DataTableHeaderCell>
                                        <DataTableHeaderCell align="right">Total Pengeluaran</DataTableHeaderCell>
                                        <DataTableHeaderCell align="right">Saldo Berjalan</DataTableHeaderCell>
                                        <DataTableHeaderCell align="center">Aksi</DataTableHeaderCell>
                                    </tr>
                                </DataTableHead>
                                <DataTableBody>
                                    {entities.length === 0 ? (
                                        <DataTableEmpty
                                            colSpan={6}
                                            icon={<Building2 className="w-10 h-10 text-muted-foreground/40 stroke-1" />}
                                            message="Belum ada mutasi dana BRI yang dicatat"
                                            description="Klik tombol Catat Mutasi di atas untuk memulai pencatatan."
                                        />
                                    ) : (
                                        entities.map((item, idx) => (
                                            <DataTableRow key={idx}>
                                                <DataTableCell>
                                                    <div>
                                                        <span className="font-semibold text-foreground text-sm">
                                                            {item.entity_name}
                                                        </span>
                                                        {item.custom_category_name && (
                                                            <span className="text-[11px] text-muted-foreground block">
                                                                {item.custom_category_name}
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] text-muted-foreground block font-mono">
                                                            {item.postings_count} mutasi tercatat
                                                        </span>
                                                    </div>
                                                </DataTableCell>
                                                <DataTableCell>
                                                    <Badge variant="outline" className="font-mono text-xs">
                                                        {item.category}
                                                    </Badge>
                                                </DataTableCell>
                                                <DataTableCell align="right" mono className="text-emerald-600 dark:text-emerald-400">
                                                    <span className="inline-flex items-center gap-1 font-medium">
                                                        <ArrowDownLeft className="h-3 w-3" />
                                                        {formatMoney(item.inflow_total_cents)}
                                                    </span>
                                                </DataTableCell>
                                                <DataTableCell align="right" mono className="text-amber-600 dark:text-amber-400">
                                                    <span className="inline-flex items-center gap-1 font-medium">
                                                        <ArrowUpRight className="h-3 w-3" />
                                                        {formatMoney(item.outflow_total_cents)}
                                                    </span>
                                                </DataTableCell>
                                                <DataTableCell align="right">
                                                    <div className="font-mono num font-bold text-sm text-foreground">
                                                        {formatMoney(item.running_balance_cents)}
                                                    </div>
                                                    {item.pending_outflow_cents > 0 && (
                                                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono num block">
                                                            Pending: {formatMoney(item.pending_outflow_cents)}
                                                        </span>
                                                    )}
                                                </DataTableCell>
                                                <DataTableCell align="center">
                                                    <div className="inline-flex items-center justify-center gap-1">
                                                        <Link
                                                            href={`/bri-funds/create?type=INFLOW&entity=${encodeURIComponent(item.entity_name)}&category=${encodeURIComponent(item.category)}`}
                                                        >
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-7 px-2 gap-1 text-[11px] border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                                                                title={`Tambah Pemasukan ke ${item.entity_name}`}
                                                            >
                                                                <ArrowDownLeft className="h-3 w-3" />
                                                                Masuk
                                                            </Button>
                                                        </Link>
                                                        {item.running_balance_cents > 0 && (
                                                            <Link
                                                                href={`/bri-funds/create?type=OUTFLOW&entity=${encodeURIComponent(item.entity_name)}&category=${encodeURIComponent(item.category)}`}
                                                            >
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-7 px-2 gap-1 text-[11px] border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                                                                    title={`Tarik Dana dari ${item.entity_name}`}
                                                                >
                                                                    <ArrowUpRight className="h-3 w-3" />
                                                                    Tarik
                                                                </Button>
                                                            </Link>
                                                        )}
                                                        <Link href={`/bri-funds/entity/${encodeURIComponent(item.entity_name)}`}>
                                                            <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs">
                                                                Rincian
                                                                <ChevronRight className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </DataTableCell>
                                            </DataTableRow>
                                        ))
                                    )}
                                </DataTableBody>
                            </DataTable>
                        </div>

                        {/* Mobile View */}
                        <div className="md:hidden">
                            {entities.length === 0 ? (
                                <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                                    <Building2 className="w-10 h-10 text-muted-foreground/40 stroke-1 mb-1" />
                                    <p className="text-sm font-semibold text-foreground">Belum ada mutasi dana BRI</p>
                                    <p className="text-xs text-muted-foreground">Silakan klik tombol Catat Mutasi di atas.</p>
                                </div>
                            ) : (
                                <DataTableMobileList>
                                    {entities.map((item, idx) => (
                                        <DataTableMobileCard key={idx}>
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-semibold text-sm text-foreground">{item.entity_name}</span>
                                                <Badge variant="outline" className="font-mono text-xs">{item.category}</Badge>
                                            </div>
                                            {item.custom_category_name && (
                                                <span className="text-xs text-muted-foreground">{item.custom_category_name}</span>
                                            )}
                                            <div className="grid grid-cols-2 gap-2 text-xs py-1.5 px-2 bg-muted/30 rounded border border-border/50">
                                                <div>
                                                    <span className="text-muted-foreground block text-[10px]">Pemasukan</span>
                                                    <span className="font-mono num font-semibold text-emerald-600 dark:text-emerald-400">
                                                        {formatMoney(item.inflow_total_cents)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground block text-[10px]">Pengeluaran</span>
                                                    <span className="font-mono num font-semibold text-amber-600 dark:text-amber-400">
                                                        {formatMoney(item.outflow_total_cents)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-1 border-t border-border/60">
                                                <div>
                                                    <span className="text-[10px] text-muted-foreground block">Saldo Berjalan</span>
                                                    <span className="font-mono num font-bold text-sm text-foreground">
                                                        {formatMoney(item.running_balance_cents)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Link
                                                        href={`/bri-funds/create?type=INFLOW&entity=${encodeURIComponent(item.entity_name)}&category=${encodeURIComponent(item.category)}`}
                                                    >
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 px-2 gap-1 text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                                                        >
                                                            <ArrowDownLeft className="h-3 w-3" />
                                                            Masuk
                                                        </Button>
                                                    </Link>
                                                    {item.running_balance_cents > 0 && (
                                                        <Link
                                                            href={`/bri-funds/create?type=OUTFLOW&entity=${encodeURIComponent(item.entity_name)}&category=${encodeURIComponent(item.category)}`}
                                                        >
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 px-2 gap-1 text-xs border-amber-500/30 text-amber-700 dark:text-amber-400"
                                                            >
                                                                <ArrowUpRight className="h-3 w-3" />
                                                                Tarik
                                                            </Button>
                                                        </Link>
                                                    )}
                                                    <Link href={`/bri-funds/entity/${encodeURIComponent(item.entity_name)}`}>
                                                        <Button variant="outline" size="sm" className="h-8 px-2 gap-1 text-xs">
                                                            Rincian
                                                            <ChevronRight className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        </DataTableMobileCard>
                                    ))}
                                </DataTableMobileList>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

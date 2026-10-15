import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
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
import { Pagination } from '@/components/shared/Pagination';
import { PaginatedBriPostings } from '@/types/bri';
import { formatMoney } from '@/lib/money';
import {
    Building2,
    ArrowLeft,
    ArrowDownLeft,
    ArrowUpRight,
    Image,
    Coins,
    Calendar,
    PlusCircle,
    Layers,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface BriFundEntityDetailProps {
    entityName: string;
    category: string;
    runningBalanceCents: number;
    inflowTotalCents: number;
    outflowTotalCents: number;
    postings: PaginatedBriPostings;
}

export default function BriFundEntityDetail({
    entityName,
    category,
    runningBalanceCents,
    inflowTotalCents,
    outflowTotalCents,
    postings,
}: BriFundEntityDetailProps) {
    const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);

    return (
        <AppLayout
            title={`Rincian Mutasi — ${entityName}`}
            breadcrumbs={[
                { title: 'Dashboard', href: '/dashboard' },
                { title: 'Mutasi BRI', href: '/bri-funds' },
                { title: entityName, href: `/bri-funds/entity/${entityName}` },
            ]}
        >
            <Head title={`Rincian Mutasi — ${entityName}`} />

            <div className="flex flex-col gap-6 max-w-7xl">
                {/* Header */}
                {/* Page Header */}
                <PageHeader
                    title={entityName}
                    description={`Kategori: ${category} • Rekening Sub-Ledger`}
                    icon={Building2}
                    backHref="/bri-funds"
                >
                    <Button asChild size="sm" className="gap-2 bg-primary text-primary-foreground shadow-xs">
                        <Link href="/bri-funds/create">
                            <PlusCircle className="size-4" />
                            Catat Mutasi Baru
                        </Link>
                    </Button>
                </PageHeader>

                {/* Balance Cards Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Running Balance */}
                    <Card className="border-border/80 shadow-sm bg-gradient-to-br from-card to-muted/20">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Saldo Berjalan Entitas (S_entity)
                                </span>
                                <Coins className="h-4 w-4 text-primary" />
                            </div>
                            <CardTitle className="text-2xl sm:text-3xl font-extrabold font-mono text-foreground mt-1">
                                {formatMoney(runningBalanceCents)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 text-[11px] text-muted-foreground font-mono">
                            Formula: Σ Inflow (disetujui) - Σ Outflow (disetujui)
                        </CardContent>
                    </Card>

                    {/* Total Inflow */}
                    <Card className="border-border/80 shadow-sm">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Total Pemasukan (INFLOW)
                                </span>
                                <div className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    <ArrowDownLeft className="h-4 w-4" />
                                </div>
                            </div>
                            <CardTitle className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                                {formatMoney(inflowTotalCents)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 text-[11px] text-muted-foreground">
                            Akumulasi seluruh dana masuk yang telah disetujui
                        </CardContent>
                    </Card>

                    {/* Total Outflow */}
                    <Card className="border-border/80 shadow-sm">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Total Pengeluaran (OUTFLOW)
                                </span>
                                <div className="p-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    <ArrowUpRight className="h-4 w-4" />
                                </div>
                            </div>
                            <CardTitle className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
                                {formatMoney(outflowTotalCents)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 text-[11px] text-muted-foreground">
                            Akumulasi seluruh dana keluar yang telah disetujui SS/SM
                        </CardContent>
                    </Card>
                </div>

                {/* Postings History Table for This Entity */}
                <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-foreground">Riwayat Mutasi untuk {entityName}</h2>
                        <span className="text-xs text-muted-foreground font-mono">
                            Total {postings.total} mutasi
                        </span>
                    </div>

                    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                        {/* Desktop View */}
                        <div className="hidden md:block">
                            <DataTable>
                                <DataTableHead>
                                    <tr>
                                        <DataTableHeaderCell>Tanggal & Waktu</DataTableHeaderCell>
                                        <DataTableHeaderCell>Tipe Transaksi</DataTableHeaderCell>
                                        <DataTableHeaderCell>Keterangan / Tujuan</DataTableHeaderCell>
                                        <DataTableHeaderCell align="right">Nominal</DataTableHeaderCell>
                                        <DataTableHeaderCell align="center">Bukti</DataTableHeaderCell>
                                        <DataTableHeaderCell align="center">Status</DataTableHeaderCell>
                                        <DataTableHeaderCell>Petugas & Approval</DataTableHeaderCell>
                                    </tr>
                                </DataTableHead>
                                <DataTableBody>
                                    {postings.data.length === 0 ? (
                                        <DataTableEmpty
                                            colSpan={7}
                                            icon={<Coins className="w-10 h-10 text-muted-foreground/40 stroke-1" />}
                                            message="Belum ada mutasi untuk entitas ini"
                                            description="Mutasi yang dicatat untuk entitas ini akan muncul di sini."
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
                                                </DataTableCell>
                                                <DataTableCell className="max-w-sm text-foreground">
                                                    <div className="font-medium">{item.purpose}</div>
                                                    {item.rejection_reason && (
                                                        <span className="text-[10px] text-destructive block mt-0.5">
                                                            Ditolak: {item.rejection_reason}
                                                        </span>
                                                    )}
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
                        </div>

                        {/* Mobile View */}
                        <div className="md:hidden">
                            {postings.data.length === 0 ? (
                                <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                                    <Coins className="w-10 h-10 text-muted-foreground/40 stroke-1 mb-1" />
                                    <p className="text-sm font-semibold text-foreground">Belum ada mutasi untuk entitas ini</p>
                                </div>
                            ) : (
                                <DataTableMobileList>
                                    {postings.data.map((item) => (
                                        <DataTableMobileCard key={item.id}>
                                            <div className="flex items-center justify-between gap-2">
                                                {item.type === 'INFLOW' ? (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                        <ArrowDownLeft className="h-3 w-3" />
                                                        INFLOW
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                        <ArrowUpRight className="h-3 w-3" />
                                                        OUTFLOW
                                                    </span>
                                                )}
                                                <StatusBadge status={item.status} />
                                            </div>
                                            <p className="text-xs text-foreground font-medium">{item.purpose}</p>
                                            <div className="flex items-center justify-between pt-1 border-t border-border/60">
                                                <div>
                                                    <span className="text-[10px] text-muted-foreground block">
                                                        {new Date(item.created_at).toLocaleDateString('id-ID', {
                                                            day: 'numeric',
                                                            month: 'short',
                                                        })}
                                                    </span>
                                                    <span className={`font-mono num font-bold text-sm ${item.type === 'INFLOW' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                        {item.type === 'INFLOW' ? '+' : '-'} {formatMoney(item.amount_cents)}
                                                    </span>
                                                </div>
                                                {item.proof_attachment_url && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2 text-xs gap-1 text-muted-foreground"
                                                        onClick={() => setSelectedProofUrl(item.proof_attachment_url)}
                                                    >
                                                        <Image className="h-3.5 w-3.5" />
                                                        Bukti
                                                    </Button>
                                                )}
                                            </div>
                                        </DataTableMobileCard>
                                    ))}
                                </DataTableMobileList>
                            )}
                        </div>

                        {/* Standardized Responsive Pagination */}
                        <Pagination
                            links={postings.links}
                            currentPage={postings.current_page}
                            lastPage={postings.last_page}
                            from={postings.from}
                            to={postings.to}
                            total={postings.total}
                        />
                    </div>
                </div>
            </div>

            {/* Proof Modal */}
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

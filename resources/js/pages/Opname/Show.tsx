import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    Coins,
    Banknote,
    Receipt,
    Building2,
    Calendar,
    User as UserIcon,
    ArrowLeft,
    CheckCircle2,
    ShieldCheck,
    Lock,
    Scale,
    TrendingUp,
    TrendingDown,
    FileText,
    ExternalLink,
    AlertCircle,
    Check,
    Printer,
    FileSpreadsheet,
    UploadCloud,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatMoney } from '@/lib/money';
import { CashOpnameSession, DisbursedVoucher } from '@/types/opname';
import { BriCategoryBalances, BriEntityBalance } from '@/types/bri';

interface OpnameShowProps {
    session: CashOpnameSession;
    disbursedVouchers: DisbursedVoucher[];
    briCategoryBalances?: BriCategoryBalances;
    briEntities?: BriEntityBalance[];
    permissions?: {
        canSubmit?: boolean;
        canVerify?: boolean;
        canRejectSs?: boolean;
        canSignOff?: boolean;
        canRejectSm?: boolean;
        canExportExcel?: boolean;
        canViewReport?: boolean;
        canUploadSignedBa?: boolean;
    };
}

export default function OpnameShowPage({
    session,
    disbursedVouchers = [],
    briCategoryBalances,
    briEntities = [],
    permissions = {},
}: OpnameShowProps) {
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const handleUploadSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) {
            setUploadError('Silakan pilih berkas scan Berita Acara.');
            return;
        }

        const formData = new FormData();
        formData.append('signed_ba', selectedFile);

        setUploading(true);
        setUploadError(null);

        router.post(`/opname/${session.id}/signed-ba`, formData, {
            forceFormData: true,
            onSuccess: () => {
                setUploadOpen(false);
                setSelectedFile(null);
                setUploading(false);
            },
            onError: (errs) => {
                setUploading(false);
                setUploadError(errs.signed_ba || 'Gagal mengunggah berkas.');
            },
        });
    };

    const formatDate = (isoString?: string | null) => {
        if (!isoString) return '-';
        try {
            const d = new Date(isoString);
            return d.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return isoString;
        }
    };

    const isLocked = session.status === 'APPROVED';
    const isKasKecil = (session.opname_type || 'KAS_KECIL') === 'KAS_KECIL';
    const isKasBesar = session.opname_type === 'KAS_BESAR';

    const itemCounts = session.item_counts || [];
    const groupedItems = React.useMemo(() => {
        const groups: Record<string, typeof itemCounts> = {};
        const sorted = [...itemCounts].sort((a, b) => {
            const orderA = a.item_definition?.sort_order ?? 999;
            const orderB = b.item_definition?.sort_order ?? 999;
            return orderA - orderB;
        });

        for (const item of sorted) {
            const group = item.item_definition?.group_label || 'Pecahan / Barang';
            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push(item);
        }
        return groups;
    }, [itemCounts]);

    return (
        <AppLayout
            title={`Detail Cash Opname — ${session.opname_number}`}
            breadcrumbs={[
                { title: 'Dashboard', href: '/dashboard' },
                { title: 'Cash Opname', href: '/opname' },
                { title: session.opname_number, href: `/opname/${session.id}` },
            ]}
        >
            <Head title={`Detail Cash Opname — ${session.opname_number}`} />

            <div className="space-y-6 pb-20">
                {/* Top Navigation & Header */}
                <PageHeader
                    title={session.opname_number}
                    description={`Tanggal Opname: ${session.date} • Dibuat oleh: ${session.created_by?.name || 'SAC'}`}
                    backHref="/opname"
                    backLabel="Riwayat Sesi"
                    badge={
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <StatusBadge status={session.status} />
                            {isLocked && (
                                <Badge variant="outline" className="border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 gap-1 text-xs">
                                    <Lock className="size-3" />
                                    Immutable Snapshot
                                </Badge>
                            )}
                        </div>
                    }
                >
                    {permissions?.canViewReport !== false && (
                        <Button asChild variant="outline" size="sm" className="gap-1.5">
                            <Link href={`/opname/${session.id}/report`}>
                                <Printer className="size-4 text-slate-700 dark:text-slate-300" />
                                Cetak Lembar BACO
                            </Link>
                        </Button>
                    )}
                    {permissions?.canExportExcel !== false && (
                        <Button asChild variant="outline" size="sm" className="gap-1.5 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950">
                            <a href={`/opname/${session.id}/export-excel`} download>
                                <FileSpreadsheet className="size-4" />
                                Download Excel
                            </a>
                        </Button>
                    )}
                    {session.status !== 'APPROVED' && (
                        <Button asChild size="sm">
                            <Link href="/opname/active">
                                <Coins className="size-4 mr-1.5" />
                                Buka di Workspace Aktif
                            </Link>
                        </Button>
                    )}
                </PageHeader>

                {/* Locked Banner if Approved */}
                {isLocked && (
                    <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/50 flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 shrink-0">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div className="text-xs text-emerald-800 dark:text-emerald-200">
                            <p className="font-bold text-sm text-emerald-900 dark:text-emerald-100">
                                Sesi Telah Disetujui & Dikunci Permanen
                            </p>
                            <p className="mt-0.5">
                                Seluruh perhitungan fisik kas, bon gantung, dan rekonsiliasi BRI telah terkunci permanen sesuai <strong>Rule 4 (Immutable Snapshot)</strong>. Outstanding variance akhir <strong>{(session.outstanding_variance_cents ?? session.current_variance_cents) > 0 ? '+' : ''}{formatMoney(session.outstanding_variance_cents ?? session.current_variance_cents)}</strong> tercatat permanen dalam buku besar rekonsiliasi kas.
                            </p>
                            {session.notes && (
                                <p className="mt-1.5 font-medium italic text-emerald-900 dark:text-emerald-100">
                                    Catatan SM: "{session.notes}"
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Physical Signed BA Scan Card */}
                {isLocked && (
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className={`p-2.5 rounded-lg shrink-0 ${
                                session.signed_ba_scan_url
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                            }`}>
                                {session.signed_ba_scan_url ? <CheckCircle2 className="w-5 h-5" /> : <UploadCloud className="w-5 h-5" />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-foreground">
                                        Dokumen Fisik Berita Acara Bertanda Tangan Basah
                                    </span>
                                    {session.signed_ba_scan_url ? (
                                        <Badge variant="outline" className="border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px]">
                                            Terarsip
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px]">
                                            Belum Diunggah
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {session.signed_ba_scan_url
                                        ? 'Hasil scan fisik dokumen Berita Acara (BACO) dengan tanda tangan basah telah terlampir dan tersimpan aman.'
                                        : 'Setelah sesi disetujui (APPROVED), cetak lembar BACO, lengkapi tanda tangan basah seluruh pihak, lalu unggah berkas scan untuk kelengkapan audit.'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                            {session.signed_ba_scan_url && (
                                <a
                                    href={session.signed_ba_scan_url}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs text-blue-600 dark:text-blue-400 border-blue-200">
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        Lihat Berkas
                                    </Button>
                                </a>
                            )}
                            {permissions?.canUploadSignedBa && (
                                <Button
                                    onClick={() => setUploadOpen(true)}
                                    size="sm"
                                    variant={session.signed_ba_scan_url ? 'outline' : 'default'}
                                    className={`h-8 gap-1.5 text-xs font-semibold ${
                                        session.signed_ba_scan_url ? '' : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`}
                                >
                                    <UploadCloud className="w-3.5 h-3.5" />
                                    {session.signed_ba_scan_url ? 'Ganti Berkas' : 'Unggah Scan BA'}
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* Workflow Stepper & Signatures Timeline */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                <Check className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs font-bold truncate text-foreground">1. Draft Persiapan</div>
                                <div className="text-[11px] text-muted-foreground truncate">{session.created_by?.name || 'SAC'}</div>
                            </div>
                        </div>

                        <div className={`p-3 rounded-lg border flex items-center gap-3 ${
                            session.status === 'SUBMITTED'
                                ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 ring-1 ring-amber-400'
                                : session.status === 'VERIFIED_SS' || session.status === 'APPROVED'
                                ? 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                                : 'border-slate-200 dark:border-slate-800 opacity-60'
                        }`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                session.status === 'VERIFIED_SS' || session.status === 'APPROVED'
                                    ? 'bg-emerald-600 text-white'
                                    : session.status === 'SUBMITTED'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                            }`}>
                                {session.status === 'VERIFIED_SS' || session.status === 'APPROVED' ? <Check className="w-4 h-4" /> : '2'}
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs font-bold truncate text-foreground">2. Verifikasi Saksi</div>
                                <div className="text-[11px] text-muted-foreground truncate">{session.verified_by_ss?.name || 'SS Saksi'}</div>
                            </div>
                        </div>

                        <div className={`p-3 rounded-lg border flex items-center gap-3 ${
                            session.status === 'VERIFIED_SS'
                                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-400'
                                : session.status === 'APPROVED'
                                ? 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                                : 'border-slate-200 dark:border-slate-800 opacity-60'
                        }`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                session.status === 'APPROVED'
                                    ? 'bg-emerald-600 text-white'
                                    : session.status === 'VERIFIED_SS'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                            }`}>
                                {session.status === 'APPROVED' ? <Check className="w-4 h-4" /> : '3'}
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs font-bold truncate text-foreground">3. Final Sign-Off</div>
                                <div className="text-[11px] text-muted-foreground truncate">{session.approved_by_sm?.name || 'Store Manager'}</div>
                            </div>
                        </div>

                        <div className={`p-3 rounded-lg border flex items-center gap-3 ${
                            session.status === 'APPROVED'
                                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                                : 'border-slate-200 dark:border-slate-800 opacity-60'
                        }`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                session.status === 'APPROVED'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                            }`}>
                                <Lock className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs font-bold truncate text-foreground">4. Terkunci</div>
                                <div className="text-[11px] text-muted-foreground truncate">Immutable Snapshot</div>
                            </div>
                        </div>
                    </div>

                    {/* Stakeholders Signatures Detail */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex items-start gap-2.5">
                            <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 shrink-0">
                                <UserIcon className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-muted-foreground text-[11px]">Pembuat Sesi (Kasir / SAC):</div>
                                <div className="font-semibold text-foreground">
                                    {session.created_by?.name || 'SAC Kasir'} {session.created_by?.nik ? `(${session.created_by.nik})` : ''}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                    Dibuka: {formatDate(session.created_at)}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                            <div className={`p-1.5 rounded-md shrink-0 ${
                                session.verified_by_ss_id
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                            }`}>
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-muted-foreground text-[11px]">Saksi Fisik Brankas (SS):</div>
                                <div className="font-semibold text-foreground">
                                    {session.verified_by_ss?.name ? `${session.verified_by_ss.name} (${session.verified_by_ss.nik})` : 'Belum Diverifikasi'}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                    {session.verified_ss_at ? `Diverifikasi: ${formatDate(session.verified_ss_at)}` : session.status === 'SUBMITTED' ? 'Menunggu Verifikasi SS' : '-'}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                            <div className={`p-1.5 rounded-md shrink-0 ${
                                session.approved_by_sm_id
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                            }`}>
                                <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-muted-foreground text-[11px]">Penyetujuan Final (SM):</div>
                                <div className="font-semibold text-foreground">
                                    {session.approved_by_sm?.name ? `${session.approved_by_sm.name} (${session.approved_by_sm.nik})` : 'Belum Disetujui'}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                    {session.approved_sm_at ? `Disetujui: ${formatDate(session.approved_sm_at)}` : session.status === 'VERIFIED_SS' ? 'Menunggu Sign-off SM' : '-'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Three Pockets Breakdown Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Pocket 1: Denominations Table (7 cols on lg) */}
                    {/* Mobile Approval / Summary Compact 1-Column Card (< lg) */}
                    <div className="block lg:hidden col-span-12">
                        <Card className="border-border shadow-xs bg-card">
                            <CardHeader className="bg-muted/40 pb-3 border-b border-border">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                            <ShieldCheck className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-bold text-foreground">
                                                Ringkasan Mobile Opname
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                                {session.opname_type.replace('_', ' ')} • {session.opname_number}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <StatusBadge status={session.status} />
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3 text-xs">
                                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
                                        <span className="text-[10px] text-muted-foreground block font-sans">Total Fisik</span>
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                            {formatMoney(session.physical_total_cents)}
                                        </span>
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
                                        <span className="text-[10px] text-muted-foreground block font-sans">Target Plafon</span>
                                        <span className="font-bold text-foreground text-sm">
                                            {formatMoney(session.imprest_fund_cents)}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-3 rounded-lg border border-border bg-muted/30 flex items-center justify-between font-mono">
                                    <div>
                                        <span className="text-[10px] text-muted-foreground block font-sans font-semibold uppercase">
                                            Outstanding Variance
                                        </span>
                                        <StatusBadge status={session.variance_status} />
                                    </div>
                                    <span className={`text-base font-extrabold ${
                                        session.variance_status === 'BALANCED'
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : session.variance_status === 'SURPLUS'
                                            ? 'text-indigo-600 dark:text-indigo-400'
                                            : 'text-red-600 dark:text-red-400'
                                    }`}>
                                        {(session.outstanding_variance_cents ?? session.current_variance_cents) > 0 ? '+' : ''}
                                        {formatMoney(session.outstanding_variance_cents ?? session.current_variance_cents)}
                                    </span>
                                </div>

                                {session.status !== 'APPROVED' && (
                                    <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-10">
                                        <Link href="/opname/active">
                                            <Coins className="w-4 h-4 mr-1.5" />
                                            Buka di Workspace Aktif
                                        </Link>
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Table of Physical Items (Dynamic Grouping) */}
                    <div className={isKasKecil ? 'lg:col-span-7 space-y-6' : 'lg:col-span-12 space-y-6'}>
                        <Card className="border-border shadow-xs">
                            <CardHeader className="bg-muted/40 border-b border-border pb-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                                            <Banknote className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-bold text-foreground">
                                                Penghitungan Fisik ({session.opname_type.replace('_', ' ')})
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                                Hasil opname fisik per pecahan / unit
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[11px] text-muted-foreground block">Total Fisik</span>
                                        <span className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                            {formatMoney(session.physical_total_cents)}
                                        </span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold text-[11px] border-b border-border">
                                        <tr>
                                            <th className="py-2.5 px-4 w-12 text-center">No</th>
                                            <th className="py-2.5 px-4">Pecahan / Barang</th>
                                            <th className="py-2.5 px-4 text-center">Satuan</th>
                                            <th className="py-2.5 px-4 text-right">Jumlah Fisik</th>
                                            <th className="py-2.5 px-4 text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {Object.entries(groupedItems).map(([groupName, items]) => (
                                            <React.Fragment key={groupName}>
                                                <tr className="bg-muted/60 font-bold text-muted-foreground">
                                                    <td colSpan={5} className="py-1 px-4 text-[11px] uppercase tracking-wider">
                                                        {groupName} ({items.length} Item)
                                                    </td>
                                                </tr>
                                                {items.map((item, idx) => (
                                                    <tr key={item.id} className="hover:bg-muted/30">
                                                        <td className="py-2 px-4 text-center text-muted-foreground">{idx + 1}</td>
                                                        <td className="py-2 px-4 font-semibold text-foreground">
                                                            {item.item_definition?.label}
                                                            {item.condition && item.condition !== 'GOOD' && (
                                                                <Badge variant="outline" className="ml-2 text-[10px] border-amber-400 text-amber-600">
                                                                    {item.condition}
                                                                </Badge>
                                                            )}
                                                        </td>
                                                        <td className="py-2 px-4 text-center text-muted-foreground">{item.item_definition?.unit || 'lembar'}</td>
                                                        <td className="py-2 px-4 text-right font-mono font-bold">{item.count}</td>
                                                        <td className="py-2 px-4 text-right font-mono font-semibold text-foreground">
                                                            {formatMoney(item.subtotal_cents)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-emerald-50/40 dark:bg-emerald-950/30 border-t border-emerald-200 dark:border-emerald-800 font-bold text-xs">
                                        <tr>
                                            <td colSpan={4} className="py-3 px-4 text-right uppercase">
                                                Total Kas Fisik:
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                                                {formatMoney(session.physical_total_cents)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </CardContent>
                        </Card>

                        {/* Reference Lines for KAS_BESAR */}
                        {isKasBesar && session.reference_lines && session.reference_lines.length > 0 && (
                            <Card className="border-border shadow-xs">
                                <CardHeader className="bg-muted/40 border-b border-border pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-bold text-foreground">
                                            Rincian Dokumen Pendukung (Z-Report & Setoran Bank)
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold text-[11px] border-b border-border">
                                            <tr>
                                                <th className="py-2 px-4">Tipe</th>
                                                <th className="py-2 px-4">No. Referensi / Register</th>
                                                <th className="py-2 px-4 text-right">Nominal</th>
                                                <th className="py-2 px-4 text-center">Bukti Struk</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {session.reference_lines.map((ref) => (
                                                <tr key={ref.id} className="hover:bg-muted/30">
                                                    <td className="py-2 px-4 font-semibold">
                                                        <Badge variant="outline" className={ref.line_type === 'Z_REPORT' ? 'border-blue-400 text-blue-600' : 'border-amber-400 text-amber-600'}>
                                                            {ref.line_type === 'Z_REPORT' ? 'Z-Report POS' : 'Setoran Bank'}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-2 px-4 font-mono font-medium">{ref.reference_number}</td>
                                                    <td className="py-2 px-4 text-right font-mono font-bold">
                                                        {ref.line_type === 'BANK_DEPOSIT' ? '-' : '+'}{formatMoney(ref.amount_cents)}
                                                    </td>
                                                    <td className="py-2 px-4 text-center">
                                                        {ref.proof_attachment_url ? (
                                                            <a href={ref.proof_attachment_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center justify-center gap-1">
                                                                <ExternalLink className="w-3.5 h-3.5" /> Lihat
                                                            </a>
                                                        ) : (
                                                            <span className="text-muted-foreground italic">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Pocket 2 & Pocket 3 (Hanya ditampilkan untuk KAS_KECIL) */}
                    {isKasKecil && (
                        <div className="lg:col-span-5 space-y-6">
                            {/* Pocket 2: Bon Gantung (K_bon) */}
                            <Card className="border-border shadow-xs">
                                <CardHeader className="bg-muted/40 border-b border-border pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400">
                                                <Receipt className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-sm font-bold text-foreground">
                                                    Kantong 2 — Bon Gantung (K_bon)
                                                </CardTitle>
                                                <CardDescription className="text-xs">
                                                    {isLocked ? 'Snapshot voucher DISBURSED saat approval' : 'Daftar voucher DISBURSED aktif'}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <span className="font-mono text-sm font-bold text-purple-600 dark:text-purple-400">
                                            {formatMoney(session.vouchers_total_cents)}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-3">
                                    {disbursedVouchers.length === 0 ? (
                                        <div className="text-center py-6 text-muted-foreground text-xs">
                                            Tidak ada bon gantung pada sesi ini.
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-border max-h-64 overflow-y-auto pr-1">
                                            {disbursedVouchers.map((v) => (
                                                <div key={v.id} className="py-2 flex items-center justify-between text-xs">
                                                    <div className="truncate mr-2">
                                                        <p className="font-mono font-medium text-foreground truncate">
                                                            {v.voucher_number}
                                                        </p>
                                                        <p className="text-muted-foreground truncate text-[11px]">
                                                            {v.requester?.name || 'Pemohon'} • {v.purpose}
                                                        </p>
                                                    </div>
                                                    <span className="font-mono font-semibold text-foreground shrink-0">
                                                        {formatMoney(v.amount_cents)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Pocket 3: BRI Sub-Ledger (K_bri) */}
                            <Card className="border-border shadow-xs">
                                <CardHeader className="bg-muted/40 border-b border-border pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
                                                <Building2 className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-sm font-bold text-foreground">
                                                    Kantong 3 — Mutasi BRI (K_bri)
                                                </CardTitle>
                                                <CardDescription className="text-xs">
                                                    Rekonsiliasi mutasi bank dan alokasi dana
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                                            {formatMoney(session.bri_clean_balance_cents)}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 space-y-3 text-xs">
                                    <div className="flex justify-between items-center py-1 font-mono">
                                        <span className="text-muted-foreground font-sans">Saldo Mutasi Bank:</span>
                                        <span className="font-bold text-foreground">
                                            {formatMoney(session.sub_ledger?.bri_mutation_total_cents || 0)}
                                        </span>
                                    </div>

                                    <div className="border-t border-border pt-2 space-y-1.5 text-muted-foreground font-mono">
                                        <div className="flex justify-between">
                                            <span className="font-sans">Alokasi B2B:</span>
                                            <span>- {formatMoney(session.sub_ledger?.b2b_allocation_cents || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-sans">Alokasi Event:</span>
                                            <span>- {formatMoney(session.sub_ledger?.event_allocation_cents || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-sans">Alokasi Akselerasi:</span>
                                            <span>- {formatMoney(session.sub_ledger?.aksel_allocation_cents || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-sans">Alokasi Anonymous:</span>
                                            <span>- {formatMoney(session.sub_ledger?.anonymous_allocation_cents || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-sans">Alokasi Custom Lainnya:</span>
                                            <span>- {formatMoney(session.sub_ledger?.custom_allocations_total_cents || 0)}</span>
                                        </div>
                                    </div>

                                    <div className="border-t border-border pt-2 flex justify-between items-center bg-blue-50/50 dark:bg-blue-950/30 p-2.5 rounded-lg">
                                        <div>
                                            <span className="font-bold text-blue-900 dark:text-blue-100 block">
                                                Net Kas Kecil di BRI (K_bri)
                                            </span>
                                            <span className="text-[10px] text-muted-foreground font-sans">
                                                Mutasi - Total Alokasi
                                            </span>
                                        </div>
                                        <span className="font-mono text-base font-extrabold text-blue-600 dark:text-blue-400">
                                            {formatMoney(session.bri_clean_balance_cents)}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>

                {/* Section: Variance Resolution Ledger (if resolutions exist) */}
                {session.variance_resolutions && session.variance_resolutions.length > 0 && (
                    <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
                        <CardHeader className="bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-bold text-foreground">
                                    Buku Besar Resolusi Selisih (Resolution Ledger)
                                </CardTitle>
                                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    +{formatMoney(session.cumulative_resolved_cents ?? 0)} Disahkan
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 text-muted-foreground uppercase font-semibold text-[11px] border-b border-border">
                                    <tr>
                                        <th className="py-2.5 px-4">Jenis</th>
                                        <th className="py-2.5 px-4 text-right">Nominal</th>
                                        <th className="py-2.5 px-4">Alasan</th>
                                        <th className="py-2.5 px-4 text-center">Status</th>
                                        <th className="py-2.5 px-4">Diajukan Oleh</th>
                                        <th className="py-2.5 px-4">Disetujui Oleh</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {session.variance_resolutions.map((res) => (
                                        <tr key={res.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                                            <td className="py-2 px-4 font-semibold text-foreground">{res.kind}</td>
                                            <td className="py-2 px-4 text-right font-mono font-bold text-foreground">
                                                {formatMoney(res.amount_cents)}
                                            </td>
                                            <td className="py-2 px-4 text-muted-foreground">{res.reason}</td>
                                            <td className="py-2 px-4 text-center">
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        res.status === 'APPROVED'
                                                            ? 'border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950 text-[10px]'
                                                            : res.status === 'REJECTED'
                                                            ? 'border-red-500 text-red-700 bg-red-50 dark:bg-red-950 text-[10px]'
                                                            : 'border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950 text-[10px]'
                                                    }
                                                >
                                                    {res.status}
                                                </Badge>
                                            </td>
                                            <td className="py-2 px-4 text-muted-foreground">
                                                {res.created_by?.name || '-'}
                                            </td>
                                            <td className="py-2 px-4 text-muted-foreground">
                                                {res.approved_by?.name || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                )}

                {/* Final Variance Summary Banner */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs w-full md:w-auto font-mono">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-border">
                                <span className="text-muted-foreground block text-[10px] font-sans">K_fisik (Safe)</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                                    {formatMoney(session.physical_total_cents)}
                                </span>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-border">
                                <span className="text-muted-foreground block text-[10px] font-sans">K_bon (Bon)</span>
                                <span className="font-bold text-purple-600 dark:text-purple-400 text-xs sm:text-sm">
                                    {formatMoney(session.vouchers_total_cents)}
                                </span>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-border">
                                <span className="text-muted-foreground block text-[10px] font-sans">K_bri (Net BRI)</span>
                                <span className="font-bold text-blue-600 dark:text-blue-400 text-xs sm:text-sm">
                                    {formatMoney(session.bri_clean_balance_cents)}
                                </span>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-border">
                                <span className="text-muted-foreground block text-[10px] font-sans">Plafon Imprest</span>
                                <span className="font-bold text-foreground text-xs sm:text-sm">
                                    {formatMoney(session.imprest_fund_cents)}
                                </span>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-border">
                                <span className="text-muted-foreground block text-[10px] font-sans">Selisih Mentah</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                                    {(session.raw_discrepancy_cents ?? (session.total_actual_cents - session.imprest_fund_cents)) > 0 ? '+' : ''}
                                    {formatMoney(session.raw_discrepancy_cents ?? (session.total_actual_cents - session.imprest_fund_cents))}
                                </span>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-border">
                                <span className="text-muted-foreground block text-[10px] font-sans">Resolusi Sah</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                                    + {formatMoney(session.cumulative_resolved_cents ?? 0)}
                                </span>
                            </div>
                        </div>

                        <div className="text-right w-full md:w-auto flex md:flex-col items-center md:items-end justify-between md:justify-center">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground font-semibold uppercase">
                                    Outstanding Variance
                                </span>
                                <StatusBadge status={session.variance_status} />
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                                {session.variance_status === 'BALANCED' && (
                                    <Scale className="w-6 h-6 text-emerald-500" />
                                )}
                                {session.variance_status === 'SURPLUS' && (
                                    <TrendingUp className="w-6 h-6 text-indigo-500" />
                                )}
                                {session.variance_status === 'SHORTAGE' && (
                                    <TrendingDown className="w-6 h-6 text-red-500" />
                                )}
                                <span
                                    className={`font-mono font-extrabold text-2xl ${
                                        session.variance_status === 'BALANCED'
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : session.variance_status === 'SURPLUS'
                                            ? 'text-indigo-600 dark:text-indigo-400'
                                            : 'text-red-600 dark:text-red-400'
                                    }`}
                                >
                                    {(session.outstanding_variance_cents ?? session.current_variance_cents) > 0 ? '+' : ''}
                                    {formatMoney(session.outstanding_variance_cents ?? session.current_variance_cents)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Upload Signed BA Dialog */}
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleUploadSubmit}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <UploadCloud className="w-5 h-5 text-blue-600" />
                                Unggah Scan Berita Acara Basah
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Unggah berkas dokumen Berita Acara fisik yang telah dibubuhi tanda tangan basah oleh Kasir, Saksi (SS), dan Store Manager (SM).
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            {uploadError && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{uploadError}</span>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="signed_ba_show" className="text-xs font-semibold">
                                    Pilih Berkas Scan (PDF, JPG, PNG, WEBP — Maks. 10MB)
                                </Label>
                                <Input
                                    id="signed_ba_show"
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                    className="cursor-pointer text-xs"
                                    required
                                />
                                {selectedFile && (
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                        Berkas dipilih: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                                    </p>
                                )}
                            </div>

                            {session.signed_ba_scan_url && (
                                <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border rounded text-xs flex items-center justify-between">
                                    <span className="text-muted-foreground">Berkas sebelumnya:</span>
                                    <a
                                        href={session.signed_ba_scan_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-600 font-semibold underline flex items-center gap-1"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                        Lihat Berkas
                                    </a>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setUploadOpen(false)}
                                disabled={uploading}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={uploading || !selectedFile}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                            >
                                {uploading ? 'Mengunggah...' : 'Simpan & Lampirkan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

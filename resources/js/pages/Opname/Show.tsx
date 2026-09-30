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

    const itemCounts = session.item_counts || [];
    const paperMoney = itemCounts.filter((item) => item.item_definition?.group_label === 'Uang Kertas');
    const coinMoney = itemCounts.filter((item) => item.item_definition?.group_label === 'Uang Logam');
    const otherItems = itemCounts.filter(
        (item) => item.item_definition?.group_label !== 'Uang Kertas' && item.item_definition?.group_label !== 'Uang Logam'
    );

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
                                Seluruh perhitungan fisik kas, bon gantung, dan rekonsiliasi BRI telah terkunci permanen sesuai <strong>Rule 4 (Immutable Snapshot)</strong>. Selisih akhir <strong>{session.current_variance_cents > 0 ? '+' : ''}{formatMoney(session.current_variance_cents)}</strong> tercatat permanen dan dijadikan saldo awal selisih (V_prev) sesi berikutnya.
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
                    <div className="lg:col-span-7 space-y-6">
                        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
                            <CardHeader className="bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 pb-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                                            <Banknote className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-bold text-foreground">
                                                Kantong 1 — Kas Fisik Brankas (K_fisik)
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                                Hasil penghitungan fisik uang kertas dan uang logam
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[11px] text-muted-foreground block">Total K_fisik</span>
                                        <span className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                            {formatMoney(session.physical_total_cents)}
                                        </span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-muted-foreground uppercase font-semibold text-[11px] border-b border-border">
                                        <tr>
                                            <th className="py-2.5 px-4 w-12 text-center">No</th>
                                            <th className="py-2.5 px-4">Pecahan</th>
                                            <th className="py-2.5 px-4 text-center">Satuan</th>
                                            <th className="py-2.5 px-4 text-right">Jumlah</th>
                                            <th className="py-2.5 px-4 text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {/* Paper Money */}
                                        <tr className="bg-slate-100/50 dark:bg-slate-800/50 font-bold text-muted-foreground">
                                            <td colSpan={5} className="py-1 px-4 text-[11px]">Uang Kertas</td>
                                        </tr>
                                        {paperMoney.map((item, idx) => (
                                            <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                                                <td className="py-2 px-4 text-center text-muted-foreground">{idx + 1}</td>
                                                <td className="py-2 px-4 font-semibold text-foreground">{item.item_definition?.label}</td>
                                                <td className="py-2 px-4 text-center text-muted-foreground">{item.item_definition?.unit}</td>
                                                <td className="py-2 px-4 text-right font-mono font-bold">{item.count}</td>
                                                <td className="py-2 px-4 text-right font-mono font-semibold text-foreground">
                                                    {formatMoney(item.subtotal_cents)}
                                                </td>
                                            </tr>
                                        ))}

                                        {/* Coin Money */}
                                        <tr className="bg-slate-100/50 dark:bg-slate-800/50 font-bold text-muted-foreground">
                                            <td colSpan={5} className="py-1 px-4 text-[11px]">Uang Logam</td>
                                        </tr>
                                        {coinMoney.map((item, idx) => (
                                            <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                                                <td className="py-2 px-4 text-center text-muted-foreground">{paperMoney.length + idx + 1}</td>
                                                <td className="py-2 px-4 font-semibold text-foreground">{item.item_definition?.label}</td>
                                                <td className="py-2 px-4 text-center text-muted-foreground">{item.item_definition?.unit}</td>
                                                <td className="py-2 px-4 text-right font-mono font-bold">{item.count}</td>
                                                <td className="py-2 px-4 text-right font-mono font-semibold text-foreground">
                                                    {formatMoney(item.subtotal_cents)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-emerald-50/40 dark:bg-emerald-950/30 border-t border-emerald-200 dark:border-emerald-800 font-bold text-xs">
                                        <tr>
                                            <td colSpan={4} className="py-3 px-4 text-right uppercase">
                                                Total Kas Fisik (K_fisik):
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                                                {formatMoney(session.physical_total_cents)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Pocket 2 & Pocket 3 (5 cols on lg) */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* Pocket 2: Bon Gantung (K_bon) */}
                        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
                            <CardHeader className="bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 pb-3">
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
                        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
                            <CardHeader className="bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 pb-3">
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
                </div>

                {/* Final Variance Summary Banner */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs w-full md:w-auto font-mono">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-border">
                                <span className="text-muted-foreground block text-[11px] font-sans">K_fisik (Safe)</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                    {formatMoney(session.physical_total_cents)}
                                </span>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-border">
                                <span className="text-muted-foreground block text-[11px] font-sans">K_bon (Bon)</span>
                                <span className="font-bold text-purple-600 dark:text-purple-400 text-sm">
                                    {formatMoney(session.vouchers_total_cents)}
                                </span>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-border">
                                <span className="text-muted-foreground block text-[11px] font-sans">K_bri (Net BRI)</span>
                                <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                                    {formatMoney(session.bri_clean_balance_cents)}
                                </span>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-border">
                                <span className="text-muted-foreground block text-[11px] font-sans">Target (Plafon+V_prev)</span>
                                <span className="font-bold text-foreground text-sm">
                                    {formatMoney(session.target_reconciled_cents)}
                                </span>
                            </div>
                        </div>

                        <div className="text-right w-full md:w-auto flex md:flex-col items-center md:items-end justify-between md:justify-center">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground font-semibold uppercase">
                                    Selisih Rekonsiliasi (V_current)
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
                                    {session.current_variance_cents > 0 ? '+' : ''}
                                    {formatMoney(session.current_variance_cents)}
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

import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    Printer,
    FileSpreadsheet,
    ArrowLeft,
    UploadCloud,
    FileText,
    CheckCircle2,
    ShieldCheck,
    Lock,
    ExternalLink,
    AlertCircle,
    X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatMoney } from '@/lib/money';
import { CashOpnameSession, DisbursedVoucher } from '@/types/opname';

interface OpnameReportProps {
    session: CashOpnameSession;
    disbursedVouchers: DisbursedVoucher[];
    permissions?: {
        canExportExcel?: boolean;
        canUploadSignedBa?: boolean;
    };
}

export default function OpnameReportPage({
    session,
    disbursedVouchers = [],
    permissions = {},
}: OpnameReportProps) {
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const handlePrint = () => {
        window.print();
    };

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

    const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    const formatDateTime = (dateStr?: string | null) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return dateStr;
        }
    };

    const itemCounts = session.item_counts || [];
    const paperMoney = itemCounts.filter((item) => item.item_definition?.group_label === 'Uang Kertas');
    const coinMoney = itemCounts.filter((item) => item.item_definition?.group_label === 'Uang Logam');
    const otherItems = itemCounts.filter(
        (item) => item.item_definition?.group_label !== 'Uang Kertas' && item.item_definition?.group_label !== 'Uang Logam'
    );

    const paperSubtotal = paperMoney.reduce((acc, curr) => acc + (curr.subtotal_cents || 0), 0);
    const coinSubtotal = coinMoney.reduce((acc, curr) => acc + (curr.subtotal_cents || 0), 0);
    const otherSubtotal = otherItems.reduce((acc, curr) => acc + (curr.subtotal_cents || 0), 0);

    const subLedger = session.sub_ledger;
    const briAllocations = [
        { label: 'B2B (School / Corporate Books)', amount: subLedger?.b2b_allocation_cents || 0 },
        { label: 'Event & Exhibition (Bazaar)', amount: subLedger?.event_allocation_cents || 0 },
        { label: 'Active Selling (Aksel)', amount: subLedger?.aksel_allocation_cents || 0 },
        { label: 'Anonymous Transfer (Unidentified)', amount: subLedger?.anonymous_allocation_cents || 0 },
        { label: 'Custom Allocations (Lainnya)', amount: subLedger?.custom_allocations_total_cents || 0 },
    ];
    const totalBriAllocations = briAllocations.reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans print:bg-white print:text-black">
            <Head title={`Cetak Berita Acara Cash Opname — ${session.opname_number}`} />

            {/* Print Styles */}
            <style>{`
                @media print {
                    nav, .sidebar, .topbar, button, .no-print {
                        display: none !important;
                    }
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        box-shadow: none !important;
                    }
                    body {
                        background: #ffffff !important;
                        color: #000000 !important;
                    }
                    @page {
                        size: A4 portrait;
                        margin: 8mm;
                    }
                    table {
                        page-break-inside: avoid;
                    }
                    tr {
                        page-break-inside: avoid;
                    }
                    .page-break {
                        page-break-before: always;
                    }
                }
            `}</style>

            {/* Top Toolbar (Hidden on print) */}
            <header className="no-print sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 py-3 px-4 sm:px-8 shadow-xs">
                <div className="max-w-[210mm] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Link href={`/opname/${session.id}`}>
                            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Kembali ke Detail Sesi
                            </Button>
                        </Link>
                        <span className="text-xs font-semibold text-muted-foreground hidden md:inline">
                            | Pratinjau Lembar Berita Acara A4
                        </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {permissions.canExportExcel && (
                            <a href={`/opname/${session.id}/export-excel`} download>
                                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950">
                                    <FileSpreadsheet className="w-3.5 h-3.5" />
                                    Unduh Excel (.xlsx)
                                </Button>
                            </a>
                        )}

                        <Button onClick={handlePrint} size="sm" className="h-8 gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs font-semibold">
                            <Printer className="w-3.5 h-3.5" />
                            Cetak Dokumen (Ctrl+P)
                        </Button>

                        {permissions.canUploadSignedBa && (
                            <Button
                                onClick={() => setUploadOpen(true)}
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1.5 text-xs border-blue-400 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 font-semibold"
                            >
                                <UploadCloud className="w-3.5 h-3.5" />
                                {session.signed_ba_scan_url ? 'Ganti Berkas Scan BA' : 'Unggah Scan BA Fisik'}
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            {/* Document Sheet (Styled for A4 print & preview) */}
            <main className="py-6 px-2 sm:px-4 print:p-0">
                <article className="max-w-[210mm] mx-auto bg-white text-slate-900 p-6 sm:p-10 shadow-lg border border-slate-200 rounded-lg print:shadow-none print:border-none print:rounded-none print:p-0 text-[11px] leading-snug">
                    
                    {/* Header: Brand & Document Title */}
                    <div className="border-b-2 border-slate-900 pb-3 text-center relative">
                        <div className="uppercase tracking-widest text-[10px] font-bold text-slate-600 mb-0.5">
                            PT GRAMEDIA ASRI MEDIA
                        </div>
                        <h1 className="text-xl font-extrabold tracking-tight text-slate-950 uppercase font-sans">
                            BERITA ACARA CASH OPNAME (BACO)
                        </h1>
                        <div className="text-xs font-semibold text-slate-700 mt-0.5">
                            Unit Toko: {session.store?.name || 'Gramedia Store'} ({session.store?.code || '-'})
                        </div>
                        {session.store?.address && (
                            <div className="text-[10px] text-slate-500">{session.store.address}</div>
                        )}
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 py-3 border-b border-slate-300 text-xs">
                        <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                            <span className="text-slate-600 font-semibold">Nomor Dokumen:</span>
                            <span className="font-mono font-bold">{session.opname_number}</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                            <span className="text-slate-600 font-semibold">Tanggal Opname:</span>
                            <span className="font-bold">{formatDate(session.date)}</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                            <span className="text-slate-600 font-semibold">Jenis Cash Opname:</span>
                            <span className="font-bold">{session.opname_type}</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                            <span className="text-slate-600 font-semibold">Status Pengesahan:</span>
                            <span className="font-bold uppercase tracking-wider">{session.status}</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                            <span className="text-slate-600 font-semibold">Plafon Kas Tetap (Imprest):</span>
                            <span className="font-mono font-bold">{formatMoney(session.imprest_fund_cents)}</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                            <span className="text-slate-600 font-semibold">Waktu Cetak:</span>
                            <span className="text-slate-700">{formatDateTime(new Date().toISOString())}</span>
                        </div>
                    </div>

                    {/* Section 1: Physical Cash Count (K_fisik) */}
                    <section className="mt-4">
                        <div className="bg-slate-200 text-slate-900 font-bold px-2 py-1 text-xs uppercase tracking-wide border border-slate-300">
                            1. Kantong 1: Perhitungan Fisik Kas Brankas (K_fisik)
                        </div>
                        <table className="w-full border-collapse border border-slate-300 text-left mt-1 text-[11px]">
                            <thead>
                                <tr className="bg-slate-100 font-bold text-center border-b border-slate-300">
                                    <th className="py-1 px-2 border-r border-slate-300 w-10">No</th>
                                    <th className="py-1 px-2 border-r border-slate-300">Pecahan / Uraian</th>
                                    <th className="py-1 px-2 border-r border-slate-300 w-28 text-right">Nilai Pecahan</th>
                                    <th className="py-1 px-2 border-r border-slate-300 w-24 text-right">Jumlah</th>
                                    <th className="py-1 px-2 text-right w-36">Subtotal (Rp)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Uang Kertas */}
                                {paperMoney.length > 0 && (
                                    <>
                                        <tr className="bg-slate-50 font-bold italic border-b border-slate-200 text-[10px]">
                                            <td colSpan={5} className="py-0.5 px-2">Kelompok Uang Kertas</td>
                                        </tr>
                                        {paperMoney.map((item, idx) => (
                                            <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50">
                                                <td className="py-1 px-2 border-r border-slate-300 text-center">{idx + 1}</td>
                                                <td className="py-1 px-2 border-r border-slate-300 font-medium">
                                                    {item.item_definition?.label || 'Pecahan Kertas'}
                                                </td>
                                                <td className="py-1 px-2 border-r border-slate-300 text-right font-mono">
                                                    {formatMoney(item.item_definition?.nominal_cents || 0)}
                                                </td>
                                                <td className="py-1 px-2 border-r border-slate-300 text-right font-mono">
                                                    {item.count.toLocaleString('id-ID')}
                                                </td>
                                                <td className="py-1 px-2 text-right font-mono font-semibold">
                                                    {formatMoney(item.subtotal_cents)}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="bg-slate-100 font-semibold border-b border-slate-300 text-slate-800">
                                            <td colSpan={4} className="py-1 px-2 text-right border-r border-slate-300">Subtotal Uang Kertas:</td>
                                            <td className="py-1 px-2 text-right font-mono font-bold">{formatMoney(paperSubtotal)}</td>
                                        </tr>
                                    </>
                                )}

                                {/* Uang Logam */}
                                {coinMoney.length > 0 && (
                                    <>
                                        <tr className="bg-slate-50 font-bold italic border-b border-slate-200 text-[10px]">
                                            <td colSpan={5} className="py-0.5 px-2">Kelompok Uang Logam</td>
                                        </tr>
                                        {coinMoney.map((item, idx) => (
                                            <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50">
                                                <td className="py-1 px-2 border-r border-slate-300 text-center">{idx + 1}</td>
                                                <td className="py-1 px-2 border-r border-slate-300 font-medium">
                                                    {item.item_definition?.label || 'Pecahan Logam'}
                                                </td>
                                                <td className="py-1 px-2 border-r border-slate-300 text-right font-mono">
                                                    {formatMoney(item.item_definition?.nominal_cents || 0)}
                                                </td>
                                                <td className="py-1 px-2 border-r border-slate-300 text-right font-mono">
                                                    {item.count.toLocaleString('id-ID')}
                                                </td>
                                                <td className="py-1 px-2 text-right font-mono font-semibold">
                                                    {formatMoney(item.subtotal_cents)}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="bg-slate-100 font-semibold border-b border-slate-300 text-slate-800">
                                            <td colSpan={4} className="py-1 px-2 text-right border-r border-slate-300">Subtotal Uang Logam:</td>
                                            <td className="py-1 px-2 text-right font-mono font-bold">{formatMoney(coinSubtotal)}</td>
                                        </tr>
                                    </>
                                )}

                                {/* Other Items if any */}
                                {otherItems.length > 0 && (
                                    <>
                                        <tr className="bg-slate-50 font-bold italic border-b border-slate-200 text-[10px]">
                                            <td colSpan={5} className="py-0.5 px-2">Kelompok Item Lainnya</td>
                                        </tr>
                                        {otherItems.map((item, idx) => (
                                            <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50">
                                                <td className="py-1 px-2 border-r border-slate-300 text-center">{idx + 1}</td>
                                                <td className="py-1 px-2 border-r border-slate-300 font-medium">
                                                    {item.item_definition?.label || 'Item'}
                                                </td>
                                                <td className="py-1 px-2 border-r border-slate-300 text-right font-mono">
                                                    {formatMoney(item.item_definition?.nominal_cents || 0)}
                                                </td>
                                                <td className="py-1 px-2 border-r border-slate-300 text-right font-mono">
                                                    {item.count.toLocaleString('id-ID')}
                                                </td>
                                                <td className="py-1 px-2 text-right font-mono font-semibold">
                                                    {formatMoney(item.subtotal_cents)}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="bg-slate-100 font-semibold border-b border-slate-300 text-slate-800">
                                            <td colSpan={4} className="py-1 px-2 text-right border-r border-slate-300">Subtotal Lainnya:</td>
                                            <td className="py-1 px-2 text-right font-mono font-bold">{formatMoney(otherSubtotal)}</td>
                                        </tr>
                                    </>
                                )}
                            </tbody>
                            <tfoot>
                                <tr className="bg-slate-200 font-bold text-slate-900 border-t-2 border-slate-400">
                                    <td colSpan={4} className="py-1.5 px-2 text-right border-r border-slate-300 uppercase">
                                        TOTAL KAS FISIK BRANKAS (K_fisik):
                                    </td>
                                    <td className="py-1.5 px-2 text-right font-mono text-sm font-extrabold">
                                        {formatMoney(session.physical_total_cents)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </section>

                    {/* Section 2: Outstanding Vouchers (K_bon) */}
                    <section className="mt-4">
                        <div className="bg-slate-200 text-slate-900 font-bold px-2 py-1 text-xs uppercase tracking-wide border border-slate-300">
                            2. Kantong 2: Bon Kas Kecil Gantung / Vouchers (K_bon)
                        </div>
                        <table className="w-full border-collapse border border-slate-300 text-left mt-1 text-[11px]">
                            <thead>
                                <tr className="bg-slate-100 font-bold text-center border-b border-slate-300">
                                    <th className="py-1 px-2 border-r border-slate-300 w-10">No</th>
                                    <th className="py-1 px-2 border-r border-slate-300 w-36">No. Voucher</th>
                                    <th className="py-1 px-2 border-r border-slate-300">Pemohon & Keperluan</th>
                                    <th className="py-1 px-2 border-r border-slate-300 w-28 text-center">Kategori</th>
                                    <th className="py-1 px-2 text-right w-36">Nominal (Rp)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {disbursedVouchers.length > 0 ? (
                                    disbursedVouchers.map((v, idx) => (
                                        <tr key={v.id} className="border-b border-slate-200 hover:bg-slate-50">
                                            <td className="py-1 px-2 border-r border-slate-300 text-center">{idx + 1}</td>
                                            <td className="py-1 px-2 border-r border-slate-300 font-mono font-medium">{v.voucher_number}</td>
                                            <td className="py-1 px-2 border-r border-slate-300">
                                                <span className="font-semibold">{v.requester?.name || 'Staff'}</span>
                                                <span className="text-slate-500"> — {v.purpose}</span>
                                            </td>
                                            <td className="py-1 px-2 border-r border-slate-300 text-center text-[10px] uppercase font-semibold">
                                                {v.category}
                                            </td>
                                            <td className="py-1 px-2 text-right font-mono font-semibold">
                                                {formatMoney(v.amount_cents)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr className="border-b border-slate-200">
                                        <td colSpan={5} className="py-2 px-3 text-center italic text-slate-500">
                                            Nihil — Tidak ada voucher bon gantung yang aktif pada periode ini.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot>
                                <tr className="bg-slate-200 font-bold text-slate-900 border-t-2 border-slate-400">
                                    <td colSpan={4} className="py-1.5 px-2 text-right border-r border-slate-300 uppercase">
                                        TOTAL BON KAS KECIL GANTUNG (K_bon):
                                    </td>
                                    <td className="py-1.5 px-2 text-right font-mono text-sm font-extrabold">
                                        {formatMoney(session.vouchers_total_cents)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </section>

                    {/* Section 3: BRI Sub-Ledger (K_bri) */}
                    <section className="mt-4">
                        <div className="bg-slate-200 text-slate-900 font-bold px-2 py-1 text-xs uppercase tracking-wide border border-slate-300">
                            3. Kantong 3: Rekonsiliasi Kas Kecil Bank BRI (K_bri)
                        </div>
                        <table className="w-full border-collapse border border-slate-300 text-left mt-1 text-[11px]">
                            <tbody>
                                <tr className="border-b border-slate-300 font-semibold bg-slate-50">
                                    <td className="py-1.5 px-2 border-r border-slate-300 w-10 text-center font-bold">3.1</td>
                                    <td className="py-1.5 px-2 border-r border-slate-300 font-bold text-slate-900">
                                        Saldo Mutasi Rekening Koran Bank BRI (Bukti Terlampir)
                                    </td>
                                    <td className="py-1.5 px-2 text-right font-mono font-bold w-36">
                                        {formatMoney(subLedger?.bri_mutation_total_cents || 0)}
                                    </td>
                                </tr>
                                <tr className="bg-slate-100 font-bold italic border-b border-slate-200 text-[10px]">
                                    <td className="py-1 px-2 border-r border-slate-300 text-center">3.2</td>
                                    <td colSpan={2} className="py-1 px-2">Alokasi Dana Non-Kas Kecil (Faktor Pengurang Rekening Koran):</td>
                                </tr>
                                {briAllocations.map((alloc, idx) => (
                                    <tr key={idx} className="border-b border-slate-200">
                                        <td className="py-1 px-2 border-r border-slate-300 text-center text-slate-400">-</td>
                                        <td className="py-1 px-2 border-r border-slate-300 text-slate-700 pl-6">
                                            {alloc.label}
                                        </td>
                                        <td className="py-1 px-2 text-right font-mono text-slate-700">
                                            {formatMoney(alloc.amount)}
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-slate-100 font-semibold border-b border-slate-300">
                                    <td colSpan={2} className="py-1 px-2 text-right border-r border-slate-300">
                                        Total Alokasi Non-Kas Kecil:
                                    </td>
                                    <td className="py-1 px-2 text-right font-mono font-bold">
                                        {formatMoney(totalBriAllocations)}
                                    </td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr className="bg-slate-200 font-bold text-slate-900 border-t-2 border-slate-400">
                                    <td colSpan={2} className="py-1.5 px-2 text-right border-r border-slate-300 uppercase">
                                        TOTAL KAS KECIL BANK BRI (K_bri = Mutasi - Alokasi):
                                    </td>
                                    <td className="py-1.5 px-2 text-right font-mono text-sm font-extrabold">
                                        {formatMoney(session.bri_clean_balance_cents)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </section>

                    {/* Section 4: Variance Engine Summary */}
                    <section className="mt-4">
                        <div className="bg-slate-200 text-slate-900 font-bold px-2 py-1 text-xs uppercase tracking-wide border border-slate-300">
                            4. Rekapitulasi & Hasil Rekonsiliasi Selisih
                        </div>
                        <table className="w-full border-collapse border border-slate-300 text-left mt-1 text-[11px]">
                            <tbody>
                                <tr className="border-b border-slate-200 font-semibold">
                                    <td className="py-1.5 px-2 border-r border-slate-300 w-10 text-center">4.1</td>
                                    <td className="py-1.5 px-2 border-r border-slate-300 font-bold">
                                        TOTAL KAS AKTUAL (K_fisik + K_bon + K_bri)
                                    </td>
                                    <td className="py-1.5 px-2 text-right font-mono font-bold w-36 text-blue-900">
                                        {formatMoney(session.total_actual_cents)}
                                    </td>
                                </tr>
                                <tr className="border-b border-slate-200">
                                    <td className="py-1 px-2 border-r border-slate-300 text-center">4.2</td>
                                    <td className="py-1 px-2 border-r border-slate-300 pl-6 text-slate-700">
                                        Plafon Kas Tetap (Imprest Fund)
                                    </td>
                                    <td className="py-1 px-2 text-right font-mono text-slate-700 w-36">
                                        {formatMoney(session.imprest_fund_cents)}
                                    </td>
                                </tr>
                                <tr className="border-b border-slate-200">
                                    <td className="py-1 px-2 border-r border-slate-300 text-center">4.3</td>
                                    <td className="py-1 px-2 border-r border-slate-300 pl-6 text-slate-700">
                                        Selisih Periode Sebelumnya (V_prev carry-forward)
                                    </td>
                                    <td className="py-1 px-2 text-right font-mono text-slate-700 w-36">
                                        {session.previous_variance_cents > 0 ? '+' : ''}{formatMoney(session.previous_variance_cents)}
                                    </td>
                                </tr>
                                <tr className="border-b border-slate-300 bg-slate-100 font-semibold">
                                    <td colSpan={2} className="py-1 px-2 text-right border-r border-slate-300">
                                        TARGET REKONSILIASI (Plafon + V_prev):
                                    </td>
                                    <td className="py-1 px-2 text-right font-mono font-bold w-36">
                                        {formatMoney(session.target_reconciled_cents)}
                                    </td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr className="bg-amber-100/80 font-bold text-slate-900 border-t-2 border-slate-400">
                                    <td colSpan={2} className="py-2 px-2 text-right border-r border-slate-300 uppercase text-xs">
                                        SELISIH KAS OPNAME (V_current = Aktual - Target):
                                    </td>
                                    <td className="py-2 px-2 text-right font-mono text-base font-extrabold w-36">
                                        {session.current_variance_cents > 0 ? '+' : ''}
                                        {formatMoney(session.current_variance_cents)}
                                    </td>
                                </tr>
                                <tr className="bg-white border-t border-slate-300">
                                    <td colSpan={2} className="py-1.5 px-2 text-right border-r border-slate-300 font-semibold text-xs">
                                        STATUS HASIL CASH OPNAME:
                                    </td>
                                    <td className="py-1.5 px-2 text-center font-bold text-xs uppercase tracking-wider">
                                        <span className={`px-2 py-0.5 rounded border ${
                                            session.variance_status === 'BALANCED'
                                                ? 'bg-emerald-100 border-emerald-500 text-emerald-800'
                                                : session.variance_status === 'SURPLUS'
                                                ? 'bg-blue-100 border-blue-500 text-blue-800'
                                                : 'bg-red-100 border-red-500 text-red-800'
                                        }`}>
                                            {session.variance_status}
                                        </span>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                        {session.notes && (
                            <div className="mt-2 p-2 rounded bg-slate-50 border border-slate-200 text-xs italic text-slate-700">
                                <strong>Catatan Store Manager:</strong> "{session.notes}"
                            </div>
                        )}
                    </section>

                    {/* Section 5: Sign-Off (Formal 3-Column Signature Table) */}
                    <section className="mt-6 border border-slate-300">
                        <div className="bg-slate-200 text-slate-900 font-bold px-2 py-1 text-xs uppercase tracking-wide border-b border-slate-300 text-center">
                            5. Pengesahan & Tanda Tangan Berita Acara
                        </div>
                        <div className="grid grid-cols-3 divide-x divide-slate-300 text-center text-xs">
                            {/* Column 1: Kasir / SAC */}
                            <div className="flex flex-col justify-between p-3">
                                <div>
                                    <div className="font-bold text-slate-800">Dibuat Oleh,</div>
                                    <div className="text-[10px] text-slate-500 font-semibold">(Kasir / SAC Toko)</div>
                                </div>
                                <div className="h-20 flex items-center justify-center text-slate-300 italic text-[11px] border-b border-dashed border-slate-300 my-2">
                                    (Tanda Tangan Basah)
                                </div>
                                <div className="text-left space-y-0.5 text-[11px]">
                                    <div><strong>Nama:</strong> {session.created_by?.name || '..................................'}</div>
                                    <div><strong>NIK:</strong> {session.created_by?.nik || '..................................'}</div>
                                    <div className="text-slate-500 text-[10px]"><strong>Waktu:</strong> {formatDateTime(session.created_at)}</div>
                                </div>
                            </div>

                            {/* Column 2: Saksi / SS */}
                            <div className="flex flex-col justify-between p-3">
                                <div>
                                    <div className="font-bold text-slate-800">Diverifikasi Saksi,</div>
                                    <div className="text-[10px] text-slate-500 font-semibold">(Store Supervisor / SS)</div>
                                </div>
                                <div className="h-20 flex items-center justify-center text-slate-300 italic text-[11px] border-b border-dashed border-slate-300 my-2">
                                    (Tanda Tangan Basah)
                                </div>
                                <div className="text-left space-y-0.5 text-[11px]">
                                    <div><strong>Nama:</strong> {session.verified_by_ss?.name || '..................................'}</div>
                                    <div><strong>NIK:</strong> {session.verified_by_ss?.nik || '..................................'}</div>
                                    <div className="text-slate-500 text-[10px]"><strong>Waktu:</strong> {formatDateTime(session.verified_ss_at)}</div>
                                </div>
                            </div>

                            {/* Column 3: Store Manager / SM */}
                            <div className="flex flex-col justify-between p-3">
                                <div>
                                    <div className="font-bold text-slate-800">Disetujui Final,</div>
                                    <div className="text-[10px] text-slate-500 font-semibold">(Store Manager / SM)</div>
                                </div>
                                <div className="h-20 flex items-center justify-center text-slate-300 italic text-[11px] border-b border-dashed border-slate-300 my-2">
                                    (Tanda Tangan Basah)
                                </div>
                                <div className="text-left space-y-0.5 text-[11px]">
                                    <div><strong>Nama:</strong> {session.approved_by_sm?.name || '..................................'}</div>
                                    <div><strong>NIK:</strong> {session.approved_by_sm?.nik || '..................................'}</div>
                                    <div className="text-slate-500 text-[10px]"><strong>Waktu:</strong> {formatDateTime(session.approved_sm_at)}</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Attached Signed Physical BA Scan Banner (if uploaded) */}
                    {session.signed_ba_scan_url && (
                        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-300 rounded text-xs flex items-center justify-between">
                            <div className="flex items-center gap-2 text-emerald-800">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>
                                    <strong>Dokumen Fisik Terarsip:</strong> Scan Berita Acara basah bertanda tangan telah diunggah dan terlampir pada sistem.
                                </span>
                            </div>
                            <a
                                href={session.signed_ba_scan_url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-bold text-emerald-700 underline flex items-center gap-1 hover:text-emerald-900 shrink-0"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Buka Berkas Scan
                            </a>
                        </div>
                    )}
                </article>
            </main>

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
                                <Label htmlFor="signed_ba" className="text-xs font-semibold">
                                    Pilih Berkas Scan (PDF, JPG, PNG, WEBP — Maks. 10MB)
                                </Label>
                                <Input
                                    id="signed_ba"
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
        </div>
    );
}

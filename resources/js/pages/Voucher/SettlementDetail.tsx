import React from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    Printer,
    FileSpreadsheet,
    ArrowLeft,
    CheckCircle2,
    Calendar,
    Layers,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatMoney } from '@/lib/money';
import { PettyCashSettlement, PettyCashVoucher } from '@/types/voucher';
import { User } from '@/types/auth';

interface SettlementDetailProps {
    settlement: PettyCashSettlement;
    categories: { code: string; name: string }[];
    storeManager?: User | null;
}

export default function SettlementDetailPage({
    settlement,
    categories,
    storeManager,
}: SettlementDetailProps) {
    const handlePrint = () => {
        window.print();
    };

    const store = settlement.store;
    const storeName = store?.name || 'Gramedia World Karawang';
    const storeAddress = store?.address || 'Kavling Komersial blok V, Jl. Galuh Mas Raya';
    const storeCode = store?.code || 'GAM435';
    const vouchers: PettyCashVoucher[] = settlement.vouchers || [];

    // Calculate sum per category column
    const categoryTotals: Record<string, number> = {};
    categories.forEach((cat) => {
        categoryTotals[cat.code] = vouchers
            .filter((v) => v.category === cat.code)
            .reduce((sum, v) => sum + v.amount_cents, 0);
    });

    const formatNumberOnly = (cents: number) => {
        if (!cents) return '';
        return (cents / 100).toLocaleString('id-ID');
    };

    const formatDateShort = (dateStr?: string | null) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        const day = String(d.getDate()).padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const month = months[d.getMonth()];
        const year = String(d.getFullYear()).slice(-2);
        return `${day}-${month}-${year}`;
    };

    const formatDateLong = (dateStr?: string | null) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    // Extract city name from store name or default
    let cityName = 'Karawang';
    const cityMatch = storeName.match(/(Jakarta|Bandung|Surabaya|Semarang|Yogyakarta|Karawang|Bekasi|Bogor|Depok|Tangerang|Palembang|Medan|Denpasar|Makassar)/i);
    if (cityMatch) {
        cityName = cityMatch[1];
    }

    const sacName = settlement.settled_by?.name || 'AULIA NUR ENDAYANI';
    const smName = storeManager?.name || 'ENY SUSANTI';

    return (
        <AppLayout title={`Rekap Kas Kecil - ${settlement.settlement_number}`}>
            <Head title={`Rekap Kas Kecil - ${settlement.settlement_number}`} />

            <div className="space-y-6">
                {/* Action Bar (Hidden on print) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                    <div className="flex items-center gap-3">
                        <Link href="/vouchers/settlements">
                            <Button variant="outline" size="sm" className="gap-2 shadow-xs">
                                <ArrowLeft className="size-4" />
                                Riwayat Rekap
                            </Button>
                        </Link>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">
                                Rekap Pengeluaran Kas Kecil
                            </h2>
                            <p className="text-xs text-muted-foreground font-mono">
                                {settlement.settlement_number}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="gap-2 text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 border-emerald-200 dark:border-emerald-800"
                        >
                            <a
                                href={`/vouchers/settlements/${settlement.id}/export-excel`}
                                download
                            >
                                <FileSpreadsheet className="size-4" />
                                Download Excel (.xlsx)
                            </a>
                        </Button>

                        <Button
                            size="sm"
                            onClick={handlePrint}
                            className="gap-2 bg-primary text-primary-foreground shadow-xs"
                        >
                            <Printer className="size-4" />
                            Cetak Dokumen (Print / PDF)
                        </Button>
                    </div>
                </div>

                {/* Document Sheet (Styled for Screen & Crisp A4 Landscape Print) */}
                <Card className="border shadow-md bg-white text-slate-900 p-6 md:p-8 print:p-0 print:border-none print:shadow-none overflow-x-auto">
                    <div className="min-w-[950px] space-y-4 text-xs font-sans">
                        {/* Store Letterhead */}
                        <div className="flex justify-between items-start border-b pb-3 border-slate-200">
                            <div>
                                <h1 className="text-base font-bold text-slate-900 tracking-tight uppercase">
                                    {storeName}
                                </h1>
                                <p className="text-[11px] text-slate-600">
                                    {storeAddress}
                                </p>
                                <p className="text-[11px] text-slate-500 font-mono">
                                    Kode Toko: {storeCode}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-700 font-mono text-[11px] font-bold rounded border border-slate-200">
                                    STATUS: {settlement.status}
                                </span>
                            </div>
                        </div>

                        {/* Title and Invoice Number Bar */}
                        <div className="flex justify-between items-baseline pt-2">
                            <div>
                                <h2 className="text-sm font-bold text-slate-900 capitalize">
                                    Rekap pengeluaran kas kecil
                                </h2>
                            </div>
                            <div>
                                <span className="font-mono font-bold text-xs text-slate-900">
                                    No. inv : {settlement.settlement_number}
                                </span>
                            </div>
                        </div>

                        {/* Columnar Matrix Table */}
                        <div className="overflow-x-auto border border-slate-300 rounded-sm">
                            <table className="w-full text-left border-collapse text-[10.5px]">
                                <thead>
                                    <tr className="bg-slate-100 border-b border-slate-300 divide-x divide-slate-300 font-bold text-slate-800">
                                        <th className="py-2 px-2 text-center w-20 whitespace-nowrap">Tanggal</th>
                                        <th className="py-2 px-2 text-left w-36 whitespace-nowrap">Employee Id</th>
                                        {categories.map((cat) => (
                                            <th
                                                key={cat.code}
                                                className="py-2 px-2 text-right min-w-[70px] whitespace-normal leading-tight font-semibold"
                                                title={cat.name}
                                            >
                                                {cat.name}
                                            </th>
                                        ))}
                                        <th className="py-2 px-2.5 text-left min-w-[200px]">Keterangan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {vouchers.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={3 + categories.length}
                                                className="text-center py-6 text-slate-400 italic"
                                            >
                                                Tidak ada transaksi dalam rekap ini.
                                            </td>
                                        </tr>
                                    ) : (
                                        vouchers.map((voucher) => {
                                            const requester = voucher.requester;
                                            const employeeIdStr = requester
                                                ? `${requester.name} ${requester.nik ? requester.nik : ''}`
                                                : '-';

                                            return (
                                                <tr
                                                    key={voucher.id}
                                                    className="divide-x divide-slate-200 hover:bg-slate-50/60 print:hover:bg-transparent"
                                                >
                                                    <td className="py-1 px-2 text-center text-slate-600 font-mono whitespace-nowrap">
                                                        {formatDateShort(voucher.disbursed_at || voucher.created_at)}
                                                    </td>
                                                    <td className="py-1 px-2 text-slate-800 whitespace-nowrap max-w-[150px] truncate" title={employeeIdStr}>
                                                        {employeeIdStr}
                                                    </td>
                                                    {categories.map((cat) => {
                                                        const isMatch = voucher.category === cat.code;
                                                        return (
                                                            <td
                                                                key={cat.code}
                                                                className="py-1 px-2 text-right font-mono font-medium text-slate-800 whitespace-nowrap"
                                                            >
                                                                {isMatch ? formatNumberOnly(voucher.amount_cents) : ''}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="py-1 px-2.5 text-slate-700 leading-snug">
                                                        {voucher.purpose}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}

                                    {/* Bottom TOTAL row */}
                                    <tr className="bg-slate-100 border-t-2 border-slate-300 divide-x divide-slate-300 font-bold text-slate-900">
                                        <td colSpan={2} className="py-2 px-3 text-center uppercase tracking-wider text-xs">
                                            TOTAL
                                        </td>
                                        {categories.map((cat) => {
                                            const total = categoryTotals[cat.code] || 0;
                                            return (
                                                <td
                                                    key={cat.code}
                                                    className="py-2 px-2 text-right font-mono text-[11px] whitespace-nowrap"
                                                >
                                                    {total > 0 ? formatNumberOnly(total) : ''}
                                                </td>
                                            );
                                        })}
                                        <td className="py-2 px-2.5 text-right font-mono font-extrabold text-xs text-primary whitespace-nowrap">
                                            {formatMoney(settlement.total_amount_cents)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Signatures & Footer block */}
                        <div className="pt-6 grid grid-cols-2 max-w-lg text-slate-800 text-[11px]">
                            {/* Date Line */}
                            <div className="col-span-2 pb-2">
                                <span>
                                    {cityName}, {formatDateLong(settlement.created_at)}
                                </span>
                            </div>

                            {/* SAC / Penyusun Signature */}
                            <div className="space-y-16">
                                <div>
                                    <span className="font-medium">Penyusun</span>
                                </div>
                                <div>
                                    <div className="font-bold underline uppercase tracking-tight text-slate-900">
                                        {sacName}
                                    </div>
                                    <div className="text-[10px] text-slate-600 font-medium">
                                        Store Administrative Clerk
                                    </div>
                                </div>
                            </div>

                            {/* SM / Mengetahui Signature */}
                            <div className="space-y-16">
                                <div>
                                    <span className="font-medium">Mengetahui</span>
                                </div>
                                <div>
                                    <div className="font-bold underline uppercase tracking-tight text-slate-900">
                                        {smName}
                                    </div>
                                    <div className="text-[10px] text-slate-600 font-medium">
                                        Store Manager
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Custom Print Styling */}
            <style>{`
                @media print {
                    @page {
                        size: A4 landscape;
                        margin: 10mm;
                    }
                    body {
                        background: white !important;
                        color: black !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    header, aside, nav, button, .print\\:hidden {
                        display: none !important;
                    }
                    .shadow-sm, .shadow-md, .shadow-xs {
                        box-shadow: none !important;
                    }
                    table {
                        font-size: 9.5px !important;
                    }
                    th, td {
                        border-color: #cbd5e1 !important;
                    }
                }
            `}</style>
        </AppLayout>
    );
}

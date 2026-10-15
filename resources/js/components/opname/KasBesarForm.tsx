import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Receipt,
    Landmark,
    Plus,
    Trash2,
    FileText,
    CheckCircle2,
    AlertCircle,
    Eye,
    Calculator,
} from 'lucide-react';
import { ImageUploader } from '@/components/shared/ImageUploader';
import { OpnameReferenceLine } from '@/types/opname';
import { formatMoney } from '@/lib/money';

interface KasBesarFormProps {
    referenceLines: OpnameReferenceLine[];
    onAddReferenceLine: (line: {
        line_type: string;
        reference_number: string;
        amount_cents: number;
        proof_attachment_url?: string | null;
        notes?: string | null;
    }) => void;
    onRemoveReferenceLine: (id: string) => void;
    openingBalanceCents: number;
    disabled?: boolean;
}

export function KasBesarForm({
    referenceLines,
    onAddReferenceLine,
    onRemoveReferenceLine,
    openingBalanceCents = 0,
    disabled = false,
}: KasBesarFormProps) {
    // Tab state: 'Z_REPORT' or 'BANK_DEPOSIT'
    const [activeSection, setActiveSection] = useState<'Z_REPORT' | 'BANK_DEPOSIT'>('Z_REPORT');

    // Z-Report Form state
    const [posRegister, setPosRegister] = useState('');
    const [zReportNumber, setZReportNumber] = useState('');
    const [zReportAmount, setZReportAmount] = useState<number | ''>('');
    const [zReportProofUrl, setZReportProofUrl] = useState<string | null>(null);

    // Bank Deposit Form state
    const [depositNumber, setDepositNumber] = useState('');
    const [depositAmount, setDepositAmount] = useState<number | ''>('');
    const [depositProofUrl, setDepositProofUrl] = useState<string | null>(null);

    const zReportLines = referenceLines.filter((l) => l.line_type === 'Z_REPORT');
    const depositLines = referenceLines.filter((l) => l.line_type === 'BANK_DEPOSIT');

    const totalZReportCents = zReportLines.reduce((sum, l) => sum + (l.amount_cents || 0), 0);
    const totalDepositCents = depositLines.reduce((sum, l) => sum + (l.amount_cents || 0), 0);
    const expectedCashCents = openingBalanceCents + totalZReportCents - totalDepositCents;

    const handleAddZReport = (e: React.FormEvent) => {
        e.preventDefault();
        if (!zReportNumber.trim() || !zReportAmount || zReportAmount <= 0) {
            return;
        }

        onAddReferenceLine({
            line_type: 'Z_REPORT',
            reference_number: `${posRegister ? `[${posRegister.trim()}] ` : ''}${zReportNumber.trim()}`,
            amount_cents: Number(zReportAmount),
            proof_attachment_url: zReportProofUrl,
            notes: posRegister ? `Register POS: ${posRegister.trim()}` : null,
        });

        // Reset
        setPosRegister('');
        setZReportNumber('');
        setZReportAmount('');
        setZReportProofUrl(null);
    };

    const handleAddDeposit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!depositNumber.trim() || !depositAmount || depositAmount <= 0) {
            return;
        }

        onAddReferenceLine({
            line_type: 'BANK_DEPOSIT',
            reference_number: depositNumber.trim(),
            amount_cents: Number(depositAmount),
            proof_attachment_url: depositProofUrl,
            notes: 'Setoran Tunai ke Bank',
        });

        // Reset
        setDepositNumber('');
        setDepositAmount('');
        setDepositProofUrl(null);
    };

    return (
        <div className="space-y-6">
            {/* Summary Bar */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <CardContent className="p-4 sm:p-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center sm:text-left">
                        <div className="p-2 sm:p-0">
                            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                Saldo Awal Brankas
                            </span>
                            <p className="text-base sm:text-lg font-bold font-mono text-slate-800 dark:text-slate-200">
                                {formatMoney(openingBalanceCents)}
                            </p>
                        </div>
                        <div className="p-2 sm:p-0">
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-center sm:justify-start gap-1">
                                (+) Total Z-Report POS
                            </span>
                            <p className="text-base sm:text-lg font-bold font-mono text-emerald-700 dark:text-emerald-300">
                                {formatMoney(totalZReportCents)}
                            </p>
                        </div>
                        <div className="p-2 sm:p-0">
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center justify-center sm:justify-start gap-1">
                                (-) Setoran Bank
                            </span>
                            <p className="text-base sm:text-lg font-bold font-mono text-amber-700 dark:text-amber-300">
                                {formatMoney(totalDepositCents)}
                            </p>
                        </div>
                        <div className="p-2 sm:p-0 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-700 sm:pl-4 col-span-2 sm:col-span-1">
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center sm:justify-start gap-1">
                                (=) Target Uang Brankas
                            </span>
                            <p className="text-base sm:text-lg font-bold font-mono text-blue-900 dark:text-blue-100">
                                {formatMoney(expectedCashCents)}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Sub-Panel Register POS & Z-Report */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Z-Report Section */}
                <Card className="border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                    <CardHeader className="bg-slate-50/70 dark:bg-slate-900/40 px-4 py-3 sm:px-6 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                                    <Receipt className="h-4 w-4" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm font-semibold">
                                        Data Z-Report Register Kasir
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Omzet penjualan tunai per mesin POS
                                    </CardDescription>
                                </div>
                            </div>
                            <Badge variant="outline" className="font-mono text-xs">
                                {zReportLines.length} Register
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 space-y-4 flex-1 flex flex-col">
                        {!disabled && (
                            <form
                                onSubmit={handleAddZReport}
                                className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3"
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                            No. Mesin Kasir / POS
                                        </Label>
                                        <Input
                                            placeholder="Contoh: POS-01"
                                            value={posRegister}
                                            onChange={(e) => setPosRegister(e.target.value)}
                                            className="h-9 text-xs mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                            No. Z-Report <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            required
                                            placeholder="Contoh: ZR-20261012-001"
                                            value={zReportNumber}
                                            onChange={(e) => setZReportNumber(e.target.value)}
                                            className="h-9 text-xs mt-1"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                        Total Tunai Sistem (Rp) <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        required
                                        type="number"
                                        min={0}
                                        step={100}
                                        placeholder="0"
                                        value={zReportAmount}
                                        onChange={(e) =>
                                            setZReportAmount(
                                                e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10))
                                            )
                                        }
                                        className="h-9 text-xs mt-1 font-mono font-semibold"
                                    />
                                    {zReportAmount !== '' && (
                                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 font-mono">
                                            = {formatMoney(Number(zReportAmount))}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                        <span>Foto Fisik Struk Z-Report <span className="text-red-500">*</span></span>
                                        {zReportProofUrl && (
                                            <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-semibold">
                                                <CheckCircle2 className="h-3 w-3" /> Terlampir
                                            </span>
                                        )}
                                    </Label>
                                    <div className="mt-1">
                                        <ImageUploader
                                            initialUrl={zReportProofUrl}
                                            onChange={(file) => {
                                                if (!file) {
                                                    setZReportProofUrl(null);
                                                    return;
                                                }
                                                const reader = new FileReader();
                                                reader.onloadend = () => setZReportProofUrl(reader.result as string);
                                                reader.readAsDataURL(file);
                                            }}
                                            label="Upload Foto Struk Z-Report"
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={!zReportNumber.trim() || !zReportAmount}
                                    className="w-full h-9 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Tambahkan Z-Report
                                </Button>
                            </form>
                        )}

                        {/* List Z-Reports */}
                        <div className="space-y-2 flex-1 overflow-y-auto max-h-80">
                            {zReportLines.length === 0 ? (
                                <div className="text-center py-6 border border-dashed rounded-lg border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs">
                                    Belum ada data Z-Report yang dicatat.
                                </div>
                            ) : (
                                zReportLines.map((line) => (
                                    <div
                                        key={line.id}
                                        className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                    {line.reference_number}
                                                </span>
                                                {line.proof_attachment_url ? (
                                                    <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                        Foto Ada
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="destructive" className="text-[10px]">
                                                        Tanpa Foto
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="font-mono font-bold text-slate-900 dark:text-slate-100">
                                                {formatMoney(line.amount_cents)}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            {line.proof_attachment_url && (
                                                <a
                                                    href={line.proof_attachment_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-1.5 text-slate-600 hover:text-blue-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                                                    title="Lihat Foto Struk"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </a>
                                            )}
                                            {!disabled && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => onRemoveReferenceLine(line.id)}
                                                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Bank Deposit Section */}
                <Card className="border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                    <CardHeader className="bg-slate-50/70 dark:bg-slate-900/40 px-4 py-3 sm:px-6 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                                    <Landmark className="h-4 w-4" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm font-semibold">
                                        Data Setoran Kas ke Bank
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Bukti setor tunai / cash pickup
                                    </CardDescription>
                                </div>
                            </div>
                            <Badge variant="outline" className="font-mono text-xs">
                                {depositLines.length} Setoran
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 space-y-4 flex-1 flex flex-col">
                        {!disabled && (
                            <form
                                onSubmit={handleAddDeposit}
                                className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3"
                            >
                                <div>
                                    <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                        No. Slip Setor / Referensi Bank <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        required
                                        placeholder="Contoh: DEP-BRI-8812"
                                        value={depositNumber}
                                        onChange={(e) => setDepositNumber(e.target.value)}
                                        className="h-9 text-xs mt-1"
                                    />
                                </div>

                                <div>
                                    <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                        Nominal Setor (Rp) <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        required
                                        type="number"
                                        min={0}
                                        step={100}
                                        placeholder="0"
                                        value={depositAmount}
                                        onChange={(e) =>
                                            setDepositAmount(
                                                e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10))
                                            )
                                        }
                                        className="h-9 text-xs mt-1 font-mono font-semibold"
                                    />
                                    {depositAmount !== '' && (
                                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 font-mono">
                                            = {formatMoney(Number(depositAmount))}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                        <span>Foto Bukti Slip Setor Bank <span className="text-red-500">*</span></span>
                                        {depositProofUrl && (
                                            <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-semibold">
                                                <CheckCircle2 className="h-3 w-3" /> Terlampir
                                            </span>
                                        )}
                                    </Label>
                                    <div className="mt-1">
                                        <ImageUploader
                                            initialUrl={depositProofUrl}
                                            onChange={(file) => {
                                                if (!file) {
                                                    setDepositProofUrl(null);
                                                    return;
                                                }
                                                const reader = new FileReader();
                                                reader.onloadend = () => setDepositProofUrl(reader.result as string);
                                                reader.readAsDataURL(file);
                                            }}
                                            label="Upload Slip Setor Bank"
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={!depositNumber.trim() || !depositAmount}
                                    className="w-full h-9 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white"
                                >
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Tambahkan Slip Setor
                                </Button>
                            </form>
                        )}

                        {/* List Deposits */}
                        <div className="space-y-2 flex-1 overflow-y-auto max-h-80">
                            {depositLines.length === 0 ? (
                                <div className="text-center py-6 border border-dashed rounded-lg border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs">
                                    Belum ada data setoran bank yang dicatat.
                                </div>
                            ) : (
                                depositLines.map((line) => (
                                    <div
                                        key={line.id}
                                        className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                    {line.reference_number}
                                                </span>
                                                {line.proof_attachment_url ? (
                                                    <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                        Foto Ada
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="destructive" className="text-[10px]">
                                                        Tanpa Foto
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="font-mono font-bold text-slate-900 dark:text-slate-100">
                                                {formatMoney(line.amount_cents)}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            {line.proof_attachment_url && (
                                                <a
                                                    href={line.proof_attachment_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-1.5 text-slate-600 hover:text-blue-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                                                    title="Lihat Foto Slip"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </a>
                                            )}
                                            {!disabled && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => onRemoveReferenceLine(line.id)}
                                                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

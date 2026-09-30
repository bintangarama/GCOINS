import React, { useState, useMemo } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { PageHeader } from '@/components/shared/PageHeader';
import { ImageUploader } from '@/components/shared/ImageUploader';
import InputError from '@/components/input-error';
import { BriEntityBalance, BriPostingCategory, BriPostingType } from '@/types/bri';
import { formatMoney } from '@/lib/money';
import {
    Building2,
    ArrowDownLeft,
    ArrowUpRight,
    ShieldAlert,
    AlertCircle,
    Info,
    CheckCircle2,
    ArrowLeft,
    Coins,
} from 'lucide-react';

interface BriFundCreateProps {
    categories: string[];
    entities: BriEntityBalance[];
}

export default function BriFundCreate({ categories, entities }: BriFundCreateProps) {
    const { data, setData, post, processing, errors } = useForm<{
        category: BriPostingCategory;
        custom_category_name: string;
        entity_name: string;
        type: BriPostingType;
        amount_cents: number;
        purpose: string;
        proof_attachment: File | null;
    }>({
        category: 'B2B',
        custom_category_name: '',
        entity_name: '',
        type: 'INFLOW',
        amount_cents: 0,
        purpose: '',
        proof_attachment: null,
    });

    // Find current balance of selected/typed entity
    const currentEntityInfo = useMemo(() => {
        if (!data.entity_name) return null;
        return entities.find(
            (e) =>
                e.entity_name.trim().toLowerCase() === data.entity_name.trim().toLowerCase() &&
                e.category === data.category
        ) || entities.find(
            (e) => e.entity_name.trim().toLowerCase() === data.entity_name.trim().toLowerCase()
        ) || null;
    }, [data.entity_name, data.category, entities]);

    const entityRunningBalance = currentEntityInfo ? currentEntityInfo.running_balance_cents : 0;
    const isOutflow = data.type === 'OUTFLOW';
    const isZeroDeficitViolated = isOutflow && data.amount_cents > entityRunningBalance;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isZeroDeficitViolated) {
            return;
        }

        post('/bri-funds', {
            forceFormData: true,
        });
    };

    return (
        <AppLayout title="Catat Mutasi Rekening Pooling BRI">
            <Head title="Catat Mutasi BRI — Bank Sub-Ledger" />

            <div className="max-w-4xl flex flex-col gap-6">
                <PageHeader
                    title="Catat Mutasi Rekening Pooling BRI"
                    description="Catat mutasi pemasukan (INFLOW) atau pengajuan pengeluaran (OUTFLOW) pada rekening bank sub-ledger"
                    icon={Building2}
                />

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Mutation Type Switcher */}
                    <Card className="border-border shadow-sm overflow-hidden">
                        <div className="grid grid-cols-2 p-1.5 bg-muted/60 gap-1.5">
                            <button
                                type="button"
                                onClick={() => setData('type', 'INFLOW')}
                                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
                                    data.type === 'INFLOW'
                                        ? 'bg-background text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-500/20'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <ArrowDownLeft className="h-4 w-4" />
                                <span>Pemasukan (INFLOW)</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setData('type', 'OUTFLOW')}
                                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
                                    data.type === 'OUTFLOW'
                                        ? 'bg-background text-amber-600 dark:text-amber-400 shadow-sm border border-amber-500/20'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <ArrowUpRight className="h-4 w-4" />
                                <span>Pengeluaran (OUTFLOW)</span>
                            </button>
                        </div>

                        <div className="p-4 bg-muted/20 border-t border-border/40 text-xs">
                            {data.type === 'INFLOW' ? (
                                <div className="flex items-start gap-2 text-emerald-700 dark:text-emerald-300">
                                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span>
                                        <strong>INFLOW:</strong> Dana masuk langsung berstatus <strong>APPROVED</strong> dan otomatis menambah saldo berjalan entitas terkait.
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-start gap-2 text-amber-800 dark:text-amber-200">
                                    <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span>
                                        <strong>OUTFLOW:</strong> Membutuhkan persetujuan Supervisor (SS) atau Store Manager (SM) (Dual Control) serta tunduk pada <strong>Zero-Deficit Guard</strong>. Saldo baru berkurang setelah disetujui.
                                    </span>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Form Fields Card */}
                    <Card className="border-border shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base font-semibold">Rincian Transaksi</CardTitle>
                            <CardDescription className="text-xs">
                                Masukkan rincian kategori, entitas, nominal, dan tujuan transaksi
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Category */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">
                                    Kategori Dana <span className="text-destructive">*</span>
                                </label>
                                <Select
                                    value={data.category}
                                    onValueChange={(val: BriPostingCategory) => setData('category', val)}
                                >
                                    <SelectTrigger className="text-xs">
                                        <SelectValue placeholder="Pilih Kategori" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat} value={cat}>
                                                {cat === 'B2B' && 'B2B — Transaksi Sekolah / Korporasi'}
                                                {cat === 'EVENT' && 'EVENT — Pameran / Bazaar Mall'}
                                                {cat === 'AKSEL' && 'AKSEL — Penjualan Mobile / Kanvasing'}
                                                {cat === 'ANONYMOUS' && 'ANONYMOUS — Dana Titipan Belum Teridentifikasi'}
                                                {cat === 'CUSTOM' && 'CUSTOM — Kategori Khusus / Ad-Hoc'}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.category} />
                            </div>

                            {/* Custom Category Name if CUSTOM */}
                            {data.category === 'CUSTOM' && (
                                <div className="space-y-1.5 p-3 rounded-lg bg-muted/40 border border-border/60">
                                    <label className="text-xs font-semibold text-foreground">
                                        Nama Kategori Khusus <span className="text-destructive">*</span>
                                    </label>
                                    <Input
                                        placeholder="Contoh: Sewa Booth Event Ramadan, Titipan Sponsor..."
                                        value={data.custom_category_name}
                                        onChange={(e) => setData('custom_category_name', e.target.value)}
                                        className="text-xs"
                                    />
                                    <InputError message={errors.custom_category_name} />
                                </div>
                            )}

                            {/* Entity Name */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-foreground">
                                        Nama Entitas / Rekanan / Kegiatan <span className="text-destructive">*</span>
                                    </label>
                                    {entities.length > 0 && (
                                        <span className="text-[11px] text-muted-foreground">
                                            Tersedia {entities.length} rekanan terdaftar
                                        </span>
                                    )}
                                </div>
                                <Input
                                    placeholder="Contoh: SMA Negeri 1 Karawang, Gramedia Book Fair 2026..."
                                    value={data.entity_name}
                                    onChange={(e) => setData('entity_name', e.target.value)}
                                    list="existing-entities"
                                    className="text-xs"
                                />
                                <datalist id="existing-entities">
                                    {entities.map((item, idx) => (
                                        <option key={idx} value={item.entity_name}>
                                            {item.category} — Saldo: {formatMoney(item.running_balance_cents)}
                                        </option>
                                    ))}
                                </datalist>
                                <InputError message={errors.entity_name} />
                            </div>

                            {/* Zero-Deficit Guard Context Box for Outflows */}
                            {isOutflow && data.entity_name && (
                                <div className={`p-3.5 rounded-xl border transition-all text-xs ${
                                    isZeroDeficitViolated
                                        ? 'bg-destructive/10 border-destructive/40 text-destructive'
                                        : 'bg-muted/50 border-border text-muted-foreground'
                                }`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Coins className="h-4 w-4 text-primary shrink-0" />
                                            <span className="font-semibold text-foreground">
                                                Saldo Berjalan Entitas Saat Ini:
                                            </span>
                                        </div>
                                        <span className="font-mono font-bold text-sm text-foreground">
                                            {formatMoney(entityRunningBalance)}
                                        </span>
                                    </div>

                                    {isZeroDeficitViolated && (
                                        <div className="mt-2.5 flex items-start gap-2 pt-2 border-t border-destructive/20 text-destructive font-medium">
                                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                            <span>
                                                <strong>Zero-Deficit Guard Aktif:</strong> Pengeluaran sebesar {formatMoney(data.amount_cents)} melebihi saldo berjalan entitas ({formatMoney(entityRunningBalance)}). Transaksi tidak dapat diproses.
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Amount Cents */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">
                                    Nominal Mutasi <span className="text-destructive">*</span>
                                </label>
                                <MoneyInput
                                    value={data.amount_cents}
                                    onChange={(cents) => setData('amount_cents', cents)}
                                    placeholder="0"
                                    className={isZeroDeficitViolated ? 'border-destructive focus-visible:ring-destructive' : ''}
                                />
                                <InputError message={errors.amount_cents} />
                            </div>

                            {/* Purpose / Destination */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">
                                    {isOutflow ? 'Keperluan & Rekening Tujuan' : 'Keterangan Mutasi'} <span className="text-destructive">*</span>
                                </label>
                                <Textarea
                                    rows={3}
                                    placeholder={isOutflow
                                        ? 'Contoh: Transfer pengembalian dana titipan ke Rek BRI 0123456789 a.n. Bendahara Sekolah'
                                        : 'Contoh: Setoran pembayaran buku kurikulum merdeka tahap 1'
                                    }
                                    value={data.purpose}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setData('purpose', e.target.value)}
                                    className="text-xs"
                                />
                                <InputError message={errors.purpose} />
                            </div>

                            {/* Proof Attachment */}
                            <div className="space-y-1.5 pt-2">
                                <ImageUploader
                                    label="Foto / Bukti Transfer Mutasi Bank"
                                    description="Unggah bukti mutasi/slip transfer (otomatis dikompres ke WebP)"
                                    onChange={(file) => setData('proof_attachment', file)}
                                    error={errors.proof_attachment}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Submit Bar */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Link href="/bri-funds">
                            <Button variant="outline" type="button">
                                Batal
                            </Button>
                        </Link>
                        <Button
                            type="submit"
                            disabled={processing || isZeroDeficitViolated || data.amount_cents <= 0 || !data.entity_name}
                            className="bg-primary text-primary-foreground font-semibold px-6 shadow-sm"
                        >
                            {processing ? (
                                'Memproses...'
                            ) : data.type === 'INFLOW' ? (
                                'Simpan & Setujui Pemasukan'
                            ) : (
                                'Ajukan Pengeluaran (Pending SS)'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

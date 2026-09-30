import React from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { Receipt, FileText, Send, Save, AlertCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { ImageUploader } from '@/components/shared/ImageUploader';
import { formatMoney } from '@/lib/money';
import { VoucherCategory } from '@/types/voucher';

interface CreateVoucherProps {
    categories: VoucherCategory[];
    imprestFundCents: number;
}

export default function CreateVoucherPage({ categories, imprestFundCents }: CreateVoucherProps) {
    const { data, setData, post, processing, errors, transform } = useForm({
        amount_cents: 0,
        purpose: '',
        category: 'OPERASIONAL' as VoucherCategory,
        receipt_image: null as File | null,
        item_photo: null as File | null,
        is_submit: false,
    });

    const handleSubmit = (isSubmit: boolean) => {
        transform((data) => ({
            ...data,
            is_submit: isSubmit,
        }));

        post('/vouchers', {
            forceFormData: true,
        });
    };

    return (
        <AppLayout title="Buat Voucher Kas Kecil">
            <Head title="Buat Voucher Kas Kecil" />

            <div className="max-w-5xl flex flex-col gap-6">
                <PageHeader
                    title="Buat Bon Kas Kecil"
                    description="Form pengeluaran kas kecil dengan kompresi bukti WebP otomatis"
                    icon={Receipt}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Main Form */}
                    <div className="md:col-span-2 space-y-6">
                        <Card className="border shadow-sm">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-primary" />
                                    Rincian Pengeluaran
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Lengkapi data transaksi kas kecil secara akurat
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                {/* Amount */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="amount" className="text-xs font-semibold">
                                            Nominal Pengeluaran <span className="text-destructive">*</span>
                                        </Label>
                                        <span className="text-[11px] text-muted-foreground">
                                            Maks: {formatMoney(imprestFundCents)}
                                        </span>
                                    </div>
                                    <MoneyInput
                                        id="amount"
                                        value={data.amount_cents}
                                        maxCents={imprestFundCents}
                                        onChange={(cents) => setData('amount_cents', cents)}
                                        error={errors.amount_cents}
                                        autoFocus
                                    />
                                    {errors.amount_cents && (
                                        <p className="text-xs text-destructive">{errors.amount_cents}</p>
                                    )}
                                </div>

                                {/* Category */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="category" className="text-xs font-semibold">
                                        Kategori Pengeluaran <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={data.category}
                                        onValueChange={(val) => setData('category', val as VoucherCategory)}
                                    >
                                        <SelectTrigger id="category" className="h-9 text-xs">
                                            <SelectValue placeholder="Pilih Kategori" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat} value={cat} className="text-xs font-mono">
                                                    {cat}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.category && (
                                        <p className="text-xs text-destructive">{errors.category}</p>
                                    )}
                                </div>

                                {/* Purpose */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="purpose" className="text-xs font-semibold">
                                        Keperluan / Deskripsi <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="purpose"
                                        placeholder="Contoh: Pembelian tinta printer & kertas struk kasir"
                                        value={data.purpose}
                                        onChange={(e) => setData('purpose', e.target.value)}
                                        className="text-xs h-9"
                                    />
                                    {errors.purpose && (
                                        <p className="text-xs text-destructive">{errors.purpose}</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Attachments Section */}
                        <Card className="border shadow-sm">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-primary" />
                                    Lampiran Foto & Bukti
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Foto otomatis dikompresi di browser menjadi format WebP (&le; 250KB)
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <ImageUploader
                                    label="Foto Kuitansi / Struk Resmi"
                                    description="Wajib untuk pengajuan langsung ke verifikator"
                                    required={data.is_submit}
                                    error={errors.receipt_image}
                                    onChange={(file) => setData('receipt_image', file)}
                                />

                                <div className="border-t pt-4">
                                    <ImageUploader
                                        label="Foto Barang / Dokumentasi Fisik"
                                        description="Opsional: bukti fisik barang yang dibeli atau pekerjaan selesai"
                                        error={errors.item_photo}
                                        onChange={(file) => setData('item_photo', file)}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Summary & Action Sidebar */}
                    <div className="space-y-6">
                        <Card className="border shadow-sm sticky top-6 bg-muted/10">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold">Ringkasan Pengajuan</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2 border-b pb-3">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Kategori</span>
                                        <span className="font-mono font-medium">{data.category}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Bukti Struk</span>
                                        <span className={data.receipt_image ? 'text-emerald-600 font-medium' : 'text-amber-600'}>
                                            {data.receipt_image ? 'Terlampir (WebP)' : 'Belum ada'}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                                        Total Pengeluaran
                                    </span>
                                    <div className="text-2xl font-bold font-mono text-primary">
                                        {formatMoney(data.amount_cents)}
                                    </div>
                                </div>

                                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md p-3 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>
                                        Voucher yang diajukan akan diverifikasi oleh Supervisor (SS) atau SAC sebelum dapat dicairkan.
                                    </span>
                                </div>

                                <div className="pt-2 flex flex-col gap-2.5">
                                    <Button
                                        type="button"
                                        disabled={processing || data.amount_cents <= 0}
                                        onClick={() => handleSubmit(true)}
                                        className="w-full gap-2 text-xs font-semibold h-10"
                                    >
                                        <Send className="w-4 h-4" />
                                        Ajukan Sekarang
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={processing}
                                        onClick={() => handleSubmit(false)}
                                        className="w-full gap-2 text-xs h-9"
                                    >
                                        <Save className="w-3.5 h-3.5" />
                                        Simpan Sebagai Draft
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { AlertCircle, ArrowLeft, FileText, Pencil, Save, Send } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ImageUploader } from '@/components/shared/ImageUploader';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatMoney } from '@/lib/money';
import { PettyCashCategoryItem, PettyCashVoucher } from '@/types/voucher';

interface EditVoucherProps {
    voucher: PettyCashVoucher;
    categories: (string | PettyCashCategoryItem)[];
    imprestFundCents: number;
}

export default function EditVoucherPage({
    voucher,
    categories,
    imprestFundCents,
}: EditVoucherProps) {
    const normalizedCategories = categories.map((c) =>
        typeof c === 'string' ? { code: c, name: c } : c
    );

    if (voucher.category && !normalizedCategories.some((c) => c.code === voucher.category)) {
        normalizedCategories.unshift({ code: voucher.category, name: voucher.category });
    }

    const initialReceiptDate = voucher.receipt_date
        ? voucher.receipt_date.slice(0, 10)
        : new Date(voucher.created_at).toISOString().slice(0, 10);

    const { data, setData, post, processing, errors, transform } = useForm({
        amount_cents: voucher.amount_cents,
        receipt_date: initialReceiptDate,
        purpose: voucher.purpose,
        category: voucher.category || normalizedCategories[0]?.code || 'OPERASIONAL',
        receipt_image: null as File | null,
        item_photo: null as File | null,
        remove_receipt_image: false,
        remove_item_photo: false,
        is_submit: false,
    });

    const hasExistingReceipt = Boolean(voucher.receipt_image_url) && !data.remove_receipt_image;
    const hasEffectiveReceipt = Boolean(data.receipt_image) || hasExistingReceipt;

    const handleReceiptChange = (file: File | null) => {
        setData((prev) => ({
            ...prev,
            receipt_image: file,
            remove_receipt_image: file === null,
        }));
    };

    const handleItemPhotoChange = (file: File | null) => {
        setData((prev) => ({
            ...prev,
            item_photo: file,
            remove_item_photo: file === null,
        }));
    };

    const handleSubmit = (isSubmit: boolean) => {
        transform((formData) => ({
            ...formData,
            _method: 'put',
            is_submit: isSubmit,
        }));

        post(`/vouchers/${voucher.id}`, {
            forceFormData: true,
        });
    };

    const receiptSummaryLabel = data.receipt_image
        ? data.receipt_image.type === 'application/pdf' ||
          data.receipt_image.name.toLowerCase().endsWith('.pdf')
            ? 'Berkas Baru (PDF)'
            : 'Berkas Baru (WebP)'
        : hasExistingReceipt
          ? voucher.receipt_image_url?.toLowerCase().endsWith('.pdf')
              ? 'Terlampir (PDF)'
              : 'Terlampir'
          : 'Belum ada';

    return (
        <AppLayout
            title={`Edit Draft ${voucher.voucher_number}`}
            breadcrumbs={[
                { title: 'Dashboard', href: '/dashboard' },
                { title: 'Bon Kas Kecil', href: '/vouchers' },
                { title: voucher.voucher_number, href: `/vouchers/${voucher.id}` },
                { title: 'Edit Draft', href: `/vouchers/${voucher.id}/edit` },
            ]}
        >
            <Head title={`Edit Draft ${voucher.voucher_number}`} />

            <div className="max-w-5xl flex flex-col gap-6">
                <PageHeader
                    title={`Edit Draft ${voucher.voucher_number}`}
                    description="Perbarui rincian pengeluaran atau lampiran bukti sebelum diajukan ke verifikator"
                    icon={Pencil}
                    backHref={`/vouchers/${voucher.id}`}
                    backLabel="Kembali ke Detail Bon"
                    badge={<StatusBadge status={voucher.status} />}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Main Form */}
                    <div className="md:col-span-2 flex flex-col gap-6">
                        <Card className="border shadow-sm">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <FileText className="size-4 text-primary" />
                                    Rincian Pengeluaran
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Sesuaikan nominal, tanggal struk, kategori, atau deskripsi keperluan bon
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-5">
                                {/* Amount */}
                                <div className="flex flex-col gap-1.5">
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
                                    />
                                    {errors.amount_cents && (
                                        <p className="text-xs text-destructive">{errors.amount_cents}</p>
                                    )}
                                </div>

                                {/* Receipt Date */}
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="receipt_date" className="text-xs font-semibold">
                                            Tanggal Bon / Struk <span className="text-destructive">*</span>
                                        </Label>
                                        <span className="text-[11px] text-muted-foreground">
                                            Tanggal nota belanja fisik
                                        </span>
                                    </div>
                                    <Input
                                        id="receipt_date"
                                        type="date"
                                        value={data.receipt_date}
                                        onChange={(e) => setData('receipt_date', e.target.value)}
                                        className="text-xs h-9"
                                    />
                                    {errors.receipt_date && (
                                        <p className="text-xs text-destructive">{errors.receipt_date}</p>
                                    )}
                                </div>

                                {/* Category */}
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="category" className="text-xs font-semibold">
                                        Kategori Pengeluaran <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={data.category}
                                        onValueChange={(val) => setData('category', val)}
                                    >
                                        <SelectTrigger id="category" className="h-9 text-xs">
                                            <SelectValue placeholder="Pilih Kategori" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {normalizedCategories.map((cat) => (
                                                    <SelectItem key={cat.code} value={cat.code} className="text-xs">
                                                        <span className="font-medium">{cat.name}</span>
                                                        <span className="text-[10px] text-muted-foreground font-mono ml-1.5">
                                                            ({cat.code})
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    {errors.category && (
                                        <p className="text-xs text-destructive">{errors.category}</p>
                                    )}
                                </div>

                                {/* Purpose */}
                                <div className="flex flex-col gap-1.5">
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
                                    <FileText className="size-4 text-primary" />
                                    Lampiran Foto & Bukti
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Biarkan lampiran saat ini jika tidak berubah, atau ganti dengan foto (WebP &le; 250KB) / PDF (&le; 5MB)
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-6">
                                <ImageUploader
                                    label="Foto / Dokumen Kuitansi Resmi"
                                    description="Wajib terlampir apabila langsung mengajukan bon ke verifikator (JPG, PNG, WebP, atau PDF)"
                                    required={true}
                                    allowPdf={true}
                                    initialUrl={voucher.receipt_image_url}
                                    error={errors.receipt_image}
                                    onChange={handleReceiptChange}
                                />

                                <Separator />

                                <ImageUploader
                                    label="Foto Barang / Dokumentasi Fisik"
                                    description="Opsional: bukti fisik barang yang dibeli atau dokumen pendukung (Foto / PDF)"
                                    allowPdf={true}
                                    initialUrl={voucher.item_photo_url}
                                    error={errors.item_photo}
                                    onChange={handleItemPhotoChange}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Summary & Action Sidebar */}
                    <div className="flex flex-col gap-6">
                        <Card className="border shadow-sm sticky top-6 bg-muted/10">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold">Ringkasan Perubahan</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-4">
                                <div className="flex flex-col gap-2 pb-3 border-b">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">No. Voucher</span>
                                        <span className="font-mono font-semibold text-foreground">
                                            {voucher.voucher_number}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Kategori</span>
                                        <span
                                            className="font-medium text-right max-w-[160px] truncate"
                                            title={data.category}
                                        >
                                            {normalizedCategories.find((c) => c.code === data.category)?.name ||
                                                data.category}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Bukti Struk</span>
                                        <span
                                            className={
                                                hasEffectiveReceipt
                                                    ? 'text-emerald-600 font-medium'
                                                    : 'text-amber-600'
                                            }
                                        >
                                            {receiptSummaryLabel}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                                        Total Pengeluaran
                                    </span>
                                    <div className="text-2xl font-bold font-mono text-primary">
                                        {formatMoney(data.amount_cents)}
                                    </div>
                                </div>

                                {!hasEffectiveReceipt && (
                                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md p-3 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                                        <AlertCircle className="size-4 shrink-0 mt-0.5" />
                                        <span>
                                            Lampirkan foto/PDF kuitansi terlebih dahulu untuk mengaktifkan tombol <b>Simpan &amp; Ajukan</b>. Anda tetap dapat menyimpan perubahan sebagai draft tanpa bukti struk.
                                        </span>
                                    </div>
                                )}

                                <div className="pt-1 flex flex-col gap-2.5">
                                    <Button
                                        type="button"
                                        disabled={processing || data.amount_cents <= 0 || !hasEffectiveReceipt}
                                        onClick={() => handleSubmit(true)}
                                        className="w-full gap-2 text-xs font-semibold h-10"
                                    >
                                        <Send className="size-4" />
                                        Simpan &amp; Ajukan Sekarang
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={processing || data.amount_cents <= 0}
                                        onClick={() => handleSubmit(false)}
                                        className="w-full gap-2 text-xs h-9"
                                    >
                                        <Save className="size-3.5" />
                                        Simpan Perubahan Draft
                                    </Button>

                                    <Button
                                        asChild
                                        type="button"
                                        variant="ghost"
                                        className="w-full gap-1.5 text-xs h-8 text-muted-foreground"
                                    >
                                        <Link href={`/vouchers/${voucher.id}`}>
                                            <ArrowLeft className="size-3.5" />
                                            Batal
                                        </Link>
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


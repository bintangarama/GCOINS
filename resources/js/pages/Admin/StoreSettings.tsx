import React, { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import {
    Store as StoreIcon,
    Settings,
    Building2,
    Coins,
    Save,
    CheckCircle2,
    Layers,
    MapPin,
    AlertCircle,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { formatRupiah } from '@/lib/money';

interface StoreOpnameConfig {
    id: string;
    opname_type: string;
    imprest_fund_cents: number;
    reconciliation_mode: string;
    has_voucher_integration: boolean;
    has_bank_reconciliation: boolean;
    is_active: boolean;
}

interface OpnameItemDefinition {
    id: string;
    opname_type: string;
    denomination_group: string;
    denomination_value_cents: number;
    label: string;
    sort_order: number;
    is_active: boolean;
}

interface StoreData {
    id: string;
    code: string;
    name: string;
    address: string | null;
    is_active: boolean;
    opname_configs?: StoreOpnameConfig[];
    item_definitions?: OpnameItemDefinition[];
}

interface StoreSettingsProps {
    store: StoreData;
    allStores?: { id: string; code: string; name: string }[];
    kasKecilConfig?: StoreOpnameConfig | null;
}

export default function StoreSettings({
    store,
    allStores = [],
    kasKecilConfig,
}: StoreSettingsProps) {
    const [displayRupiah, setDisplayRupiah] = useState(() => {
        const initialCents = kasKecilConfig?.imprest_fund_cents || 0;
        return (initialCents / 100).toLocaleString('id-ID');
    });

    const { data, setData, put, processing, errors, recentlySuccessful } = useForm({
        store_id: store.id,
        name: store.name || '',
        address: store.address || '',
        imprest_fund_cents: kasKecilConfig?.imprest_fund_cents || 0,
    });

    const handleRupiahChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawDigits = e.target.value.replace(/\D/g, '');
        const rupiah = parseInt(rawDigits || '0', 10);
        setDisplayRupiah(rupiah.toLocaleString('id-ID'));
        setData('imprest_fund_cents', rupiah * 100);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put('/admin/store-settings', {
            preserveScroll: true,
        });
    };

    const handleStoreChange = (newStoreId: string) => {
        router.visit(`/admin/store-settings?store_id=${newStoreId}`);
    };

    return (
        <AppLayout title="Pengaturan Toko">
            <div className="max-w-5xl flex flex-col gap-6">
                <PageHeader
                    title="Pengaturan Toko"
                    icon={StoreIcon}
                    description="Konfigurasi data toko cabang, plafon kas kecil (imprest), dan profil operasional"
                >
                    {allStores.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Label htmlFor="store-select" className="text-xs text-muted-foreground font-medium">
                                Pilih Toko:
                            </Label>
                            <select
                                id="store-select"
                                value={store.id}
                                onChange={(e) => handleStoreChange(e.target.value)}
                                className="text-xs font-semibold bg-background text-foreground border border-input rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                {allStores.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.code} — {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </PageHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Store Profile Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                                <Building2 className="w-5 h-5 text-primary" />
                                Informasi Identitas Toko
                            </CardTitle>
                            <CardDescription>
                                Informasi operasional unit toko yang digunakan pada seluruh berita acara resmi.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1.5 sm:col-span-1">
                                    <Label className="text-xs font-semibold text-foreground">Kode Toko</Label>
                                    <Input
                                        value={store.code}
                                        disabled
                                        className="bg-muted font-mono text-muted-foreground cursor-not-allowed font-semibold"
                                    />
                                    <p className="text-[11px] text-muted-foreground">Kode unit toko permanen.</p>
                                </div>

                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label htmlFor="name" className="text-xs font-semibold text-foreground">
                                        Nama Toko <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="Contoh: Gramedia Matraman"
                                        required
                                    />
                                    {errors.name && (
                                        <p className="text-xs text-destructive">{errors.name}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="address" className="text-xs font-semibold text-foreground">
                                    Alamat Lengkap Unit Toko
                                </Label>
                                <Input
                                    id="address"
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    placeholder="Jl. Matraman Raya No. 46-48, Jakarta Timur"
                                />
                                {errors.address && (
                                    <p className="text-xs text-destructive">{errors.address}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Plafon Kas Kecil (Imprest Fund) */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                                <Coins className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                Plafon Kas Kecil (Imprest Fund)
                            </CardTitle>
                            <CardDescription>
                                Nilai modal kas kecil tetap yang menjadi target rekonsiliasi kas opname toko.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="max-w-md space-y-1.5">
                                <Label htmlFor="imprest_fund" className="text-xs font-semibold text-foreground">
                                    Nominal Plafon Kas Kecil (Rupiah) <span className="text-destructive">*</span>
                                </Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                                        Rp
                                    </span>
                                    <Input
                                        id="imprest_fund"
                                        type="text"
                                        value={displayRupiah}
                                        onChange={handleRupiahChange}
                                        className="pl-11 font-mono text-base font-semibold"
                                        required
                                    />
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Tersimpan sebagai {data.imprest_fund_cents.toLocaleString('id-ID')} sen.
                                </p>
                                {errors.imprest_fund_cents && (
                                    <p className="text-xs text-destructive">{errors.imprest_fund_cents}</p>
                                )}
                            </div>

                            <div className="p-3.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                                <div className="font-semibold flex items-center gap-1.5">
                                    <AlertCircle className="w-4 h-4 text-primary" />
                                    Aturan Rekonsiliasi Formula:
                                </div>
                                <p>
                                    Target Rekonsiliasi = Plafon Kas Kecil + Varian Sebelumnya (V_prev). Perubahan plafon akan langsung berlaku untuk sesi opname berikutnya.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Active Opname Configs Overview */}
                    {store.opname_configs && store.opname_configs.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                                    <Layers className="w-4 h-4 text-muted-foreground" />
                                    Tipe Opname Aktif
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="divide-y divide-border text-xs">
                                    {store.opname_configs.map((cfg) => (
                                        <div key={cfg.id} className="py-2.5 flex items-center justify-between">
                                            <div>
                                                <span className="font-bold text-foreground">{cfg.opname_type}</span>
                                                <span className="text-muted-foreground ml-2 font-mono">({cfg.reconciliation_mode})</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-foreground">
                                                    Plafon: {formatRupiah(cfg.imprest_fund_cents)}
                                                </span>
                                                <Badge variant="outline" className={cfg.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' : 'bg-muted text-muted-foreground'}>
                                                    {cfg.is_active ? 'Aktif' : 'Nonaktif'}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between pt-2">
                        {recentlySuccessful ? (
                            <p className="text-sm text-emerald-600 font-semibold flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4" />
                                Pengaturan toko berhasil disimpan!
                            </p>
                        ) : (
                            <span />
                        )}

                        <Button
                            type="submit"
                            disabled={processing}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

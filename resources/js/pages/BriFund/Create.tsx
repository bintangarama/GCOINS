import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
    CheckCircle2,
    Coins,
    Lock,
    Search,
    ChevronDown,
    X,
    Sparkles,
    PlusCircle,
    Wallet,
} from 'lucide-react';

interface BriFundCreateProps {
    categories: string[];
    entities: BriEntityBalance[];
    initialData?: {
        type?: BriPostingType | null;
        entity_name?: string | null;
        category?: BriPostingCategory | null;
    };
}

const CATEGORY_LABELS: Record<BriPostingCategory, string> = {
    B2B: 'B2B — Transaksi Sekolah / Korporasi',
    EVENT: 'EVENT — Pameran / Bazaar Mall',
    AKSEL: 'AKSEL — Penjualan Mobile / Kanvasing',
    ANONYMOUS: 'ANONYMOUS — Dana Titipan Belum Teridentifikasi',
    CUSTOM: 'CUSTOM — Kategori Khusus / Ad-Hoc',
};

export default function BriFundCreate({ categories, entities, initialData }: BriFundCreateProps) {
    // Match initial pre-filled entity if passed via URL query params
    const initialMatchedEntity = useMemo(() => {
        if (!initialData?.entity_name) return null;
        const targetName = initialData.entity_name.trim().toLowerCase();
        return (
            entities.find(
                (e) =>
                    e.entity_name.trim().toLowerCase() === targetName &&
                    (!initialData.category || e.category === initialData.category)
            ) ||
            entities.find((e) => e.entity_name.trim().toLowerCase() === targetName) ||
            null
        );
    }, [entities, initialData]);

    const { data, setData, transform, post, processing, errors, reset } = useForm<{
        category: BriPostingCategory;
        custom_category_name: string;
        entity_name: string;
        type: BriPostingType;
        amount_cents: number;
        purpose: string;
        proof_attachment: File | null;
        create_another: boolean;
    }>({
        category: (initialMatchedEntity?.category as BriPostingCategory) || initialData?.category || 'B2B',
        custom_category_name: initialMatchedEntity?.custom_category_name || '',
        entity_name: initialMatchedEntity?.entity_name || initialData?.entity_name || '',
        type: initialData?.type || 'INFLOW',
        amount_cents: 0,
        purpose: '',
        proof_attachment: null,
        create_another: false,
    });

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [preferredCategory, setPreferredCategory] = useState<BriPostingCategory | null>(
        (initialMatchedEntity?.category as BriPostingCategory) || initialData?.category || null
    );
    const dropdownContainerRef = useRef<HTMLDivElement>(null);

    // Close entity dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Find current matched registered entity
    const currentEntityInfo = useMemo(() => {
        if (!data.entity_name.trim()) return null;
        const normalized = data.entity_name.trim().toLowerCase();
        if (preferredCategory) {
            const exactWithCategory = entities.find(
                (e) => e.entity_name.trim().toLowerCase() === normalized && e.category === preferredCategory
            );
            if (exactWithCategory) return exactWithCategory;
        }
        return (
            entities.find(
                (e) => e.entity_name.trim().toLowerCase() === normalized && e.category === data.category
            ) ||
            entities.find((e) => e.entity_name.trim().toLowerCase() === normalized) ||
            null
        );
    }, [data.entity_name, data.category, preferredCategory, entities]);

    // Auto-sync category & custom_category_name whenever a registered entity is matched
    useEffect(() => {
        if (currentEntityInfo) {
            const matchedCat = currentEntityInfo.category as BriPostingCategory;
            const matchedCustom = currentEntityInfo.custom_category_name || '';
            if (data.category !== matchedCat || data.custom_category_name !== matchedCustom) {
                setData((prev) => ({
                    ...prev,
                    category: matchedCat,
                    custom_category_name: matchedCustom,
                }));
            }
        }
    }, [currentEntityInfo]);

    const isOutflow = data.type === 'OUTFLOW';
    const isExistingEntity = currentEntityInfo !== null;
    const entityRunningBalance = currentEntityInfo ? currentEntityInfo.running_balance_cents : 0;
    const isZeroDeficitViolated = isOutflow && data.amount_cents > entityRunningBalance;
    const isUnregisteredOutflow = isOutflow && data.entity_name.trim().length > 0 && !isExistingEntity;

    // Distinct existing custom category names (e.g., SO, BS, PDAM) for quick-pick chips when creating new CUSTOM entities
    const existingCustomCategories = useMemo(() => {
        const names = new Set<string>();
        entities.forEach((e) => {
            if (e.category === 'CUSTOM' && e.custom_category_name?.trim()) {
                names.add(e.custom_category_name.trim());
            }
        });
        return Array.from(names).sort();
    }, [entities]);

    // Entities eligible for selection based on INFLOW vs OUTFLOW
    const eligibleEntities = useMemo(() => {
        if (isOutflow) {
            return entities.filter((e) => e.running_balance_cents > 0);
        }
        return entities;
    }, [entities, isOutflow]);

    const zeroBalanceCount = useMemo(() => {
        return entities.filter((e) => e.running_balance_cents <= 0).length;
    }, [entities]);

    // Filtered entities for the searchable dropdown
    const filteredEntities = useMemo(() => {
        const query = data.entity_name.trim().toLowerCase();
        if (!query) return eligibleEntities;

        // If the query already matches an entity exactly and user just opened the dropdown, still prioritize matches
        return eligibleEntities.filter(
            (e) =>
                e.entity_name.toLowerCase().includes(query) ||
                e.category.toLowerCase().includes(query) ||
                (e.custom_category_name && e.custom_category_name.toLowerCase().includes(query))
        );
    }, [eligibleEntities, data.entity_name]);

    const handleSelectEntity = (item: BriEntityBalance) => {
        const cat = item.category as BriPostingCategory;
        setPreferredCategory(cat);
        setData((prev) => ({
            ...prev,
            entity_name: item.entity_name,
            category: cat,
            custom_category_name: item.custom_category_name || '',
        }));
        setIsDropdownOpen(false);
    };

    const handleClearEntity = () => {
        setPreferredCategory(null);
        setData((prev) => ({
            ...prev,
            entity_name: '',
            amount_cents: 0,
        }));
        setIsDropdownOpen(true);
    };

    const handleSwitchType = (nextType: BriPostingType) => {
        // If switching to OUTFLOW and currently selected entity has 0 balance or is unregistered, clear entity selection
        if (nextType === 'OUTFLOW' && (!currentEntityInfo || currentEntityInfo.running_balance_cents <= 0)) {
            setPreferredCategory(null);
            setData((prev) => ({
                ...prev,
                type: nextType,
                entity_name: '',
                amount_cents: 0,
            }));
            return;
        }
        setData('type', nextType);
    };

    const submitForm = (createAnother: boolean) => {
        if (isZeroDeficitViolated || isUnregisteredOutflow) {
            return;
        }

        transform((currentData) => ({
            ...currentData,
            create_another: createAnother,
        }));

        post('/bri-funds', {
            forceFormData: true,
            onSuccess: () => {
                if (createAnother) {
                    reset('entity_name', 'amount_cents', 'purpose', 'proof_attachment');
                }
            },
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        submitForm(false);
    };

    return (
        <AppLayout title="Catat Mutasi Dana BRI">
            <Head title="Catat Mutasi Dana BRI" />

            <div className="max-w-4xl flex flex-col gap-6">
                <PageHeader
                    title="Catat Mutasi Dana BRI"
                    description="Catat transaksi dana masuk atau penarikan dana alokasi pada rekening BRI toko"
                    icon={Building2}
                    backHref="/bri-funds"
                />

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Mutation Type Switcher */}
                    <Card className="border-border shadow-sm overflow-hidden">
                        <div className="grid grid-cols-2 p-1.5 bg-muted/60 gap-1.5">
                            <button
                                type="button"
                                onClick={() => handleSwitchType('INFLOW')}
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
                                onClick={() => handleSwitchType('OUTFLOW')}
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
                                        <strong>INFLOW:</strong> Dana masuk langsung berstatus <strong>APPROVED</strong>. Pilih rekanan terdaftar untuk otomatis mengunci kategori, atau ketik nama baru untuk membuat sub-ledger rekanan baru.
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-start gap-2 text-amber-800 dark:text-amber-200">
                                    <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span>
                                        <strong>OUTFLOW:</strong> Pilih rekanan dengan saldo aktif. Kategori dan sub-kategori akan terisi otomatis tanpa perlu input ulang (tunduk pada <strong>Zero-Deficit Guard</strong>).
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
                                Pilih rekanan terdaftar untuk auto-fill kategori, atau buat rekanan baru pada saat pemasukan dana
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Step 1: Smart Entity Selector */}
                            <div className="space-y-1.5" ref={dropdownContainerRef}>
                                <div className="flex items-center justify-between gap-2">
                                    <label className="text-xs font-semibold text-foreground">
                                        Nama Entitas / Rekanan / Kegiatan <span className="text-destructive">*</span>
                                    </label>
                                    <span className="text-[11px] text-muted-foreground">
                                        {isOutflow
                                            ? `${eligibleEntities.length} rekanan bersaldo aktif`
                                            : `Tersedia ${entities.length} rekanan terdaftar`}
                                    </span>
                                </div>

                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                                    <Input
                                        placeholder={
                                            isOutflow
                                                ? 'Cari & pilih rekanan yang memiliki saldo aktif...'
                                                : 'Cari rekanan terdaftar atau ketik nama rekanan baru...'
                                        }
                                        value={data.entity_name}
                                        onFocus={() => setIsDropdownOpen(true)}
                                        onChange={(e) => {
                                            setPreferredCategory(null);
                                            setData('entity_name', e.target.value);
                                            setIsDropdownOpen(true);
                                        }}
                                        className="pl-9 pr-16 text-xs"
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                        {data.entity_name && (
                                            <button
                                                type="button"
                                                onClick={handleClearEntity}
                                                className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
                                                title="Ganti / Hapus Entitas"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setIsDropdownOpen((prev) => !prev)}
                                            className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
                                            title="Buka Daftar Rekanan"
                                        >
                                            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                    </div>

                                    {/* Searchable Entity Dropdown Popover */}
                                    {isDropdownOpen && (
                                        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-border bg-popover text-popover-foreground shadow-lg overflow-hidden">
                                            <div className="px-3 py-2 bg-muted/50 border-b border-border flex items-center justify-between text-[11px] text-muted-foreground">
                                                <span>
                                                    {isOutflow
                                                        ? 'Pilih rekanan untuk penarikan dana (Saldo > Rp 0)'
                                                        : 'Pilih rekanan terdaftar atau ketik untuk membuat baru'}
                                                </span>
                                                {isOutflow && zeroBalanceCount > 0 && (
                                                    <span className="font-mono text-[10px]">
                                                        {zeroBalanceCount} saldo Rp 0 disembunyikan
                                                    </span>
                                                )}
                                            </div>

                                            <div className="max-h-64 overflow-y-auto divide-y divide-border/50">
                                                {filteredEntities.length === 0 ? (
                                                    <div className="p-4 text-center text-xs text-muted-foreground">
                                                        {isOutflow ? (
                                                            <span>
                                                                Tidak ada rekanan bersaldo aktif yang cocok dengan pencarian{' '}
                                                                <strong>"{data.entity_name}"</strong>.
                                                            </span>
                                                        ) : (
                                                            <span>
                                                                Rekanan belum terdaftar. Akan dibuat sebagai entitas baru:{' '}
                                                                <strong className="text-foreground">"{data.entity_name}"</strong>
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    filteredEntities.map((item, idx) => {
                                                        const isSelected =
                                                            currentEntityInfo?.entity_name === item.entity_name &&
                                                            currentEntityInfo?.category === item.category;

                                                        return (
                                                            <button
                                                                key={`${item.entity_name}-${item.category}-${idx}`}
                                                                type="button"
                                                                onClick={() => handleSelectEntity(item)}
                                                                className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 hover:bg-muted/60 transition-colors ${
                                                                    isSelected ? 'bg-primary/5' : ''
                                                                }`}
                                                            >
                                                                <div className="min-w-0">
                                                                    <div className="font-semibold text-xs text-foreground truncate">
                                                                        {item.entity_name}
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                                        <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                                                                            {item.category}
                                                                        </Badge>
                                                                        {item.custom_category_name && (
                                                                            <span className="text-[11px] text-muted-foreground truncate">
                                                                                • {item.custom_category_name}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right shrink-0">
                                                                    <span className="text-[10px] text-muted-foreground block">
                                                                        Saldo Berjalan
                                                                    </span>
                                                                    <span
                                                                        className={`font-mono text-xs font-bold ${
                                                                            item.running_balance_cents > 0
                                                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                                                : 'text-muted-foreground'
                                                                        }`}
                                                                    >
                                                                        {formatMoney(item.running_balance_cents)}
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        );
                                                    })
                                                )}

                                                {/* Option to explicitly confirm new entity creation in INFLOW mode */}
                                                {!isOutflow && data.entity_name.trim() && !isExistingEntity && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsDropdownOpen(false)}
                                                        className="w-full px-3.5 py-2.5 text-left bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center gap-2 text-xs font-medium"
                                                    >
                                                        <PlusCircle className="h-3.5 w-3.5 shrink-0" />
                                                        <span>
                                                            Buat Rekanan Baru: <strong>"{data.entity_name.trim()}"</strong>
                                                        </span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {isUnregisteredOutflow && (
                                    <p className="text-xs text-destructive flex items-center gap-1.5 pt-1">
                                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                        <span>
                                            Entitas belum terdaftar atau tidak memiliki saldo aktif. Pilih rekanan dari daftar di atas untuk melakukan penarikan (OUTFLOW).
                                        </span>
                                    </p>
                                )}
                                <InputError message={errors.entity_name} />
                            </div>

                            {/* Step 2: Category & Sub-Category (Auto-Locked if Existing Entity, Editable if New Entity in INFLOW) */}
                            {isExistingEntity && currentEntityInfo ? (
                                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                            <Lock className="h-3.5 w-3.5 text-primary" />
                                            <span>Kategori Dana Terisi Otomatis</span>
                                            <Badge variant="secondary" className="text-[10px] font-normal">
                                                Rekanan Terdaftar
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {CATEGORY_LABELS[currentEntityInfo.category as BriPostingCategory] || currentEntityInfo.category}
                                            {currentEntityInfo.custom_category_name && (
                                                <span className="font-semibold text-foreground">
                                                    {' '}
                                                    • Sub-Kategori: {currentEntityInfo.custom_category_name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Badge variant="outline" className="font-mono text-xs px-2.5 py-1 bg-background">
                                            {currentEntityInfo.category}
                                            {currentEntityInfo.custom_category_name ? ` / ${currentEntityInfo.custom_category_name}` : ''}
                                        </Badge>
                                    </div>
                                </div>
                            ) : (
                                !isOutflow && (
                                    <>
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-semibold text-foreground">
                                                    Kategori Dana (Rekanan Baru) <span className="text-destructive">*</span>
                                                </label>
                                                {data.entity_name.trim() && (
                                                    <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                                        Entitas Baru
                                                    </Badge>
                                                )}
                                            </div>
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
                                                            {CATEGORY_LABELS[cat as BriPostingCategory] || cat}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <InputError message={errors.category} />
                                        </div>

                                        {/* Custom Category Name if CUSTOM */}
                                        {data.category === 'CUSTOM' && (
                                            <div className="space-y-2 p-3.5 rounded-xl bg-muted/40 border border-border/60">
                                                <label className="text-xs font-semibold text-foreground block">
                                                    Nama Kategori Khusus <span className="text-destructive">*</span>
                                                </label>
                                                <Input
                                                    placeholder="Contoh: SO, BS, PDAM, Sewa Booth Event..."
                                                    value={data.custom_category_name}
                                                    onChange={(e) => setData('custom_category_name', e.target.value)}
                                                    className="text-xs"
                                                />
                                                {existingCustomCategories.length > 0 && (
                                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                        <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1 mr-1">
                                                            <Sparkles className="h-3 w-3 text-primary" />
                                                            Pilih cepat:
                                                        </span>
                                                        {existingCustomCategories.map((customName) => (
                                                            <button
                                                                key={customName}
                                                                type="button"
                                                                onClick={() => setData('custom_category_name', customName)}
                                                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-all ${
                                                                    data.custom_category_name === customName
                                                                        ? 'bg-primary text-primary-foreground border-primary'
                                                                        : 'bg-background hover:bg-muted text-foreground border-border'
                                                                }`}
                                                            >
                                                                {customName}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                <InputError message={errors.custom_category_name} />
                                            </div>
                                        )}
                                    </>
                                )
                            )}

                            {/* Balance Context Box & 1-Click Full Withdrawal Button */}
                            {isExistingEntity && currentEntityInfo && (
                                <div
                                    className={`p-3.5 rounded-xl border transition-all text-xs ${
                                        isZeroDeficitViolated
                                            ? 'bg-destructive/10 border-destructive/40 text-destructive'
                                            : 'bg-muted/50 border-border text-muted-foreground'
                                    }`}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                        <div className="flex items-center gap-2">
                                            <Coins className="h-4 w-4 text-primary shrink-0" />
                                            <div>
                                                <span className="font-semibold text-foreground block">
                                                    Saldo Berjalan Entitas Saat Ini:
                                                </span>
                                                <span className="font-mono font-bold text-sm text-foreground">
                                                    {formatMoney(entityRunningBalance)}
                                                </span>
                                            </div>
                                        </div>

                                        {isOutflow && entityRunningBalance > 0 && (
                                            <Button
                                                type="button"
                                                variant={data.amount_cents === entityRunningBalance ? 'secondary' : 'outline'}
                                                size="sm"
                                                onClick={() => setData('amount_cents', entityRunningBalance)}
                                                className="h-8 text-xs gap-1.5 font-semibold shrink-0 border-primary/30 hover:bg-primary/10 text-primary"
                                            >
                                                <Wallet className="h-3.5 w-3.5" />
                                                {data.amount_cents === entityRunningBalance
                                                    ? 'Seluruh Saldo Dipilih (100%)'
                                                    : `Tarik Semua Saldo (${formatMoney(entityRunningBalance)})`}
                                            </Button>
                                        )}
                                    </div>

                                    {isZeroDeficitViolated && (
                                        <div className="mt-2.5 flex items-start gap-2 pt-2 border-t border-destructive/20 text-destructive font-medium">
                                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                            <span>
                                                <strong>Zero-Deficit Guard Aktif:</strong> Pengeluaran sebesar{' '}
                                                {formatMoney(data.amount_cents)} melebihi saldo berjalan entitas (
                                                {formatMoney(entityRunningBalance)}). Transaksi tidak dapat diproses.
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
                                    {isOutflow ? 'Keperluan & Rekening Tujuan' : 'Keterangan Mutasi'}{' '}
                                    <span className="text-destructive">*</span>
                                </label>
                                <Textarea
                                    rows={3}
                                    placeholder={
                                        isOutflow
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
                    <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                        <Link href="/bri-funds">
                            <Button variant="outline" type="button">
                                Batal
                            </Button>
                        </Link>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => submitForm(true)}
                            disabled={
                                processing ||
                                isZeroDeficitViolated ||
                                isUnregisteredOutflow ||
                                data.amount_cents <= 0 ||
                                !data.entity_name.trim()
                            }
                            className="gap-1.5 font-semibold"
                        >
                            <PlusCircle className="h-4 w-4" />
                            Simpan & Catat Lagi
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                processing ||
                                isZeroDeficitViolated ||
                                isUnregisteredOutflow ||
                                data.amount_cents <= 0 ||
                                !data.entity_name.trim()
                            }
                            className="bg-primary text-primary-foreground font-semibold px-6 shadow-sm"
                        >
                            {processing
                                ? 'Memproses...'
                                : data.type === 'INFLOW'
                                  ? 'Simpan & Setujui Pemasukan'
                                  : 'Simpan & Setujui Pengeluaran'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

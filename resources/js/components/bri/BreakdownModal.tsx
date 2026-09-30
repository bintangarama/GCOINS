import React, { useState, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    DataTable,
    DataTableHead,
    DataTableHeaderCell,
    DataTableBody,
    DataTableRow,
    DataTableCell,
    DataTableEmpty,
} from '@/components/shared/DataTable';
import { BriCategoryBalances, BriEntityBalance } from '@/types/bri';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import {
    Building2,
    Layers,
    Search,
    ArrowUpRight,
    ArrowDownLeft,
    ChevronRight,
    X,
} from 'lucide-react';

interface BreakdownModalProps {
    categoryBalances: BriCategoryBalances;
    entities: BriEntityBalance[];
    trigger?: React.ReactNode;
    initialCategory?: string | null;
}

export function BreakdownModal({
    categoryBalances,
    entities,
    trigger,
    initialCategory = null,
}: BreakdownModalProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');

    useEffect(() => {
        if (initialCategory) {
            setSelectedCategory(initialCategory);
        }
    }, [initialCategory]);

    const categories = ['ALL', 'B2B', 'EVENT', 'AKSEL', 'ANONYMOUS', 'CUSTOM'];

    const filteredEntities = entities.filter((item) => {
        const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
        const matchesSearch =
            item.entity_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.custom_category_name && item.custom_category_name.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    const categoryTotal = selectedCategory === 'ALL'
        ? categoryBalances.TOTAL
        : (categoryBalances as any)[selectedCategory] || 0;

    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <Layers className="h-4 w-4" />
                        Breakdown Alokasi
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl lg:max-w-5xl w-full max-h-[90vh] flex flex-col p-6 gap-0 overflow-hidden">
                <DialogHeader className="pb-4 border-b shrink-0 pr-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-foreground">
                                    Breakdown Alokasi Dana BRI
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                    Rincian saldo berjalan per kategori dan entitas / mitra kerja
                                </DialogDescription>
                            </div>
                        </div>
                        <div className="flex flex-col items-start sm:items-end justify-center px-4 py-2 rounded-lg bg-muted/60 border border-border/80 shrink-0">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                {selectedCategory === 'ALL' ? 'Total Seluruh Alokasi' : `Total ${selectedCategory}`}
                            </span>
                            <span className="text-lg font-bold font-mono text-foreground leading-tight">
                                {formatMoney(categoryTotal)}
                            </span>
                        </div>
                    </div>
                </DialogHeader>

                {/* Category tabs & Search filter */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between py-4 shrink-0">
                    <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg border border-border/60 overflow-x-auto">
                        {categories.map((cat) => {
                            const count = cat === 'ALL' ? entities.length : entities.filter((e) => e.category === cat).length;
                            const isSelected = selectedCategory === cat;
                            return (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat)}
                                    className={cn(
                                        'px-3 py-1.5 rounded-md text-xs font-medium transition-all inline-flex items-center gap-1.5 whitespace-nowrap',
                                        isSelected
                                            ? 'bg-background text-foreground shadow-xs font-semibold'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                                    )}
                                >
                                    <span>{cat}</span>
                                    <span
                                        className={cn(
                                            'text-[10px] font-mono px-1.5 py-0.2 rounded-full',
                                            isSelected
                                                ? 'bg-primary/10 text-primary font-bold'
                                                : 'bg-muted-foreground/15 text-muted-foreground'
                                        )}
                                    >
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="relative w-full sm:w-64 shrink-0">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder="Cari entitas..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 pr-7 h-8 text-xs"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                                title="Hapus pencarian"
                            >
                                <X className="size-3" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Entities Table */}
                <div className="flex-1 overflow-auto rounded-lg border border-border bg-card shadow-2xs min-h-0">
                    <DataTable>
                        <DataTableHead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-border">
                            <tr>
                                <DataTableHeaderCell className="w-[30%]">Nama Entitas / Mitra</DataTableHeaderCell>
                                <DataTableHeaderCell align="center" className="w-[12%]">Kategori</DataTableHeaderCell>
                                <DataTableHeaderCell align="right" className="w-[16%]">Total Masuk</DataTableHeaderCell>
                                <DataTableHeaderCell align="right" className="w-[16%]">Total Keluar</DataTableHeaderCell>
                                <DataTableHeaderCell align="right" className="w-[16%]">Saldo Berjalan</DataTableHeaderCell>
                                <DataTableHeaderCell align="center" className="w-[10%]">Aksi</DataTableHeaderCell>
                            </tr>
                        </DataTableHead>
                        <DataTableBody>
                            {filteredEntities.length === 0 ? (
                                <DataTableEmpty
                                    colSpan={6}
                                    message="Tidak ada entitas yang ditemukan"
                                    description={
                                        searchQuery
                                            ? `Tidak ada hasil pencarian untuk "${searchQuery}" pada kategori ${selectedCategory}.`
                                            : `Belum ada data entitas untuk kategori ${selectedCategory}.`
                                    }
                                />
                            ) : (
                                filteredEntities.map((item, idx) => (
                                    <DataTableRow key={idx}>
                                        <DataTableCell>
                                            <div>
                                                <span className="font-semibold text-foreground text-xs block">
                                                    {item.entity_name}
                                                </span>
                                                {item.custom_category_name && (
                                                    <span className="text-[11px] text-muted-foreground block">
                                                        {item.custom_category_name}
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-muted-foreground font-mono block">
                                                    {item.postings_count} mutasi tercatat
                                                </span>
                                            </div>
                                        </DataTableCell>
                                        <DataTableCell align="center">
                                            <Badge variant="outline" className="font-mono text-[10px]">
                                                {item.category}
                                            </Badge>
                                        </DataTableCell>
                                        <DataTableCell align="right" mono className="text-emerald-600 dark:text-emerald-400">
                                            <span className="inline-flex items-center gap-1 font-medium">
                                                <ArrowDownLeft className="size-3" />
                                                {formatMoney(item.inflow_total_cents)}
                                            </span>
                                        </DataTableCell>
                                        <DataTableCell align="right" mono className="text-amber-600 dark:text-amber-400">
                                            <span className="inline-flex items-center gap-1 font-medium">
                                                <ArrowUpRight className="size-3" />
                                                {formatMoney(item.outflow_total_cents)}
                                            </span>
                                        </DataTableCell>
                                        <DataTableCell align="right" mono>
                                            <div className="font-bold text-foreground">
                                                {formatMoney(item.running_balance_cents)}
                                            </div>
                                            {item.pending_outflow_cents > 0 && (
                                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono block">
                                                    Pending: {formatMoney(item.pending_outflow_cents)}
                                                </span>
                                            )}
                                        </DataTableCell>
                                        <DataTableCell align="center">
                                            <Link href={`/bri-funds/entity/${encodeURIComponent(item.entity_name)}`}>
                                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary">
                                                    Rincian
                                                    <ChevronRight className="size-3" />
                                                </Button>
                                            </Link>
                                        </DataTableCell>
                                    </DataTableRow>
                                ))
                            )}
                        </DataTableBody>
                    </DataTable>
                </div>

                {/* Footer summary */}
                <div className="pt-4 border-t mt-4 flex items-center justify-between shrink-0">
                    <div className="text-xs text-muted-foreground">
                        Menampilkan <span className="font-semibold text-foreground">{filteredEntities.length}</span> dari{' '}
                        <span className="font-semibold text-foreground">{entities.length}</span> entitas
                    </div>
                    <DialogClose asChild>
                        <Button variant="outline" size="sm" className="text-xs">
                            Tutup
                        </Button>
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    );
}

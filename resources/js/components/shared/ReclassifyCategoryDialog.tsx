import React, { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { Tags } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { PettyCashCategoryItem, PettyCashVoucher } from '@/types/voucher';

interface ReclassifyCategoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    voucher: Pick<PettyCashVoucher, 'id' | 'voucher_number' | 'category' | 'status'> | null;
    categories: (string | PettyCashCategoryItem)[];
}

export function ReclassifyCategoryDialog({
    open,
    onOpenChange,
    voucher,
    categories,
}: ReclassifyCategoryDialogProps) {
    const normalizedCategories = categories.map((c) =>
        typeof c === 'string' ? { code: c, name: c } : c
    );

    if (
        voucher?.category &&
        !normalizedCategories.some((c) => c.code === voucher.category)
    ) {
        normalizedCategories.unshift({
            code: voucher.category,
            name: voucher.category,
        });
    }

    const [selectedCategory, setSelectedCategory] = useState<string>(
        voucher?.category || normalizedCategories[0]?.code || ''
    );
    const [reason, setReason] = useState<string>('');
    const [isSaving, setIsSaving] = useState<boolean>(false);

    useEffect(() => {
        if (voucher && open) {
            setSelectedCategory(voucher.category);
            setReason('');
        }
    }, [voucher, open]);

    const handleSave = () => {
        if (!voucher || !selectedCategory || selectedCategory === voucher.category) {
            return;
        }

        setIsSaving(true);
        router.put(
            `/vouchers/${voucher.id}/category`,
            {
                category: selectedCategory,
                reason: reason.trim() || undefined,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    onOpenChange(false);
                },
                onFinish: () => setIsSaving(false),
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-base flex items-center gap-2">
                        <Tags className="size-4 text-primary" />
                        Reklasifikasi Kategori Bon
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Ubah pos kategori biaya untuk voucher{' '}
                        <span className="font-mono font-semibold text-foreground">
                            {voucher?.voucher_number}
                        </span>{' '}
                        tanpa mengubah nominal uang maupun status persetujuan. Perubahan akan tercatat pada Audit Log.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-2">
                    <div className="flex items-center justify-between text-xs bg-muted/40 border rounded-lg px-3 py-2">
                        <span className="text-muted-foreground">Kategori Saat Ini</span>
                        <Badge variant="secondary" className="font-mono text-xs">
                            {voucher?.category}
                        </Badge>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="reclassify-category" className="text-xs font-semibold">
                            Kategori Baru <span className="text-destructive">*</span>
                        </Label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger id="reclassify-category" className="h-9 text-xs">
                                <SelectValue placeholder="Pilih kategori pengeluaran" />
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
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="reclassify-reason" className="text-xs font-semibold">
                            Catatan Koreksi <span className="text-muted-foreground font-normal">(Opsional)</span>
                        </Label>
                        <Input
                            id="reclassify-reason"
                            placeholder="Contoh: Koreksi pos biaya sebelum rekap KKCL"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            maxLength={255}
                            className="h-9 text-xs"
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isSaving}
                        onClick={() => onOpenChange(false)}
                        className="text-xs"
                    >
                        Batal
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        disabled={
                            isSaving ||
                            !selectedCategory ||
                            selectedCategory === voucher?.category
                        }
                        onClick={handleSave}
                        className="text-xs"
                    >
                        Simpan Kategori Baru
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


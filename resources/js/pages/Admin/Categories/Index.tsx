import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    Tags,
    Plus,
    Edit2,
    CheckCircle2,
    XCircle,
    Globe,
    Store as StoreIcon,
    ArrowUpDown,
    Check,
    Download,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import {
    DataTable,
    DataTableHead,
    DataTableHeaderCell,
    DataTableBody,
    DataTableRow,
    DataTableCell,
    DataTableEmpty,
} from '@/components/shared/DataTable';
import { PettyCashCategoryItem } from '@/types/voucher';

interface CategoryIndexProps {
    categories: PettyCashCategoryItem[];
    stores: { id: string; name: string; code: string }[];
    filters: { store_id?: string };
    canManageGlobal: boolean;
    canManageStore: boolean;
    currentStoreId?: string | null;
}

export default function CategoryIndexPage({
    categories,
    stores,
    filters,
    canManageGlobal,
    canManageStore,
    currentStoreId,
}: CategoryIndexProps) {
    // Modal states
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<PettyCashCategoryItem | null>(null);

    // Form states
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        description: '',
        sort_order: 10,
        store_id: canManageGlobal ? 'global' : currentStoreId || '',
    });

    const [editFormData, setEditFormData] = useState({
        name: '',
        description: '',
        sort_order: 10,
        is_active: true,
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const openCreateDialog = () => {
        setFormData({
            code: '',
            name: '',
            description: '',
            sort_order: (categories.length + 1) * 10,
            store_id: canManageGlobal ? 'global' : currentStoreId || '',
        });
        setCreateOpen(true);
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const payload = {
            code: formData.code,
            name: formData.name,
            description: formData.description,
            sort_order: formData.sort_order,
            store_id: formData.store_id === 'global' ? '' : formData.store_id,
        };

        router.post('/admin/categories', payload, {
            onSuccess: () => {
                setCreateOpen(false);
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    const openEditDialog = (cat: PettyCashCategoryItem) => {
        setSelectedCategory(cat);
        setEditFormData({
            name: cat.name,
            description: cat.description || '',
            sort_order: cat.sort_order || 0,
            is_active: cat.is_active ?? true,
        });
        setEditOpen(true);
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCategory?.id) return;
        setIsSubmitting(true);

        router.put(`/admin/categories/${selectedCategory.id}`, editFormData, {
            onSuccess: () => {
                setEditOpen(false);
                setSelectedCategory(null);
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    const handleToggleStatus = (cat: PettyCashCategoryItem) => {
        if (!cat.id) return;
        router.post(`/admin/categories/${cat.id}/toggle-status`, {}, {
            preserveScroll: true,
        });
    };

    const handleFilterStore = (val: string) => {
        router.get(
            '/admin/categories',
            { store_id: val === 'ALL' ? undefined : val },
            { preserveState: true }
        );
    };

    return (
        <AppLayout title="Kategori Pengeluaran Kas Kecil">
            <Head title="Kategori Pengeluaran Kas Kecil" />

            <div className="space-y-6">
                <PageHeader
                    title="Kategori Pengeluaran Kas Kecil"
                    icon={Tags}
                    description="Kelola pos beban akuntansi kas kecil (Global Nasional & Toko)"
                >
                    <div className="flex items-center gap-2">
                        <a
                            href="/admin/import-export/export/categories"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors shadow-2xs"
                        >
                            <Download className="size-3.5 text-indigo-600" />
                            <span>Ekspor Excel (.xlsx)</span>
                        </a>
                        {canManageStore && (
                            <Button
                                size="sm"
                                onClick={openCreateDialog}
                                className="gap-2 shadow-xs"
                            >
                                <Plus className="size-4" />
                                Tambah Kategori Baru
                            </Button>
                        )}
                    </div>
                </PageHeader>

                {/* Filter Toolbar (Admin only) */}
                {canManageGlobal && stores.length > 0 && (
                    <Card className="border shadow-sm">
                        <CardContent className="p-3.5 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <Label className="text-xs text-muted-foreground whitespace-nowrap">
                                    Filter Cakupan:
                                </Label>
                                <Select
                                    value={filters.store_id || 'ALL'}
                                    onValueChange={handleFilterStore}
                                >
                                    <SelectTrigger className="w-56 h-8 text-xs">
                                        <SelectValue placeholder="Semua Kategori" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL" className="text-xs font-medium">Semua Kategori</SelectItem>
                                        <SelectItem value="global" className="text-xs font-semibold text-blue-600">
                                            Hanya Kategori Global
                                        </SelectItem>
                                        {stores.map((s) => (
                                            <SelectItem key={s.id} value={s.id} className="text-xs">
                                                Toko: {s.name} ({s.code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Total: <span className="font-semibold text-foreground">{categories.length}</span> Kategori
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Table */}
                <Card className="border shadow-sm overflow-hidden">
                    <DataTable>
                        <DataTableHead>
                            <tr>
                                <DataTableHeaderCell align="center" className="w-14">Urutan</DataTableHeaderCell>
                                <DataTableHeaderCell className="w-40">Kode Kategori</DataTableHeaderCell>
                                <DataTableHeaderCell>Nama Pos Beban</DataTableHeaderCell>
                                <DataTableHeaderCell>Deskripsi</DataTableHeaderCell>
                                <DataTableHeaderCell align="center" className="w-32">Cakupan</DataTableHeaderCell>
                                <DataTableHeaderCell align="center" className="w-24">Status</DataTableHeaderCell>
                                <DataTableHeaderCell align="center" className="w-28">Aksi</DataTableHeaderCell>
                            </tr>
                        </DataTableHead>
                        <DataTableBody>
                            {categories.length === 0 ? (
                                <DataTableEmpty
                                    colSpan={7}
                                    icon={<Tags className="w-10 h-10 text-muted-foreground stroke-1" />}
                                    message="Belum ada kategori pengeluaran"
                                    description="Kategori kas kecil digunakan untuk mengelompokkan bon saat pengajuan dan rekapitulasi."
                                />
                            ) : (
                                categories.map((cat) => {
                                    const isGlobal = !cat.store_id;
                                    const canEditThis = canManageGlobal || (canManageStore && !isGlobal);

                                    return (
                                        <DataTableRow key={cat.id || cat.code}>
                                            <DataTableCell align="center" mono className="text-muted-foreground font-semibold">
                                                {cat.sort_order}
                                            </DataTableCell>
                                            <DataTableCell className="font-mono font-bold text-primary">
                                                {cat.code}
                                            </DataTableCell>
                                            <DataTableCell className="font-medium text-foreground">
                                                {cat.name}
                                            </DataTableCell>
                                            <DataTableCell className="text-muted-foreground text-xs max-w-sm truncate" title={cat.description || ''}>
                                                {cat.description || '-'}
                                            </DataTableCell>
                                            <DataTableCell align="center">
                                                {isGlobal ? (
                                                    <Badge variant="secondary" className="gap-1 font-mono text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200">
                                                        <Globe className="size-3" />
                                                        GLOBAL
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="gap-1 font-mono text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200">
                                                        <StoreIcon className="size-3" />
                                                        {cat.store?.name ? cat.store.name.replace('Gramedia', '').trim() : 'TOKO'}
                                                    </Badge>
                                                )}
                                            </DataTableCell>
                                            <DataTableCell align="center">
                                                {cat.is_active ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                                        <CheckCircle2 className="size-3.5" />
                                                        Aktif
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                                                        <XCircle className="size-3.5" />
                                                        Nonaktif
                                                    </span>
                                                )}
                                            </DataTableCell>
                                            <DataTableCell align="center">
                                                {canEditThis ? (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openEditDialog(cat)}
                                                            className="h-7 w-7 p-0"
                                                            title="Edit Kategori"
                                                        >
                                                            <Edit2 className="size-3.5 text-muted-foreground" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleToggleStatus(cat)}
                                                            className={`h-7 px-2 text-xs font-mono ${
                                                                cat.is_active
                                                                    ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                                                    : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                                            }`}
                                                            title={cat.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                                        >
                                                            {cat.is_active ? 'Nonaktif' : 'Aktifkan'}
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-muted-foreground italic">Terkunci</span>
                                                )}
                                            </DataTableCell>
                                        </DataTableRow>
                                    );
                                })
                            )}
                        </DataTableBody>
                    </DataTable>
                </Card>
            </div>

            {/* Create Dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleCreate}>
                        <DialogHeader>
                            <DialogTitle className="text-base font-bold">Tambah Kategori Kas Kecil</DialogTitle>
                            <DialogDescription className="text-xs">
                                Masukkan kode akun dan nama kategori pengeluaran kas kecil
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="code" className="text-xs font-semibold">
                                    Kode Kategori (Singkat & Unik) <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="code"
                                    placeholder="Contoh: BBM_MOBIL, KEP_RT, ONGKIR"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    required
                                    className="h-9 text-xs font-mono"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="name" className="text-xs font-semibold">
                                    Nama Kategori (Tampil pada Dokumen) <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    placeholder="Contoh: Pem. Bbm Mobil, Kep RT, Ongkir"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="h-9 text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="description" className="text-xs font-semibold">
                                    Deskripsi Keperluan
                                </Label>
                                <Input
                                    id="description"
                                    placeholder="Penjelasan peruntukan beban kas kecil ini..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="h-9 text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="sort_order" className="text-xs font-semibold">
                                        Urutan Kolom (Sort Order)
                                    </Label>
                                    <Input
                                        id="sort_order"
                                        type="number"
                                        value={formData.sort_order}
                                        onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                                        className="h-9 text-xs font-mono"
                                    />
                                </div>

                                {canManageGlobal && (
                                    <div className="space-y-1.5">
                                        <Label htmlFor="store_id" className="text-xs font-semibold">
                                            Cakupan Kategori
                                        </Label>
                                        <Select
                                            value={formData.store_id}
                                            onValueChange={(val) => setFormData({ ...formData, store_id: val })}
                                        >
                                            <SelectTrigger id="store_id" className="h-9 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="global" className="text-xs font-semibold text-blue-600">
                                                    Global (Semua Toko)
                                                </SelectItem>
                                                {stores.map((s) => (
                                                    <SelectItem key={s.id} value={s.id} className="text-xs">
                                                        Toko: {s.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setCreateOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={isSubmitting || !formData.code || !formData.name}
                                className="text-xs gap-1.5"
                            >
                                <Check className="size-3.5" />
                                Simpan Kategori
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleEdit}>
                        <DialogHeader>
                            <DialogTitle className="text-base font-bold">
                                Edit Kategori: <span className="font-mono text-primary">{selectedCategory?.code}</span>
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Sesuaikan nama tampilan dan urutan kolom pada tabel rekap
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-name" className="text-xs font-semibold">
                                    Nama Kategori <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="edit-name"
                                    value={editFormData.name}
                                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                    required
                                    className="h-9 text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit-description" className="text-xs font-semibold">
                                    Deskripsi Keperluan
                                </Label>
                                <Input
                                    id="edit-description"
                                    value={editFormData.description}
                                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                                    className="h-9 text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3 items-center">
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-sort_order" className="text-xs font-semibold">
                                        Urutan Kolom
                                    </Label>
                                    <Input
                                        id="edit-sort_order"
                                        type="number"
                                        value={editFormData.sort_order}
                                        onChange={(e) => setEditFormData({ ...editFormData, sort_order: parseInt(e.target.value) || 0 })}
                                        className="h-9 text-xs font-mono"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Status Kategori</Label>
                                    <div className="flex items-center gap-2 pt-1.5">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={editFormData.is_active ? 'default' : 'outline'}
                                            onClick={() => setEditFormData({ ...editFormData, is_active: !editFormData.is_active })}
                                            className={`text-xs h-8 ${editFormData.is_active ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                                        >
                                            {editFormData.is_active ? 'Aktif Digunakan' : 'Nonaktif'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setEditOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={isSubmitting || !editFormData.name}
                                className="text-xs gap-1.5"
                            >
                                <Check className="size-3.5" />
                                Perbarui
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

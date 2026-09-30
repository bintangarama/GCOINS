import React, { useState } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import {
    Users as UsersIcon,
    UserPlus,
    KeyRound,
    CheckCircle2,
    XCircle,
    Edit2,
    Shield,
    Phone,
    Building2,
    Search,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
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
import {
    DataTable,
    DataTableHead,
    DataTableHeaderCell,
    DataTableBody,
    DataTableRow,
    DataTableCell,
    DataTableEmpty,
} from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PageProps, Role, Store, User } from '@/types/auth';
import usersRoutes from '@/routes/admin/users';

interface PaginatedUsers {
    data: User[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface UsersProps {
    users: PaginatedUsers;
    stores: Store[];
}

export default function UsersPage({ users, stores }: UsersProps) {
    const { auth } = usePage<PageProps>().props;
    const currentUser = auth.user;

    const [search, setSearch] = useState('');
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [resetPinDialogOpen, setResetPinDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // Create User Form
    const createForm = useForm({
        nik: '',
        name: '',
        role: 'SOA' as Role,
        phone_number: '',
        pin: '123456',
    });

    // Edit User Form
    const editForm = useForm({
        name: '',
        role: 'SOA' as Role,
        phone_number: '',
    });

    // Reset PIN Form
    const resetPinForm = useForm({
        pin: '123456',
    });

    const handleOpenCreate = () => {
        createForm.reset();
        setCreateDialogOpen(true);
    };

    const handleOpenEdit = (user: User) => {
        setSelectedUser(user);
        editForm.setData({
            name: user.name,
            role: user.role,
            phone_number: user.phone_number || '',
        });
        setEditDialogOpen(true);
    };

    const handleOpenResetPin = (user: User) => {
        setSelectedUser(user);
        resetPinForm.setData({ pin: '123456' });
        setResetPinDialogOpen(true);
    };

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post(usersRoutes.store.url(), {
            onSuccess: () => setCreateDialogOpen(false),
        });
    };

    const submitEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        editForm.put(usersRoutes.update.url(selectedUser.id), {
            onSuccess: () => setEditDialogOpen(false),
        });
    };

    const submitResetPin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        resetPinForm.post(usersRoutes.resetPin.url(selectedUser.id), {
            onSuccess: () => setResetPinDialogOpen(false),
        });
    };

    const handleToggleStatus = (user: User) => {
        const action = user.is_active ? 'menonaktifkan' : 'mengaktifkan';
        if (confirm(`Apakah Anda yakin ingin ${action} akun ${user.name}?`)) {
            router.post(usersRoutes.toggleStatus.url(user.id));
        }
    };

    const filteredUsers = users.data.filter(
        (u) =>
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.nik.toLowerCase().includes(search.toLowerCase()) ||
            u.role.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <AppLayout title="Manajemen Pengguna">
            <div className="space-y-6">
                <PageHeader
                    title="Manajemen Pengguna"
                    icon={UsersIcon}
                    description="Kelola akun karyawan toko, penetapan peran (RBAC), dan reset keamanan PIN"
                >
                    <Button onClick={handleOpenCreate} className="shadow-xs gap-2">
                        <UserPlus className="size-4" />
                        Tambah Pengguna Baru
                    </Button>
                </PageHeader>

                {/* Filter and Search Bar */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="relative w-full sm:w-72">
                                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                                <Input
                                    placeholder="Cari NIK, Nama, Peran..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9 h-10 text-sm"
                                />
                            </div>
                            <div className="text-xs text-muted-foreground font-medium self-end sm:self-center">
                                Total Pengguna Terdaftar: <span className="font-bold text-foreground">{users.total}</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <DataTable>
                            <DataTableHead>
                                <tr>
                                    <DataTableHeaderCell>NIK</DataTableHeaderCell>
                                    <DataTableHeaderCell>Nama Lengkap</DataTableHeaderCell>
                                    <DataTableHeaderCell>Peran (RBAC)</DataTableHeaderCell>
                                    <DataTableHeaderCell>Toko / Unit</DataTableHeaderCell>
                                    <DataTableHeaderCell>No. HP</DataTableHeaderCell>
                                    <DataTableHeaderCell>Status</DataTableHeaderCell>
                                    <DataTableHeaderCell align="right">Aksi</DataTableHeaderCell>
                                </tr>
                            </DataTableHead>
                            <DataTableBody>
                                {filteredUsers.length === 0 ? (
                                    <DataTableEmpty
                                        colSpan={7}
                                        icon={<UsersIcon className="w-10 h-10 text-muted-foreground/40 stroke-1" />}
                                        message="Tidak ada data pengguna yang ditemukan"
                                        description={search ? "Coba gunakan kata kunci pencarian yang lain." : "Belum ada data pengguna yang terdaftar."}
                                        action={
                                            search ? (
                                                <Button variant="outline" size="sm" onClick={() => setSearch('')} className="text-xs h-8">
                                                    Reset Pencarian
                                                </Button>
                                            ) : (
                                                <Button size="sm" onClick={handleOpenCreate} className="text-xs h-8 gap-1.5">
                                                    <UserPlus className="w-3.5 h-3.5" />
                                                    Tambah Pengguna
                                                </Button>
                                            )
                                        }
                                    />
                                ) : (
                                    filteredUsers.map((userItem) => (
                                        <DataTableRow key={userItem.id}>
                                            <DataTableCell mono className="font-medium text-foreground">
                                                {userItem.nik}
                                            </DataTableCell>
                                            <DataTableCell className="font-semibold text-foreground">
                                                {userItem.name}
                                            </DataTableCell>
                                            <DataTableCell>
                                                <StatusBadge status={userItem.role} />
                                            </DataTableCell>
                                            <DataTableCell className="text-xs text-muted-foreground">
                                                {userItem.store ? (
                                                    <span>{userItem.store.code} — {userItem.store.name}</span>
                                                ) : (
                                                    <span className="text-muted-foreground italic">Sistem Pusat</span>
                                                )}
                                            </DataTableCell>
                                            <DataTableCell mono className="text-xs text-muted-foreground">
                                                {userItem.phone_number || '-'}
                                            </DataTableCell>
                                            <DataTableCell>
                                                <StatusBadge status={userItem.is_active ? 'ACTIVE' : 'INACTIVE'} />
                                            </DataTableCell>
                                            <DataTableCell align="right" className="space-x-1 whitespace-nowrap">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleOpenEdit(userItem)}
                                                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                                                    title="Edit User"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleOpenResetPin(userItem)}
                                                    className="h-8 px-2 text-primary hover:text-primary/80 hover:bg-primary/10"
                                                    title="Reset PIN"
                                                >
                                                    <KeyRound className="w-3.5 h-3.5" />
                                                </Button>

                                                {currentUser?.id !== userItem.id && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleToggleStatus(userItem)}
                                                        className={`h-8 px-2 ${
                                                            userItem.is_active
                                                                ? 'text-destructive hover:bg-destructive/10'
                                                                : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                                        }`}
                                                        title={userItem.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                                    >
                                                        {userItem.is_active ? (
                                                            <XCircle className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                        )}
                                                    </Button>
                                                )}
                                            </DataTableCell>
                                        </DataTableRow>
                                    ))
                                )}
                            </DataTableBody>
                        </DataTable>
                    </CardContent>
                </Card>
            </div>

            {/* Modal Dialog: Create User */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">Tambah Pengguna Baru</DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Masukkan data karyawan untuk didaftarkan ke sistem toko.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitCreate} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="nik" className="text-xs font-semibold">
                                NIK (Nomor Induk Karyawan)
                            </Label>
                            <Input
                                id="nik"
                                value={createForm.data.nik}
                                onChange={(e) => createForm.setData('nik', e.target.value.toUpperCase())}
                                placeholder="Contoh: SAC002"
                                required
                            />
                            {createForm.errors.nik && (
                                <p className="text-xs text-red-600">{createForm.errors.nik}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="name" className="text-xs font-semibold">
                                Nama Lengkap
                            </Label>
                            <Input
                                id="name"
                                value={createForm.data.name}
                                onChange={(e) => createForm.setData('name', e.target.value)}
                                placeholder="Nama karyawan..."
                                required
                            />
                            {createForm.errors.name && (
                                <p className="text-xs text-red-600">{createForm.errors.name}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="role" className="text-xs font-semibold">
                                Peran (Role)
                            </Label>
                            <Select
                                value={createForm.data.role}
                                onValueChange={(val) => createForm.setData('role', val as Role)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Peran" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SOA">SOA (Store Operation Associate)</SelectItem>
                                    <SelectItem value="SS">SS (Store Supervisor)</SelectItem>
                                    <SelectItem value="SAC">SAC (Staff Administrative Clerk)</SelectItem>
                                    <SelectItem value="SM">SM (Store Manager)</SelectItem>
                                    {currentUser?.role === 'SYSTEM_ADMIN' && (
                                        <SelectItem value="SYSTEM_ADMIN">SYSTEM_ADMIN (Administrator)</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                            {createForm.errors.role && (
                                <p className="text-xs text-red-600">{createForm.errors.role}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="phone" className="text-xs font-semibold">
                                Nomor WhatsApp / HP
                            </Label>
                            <Input
                                id="phone"
                                value={createForm.data.phone_number}
                                onChange={(e) => createForm.setData('phone_number', e.target.value)}
                                placeholder="08xxxxxxxxxx"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="pin" className="text-xs font-semibold">
                                PIN Awal (Default: 123456)
                            </Label>
                            <Input
                                id="pin"
                                value={createForm.data.pin}
                                onChange={(e) => createForm.setData('pin', e.target.value)}
                                placeholder="123456"
                                className="font-mono tracking-widest"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={createForm.processing} className="bg-blue-600 hover:bg-blue-700">
                                {createForm.processing ? 'Menyimpan...' : 'Simpan Pengguna'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Dialog: Edit User */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">Edit Data Pengguna</DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Perbarui informasi karyawan: <span className="font-semibold text-slate-800">{selectedUser?.name}</span> ({selectedUser?.nik})
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitEdit} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-name" className="text-xs font-semibold">
                                Nama Lengkap
                            </Label>
                            <Input
                                id="edit-name"
                                value={editForm.data.name}
                                onChange={(e) => editForm.setData('name', e.target.value)}
                                required
                            />
                            {editForm.errors.name && (
                                <p className="text-xs text-red-600">{editForm.errors.name}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="edit-role" className="text-xs font-semibold">
                                Peran (Role)
                            </Label>
                            <Select
                                value={editForm.data.role}
                                onValueChange={(val) => editForm.setData('role', val as Role)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Peran" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SOA">SOA (Store Operation Associate)</SelectItem>
                                    <SelectItem value="SS">SS (Store Supervisor)</SelectItem>
                                    <SelectItem value="SAC">SAC (Staff Administrative Clerk)</SelectItem>
                                    <SelectItem value="SM">SM (Store Manager)</SelectItem>
                                    {currentUser?.role === 'SYSTEM_ADMIN' && (
                                        <SelectItem value="SYSTEM_ADMIN">SYSTEM_ADMIN (Administrator)</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="edit-phone" className="text-xs font-semibold">
                                Nomor WhatsApp / HP
                            </Label>
                            <Input
                                id="edit-phone"
                                value={editForm.data.phone_number}
                                onChange={(e) => editForm.setData('phone_number', e.target.value)}
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={editForm.processing} className="bg-blue-600 hover:bg-blue-700">
                                {editForm.processing ? 'Menyimpan...' : 'Perbarui Data'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Dialog: Reset PIN */}
            <Dialog open={resetPinDialogOpen} onOpenChange={setResetPinDialogOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold flex items-center gap-2 text-blue-600">
                            <KeyRound className="w-5 h-5" />
                            Reset PIN Pengguna
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Atur ulang PIN keamanan untuk: <span className="font-semibold text-slate-800">{selectedUser?.name}</span> ({selectedUser?.nik})
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitResetPin} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="reset-pin" className="text-xs font-semibold">
                                PIN Baru (Default: 123456)
                            </Label>
                            <Input
                                id="reset-pin"
                                value={resetPinForm.data.pin}
                                onChange={(e) => resetPinForm.setData('pin', e.target.value)}
                                placeholder="123456"
                                className="font-mono tracking-widest text-center text-lg h-12"
                                required
                            />
                            {resetPinForm.errors.pin && (
                                <p className="text-xs text-red-600">{resetPinForm.errors.pin}</p>
                            )}
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setResetPinDialogOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={resetPinForm.processing} className="bg-blue-600 hover:bg-blue-700">
                                {resetPinForm.processing ? 'Memproses...' : 'Reset PIN'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

import React, { useState } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import {
    User as UserIcon,
    KeyRound,
    Building2,
    Shield,
    CheckCircle2,
    Eye,
    EyeOff,
    Save,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PageProps } from '@/types/auth';

export default function ProfileIndex() {
    const { props } = usePage<PageProps>();
    const user = props.auth.user;

    const [showCurrentPin, setShowCurrentPin] = useState(false);
    const [showNewPin, setShowNewPin] = useState(false);
    const [showConfirmPin, setShowConfirmPin] = useState(false);

    const { data, setData, put, processing, errors, reset, recentlySuccessful } = useForm({
        current_pin: '',
        new_pin: '',
        new_pin_confirmation: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put('/profile/pin', {
            preserveScroll: true,
            onSuccess: () => {
                reset();
            },
        });
    };

    return (
        <AppLayout title="Profil Saya">
            <div className="max-w-4xl flex flex-col gap-6">
                <PageHeader
                    title="Profil Pengguna"
                    icon={UserIcon}
                    description="Informasi akun pegawai dan keamanan PIN Anda."
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* User Info Card */}
                    <div className="md:col-span-1 space-y-4">
                        <Card>
                            <CardHeader className="text-center pb-2">
                                <div className="w-20 h-20 rounded-full bg-primary/10 text-primary font-bold text-2xl flex items-center justify-center mx-auto mb-2 border-2 border-primary/20">
                                    {user?.name?.substring(0, 2).toUpperCase() || 'U'}
                                </div>
                                <CardTitle className="text-base text-foreground">{user?.name}</CardTitle>
                                <CardDescription className="font-mono text-xs text-muted-foreground">
                                    NIK: {user?.nik}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-xs pt-2">
                                <div className="border-t border-border pt-3 space-y-3">
                                    <div>
                                        <span className="text-muted-foreground block font-medium">Peran / Role:</span>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <Shield className="w-3.5 h-3.5 text-primary" />
                                            <StatusBadge status={user?.role || ''} />
                                        </div>
                                    </div>

                                    <div>
                                        <span className="text-muted-foreground block font-medium">Toko Bertugas:</span>
                                        <div className="flex items-start gap-1.5 mt-1 text-foreground font-medium">
                                            <Building2 className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                            <span>
                                                {user?.store ? `${user.store.code} — ${user.store.name}` : 'Sistem Pusat (Global)'}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <span className="text-muted-foreground block font-medium">Nomor Telepon:</span>
                                        <p className="mt-0.5 text-foreground font-mono">
                                            {user?.phone_number || '—'}
                                        </p>
                                    </div>

                                    <div>
                                        <span className="text-muted-foreground block font-medium">Status Akun:</span>
                                        <div className="mt-1 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span>Aktif</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Change PIN Form */}
                    <div className="md:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                                    <KeyRound className="w-5 h-5 text-primary" />
                                    Ubah PIN Keamanan
                                </CardTitle>
                                <CardDescription>
                                    PIN digunakan untuk verifikasi login dan otoritas tindakan. Minimal 6 karakter/angka.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* Current PIN */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="current_pin" className="text-xs font-semibold text-foreground">
                                            PIN Saat Ini <span className="text-destructive">*</span>
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="current_pin"
                                                type={showCurrentPin ? 'text' : 'password'}
                                                value={data.current_pin}
                                                onChange={(e) => setData('current_pin', e.target.value)}
                                                placeholder="Masukkan PIN lama"
                                                className="pr-10 font-mono tracking-wider"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCurrentPin(!showCurrentPin)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                {showCurrentPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        {errors.current_pin && (
                                            <p className="text-xs text-destructive mt-1">{errors.current_pin}</p>
                                        )}
                                    </div>

                                    {/* New PIN */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="new_pin" className="text-xs font-semibold text-foreground">
                                            PIN Baru <span className="text-destructive">*</span>
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="new_pin"
                                                type={showNewPin ? 'text' : 'password'}
                                                value={data.new_pin}
                                                onChange={(e) => setData('new_pin', e.target.value)}
                                                placeholder="Minimal 6 karakter"
                                                className="pr-10 font-mono tracking-wider"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPin(!showNewPin)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        {errors.new_pin && (
                                            <p className="text-xs text-destructive mt-1">{errors.new_pin}</p>
                                        )}
                                    </div>

                                    {/* Confirm New PIN */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="new_pin_confirmation" className="text-xs font-semibold text-foreground">
                                            Konfirmasi PIN Baru <span className="text-destructive">*</span>
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="new_pin_confirmation"
                                                type={showConfirmPin ? 'text' : 'password'}
                                                value={data.new_pin_confirmation}
                                                onChange={(e) => setData('new_pin_confirmation', e.target.value)}
                                                placeholder="Ulangi PIN baru"
                                                className="pr-10 font-mono tracking-wider"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPin(!showConfirmPin)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        {errors.new_pin_confirmation && (
                                            <p className="text-xs text-destructive mt-1">{errors.new_pin_confirmation}</p>
                                        )}
                                    </div>

                                    <div className="pt-2 flex items-center justify-between">
                                        {recentlySuccessful ? (
                                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                                                <CheckCircle2 className="w-4 h-4" />
                                                PIN berhasil disimpan!
                                            </p>
                                        ) : (
                                            <span />
                                        )}

                                        <Button
                                            type="submit"
                                            disabled={processing}
                                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                                        >
                                            <Save className="w-4 h-4 mr-2" />
                                            {processing ? 'Menyimpan...' : 'Simpan PIN Baru'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

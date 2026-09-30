import React, { FormEventHandler } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Lock, UserCheck, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { login } from '@/routes';

export default function Login() {
    const { data, setData, post, processing, errors, reset } = useForm({
        nik: '',
        pin: '',
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(login.url(), {
            onFinish: () => reset('pin'),
        });
    };

    const fillDemo = (nik: string, pin: string) => {
        setData({
            ...data,
            nik,
            pin,
        });
    };

    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-muted/40 p-4 sm:p-6 lg:p-8">
            <Head title="Masuk - G-COINS" />

            <div className="w-full max-w-md space-y-6">
                {/* Brand Header */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 mb-1">
                        <span className="font-bold text-2xl tracking-tighter">GC</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">G-COINS</h1>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                        Gramedia Cash Opname Internal System
                    </p>
                </div>

                {/* Login Card */}
                <Card className="border-border shadow-md">
                    <CardHeader className="space-y-1 pb-4">
                        <CardTitle className="text-xl font-bold text-foreground">Masuk ke Sistem</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                            Masukkan Nomor Induk Karyawan (NIK) dan 6-digit PIN Anda
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={submit}>
                        <CardContent className="space-y-4 pt-0">
                            {/* NIK Field */}
                            <div className="space-y-1.5">
                                <Label htmlFor="nik" className="text-xs font-semibold text-foreground">
                                    NIK (Nomor Induk Karyawan)
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="nik"
                                        type="text"
                                        name="nik"
                                        value={data.nik}
                                        onChange={(e) => setData('nik', e.target.value.toUpperCase())}
                                        placeholder="Contoh: SAC001"
                                        autoFocus
                                        required
                                        className="h-10 text-sm font-mono tracking-wide pl-3"
                                    />
                                </div>
                                {errors.nik && <p className="text-xs text-destructive font-medium">{errors.nik}</p>}
                            </div>

                            {/* PIN Field */}
                            <div className="space-y-1.5">
                                <Label htmlFor="pin" className="text-xs font-semibold text-foreground">
                                    PIN (Security PIN)
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="pin"
                                        type="password"
                                        name="pin"
                                        value={data.pin}
                                        onChange={(e) => setData('pin', e.target.value)}
                                        placeholder="••••••"
                                        inputMode="numeric"
                                        required
                                        className="h-10 text-sm font-mono tracking-widest pl-3"
                                    />
                                </div>
                                {errors.pin && <p className="text-xs text-destructive font-medium">{errors.pin}</p>}
                            </div>

                            {/* Remember Checkbox */}
                            <div className="flex items-center space-x-2 pt-1">
                                <Checkbox
                                    id="remember"
                                    checked={data.remember}
                                    onCheckedChange={(checked) => setData('remember', checked === true)}
                                />
                                <Label htmlFor="remember" className="text-xs font-normal text-muted-foreground cursor-pointer">
                                    Ingat sesi perangkat ini (24 Jam)
                                </Label>
                            </div>
                        </CardContent>

                        <CardFooter className="flex flex-col gap-4">
                            <Button type="submit" disabled={processing} className="w-full h-10 font-semibold">
                                {processing ? 'Memproses...' : 'Masuk (Login)'}
                            </Button>

                            {/* Demo Quick-fill Buttons */}
                            <div className="w-full pt-3 border-t border-border">
                                <p className="text-[11px] text-center font-medium text-muted-foreground mb-2">
                                    Pilih Akun Demo (Development):
                                </p>
                                <div className="grid grid-cols-5 gap-1.5">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fillDemo('ADMIN001', '123456')}
                                        className="text-[11px] px-1 py-1 h-7 border-border text-foreground hover:bg-muted"
                                        title="SYSTEM_ADMIN"
                                    >
                                        ADMIN
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fillDemo('SM001', '123456')}
                                        className="text-[11px] px-1 py-1 h-7 border-border text-foreground hover:bg-muted"
                                        title="Store Manager"
                                    >
                                        SM
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fillDemo('SAC001', '123456')}
                                        className="text-[11px] px-1 py-1 h-7 border-border text-primary font-bold hover:bg-muted"
                                        title="Staff Admin Clerk"
                                    >
                                        SAC
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fillDemo('SS001', '123456')}
                                        className="text-[11px] px-1 py-1 h-7 border-border text-foreground hover:bg-muted"
                                        title="Store Supervisor"
                                    >
                                        SS
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fillDemo('SOA001', '123456')}
                                        className="text-[11px] px-1 py-1 h-7 border-border text-foreground hover:bg-muted"
                                        title="Store Associate"
                                    >
                                        SOA
                                    </Button>
                                </div>
                            </div>
                        </CardFooter>
                    </form>
                </Card>

                {/* Footer security note */}
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Multi-Store Scoped Data Protection & Session Encryption</span>
                </div>
            </div>
        </div>
    );
}

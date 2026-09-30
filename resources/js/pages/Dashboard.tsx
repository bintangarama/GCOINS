import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    LayoutDashboard,
    Coins,
    Receipt,
    Building2,
    CalendarCheck,
    ArrowUpRight,
    ShieldCheck,
    PlusCircle,
    UserCheck,
    Users,
    CheckCircle2,
    Clock,
    Activity,
    FileText,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PageProps } from '@/types/auth';
import { formatMoney } from '@/lib/money';
import usersRoutes from '@/routes/admin/users';

interface DashboardData {
    imprest_cents: number;
    pending_vouchers_count: number;
    pending_outflows_count: number;
    last_opname: {
        id: string;
        session_number: string;
        status: string;
        variance_status: string;
        date: string;
        date_formatted: string;
    } | null;
    recent_activity: {
        id: string;
        action: string;
        entity_name: string;
        entity_id: string;
        performer: string;
        performer_nik: string | null;
        created_at: string;
    }[];
}

export default function Dashboard({ dashboardData }: { dashboardData?: DashboardData }) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    const data = dashboardData ?? {
        imprest_cents: 0,
        pending_vouchers_count: 0,
        pending_outflows_count: 0,
        last_opname: null,
        recent_activity: [],
    };

    const formatRelativeTime = (dateStr: string) => {
        try {
            const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
            if (diff < 60) return 'Baru saja';
            if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
            if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
            return `${Math.floor(diff / 86400)} hari lalu`;
        } catch {
            return dateStr;
        }
    };

    const getActivityIcon = (entityName: string) => {
        const name = entityName.toUpperCase();
        if (name.includes('VOUCHER')) return <Receipt className="w-3.5 h-3.5 text-blue-600" />;
        if (name.includes('OPNAME') || name.includes('SESSION')) return <Coins className="w-3.5 h-3.5 text-emerald-600" />;
        if (name.includes('BRI')) return <Building2 className="w-3.5 h-3.5 text-amber-600" />;
        if (name.includes('USER')) return <Users className="w-3.5 h-3.5 text-purple-600" />;
        return <Activity className="w-3.5 h-3.5 text-slate-500" />;
    };

    return (
        <AppLayout title="Dashboard">
            <div className="space-y-6">
                {/* Welcome PageHeader */}
                <PageHeader
                    title={`Selamat Datang, ${user?.name}`}
                    description={
                        user?.store
                            ? `Toko Gramedia ${user.store.name} (Kode: ${user.store.code})`
                            : 'Akses Administrator Sistem Pusat (Global Multi-Store)'
                    }
                    icon={LayoutDashboard}
                >
                    <StatusBadge status={user?.role || 'SOA'} />
                    <Badge
                        variant="outline"
                        className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-xs px-3 py-1 font-mono"
                    >
                        <CheckCircle2 className="size-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                        Sistem Terisolasi & Aktif
                    </Badge>
                </PageHeader>

                {/* 4 Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Kas Kecil Fund */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Plafon Kas Kecil
                            </CardTitle>
                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                <Coins className="w-4 h-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                                {formatMoney(data.imprest_cents)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Imprest Fund (Tetap)</p>
                        </CardContent>
                    </Card>

                    {/* Card 2: Pending Vouchers */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Bon Kas Kecil
                            </CardTitle>
                            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                <Receipt className="w-4 h-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                                {data.pending_vouchers_count}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {data.pending_vouchers_count > 0
                                    ? 'Voucher Menunggu Verifikasi'
                                    : 'Tidak ada antrean'}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Card 3: BRI Mutasi Outflow */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Outflow BRI
                            </CardTitle>
                            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                <Building2 className="w-4 h-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                                {data.pending_outflows_count}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {data.pending_outflows_count > 0
                                    ? 'Pending Dual-Control Review'
                                    : 'Tidak ada antrean'}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Card 4: Status Cash Opname */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Sesi Opname
                            </CardTitle>
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <CalendarCheck className="w-4 h-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {data.last_opname ? (
                                <>
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <StatusBadge status={data.last_opname.status} />
                                        {data.last_opname.variance_status && (
                                            <StatusBadge status={data.last_opname.variance_status} />
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Terakhir: {data.last_opname.date_formatted}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="text-sm font-bold text-foreground">Belum Ada Sesi</div>
                                    <p className="text-xs text-muted-foreground mt-1">Sesi Harian Kasir (SAC)</p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Role-Based Quick Actions, Activity Feed & Integrity System Banner */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Quick Actions Panel */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-bold text-foreground">Aksi Cepat</CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">
                                Pintasan sesuai wewenang peran ({user?.role})
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-3">
                                {['SOA', 'SS', 'SAC'].includes(user?.role || '') && (
                                    <Link
                                        href="/vouchers/create"
                                        className="p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-muted/40 transition-all flex items-start gap-3 group"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            <PlusCircle className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                                                Ajukan Bon Kas Kecil
                                            </h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Upload nota belanja operasional
                                            </p>
                                        </div>
                                    </Link>
                                )}

                                {['SAC', 'SM'].includes(user?.role || '') && (
                                    <Link
                                        href="/opname/active"
                                        className="p-4 rounded-xl border border-border hover:border-emerald-500/50 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all flex items-start gap-3 group"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                            <Coins className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                Buka Cash Opname
                                            </h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Input 11 pecahan uang fisik harian
                                            </p>
                                        </div>
                                    </Link>
                                )}

                                {['SS', 'SAC', 'SM'].includes(user?.role || '') && (
                                    <Link
                                        href="/bri-funds"
                                        className="p-4 rounded-xl border border-border hover:border-indigo-500/50 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all flex items-start gap-3 group"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                Mutasi Bank BRI
                                            </h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Pencatatan alokasi B2B, Event, Aksel
                                            </p>
                                        </div>
                                    </Link>
                                )}

                                {['SAC', 'SM', 'SYSTEM_ADMIN'].includes(user?.role || '') && (
                                    <Link
                                        href={usersRoutes.index.url()}
                                        className="p-4 rounded-xl border border-border hover:border-slate-400 dark:hover:border-slate-600 hover:bg-muted/40 transition-all flex items-start gap-3 group"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center shrink-0 group-hover:bg-slate-800 dark:group-hover:bg-slate-700 group-hover:text-white transition-colors">
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-foreground">
                                                Kelola Pengguna Toko
                                            </h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Daftar akun staf, reset PIN, status
                                            </p>
                                        </div>
                                    </Link>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Activity Feed */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-primary" />
                                    <CardTitle className="text-base font-bold text-foreground">Aktivitas Terbaru</CardTitle>
                                </div>
                                <Link
                                    href="/admin/audit-logs"
                                    className="text-xs font-medium text-primary hover:underline"
                                >
                                    Lihat Semua
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {data.recent_activity.length === 0 ? (
                                <div className="py-6 text-center">
                                    <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                                    <p className="text-xs text-muted-foreground font-medium">Belum ada aktivitas tercatat</p>
                                </div>
                            ) : (
                                <div className="space-y-0 -mt-1">
                                    {data.recent_activity.map((item) => (
                                        <div key={item.id} className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
                                            <div className="p-1.5 rounded-md bg-muted/60 shrink-0 mt-0.5">
                                                {getActivityIcon(item.entity_name)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-medium text-foreground leading-snug">
                                                    <span className="font-semibold">{item.performer}</span>
                                                    {' — '}
                                                    <span className="text-muted-foreground">{item.action}</span>
                                                </p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">
                                                    {item.entity_name}
                                                </p>
                                                <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground/80">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{formatRelativeTime(item.created_at)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* System Invariant Checklist */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                                <CardTitle className="text-base font-bold text-foreground">Integritas Keuangan</CardTitle>
                            </div>
                            <CardDescription className="text-xs text-muted-foreground">
                                12 Aturan Bisnis G-COINS aktif di level Action/DB
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs">
                            <div className="flex items-center gap-2 text-foreground font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <span>Zero Floating Point (Integer Cents)</span>
                            </div>
                            <div className="flex items-center gap-2 text-foreground font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <span>Formula 3 Kantong (Fisik + Bon + BRI)</span>
                            </div>
                            <div className="flex items-center gap-2 text-foreground font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <span>Rantai Selisih Berkelanjutan (Carry-Forward)</span>
                            </div>
                            <div className="flex items-center gap-2 text-foreground font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <span>Anti Self-Approval & Dual Control BRI</span>
                            </div>
                            <div className="flex items-center gap-2 text-foreground font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <span>Isolasi Data Toko (Multi-Tenancy StoreScope)</span>
                            </div>
                            <div className="flex items-center gap-2 text-foreground font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <span>Audit Log Lengkap untuk Tiap Perubahan</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}

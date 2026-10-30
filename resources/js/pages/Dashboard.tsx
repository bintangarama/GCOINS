import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    LayoutDashboard,
    Coins,
    Receipt,
    Building2,
    CalendarCheck,
    ArrowUpRight,
    PlusCircle,
    Users,
    CheckCircle2,
    Clock,
    Activity,
    FileText,
    AlertTriangle,
    AlertCircle,
    ArrowRight,
    Wallet,
    TrendingUp,
    XCircle,
    Sparkles,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PageProps } from '@/types/auth';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import usersRoutes from '@/routes/admin/users';

interface CategoryBreakdownItem {
    code: string;
    category: string;
    amount_cents: number;
    percentage: number;
}

interface MyRecentVoucher {
    id: string;
    voucher_number: string;
    purpose: string;
    amount_cents: number;
    status: string;
    rejection_reason: string | null;
    created_at: string;
}

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
    disbursed_pending_settlement_cents: number;
    estimated_physical_cash_cents: number;
    burn_rate_percentage: number;
    today_opname: {
        id: string;
        session_number: string;
        status: string;
        variance_status: string;
        current_variance_cents: number;
        opname_type: string;
    } | null;
    aging_vouchers_count: number;
    aging_vouchers_amount_cents: number;
    category_breakdown: CategoryBreakdownItem[];
    my_recent_vouchers: MyRecentVoucher[];
    my_vouchers_summary: {
        approved_ready: number;
        in_review: number;
        rejected: number;
    };
}

export default function Dashboard({ dashboardData }: { dashboardData?: DashboardData }) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    const data: DashboardData = dashboardData ?? {
        imprest_cents: 0,
        pending_vouchers_count: 0,
        pending_outflows_count: 0,
        last_opname: null,
        recent_activity: [],
        disbursed_pending_settlement_cents: 0,
        estimated_physical_cash_cents: 0,
        burn_rate_percentage: 0,
        today_opname: null,
        aging_vouchers_count: 0,
        aging_vouchers_amount_cents: 0,
        category_breakdown: [],
        my_recent_vouchers: [],
        my_vouchers_summary: {
            approved_ready: 0,
            in_review: 0,
            rejected: 0,
        },
    };

    const isSOA = user?.role === 'SOA';
    const isSAC = user?.role === 'SAC';
    const isSS = user?.role === 'SS';
    const isSM = user?.role === 'SM';
    const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';

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

    // Color palette for category breakdown
    const categoryColors = [
        'bg-blue-500',
        'bg-emerald-500',
        'bg-purple-500',
        'bg-amber-500',
        'bg-rose-500',
    ];

    return (
        <AppLayout title="Dashboard">
            <Head title="Dashboard" />

            <div className="space-y-6">
                {/* Welcome PageHeader */}
                <PageHeader
                    title={`Selamat Datang, ${user?.name}`}
                    description={
                        user?.store
                            ? user.store.name.replace(/^Toko\s+/i, '')
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

                {/* ==================================================================================== */}
                {/* 1. OPERATIONAL NOTIFICATIONS (SAC, SS, SM, SYSTEM_ADMIN)                             */}
                {/* ==================================================================================== */}
                {!isSOA && (
                    <div className="space-y-3">
                        {/* A. Peringatan Bon Kas Kecil Menua (> 3 Hari Belum Settlement) */}
                        {data.aging_vouchers_count > 0 && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/30 transition-all">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 shrink-0 mt-0.5">
                                            <AlertTriangle className="size-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                                                <span>{data.aging_vouchers_count} Bon Kas Kecil Menua (&gt; 3 Hari Belum Settlement)</span>
                                                <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[10px]">
                                                    Dana Gantung: {formatMoney(data.aging_vouchers_amount_cents)}
                                                </Badge>
                                            </h4>
                                            <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-1">
                                                Terdapat dana kasir yang belum diselesaikan ke form KKCL. Segera tagih nota fisik asli dari staf pemohon agar kas kecil dapat direimburse.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                        <Link href={isSAC ? '/vouchers/settlement' : '/vouchers'}>
                                            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white shadow-xs text-xs h-8">
                                                {isSAC ? 'Proses Settlement KKCL' : 'Lihat Bon Gantung'}
                                                <ArrowRight className="size-3.5 ml-1.5" />
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* B. Status Kesiapan Opname Harian Toko */}
                        {data.today_opname ? (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 shrink-0 mt-0.5">
                                            <CalendarCheck className="size-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                                                    Sesi Cash Opname Hari Ini: {data.today_opname.session_number}
                                                </h4>
                                                <StatusBadge status={data.today_opname.status} />
                                                <StatusBadge status={data.today_opname.variance_status} />
                                            </div>
                                            <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-1">
                                                {data.today_opname.status === 'APPROVED'
                                                    ? 'Sesi opname hari ini telah disetujui (sign-off) Store Manager dan dikunci permanen.'
                                                    : data.today_opname.status === 'VERIFIED_SS'
                                                      ? 'Telah diverifikasi Supervisor (SS). Menunggu sign-off akhir dari Store Manager (SM).'
                                                      : data.today_opname.status === 'SUBMITTED'
                                                        ? 'Telah disubmit oleh Kasir (SAC). Menunggu verifikasi fisik oleh Supervisor (SS).'
                                                        : 'Sesi sedang dalam proses input penghitungan fisik 11 pecahan uang.'}
                                            </p>
                                        </div>
                                    </div>
                                    <Link href="/opname/active" className="self-end sm:self-center shrink-0">
                                        <Button size="sm" variant="outline" className="border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-xs h-8">
                                            Buka Sesi Opname
                                            <ArrowRight className="size-3.5 ml-1.5" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-slate-200 bg-card p-4 dark:border-border transition-all">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-muted text-muted-foreground shrink-0 mt-0.5">
                                            <Clock className="size-5 text-amber-500" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-semibold text-foreground">
                                                    Sesi Cash Opname Hari Ini Belum Dibuka
                                                </h4>
                                                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/40">
                                                    Menunggu Input Kasir
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {isSAC
                                                    ? 'Wajib menghitung fisik 11 pecahan uang di brankas kas kecil hari ini dan buka sesi sebelum tutup toko.'
                                                    : 'Menunggu Kasir (SAC) membuka sesi perhitungan fisik brankas untuk disaksikan & diverifikasi.'}
                                            </p>
                                        </div>
                                    </div>
                                    <Link href="/opname/active" className="self-end sm:self-center shrink-0">
                                        <Button
                                            size="sm"
                                            className={cn(
                                                'text-xs h-8',
                                                isSAC
                                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                    : 'variant-outline'
                                            )}
                                        >
                                            {isSAC ? 'Buka Cash Opname Sekarang' : 'Periksa Jadwal Opname'}
                                            <ArrowRight className="size-3.5 ml-1.5" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ==================================================================================== */}
                {/* 2. STATS KPI CARDS                                                                   */}
                {/* ==================================================================================== */}
                {isSOA ? (
                    /* Specific KPI Cards for SOA (Staff Pemohon) */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* SOA Card 1: Buat Bon Baru */}
                        <Link
                            href="/vouchers/create"
                            className="group block focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
                        >
                            <Card className="h-full border-primary/30 transition-all duration-200 hover:border-primary hover:shadow-md hover:-translate-y-0.5 cursor-pointer bg-primary/5">
                                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                    <CardTitle className="text-xs font-semibold text-primary uppercase tracking-wider">
                                        Ajukan Bon Kas Kecil
                                    </CardTitle>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                                            <PlusCircle className="w-4 h-4" />
                                        </div>
                                        <ArrowUpRight className="size-3.5 text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xl sm:text-2xl font-bold text-foreground">
                                        + Form Baru
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Upload nota &amp; struk belanja operasional
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>

                        {/* SOA Card 2: Siap Ambil Uang di Kasir */}
                        <Link
                            href="/vouchers"
                            className="group block focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
                        >
                            <Card className="h-full transition-all duration-200 hover:border-emerald-500/50 hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
                                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-emerald-600 transition-colors">
                                        Siap Diambil di Kasir
                                    </CardTitle>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                            <Coins className="w-4 h-4" />
                                        </div>
                                        <ArrowUpRight className="size-3.5 text-muted-foreground/40 group-hover:text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                        {data.my_vouchers_summary.approved_ready}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Bon disetujui, ambil uang tunai di SAC
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>

                        {/* SOA Card 3: Menunggu Review SS */}
                        <Link
                            href="/vouchers"
                            className="group block focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
                        >
                            <Card className="h-full transition-all duration-200 hover:border-blue-500/50 hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
                                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-blue-600 transition-colors">
                                        Menunggu Review SS
                                    </CardTitle>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                            <Clock className="w-4 h-4" />
                                        </div>
                                        <ArrowUpRight className="size-3.5 text-muted-foreground/40 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                                        {data.my_vouchers_summary.in_review}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Dalam proses verifikasi supervisor
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>

                        {/* SOA Card 4: Ditolak */}
                        <Link
                            href="/vouchers"
                            className="group block focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
                        >
                            <Card className="h-full transition-all duration-200 hover:border-red-500/50 hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
                                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-red-600 transition-colors">
                                        Perlu Revisi / Ditolak
                                    </CardTitle>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
                                            <XCircle className="w-4 h-4" />
                                        </div>
                                        <ArrowUpRight className="size-3.5 text-muted-foreground/40 group-hover:text-red-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xl sm:text-2xl font-bold font-mono text-red-600 dark:text-red-400">
                                        {data.my_vouchers_summary.rejected}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {data.my_vouchers_summary.rejected > 0 ? 'Periksa alasan penolakan di bawah' : 'Semua pengajuan lancar'}
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    </div>
                ) : (
                    /* Operational KPI Cards for SAC, SS, SM, SYSTEM_ADMIN */
                    <div
                        className={cn(
                            'grid grid-cols-1 sm:grid-cols-2 gap-4',
                            isSystemAdmin ? 'lg:grid-cols-3' : 'lg:grid-cols-4'
                        )}
                    >
                        {/* Card 1: Estimasi Kas Fisik & Plafon Kas Kecil */}
                        <Link
                            href={isSM ? '/admin/store-settings' : isSAC ? '/vouchers/settlement' : '/vouchers'}
                            className="group block focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
                        >
                            <Card className="h-full transition-all duration-200 hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
                                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-primary transition-colors">
                                        Sisa Kas Fisik Brankas
                                    </CardTitle>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                            <Wallet className="w-4 h-4" />
                                        </div>
                                        <ArrowUpRight className="size-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                                        {formatMoney(data.estimated_physical_cash_cents)}
                                    </div>
                                    <div className="mt-2 space-y-1">
                                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                            <span>Plafon: {formatMoney(data.imprest_cents)}</span>
                                            <span className={cn(
                                                'font-semibold',
                                                data.burn_rate_percentage >= 80 ? 'text-red-600' : data.burn_rate_percentage >= 50 ? 'text-amber-600' : 'text-emerald-600'
                                            )}>
                                                {data.burn_rate_percentage}% terpakai
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                            <div
                                                className={cn(
                                                    'h-full transition-all duration-300',
                                                    data.burn_rate_percentage >= 80
                                                        ? 'bg-red-500'
                                                        : data.burn_rate_percentage >= 50
                                                          ? 'bg-amber-500'
                                                          : 'bg-emerald-500'
                                                )}
                                                style={{ width: `${data.burn_rate_percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>

                        {/* Card 2: Bon Kas Kecil & Gantung */}
                        <Link
                            href={['SS', 'SM', 'SAC'].includes(user?.role || '') ? '/vouchers/pending' : '/vouchers'}
                            className="group block focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
                        >
                            <Card className="h-full transition-all duration-200 hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
                                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-primary transition-colors">
                                        Bon Belum Settlement
                                    </CardTitle>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                            <Receipt className="w-4 h-4" />
                                        </div>
                                        <ArrowUpRight className="size-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                                        {formatMoney(data.disbursed_pending_settlement_cents)}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                                        <span className="font-semibold text-purple-600">{data.pending_vouchers_count}</span>
                                        <span>voucher butuh persetujuan</span>
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>

                        {/* Card 3: Outflow BRI (Hidden for SYSTEM_ADMIN) */}
                        {!isSystemAdmin && (
                            <Link
                                href={['SS', 'SM'].includes(user?.role || '') ? '/bri-funds/pending' : '/bri-funds'}
                                className="group block focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
                            >
                                <Card className="h-full transition-all duration-200 hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-primary transition-colors">
                                            Outflow BRI
                                        </CardTitle>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                                <Building2 className="w-4 h-4" />
                                            </div>
                                            <ArrowUpRight className="size-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                                            {data.pending_outflows_count}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {data.pending_outflows_count > 0
                                                ? 'Pending dual-control review (SS)'
                                                : 'Tidak ada antrean'}
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>
                        )}

                        {/* Card 4: Status Cash Opname */}
                        <Link
                            href="/opname/active"
                            className="group block focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
                        >
                            <Card className="h-full transition-all duration-200 hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
                                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-primary transition-colors">
                                        Sesi Opname Terakhir
                                    </CardTitle>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                            <Coins className="w-4 h-4" />
                                        </div>
                                        <ArrowUpRight className="size-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {data.last_opname ? (
                                        <>
                                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                                <StatusBadge status={data.last_opname.status} />
                                                {data.last_opname.variance_status && (
                                                    <StatusBadge status={data.last_opname.variance_status} />
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {data.last_opname.session_number} ({data.last_opname.date_formatted})
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="text-sm font-bold text-foreground">Belum Ada Sesi</div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {isSAC ? 'Buka sesi kasir (SAC)' : 'Sesi harian toko'}
                                            </p>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>
                    </div>
                )}

                {/* ==================================================================================== */}
                {/* 3. SECONDARY OPERATIONAL WIDGETS ROW                                                 */}
                {/* ==================================================================================== */}
                {isSOA ? (
                    /* Specific Section for SOA: Riwayat Pengajuan Saya & Panduan */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left: 4 Recent Vouchers by Current Staff */}
                        <div className="lg:col-span-2">
                            <Card className="h-full">
                                <CardHeader className="flex flex-row items-center justify-between pb-3">
                                    <div>
                                        <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                                            <Receipt className="size-4 text-primary" />
                                            <span>Pengajuan Bon Terakhir Saya</span>
                                        </CardTitle>
                                        <CardDescription className="text-xs text-muted-foreground mt-0.5">
                                            Pantau status persetujuan &amp; instruksi pencairan uang tunai
                                        </CardDescription>
                                    </div>
                                    <Link href="/vouchers">
                                        <Button variant="ghost" size="sm" className="text-xs h-8 text-primary">
                                            Lihat Semua Bon
                                            <ArrowRight className="size-3.5 ml-1" />
                                        </Button>
                                    </Link>
                                </CardHeader>
                                <CardContent>
                                    {data.my_recent_vouchers.length === 0 ? (
                                        <div className="py-10 text-center space-y-3">
                                            <FileText className="size-10 mx-auto text-muted-foreground/30" />
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">Belum Ada Pengajuan Bon</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Anda belum mengajukan pengeluaran kas kecil. Klik tombol di bawah untuk membuat bon.
                                                </p>
                                            </div>
                                            <Link href="/vouchers/create">
                                                <Button size="sm" className="text-xs mt-2">
                                                    <PlusCircle className="size-3.5 mr-1.5" />
                                                    Buat Pengajuan Bon
                                                </Button>
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-border">
                                            {data.my_recent_vouchers.map((v) => (
                                                <div key={v.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-mono text-xs font-bold text-foreground">
                                                                    {v.voucher_number}
                                                                </span>
                                                                <StatusBadge status={v.status} />
                                                            </div>
                                                            <p className="text-sm text-foreground mt-1 line-clamp-1 font-medium">
                                                                {v.purpose}
                                                            </p>
                                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                                Diajukan pada {v.created_at}
                                                            </p>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <div className="font-mono text-sm font-bold text-foreground">
                                                                {formatMoney(v.amount_cents)}
                                                            </div>
                                                            {['APPROVED', 'APPROVED_SS'].includes(v.status) && (
                                                                <span className="text-[10px] font-medium text-emerald-600 block mt-0.5">
                                                                    Siap Ambil di Kasir
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Alert if rejected so staff immediately sees why */}
                                                    {v.status === 'REJECTED' && v.rejection_reason && (
                                                        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-2.5 text-xs text-red-800 dark:text-red-300 flex items-start gap-2">
                                                            <AlertCircle className="size-4 text-red-600 shrink-0 mt-0.5" />
                                                            <div>
                                                                <span className="font-semibold">Alasan Penolakan: </span>
                                                                <span>{v.rejection_reason}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right: Panduan Staf Pemohon */}
                        <div>
                            <Card className="h-full">
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="size-4 text-amber-500" />
                                        <CardTitle className="text-base font-bold text-foreground">
                                            Alur Pengajuan Bon
                                        </CardTitle>
                                    </div>
                                    <CardDescription className="text-xs text-muted-foreground">
                                        Langkah operasional klaim kas kecil toko
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3.5 text-xs">
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                                            1
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground">Buat Form Pengajuan</p>
                                            <p className="text-muted-foreground text-[11px] mt-0.5">
                                                Isi nominal, keperluan, dan upload foto nota/struk belanja yang jelas.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0">
                                            2
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground">Verifikasi Supervisor (SS)</p>
                                            <p className="text-muted-foreground text-[11px] mt-0.5">
                                                Supervisor memeriksa kesesuaian anggaran operasional toko.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                                            3
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground">Ambil Uang di Kasir SAC</p>
                                            <p className="text-muted-foreground text-[11px] mt-0.5">
                                                Setelah disetujui, sebutkan nomor bon ke kasir utama (SAC) untuk pencairan fisik.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                                            4
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground">Serahkan Struk Asli</p>
                                            <p className="text-muted-foreground text-[11px] mt-0.5">
                                                Serahkan fisik nota belanja asli ke kasir untuk proses settlement KKCL.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                ) : (
                    /* Operational Dashboard: Likuiditas & Komposisi Kategori (SAC, SS, SM, SYSTEM_ADMIN) */
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left: Likuiditas Kas Kecil & Burn Rate Monitor */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Wallet className="size-4 text-primary" />
                                        <CardTitle className="text-base font-bold text-foreground">
                                            Likuiditas Kas Kecil &amp; Burn Rate
                                        </CardTitle>
                                    </div>
                                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                                        Rasio pemakaian plafon sebelum proses settlement KKCL
                                    </CardDescription>
                                </div>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        'text-xs font-medium px-2.5 py-0.5',
                                        data.burn_rate_percentage >= 80
                                            ? 'border-red-300 bg-red-50 text-red-700 dark:bg-red-950/40'
                                            : data.burn_rate_percentage >= 50
                                              ? 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40'
                                              : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40'
                                    )}
                                >
                                    {data.burn_rate_percentage >= 80
                                        ? 'Kas Kritis'
                                        : data.burn_rate_percentage >= 50
                                          ? 'Waspada'
                                          : 'Likuiditas Sehat'}
                                </Badge>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Visual Burn Rate Bar */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-foreground">
                                            Pemakaian Dana: {data.burn_rate_percentage}%
                                        </span>
                                        <span className="text-muted-foreground">
                                            Plafon {formatMoney(data.imprest_cents)}
                                        </span>
                                    </div>
                                    <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex">
                                        <div
                                            className={cn(
                                                'h-full transition-all duration-300',
                                                data.burn_rate_percentage >= 80
                                                    ? 'bg-red-500'
                                                    : data.burn_rate_percentage >= 50
                                                      ? 'bg-amber-500'
                                                      : 'bg-emerald-500'
                                            )}
                                            style={{ width: `${Math.min(100, data.burn_rate_percentage)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Metric Breakdown */}
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    <div className="p-3 rounded-xl bg-muted/40 border border-border">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span>Sisa Uang Fisik</span>
                                        </div>
                                        <div className="text-base sm:text-lg font-bold font-mono text-foreground mt-1">
                                            {formatMoney(data.estimated_physical_cash_cents)}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            Harus ada di brankas
                                        </p>
                                    </div>

                                    <div className="p-3 rounded-xl bg-muted/40 border border-border">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                                            <span>Bon Gantung (Disbursed)</span>
                                        </div>
                                        <div className="text-base sm:text-lg font-bold font-mono text-foreground mt-1">
                                            {formatMoney(data.disbursed_pending_settlement_cents)}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            Menunggu settlement KKCL
                                        </p>
                                    </div>
                                </div>

                                {/* Quick action button */}
                                <div className="flex items-center justify-between pt-1">
                                    <p className="text-xs text-muted-foreground">
                                        {isSAC
                                            ? 'Lakukan settlement saat bon terpakai mencapai ambang batas.'
                                            : 'Pantau pergantian fisik uang kas kecil secara berkala.'}
                                    </p>
                                    {isSAC && (
                                        <Link href="/vouchers/settlement">
                                            <Button size="sm" variant="outline" className="text-xs h-8">
                                                Settlement KKCL
                                                <ArrowRight className="size-3.5 ml-1" />
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Right: Komposisi Pengeluaran Kas per Kategori (Bulan Ini) */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="size-4 text-primary" />
                                        <CardTitle className="text-base font-bold text-foreground">
                                            Pengeluaran per Kategori
                                        </CardTitle>
                                    </div>
                                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                                        Komposisi pengeluaran kas kecil bulan berjalan
                                    </CardDescription>
                                </div>
                                <Badge variant="secondary" className="text-[10px] font-mono">
                                    Bulan Ini
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                {data.category_breakdown.length === 0 ? (
                                    <div className="py-8 text-center space-y-2">
                                        <Receipt className="size-8 mx-auto text-muted-foreground/30" />
                                        <p className="text-xs text-muted-foreground font-medium">
                                            Belum ada pengeluaran kas kecil yang dicairkan bulan ini
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3.5">
                                        {data.category_breakdown.map((item, idx) => (
                                            <div key={item.code || item.category} className="space-y-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-medium text-foreground truncate max-w-[200px]">
                                                        {item.category}
                                                    </span>
                                                    <div className="flex items-center gap-2 font-mono shrink-0">
                                                        <span className="font-semibold text-foreground">
                                                            {formatMoney(item.amount_cents)}
                                                        </span>
                                                        <span className="text-muted-foreground text-[11px] w-9 text-right">
                                                            {item.percentage}%
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            'h-full transition-all duration-300',
                                                            categoryColors[idx % categoryColors.length]
                                                        )}
                                                        style={{ width: `${item.percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* ==================================================================================== */}
                {/* ==================================================================================== */}
                {/* 4. ACTIONS & RECENT ACTIVITY                                                         */}
                {/* ==================================================================================== */}
                <div className={cn('grid grid-cols-1 gap-6', !isSOA && 'lg:grid-cols-2')}>
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

                                {['SS', 'SM'].includes(user?.role || '') && (
                                    <Link
                                        href="/vouchers/pending"
                                        className="p-4 rounded-xl border border-border hover:border-purple-500/50 hover:bg-purple-50/20 dark:hover:bg-purple-950/20 transition-all flex items-start gap-3 group"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                            <Receipt className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                                Antrean Approval Bon
                                            </h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Review &amp; setujui pengajuan voucher staf
                                            </p>
                                        </div>
                                    </Link>
                                )}

                                {user?.role === 'SAC' && (
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

                                {user?.role === 'SS' && (
                                    <Link
                                        href="/opname/active"
                                        className="p-4 rounded-xl border border-border hover:border-emerald-500/50 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all flex items-start gap-3 group"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                            <Coins className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                Verifikasi Sesi Opname
                                            </h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Saksikan hitung fisik brankas (SS)
                                            </p>
                                        </div>
                                    </Link>
                                )}

                                {user?.role === 'SM' && (
                                    <Link
                                        href="/opname/active"
                                        className="p-4 rounded-xl border border-border hover:border-emerald-500/50 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all flex items-start gap-3 group"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                            <Coins className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                Sign-Off Cash Opname
                                            </h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Persetujuan akhir &amp; kunci sesi toko (SM)
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
                    {!isSOA && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-primary" />
                                        <CardTitle className="text-base font-bold text-foreground">Aktivitas Terbaru</CardTitle>
                                    </div>
                                    {['SAC', 'SM', 'SYSTEM_ADMIN'].includes(user?.role || '') && (
                                        <Link
                                            href="/admin/audit-logs"
                                            className="text-xs font-medium text-primary hover:underline"
                                        >
                                            Lihat Semua
                                        </Link>
                                    )}
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
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

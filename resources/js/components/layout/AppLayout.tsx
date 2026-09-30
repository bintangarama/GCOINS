import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    LayoutDashboard,
    Receipt,
    Coins,
    Building2,
    Users,
    Settings,
    FileText,
    LogOut,
    Menu,
    ChevronDown,
    Store as StoreIcon,
    Shield,
    Layers,
    History,
    PlusCircle,
    ArrowUpDown,
    KeyRound,
    ShieldCheck,
} from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { resolveDefaultBreadcrumbs } from '@/lib/breadcrumbs';
import { PageProps, Role } from '@/types/auth';
import type { BreadcrumbItem } from '@/types/navigation';

import { dashboard, logout } from '@/routes';
import usersRoutes from '@/routes/admin/users';

interface AppLayoutProps {
    title?: string;
    breadcrumbs?: BreadcrumbItem[];
    children: React.ReactNode;
}

export function AppLayout({ title, breadcrumbs, children }: AppLayoutProps) {
    const { props, url } = usePage<PageProps>();
    const { auth, flash } = props;
    const user = auth.user;
    const [mobileOpen, setMobileOpen] = useState(false);

    // Resolve breadcrumbs: prioritizes explicit prop (even if []), otherwise auto-resolves from URL & title
    const resolvedBreadcrumbs = breadcrumbs !== undefined ? breadcrumbs : resolveDefaultBreadcrumbs(url, title);

    const handleLogout = () => {
        router.post(logout.url());
    };

    const hasRole = (...roles: Role[]) => {
        if (!user) return false;
        return roles.includes(user.role);
    };

    // Navigation items based on 10-ui-ux-specification.md
    const navSections = [
        {
            title: 'Menu Utama',
            items: [
                {
                    label: 'Dashboard',
                    href: dashboard.url(),
                    icon: LayoutDashboard,
                    active: url === dashboard.url(),
                    show: true,
                },
            ],
        },
        {
            title: 'Bon Kas Kecil',
            items: [
                {
                    label: 'Daftar Bon',
                    href: '/vouchers',
                    icon: Receipt,
                    active: url === '/vouchers' || (url.startsWith('/vouchers') && !['/vouchers/create', '/vouchers/pending', '/vouchers/settlement'].includes(url)),
                    show: hasRole('SOA', 'SS', 'SAC', 'SM'),
                },
                {
                    label: 'Buat Pengajuan',
                    href: '/vouchers/create',
                    icon: FileText,
                    active: url === '/vouchers/create',
                    show: hasRole('SOA', 'SS', 'SAC'),
                },
                {
                    label: 'Antrean Approval',
                    href: '/vouchers/pending',
                    icon: Shield,
                    active: url === '/vouchers/pending',
                    show: hasRole('SS', 'SAC', 'SM'),
                },
                {
                    label: 'Penyelesaian (Settlement)',
                    href: '/vouchers/settlement',
                    icon: Layers,
                    active: url === '/vouchers/settlement',
                    show: hasRole('SAC', 'SYSTEM_ADMIN'),
                },
            ],
        },
        {
            title: 'Cash Opname',
            items: [
                {
                    label: 'Sesi Aktif',
                    href: '/opname/active',
                    icon: Coins,
                    active: url.startsWith('/opname/active'),
                    show: hasRole('SAC', 'SS', 'SM'),
                },
                {
                    label: 'Riwayat Sesi',
                    href: '/opname',
                    icon: FileText,
                    active: url === '/opname',
                    show: hasRole('SOA', 'SS', 'SAC', 'SM', 'SYSTEM_ADMIN'),
                },
            ],
        },
        {
            title: 'Mutasi BRI',
            items: [
                {
                    label: 'Overview Saldo',
                    href: '/bri-funds',
                    icon: Building2,
                    active: url === '/bri-funds',
                    show: hasRole('SS', 'SAC', 'SM'),
                },
                {
                    label: 'Riwayat Posting',
                    href: '/bri-funds/postings',
                    icon: History,
                    active: url.startsWith('/bri-funds/postings'),
                    show: hasRole('SS', 'SAC', 'SM'),
                },
                {
                    label: 'Catat Mutasi',
                    href: '/bri-funds/create',
                    icon: PlusCircle,
                    active: url === '/bri-funds/create',
                    show: hasRole('SAC', 'SS'),
                },
                {
                    label: 'Antrean Approval',
                    href: '/bri-funds/pending',
                    icon: Shield,
                    active: url === '/bri-funds/pending',
                    show: hasRole('SS', 'SM'),
                },
            ],
        },
        {
            title: 'Administrasi',
            items: [
                {
                    label: 'Manajemen User',
                    href: usersRoutes.index.url(),
                    icon: Users,
                    active: url.startsWith('/admin/users'),
                    show: hasRole('SAC', 'SM', 'SYSTEM_ADMIN'),
                },
                {
                    label: 'Pengaturan Toko',
                    href: '/admin/store-settings',
                    icon: Settings,
                    active: url.startsWith('/admin/store-settings'),
                    show: hasRole('SM', 'SYSTEM_ADMIN'),
                },
                {
                    label: 'Audit Log',
                    href: '/admin/audit-logs',
                    icon: ShieldCheck,
                    active: url.startsWith('/admin/audit-logs'),
                    show: hasRole('SAC', 'SM', 'SYSTEM_ADMIN'),
                },
                {
                    label: 'Import / Export',
                    href: '/admin/import-export',
                    icon: ArrowUpDown,
                    active: url.startsWith('/admin/import-export'),
                    show: hasRole('SAC', 'SM', 'SYSTEM_ADMIN'),
                },
            ],
        },
    ];

    const renderNavContent = () => (
        <div className="flex flex-col h-full bg-slate-900 text-slate-100">
            {/* Brand Logo & Title */}
            <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
                <div className="flex items-center justify-center size-10 rounded-lg bg-blue-600 font-bold text-white shadow-md shadow-blue-500/20">
                    GC
                </div>
                <div>
                    <h1 className="font-bold text-lg leading-tight tracking-tight text-white">G-COINS</h1>
                    <p className="text-xs text-slate-400">Cash Opname System</p>
                </div>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {navSections.map((section, idx) => {
                    const visibleItems = section.items.filter((item) => item.show);
                    if (visibleItems.length === 0) return null;

                    return (
                        <div key={idx} className="flex flex-col gap-1">
                            <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                {section.title}
                            </p>
                            {visibleItems.map((item, itemIdx) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={itemIdx}
                                        href={item.href}
                                        onClick={() => setMobileOpen(false)}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                            item.active
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                        }`}
                                    >
                                        <Icon className="size-4 shrink-0" />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    );
                })}
            </nav>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col lg:flex-row text-foreground">
            {title && <Head title={title} />}

            {/* Desktop Fixed Sidebar */}
            <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-800 bg-slate-900">
                <div className="fixed inset-y-0 w-64">{renderNavContent()}</div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Topbar */}
                <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-2xs transition-colors">
                    {/* Left: Mobile trigger & Store Context */}
                    <div className="flex items-center gap-3">
                        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="lg:hidden text-muted-foreground hover:text-foreground">
                                    <Menu className="size-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="p-0 w-72 bg-slate-900 border-r-slate-800 text-slate-100">
                                <SheetHeader className="sr-only">
                                    <SheetTitle>Navigation Menu</SheetTitle>
                                </SheetHeader>
                                {renderNavContent()}
                            </SheetContent>
                        </Sheet>

                        {/* Store Badge Display */}
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
                            <StoreIcon className="size-4 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span className="truncate max-w-[130px] sm:max-w-xs md:max-w-md">
                                {user?.store ? `${user.store.code} — ${user.store.name}` : 'Sistem Pusat (Global)'}
                            </span>
                        </div>
                    </div>

                    {/* Right: Notifications Dropdown & User Profile Dropdown */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        <NotificationDropdown />

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                                    <div className="size-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-semibold flex items-center justify-center text-xs border border-blue-200 dark:border-blue-800">
                                        {user?.name?.substring(0, 2).toUpperCase() || 'U'}
                                    </div>
                                    <div className="hidden sm:block text-left text-xs">
                                        <p className="font-semibold text-foreground leading-tight">{user?.name}</p>
                                        <p className="text-muted-foreground font-mono">{user?.role}</p>
                                    </div>
                                    <ChevronDown className="size-4 text-muted-foreground" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>
                                    <div>
                                        <p className="font-semibold text-sm">{user?.name}</p>
                                        <p className="text-xs text-muted-foreground font-mono">NIK: {user?.nik}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/profile" className="flex items-center cursor-pointer">
                                        <KeyRound className="size-4 mr-2 text-muted-foreground" />
                                        <span>Profil & Ubah PIN</span>
                                    </Link>
                                </DropdownMenuItem>
                                {hasRole('SM', 'SYSTEM_ADMIN') && (
                                    <DropdownMenuItem asChild>
                                        <Link href="/admin/store-settings" className="flex items-center cursor-pointer">
                                            <Settings className="size-4 mr-2 text-muted-foreground" />
                                            <span>Pengaturan Toko</span>
                                        </Link>
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer focus:bg-destructive/10 focus:text-destructive">
                                    <LogOut className="size-4 mr-2" />
                                    <span>Keluar (Logout)</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Consistent Breadcrumb Bar */}
                {resolvedBreadcrumbs && resolvedBreadcrumbs.length > 0 && (
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 lg:px-8 py-2.5 transition-colors">
                        <Breadcrumbs breadcrumbs={resolvedBreadcrumbs} />
                    </div>
                )}

                {/* Flash Messages (Only rendered when message exists) */}
                {(flash?.success || flash?.error) && (
                    <div className="px-4 sm:px-6 lg:px-8 pt-4">
                        {flash.success && (
                            <div className="mb-2 p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-medium flex items-center justify-between shadow-xs">
                                <span>{flash.success}</span>
                            </div>
                        )}
                        {flash.error && (
                            <div className="mb-2 p-3.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm font-medium flex items-center justify-between shadow-xs">
                                <span>{flash.error}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Page Content */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
            </div>
        </div>
    );
}

export default AppLayout;

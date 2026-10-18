import React, { useState, useEffect } from 'react';
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
    ChevronLeft,
    ChevronRight,
    Store as StoreIcon,
    Shield,
    Layers,
    History,
    PlusCircle,
    ArrowUpDown,
    KeyRound,
    ShieldCheck,
    Sun,
    Moon,
    Monitor,
    Tags,
    PanelLeftClose,
    PanelLeftOpen,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { resolveDefaultBreadcrumbs } from '@/lib/breadcrumbs';
import { useAppearance } from '@/hooks/use-appearance';
import { useFlashToast } from '@/hooks/use-flash-toast';
import { cn } from '@/lib/utils';
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
    useFlashToast();
    const { appearance, updateAppearance } = useAppearance();
    const { props, url } = usePage<PageProps>();
    const { auth, flash } = props;
    const user = auth.user;
    const [mobileOpen, setMobileOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('gcoins_sidebar_collapsed') === 'true';
        }
        return false;
    });

    const toggleSidebar = () => {
        setSidebarCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem('gcoins_sidebar_collapsed', String(next));
            return next;
        });
    };

    // Keyboard shortcut Ctrl+B / Cmd+B to toggle sidebar
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                toggleSidebar();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

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
                    active:
                        url.startsWith('/vouchers') &&
                        !url.startsWith('/vouchers/pending') &&
                        !url.startsWith('/vouchers/settlement') &&
                        !url.startsWith('/vouchers/settlements'),
                    show: hasRole('SOA', 'SS', 'SAC', 'SM'),
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
                    show: hasRole('SAC'),
                },
                {
                    label: 'Riwayat Rekap',
                    href: '/vouchers/settlements',
                    icon: FileText,
                    active: url.startsWith('/vouchers/settlements'),
                    show: hasRole('SAC', 'SM', 'SS', 'SYSTEM_ADMIN'),
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
                    show: hasRole('SS', 'SAC', 'SM', 'SYSTEM_ADMIN'),
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
                    active: url === '/bri-funds' || url === '/bri-funds/create',
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
                    label: 'Kategori Kas Kecil',
                    href: '/admin/categories',
                    icon: Tags,
                    active: url.startsWith('/admin/categories'),
                    show: hasRole('SAC', 'SM', 'SYSTEM_ADMIN'),
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

    const renderNavContent = (isCollapsed: boolean = false) => (
        <div className="flex flex-col h-full bg-slate-900 text-slate-100">
            {/* Brand Logo & Title */}
            <div
                className={cn(
                    'flex items-center border-b border-slate-800 transition-all duration-300',
                    isCollapsed ? 'justify-center px-2 py-3.5' : 'gap-3 px-6 py-4'
                )}
            >
                <div className="flex items-center justify-center size-9 rounded-lg bg-blue-600 font-bold text-white shadow-md shadow-blue-500/20 shrink-0">
                    GC
                </div>
                {!isCollapsed && (
                    <div className="min-w-0 flex-1 overflow-hidden animate-in fade-in duration-200">
                        <h1 className="font-bold text-base leading-tight tracking-tight text-white">G-COINS</h1>
                        <p
                            className="text-xs text-slate-400 truncate"
                            title={user?.store ? user.store.name : 'Cash Opname System'}
                        >
                            {user?.store ? user.store.name.replace(/^Toko\s+/i, '') : 'Cash Opname System'}
                        </p>
                    </div>
                )}
            </div>

            {/* Navigation links */}
            <nav
                className={cn(
                    'flex-1 overflow-y-auto py-4 flex flex-col gap-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
                    isCollapsed ? 'px-2' : 'px-4'
                )}
            >
                {navSections.map((section, idx) => {
                    const visibleItems = section.items.filter((item) => item.show);
                    if (visibleItems.length === 0) return null;

                    return (
                        <div key={idx} className="flex flex-col gap-1">
                            {!isCollapsed ? (
                                <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 truncate animate-in fade-in duration-150">
                                    {section.title}
                                </p>
                            ) : (
                                idx > 0 && <div className="my-1.5 border-t border-slate-800/80 mx-2" />
                            )}
                            {visibleItems.map((item, itemIdx) => {
                                const Icon = item.icon;
                                const linkElement = (
                                    <Link
                                        key={itemIdx}
                                        href={item.href}
                                        onClick={() => setMobileOpen(false)}
                                        className={cn(
                                            'flex items-center rounded-lg text-sm font-medium transition-colors',
                                            isCollapsed
                                                ? 'justify-center size-10 mx-auto'
                                                : 'gap-3 px-3 py-2.5',
                                            item.active
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                        )}
                                    >
                                        <Icon className={cn('shrink-0', isCollapsed ? 'size-5' : 'size-4')} />
                                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                                    </Link>
                                );

                                if (isCollapsed) {
                                    return (
                                        <Tooltip key={itemIdx}>
                                            <TooltipTrigger asChild>{linkElement}</TooltipTrigger>
                                            <TooltipContent
                                                side="right"
                                                sideOffset={10}
                                                className="bg-slate-800 text-white border border-slate-700 shadow-md font-medium text-xs py-1.5 px-2.5"
                                            >
                                                {item.label}
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                }

                                return linkElement;
                            })}
                        </div>
                    );
                })}
            </nav>

            {/* Desktop Bottom Collapse Toggle */}
            <div className="p-2 border-t border-slate-800 hidden lg:block">
                <button
                    type="button"
                    onClick={toggleSidebar}
                    className={cn(
                        'flex items-center w-full rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors py-2 cursor-pointer',
                        isCollapsed ? 'justify-center px-1' : 'px-3 gap-3'
                    )}
                    title={isCollapsed ? 'Perluas Sidebar (Ctrl+B)' : 'Ciutkan Sidebar (Ctrl+B)'}
                >
                    {isCollapsed ? (
                        <ChevronRight className="size-4 shrink-0" />
                    ) : (
                        <>
                            <ChevronLeft className="size-4 shrink-0" />
                            <span className="truncate">Ciutkan Sidebar</span>
                            <kbd className="ml-auto text-[10px] bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-slate-400 font-mono">
                                Ctrl+B
                            </kbd>
                        </>
                    )}
                </button>
            </div>
        </div>
    );

    return (
        <TooltipProvider delayDuration={100}>
            <div className="min-h-screen bg-slate-50/50 dark:bg-background flex flex-col lg:flex-row text-foreground">
                {title && <Head title={title} />}

                {/* Desktop Fixed Sidebar */}
                <aside
                    className={cn(
                        'hidden lg:block shrink-0 border-r border-slate-800 bg-slate-900 transition-all duration-300 ease-in-out',
                        sidebarCollapsed ? 'w-16' : 'w-64'
                    )}
                >
                    <div
                        className={cn(
                            'fixed inset-y-0 transition-all duration-300 ease-in-out z-20',
                            sidebarCollapsed ? 'w-16' : 'w-64'
                        )}
                    >
                        {renderNavContent(sidebarCollapsed)}
                    </div>
                </aside>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Topbar */}
                    <header className="sticky top-0 z-30 bg-white/95 dark:bg-card/90 backdrop-blur-xs border-b border-slate-200 dark:border-border h-14 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-2xs transition-colors">
                        {/* Left: Mobile trigger, Desktop Toggle & Breadcrumbs in Topbar */}
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-4">
                            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                                <SheetTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Buka menu navigasi"
                                        className="lg:hidden text-muted-foreground hover:text-foreground size-9 shrink-0"
                                    >
                                        <Menu className="size-5" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="p-0 w-72 bg-slate-900 border-r-slate-800 text-slate-100">
                                    <SheetHeader className="sr-only">
                                        <SheetTitle>Menu Navigasi</SheetTitle>
                                    </SheetHeader>
                                    {renderNavContent(false)}
                                </SheetContent>
                            </Sheet>

                            {/* Desktop Sidebar Toggle Button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleSidebar}
                                aria-label={sidebarCollapsed ? 'Perluas sidebar (Ctrl+B)' : 'Ciutkan sidebar (Ctrl+B)'}
                                className="hidden lg:flex size-9 text-muted-foreground hover:text-foreground hover:bg-muted/60 shrink-0"
                                title={sidebarCollapsed ? 'Perluas sidebar (Ctrl+B)' : 'Ciutkan sidebar (Ctrl+B)'}
                            >
                                {sidebarCollapsed ? (
                                    <PanelLeftOpen className="size-4" />
                                ) : (
                                    <PanelLeftClose className="size-4" />
                                )}
                            </Button>

                            <div className="hidden lg:block h-4 w-px bg-slate-200 dark:bg-border shrink-0" />

                            {/* Topbar Breadcrumbs */}
                            {resolvedBreadcrumbs && resolvedBreadcrumbs.length > 0 && (
                                <div className="min-w-0 overflow-hidden">
                                    <Breadcrumbs breadcrumbs={resolvedBreadcrumbs} />
                                </div>
                            )}
                        </div>

                    {/* Right: Notifications Dropdown & User Profile Dropdown */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        <NotificationDropdown />

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-muted/60">
                                    <div className="size-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs border border-primary/20">
                                        {user?.name?.substring(0, 2).toUpperCase() || 'U'}
                                    </div>
                                    <div className="hidden sm:block text-left text-xs">
                                        <p className="font-semibold text-foreground leading-tight">{user?.name}</p>
                                        <p className="text-muted-foreground font-mono">{user?.role}</p>
                                    </div>
                                    <ChevronDown className="size-4 text-muted-foreground" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-60">
                                <DropdownMenuLabel>
                                    <div className="space-y-0.5">
                                        <p className="font-semibold text-sm leading-tight">{user?.name}</p>
                                        <p className="text-xs text-muted-foreground font-mono">NIK: {user?.nik || '—'}</p>
                                        {user?.store ? (
                                            <p className="text-xs text-muted-foreground pt-1 flex items-center gap-1.5 font-normal truncate">
                                                <StoreIcon className="size-3 text-primary shrink-0" />
                                                <span className="truncate">{user.store.name.replace(/^Toko\s+/i, '')}</span>
                                            </p>
                                        ) : (
                                            <p className="text-[11px] text-muted-foreground pt-1 font-normal">
                                                Sistem Pusat (Global)
                                            </p>
                                        )}
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

                                {/* Theme Appearance Switcher */}
                                <div className="px-2 py-1.5">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                        Tema Tampilan
                                    </p>
                                    <div className="grid grid-cols-3 gap-1 bg-muted/50 p-1 rounded-lg border border-border">
                                        <button
                                            type="button"
                                            onClick={() => updateAppearance('light')}
                                            className={`flex items-center justify-center gap-1 py-1 rounded text-xs font-semibold transition-all ${
                                                appearance === 'light'
                                                    ? 'bg-background text-foreground shadow-2xs font-bold'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                            title="Tema Terang"
                                        >
                                            <Sun className="size-3" />
                                            <span>Terang</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateAppearance('dark')}
                                            className={`flex items-center justify-center gap-1 py-1 rounded text-xs font-semibold transition-all ${
                                                appearance === 'dark'
                                                    ? 'bg-background text-foreground shadow-2xs font-bold'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                            title="Tema Gelap"
                                        >
                                            <Moon className="size-3" />
                                            <span>Gelap</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateAppearance('system')}
                                            className={`flex items-center justify-center gap-1 py-1 rounded text-xs font-semibold transition-all ${
                                                appearance === 'system'
                                                    ? 'bg-background text-foreground shadow-2xs font-bold'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                            title="Ikuti Pengaturan Sistem"
                                        >
                                            <Monitor className="size-3" />
                                            <span>Auto</span>
                                        </button>
                                    </div>
                                </div>

                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer focus:bg-destructive/10 focus:text-destructive">
                                    <LogOut className="size-4 mr-2" />
                                    <span>Keluar (Logout)</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Flash Messages (Only rendered when message exists) */}
                {(flash?.success || flash?.error) && (
                    <div className="px-4 sm:px-6 pt-4">
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
                <main className="flex-1 p-4 sm:p-6">{children}</main>
            </div>
        </div>
    </TooltipProvider>
    );
}

export default AppLayout;

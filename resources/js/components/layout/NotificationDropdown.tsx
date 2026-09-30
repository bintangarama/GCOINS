import React from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import {
    Bell,
    CheckCheck,
    Receipt,
    Coins,
    Building2,
    Clock,
    ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageProps } from '@/types/auth';
import { NotificationItem } from '@/types/notification';

export function NotificationDropdown() {
    const { props } = usePage<PageProps>();
    const notifications = props.notifications;
    const unreadCount = notifications?.unread_count || 0;
    const recent = notifications?.recent || [];

    const handleMarkAllRead = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        router.post('/notifications/read-all', {}, { preserveScroll: true });
    };

    const getNotificationUrl = (item: NotificationItem): string => {
        if (!item.entity_type || !item.entity_id) return '/notifications';
        const type = item.entity_type.toUpperCase();
        if (type.includes('VOUCHER')) return `/vouchers/${item.entity_id}`;
        if (type.includes('OPNAME') || type.includes('SESSION')) return `/opname/${item.entity_id}`;
        if (type.includes('BRI')) return `/bri-funds/postings`;
        return '/notifications';
    };

    const handleItemClick = (item: NotificationItem) => {
        if (!item.read_at) {
            router.post(`/notifications/${item.id}/read`, {}, {
                preserveScroll: true,
                onSuccess: () => {
                    const target = getNotificationUrl(item);
                    if (target !== '/notifications') {
                        router.visit(target);
                    }
                },
            });
        } else {
            const target = getNotificationUrl(item);
            if (target !== '/notifications') {
                router.visit(target);
            }
        }
    };

    const getIcon = (type: string) => {
        const t = type.toUpperCase();
        if (t.includes('VOUCHER')) {
            return <Receipt className="w-4 h-4 text-blue-600" />;
        }
        if (t.includes('OPNAME')) {
            return <Coins className="w-4 h-4 text-emerald-600" />;
        }
        if (t.includes('BRI')) {
            return <Building2 className="w-4 h-4 text-amber-600" />;
        }
        return <Bell className="w-4 h-4 text-slate-500" />;
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

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground relative hover:bg-muted"
                    aria-label="Notifikasi"
                >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold ring-2 ring-background">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 shadow-lg border-border">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">Notifikasi</span>
                        {unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">
                                {unreadCount} baru
                            </span>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 cursor-pointer"
                        >
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>Tandai dibaca</span>
                        </button>
                    )}
                </div>

                {/* Items */}
                <div className="max-h-80 overflow-y-auto divide-y divide-border">
                    {recent.length === 0 ? (
                        <div className="py-8 px-4 text-center text-muted-foreground">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                            <p className="text-xs font-medium">Tidak ada notifikasi baru</p>
                        </div>
                    ) : (
                        recent.map((item) => {
                            const isUnread = !item.read_at;
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => handleItemClick(item)}
                                    className={`px-4 py-3 flex items-start gap-3 hover:bg-muted/50 transition-colors cursor-pointer text-left ${
                                        isUnread ? 'bg-blue-50/50 dark:bg-blue-950/30' : ''
                                    }`}
                                >
                                    <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                                        isUnread ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' : 'bg-muted text-muted-foreground'
                                    }`}>
                                        {getIcon(item.type)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-1">
                                            <p className={`text-xs font-semibold truncate ${
                                                isUnread ? 'text-foreground font-bold' : 'text-foreground'
                                            }`}>
                                                {item.title}
                                            </p>
                                            {isUnread && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                                            {item.message}
                                        </p>
                                        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                                            <Clock className="w-3 h-3" />
                                            <span>{formatRelativeTime(item.created_at)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="p-2 border-t border-border bg-muted/40">
                    <Link
                        href="/notifications"
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-primary hover:text-primary/80 hover:bg-primary/10 rounded-md transition-colors"
                    >
                        <span>Lihat Semua Notifikasi</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    Bell,
    CheckCheck,
    Trash2,
    Receipt,
    Coins,
    Building2,
    Clock,
    ArrowRight,
    CheckCircle2,
    AlertCircle,
    Info,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { NotificationItem } from '@/types/notification';

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface NotificationIndexProps {
    notifications: PaginatedData<NotificationItem>;
    unreadCount: number;
    filters: {
        filter: 'all' | 'unread' | 'read';
    };
}

export default function NotificationIndex({
    notifications,
    unreadCount,
    filters,
}: NotificationIndexProps) {
    const handleMarkAllRead = () => {
        router.post('/notifications/read-all', {}, { preserveScroll: true });
    };

    const handleMarkRead = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        router.post(`/notifications/${id}/read`, {}, { preserveScroll: true });
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Hapus notifikasi ini?')) {
            router.delete(`/notifications/${id}`, { preserveScroll: true });
        }
    };

    const getNotificationUrl = (item: NotificationItem): string => {
        if (!item.entity_type || !item.entity_id) return '/notifications';
        const type = item.entity_type.toUpperCase();
        if (type.includes('VOUCHER')) return `/vouchers/${item.entity_id}`;
        if (type.includes('OPNAME') || type.includes('SESSION')) return `/opname/${item.entity_id}`;
        if (type.includes('BRI')) return `/bri-funds/postings`;
        return '/notifications';
    };

    const handleClickItem = (item: NotificationItem) => {
        if (!item.read_at) {
            router.post(`/notifications/${item.id}/read`, {}, {
                preserveScroll: true,
                onSuccess: () => {
                    const targetUrl = getNotificationUrl(item);
                    if (targetUrl !== '/notifications') {
                        router.visit(targetUrl);
                    }
                },
            });
        } else {
            const targetUrl = getNotificationUrl(item);
            if (targetUrl !== '/notifications') {
                router.visit(targetUrl);
            }
        }
    };

    const getIcon = (type: string) => {
        const t = type.toUpperCase();
        if (t.includes('VOUCHER')) {
            return <Receipt className="w-5 h-5 text-blue-600" />;
        }
        if (t.includes('OPNAME')) {
            return <Coins className="w-5 h-5 text-emerald-600" />;
        }
        if (t.includes('BRI')) {
            return <Building2 className="w-5 h-5 text-amber-600" />;
        }
        return <Bell className="w-5 h-5 text-slate-600" />;
    };

    const formatTime = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return dateString;
        }
    };

    return (
        <AppLayout title="Notifikasi">
            <div className="max-w-4xl flex flex-col gap-6">
                <PageHeader
                    title="Pusat Notifikasi"
                    icon={Bell}
                    description="Semua pembaruan aktivitas voucher, cash opname, dan mutasi bank Anda."
                >
                    {unreadCount > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleMarkAllRead}
                            className="border-border text-foreground hover:bg-muted"
                        >
                            <CheckCheck className="size-4 text-primary mr-1.5" />
                            <span>Tandai Semua Dibaca ({unreadCount})</span>
                        </Button>
                    )}
                </PageHeader>

                {/* Filter Tabs */}
                <div className="flex items-center gap-2">
                    <Link
                        href="/notifications"
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            filters.filter === 'all'
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border'
                        }`}
                    >
                        Semua
                    </Link>
                    <Link
                        href="/notifications?filter=unread"
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                            filters.filter === 'unread'
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border'
                        }`}
                    >
                        <span>Belum Dibaca</span>
                        {unreadCount > 0 && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                filters.filter === 'unread' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'
                            }`}>
                                {unreadCount}
                            </span>
                        )}
                    </Link>
                    <Link
                        href="/notifications?filter=read"
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            filters.filter === 'read'
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border'
                        }`}
                    >
                        Sudah Dibaca
                    </Link>
                </div>

                {/* Notification List */}
                {notifications.data.length === 0 ? (
                    <Card className="border-dashed border-2 border-border">
                        <CardContent className="p-12 text-center">
                            <div className="w-12 h-12 rounded-full bg-muted text-muted-foreground flex items-center justify-center mx-auto mb-4">
                                <Bell className="w-6 h-6" />
                            </div>
                            <h3 className="text-base font-semibold text-foreground">Tidak ada notifikasi</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                {filters.filter === 'unread'
                                    ? 'Semua notifikasi sudah Anda baca.'
                                    : 'Belum ada notifikasi yang tercatat untuk akun Anda.'}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {notifications.data.map((item) => {
                            const isUnread = !item.read_at;
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => handleClickItem(item)}
                                    className={`group flex items-start justify-between gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                                        isUnread
                                            ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 hover:bg-blue-50/80 dark:hover:bg-blue-950/50'
                                            : 'bg-card border-border hover:bg-muted/50 hover:border-border'
                                    }`}
                                >
                                    <div className="flex items-start gap-3.5 min-w-0">
                                        <div className={`p-2.5 rounded-lg shrink-0 ${
                                            isUnread ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' : 'bg-muted text-muted-foreground'
                                        }`}>
                                            {getIcon(item.type)}
                                        </div>

                                        <div className="min-w-0 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className={`text-sm font-semibold truncate ${
                                                    isUnread ? 'text-foreground font-bold' : 'text-foreground'
                                                }`}>
                                                    {item.title}
                                                </h4>
                                                {isUnread && (
                                                    <span className="w-2 h-2 rounded-full bg-primary shrink-0"></span>
                                                )}
                                            </div>

                                            <p className="text-sm text-muted-foreground leading-relaxed break-words">
                                                {item.message}
                                            </p>

                                            <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground font-mono">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {formatTime(item.created_at)}
                                                </span>
                                                {item.entity_type && (
                                                    <span className="bg-muted px-2 py-0.5 rounded text-[11px] text-muted-foreground uppercase font-sans">
                                                        {item.entity_type}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                                        {isUnread && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => handleMarkRead(item.id, e)}
                                                title="Tandai sudah dibaca"
                                                className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10"
                                            >
                                                <CheckCheck className="w-4 h-4" />
                                                <span className="hidden sm:inline ml-1 text-xs">Dibaca</span>
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => handleDelete(item.id, e)}
                                            title="Hapus notifikasi"
                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {notifications.last_page > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                            Menampilkan halaman {notifications.current_page} dari {notifications.last_page} (Total {notifications.total} data)
                        </p>
                        <div className="flex items-center gap-1">
                            {notifications.links.map((link, idx) => (
                                <Link
                                    key={idx}
                                    href={link.url || '#'}
                                    preserveScroll
                                    className={`px-3 py-1.5 rounded text-xs font-medium ${
                                        link.active
                                            ? 'bg-primary text-primary-foreground'
                                            : !link.url
                                            ? 'text-muted-foreground/40 pointer-events-none'
                                            : 'text-foreground hover:bg-muted'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

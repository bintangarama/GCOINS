import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    ShieldCheck,
    Search,
    Filter,
    Download,
    Eye,
    Clock,
    User as UserIcon,
    RotateCcw,
    Calendar,
    FileSpreadsheet,
    Activity,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';

interface AuditLogItem {
    id: string;
    store_id: string | null;
    entity_name: string;
    entity_id: string;
    action: string;
    performed_by_id: string;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    ip_address: string | null;
    created_at: string;
    store?: { code: string; name: string } | null;
    performed_by?: {
        name: string;
        nik: string;
        role: string;
    } | null;
}

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface AuditLogsProps {
    logs: PaginatedData<AuditLogItem>;
    filters: {
        entity_name: string;
        action: string;
        search: string;
        date_from: string;
        date_to: string;
        store_id: string;
    };
    availableActions: string[];
    availableEntities: string[];
}

export default function AuditLogs({
    logs,
    filters,
    availableActions,
    availableEntities,
}: AuditLogsProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [entityName, setEntityName] = useState(filters.entity_name || '');
    const [action, setAction] = useState(filters.action || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/audit-logs',
            {
                search,
                entity_name: entityName,
                action,
                date_from: dateFrom,
                date_to: dateTo,
            },
            { preserveState: true }
        );
    };

    const handleReset = () => {
        setSearch('');
        setEntityName('');
        setAction('');
        setDateFrom('');
        setDateTo('');
        router.get('/admin/audit-logs', {}, { preserveState: true });
    };

    const handleExport = () => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (entityName) params.append('entity_name', entityName);
        if (action) params.append('action', action);
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);
        window.location.href = `/admin/audit-logs/export?${params.toString()}`;
    };

    const handleOpenDetail = (log: AuditLogItem) => {
        setSelectedLog(log);
        setDetailModalOpen(true);
    };

    const getActionBadgeColor = (act: string) => {
        const a = act.toUpperCase();
        if (a.includes('APPROVE') || a.includes('DISBURSE') || a.includes('SETTLE') || a.includes('SIGN_OFF')) {
            return 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
        }
        if (a.includes('REJECT') || a.includes('DELETE') || a.includes('CANCEL')) {
            return 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800';
        }
        if (a.includes('LOGIN') || a.includes('SUBMIT') || a.includes('CREATE')) {
            return 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
        }
        if (a.includes('UPDATE') || a.includes('SYNC') || a.includes('PIN')) {
            return 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
        }
        return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    };

    const formatDateTime = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <AppLayout title="Audit Log">
            <div className="space-y-6">
                <PageHeader
                    title="Audit Log Sistem"
                    icon={ShieldCheck}
                    description="Catatan audit permanen seluruh aktivitas transaksi, otorisasi, dan mutasi finansial toko."
                >
                    <Button
                        onClick={handleExport}
                        variant="outline"
                        className="border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                    >
                        <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Ekspor Excel (.xlsx)</span>
                    </Button>
                </PageHeader>

                {/* Filters Card */}
                <Card>
                    <CardContent className="p-4 sm:p-5">
                        <form onSubmit={handleFilterSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                                {/* Search */}
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold text-foreground">Pencarian</Label>
                                    <div className="relative">
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Nama / NIK / ID Entitas..."
                                            className="pl-9 text-xs"
                                        />
                                    </div>
                                </div>

                                {/* Entity */}
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold text-foreground">Entitas / Modul</Label>
                                    <select
                                        value={entityName}
                                        onChange={(e) => setEntityName(e.target.value)}
                                        className="w-full text-xs bg-background text-foreground border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        <option value="">Semua Modul</option>
                                        {availableEntities.map((ent) => (
                                            <option key={ent} value={ent}>
                                                {ent}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Action */}
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold text-foreground">Tindakan (Action)</Label>
                                    <select
                                        value={action}
                                        onChange={(e) => setAction(e.target.value)}
                                        className="w-full text-xs bg-background text-foreground border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        <option value="">Semua Tindakan</option>
                                        {availableActions.map((act) => (
                                            <option key={act} value={act}>
                                                {act}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Date From */}
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold text-slate-700">Dari Tanggal</Label>
                                    <Input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        className="text-xs"
                                    />
                                </div>

                                {/* Date To */}
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold text-slate-700">Sampai Tanggal</Label>
                                    <Input
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className="text-xs"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleReset}
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                                    Reset
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-4"
                                >
                                    <Filter className="w-3.5 h-3.5 mr-1.5" />
                                    Terapkan Filter
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Logs Table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                    <DataTable>
                        <DataTableHead>
                            <tr>
                                <DataTableHeaderCell>Waktu</DataTableHeaderCell>
                                <DataTableHeaderCell>Pelaksana</DataTableHeaderCell>
                                <DataTableHeaderCell>Modul & ID Entitas</DataTableHeaderCell>
                                <DataTableHeaderCell>Aksi</DataTableHeaderCell>
                                <DataTableHeaderCell>IP Address</DataTableHeaderCell>
                                <DataTableHeaderCell align="right">Detail</DataTableHeaderCell>
                            </tr>
                        </DataTableHead>
                        <DataTableBody>
                            {logs.data.length === 0 ? (
                                <DataTableEmpty
                                    colSpan={6}
                                    icon={<Activity className="w-10 h-10 text-slate-300 dark:text-slate-600 stroke-1" />}
                                    message="Tidak ada log aktivitas yang cocok dengan filter"
                                    description="Coba sesuaikan tanggal atau kriteria filter untuk melihat riwayat aktivitas."
                                    action={
                                        (entityName || action || search || dateFrom || dateTo) && (
                                            <Button variant="outline" size="sm" onClick={handleReset} className="text-xs h-8">
                                                Reset Filter
                                            </Button>
                                        )
                                    }
                                />
                            ) : (
                                logs.data.map((log) => (
                                    <DataTableRow key={log.id}>
                                        {/* Waktu */}
                                        <DataTableCell mono className="whitespace-nowrap text-slate-600">
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <span>{formatDateTime(log.created_at)}</span>
                                            </div>
                                        </DataTableCell>

                                        {/* Pelaksana */}
                                        <DataTableCell className="whitespace-nowrap">
                                            <div className="font-semibold text-foreground">
                                                {log.performed_by?.name || 'Sistem'}
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[11px] font-mono text-muted-foreground">
                                                    NIK: {log.performed_by?.nik || '-'}
                                                </span>
                                                {log.performed_by?.role && (
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground">
                                                        {log.performed_by.role}
                                                    </Badge>
                                                )}
                                            </div>
                                        </DataTableCell>

                                        {/* Modul & ID */}
                                        <DataTableCell className="whitespace-nowrap">
                                            <span className="font-semibold text-foreground">
                                                {log.entity_name}
                                            </span>
                                            <p className="text-[11px] font-mono text-muted-foreground truncate max-w-[180px]">
                                                ID: {log.entity_id}
                                            </p>
                                        </DataTableCell>

                                        {/* Aksi */}
                                        <DataTableCell className="whitespace-nowrap">
                                            <Badge
                                                variant="outline"
                                                className={`font-mono text-xs px-2 py-0.5 ${getActionBadgeColor(log.action)}`}
                                            >
                                                {log.action}
                                            </Badge>
                                        </DataTableCell>

                                        {/* IP Address */}
                                        <DataTableCell mono className="whitespace-nowrap text-muted-foreground">
                                            {log.ip_address || '—'}
                                        </DataTableCell>

                                        {/* Detail Action */}
                                        <DataTableCell align="right" className="whitespace-nowrap">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleOpenDetail(log)}
                                                className="h-8 px-2.5 text-primary hover:text-primary/80 hover:bg-primary/10 font-medium"
                                            >
                                                <Eye className="w-3.5 h-3.5 mr-1" />
                                                Snapshot
                                            </Button>
                                        </DataTableCell>
                                    </DataTableRow>
                                ))
                            )}
                        </DataTableBody>
                    </DataTable>

                    {/* Pagination */}
                    {logs.last_page > 1 && (
                        <div className="flex items-center justify-between p-4 border-t border-slate-200">
                            <p className="text-xs text-slate-500">
                                Menampilkan halaman {logs.current_page} dari {logs.last_page} (Total {logs.total} log)
                            </p>
                            <div className="flex items-center gap-1">
                                {logs.links.map((link, idx) => (
                                    <Link
                                        key={idx}
                                        href={link.url || '#'}
                                        preserveScroll
                                        className={`px-3 py-1.5 rounded text-xs font-medium ${
                                            link.active
                                                ? 'bg-blue-600 text-white'
                                                : !link.url
                                                ? 'text-slate-300 pointer-events-none'
                                                : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Detail Snapshot Modal */}
                <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
                    <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-foreground">
                                <Activity className="w-5 h-5 text-primary" />
                                Detail Perubahan Data (Snapshot Audit)
                            </DialogTitle>
                            <DialogDescription>
                                Snapshot perbandingan nilai lama dan nilai baru pada saat aksi dieksekusi.
                            </DialogDescription>
                        </DialogHeader>

                        {selectedLog && (
                            <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-muted/50 rounded-lg border border-border">
                                    <div>
                                        <span className="text-muted-foreground block text-[10px]">Tindakan</span>
                                        <span className="font-bold text-foreground">{selectedLog.action}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-[10px]">Modul</span>
                                        <span className="font-semibold text-foreground">{selectedLog.entity_name}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-[10px]">Pelaksana</span>
                                        <span className="font-semibold text-foreground">{selectedLog.performed_by?.name || 'Sistem'}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-[10px]">Waktu</span>
                                        <span className="font-mono text-foreground">{formatDateTime(selectedLog.created_at)}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Old Values */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-foreground text-xs">Nilai Sebelum (Old Values)</span>
                                            <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800">
                                                Sebelum
                                            </Badge>
                                        </div>
                                        <div className="bg-slate-950 text-slate-100 p-3 rounded-lg font-mono text-[11px] overflow-x-auto min-h-[120px] max-h-64 border border-slate-800">
                                            {selectedLog.old_values ? (
                                                <pre className="whitespace-pre-wrap">
                                                    {JSON.stringify(selectedLog.old_values, null, 2)}
                                                </pre>
                                            ) : (
                                                <span className="text-slate-500 italic">null (Entitas Baru / Tidak ada)</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* New Values */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-foreground text-xs">Nilai Sesudah (New Values)</span>
                                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                                                Sesudah
                                            </Badge>
                                        </div>
                                        <div className="bg-slate-950 text-slate-100 p-3 rounded-lg font-mono text-[11px] overflow-x-auto min-h-[120px] max-h-64 border border-slate-800">
                                            {selectedLog.new_values ? (
                                                <pre className="whitespace-pre-wrap">
                                                    {JSON.stringify(selectedLog.new_values, null, 2)}
                                                </pre>
                                            ) : (
                                                <span className="text-slate-500 italic">null (Penghapusan Data)</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

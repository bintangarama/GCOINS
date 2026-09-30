import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    ArrowUpDown,
    Download,
    Upload,
    FileSpreadsheet,
    Users,
    Receipt,
    Building2,
    ShieldCheck,
    CheckCircle2,
    AlertCircle,
    XCircle,
    FileUp,
    RefreshCw,
    Info,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

interface ImportExportProps {
    store?: { id: string; code: string; name: string } | null;
}

type ImportType = 'users' | 'vouchers' | 'bri-postings';

interface PreviewRow {
    row_num: number;
    errors?: string[];
    [key: string]: any;
}

interface PreviewResult {
    valid_rows: PreviewRow[];
    error_rows: PreviewRow[];
    total: number;
}

export default function ImportExportIndex({ store }: ImportExportProps) {
    const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');

    // Import State
    const [importType, setImportType] = useState<ImportType>('users');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [committing, setCommitting] = useState(false);
    const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            setPreviewResult(null);
            setAnalysisError(null);
        }
    };

    const handleAnalyzeFile = async () => {
        if (!selectedFile) return;

        setAnalyzing(true);
        setAnalysisError(null);
        setPreviewResult(null);

        const formData = new FormData();
        formData.append('type', importType);
        formData.append('file', selectedFile);

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const response = await fetch('/admin/import-export/preview', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => null);
                throw new Error(errData?.message || 'Gagal memproses file. Pastikan format kolom sesuai template.');
            }

            const data: PreviewResult = await response.json();
            setPreviewResult(data);
        } catch (err: unknown) {
            setAnalysisError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses file.');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleCommit = () => {
        if (!previewResult || previewResult.valid_rows.length === 0) return;

        setCommitting(true);
        router.post(
            '/admin/import-export/commit',
            {
                type: importType,
                valid_rows: previewResult.valid_rows as any,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setPreviewResult(null);
                    setSelectedFile(null);
                    setCommitting(false);
                },
                onError: () => {
                    setCommitting(false);
                },
            }
        );
    };

    const getTemplateUrl = (type: ImportType) => `/admin/import-export/template/${type}`;

    return (
        <AppLayout title="Pusat Import & Export">
            <div className="max-w-5xl flex flex-col gap-6">
                <PageHeader
                    title="Pusat Import & Export Data"
                    icon={ArrowUpDown}
                    description="Cadangkan data operasional atau migrasikan data historis toko dengan validasi otomatis"
                >
                    {/* Tab Switcher */}
                    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg border border-border">
                        <button
                            type="button"
                            onClick={() => setActiveTab('export')}
                            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                activeTab === 'export'
                                    ? 'bg-card text-primary shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Download className="size-3.5 inline mr-1.5" />
                            Ekspor Data
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('import')}
                            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                activeTab === 'import'
                                    ? 'bg-card text-primary shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Upload className="size-3.5 inline mr-1.5" />
                            Impor Data
                        </button>
                    </div>
                </PageHeader>

                {/* TAB 1: EXPORT */}
                {activeTab === 'export' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Users Export */}
                        <Card className="hover:border-border/80 transition-colors">
                            <CardHeader className="pb-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-1">
                                    <Users className="w-5 h-5" />
                                </div>
                                <CardTitle className="text-base text-foreground">Data Pengguna & Pegawai</CardTitle>
                                <CardDescription className="text-xs">
                                    Unduh daftar seluruh user, NIK, peran, dan status akun yang terdaftar.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0 flex items-center gap-2">
                                <a
                                    href="/admin/import-export/export/users?format=xlsx"
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors"
                                >
                                    <FileSpreadsheet className="w-4 h-4" />
                                    <span>Unduh Excel (.xlsx)</span>
                                </a>
                            </CardContent>
                        </Card>

                        {/* Vouchers Export */}
                        <Card className="hover:border-border/80 transition-colors">
                            <CardHeader className="pb-3">
                                <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1">
                                    <Receipt className="w-5 h-5" />
                                </div>
                                <CardTitle className="text-base text-foreground">Rekapitulasi Voucher Kas Kecil</CardTitle>
                                <CardDescription className="text-xs">
                                    Unduh rekap seluruh pengajuan voucher, status realisasi, dan pencairan dana kas kecil.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0 flex items-center gap-2">
                                <a
                                    href="/admin/import-export/export/vouchers"
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors"
                                >
                                    <FileSpreadsheet className="w-4 h-4" />
                                    <span>Unduh Excel (.xlsx)</span>
                                </a>
                            </CardContent>
                        </Card>

                        {/* BRI Postings Export */}
                        <Card className="hover:border-border/80 transition-colors">
                            <CardHeader className="pb-3">
                                <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <CardTitle className="text-base text-foreground">Mutasi Rekening Bank BRI</CardTitle>
                                <CardDescription className="text-xs">
                                    Unduh riwayat transaksi inflow, outflow, dan alokasi saldo sub-ledger BRI.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0 flex items-center gap-2">
                                <a
                                    href="/admin/import-export/export/bri-postings"
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition-colors"
                                >
                                    <FileSpreadsheet className="w-4 h-4" />
                                    <span>Unduh Excel (.xlsx)</span>
                                </a>
                            </CardContent>
                        </Card>

                        {/* Audit Logs Export */}
                        <Card className="hover:border-border/80 transition-colors">
                            <CardHeader className="pb-3">
                                <div className="w-10 h-10 rounded-lg bg-muted text-muted-foreground flex items-center justify-center mb-1">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <CardTitle className="text-base text-foreground">Catatan Audit Sistem</CardTitle>
                                <CardDescription className="text-xs">
                                    Unduh rekam jejak aktivitas, otorisasi, dan riwayat snapshot perubahan finansial.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0 flex items-center gap-2">
                                <a
                                    href="/admin/import-export/export/audit-logs"
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors"
                                >
                                    <FileSpreadsheet className="w-4 h-4" />
                                    <span>Unduh Excel (.xlsx)</span>
                                </a>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* TAB 2: IMPORT */}
                {activeTab === 'import' && (
                    <div className="space-y-6">
                        {/* Import Config Form */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base text-foreground flex items-center gap-2">
                                    <FileUp className="w-5 h-5 text-primary" />
                                    Unggah File Spreadsheet Data
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Gunakan template spreadsheet resmi agar format kolom dapat divalidasi dengan tepat.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Type Selector */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-foreground">Jenis Data Impor</Label>
                                        <select
                                            value={importType}
                                            onChange={(e) => {
                                                setImportType(e.target.value as ImportType);
                                                setPreviewResult(null);
                                                setSelectedFile(null);
                                                setAnalysisError(null);
                                            }}
                                            className="w-full text-xs bg-background text-foreground border border-input rounded-lg px-3 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                                        >
                                            <option value="users">Data Pegawai / Pengguna (Users)</option>
                                            <option value="vouchers">Data Historis Voucher Bon Kas Kecil</option>
                                            <option value="bri-postings">Data Historis Mutasi Bank BRI</option>
                                        </select>
                                    </div>

                                    {/* Template Download */}
                                    <div className="space-y-1.5 flex flex-col justify-end">
                                        <Label className="text-xs font-semibold text-foreground">Template Format</Label>
                                        <a
                                            href={getTemplateUrl(importType)}
                                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-medium transition-colors shadow-2xs"
                                        >
                                            <Download className="w-4 h-4 text-primary" />
                                            <span>Unduh Template Contoh (.xlsx)</span>
                                        </a>
                                    </div>
                                </div>

                                {/* File Dropzone */}
                                <div className="pt-2">
                                    <Label className="text-xs font-semibold text-foreground block mb-2">
                                        Pilih File (.xlsx, .xls, .csv)
                                    </Label>
                                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 bg-muted/30 transition-colors">
                                        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                                        <input
                                            type="file"
                                            id="file-upload"
                                            accept=".xlsx,.xls,.csv"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                        <label
                                            htmlFor="file-upload"
                                            className="cursor-pointer font-semibold text-xs text-primary hover:text-primary/80 block"
                                        >
                                            {selectedFile ? selectedFile.name : 'Klik di sini untuk memilih file spreadsheet'}
                                        </label>
                                        <p className="text-[11px] text-muted-foreground mt-1">
                                            Maksimal ukuran file: 5 MB
                                        </p>
                                    </div>
                                </div>

                                {analysisError && (
                                    <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span>{analysisError}</span>
                                    </div>
                                )}

                                <div className="flex justify-end pt-2">
                                    <Button
                                        onClick={handleAnalyzeFile}
                                        disabled={!selectedFile || analyzing}
                                        className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-5"
                                    >
                                        {analyzing ? (
                                            <>
                                                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                                Menganalisis File...
                                            </>
                                        ) : (
                                            <>
                                                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                                                Validasi & Tampilkan Preview
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* PREVIEW SECTION */}
                        {previewResult && (
                            <div className="space-y-4 pt-2">
                                {/* Summary Banner */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="p-4 rounded-xl bg-card border border-border shadow-xs flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Total Baris</p>
                                            <p className="text-xl font-bold text-foreground">{previewResult.total}</p>
                                        </div>
                                        <FileSpreadsheet className="w-6 h-6 text-muted-foreground" />
                                    </div>

                                    <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 shadow-xs flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Data Valid</p>
                                            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{previewResult.valid_rows.length}</p>
                                        </div>
                                        <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                    </div>

                                    <div className="p-4 rounded-xl bg-red-50/80 dark:bg-red-950/40 border border-red-200 dark:border-red-900 shadow-xs flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-destructive font-medium">Data Bermasalah</p>
                                            <p className="text-xl font-bold text-destructive">{previewResult.error_rows.length}</p>
                                        </div>
                                        <XCircle className="w-6 h-6 text-destructive" />
                                    </div>
                                </div>

                                {/* Error Rows Table (if any) */}
                                {previewResult.error_rows.length > 0 && (
                                    <Card className="border-destructive/30 bg-destructive/5">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-bold text-destructive flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 text-destructive" />
                                                Baris dengan Kesalahan ({previewResult.error_rows.length})
                                            </CardTitle>
                                            <CardDescription className="text-xs text-destructive/80">
                                                Baris berikut memiliki format yang tidak valid dan tidak akan diimpor ke sistem.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <div className="max-h-60 overflow-y-auto rounded-lg border border-destructive/20 bg-card">
                                                <table className="w-full text-xs text-left">
                                                    <thead className="bg-destructive/10 text-destructive font-semibold border-b border-destructive/20">
                                                        <tr>
                                                            <th className="px-3 py-2">Baris Excel</th>
                                                            <th className="px-3 py-2">Detail Data</th>
                                                            <th className="px-3 py-2">Penyebab Error</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-destructive/10">
                                                        {previewResult.error_rows.map((row, idx) => (
                                                            <tr key={idx} className="hover:bg-destructive/5">
                                                                <td className="px-3 py-2 font-mono text-destructive">
                                                                    Baris #{row.row_num}
                                                                </td>
                                                                <td className="px-3 py-2 font-mono text-muted-foreground">
                                                                    {Object.entries(row)
                                                                        .filter(([k]) => !['row_num', 'errors'].includes(k))
                                                                        .map(([k, v]) => `${k}: ${v}`)
                                                                        .slice(0, 3)
                                                                        .join(', ')}
                                                                </td>
                                                                <td className="px-3 py-2 text-destructive font-medium">
                                                                    {row.errors?.join('; ')}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Valid Rows Preview Table */}
                                <Card>
                                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                        <div>
                                            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                Preview Data Valid yang Akan Diimpor ({previewResult.valid_rows.length})
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                                Periksa kembali sampel data sebelum melakukan commit ke database.
                                            </CardDescription>
                                        </div>

                                        <Button
                                            onClick={handleCommit}
                                            disabled={previewResult.valid_rows.length === 0 || committing}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 shadow-xs"
                                        >
                                            {committing ? (
                                                <>
                                                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                                    Menyimpan Data...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                                    Konfirmasi Impor ({previewResult.valid_rows.length} Baris)
                                                </>
                                            )}
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-muted/50 text-foreground font-semibold border-b border-border sticky top-0">
                                                    <tr>
                                                        <th className="px-3 py-2">Baris</th>
                                                        {previewResult.valid_rows[0] &&
                                                            Object.keys(previewResult.valid_rows[0])
                                                                .filter((k) => !['row_num', 'errors', 'amount_cents', 'pin'].includes(k))
                                                                .map((colKey) => (
                                                                    <th key={colKey} className="px-3 py-2 uppercase font-mono">
                                                                        {colKey}
                                                                    </th>
                                                                ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {previewResult.valid_rows.map((row, idx) => (
                                                        <tr key={idx} className="hover:bg-muted/50">
                                                            <td className="px-3 py-2 font-mono text-muted-foreground">
                                                                #{row.row_num}
                                                            </td>
                                                            {Object.entries(row)
                                                                .filter(([k]) => !['row_num', 'errors', 'amount_cents', 'pin'].includes(k))
                                                                .map(([k, v], cellIdx) => (
                                                                    <td key={cellIdx} className="px-3 py-2 text-foreground">
                                                                        {String(v ?? '—')}
                                                                    </td>
                                                                ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { compressImageToWebP, CompressionResult } from '@/lib/image-compressor';
import {
    Camera,
    CheckCircle2,
    FileText,
    FolderOpen,
    Loader2,
    RefreshCw,
    Trash2,
    UploadCloud,
    ZoomIn,
} from 'lucide-react';
import { toast } from 'sonner';

export interface ImageUploaderProps {
    label: string;
    description?: string;
    required?: boolean;
    error?: string;
    initialUrl?: string | null;
    value?: string | null;
    allowPdf?: boolean;
    onChange: (file: File | null) => void;
}

export function ImageUploader({
    label,
    description,
    required = false,
    error,
    initialUrl = null,
    value = null,
    allowPdf = false,
    onChange,
}: ImageUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const activeUrl = value || initialUrl;
    const [previewUrl, setPreviewUrl] = useState<string | null>(activeUrl);
    const [isCompressing, setIsCompressing] = useState<boolean>(false);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [pdfInfo, setPdfInfo] = useState<{
        name: string;
        sizeKb: number;
    } | null>(null);
    const [compressionInfo, setCompressionInfo] = useState<{
        originalKb: number;
        compressedKb: number;
        ratio: number;
    } | null>(null);

    useEffect(() => {
        if (activeUrl !== undefined && activeUrl !== previewUrl) {
            setPreviewUrl(activeUrl);
        }
    }, [activeUrl]);

    const isPdfFile = Boolean(
        pdfInfo ||
        (previewUrl && (previewUrl.startsWith('data:application/pdf') || previewUrl.toLowerCase().includes('.pdf')))
    );

    const processFile = async (file: File) => {
        // Handle PDF if allowed
        if (allowPdf && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
            if (file.size > 2 * 1024 * 1024) {
                toast.error('Ukuran berkas PDF tidak boleh melebihi 2MB.');
                return;
            }

            const sizeKb = Math.round(file.size / 1024);
            setPdfInfo({
                name: file.name,
                sizeKb,
            });
            setCompressionInfo(null);
            setPreviewUrl(URL.createObjectURL(file));
            onChange(file);
            toast.success('Berkas PDF berhasil dipilih.');
            return;
        }

        // Handle image files
        if (!file.type.startsWith('image/')) {
            toast.error(
                allowPdf
                    ? 'Berkas harus berupa gambar (JPG, PNG, WebP) atau dokumen PDF.'
                    : 'Berkas harus berupa gambar (JPG, PNG, WebP).'
            );
            return;
        }

        setPdfInfo(null);
        setIsCompressing(true);
        try {
            const result: CompressionResult = await compressImageToWebP(file);
            setPreviewUrl(result.dataUrl);
            const originalKb = Math.round(result.originalSizeBytes / 1024);
            const compressedKb = Math.round(result.compressedSizeBytes / 1024);
            const ratio = Math.round((1 - result.compressedSizeBytes / result.originalSizeBytes) * 100);

            setCompressionInfo({
                originalKb,
                compressedKb,
                ratio,
            });

            onChange(result.file);
        } catch (err) {
            console.error('Compression error:', err);
            toast.warning('Kompresi otomatis gagal. Menggunakan berkas asli.');
            setPreviewUrl(URL.createObjectURL(file));
            onChange(file);
        } finally {
            setIsCompressing(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            void processFile(file);
        }
        // Reset value so re-selecting the exact same file fires onChange
        e.target.value = '';
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            void processFile(file);
        }
    };

    const handleRemove = () => {
        setPreviewUrl(null);
        setPdfInfo(null);
        setCompressionInfo(null);
        onChange(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        if (cameraInputRef.current) {
            cameraInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground">
                    {label} {required && <span className="text-destructive">*</span>}
                </label>
                {compressionInfo && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="size-3" />
                        {compressionInfo.originalKb}KB → {compressionInfo.compressedKb}KB WebP (-{compressionInfo.ratio}%)
                    </span>
                )}
                {pdfInfo && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                        <FileText className="size-3" />
                        PDF: {pdfInfo.sizeKb} KB
                    </span>
                )}
            </div>

            {description && <p className="text-xs text-muted-foreground">{description}</p>}

            {/* Hidden Input 1: Camera capture (Direct to mobile camera) */}
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
            />

            {/* Hidden Input 2: System File/Gallery Picker (No forced camera) */}
            <input
                ref={fileInputRef}
                type="file"
                accept={allowPdf ? 'image/*,application/pdf,.pdf' : 'image/*'}
                className="hidden"
                onChange={handleFileSelect}
            />

            {!previewUrl ? (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`w-full relative border-2 border-dashed rounded-xl p-5 sm:p-6 text-center transition-all duration-150 flex flex-col items-center justify-center gap-3 bg-muted/10 hover:bg-muted/20 ${
                        isDragging ? 'border-primary bg-primary/5 scale-[0.99]' : ''
                    } ${error ? 'border-destructive/60 bg-destructive/5' : 'border-border'}`}
                >
                    {isCompressing ? (
                        <div className="flex flex-col items-center gap-2 py-3">
                            <Loader2 className="size-8 text-primary animate-spin" />
                            <span className="text-xs text-muted-foreground font-semibold">
                                Mengompresi ke WebP (≤250KB)...
                            </span>
                        </div>
                    ) : (
                        <>
                            <div className="size-11 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-xs">
                                {isDragging ? <UploadCloud className="size-6" /> : <Camera className="size-5" />}
                            </div>

                            <div className="space-y-0.5 max-w-sm">
                                <p className="text-xs font-semibold text-foreground">
                                    Ambil foto langsung atau pilih berkas
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    {allowPdf
                                        ? 'Pilih dari galeri/penyimpanan atau buka kamera (JPG, PNG, WebP ≤250KB, PDF ≤2MB)'
                                        : 'Pilih dari galeri foto atau buka kamera (otomatis dikompresi WebP ≤250KB)'}
                                </p>
                            </div>

                            {/* Tombol Opsi: Kamera vs File/Galeri */}
                            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 w-full max-w-xs sm:max-w-sm">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => cameraInputRef.current?.click()}
                                    className="flex-1 min-w-[125px] h-9 text-xs gap-1.5 font-medium border-primary/30 hover:bg-primary/5 hover:text-primary hover:border-primary/60 cursor-pointer shadow-xs"
                                >
                                    <Camera className="size-3.5 text-primary" />
                                    <span>Buka Kamera</span>
                                </Button>
                                <Button
                                    type="button"
                                    variant="default"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex-1 min-w-[125px] h-9 text-xs gap-1.5 font-medium cursor-pointer shadow-xs"
                                >
                                    <FolderOpen className="size-3.5" />
                                    <span>Pilih File / Galeri</span>
                                </Button>
                            </div>

                            <span className="text-[10px] text-muted-foreground/70">
                                Atau seret & lepas berkas langsung ke area ini
                            </span>
                        </>
                    )}
                </div>
            ) : (
                <div className="relative group border border-border rounded-xl overflow-hidden bg-muted/20 p-2.5 flex items-center gap-3">
                    {isPdfFile ? (
                        <div className="size-16 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 flex flex-col items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                            <FileText className="size-6" />
                            <span className="text-[9px] font-bold mt-0.5">PDF</span>
                        </div>
                    ) : (
                        <img
                            src={previewUrl}
                            alt="Preview Foto"
                            className="size-16 object-cover rounded-lg border border-border shrink-0 bg-background"
                        />
                    )}

                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{label}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                            {isPdfFile
                                ? (pdfInfo ? `${pdfInfo.name} (${pdfInfo.sizeKb} KB)` : 'Dokumen PDF')
                                : 'Format: WebP terkompresi'}
                        </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        {/* Pratinjau / Zoom */}
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    type="button"
                                    className="size-8.5 cursor-pointer"
                                    title={isPdfFile ? 'Lihat Berkas PDF' : 'Lihat Pratinjau Foto'}
                                >
                                    <ZoomIn className="size-4 text-muted-foreground" />
                                    <span className="sr-only">Pratinjau</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl p-4 bg-background/95 backdrop-blur-sm">
                                <DialogHeader>
                                    <DialogTitle className="text-sm font-semibold truncate">
                                        Pratinjau: {label}
                                    </DialogTitle>
                                </DialogHeader>
                                {isPdfFile ? (
                                    <div className="p-4 flex flex-col items-center justify-center gap-3 py-6">
                                        <FileText className="size-14 text-red-500" />
                                        <div className="text-center space-y-1">
                                            <p className="text-xs font-semibold text-foreground">
                                                {pdfInfo?.name || 'Dokumen PDF'}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                Berkas dokumen PDF siap dilampirkan.
                                            </p>
                                        </div>
                                        <Button asChild size="sm" variant="outline" className="mt-2 text-xs">
                                            <a href={previewUrl} target="_blank" rel="noreferrer" className="gap-1.5">
                                                <ZoomIn className="size-3.5" /> Buka PDF di Tab Baru
                                            </a>
                                        </Button>
                                    </div>
                                ) : (
                                    <img
                                        src={previewUrl}
                                        alt="Enlarged view"
                                        className="w-full max-h-[75vh] object-contain rounded-lg border border-border"
                                    />
                                )}
                            </DialogContent>
                        </Dialog>

                        {/* Dropdown Ganti Foto / Berkas */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    type="button"
                                    className="size-8.5 cursor-pointer"
                                    title="Ganti Foto atau Berkas"
                                >
                                    <RefreshCw className="size-3.5 text-muted-foreground" />
                                    <span className="sr-only">Ganti Berkas</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 text-xs">
                                <DropdownMenuItem
                                    onClick={() => cameraInputRef.current?.click()}
                                    className="gap-2 cursor-pointer"
                                >
                                    <Camera className="size-3.5 text-primary" />
                                    <span>Ambil Foto Baru (Kamera)</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => fileInputRef.current?.click()}
                                    className="gap-2 cursor-pointer"
                                >
                                    <FolderOpen className="size-3.5" />
                                    <span>Pilih dari Galeri / Berkas</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Hapus Foto */}
                        <Button
                            size="icon"
                            variant="destructive"
                            type="button"
                            className="size-8.5 cursor-pointer"
                            onClick={handleRemove}
                            title="Hapus Foto"
                        >
                            <Trash2 className="size-3.5" />
                            <span className="sr-only">Hapus Foto</span>
                        </Button>
                    </div>
                </div>
            )}

            {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
        </div>
    );
}


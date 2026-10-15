import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { compressImageToWebP, CompressionResult } from '@/lib/image-compressor';
import { Camera, CheckCircle2, Loader2, Trash2, ZoomIn, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';

export interface ImageUploaderProps {
    label: string;
    description?: string;
    required?: boolean;
    error?: string;
    initialUrl?: string | null;
    value?: string | null;
    onChange: (file: File | null) => void;
}

export function ImageUploader({
    label,
    description,
    required = false,
    error,
    initialUrl = null,
    value = null,
    onChange,
}: ImageUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const activeUrl = value || initialUrl;
    const [previewUrl, setPreviewUrl] = useState<string | null>(activeUrl);
    const [isCompressing, setIsCompressing] = useState<boolean>(false);
    const [isDragging, setIsDragging] = useState<boolean>(false);
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

    const processFile = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error('Berkas harus berupa gambar (JPG, PNG, WebP).');
            return;
        }

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
    };

    const handleDragOver = (e: React.DragEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLButtonElement>) => {
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
        setCompressionInfo(null);
        onChange(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
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
            </div>

            {description && <p className="text-xs text-muted-foreground">{description}</p>}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
            />

            {!previewUrl ? (
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`w-full relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-center gap-2 hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                        isDragging ? 'border-primary bg-primary/5 scale-[0.99]' : ''
                    } ${error ? 'border-destructive/60 bg-destructive/5' : 'border-border'}`}
                >
                    {isCompressing ? (
                        <div className="flex flex-col items-center gap-2 py-2">
                            <Loader2 className="size-8 text-primary animate-spin" />
                            <span className="text-xs text-muted-foreground font-semibold">
                                Mengompresi ke WebP (≤250KB)...
                            </span>
                        </div>
                    ) : (
                        <>
                            <div className="size-11 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                {isDragging ? <UploadCloud className="size-6" /> : <Camera className="size-6" />}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                <span className="font-bold text-primary">Klik untuk ambil foto / upload</span> atau tarik gambar ke sini
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                                Format JPG/PNG/WebP, otomatis dikompresi ≤ 250KB
                            </span>
                        </>
                    )}
                </button>
            ) : (
                <div className="relative group border border-border rounded-xl overflow-hidden bg-muted/20 p-2.5 flex items-center gap-3">
                    <img
                        src={previewUrl}
                        alt="Preview Foto"
                        className="size-16 object-cover rounded-lg border border-border shrink-0 bg-background"
                    />

                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{label}</p>
                        <p className="text-[11px] text-muted-foreground">Format: WebP terkompresi</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    type="button"
                                    className="size-9"
                                    title="Lihat Pratinjau Foto"
                                >
                                    <ZoomIn className="size-4 text-muted-foreground" />
                                    <span className="sr-only">Perbesar Foto</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl p-3 bg-background/95 backdrop-blur-sm">
                                <DialogHeader>
                                    <DialogTitle className="text-sm font-semibold truncate">
                                        Pratinjau: {label}
                                    </DialogTitle>
                                </DialogHeader>
                                <img
                                    src={previewUrl}
                                    alt="Enlarged view"
                                    className="w-full max-h-[75vh] object-contain rounded-lg border border-border"
                                />
                            </DialogContent>
                        </Dialog>

                        <Button
                            size="icon"
                            variant="destructive"
                            type="button"
                            className="size-9"
                            onClick={handleRemove}
                            title="Hapus Foto"
                        >
                            <Trash2 className="size-4" />
                            <span className="sr-only">Hapus Foto</span>
                        </Button>
                    </div>
                </div>
            )}

            {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
        </div>
    );
}

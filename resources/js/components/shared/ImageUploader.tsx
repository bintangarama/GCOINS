import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { compressImageToWebP, CompressionResult } from '@/lib/image-compressor';
import { Camera, CheckCircle2, Image as ImageIcon, Loader2, Trash2, ZoomIn } from 'lucide-react';

interface ImageUploaderProps {
    label: string;
    description?: string;
    required?: boolean;
    error?: string;
    initialUrl?: string | null;
    onChange: (file: File | null) => void;
}

export function ImageUploader({
    label,
    description,
    required = false,
    error,
    initialUrl = null,
    onChange,
}: ImageUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl);
    const [isCompressing, setIsCompressing] = useState<boolean>(false);
    const [compressionInfo, setCompressionInfo] = useState<{
        originalKb: number;
        compressedKb: number;
        ratio: number;
    } | null>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

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
            // Fallback to original file
            setPreviewUrl(URL.createObjectURL(file));
            onChange(file);
        } finally {
            setIsCompressing(false);
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
                <label className="text-sm font-medium text-foreground">
                    {label} {required && <span className="text-destructive">*</span>}
                </label>
                {compressionInfo && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        {compressionInfo.originalKb}KB → {compressionInfo.compressedKb}KB WebP (-{compressionInfo.ratio}%)
                    </span>
                )}
            </div>

            {description && <p className="text-xs text-muted-foreground">{description}</p>}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
            />

            {!previewUrl ? (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-150 flex flex-col items-center justify-center gap-2 hover:bg-muted/40 ${
                        error ? 'border-destructive/60 bg-destructive/5' : 'border-border'
                    }`}
                >
                    {isCompressing ? (
                        <div className="flex flex-col items-center gap-2 py-2">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            <span className="text-xs text-muted-foreground font-medium">Mengompresi ke WebP (≤250KB)...</span>
                        </div>
                    ) : (
                        <>
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <Camera className="w-5 h-5" />
                            </div>
                            <div className="text-xs text-muted-foreground">
                                <span className="font-semibold text-primary">Klik untuk ambil foto / upload</span> atau tarik gambar ke sini
                            </div>
                            <span className="text-[10px] text-muted-foreground">Otomatis dikompresi ke WebP (≤ 250KB)</span>
                        </>
                    )}
                </div>
            ) : (
                <div className="relative group border rounded-lg overflow-hidden bg-muted/20 p-2 flex items-center gap-3">
                    <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-16 h-16 object-cover rounded-md border shrink-0 bg-background"
                    />

                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{label}</p>
                        <p className="text-[11px] text-muted-foreground">Format: WebP terkompresi</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button size="icon" variant="outline" type="button" className="h-8 w-8" title="Lihat Foto">
                                    <ZoomIn className="w-4 h-4 text-muted-foreground" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl p-2 bg-background/95 backdrop-blur-sm">
                                <img
                                    src={previewUrl}
                                    alt="Enlarged view"
                                    className="w-full max-h-[75vh] object-contain rounded-md"
                                />
                            </DialogContent>
                        </Dialog>

                        <Button
                            size="icon"
                            variant="destructive"
                            type="button"
                            className="h-8 w-8"
                            onClick={handleRemove}
                            title="Hapus Foto"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {error && <p className="text-xs font-medium text-destructive">{error}</p>}
        </div>
    );
}

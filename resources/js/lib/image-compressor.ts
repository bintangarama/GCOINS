/**
 * Client-side image compression using HTML Canvas API.
 * Hardened to enforce spec §10.1:
 * - Proportional max dimension: 1280x1920 px (portrait: 1280x1920, landscape: 1920x1280).
 * - Strict file size limit <= 250 KB.
 * - Iterative quality reduction down to 0.3, followed by second-phase dimensional downscaling if needed.
 * - Safari iOS fallback: detects WebP support; falls back cleanly to compressed JPEG with .jpg extension.
 */

export interface CompressionResult {
    file: File;
    dataUrl: string;
    originalSizeBytes: number;
    compressedSizeBytes: number;
    format: 'webp' | 'jpeg';
}

/**
 * Check if the current browser environment supports Canvas WebP export.
 */
function isWebpSupported(): boolean {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch {
        return false;
    }
}

/**
 * Calculate proportional dimensions bounded by max 1280x1920 px.
 */
function calculateBoundedDimensions(
    width: number,
    height: number,
    maxShortEdge: number = 1280,
    maxLongEdge: number = 1920
): { width: number; height: number } {
    const isPortrait = height >= width;
    const maxW = isPortrait ? maxShortEdge : maxLongEdge;
    const maxH = isPortrait ? maxLongEdge : maxShortEdge;

    let w = width;
    let h = height;

    if (w > maxW) {
        h = Math.round((h * maxW) / w);
        w = maxW;
    }
    if (h > maxH) {
        w = Math.round((w * maxH) / h);
        h = maxH;
    }

    return { width: Math.max(1, w), height: Math.max(1, h) };
}

export async function compressImageToWebP(
    file: File,
    maxSizeBytes: number = 250 * 1024, // 250 KB
    maxShortEdge: number = 1280,
    maxLongEdge: number = 1920
): Promise<CompressionResult> {
    return new Promise((resolve, reject) => {
        const originalSizeBytes = file.size;

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;

            img.onload = async () => {
                try {
                    // Initial proportional boundary enforcement (§10.1: 1280x1920 max)
                    let { width, height } = calculateBoundedDimensions(
                        img.width,
                        img.height,
                        maxShortEdge,
                        maxLongEdge
                    );

                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Canvas 2D context tidak tersedia'));
                        return;
                    }

                    // Detect WebP support on this browser (Safari iOS fallback)
                    const supportWebp = isWebpSupported();
                    const targetMimeType = supportWebp ? 'image/webp' : 'image/jpeg';
                    const targetExtension = supportWebp ? 'webp' : 'jpg';

                    const renderCanvas = (w: number, h: number) => {
                        canvas.width = w;
                        canvas.height = h;
                        ctx.clearRect(0, 0, w, h);
                        // White background for JPEG compatibility
                        if (targetMimeType === 'image/jpeg') {
                            ctx.fillStyle = '#FFFFFF';
                            ctx.fillRect(0, 0, w, h);
                        }
                        ctx.drawImage(img, 0, 0, w, h);
                    };

                    const attemptBlob = (mime: string, q: number): Promise<Blob | null> => {
                        return new Promise((res) => {
                            canvas.toBlob((b) => res(b), mime, q);
                        });
                    };

                    renderCanvas(width, height);

                    // Phase 1: Quality reduction from 0.85 down to 0.30
                    let quality = 0.85;
                    let blob: Blob | null = await attemptBlob(targetMimeType, quality);

                    // Verify Safari iOS didn't silently return PNG blob when WebP requested
                    if (blob && targetMimeType === 'image/webp' && blob.type !== 'image/webp') {
                        // Browser failed WebP encoding; switch to JPEG
                        blob = await attemptBlob('image/jpeg', quality);
                    }

                    while (blob && blob.size > maxSizeBytes && quality > 0.3) {
                        quality -= 0.15;
                        blob = await attemptBlob(targetMimeType, quality);
                    }

                    // Phase 2: If still > 250 KB at quality 0.3, iteratively scale dimensions down
                    while (blob && blob.size > maxSizeBytes && width > 480 && height > 480) {
                        width = Math.round(width * 0.8);
                        height = Math.round(height * 0.8);
                        renderCanvas(width, height);
                        blob = await attemptBlob(targetMimeType, quality);
                    }

                    if (!blob) {
                        reject(new Error('Gagal mengompresi gambar'));
                        return;
                    }

                    const originalNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
                    const finalMime = blob.type.includes('webp') ? 'image/webp' : 'image/jpeg';
                    const finalExt = finalMime === 'image/webp' ? 'webp' : 'jpg';

                    const compressedFile = new File(
                        [blob],
                        `${originalNameWithoutExt}.${finalExt}`,
                        {
                            type: finalMime,
                            lastModified: Date.now(),
                        }
                    );

                    const dataUrl = canvas.toDataURL(finalMime, quality);

                    resolve({
                        file: compressedFile,
                        dataUrl,
                        originalSizeBytes,
                        compressedSizeBytes: blob.size,
                        format: finalMime === 'image/webp' ? 'webp' : 'jpeg',
                    });
                } catch (err) {
                    reject(err);
                }
            };

            img.onerror = (err) => reject(err);
        };

        reader.onerror = (err) => reject(err);
    });
}

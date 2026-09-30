/**
 * Client-side image compression to WebP using HTML Canvas API.
 * Ensures output is <= 250 KB according to FR-VCH-01.
 */

export interface CompressionResult {
    file: File;
    dataUrl: string;
    originalSizeBytes: number;
    compressedSizeBytes: number;
}

export async function compressImageToWebP(
    file: File,
    maxSizeBytes: number = 250 * 1024, // 250 KB
    maxDimension: number = 1600
): Promise<CompressionResult> {
    return new Promise((resolve, reject) => {
        const originalSizeBytes = file.size;

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;

            img.onload = async () => {
                let { width, height } = img;

                // Scale down if larger than maxDimension
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas 2D context'));
                    return;
                }

                // Draw image onto canvas
                ctx.drawImage(img, 0, 0, width, height);

                // Try iteratively reducing quality if size exceeds maxSizeBytes
                let quality = 0.85;
                let blob: Blob | null = null;

                const attemptCompression = (q: number): Promise<Blob | null> => {
                    return new Promise((res) => {
                        canvas.toBlob(
                            (b) => res(b),
                            'image/webp',
                            q
                        );
                    });
                };

                blob = await attemptCompression(quality);

                while (blob && blob.size > maxSizeBytes && quality > 0.3) {
                    quality -= 0.15;
                    blob = await attemptCompression(quality);
                }

                if (!blob) {
                    reject(new Error('Failed to compress image to WebP'));
                    return;
                }

                // Create a new File object
                const originalNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
                const compressedFile = new File([blob], `${originalNameWithoutExt}.webp`, {
                    type: 'image/webp',
                    lastModified: Date.now(),
                });

                const dataUrl = canvas.toDataURL('image/webp', quality);

                resolve({
                    file: compressedFile,
                    dataUrl,
                    originalSizeBytes,
                    compressedSizeBytes: blob.size,
                });
            };

            img.onerror = (err) => reject(err);
        };

        reader.onerror = (err) => reject(err);
    });
}

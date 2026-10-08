/**
 * Product Image Processing & Lightweight Compression Utility
 * Resizes and compresses product images client-side before saving to IndexedDB / Firestore.
 * Standardizes to square thumbnail (e.g. 240x240 px, JPEG quality ~0.72)
 * Resulting payload is only ~15KB - 30KB per image, keeping database fast and lightweight!
 */

export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.0 - 1.0
  format?: 'image/jpeg' | 'image/webp';
}

/**
 * Compresses an image File or Blob to a lightweight base64 DataURL
 */
export async function compressProductImage(
  fileOrBlob: File | Blob,
  options: CompressImageOptions = {}
): Promise<string> {
  const {
    maxWidth = 320,
    maxHeight = 320,
    quality = 0.72,
    format = 'image/jpeg',
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Gagal membaca berkas gambar.'));
    };

    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onerror = () => {
        reject(new Error('Format berkas gambar tidak didukung.'));
      };

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate aspect ratio keeping max dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) {
            resolve(readerEvent.target?.result as string);
            return;
          }

          // Fill white background for transparent PNGs converted to JPEG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);

          // Use high quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          ctx.drawImage(img, 0, 0, width, height);

          // Export compressed data URI
          const compressedDataUrl = canvas.toDataURL(format, quality);
          resolve(compressedDataUrl);
        } catch (canvasErr) {
          console.warn('Canvas compression error, fallback to original:', canvasErr);
          resolve(readerEvent.target?.result as string);
        }
      };

      img.src = readerEvent.target?.result as string;
    };

    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Returns estimated size of a Base64 string in KB
 */
export function getBase64SizeKB(base64String: string): number {
  if (!base64String) return 0;
  const padding = (base64String.match(/=/g) || []).length;
  const base64Length = base64String.length;
  const bytes = (base64Length * 3) / 4 - padding;
  return Math.round(bytes / 1024);
}

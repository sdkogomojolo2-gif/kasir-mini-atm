import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Trash2, Loader2, Sparkles } from 'lucide-react';
import { compressProductImage, getBase64SizeKB } from '../services/imageCompression';

interface ProductImageUploaderProps {
  currentImageUrl?: string;
  onImageChange: (base64Url?: string) => void;
  productName?: string;
}

export const ProductImageUploader: React.FC<ProductImageUploaderProps> = ({
  currentImageUrl,
  onImageChange,
  productName,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileSizeKB, setFileSizeKB] = useState<number>(() =>
    currentImageUrl ? getBase64SizeKB(currentImageUrl) : 0
  );

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih file gambar (JPG, PNG, atau WebP).');
      return;
    }

    try {
      setIsProcessing(true);
      // Compress to max 320x320 lightweight JPEG (~15-30 KB)
      const compressedDataUrl = await compressProductImage(file, {
        maxWidth: 320,
        maxHeight: 320,
        quality: 0.75,
        format: 'image/jpeg',
      });

      const sizeKB = getBase64SizeKB(compressedDataUrl);
      setFileSizeKB(sizeKB);
      onImageChange(compressedDataUrl);
    } catch (err: any) {
      console.error('Image compression failed:', err);
      alert('Gagal memproses gambar: ' + (err?.message || 'Error tidak diketahui'));
    } finally {
      setIsProcessing(false);
      // Reset inputs so user can pick again if needed
      if (galleryInputRef.current) galleryInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    setFileSizeKB(0);
    onImageChange(undefined);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
          Foto Produk (Opsional):
        </label>
        {currentImageUrl && (
          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Terkompresi (~{fileSizeKB} KB)</span>
          </span>
        )}
      </div>

      {/* Hidden file inputs for Gallery vs Native Camera */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileProcess(e.target.files[0]);
          }
        }}
      />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileProcess(e.target.files[0]);
          }
        }}
      />

      <div className="flex items-center gap-3">
        {/* Preview Frame */}
        <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 flex items-center justify-center shrink-0 shadow-inner group">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <span className="text-[9px] mt-1 font-bold">Kompres...</span>
            </div>
          ) : currentImageUrl ? (
            <>
              <img
                src={currentImageUrl}
                alt={productName || 'Foto Produk'}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                title="Hapus foto"
                className="absolute inset-0 bg-rose-950/70 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Trash2 className="w-5 h-5 text-rose-300" />
                <span className="text-[9px] font-bold mt-0.5">Hapus</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
              <ImageIcon className="w-7 h-7" />
              <span className="text-[9px] font-medium mt-0.5">Tanpa Foto</span>
            </div>
          )}
        </div>

        {/* Action Buttons: Jepret Kamera & Galeri */}
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Camera className="w-4 h-4 shrink-0" />
              <span>Jepret Kamera HP</span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => galleryInputRef.current?.click()}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <ImageIcon className="w-4 h-4 shrink-0" />
              <span>Pilih Galeri</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Foto otomatis diperkecil ke <strong>~25 KB</strong> agar aplikasi tetap cepat & memori HP tidak penuh.
          </p>
        </div>
      </div>
    </div>
  );
};

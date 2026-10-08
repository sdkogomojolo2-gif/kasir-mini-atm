import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  X,
  Scan,
  Keyboard,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
  PlusCircle,
  Upload,
  ExternalLink,
  ShieldAlert,
  Video,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Product } from '../types';
import { sound } from '../services/sound';
import { formatRupiah } from '../services/export';

interface CameraDeviceInfo {
  id: string;
  label: string;
}

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onScanSuccess: (barcode: string) => void;
  darkMode: boolean;
  mode?: 'CASHIER' | 'INPUT';
  cartCount?: number;
  cartTotal?: number;
  onRegisterProduct?: (barcode: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  products,
  onScanSuccess,
  darkMode,
  mode = 'CASHIER',
  cartCount = 0,
  cartTotal = 0,
  onRegisterProduct,
}) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'PERMISSION' | 'OVERCONSTRAINED' | 'NOT_FOUND' | 'OTHER' | null>(null);
  const [availableCameras, setAvailableCameras] = useState<CameraDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isIframe, setIsIframe] = useState<boolean>(false);

  const [lastScanned, setLastScanned] = useState<{
    code: string;
    product?: Product;
    time: number;
  } | null>(null);
  const [unregisteredCode, setUnregisteredCode] = useState<string | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);
  const lastScannedCodeRef = useRef<{ code: string; timestamp: number } | null>(null);
  const CONTAINER_ELEMENT_ID = 'barcode-scanner-viewport-target';
  const isOpenRef = useRef(isOpen);
  const sessionIdRef = useRef(0);

  // Keep isOpenRef updated
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Detect iframe context
  useEffect(() => {
    try {
      setIsIframe(window.self !== window.top);
    } catch {
      setIsIframe(true);
    }
  }, []);

  // Start / Stop camera when modal opens/closes
  useEffect(() => {
    isOpenRef.current = isOpen;
    const currentSession = ++sessionIdRef.current;

    if (isOpen) {
      setCameraError(null);
      setErrorType(null);
      setUnregisteredCode(null);
      setIsInitializing(true);

      // Wait until modal is rendered into DOM and has positive dimensions
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (!isOpenRef.current || currentSession !== sessionIdRef.current) {
          clearInterval(interval);
          return;
        }

        const el = document.getElementById(CONTAINER_ELEMENT_ID);
        if (el && el.clientWidth > 0) {
          clearInterval(interval);
          startScanner();
        } else if (attempts > 20) {
          clearInterval(interval);
          // If still zero or taking long, requestAnimationFrame retry
          requestAnimationFrame(() => {
            if (isOpenRef.current && currentSession === sessionIdRef.current) {
              startScanner();
            }
          });
        }
      }, 75);

      return () => {
        clearInterval(interval);
      };
    } else {
      stopScanner();
      setLastScanned(null);
      setUnregisteredCode(null);
      setCameraActive(false);
      setIsInitializing(false);
    }
  }, [isOpen]);

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      isOpenRef.current = false;
      stopScanner();
    };
  }, []);

  const startScanner = async (targetCameraId?: string) => {
    const currentSession = ++sessionIdRef.current;
    const containerId = CONTAINER_ELEMENT_ID;

    if (!isOpenRef.current) return;

    const element = document.getElementById(containerId);
    if (!element || !document.body.contains(element) || element.clientWidth <= 0) {
      console.warn('Scanner container DOM element not mounted yet');
      return;
    }

    setIsInitializing(true);
    setCameraError(null);
    setErrorType(null);

    // Stop existing running instance cleanly
    if (html5QrCodeRef.current) {
      await stopScanner();
      if (!isOpenRef.current || currentSession !== sessionIdRef.current) return;
    }

    // Verify container element is still present after any stop
    const freshElement = document.getElementById(containerId);
    if (!freshElement || !document.body.contains(freshElement) || freshElement.clientWidth <= 0) {
      return;
    }

    // Clear any stale children inside container
    try {
      freshElement.innerHTML = '';
    } catch {
      // ignore
    }

    const formatsToSupport = [
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.CODE_93,
      Html5QrcodeSupportedFormats.CODABAR,
      Html5QrcodeSupportedFormats.ITF,
      Html5QrcodeSupportedFormats.QR_CODE,
    ];

    let html5QrCode: Html5Qrcode;
    try {
      html5QrCode = new Html5Qrcode(containerId, {
        formatsToSupport,
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });
      html5QrCodeRef.current = html5QrCode;
    } catch (createErr) {
      console.warn('Html5Qrcode instantiation note:', createErr);
      return;
    }

    const config = {
      fps: 15,
      qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const width = Math.floor(minEdge * 0.92);
        const height = Math.floor(width * 0.55);
        return { width, height };
      },
      aspectRatio: 1.333333,
    };

    // Step 1: Detect available cameras to prevent OverconstrainedError on PC/laptop webcams
    let cameras: CameraDeviceInfo[] = [];
    try {
      const detectedCameras = await Html5Qrcode.getCameras();
      if (!isOpenRef.current || currentSession !== sessionIdRef.current) return;
      if (detectedCameras && detectedCameras.length > 0) {
        cameras = detectedCameras;
        setAvailableCameras(detectedCameras);
      }
    } catch (enumErr) {
      console.warn('Enumerate cameras note:', enumErr);
    }

    if (!isOpenRef.current || currentSession !== sessionIdRef.current) return;

    // Step 2: Determine which camera to start
    let chosenSource: string | { facingMode: string } = targetCameraId || selectedCameraId;

    if (!chosenSource || (typeof chosenSource === 'string' && !cameras.some((c) => c.id === chosenSource))) {
      if (cameras.length > 0) {
        // Look for rear/environment camera (optimal for scanning packaging)
        const rearCamera = cameras.find((c) => {
          const l = c.label.toLowerCase();
          return l.includes('back') || l.includes('rear') || l.includes('belakang') || l.includes('environment');
        });
        chosenSource = rearCamera ? rearCamera.id : cameras[0].id;
        setSelectedCameraId(chosenSource);
      } else {
        // No cameras enumerated yet (or permission not yet granted): try environment first
        chosenSource = { facingMode: 'environment' };
      }
    }

    // Step 3: Final check right before hardware start
    const finalElement = document.getElementById(containerId);
    if (!finalElement || !document.body.contains(finalElement) || finalElement.clientWidth <= 0) {
      console.warn('Scanner container unmounted or hidden prior to start');
      return;
    }

    try {
      await html5QrCode.start(
        chosenSource,
        config,
        (decodedText) => {
          handleBarcodeDetected(decodedText.trim());
        },
        () => {
          // Frame evaluation callback (silent)
        }
      );

      if (!isOpenRef.current || currentSession !== sessionIdRef.current) {
        await stopScanner();
        return;
      }

      isScanningRef.current = true;
      setCameraActive(true);
      setIsInitializing(false);
      setCameraError(null);
      setErrorType(null);
    } catch (err: any) {
      if (!isOpenRef.current || currentSession !== sessionIdRef.current) {
        return;
      }

      const errMsg = String(err?.message || err || '');
      if (errMsg.includes('clientWidth') || !document.getElementById(containerId)) {
        console.warn('Camera start aborted due to container unmounting/zero width:', errMsg);
        setIsInitializing(false);
        return;
      }

      console.warn('First camera start failed, trying progressive fallback:', err);

      // Fallback Strategy 1: If environment facingMode threw OverconstrainedError (common on laptop/PC webcams)
      try {
        const fallbackTargetEl = document.getElementById(containerId);
        if (!fallbackTargetEl || !document.body.contains(fallbackTargetEl) || fallbackTargetEl.clientWidth <= 0) {
          return;
        }

        if (typeof chosenSource === 'object') {
          // Try user facing webcam (laptop/PC webcam)
          await html5QrCode.start(
            { facingMode: 'user' },
            config,
            (decodedText) => handleBarcodeDetected(decodedText.trim()),
            () => {}
          );
          if (!isOpenRef.current || currentSession !== sessionIdRef.current) {
            await stopScanner();
            return;
          }
          isScanningRef.current = true;
          setCameraActive(true);
          setIsInitializing(false);
          setCameraError(null);
          return;
        } else if (cameras.length > 1) {
          // Try other camera device ID
          const other = cameras.find((c) => c.id !== chosenSource);
          if (other) {
            await html5QrCode.start(
              other.id,
              config,
              (decodedText) => handleBarcodeDetected(decodedText.trim()),
              () => {}
            );
            if (!isOpenRef.current || currentSession !== sessionIdRef.current) {
              await stopScanner();
              return;
            }
            setSelectedCameraId(other.id);
            isScanningRef.current = true;
            setCameraActive(true);
            setIsInitializing(false);
            setCameraError(null);
            return;
          }
        }
      } catch (fallbackErr: any) {
        err = fallbackErr;
      }

      if (!isOpenRef.current || currentSession !== sessionIdRef.current) {
        return;
      }

      const finalErrMsg = String(err?.message || err || '');
      if (finalErrMsg.includes('clientWidth') || !document.getElementById(containerId)) {
        setIsInitializing(false);
        return;
      }

      // If all attempts failed, diagnose error type accurately
      console.error('Final camera failure:', err);
      setCameraActive(false);
      setIsInitializing(false);
      isScanningRef.current = false;

      const msg = err?.message || String(err);
      if (
        msg.includes('NotAllowedError') ||
        msg.includes('Permission') ||
        msg.includes('denied') ||
        err?.name === 'NotAllowedError'
      ) {
        setErrorType('PERMISSION');
        setCameraError(
          'Izin kamera belum diberikan atau diblokir browser. Klik ikon Gembok/Kamera pada bilah alamat (URL) browser lalu pilih "Izinkan" (Allow).'
        );
      } else if (
        msg.includes('OverconstrainedError') ||
        err?.name === 'OverconstrainedError'
      ) {
        setErrorType('OVERCONSTRAINED');
        setCameraError(
          'Kamera bawaan tidak mendukung mode yang diminta. Klik tombol "Coba Kamera Depan/Webcam" di bawah.'
        );
      } else if (
        msg.includes('NotFoundError') ||
        msg.includes('DevicesNotFoundError') ||
        err?.name === 'NotFoundError'
      ) {
        setErrorType('NOT_FOUND');
        setCameraError(
          'Perangkat kamera atau webcam tidak terdeteksi pada perangkat ini.'
        );
      } else {
        setErrorType('OTHER');
        setCameraError(
          msg || 'Tidak dapat menghubungkan kamera. Pastikan kamera tidak sedang dipakai oleh aplikasi lain (Zoom, Google Meet, dll).'
        );
      }
    }
  };

  const stopScanner = async () => {
    sessionIdRef.current++;
    const instance = html5QrCodeRef.current;
    html5QrCodeRef.current = null;
    isScanningRef.current = false;

    if (instance) {
      try {
        await instance.stop();
      } catch {
        // ignore stop errors
      }
      try {
        instance.clear();
      } catch {
        // ignore clear errors
      }
    }

    setCameraActive(false);
    setIsInitializing(false);
  };

  // Request native permission directly via user click gesture
  const handleExplicitRequestPermission = async () => {
    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Close temporary stream immediately
        stream.getTracks().forEach((track) => track.stop());
      }
      startScanner();
    } catch (e: any) {
      console.warn('Explicit permission request failed:', e);
      startScanner();
    }
  };

  // Main barcode detected handler
  const handleBarcodeDetected = (barcode: string) => {
    if (!barcode) return;

    // Debounce to prevent multi-triggering within 1.2 seconds for the exact same barcode
    const now = Date.now();
    if (
      lastScannedCodeRef.current &&
      lastScannedCodeRef.current.code === barcode &&
      now - lastScannedCodeRef.current.timestamp < 1200
    ) {
      return;
    }

    lastScannedCodeRef.current = { code: barcode, timestamp: now };

    // Vibrate device if supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate?.([60]);
      } catch {
        // ignore
      }
    }

    // Play scanner register beep
    sound.playBeep(880, 0.08);

    // Look up product
    const matchedProduct = products.find(
      (p) => p.barcode === barcode || p.barcode.endsWith(barcode) || barcode.endsWith(p.barcode)
    );

    setLastScanned({
      code: barcode,
      product: matchedProduct,
      time: now,
    });

    if (matchedProduct) {
      setUnregisteredCode(null);
      onScanSuccess(barcode);

      // In INPUT mode (e.g. adding product in inventory), close after scan
      if (mode === 'INPUT') {
        setTimeout(() => {
          onClose();
        }, 300);
      }
    } else {
      if (mode === 'CASHIER') {
        sound.playError();
        setUnregisteredCode(barcode);
      } else {
        // In input mode, even unlisted barcode is valid as new barcode
        onScanSuccess(barcode);
        setTimeout(() => {
          onClose();
        }, 300);
      }
    }
  };

  // Switch camera when user selects a specific camera device
  const handleSelectCamera = async (cameraId: string) => {
    setSelectedCameraId(cameraId);
    await startScanner(cameraId);
  };

  // Switch between back / front camera
  const handleToggleCamera = async () => {
    if (availableCameras.length > 1) {
      const currentIndex = availableCameras.findIndex((c) => c.id === selectedCameraId);
      const nextIndex = (currentIndex + 1) % availableCameras.length;
      handleSelectCamera(availableCameras[nextIndex].id);
    } else {
      startScanner();
    }
  };

  // Manual barcode form submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    const code = manualCode.trim();
    handleBarcodeDetected(code);
    setManualCode('');
  };

  // Scan from uploaded file / photo
  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const tempScanner = new Html5Qrcode(CONTAINER_ELEMENT_ID, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });

      const decodedText = await tempScanner.scanFile(file, true);
      if (decodedText) {
        handleBarcodeDetected(decodedText.trim());
      }
    } catch {
      alert('Barcode tidak terbaca pada foto ini. Pastikan foto tegak lurus, garis barcode tajam, dan tidak buram.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="scanner-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
    >
      <div
        id="scanner-modal-card"
        className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border my-auto ${
          darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                {mode === 'CASHIER'
                  ? 'Pemindai Barcode Kemasan Kasir'
                  : 'Scan Barcode Kemasan Produk'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {mode === 'CASHIER'
                  ? 'Arahkan kamera ke kemasan, otomatis masuk ke keranjang'
                  : 'Scan barcode pada kemasan untuk mengisi form produk'}
              </p>
            </div>
          </div>
          <button
            id="btn-close-scanner"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real-time Camera Viewport */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="relative w-full h-72 bg-black rounded-2xl overflow-hidden flex items-center justify-center border border-slate-700 shadow-inner">
            {/* HTML5-QRCode Mount Point with guaranteed dimensions */}
            <div
              id={CONTAINER_ELEMENT_ID}
              className="w-full h-full min-h-[260px] object-cover"
              style={{ minHeight: '260px', width: '100%' }}
            />

            {/* Visual Laser Guide Overlay */}
            {cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4">
                <div className="w-4/5 h-32 border-2 border-dashed border-pink-400/90 rounded-xl relative flex items-center justify-center bg-purple-500/10 backdrop-brightness-110 shadow-lg shadow-purple-500/20">
                  {/* Glowing Laser Scan Line */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-pink-400 to-transparent animate-pulse shadow-sm shadow-pink-400" />
                  <span className="absolute -bottom-6 text-[10px] font-bold text-white bg-slate-950/85 px-2.5 py-0.5 rounded-full border border-pink-500/40">
                    Arahkan Barcode Kemasan ke Kotak Ini
                  </span>
                </div>
              </div>
            )}

            {/* Camera Switcher & Controls */}
            {cameraActive && availableCameras.length > 1 && (
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  className="p-2 rounded-xl bg-slate-900/85 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center gap-1 border border-white/20 backdrop-blur-xs cursor-pointer shadow-md"
                  title="Ganti Kamera"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Putar Kamera</span>
                </button>
              </div>
            )}

            {/* Camera Error / Inactive State */}
            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center bg-slate-950/95 space-y-3 z-20 overflow-y-auto">
                <div className="p-3 rounded-2xl bg-purple-500/20 text-pink-400">
                  {errorType === 'PERMISSION' ? (
                    <ShieldAlert className="w-8 h-8 text-amber-400" />
                  ) : (
                    <Camera className="w-8 h-8" />
                  )}
                </div>

                <div className="max-w-sm space-y-1">
                  <p className="text-xs sm:text-sm font-bold text-slate-100">
                    {isInitializing
                      ? 'Menghubungkan ke Kamera...'
                      : errorType === 'PERMISSION'
                      ? 'Izin Akses Kamera Belum Diberikan'
                      : 'Kamera Belum Aktif'}
                  </p>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {cameraError ||
                      'Pastikan webcam/kamera terpasang dan browser telah diizinkan untuk mengakses kamera.'}
                  </p>
                </div>

                {/* Specific Action Buttons Based on Diagnosed Issue */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1 max-w-sm">
                  {/* Primary Re-trigger / Allow Button */}
                  <button
                    type="button"
                    onClick={handleExplicitRequestPermission}
                    className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-black rounded-xl cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>{errorType === 'PERMISSION' ? 'Izinkan & Nyalakan Kamera' : 'Nyalakan Ulang Kamera'}</span>
                  </button>

                  {/* If embedded in iframe (AI Studio preview), provide open in new tab */}
                  {isIframe && (
                    <button
                      type="button"
                      onClick={() => window.open(window.location.href, '_blank')}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-pink-300 text-xs font-bold rounded-xl border border-pink-500/30 flex items-center gap-1.5 cursor-pointer"
                      title="Buka aplikasi di tab baru browser untuk memberikan izin kamera penuh tanpa batasan iframe"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka di Tab Baru</span>
                    </button>
                  )}

                  {/* Native Mobile Camera Photo / Upload Fallback */}
                  <label className="px-3 py-2 bg-slate-800 text-slate-200 text-xs font-bold rounded-xl hover:bg-slate-700 border border-slate-700 cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all">
                    <Upload className="w-3.5 h-3.5 text-pink-400" />
                    <span>Foto / Upload Barcode</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileScan}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Helpful Instruction Tip */}
                <div className="text-[10px] text-slate-400 bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 max-w-sm text-left">
                  <div className="font-bold text-slate-300 mb-0.5 flex items-center gap-1">
                    <span>💡 Tips Mengaktifkan Kamera:</span>
                  </div>
                  <ul className="list-disc pl-3.5 space-y-0.5 text-slate-400">
                    <li>
                      Klik ikon <b>Gembok / Setelan Situs</b> di kiri bilah URL browser ➔ ubah <b>Kamera</b> menjadi <b>Izinkan (Allow)</b>.
                    </li>
                    <li>
                      Atau gunakan kamera smartphone Anda dengan mengeklik tombol <b>Foto / Upload Barcode</b> di atas.
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Success Toast Overlay on Scanner */}
            {lastScanned && (
              <div className="absolute top-3 inset-x-3 bg-emerald-600 text-white py-2 px-3 rounded-xl flex items-center justify-between gap-2 text-xs font-bold shadow-xl border border-emerald-400 animate-in fade-in zoom-in-95 duration-150 z-30">
                <div className="flex items-center gap-2 truncate">
                  <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
                  <div className="truncate">
                    <span className="font-mono text-[10px] bg-emerald-800/60 px-1 py-0.5 rounded mr-1">
                      {lastScanned.code}
                    </span>
                    <span className="truncate">
                      {lastScanned.product
                        ? `+1 ${lastScanned.product.name} (${formatRupiah(lastScanned.product.sellPrice)})`
                        : 'Barcode Terbaca'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] bg-white text-emerald-800 px-2 py-0.5 rounded-full font-black shrink-0">
                  MASUK KERANJANG
                </span>
              </div>
            )}

            {/* Unregistered Product Notice */}
            {unregisteredCode && (
              <div className="absolute inset-x-3 bottom-3 bg-rose-600 text-white p-3 rounded-xl flex items-center justify-between gap-2 text-xs shadow-xl border border-rose-400 animate-in fade-in slide-in-from-bottom-2 duration-150 z-30">
                <div className="flex items-center gap-2 truncate">
                  <AlertCircle className="w-5 h-5 text-rose-200 shrink-0" />
                  <div className="truncate">
                    <div className="font-bold">Barang Belum Terdaftar!</div>
                    <div className="text-[10px] font-mono text-rose-200 truncate">
                      Barcode: {unregisteredCode}
                    </div>
                  </div>
                </div>
                {onRegisterProduct && (
                  <button
                    type="button"
                    onClick={() => {
                      onRegisterProduct(unregisteredCode);
                      onClose();
                    }}
                    className="px-2.5 py-1.5 bg-white text-rose-700 font-extrabold text-[11px] rounded-lg hover:bg-rose-50 flex items-center gap-1 shrink-0 cursor-pointer shadow-sm"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Daftarkan</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Camera Selection Dropdown if multiple cameras are available */}
          {availableCameras.length > 1 && (
            <div className="flex items-center justify-between gap-2 px-1 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Pilih Kamera:</span>
              <select
                value={selectedCameraId}
                onChange={(e) => handleSelectCamera(e.target.value)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium focus:outline-none focus:ring-1 focus:ring-purple-500 max-w-xs truncate ${
                  darkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-200'
                    : 'bg-white border-slate-300 text-slate-700'
                }`}
              >
                {availableCameras.map((cam, idx) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label || `Kamera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Running Cart Mini Bar for Cashier */}
          {mode === 'CASHIER' && (
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-purple-600 dark:text-pink-400" />
                <span className="text-xs font-bold text-purple-900 dark:text-pink-200">
                  Status Keranjang Saat Ini:
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black font-mono text-purple-700 dark:text-pink-300">
                  {cartCount} item
                </span>
                <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {formatRupiah(cartTotal)}
                </span>
              </div>
            </div>
          )}

          {/* Manual Input or USB Scanner Gun Input */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Keyboard className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                id="input-manual-barcode"
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Scan dengan scanner USB / ketik nomor barcode kemasan..."
                className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  darkMode
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                }`}
                autoFocus
              />
            </div>
            <button
              id="btn-submit-manual-barcode"
              type="submit"
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs sm:text-sm rounded-xl cursor-pointer shrink-0 shadow-sm"
            >
              + Masukkan
            </button>
          </form>

          {/* Quick Simulation Barcodes */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
              <div className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                <span>UJI COBA SCAN BARANG KELONTONG CEPAT:</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Klik untuk tes scan</span>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
              {products.slice(0, 8).map((prod) => (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => handleBarcodeDetected(prod.barcode)}
                  className={`text-left p-2 rounded-xl border text-xs transition-all hover:scale-[1.01] flex items-center justify-between cursor-pointer ${
                    darkMode
                      ? 'bg-slate-800/60 border-slate-700 hover:border-purple-500 text-slate-200'
                      : 'bg-slate-50 border-slate-200 hover:border-purple-500 text-slate-800'
                  }`}
                >
                  <div className="truncate pr-1">
                    <div className="font-bold truncate">{prod.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{prod.barcode}</div>
                  </div>
                  <span className="text-[10px] font-black text-pink-600 dark:text-pink-400 shrink-0">
                    + Scan
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {mode === 'CASHIER'
              ? 'Mode scan beruntun aktif. Scan semua belanjaan lalu tutup.'
              : 'Scan kemasan untuk mengisi kode barcode otomatis.'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs rounded-xl hover:opacity-90 cursor-pointer shadow-md"
          >
            {mode === 'CASHIER' ? 'Selesai & Ke Keranjang' : 'Tutup'}
          </button>
        </div>
      </div>
    </div>
  );
};


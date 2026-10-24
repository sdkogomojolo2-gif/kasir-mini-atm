import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  Laptop,
  CheckCircle,
  X,
  ExternalLink,
  Sparkles,
  Share2,
  PlusSquare,
  Monitor,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { isIframeEnvironment, openAppInNewTab } from '../services/bluetoothPrinter';

interface PWAInstallPromptProps {
  variant?: 'banner' | 'header-button' | 'settings-card';
  darkMode?: boolean;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  variant = 'header-button',
  darkMode = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'android' | 'ios' | 'laptop'>('android');
  const inIframe = isIframeEnvironment();

  const handleInstallClick = async () => {
    if (inIframe) {
      // In iframe preview, open in new tab and show guide
      openAppInNewTab();
      setIsGuideModalOpen(true);
      return;
    }

    if (isInstallable) {
      const outcome = await install();
      if (!outcome) {
        setIsGuideModalOpen(true);
      }
    } else {
      setIsGuideModalOpen(true);
    }
  };

  // Render Installation Guide Modal
  const renderGuideModal = () => {
    if (!isGuideModalOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/70 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-900 dark:text-slate-100">
          {/* Header */}
          <div className="p-5 border-b border-blue-800 flex items-center justify-between bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 text-white">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white text-blue-700 flex items-center justify-center font-black text-xl shadow-md">
                🏧
              </div>
              <div>
                <h3 className="font-extrabold text-base tracking-tight text-white">
                  Pasang MINI ATM-Q di Perangkat
                </h3>
                <p className="text-xs text-blue-100">
                  Tersedia untuk HP Android, iPhone, dan Laptop / Desktop
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsGuideModalOpen(false)}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Device Tabs */}
          <div className="p-3 bg-blue-50/70 dark:bg-slate-950 border-b border-blue-100 dark:border-slate-800 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveGuideTab('android')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeGuideTab === 'android'
                  ? 'bg-blue-600 text-white shadow-md font-black'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-blue-200 dark:border-slate-800 hover:bg-blue-50'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>HP Android</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveGuideTab('laptop')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeGuideTab === 'laptop'
                  ? 'bg-blue-600 text-white shadow-md font-black'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-blue-200 dark:border-slate-800 hover:bg-blue-50'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Laptop / PC</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveGuideTab('ios')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeGuideTab === 'ios'
                  ? 'bg-blue-600 text-white shadow-md font-black'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-blue-200 dark:border-slate-800 hover:bg-blue-50'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>iPhone (iOS)</span>
            </button>
          </div>

          {/* Guide Steps Body */}
          <div className="p-6 space-y-4 overflow-y-auto">
            {activeGuideTab === 'android' && (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 dark:bg-slate-950 border border-blue-200 dark:border-slate-800 rounded-2xl flex items-center gap-3">
                  <img
                    src="/icon.svg"
                    alt="Ikon MINI ATM-Q"
                    className="w-11 h-11 rounded-xl shadow-sm shrink-0"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400">
                      Nama &amp; Ikon Aplikasi: <span className="font-black text-sm text-blue-950 dark:text-white">MINI ATM-Q</span>
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Ikon Mesin EDC Mini ATM Biru-Putih. Berfungsi offline &amp; terhubung ke printer thermal Bluetooth.
                    </p>
                  </div>
                </div>

                <ol className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-mono font-bold flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div>
                      Buka aplikasi melalui browser <strong className="text-blue-950 dark:text-white">Google Chrome</strong> di HP Anda.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-mono font-bold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div>
                      Ketuk menu titik tiga <strong className="text-blue-950 dark:text-white">(⋮)</strong> di sudut kanan atas Chrome.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-mono font-black flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div>
                      Pilih menu <strong className="text-blue-950 dark:text-white">"Pasang aplikasi" (Install app)</strong> atau <strong className="text-blue-950 dark:text-white">"Tambahkan ke Layar Utama"</strong>.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-mono font-bold flex items-center justify-center shrink-0">
                      4
                    </span>
                    <div>
                      Konfirmasi nama tampilan <strong className="text-blue-950 dark:text-white">MINI ATM-Q</strong> lalu klik Pasang / Install. Ikon Mini ATM Biru-Putih akan muncul di layar HP Anda!
                    </div>
                  </li>
                </ol>
              </div>
            )}

            {activeGuideTab === 'laptop' && (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 dark:bg-slate-950 border border-blue-200 dark:border-slate-800 rounded-2xl flex items-center gap-3">
                  <img
                    src="/icon.svg"
                    alt="Ikon MINI ATM-Q"
                    className="w-11 h-11 rounded-xl shadow-sm shrink-0"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400">
                      Aplikasi Desktop: <span className="font-black text-sm text-blue-950 dark:text-white">MINI ATM-Q</span>
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Mendukung layar penuh (F11), barcode scanner USB/Bluetooth, dan printer thermal 58mm/80mm.
                    </p>
                  </div>
                </div>

                <ol className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-mono font-bold flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div>
                      Gunakan browser <strong className="text-blue-950 dark:text-white">Google Chrome</strong>, <strong className="text-blue-950 dark:text-white">Microsoft Edge</strong>, atau browser berbasis Chromium lainnya di Laptop / PC.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-mono font-black flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div>
                      Lihat ikon instal di bilah alamat URL (di sebelah kanan bintang bookmark) yang berbentuk komputer dengan panah ke bawah <Download className="inline w-3.5 h-3.5 text-blue-600" />.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-mono font-bold flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div>
                      Klik <strong className="text-blue-950 dark:text-white">"Instal MINI ATM-Q"</strong>. MINI ATM-Q akan langsung terbuka di jendela mandiri tanpa tab browser!
                    </div>
                  </li>
                </ol>
              </div>
            )}

            {activeGuideTab === 'ios' && (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 dark:bg-slate-950 border border-blue-200 dark:border-slate-800 rounded-2xl flex items-center gap-3">
                  <img
                    src="/icon.svg"
                    alt="Ikon MINI ATM-Q"
                    className="w-11 h-11 rounded-xl shadow-sm shrink-0"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400">
                      Nama Aplikasi di iOS: <span className="font-black text-sm text-blue-950 dark:text-white">MINI ATM-Q</span>
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      PWA resmi Apple iOS dengan ikon Mini ATM Biru-Putih.
                    </p>
                  </div>
                </div>

                <ol className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-mono font-bold flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div>
                      Buka tautan aplikasi di browser bawaan <strong className="text-blue-950 dark:text-white">Safari</strong> di iPhone atau iPad.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-mono font-black flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div>
                      Ketuk tombol <strong className="text-blue-950 dark:text-white">Bagikan (Share)</strong> di bagian bawah layar (ikon kotak dengan panah ke atas).
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-mono font-bold flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div>
                      Gulir ke bawah dan ketuk <strong className="text-blue-950 dark:text-white">"Tambah ke Layar Utama" (Add to Home Screen)</strong>.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-mono font-bold flex items-center justify-center shrink-0">
                      4
                    </span>
                    <div>
                      Pastikan judul bernama <strong className="text-blue-950 dark:text-white">MINI ATM-Q</strong>, lalu ketuk <strong className="text-blue-950 dark:text-white">Tambah (Add)</strong> di pojok kanan atas.
                    </div>
                  </li>
                </ol>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-4 bg-blue-50/60 dark:bg-slate-950 border-t border-blue-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => openAppInNewTab()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-2 transition-colors cursor-pointer shadow-md"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Buka Tautan Tab Penuh</span>
            </button>
            <button
              type="button"
              onClick={() => setIsGuideModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 text-xs font-bold transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    );
  };

  // If already installed as standalone PWA
  if (isInstalled) {
    if (variant === 'settings-card') {
      return (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
              MINI ATM-Q Sudah Terpasang (Mode Standalone)
            </h4>
            <p className="text-xs text-emerald-600 dark:text-emerald-400/80">
              Aplikasi berjalan langsung dari perangkat tanpa bilah browser. Printer thermal Bluetooth dan cetak struk instan bekerja optimal.
            </p>
          </div>
        </div>
      );
    }
    return null;
  }

  // Header Button Variant
  if (variant === 'header-button') {
    return (
      <>
        <button
          id="btn-pwa-header-install"
          type="button"
          onClick={handleInstallClick}
          title="Pasang MINI ATM-Q di HP atau Laptop"
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-sm shadow-blue-600/20 active:scale-95 transition-all cursor-pointer shrink-0 whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden md:inline">Pasang MINI ATM-Q</span>
          <span className="hidden sm:inline md:hidden">Pasang</span>
        </button>
        {renderGuideModal()}
      </>
    );
  }

  // Settings Card Variant
  if (variant === 'settings-card') {
    return (
      <>
        <div className="p-4 rounded-2xl border border-blue-200 dark:border-slate-800 bg-blue-50/60 dark:bg-slate-900 space-y-3">
          <div className="flex items-start gap-3">
            <img
              src="/icon.svg"
              alt="Ikon MINI ATM-Q"
              className="w-11 h-11 rounded-xl shadow-md shrink-0"
            />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-blue-950 dark:text-white flex items-center gap-2">
                <span>Pasang Aplikasi MINI ATM-Q</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-600 text-white font-mono">
                  PWA
                </span>
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Pasang langsung ke Layar Utama HP (Android &amp; iPhone) atau Desktop Laptop (Windows &amp; Mac) dengan nama tampilan <strong className="text-blue-900 dark:text-white">MINI ATM-Q</strong> dan ikon mesin EDC Mini ATM Biru-Putih.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Instal MINI ATM-Q Sekarang</span>
            </button>
            <button
              type="button"
              onClick={() => setIsGuideModalOpen(true)}
              className="px-3 py-2 bg-white hover:bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-600" />
              <span>Petunjuk HP &amp; Laptop</span>
            </button>
          </div>
        </div>
        {renderGuideModal()}
      </>
    );
  }

  // Floating Banner Variant (shown on mobile/desktop until dismissed)
  if (dismissed) return null;

  return (
    <>
      <div className="fixed bottom-16 lg:bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-40 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-800 shadow-2xl space-y-2.5 text-slate-900 dark:text-slate-100 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <img
              src="/icon.svg"
              alt="Ikon MINI ATM-Q"
              className="w-10 h-10 rounded-xl shadow-sm shrink-0"
            />
            <div>
              <h4 className="text-sm font-extrabold text-blue-950 dark:text-white">
                Pasang MINI ATM-Q di Perangkat
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Akses cepat di HP &amp; Laptop dengan Ikon Mini ATM
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-md transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Pasang Sekarang</span>
          </button>
          <button
            type="button"
            onClick={() => setIsGuideModalOpen(true)}
            className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold rounded-xl border border-blue-200 cursor-pointer"
          >
            Petunjuk
          </button>
        </div>
      </div>
      {renderGuideModal()}
    </>
  );
};

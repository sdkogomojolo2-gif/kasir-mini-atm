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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-zinc-100">
          {/* Header */}
          <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-black text-lg">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-base tracking-tight text-white">
                  Pasang Kasir-Q di Perangkat
                </h3>
                <p className="text-xs text-zinc-400">
                  Tersedia untuk HP Android, iPhone, dan Laptop / Desktop
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsGuideModalOpen(false)}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Device Tabs */}
          <div className="p-3 bg-zinc-950 border-b border-zinc-800 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveGuideTab('android')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeGuideTab === 'android'
                  ? 'bg-amber-500 text-zinc-950 shadow-md font-black'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200'
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
                  ? 'bg-amber-500 text-zinc-950 shadow-md font-black'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200'
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
                  ? 'bg-amber-500 text-zinc-950 shadow-md font-black'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200'
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
                <div className="p-3 bg-zinc-950 border border-amber-500/20 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center font-black text-sm shrink-0">
                    Q
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-400">
                      Nama Aplikasi di Layar: <span className="font-black text-sm text-white">Kasir-Q</span>
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      Berfungsi offline tanpa sinyal & terhubung langsung ke printer thermal Bluetooth.
                    </p>
                  </div>
                </div>

                <ol className="space-y-3 text-xs text-zinc-300">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-zinc-800 text-amber-400 font-mono font-bold flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div>
                      Buka aplikasi melalui browser <strong className="text-white">Google Chrome</strong> di HP Anda.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-zinc-800 text-amber-400 font-mono font-bold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div>
                      Ketuk menu titik tiga <strong className="text-white">(⋮)</strong> di sudut kanan atas Chrome.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-zinc-950 font-mono font-black flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div>
                      Pilih menu <strong className="text-white">"Pasang aplikasi" (Install app)</strong> atau <strong className="text-white">"Tambahkan ke Layar Utama"</strong>.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-zinc-800 text-amber-400 font-mono font-bold flex items-center justify-center shrink-0">
                      4
                    </span>
                    <div>
                      Konfirmasi nama tampilan <strong className="text-white">Kasir-Q</strong> lalu klik Pasang / Install. Ikon Kasir-Q akan muncul di daftar aplikasi HP Anda!
                    </div>
                  </li>
                </ol>
              </div>
            )}

            {activeGuideTab === 'laptop' && (
              <div className="space-y-3">
                <div className="p-3 bg-zinc-950 border border-amber-500/20 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center font-black text-sm shrink-0">
                    Q
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-400">
                      Aplikasi Desktop: <span className="font-black text-sm text-white">Kasir-Q</span>
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      Mendukung layar penuh (F11), barcode scanner USB/Bluetooth, dan printer thermal 58mm/80mm.
                    </p>
                  </div>
                </div>

                <ol className="space-y-3 text-xs text-zinc-300">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-zinc-800 text-amber-400 font-mono font-bold flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div>
                      Gunakan browser <strong className="text-white">Google Chrome</strong>, <strong className="text-white">Microsoft Edge</strong>, atau browser berbasis Chromium lainnya di Laptop / PC.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-zinc-950 font-mono font-black flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div>
                      Lihat ikon instal di bilah alamat URL (di sebelah kanan bintang bookmark) yang berbentuk komputer dengan panah ke bawah <Download className="inline w-3.5 h-3.5 text-amber-400" />.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-zinc-800 text-amber-400 font-mono font-bold flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div>
                      Klik <strong className="text-white">"Instal Kasir-Q"</strong>. Kasir-Q akan langsung terbuka di jendela mandiri tanpa tab browser!
                    </div>
                  </li>
                </ol>
              </div>
            )}

            {activeGuideTab === 'ios' && (
              <div className="space-y-3">
                <div className="p-3 bg-zinc-950 border border-amber-500/20 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center font-black text-sm shrink-0">
                    Q
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-400">
                      Nama Aplikasi di iOS: <span className="font-black text-sm text-white">Kasir-Q</span>
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      PWA resmi Apple iOS dengan performa lancar layaknya aplikasi App Store.
                    </p>
                  </div>
                </div>

                <ol className="space-y-3 text-xs text-zinc-300">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-zinc-800 text-amber-400 font-mono font-bold flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div>
                      Buka tautan aplikasi di browser bawaan <strong className="text-white">Safari</strong> di iPhone atau iPad.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-zinc-950 font-mono font-black flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div>
                      Ketuk tombol <strong className="text-white">Bagikan (Share)</strong> di bagian bawah layar (ikon kotak dengan panah ke atas).
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-zinc-800 text-amber-400 font-mono font-bold flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div>
                      Gulir ke bawah dan ketuk <strong className="text-white">"Tambah ke Layar Utama" (Add to Home Screen)</strong>.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-zinc-800 text-amber-400 font-mono font-bold flex items-center justify-center shrink-0">
                      4
                    </span>
                    <div>
                      Pastikan judul bernama <strong className="text-white">Kasir-Q</strong>, lalu ketuk <strong className="text-white">Tambah (Add)</strong> di pojok kanan atas.
                    </div>
                  </li>
                </ol>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => openAppInNewTab()}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black flex items-center gap-2 transition-colors cursor-pointer shadow-md"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Buka Tautan Tab Penuh</span>
            </button>
            <button
              type="button"
              onClick={() => setIsGuideModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white text-xs font-bold transition-colors cursor-pointer"
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
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-emerald-300">
              Kasir-Q Sudah Terpasang (Mode Standalone)
            </h4>
            <p className="text-xs text-emerald-400/80">
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
          title="Pasang Kasir-Q di HP atau Laptop"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-md active:scale-95 transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Pasang Kasir-Q</span>
          <span className="sm:hidden">Pasang</span>
        </button>
        {renderGuideModal()}
      </>
    );
  }

  // Settings Card Variant
  if (variant === 'settings-card') {
    return (
      <>
        <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center font-black text-lg shrink-0 shadow-md">
              Q
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Pasang Aplikasi Kasir-Q</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-zinc-950 font-mono">
                  PWA
                </span>
              </h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Pasang langsung ke Layar Utama HP (Android &amp; iPhone) atau Desktop Laptop (Windows &amp; Mac) dengan nama tampilan <strong className="text-white">Kasir-Q</strong>. Akses kasir tanpa bilah browser dan cetak printer lancar.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Instal Kasir-Q Sekarang</span>
            </button>
            <button
              type="button"
              onClick={() => setIsGuideModalOpen(true)}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
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
      <div className="fixed bottom-16 md:bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40 p-4 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl space-y-3 text-zinc-100 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center font-black text-lg shadow-sm">
              Q
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-white">
                Pasang Kasir-Q di Perangkat
              </h4>
              <p className="text-[11px] text-zinc-400">
                Akses cepat di HP &amp; Laptop tanpa unduh Play Store
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black rounded-xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-md transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Pasang Sekarang</span>
          </button>
          <button
            type="button"
            onClick={() => setIsGuideModalOpen(true)}
            className="py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl border border-zinc-700 cursor-pointer"
          >
            Petunjuk
          </button>
        </div>
      </div>
      {renderGuideModal()}
    </>
  );
};

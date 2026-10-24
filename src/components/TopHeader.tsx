import React, { useState, useEffect } from 'react';
import {
  Menu,
  ChevronLeft,
  Wifi,
  Moon,
  Sun,
  Clock,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { CashierShift, StoreSettings, StoreBranch, CashierUser } from '../types';
import { TabType } from './Sidebar';
import { isIframeEnvironment, openAppInNewTab } from '../services/bluetoothPrinter';
import { PWAInstallPrompt } from './PWAInstallPrompt';

interface TopHeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  settings: StoreSettings;
  activeShift: CashierShift | null;
  onOpenShiftModal: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  cloudSyncStatus?: 'ONLINE' | 'OFFLINE' | 'SYNCED';
  onToggleMobileSidebar: () => void;
  branches?: StoreBranch[];
  activeBranchId?: string;
  onSelectBranch?: (branchId: string) => void;
  currentUser?: CashierUser | null;
}

const TAB_TITLES: Record<TabType, { title: string; shortTitle: string; subtitle: string }> = {
  dashboard: {
    title: 'Beranda Konter',
    shortTitle: 'Beranda Konter',
    subtitle: '',
  },
  'digital-sales': {
    title: 'Catat Penjualan Non-Fisik (Pulsa & Layanan)',
    shortTitle: 'Penjualan Non-Fisik',
    subtitle: '',
  },
  cashier: {
    title: 'Catat Penjualan Fisik (Barang Konter)',
    shortTitle: 'Penjualan Fisik',
    subtitle: '',
  },
  branches: {
    title: 'Uang Kas & Rekening Bank',
    shortTitle: 'Uang Kas & Bank',
    subtitle: '',
  },
  inventory: {
    title: 'Stok Barang & Pulsa',
    shortTitle: 'Stok Barang',
    subtitle: '',
  },
  debts: {
    title: 'Catatan Hutang / Kasbon',
    shortTitle: 'Catatan Kasbon',
    subtitle: '',
  },
  reports: {
    title: 'Laporan Untung Rugi',
    shortTitle: 'Laporan Kasir',
    subtitle: '',
  },
  settings: {
    title: 'Pengaturan Toko',
    shortTitle: 'Pengaturan',
    subtitle: '',
  },
  guide: {
    title: 'Buku Panduan Kasir',
    shortTitle: 'Panduan Kasir',
    subtitle: '',
  },
};

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  setActiveTab,
  settings,
  activeShift,
  onOpenShiftModal,
  darkMode,
  setDarkMode,
  cloudSyncStatus = 'SYNCED',
  onToggleMobileSidebar,
  branches = [],
  activeBranchId,
  currentUser,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setCurrentDate(
        now.toLocaleDateString('id-ID', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const info = TAB_TITLES[activeTab] || TAB_TITLES.dashboard;
  const isCashier = currentUser?.role === 'KASIR';
  const assignedBranchId = isCashier ? (currentUser?.branchId || activeBranchId) : activeBranchId;
  const activeBranch = branches.find((b) => b.id === assignedBranchId) || branches[0];

  return (
    <header
      id="top-header-bar"
      className="h-14 sm:h-16 px-2.5 sm:px-5 border-b shrink-0 flex items-center justify-between gap-2 transition-colors sticky top-0 z-20 backdrop-blur-md bg-white/95 dark:bg-slate-900/95 border-blue-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs overflow-hidden"
    >
      {/* Left: Mobile/Tablet Drawer Toggle + Breadcrumb & Single-Line Title */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 overflow-hidden">
        {/* Hamburger Menu Button (Visible on Mobile & Tablet < 1024px) */}
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl border border-blue-200 dark:border-slate-800 text-blue-700 dark:text-slate-300 bg-blue-50/70 dark:bg-slate-900 hover:bg-blue-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          title="Buka Menu Navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Back Chevron to Dashboard if not on Dashboard */}
        {activeTab !== 'dashboard' && (
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-xl border border-blue-200 dark:border-slate-800 bg-blue-50/50 dark:bg-slate-900 hover:bg-blue-100 dark:hover:bg-slate-800 text-blue-700 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
            title="Kembali ke Beranda"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Title (Single line, never wraps or spills over) */}
        <div className="min-w-0 flex-1 overflow-hidden">
          <h2 className="text-sm sm:text-base lg:text-lg font-black tracking-tight text-slate-900 dark:text-slate-50 truncate whitespace-nowrap">
            <span className="md:hidden">{info.shortTitle}</span>
            <span className="hidden md:inline">{info.title}</span>
          </h2>
        </div>
      </div>

      {/* Right Action Bar: Compact on Mobile/Tablet, Full on Desktop */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Active Branch Indicator (Visible from sm upwards) */}
        {branches && branches.length > 0 && (
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-black shrink-0 ${
              isCashier
                ? 'border-blue-300 bg-blue-50 text-blue-900 dark:text-blue-200 dark:bg-blue-950/60 dark:border-blue-800'
                : 'border-blue-200 dark:border-slate-800 bg-blue-50/70 dark:bg-slate-900 text-blue-900 dark:text-slate-100'
            }`}
            title={isCashier ? `Lokasi Bertugas: ${activeBranch?.name || 'Cabang'}` : 'Mode Administrator: Mengawasi Seluruh Cabang'}
          >
            <span className="text-xs">{isCashier ? '🔒' : '🏢'}</span>
            <span className="max-w-[90px] md:max-w-[130px] truncate">
              {isCashier ? (activeBranch?.name || 'Cabang') : 'Semua Cabang'}
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                isCashier
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-700 text-white'
              }`}
            >
              {isCashier ? 'Kasir' : 'Admin'}
            </span>
          </div>
        )}

        {/* Real-time Clock (Desktop xl+ only so Tablet stays clean) */}
        <div className="hidden xl:flex flex-col text-right font-mono shrink-0">
          <span className="text-xs font-black text-blue-950 dark:text-slate-100 leading-tight">
            {currentTime} WIB
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            {currentDate}
          </span>
        </div>

        {/* Cloud Sync Status Badge (Desktop xl+ only) */}
        <div
          title={
            cloudSyncStatus === 'SYNCED'
              ? `Database Cloud Aktif${
                  settings.firebaseCustomConfig?.projectId
                    ? ` (Proyek: ${settings.firebaseCustomConfig.projectId})`
                    : ''
                }`
              : 'Mode Offline Mandiri (Data Aman di Penyimpanan Perangkat)'
          }
          className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-blue-200 dark:border-slate-800 bg-blue-50/70 dark:bg-slate-900 text-blue-950 dark:text-slate-100 text-xs font-black shrink-0"
        >
          {cloudSyncStatus === 'SYNCED' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-black truncate max-w-[110px]">
                {settings.firebaseCustomConfig?.projectId
                  ? `Cloud: ${settings.firebaseCustomConfig.projectId}`
                  : 'Cloud Aktif'}
              </span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-[11px] font-black">Mode Offline</span>
            </>
          )}
        </div>

        {/* Open in new tab button for full hardware access */}
        {isIframeEnvironment() && (
          <button
            type="button"
            onClick={() => openAppInNewTab()}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-blue-200 dark:border-slate-800 bg-blue-50/70 dark:bg-slate-900 text-blue-900 dark:text-slate-100 text-xs font-black hover:bg-blue-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Buka aplikasi Layar Penuh di Tab Baru"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-700 dark:text-slate-100" />
            <span className="hidden 2xl:inline text-[11px]">Layar Penuh</span>
          </button>
        )}

        {/* PWA Install Button (1-Click for cashiers) */}
        <PWAInstallPrompt variant="header-button" darkMode={darkMode} />

        {/* Shift Management Pill */}
        <button
          type="button"
          onClick={onOpenShiftModal}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            activeShift
              ? 'bg-blue-50 border-blue-300 text-blue-900 hover:bg-blue-100 dark:bg-slate-900 dark:border-slate-700 dark:text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700 shadow-sm shadow-blue-600/20'
          }`}
          title="Klik untuk membuka / menutup shift kasir"
        >
          <Clock className={`w-3.5 h-3.5 shrink-0 ${activeShift ? 'text-emerald-600 dark:text-emerald-400' : 'text-white'}`} />
          <span className="font-numeric font-black">
            {activeShift ? 'Shift Aktif' : 'Mulai Kasir'}
          </span>
        </button>

        {/* Dark Mode Switcher */}
        <button
          type="button"
          onClick={() => setDarkMode(!darkMode)}
          className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
            darkMode
              ? 'border-slate-800 bg-slate-900 text-blue-400 hover:bg-slate-800'
              : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
          }`}
          title={darkMode ? 'Ganti ke Mode Terang (Putih & Biru)' : 'Ganti ke Mode Gelap'}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};

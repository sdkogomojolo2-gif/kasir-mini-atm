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

const TAB_TITLES: Record<TabType, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Beranda Konter',
    subtitle: '',
  },
  'digital-sales': {
    title: 'Catat Penjualan Non-Fisik (Pulsa & Layanan)',
    subtitle: '',
  },
  cashier: {
    title: 'Catat Penjualan Fisik (Barang Konter)',
    subtitle: '',
  },
  branches: {
    title: 'Uang Kas & Rekening Bank',
    subtitle: '',
  },
  inventory: {
    title: 'Stok Barang & Pulsa',
    subtitle: '',
  },
  debts: {
    title: 'Catatan Hutang / Kasbon',
    subtitle: '',
  },
  reports: {
    title: 'Laporan Untung Rugi',
    subtitle: '',
  },
  settings: {
    title: 'Pengaturan Toko',
    subtitle: '',
  },
  guide: {
    title: 'Buku Panduan Kasir',
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
  onSelectBranch,
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
      className="h-16 px-4 sm:px-6 border-b shrink-0 flex items-center justify-between transition-colors sticky top-0 z-20 backdrop-blur-md bg-white/95 dark:bg-zinc-950/95 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
    >
      {/* Left: Mobile Drawer Toggle + Breadcrumb & Title */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Menu Button */}
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
          title="Buka Navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Back Chevron to Dashboard if not on Dashboard */}
        {activeTab !== 'dashboard' && (
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
            title="Kembali ke Dashboard"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Title (Simpel & Bersih tanpa teks berulang) */}
        <div>
          <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight text-zinc-950 dark:text-zinc-50">
            {info.title}
          </h2>
        </div>
      </div>

      {/* Right Action Bar: Branch Switcher, Clock, Cloud Sync, Shift, Theme Toggle */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Active Branch Indicator (Terkunci Sesuai Akun Login) */}
        {branches && branches.length > 0 && (
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-black ${
              isCashier
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-200'
                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100'
            }`}
            title={isCashier ? `Lokasi Bertugas: ${activeBranch?.name || 'Cabang'}` : 'Mode Administrator: Mengawasi Seluruh Cabang'}
          >
            <span className="text-xs">{isCashier ? '🔒' : '🏢'}</span>
            <span className="max-w-[130px] sm:max-w-[180px] truncate">
              {isCashier ? (activeBranch?.name || 'Cabang') : 'Semua Cabang'}
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                isCashier
                  ? 'bg-amber-500 text-zinc-950'
                  : 'bg-zinc-800 text-amber-400 border border-zinc-700'
              }`}
            >
              {isCashier ? 'Kasir' : 'Admin'}
            </span>
          </div>
        )}

        {/* Real-time Clock */}
        <div className="hidden sm:flex flex-col text-right font-mono">
          <span className="text-xs font-black text-zinc-950 dark:text-zinc-100 leading-tight">
            {currentTime} WIB
          </span>
          <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">
            {currentDate}
          </span>
        </div>

        {/* Cloud Sync Status Badge */}
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
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 text-xs font-black"
        >
          {cloudSyncStatus === 'SYNCED' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-black truncate max-w-[120px]">
                {settings.firebaseCustomConfig?.projectId
                  ? `Cloud: ${settings.firebaseCustomConfig.projectId}`
                  : 'Cloud Aktif'}
              </span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-zinc-400" />
              <span className="text-[11px] font-black">Mode Offline</span>
            </>
          )}
        </div>

        {/* Open in new tab button for full hardware access (Bluetooth) */}
        {isIframeEnvironment() && (
          <button
            type="button"
            onClick={() => openAppInNewTab()}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 text-xs font-black hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Buka aplikasi Layar Penuh di Tab Baru"
          >
            <ExternalLink className="w-3.5 h-3.5 text-zinc-950 dark:text-zinc-100" />
            <span className="hidden xl:inline text-[11px]">Layar Penuh</span>
          </button>
        )}

        {/* PWA Install Button (1-Click for cashiers) */}
        <PWAInstallPrompt variant="header-button" darkMode={darkMode} />

        {/* Shift Management Pill */}
        <button
          type="button"
          onClick={onOpenShiftModal}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
            activeShift
              ? 'bg-zinc-900 border-zinc-700 text-white hover:border-zinc-500'
              : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 border-amber-600'
          }`}
          title="Klik untuk membuka / menutup shift kasir"
        >
          <Clock className={`w-3.5 h-3.5 ${activeShift ? 'text-emerald-400' : 'text-zinc-950'}`} />
          <span className="font-numeric font-black">
            {activeShift ? 'Kasir Aktif' : 'Mulai Kasir'}
          </span>
        </button>

        {/* Dark Mode Switcher */}
        <button
          type="button"
          onClick={() => setDarkMode(!darkMode)}
          className={`p-2 rounded-xl border transition-colors cursor-pointer ${
            darkMode
              ? 'border-zinc-800 bg-zinc-900 text-amber-400 hover:bg-zinc-800'
              : 'border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
          }`}
          title={darkMode ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};

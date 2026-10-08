import React from 'react';
import {
  ShoppingCart,
  Package,
  BarChart3,
  BookOpen,
  Settings,
  Clock,
  ShieldCheck,
  Moon,
  Sun,
  LogOut,
  Wifi,
  Lock,
} from 'lucide-react';
import { CashierUser, CashierShift, StoreSettings } from '../types';

interface NavbarProps {
  activeTab: 'cashier' | 'inventory' | 'reports' | 'debts' | 'settings';
  setActiveTab: (tab: 'cashier' | 'inventory' | 'reports' | 'debts' | 'settings') => void;
  currentUser: CashierUser | null;
  activeShift: CashierShift | null;
  settings: StoreSettings;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onOpenShiftModal: () => void;
  onLogout: () => void;
  cartItemCount: number;
  cloudSyncStatus?: 'ONLINE' | 'OFFLINE' | 'SYNCED';
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  activeShift,
  settings,
  darkMode,
  setDarkMode,
  onOpenShiftModal,
  onLogout,
  cartItemCount,
  cloudSyncStatus = 'SYNCED',
}) => {
  return (
    <header
      id="main-navbar"
      className={`border-b sticky top-0 z-30 transition-colors backdrop-blur-md ${
        darkMode
          ? 'bg-[#0F172A]/90 border-slate-800 text-slate-100'
          : 'bg-white/90 border-slate-200 text-slate-900 shadow-xs'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Store Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-600 flex items-center justify-center text-white shadow-md shadow-purple-500/25 font-bold text-lg border border-purple-400/30">
              🛒
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg leading-tight tracking-tight bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 bg-clip-text text-transparent dark:from-purple-400 dark:via-fuchsia-300 dark:to-pink-400">
                  {settings.storeName || 'Kasir Kelontong'}
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide bg-purple-500/10 text-purple-600 dark:text-pink-400 border border-purple-500/20 px-2 py-0.5 rounded-md font-mono">
                  <ShieldCheck className="w-3 h-3 text-purple-500" />
                  AES-256
                </span>
                <span
                  title="Sinkronisasi Multi-Device Cloud Firestore Aktif"
                  className={`hidden md:inline-flex items-center gap-1.5 text-[11px] font-medium border px-2 py-0.5 rounded-md ${
                    cloudSyncStatus === 'SYNCED'
                      ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-pink-300 border-purple-300 dark:border-purple-800'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"></span>
                  <Wifi className="w-3 h-3 text-purple-500" />
                  <span>Cloud Sync Aktif</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block truncate max-w-[280px]">
                {settings.tagline || 'Aplikasi Kasir Toko Kelontong Modern'}
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <button
              id="nav-tab-pos"
              onClick={() => setActiveTab('cashier')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all relative ${
                activeTab === 'cashier'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm shadow-purple-500/20'
                  : darkMode
                  ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  : 'text-slate-700 hover:bg-white hover:text-slate-900'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Kasir (POS)</span>
              {cartItemCount > 0 && (
                <span className="bg-amber-400 text-slate-950 font-black text-[10px] w-4.5 h-4.5 rounded-md flex items-center justify-center font-mono shadow-xs">
                  {cartItemCount}
                </span>
              )}
            </button>

            <button
              id="nav-tab-inventory"
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'inventory'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm shadow-purple-500/20'
                  : darkMode
                  ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  : 'text-slate-700 hover:bg-white hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Stok Barang</span>
            </button>

            <button
              id="nav-tab-reports"
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'reports'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm shadow-purple-500/20'
                  : darkMode
                  ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  : 'text-slate-700 hover:bg-white hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Laporan Penjualan</span>
            </button>

            <button
              id="nav-tab-debts"
              onClick={() => setActiveTab('debts')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'debts'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm shadow-purple-500/20'
                  : darkMode
                  ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  : 'text-slate-700 hover:bg-white hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Buku Kasbon</span>
            </button>

            <button
              id="nav-tab-settings"
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'settings'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm shadow-purple-500/20'
                  : darkMode
                  ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  : 'text-slate-700 hover:bg-white hover:text-slate-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Pengaturan</span>
            </button>
          </nav>

          {/* Right Action Bar: Shift, User Badge, Theme, Logout */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Shift Button */}
            <button
              id="btn-shift-manage"
              onClick={onOpenShiftModal}
              title="Status Shift Kasir"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                activeShift
                  ? 'bg-purple-500/10 text-purple-600 dark:text-pink-400 border-purple-500/30 dark:bg-purple-950/40'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 dark:bg-amber-950/40'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {activeShift ? 'Shift Aktif' : 'Buka Shift'}
              </span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              id="btn-toggle-dark-mode"
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg border transition-colors ${
                darkMode
                  ? 'border-slate-800 bg-slate-800/80 text-amber-400 hover:bg-slate-700'
                  : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              title={darkMode ? 'Mode Terang' : 'Mode Gelap'}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Cashier User Info & Lock */}
            {currentUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold leading-tight text-slate-800 dark:text-slate-200">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono font-semibold">
                    {currentUser.role === 'OWNER' ? '👑 Owner' : 'Kasir'}
                  </div>
                </div>
                <button
                  id="btn-lock-logout"
                  onClick={onLogout}
                  className="flex items-center gap-1 p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                  title="Kunci Layar / Ganti Kasir"
                >
                  <Lock className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile / Tablet Bottom Navigation Bar */}
      <div className="lg:hidden flex items-center justify-around border-t border-slate-200 dark:border-slate-800 py-1.5 px-2 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur">
        <button
          onClick={() => setActiveTab('cashier')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[11px] font-semibold relative ${
            activeTab === 'cashier'
              ? 'text-purple-600 dark:text-pink-400 font-bold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <ShoppingCart className="w-4 h-4 mb-0.5" />
          <span>Kasir</span>
          {cartItemCount > 0 && (
            <span className="absolute top-0 right-1 bg-pink-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center font-mono">
              {cartItemCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[11px] font-semibold ${
            activeTab === 'inventory'
              ? 'text-purple-600 dark:text-pink-400 font-bold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Package className="w-4 h-4 mb-0.5" />
          <span>Stok</span>
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[11px] font-semibold ${
            activeTab === 'reports'
              ? 'text-purple-600 dark:text-pink-400 font-bold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <BarChart3 className="w-4 h-4 mb-0.5" />
          <span>Laporan</span>
        </button>
        <button
          onClick={() => setActiveTab('debts')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[11px] font-semibold ${
            activeTab === 'debts'
              ? 'text-purple-600 dark:text-pink-400 font-bold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <BookOpen className="w-4 h-4 mb-0.5" />
          <span>Kasbon</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[11px] font-semibold ${
            activeTab === 'settings'
              ? 'text-purple-600 dark:text-pink-400 font-bold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Settings className="w-4 h-4 mb-0.5" />
          <span>Pengaturan</span>
        </button>
      </div>
    </header>
  );
};

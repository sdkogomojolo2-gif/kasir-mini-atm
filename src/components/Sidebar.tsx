import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  BookOpen,
  Settings,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Edit2,
  CheckCircle2,
  LogOut,
  FileText,
  Building2,
  Smartphone,
  Plug,
  Sparkles,
} from 'lucide-react';
import { CashierUser, CashierShift, StoreSettings, StoreBranch } from '../types';

export type TabType = 'dashboard' | 'cashier' | 'branches' | 'inventory' | 'reports' | 'debts' | 'settings' | 'guide';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  currentUser: CashierUser | null;
  activeShift: CashierShift | null;
  settings: StoreSettings;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onOpenShiftModal: () => void;
  onLogout: () => void;
  cartItemCount: number;
  cloudSyncStatus?: 'ONLINE' | 'OFFLINE' | 'SYNCED';
  isMobileDrawerOpen: boolean;
  setIsMobileDrawerOpen: (open: boolean) => void;
  onUpdateOwner?: (newName: string, newPin?: string) => void;
  onOpenBrochure?: () => void;
  branches?: StoreBranch[];
  activeBranchId?: string;
  activeCashierGroup?: 'ALL' | 'DIGITAL' | 'FISIK';
  onSelectCashierGroup?: (group: 'ALL' | 'DIGITAL' | 'FISIK') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
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
  isMobileDrawerOpen,
  setIsMobileDrawerOpen,
  onUpdateOwner,
  onOpenBrochure,
  branches = [],
  activeBranchId,
  activeCashierGroup = 'ALL',
  onSelectCashierGroup,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditOwnerModalOpen, setIsEditOwnerModalOpen] = useState(false);
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editOwnerPin, setEditOwnerPin] = useState('');

  // Sub-menu accordion toggle state
  const [isOperasionalOpen, setIsOperasionalOpen] = useState(true);
  const [isLaporanOpen, setIsLaporanOpen] = useState(false);
  const [isKasirSubmenuOpen, setIsKasirSubmenuOpen] = useState(true);

  // Auto-expand section if its item is currently active
  useEffect(() => {
    if (['branches', 'inventory', 'debts'].includes(activeTab)) {
      setIsOperasionalOpen(true);
    }
    if (['reports', 'settings', 'guide'].includes(activeTab)) {
      setIsLaporanOpen(true);
    }
  }, [activeTab]);

  // Close mobile drawer on navigation
  const handleSelectTab = (tab: TabType) => {
    setActiveTab(tab);
    setIsMobileDrawerOpen(false);
  };

  const handleSelectGroup = (group: 'ALL' | 'DIGITAL' | 'FISIK') => {
    if (onSelectCashierGroup) {
      onSelectCashierGroup(group);
    }
    handleSelectTab('cashier');
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileDrawerOpen && (
        <div
          onClick={() => setIsMobileDrawerOpen(false)}
          className="fixed inset-0 bg-black/70 z-40 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Vertical Sidebar */}
      <aside
        id="pos-main-sidebar"
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col justify-between transition-all duration-200 select-none shadow-2xl md:shadow-none border-r ${
          isCollapsed ? 'w-20' : 'w-64 lg:w-72'
        } ${
          isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } bg-zinc-950 border-zinc-800 text-zinc-100`}
      >
        {/* Top Header: Brand & Logo */}
        <div className="p-4 border-b border-zinc-800 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-amber-400 font-black text-lg shadow-inner shrink-0">
              🛒
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <h1 className="font-black text-sm tracking-tight text-white uppercase truncate">
                  {settings.storeName || 'UD. TOKO KELONTONG'}
                </h1>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span className="truncate">Kasir-Q POS &amp; Stok</span>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Collapse / Mobile Close Button */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
              title={isCollapsed ? 'Perluas Menu' : 'Persempit Menu'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Shift Quick Status Bar inside Sidebar */}
        <div className="px-3 pt-3 pb-1 shrink-0">
          <button
            type="button"
            onClick={onOpenShiftModal}
            className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
              activeShift
                ? 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-850 hover:border-zinc-600'
                : 'bg-zinc-900/50 border-dashed border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
            title="Kelola Shift & Kas Fisik"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <Clock className={`w-4 h-4 shrink-0 ${activeShift ? 'text-amber-400' : 'text-zinc-500'}`} />
              {!isCollapsed && (
                <div className="text-left truncate">
                  <div className="text-[11px] font-bold leading-none">
                    {activeShift ? 'Shift Aktif' : 'Shift Belum Buka'}
                  </div>
                  <div className="text-[9px] text-zinc-400 font-mono mt-0.5 truncate">
                    {activeShift ? 'Klik untuk Rekap/Tutup' : 'Klik untuk Buka Shift'}
                  </div>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <span
                className={`w-2 h-2 rounded-full ${
                  activeShift ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
            )}
          </button>
        </div>

        {/* Middle: Navigation Links with Organized Sub-Menus */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-3 scrollbar-thin">
          {/* Section 1: MENU UTAMA KONTER */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-2.5 py-1 text-[10px] font-black text-zinc-400 uppercase tracking-wider font-mono flex items-center justify-between">
                <span>MENU UTAMA</span>
                <span className="text-[9px] text-amber-500 font-bold">KASIR</span>
              </div>
            )}

            {/* Dashboard Button */}
            <button
              id="sidebar-tab-dashboard"
              type="button"
              onClick={() => handleSelectTab('dashboard')}
              title="Beranda Konter"
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer group ${
                activeTab === 'dashboard'
                  ? 'bg-amber-500 text-zinc-950 font-black shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <LayoutDashboard
                  className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                    activeTab === 'dashboard' ? 'text-zinc-950 stroke-[2.5]' : 'text-zinc-400 group-hover:text-zinc-200'
                  }`}
                />
                {!isCollapsed && <span className="truncate tracking-wide">Beranda Konter</span>}
              </div>
            </button>

            {/* Cashier Master Item & Sub-Menus */}
            <div className="space-y-0.5">
              <div className="flex items-center gap-1">
                <button
                  id="sidebar-tab-cashier"
                  type="button"
                  onClick={() => handleSelectTab('cashier')}
                  title="Kasir & Penjualan"
                  className={`flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer group ${
                    activeTab === 'cashier'
                      ? 'bg-amber-500 text-zinc-950 font-black shadow-md shadow-amber-500/20'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <ShoppingCart
                      className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                        activeTab === 'cashier' ? 'text-zinc-950 stroke-[2.5]' : 'text-zinc-400 group-hover:text-zinc-200'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate tracking-wide">Kasir &amp; Penjualan</span>}
                  </div>

                  {!isCollapsed && cartItemCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black font-mono bg-zinc-950 text-amber-400">
                      {cartItemCount}
                    </span>
                  )}
                </button>

                {!isCollapsed && (
                  <button
                    type="button"
                    onClick={() => setIsKasirSubmenuOpen(!isKasirSubmenuOpen)}
                    className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
                    title={isKasirSubmenuOpen ? 'Tutup Sub-Menu' : 'Buka Sub-Menu'}
                  >
                    {isKasirSubmenuOpen ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>

              {/* Sub-menu items for Cashier */}
              {!isCollapsed && isKasirSubmenuOpen && (
                <div className="ml-4 pl-3 border-l-2 border-zinc-800 space-y-1 py-1">
                  <button
                    type="button"
                    onClick={() => handleSelectGroup('ALL')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      activeTab === 'cashier' && activeCashierGroup === 'ALL'
                        ? 'bg-zinc-800 text-amber-400 font-extrabold'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>🏷️</span>
                      <span>Semua Katalog</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectGroup('DIGITAL')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      activeTab === 'cashier' && activeCashierGroup === 'DIGITAL'
                        ? 'bg-zinc-800 text-amber-400 font-extrabold'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>📱</span>
                      <span>Pulsa &amp; Layanan HP</span>
                    </span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">Digital</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectGroup('FISIK')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      activeTab === 'cashier' && activeCashierGroup === 'FISIK'
                        ? 'bg-zinc-800 text-amber-400 font-extrabold'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>🔌</span>
                      <span>Barang Konter (Cas, Casing, dll)</span>
                    </span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">Fisik</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: OPERASIONAL & KAS (Collapsible Sub-Menu) */}
          <div className="space-y-1 pt-1">
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => setIsOperasionalOpen(!isOperasionalOpen)}
                className="w-full px-2.5 py-1 text-[10px] font-black text-zinc-400 hover:text-white uppercase tracking-wider font-mono flex items-center justify-between cursor-pointer rounded hover:bg-zinc-900/40"
              >
                <span>OPERASIONAL TOKO</span>
                <span className="flex items-center gap-1 text-zinc-500">
                  <span className="text-[9px]">3 menu</span>
                  {isOperasionalOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </span>
              </button>
            ) : (
              <div className="border-t border-zinc-800/80 my-1" />
            )}

            {(isOperasionalOpen || isCollapsed) && (
              <div className="space-y-1">
                {/* Branches / Kas */}
                <button
                  id="sidebar-tab-branches"
                  type="button"
                  onClick={() => handleSelectTab('branches')}
                  title="Uang Kas & Rekening Bank"
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer group ${
                    activeTab === 'branches'
                      ? 'bg-amber-500 text-zinc-950 font-black shadow-md shadow-amber-500/20'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Building2
                      className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                        activeTab === 'branches' ? 'text-zinc-950 stroke-[2.5]' : 'text-zinc-400 group-hover:text-zinc-200'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate tracking-wide">Uang Kas &amp; Bank</span>}
                  </div>
                  {!isCollapsed && (
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-black font-mono shadow-xs ${
                        activeTab === 'branches'
                          ? 'bg-zinc-950 text-amber-400'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      Saldo
                    </span>
                  )}
                </button>

                {/* Inventory */}
                <button
                  id="sidebar-tab-inventory"
                  type="button"
                  onClick={() => handleSelectTab('inventory')}
                  title="Stok Barang & Pulsa"
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer group ${
                    activeTab === 'inventory'
                      ? 'bg-amber-500 text-zinc-950 font-black shadow-md shadow-amber-500/20'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Package
                      className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                        activeTab === 'inventory' ? 'text-zinc-950 stroke-[2.5]' : 'text-zinc-400 group-hover:text-zinc-200'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate tracking-wide">Stok Barang &amp; Pulsa</span>}
                  </div>
                </button>

                {/* Debts */}
                <button
                  id="sidebar-tab-debts"
                  type="button"
                  onClick={() => handleSelectTab('debts')}
                  title="Catatan Hutang / Kasbon"
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer group ${
                    activeTab === 'debts'
                      ? 'bg-amber-500 text-zinc-950 font-black shadow-md shadow-amber-500/20'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <BookOpen
                      className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                        activeTab === 'debts' ? 'text-zinc-950 stroke-[2.5]' : 'text-zinc-400 group-hover:text-zinc-200'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate tracking-wide">Catatan Hutang / Kasbon</span>}
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Section 3: LAPORAN & PENGATURAN (Collapsible Sub-Menu) */}
          <div className="space-y-1 pt-1">
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => setIsLaporanOpen(!isLaporanOpen)}
                className="w-full px-2.5 py-1 text-[10px] font-black text-zinc-400 hover:text-white uppercase tracking-wider font-mono flex items-center justify-between cursor-pointer rounded hover:bg-zinc-900/40"
              >
                <span>LAPORAN &amp; SISTEM</span>
                <span className="flex items-center gap-1 text-zinc-500">
                  <span className="text-[9px]">3 menu</span>
                  {isLaporanOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </span>
              </button>
            ) : (
              <div className="border-t border-zinc-800/80 my-1" />
            )}

            {(isLaporanOpen || isCollapsed) && (
              <div className="space-y-1">
                {/* Reports */}
                <button
                  id="sidebar-tab-reports"
                  type="button"
                  onClick={() => handleSelectTab('reports')}
                  title="Laporan Untung Rugi"
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer group ${
                    activeTab === 'reports'
                      ? 'bg-amber-500 text-zinc-950 font-black shadow-md shadow-amber-500/20'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <BarChart3
                      className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                        activeTab === 'reports' ? 'text-zinc-950 stroke-[2.5]' : 'text-zinc-400 group-hover:text-zinc-200'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate tracking-wide">Laporan Untung Rugi</span>}
                  </div>
                </button>

                {/* Settings */}
                <button
                  id="sidebar-tab-settings"
                  type="button"
                  onClick={() => handleSelectTab('settings')}
                  title="Pengaturan Toko"
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer group ${
                    activeTab === 'settings'
                      ? 'bg-amber-500 text-zinc-950 font-black shadow-md shadow-amber-500/20'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Settings
                      className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                        activeTab === 'settings' ? 'text-zinc-950 stroke-[2.5]' : 'text-zinc-400 group-hover:text-zinc-200'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate tracking-wide">Pengaturan Toko</span>}
                  </div>
                </button>

                {/* Guide */}
                <button
                  id="sidebar-tab-guide"
                  type="button"
                  onClick={() => handleSelectTab('guide')}
                  title="Buku Panduan Kasir"
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer group ${
                    activeTab === 'guide'
                      ? 'bg-amber-500 text-zinc-950 font-black shadow-md shadow-amber-500/20'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <BookOpen
                      className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                        activeTab === 'guide' ? 'text-zinc-950 stroke-[2.5]' : 'text-zinc-400 group-hover:text-zinc-200'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate tracking-wide">Buku Panduan</span>}
                  </div>
                  {!isCollapsed && (
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-black font-mono shadow-xs ${
                        activeTab === 'guide'
                          ? 'bg-zinc-950 text-amber-400'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      Panduan
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Bottom Section: Cashier User Profile + Edit Modal Trigger */}
        <div className="p-3 border-t border-zinc-800 shrink-0 bg-zinc-950">
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-zinc-900/60 transition-colors">
            {/* User Profile Info */}
            <button
              id="sidebar-btn-edit-owner"
              type="button"
              onClick={() => {
                setEditOwnerName(currentUser?.name || settings.ownerName || 'Pemilik Toko');
                setEditOwnerPin(currentUser?.pin || '1234');
                setIsEditOwnerModalOpen(true);
              }}
              className="flex items-center gap-2.5 overflow-hidden text-left flex-1 min-w-0 cursor-pointer group"
              title="Klik untuk ubah nama pemilik & PIN"
            >
              {/* User Avatar Circle */}
              <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700 text-amber-400 flex items-center justify-center font-black text-sm shadow-inner shrink-0 group-hover:border-amber-500/50 transition-colors">
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'K'}
              </div>
              {!isCollapsed && (
                <div className="text-left truncate flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate leading-tight flex items-center gap-1.5">
                    <span className="truncate">{currentUser?.name || 'Administrator'}</span>
                    <Edit2 className="w-3 h-3 text-zinc-400 group-hover:text-amber-400 shrink-0 transition-colors" />
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider font-semibold truncate">
                    {currentUser?.role === 'OWNER'
                      ? '👑 ADMIN (SEMUA CABANG)'
                      : `🔒 KASIR (${branches.find((b) => b.id === (currentUser?.branchId || activeBranchId))?.code || 'CABANG'})`}
                  </div>
                </div>
              )}
            </button>

            {/* Logout / Lock Button */}
            <button
              id="sidebar-btn-lock"
              type="button"
              onClick={onLogout}
              className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
              title="Kunci Layar Kasir / Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Modal Edit Nama Pemilik Toko & PIN */}
      {isEditOwnerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-zinc-800 text-amber-400">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">
                    {currentUser?.role === 'OWNER' ? 'Edit Profil Pemilik Toko' : 'Edit Profil Kasir'}
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    {currentUser?.role === 'OWNER'
                      ? 'Ubah nama pemilik & PIN akses akun utama'
                      : 'Ubah nama petugas & PIN akses kasir'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOwnerModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editOwnerName.trim()) return;
                onUpdateOwner?.(editOwnerName.trim(), editOwnerPin.trim());
                setIsEditOwnerModalOpen(false);
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-zinc-300 mb-1">
                  Nama Pemilik Toko / Kasir Utama:
                </label>
                <input
                  type="text"
                  value={editOwnerName}
                  onChange={(e) => setEditOwnerName(e.target.value)}
                  placeholder="Contoh: Pak Budi Santoso / Bu Hj. Maryam"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                  autoFocus
                />
                <p className="text-[10px] text-zinc-400 mt-1">
                  Nama ini akan muncul di pojok menu kasir, laporan harian, dan identitas toko.
                </p>
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1">
                  PIN Masuk Akun Pemilik (4-6 Digit Angka):
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={editOwnerPin}
                  onChange={(e) => setEditOwnerPin(e.target.value)}
                  placeholder="Contoh: 1234"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-white font-mono text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
                <p className="text-[10px] text-zinc-400 mt-1">
                  PIN keamanan saat mengunci atau membuka aplikasi kasir.
                </p>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditOwnerModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-300 bg-zinc-800 hover:bg-zinc-700 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

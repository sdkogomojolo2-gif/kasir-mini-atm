import React, { useState } from 'react';
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
  X,
  Edit2,
  CheckCircle2,
  LogOut,
  FileText,
  Building2,
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
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditOwnerModalOpen, setIsEditOwnerModalOpen] = useState(false);
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editOwnerPin, setEditOwnerPin] = useState('');

  // Close mobile drawer on navigation
  const handleSelectTab = (tab: TabType) => {
    setActiveTab(tab);
    setIsMobileDrawerOpen(false);
  };

  const navItems = [
    {
      group: 'MENU UTAMA',
      items: [
        {
          id: 'dashboard' as TabType,
          label: 'Beranda',
          icon: LayoutDashboard,
          badge: null,
        },
        {
          id: 'cashier' as TabType,
          label: 'Kasir & Transaksi',
          icon: ShoppingCart,
          badge: cartItemCount > 0 ? `${cartItemCount}` : null,
          badgeColor: 'bg-amber-500 text-zinc-950 font-black',
        },
        {
          id: 'branches' as TabType,
          label: 'Uang Kas & Rekening Bank',
          icon: Building2,
          badge: 'Saldo',
          badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-black',
        },
        {
          id: 'inventory' as TabType,
          label: 'Stok Barang & Pulsa',
          icon: Package,
          badge: null,
        },
        {
          id: 'debts' as TabType,
          label: 'Catatan Hutang / Kasbon',
          icon: BookOpen,
          badge: null,
        },
      ],
    },
    {
      group: 'LAPORAN',
      items: [
        {
          id: 'reports' as TabType,
          label: 'Laporan Untung Rugi',
          icon: BarChart3,
          badge: null,
        },
      ],
    },
    {
      group: 'PENGATURAN',
      items: [
        {
          id: 'settings' as TabType,
          label: 'Pengaturan Toko',
          icon: Settings,
          badge: null,
        },
        {
          id: 'guide' as TabType,
          label: 'Buku Panduan Kasir',
          icon: BookOpen,
          badge: 'Panduan',
          badgeColor: 'bg-zinc-800 text-zinc-200 border border-zinc-700 font-bold',
        },
      ],
    },
  ];

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

        {/* Middle: Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4 scrollbar-thin">
          {navItems.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-2.5 py-1 text-[10px] font-black text-zinc-400 uppercase tracking-wider font-mono">
                  {group.group}
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`sidebar-tab-${item.id}`}
                      type="button"
                      onClick={() => handleSelectTab(item.id)}
                      title={item.label}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer group ${
                        isActive
                          ? 'bg-amber-500 text-zinc-950 font-black shadow-md shadow-amber-500/20'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                            isActive ? 'text-zinc-950 stroke-[2.5]' : 'text-zinc-400 group-hover:text-zinc-200'
                          }`}
                        />
                        {!isCollapsed && (
                          <span className="truncate tracking-wide">{item.label}</span>
                        )}
                      </div>

                      {/* Badge if available */}
                      {!isCollapsed && item.badge && (
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-black font-mono shadow-xs ${
                            isActive
                              ? 'bg-zinc-950 text-amber-400'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* End of nav groups */}
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

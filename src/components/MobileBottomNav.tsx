import React from 'react';
import {
  ShoppingCart,
  Package,
  BookOpen,
  BarChart3,
  Menu,
  Clock,
  Sparkles,
  Building2,
} from 'lucide-react';
import { TabType } from './Sidebar';

interface MobileBottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  cartItemCount: number;
  onOpenMobileMenu: () => void;
  darkMode: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  cartItemCount,
  onOpenMobileMenu,
  darkMode,
}) => {
  const tabs = [
    {
      id: 'cashier' as TabType,
      label: 'Kasir ATM',
      icon: ShoppingCart,
      badge: cartItemCount > 0 ? cartItemCount : null,
    },
    {
      id: 'branches' as TabType,
      label: 'Cabang',
      icon: Building2,
      badge: null,
    },
    {
      id: 'inventory' as TabType,
      label: 'Layanan',
      icon: Package,
      badge: null,
    },
    {
      id: 'reports' as TabType,
      label: 'Laporan',
      icon: BarChart3,
      badge: null,
    },
  ];

  return (
    <nav
      id="mobile-bottom-navigation"
      aria-label="Navigasi Bawah Mobile"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 border-t border-zinc-800 backdrop-blur-md px-2 py-1 flex items-center justify-around safe-bottom shadow-2xl"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            id={`mobile-nav-${tab.id}`}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 relative transition-colors cursor-pointer ${
              isActive
                ? 'text-amber-400 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className="relative">
              <Icon
                className={`w-5 h-5 transition-transform ${
                  isActive ? 'scale-110 text-amber-400' : 'text-zinc-400'
                }`}
              />
              {tab.badge !== null && (
                <span className="absolute -top-1.5 -right-2 bg-amber-500 text-zinc-950 font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-mono shadow-xs">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-1 leading-none">
              {tab.label}
            </span>
            {isActive && (
              <span className="w-1 h-1 rounded-full bg-amber-400 mt-0.5" />
            )}
          </button>
        );
      })}

      {/* Menu & Dashboard drawer button */}
      <button
        id="mobile-nav-toggle-menu"
        type="button"
        onClick={onOpenMobileMenu}
        className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 transition-colors cursor-pointer ${
          activeTab === 'dashboard' || activeTab === 'settings' || activeTab === 'guide'
            ? 'text-amber-400 font-bold'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <Menu className="w-5 h-5" />
        <span className="text-[10px] tracking-tight mt-1 leading-none">Menu</span>
        {(activeTab === 'dashboard' || activeTab === 'settings' || activeTab === 'guide') && (
          <span className="w-1 h-1 rounded-full bg-amber-400 mt-0.5" />
        )}
      </button>
    </nav>
  );
};

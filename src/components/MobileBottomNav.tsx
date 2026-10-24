import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Smartphone,
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
      id: 'dashboard' as TabType,
      label: 'Beranda',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'digital-sales' as TabType,
      label: 'Pulsa & ATM',
      icon: Smartphone,
      badge: null,
    },
    {
      id: 'cashier' as TabType,
      label: 'Barang Fisik',
      icon: ShoppingCart,
      badge: cartItemCount > 0 ? cartItemCount : null,
    },
    {
      id: 'branches' as TabType,
      label: 'Uang Kas',
      icon: Building2,
      badge: null,
    },
  ];

  return (
    <nav
      id="mobile-bottom-navigation"
      aria-label="Navigasi Bawah Mobile & Tablet"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 border-t border-blue-100 dark:border-slate-800 backdrop-blur-md px-2 py-1 flex items-center justify-around safe-bottom shadow-[0_-4px_20px_-4px_rgba(37,99,235,0.12)]"
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
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-blue-600'
            }`}
          >
            <div className="relative">
              <Icon
                className={`w-5 h-5 transition-transform ${
                  isActive ? 'scale-110 text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                }`}
              />
              {tab.badge !== null && (
                <span className="absolute -top-1.5 -right-2 bg-blue-600 text-white font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-mono shadow-xs">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-1 leading-none">
              {tab.label}
            </span>
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-0.5" />
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
            ? 'text-blue-600 dark:text-blue-400 font-bold'
            : 'text-slate-500 dark:text-slate-400 hover:text-blue-600'
        }`}
      >
        <Menu className="w-5 h-5" />
        <span className="text-[10px] tracking-tight mt-1 leading-none">Menu</span>
        {(activeTab === 'dashboard' || activeTab === 'settings' || activeTab === 'guide') && (
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-0.5" />
        )}
      </button>
    </nav>
  );
};

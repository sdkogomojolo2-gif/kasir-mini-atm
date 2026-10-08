import React, { useState, useMemo } from 'react';
import {
  Users,
  Package,
  Wallet,
  TrendingUp,
  Receipt,
  ShoppingCart,
  Clock,
  ArrowRight,
  PlusCircle,
  BookOpen,
  Building2,
  CreditCard,
  Smartphone,
  Zap,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Coins,
} from 'lucide-react';
import {
  Product,
  Transaction,
  CustomerDebt,
  CashierShift,
  StoreSettings,
  StoreBranch,
  CashierUser,
} from '../types';
import { formatRupiah, formatDateIndo } from '../services/export';
import { TabType } from './Sidebar';

interface DashboardViewProps {
  products: Product[];
  transactions: Transaction[];
  debts: CustomerDebt[];
  activeShift: CashierShift | null;
  settings: StoreSettings;
  branches?: StoreBranch[];
  activeBranchId?: string;
  onSetActiveBranch?: (branchId: string) => void;
  darkMode: boolean;
  onNavigate: (tab: TabType) => void;
  onOpenShiftModal: () => void;
  onViewReceipt: (trx: Transaction) => void;
  currentUser?: CashierUser | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  transactions,
  debts,
  activeShift,
  settings,
  branches = [],
  activeBranchId,
  onSetActiveBranch,
  darkMode,
  onNavigate,
  onOpenShiftModal,
  onViewReceipt,
  currentUser,
}) => {
  const isCashier = currentUser?.role === 'KASIR';
  const cashierBranchId = isCashier
    ? (currentUser?.branchId || activeBranchId || branches[0]?.id || 'branch-cabang-2')
    : null;

  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('ALL');

  // Effective branch filter: for cashiers, ALWAYS strictly their assigned branch!
  const effectiveBranchFilter = isCashier ? cashierBranchId! : selectedBranchFilter;

  // Filtered transactions by effective branch
  const branchTransactions = useMemo(() => {
    if (effectiveBranchFilter === 'ALL') return transactions;
    return transactions.filter((t) => t.branchId === effectiveBranchFilter);
  }, [transactions, effectiveBranchFilter]);

  // Today's Transactions
  const todayTransactions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    return branchTransactions.filter((t) => {
      const tTime = new Date(t.date).getTime();
      return tTime >= todayTime && t.status === 'COMPLETED';
    });
  }, [branchTransactions]);

  // Today's Metrics
  const todayOmzet = useMemo(() => {
    return todayTransactions.reduce((acc, t) => acc + t.grandTotal, 0);
  }, [todayTransactions]);

  const todayAdminProfit = useMemo(() => {
    return todayTransactions.reduce((acc, t) => acc + t.totalProfit, 0);
  }, [todayTransactions]);

  const todayCashSales = useMemo(() => {
    return todayTransactions
      .filter((t) => t.paymentMethod === 'TUNAI')
      .reduce((acc, t) => acc + t.grandTotal, 0);
  }, [todayTransactions]);

  // Active Branch or Total Balances
  const currentBranch = useMemo(() => {
    if (effectiveBranchFilter !== 'ALL') {
      return branches.find((b) => b.id === effectiveBranchFilter) || branches[0];
    }
    return branches.find((b) => b.id === activeBranchId) || branches[0];
  }, [branches, effectiveBranchFilter, activeBranchId]);

  const totalCashAcross = useMemo(() => {
    if (effectiveBranchFilter !== 'ALL' && currentBranch) {
      return currentBranch.cashDrawerBalance || 0;
    }
    return branches.reduce((sum, b) => sum + (b.cashDrawerBalance || 0), 0);
  }, [branches, effectiveBranchFilter, currentBranch]);

  const totalBankAcross = useMemo(() => {
    if (effectiveBranchFilter !== 'ALL' && currentBranch) {
      return currentBranch.bankBalance || 0;
    }
    return branches.reduce((sum, b) => sum + (b.bankBalance || 0), 0);
  }, [branches, effectiveBranchFilter, currentBranch]);

  const totalDigiposAcross = useMemo(() => {
    if (effectiveBranchFilter !== 'ALL' && currentBranch) {
      return currentBranch.digiposBalance || 0;
    }
    return branches.reduce((sum, b) => sum + (b.digiposBalance || 0), 0);
  }, [branches, effectiveBranchFilter, currentBranch]);

  // Per-Branch Performance Matrix (Exclusively for Owner/Admin Overview)
  const branchPerformanceList = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    return branches.map((b) => {
      const bTrxs = transactions.filter(
        (t) => t.branchId === b.id && t.status === 'COMPLETED' && new Date(t.date).getTime() >= todayTime
      );
      const bOmzet = bTrxs.reduce((sum, t) => sum + t.grandTotal, 0);
      const bProfit = bTrxs.reduce((sum, t) => sum + t.totalProfit, 0);
      return {
        branch: b,
        todayCount: bTrxs.length,
        todayOmzet: bOmzet,
        todayProfit: bProfit,
      };
    });
  }, [branches, transactions]);

  // Breakdown by Service Type Today
  const serviceBreakdown = useMemo(() => {
    const counts: Record<string, { count: number; volume: number; profit: number }> = {
      TARIK_TUNAI: { count: 0, volume: 0, profit: 0 },
      SETOR_TUNAI: { count: 0, volume: 0, profit: 0 },
      TRANSFER_BANK: { count: 0, volume: 0, profit: 0 },
      PULSA_DATA: { count: 0, volume: 0, profit: 0 },
      EWALLET: { count: 0, volume: 0, profit: 0 },
      TOKEN_PLN: { count: 0, volume: 0, profit: 0 },
      PPOB: { count: 0, volume: 0, profit: 0 },
      FISIK: { count: 0, volume: 0, profit: 0 },
    };

    todayTransactions.forEach((t) => {
      let key = 'FISIK';
      if (t.serviceType === 'TARIK_TUNAI') key = 'TARIK_TUNAI';
      else if (t.serviceType === 'SETOR_TUNAI') key = 'SETOR_TUNAI';
      else if (t.serviceType === 'TRANSFER_BANK') key = 'TRANSFER_BANK';
      else if (t.serviceType === 'PULSA' || t.serviceType === 'PAKET_DATA') key = 'PULSA_DATA';
      else if (t.serviceType === 'TOPUP_EWALLET') key = 'EWALLET';
      else if (t.serviceType === 'TOKEN_PLN') key = 'TOKEN_PLN';
      else if (t.serviceType === 'TAGIHAN_PPOB') key = 'PPOB';

      counts[key].count += 1;
      counts[key].volume += t.grandTotal;
      counts[key].profit += t.totalProfit;
    });

    return counts;
  }, [todayTransactions]);

  // Total Unpaid Debts (Piutang Belum Lunas)
  const totalUnpaidDebts = useMemo(() => {
    return debts.reduce((acc, d) => acc + d.totalDebt, 0);
  }, [debts]);

  // Recent Transactions
  const recentTransactions = useMemo(() => {
    return [...branchTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 7);
  }, [branchTransactions]);

  return (
    <div id="dashboard-view-container" className="space-y-4 max-w-7xl mx-auto pb-8">
      {/* 1. Header Bar Simpel & Ringkas (Tanpa Tulisan Berulang) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center text-lg shrink-0">
            {isCashier ? '🔒' : '🏢'}
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
              <span>
                {isCashier
                  ? `${currentBranch?.name || 'Cabang Kasir'} (${currentBranch?.code || 'CABANG'})`
                  : settings.storeName || 'Mini ATM & Konter Berkah'}
              </span>
              <span
                className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full ${
                  isCashier
                    ? 'bg-amber-500 text-zinc-950'
                    : 'bg-zinc-800 text-amber-400 border border-zinc-700'
                }`}
              >
                {isCashier ? 'Akun Kasir Cabang' : 'Administrator'}
              </span>
            </h2>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
              {isCashier
                ? 'Fokus operasional cabang Anda: pantau uang kas, saldo bank & keuntungan transaksi cabang'
                : 'Pusat kontrol operasional: pantau saldo perputaran uang dan laba rugi seluruh cabang'}
            </p>
          </div>
        </div>

        {/* Branch Switcher & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!isCashier && branches.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs">
              <span className="text-xs">🏢</span>
              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                className="bg-transparent font-black text-xs text-zinc-950 dark:text-zinc-100 focus:outline-none cursor-pointer"
                title="Pilih Cabang (Mode Admin)"
              >
                <option value="ALL" className="bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 font-black">
                  Semua Cabang ({branches.length} Cabang Konsolidasi)
                </option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100">
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => onNavigate('cashier')}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Mulai Transaksi (F9)</span>
          </button>

          <button
            type="button"
            onClick={onOpenShiftModal}
            className={`px-3 py-2 rounded-xl text-xs font-black border flex items-center gap-1.5 transition-all cursor-pointer ${
              activeShift
                ? 'bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800'
                : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-950 dark:text-zinc-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>{activeShift ? 'Kasir Aktif' : 'Mulai Kasir'}</span>
          </button>
        </div>
      </div>

      {/* 2. Main KPI Stat Cards: Kas Laci, Saldo Bank, Saldo Pulsa, Laba Admin */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Kas Laci Tunai */}
        <div
          onClick={() => onNavigate('branches')}
          className="p-4 sm:p-5 rounded-2xl border transition-all hover:border-emerald-500 cursor-pointer bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-2xs group"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono">
                {isCashier
                  ? 'Uang Kas Laci Cabang'
                  : effectiveBranchFilter === 'ALL'
                  ? 'Uang Kas Laci (Semua Cabang)'
                  : 'Uang Kas Laci Cabang'}
              </p>
              <h3 className="text-xl sm:text-2xl font-black mt-2 font-mono text-emerald-600 dark:text-emerald-400">
                {formatRupiah(totalCashAcross)}
              </h3>
              <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1 group-hover:text-emerald-500">
                <span>{isCashier ? 'Kas fisik di laci Anda →' : 'Kelola kas fisik laci →'}</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              💵
            </div>
          </div>
        </div>

        {/* 2. Saldo Rekening Bank / EDC */}
        <div
          onClick={() => onNavigate('branches')}
          className="p-4 sm:p-5 rounded-2xl border transition-all hover:border-blue-500 cursor-pointer bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-2xs group"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono">
                {isCashier
                  ? 'Saldo Rekening Bank Cabang'
                  : effectiveBranchFilter === 'ALL'
                  ? 'Saldo Bank (Semua Cabang)'
                  : 'Saldo Rekening Bank / EDC'}
              </p>
              <h3 className="text-xl sm:text-2xl font-black mt-2 font-mono text-blue-600 dark:text-blue-400">
                {formatRupiah(totalBankAcross)}
              </h3>
              <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1 group-hover:text-blue-500">
                <span>{isCashier ? 'Rekening operasional cabang Anda →' : 'Saldo EDC operasional bank →'}</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
              🏦
            </div>
          </div>
        </div>

        {/* 3. Saldo Server Pulsa & Digipos */}
        <div
          onClick={() => onNavigate('branches')}
          className="p-4 sm:p-5 rounded-2xl border transition-all hover:border-purple-500 cursor-pointer bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-2xs group"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono">
                {isCashier
                  ? 'Saldo Server Pulsa Cabang'
                  : effectiveBranchFilter === 'ALL'
                  ? 'Saldo Pulsa (Semua Cabang)'
                  : 'Saldo Digipos & Pulsa'}
              </p>
              <h3 className="text-xl sm:text-2xl font-black mt-2 font-mono text-purple-600 dark:text-purple-400">
                {formatRupiah(totalDigiposAcross)}
              </h3>
              <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1 group-hover:text-purple-500">
                <span>Saldo server pulsa/PPOB →</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
              📱
            </div>
          </div>
        </div>

        {/* 4. Keuntungan / Laba Admin Hari Ini */}
        <div
          onClick={() => onNavigate('reports')}
          className="p-4 sm:p-5 rounded-2xl border transition-all hover:border-amber-500 cursor-pointer bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30 shadow-2xs group"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider font-mono">
                {isCashier
                  ? 'Keuntungan Cabang Hari Ini'
                  : effectiveBranchFilter === 'ALL'
                  ? 'Total Laba Admin (Semua Cabang)'
                  : 'Laba Admin Cabang Hari Ini'}
              </p>
              <h3 className="text-xl sm:text-2xl font-black mt-2 font-mono text-zinc-900 dark:text-zinc-100">
                {formatRupiah(todayAdminProfit)}
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1">
                <span>{todayTransactions.length} transaksi selesai di cabang ini</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center shrink-0 font-bold">
              💰
            </div>
          </div>
        </div>
      </div>

      {/* KHUSUS ADMIN/OWNER: Ringkasan Perputaran Uang & Laba Rugi Seluruh Cabang */}
      {!isCashier && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h4 className="font-black text-sm text-zinc-950 dark:text-zinc-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-500" />
                <span>Monitoring Perputaran Uang &amp; Laba Rugi Per Cabang (Hak Akses Pemilik)</span>
              </h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                Pantau langsung saldo kas, perputaran uang (omzet), dan laba bersih tiap cabang secara independen
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {branches.length} Cabang Aktif
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {branchPerformanceList.map(({ branch, todayCount, todayOmzet: bOmzet, todayProfit: bProfit }) => {
              const isCurrentFiltered = selectedBranchFilter === branch.id;
              return (
                <div
                  key={branch.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isCurrentFiltered
                      ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/30'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs">🏢</span>
                      <span className="font-extrabold text-xs text-zinc-950 dark:text-zinc-100 truncate">
                        {branch.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold shrink-0">
                      {branch.code}
                    </span>
                  </div>

                  {/* Saldo-saldo */}
                  <div className="grid grid-cols-2 gap-1.5 py-2 border-y border-zinc-200/60 dark:border-zinc-800/60 text-[11px] font-mono">
                    <div>
                      <div className="text-[10px] text-zinc-400 font-sans">Kas Laci:</div>
                      <div className="font-black text-emerald-600 dark:text-emerald-400">
                        {formatRupiah(branch.cashDrawerBalance || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-400 font-sans">Saldo Bank:</div>
                      <div className="font-black text-blue-600 dark:text-blue-400">
                        {formatRupiah(branch.bankBalance || 0)}
                      </div>
                    </div>
                  </div>

                  {/* Perputaran uang & laba hari ini */}
                  <div className="pt-2 flex items-center justify-between text-xs">
                    <div>
                      <div className="text-[10px] text-zinc-500 font-sans">Perputaran (Omzet):</div>
                      <div className="font-mono font-black text-zinc-950 dark:text-zinc-100">
                        {formatRupiah(bOmzet)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-sans">Laba Cabang:</div>
                      <div className="font-mono font-black text-amber-600 dark:text-amber-400">
                        +{formatRupiah(bProfit)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500 font-medium">
                      {todayCount} transaksi hari ini
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBranchFilter(isCurrentFiltered ? 'ALL' : branch.id);
                      }}
                      className="text-[11px] font-black text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      {isCurrentFiltered ? 'Tampilkan Semua' : 'Fokus Cabang Ini →'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Service Breakdown Grid (Tarik Tunai, Setor Tunai, Transfer Bank, Pulsa, dll) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>Performa Layanan Hari Ini</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              Volume: {formatRupiah(todayOmzet)}
            </span>
          </h4>
          <span className="text-xs text-zinc-400 font-mono">Real-time</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800">
            <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
              <span>💳</span> Tarik Tunai
            </div>
            <div className="text-base font-black font-mono text-zinc-900 dark:text-zinc-100">
              {serviceBreakdown.TARIK_TUNAI.count} trx
            </div>
            <div className="text-[10px] text-emerald-500 font-mono font-bold mt-0.5">
              +{formatRupiah(serviceBreakdown.TARIK_TUNAI.profit)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800">
            <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
              <span>📥</span> Setor Tunai
            </div>
            <div className="text-base font-black font-mono text-zinc-900 dark:text-zinc-100">
              {serviceBreakdown.SETOR_TUNAI.count} trx
            </div>
            <div className="text-[10px] text-emerald-500 font-mono font-bold mt-0.5">
              +{formatRupiah(serviceBreakdown.SETOR_TUNAI.profit)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800">
            <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
              <span>🔁</span> Transfer Bank
            </div>
            <div className="text-base font-black font-mono text-zinc-900 dark:text-zinc-100">
              {serviceBreakdown.TRANSFER_BANK.count} trx
            </div>
            <div className="text-[10px] text-emerald-500 font-mono font-bold mt-0.5">
              +{formatRupiah(serviceBreakdown.TRANSFER_BANK.profit)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800">
            <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
              <span>📱</span> Pulsa & Kuota
            </div>
            <div className="text-base font-black font-mono text-zinc-900 dark:text-zinc-100">
              {serviceBreakdown.PULSA_DATA.count} trx
            </div>
            <div className="text-[10px] text-emerald-500 font-mono font-bold mt-0.5">
              +{formatRupiah(serviceBreakdown.PULSA_DATA.profit)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800">
            <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
              <span>👛</span> Top Up E-Wallet
            </div>
            <div className="text-base font-black font-mono text-zinc-900 dark:text-zinc-100">
              {serviceBreakdown.EWALLET.count} trx
            </div>
            <div className="text-[10px] text-emerald-500 font-mono font-bold mt-0.5">
              +{formatRupiah(serviceBreakdown.EWALLET.profit)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800">
            <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
              <span>⚡</span> Token PLN
            </div>
            <div className="text-base font-black font-mono text-zinc-900 dark:text-zinc-100">
              {serviceBreakdown.TOKEN_PLN.count} trx
            </div>
            <div className="text-[10px] text-emerald-500 font-mono font-bold mt-0.5">
              +{formatRupiah(serviceBreakdown.TOKEN_PLN.profit)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800">
            <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
              <span>🧾</span> Tagihan PPOB
            </div>
            <div className="text-base font-black font-mono text-zinc-900 dark:text-zinc-100">
              {serviceBreakdown.PPOB.count} trx
            </div>
            <div className="text-[10px] text-emerald-500 font-mono font-bold mt-0.5">
              +{formatRupiah(serviceBreakdown.PPOB.profit)}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Split Section: Quick Shortcuts & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Quick Launch Buttons (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-3">
          <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <span>⚡ Akses Cepat Agen</span>
          </h4>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onNavigate('cashier')}
              className="w-full p-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center justify-between transition-colors shadow-sm cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                <span>Buka Kasir Mini ATM (F9)</span>
              </div>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('branches')}
              className="w-full p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold text-xs flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-500" />
                <span>Kelola Cabang & Mutasi Kas</span>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('inventory')}
              className="w-full p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold text-xs flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-500" />
                <span>Katalog Layanan & Pulsa</span>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="w-full p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold text-xs flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-500" />
                <span>Laporan Transaksi & Keuntungan</span>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('debts')}
              className="w-full p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold text-xs flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-500" />
                <span>Buku Kasbon / Piutang ({formatRupiah(totalUnpaidDebts)})</span>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Recent Transactions List (8 cols) */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-500" />
              <span>Transaksi Terakhir</span>
            </h4>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="text-xs font-bold text-amber-500 hover:underline cursor-pointer"
            >
              Lihat Semua →
            </button>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-xs">
              Belum ada riwayat transaksi tercatat. Buka menu Kasir untuk melayani transaksi pertama.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {recentTransactions.map((trx) => (
                <div
                  key={trx.id}
                  onClick={() => onViewReceipt(trx)}
                  className="py-2.5 flex items-center justify-between gap-3 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 px-2 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm shrink-0">
                      {trx.serviceType === 'TARIK_TUNAI'
                        ? '💳'
                        : trx.serviceType === 'SETOR_TUNAI'
                        ? '📥'
                        : trx.serviceType === 'TRANSFER_BANK'
                        ? '🔁'
                        : trx.serviceType === 'TOKEN_PLN'
                        ? '⚡'
                        : trx.serviceType === 'TOPUP_EWALLET'
                        ? '👛'
                        : trx.serviceType === 'PULSA' || trx.serviceType === 'PAKET_DATA'
                        ? '📱'
                        : '🧾'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                        {trx.items[0]?.productName || 'Transaksi Kasir'}
                      </div>
                      <div className="text-[10px] text-zinc-400 flex items-center gap-1.5 font-mono">
                        <span>#{trx.invoiceNumber}</span>
                        <span>•</span>
                        <span>{trx.branchName || 'Cabang'}</span>
                        <span>•</span>
                        <span>{formatDateIndo(trx.date).split(' ')[1]} {formatDateIndo(trx.date).split(' ')[2]}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-black text-xs text-zinc-900 dark:text-zinc-100">
                      {formatRupiah(trx.grandTotal)}
                    </div>
                    <div className="text-[10px] font-mono text-emerald-500 font-bold">
                      +{formatRupiah(trx.totalProfit)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

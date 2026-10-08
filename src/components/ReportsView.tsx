import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  FileSpreadsheet,
  FileText,
  Calendar,
  Eye,
  RotateCcw,
  Search,
  CheckCircle,
  XCircle,
  Award,
} from 'lucide-react';
import { Transaction, StoreSettings, StoreBranch, ServiceType, CashierUser } from '../types';
import {
  formatRupiah,
  formatDateIndo,
  exportSalesToExcel,
  exportSalesReportPDF,
} from '../services/export';

interface ReportsViewProps {
  transactions: Transaction[];
  onCancelTransaction: (trxId: string) => void;
  onViewReceipt: (trx: Transaction) => void;
  settings: StoreSettings;
  branches?: StoreBranch[];
  darkMode: boolean;
  currentUser?: CashierUser | null;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  onCancelTransaction,
  onViewReceipt,
  settings,
  branches = [],
  darkMode,
  currentUser,
}) => {
  const isCashier = currentUser?.role === 'KASIR';
  const cashierBranchId = isCashier
    ? (currentUser?.branchId || branches[0]?.id || 'branch-cabang-2')
    : null;

  const [periodFilter, setPeriodFilter] = useState<'TODAY' | '7DAYS' | '30DAYS' | 'ALL'>('TODAY');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');

  // Effective branch filter: for cashiers, ALWAYS strictly their assigned branch!
  const effectiveBranchFilter = isCashier ? cashierBranchId! : branchFilter;

  // Filter transactions by period, branch, service, payment, and search
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = todayStart - 30 * 24 * 60 * 60 * 1000;

    return transactions.filter((trx) => {
      const trxTime = new Date(trx.date).getTime();

      let matchPeriod = true;
      if (periodFilter === 'TODAY') matchPeriod = trxTime >= todayStart;
      else if (periodFilter === '7DAYS') matchPeriod = trxTime >= sevenDaysAgo;
      else if (periodFilter === '30DAYS') matchPeriod = trxTime >= thirtyDaysAgo;

      let matchPayment = true;
      if (paymentFilter !== 'ALL') matchPayment = trx.paymentMethod === paymentFilter;

      let matchBranch = true;
      if (effectiveBranchFilter !== 'ALL') matchBranch = trx.branchId === effectiveBranchFilter;

      let matchService = true;
      if (serviceFilter !== 'ALL') {
        if (serviceFilter === 'PULSA') matchService = trx.serviceType === 'PULSA' || trx.serviceType === 'PAKET_DATA';
        else matchService = trx.serviceType === serviceFilter;
      }

      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        trx.invoiceNumber.toLowerCase().includes(q) ||
        (trx.referenceNumber && trx.referenceNumber.toLowerCase().includes(q)) ||
        (trx.destinationBank && trx.destinationBank.toLowerCase().includes(q)) ||
        (trx.accountNumber && trx.accountNumber.toLowerCase().includes(q)) ||
        (trx.customerPhone && trx.customerPhone.toLowerCase().includes(q)) ||
        trx.cashierName.toLowerCase().includes(q) ||
        (trx.customerName && trx.customerName.toLowerCase().includes(q)) ||
        trx.items.some((item) => item.productName.toLowerCase().includes(q));

      return matchPeriod && matchPayment && matchBranch && matchService && matchQuery;
    });
  }, [transactions, periodFilter, paymentFilter, effectiveBranchFilter, serviceFilter, searchQuery]);

  // Aggregate metrics (only completed transactions)
  const completedTransactions = useMemo(() => {
    return filteredTransactions.filter((t) => t.status === 'COMPLETED');
  }, [filteredTransactions]);

  const totalOmzet = useMemo(() => {
    return completedTransactions.reduce((sum, t) => sum + t.grandTotal, 0);
  }, [completedTransactions]);

  const totalProfit = useMemo(() => {
    return completedTransactions.reduce((sum, t) => sum + t.totalProfit, 0);
  }, [completedTransactions]);

  const totalCost = useMemo(() => {
    return completedTransactions.reduce((sum, t) => sum + t.totalCost, 0);
  }, [completedTransactions]);

  const totalItemsSold = useMemo(() => {
    return completedTransactions.reduce((sum, t) => sum + t.totalQuantity, 0);
  }, [completedTransactions]);

  const avgBasketSize = useMemo(() => {
    if (completedTransactions.length === 0) return 0;
    return totalOmzet / completedTransactions.length;
  }, [totalOmzet, completedTransactions]);

  // Top selling products
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number; profit: number }> = {};
    completedTransactions.forEach((trx) => {
      trx.items.forEach((item) => {
        if (!map[item.productName]) {
          map[item.productName] = { name: item.productName, qty: 0, revenue: 0, profit: 0 };
        }
        map[item.productName].qty += item.quantity;
        map[item.productName].revenue += item.subtotal;
        map[item.productName].profit += (item.sellPrice - item.buyPrice) * item.quantity;
      });
    });

    return Object.values(map)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [completedTransactions]);

  // Payment Breakdown
  const paymentBreakdown = useMemo(() => {
    const breakdown: Record<string, { count: number; amount: number }> = {};
    completedTransactions.forEach((trx) => {
      if (!breakdown[trx.paymentMethod]) {
        breakdown[trx.paymentMethod] = { count: 0, amount: 0 };
      }
      breakdown[trx.paymentMethod].count += 1;
      breakdown[trx.paymentMethod].amount += trx.grandTotal;
    });
    return breakdown;
  }, [completedTransactions]);

  // Branch summary matrix (Exclusively for Admin to monitor multi-branch turnover & profit)
  const branchReportsSummary = useMemo(() => {
    return branches.map((b) => {
      const bTrxs = transactions.filter((t) => {
        if (t.status !== 'COMPLETED' || t.branchId !== b.id) return false;
        const trxTime = new Date(t.date).getTime();
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
        const thirtyDaysAgo = todayStart - 30 * 24 * 60 * 60 * 1000;

        if (periodFilter === 'TODAY') return trxTime >= todayStart;
        if (periodFilter === '7DAYS') return trxTime >= sevenDaysAgo;
        if (periodFilter === '30DAYS') return trxTime >= thirtyDaysAgo;
        return true;
      });

      const bOmzet = bTrxs.reduce((sum, t) => sum + t.grandTotal, 0);
      const bProfit = bTrxs.reduce((sum, t) => sum + t.totalProfit, 0);
      const bCost = bTrxs.reduce((sum, t) => sum + t.totalCost, 0);
      return {
        branch: b,
        count: bTrxs.length,
        omzet: bOmzet,
        profit: bProfit,
        cost: bCost,
        margin: bOmzet > 0 ? ((bProfit / bOmzet) * 100).toFixed(1) : '0',
      };
    });
  }, [branches, transactions, periodFilter]);

  const periodTitle =
    periodFilter === 'TODAY'
      ? 'Hari Ini'
      : periodFilter === '7DAYS'
      ? '7 Hari Terakhir'
      : periodFilter === '30DAYS'
      ? '30 Hari Terakhir'
      : 'Semua Periode';

  return (
    <div id="reports-view-container" className="max-w-7xl mx-auto space-y-4">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
            <BarChart3 className="w-5 h-5 text-amber-500" />
            <span>Laporan Untung Rugi &amp; Penjualan</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Rekap omzet, keuntungan bersih toko &amp; riwayat transaksi
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period Filter Buttons */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
            {(['TODAY', '7DAYS', '30DAYS', 'ALL'] as const).map((p) => {
              const labels = {
                TODAY: 'Hari Ini',
                '7DAYS': '7 Hari',
                '30DAYS': '30 Hari',
                ALL: 'Semua',
              };
              const isSelected = periodFilter === p;
              return (
                <button
                  key={p}
                  onClick={() => setPeriodFilter(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-zinc-950 font-black shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>

          <button
            id="btn-export-sales-excel"
            type="button"
            onClick={() => exportSalesToExcel(filteredTransactions, settings)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Ekspor Excel</span>
          </button>

          <button
            id="btn-export-sales-pdf"
            type="button"
            onClick={() => exportSalesReportPDF(filteredTransactions, settings, periodTitle)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 text-rose-500" />
            <span>Ekspor PDF</span>
          </button>
        </div>
      </div>

      {/* Key Financial Metric Cards (4 Cards Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Omzet */}
        <div className="p-4 rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-[11px] font-bold mb-1 font-mono">
            <span>TOTAL OMZET</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-numeric font-mono text-zinc-900 dark:text-zinc-100">
            {formatRupiah(totalOmzet)}
          </div>
          <p className="text-[10px] text-zinc-400 mt-1 font-mono">
            {completedTransactions.length} transaksi selesai
          </p>
        </div>

        {/* Laba Bersih */}
        <div className="p-4 rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-[11px] font-bold mb-1 font-mono">
            <span>ESTIMASI LABA BERSIH</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-numeric font-mono text-emerald-600 dark:text-emerald-400">
            +{formatRupiah(totalProfit)}
          </div>
          <p className="text-[10px] text-zinc-400 mt-1 font-mono">
            {totalOmzet > 0 ? `${((totalProfit / totalOmzet) * 100).toFixed(1)}% margin keuntungan` : '0%'}
          </p>
        </div>

        {/* Total Modal Barang */}
        <div className="p-4 rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-[11px] font-bold mb-1 font-mono">
            <span>TOTAL MODAL KULAKAN</span>
            <ShoppingBag className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-numeric font-mono text-zinc-800 dark:text-zinc-200">
            {formatRupiah(totalCost)}
          </div>
          <p className="text-[10px] text-zinc-400 mt-1 font-mono">
            {totalItemsSold} barang terjual
          </p>
        </div>

        {/* Rata-rata Nilai Belanja */}
        <div className="p-4 rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-[11px] font-bold mb-1 font-mono">
            <span>RATA-RATA STRUK</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-numeric font-mono text-zinc-900 dark:text-zinc-100">
            {formatRupiah(avgBasketSize)}
          </div>
          <p className="text-[10px] text-zinc-400 mt-1 font-mono">
            Rata-rata belanja per pembeli
          </p>
        </div>
      </div>

      {/* Middle Section: Top Products & Payment Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Top 5 Products */}
        <div className="md:col-span-7 p-4 rounded-2xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-sm flex items-center gap-1.5 tracking-tight text-zinc-900 dark:text-zinc-100">
              <Award className="w-4 h-4 text-amber-500" />
              <span>5 Produk Terlaris ({periodTitle})</span>
            </h3>
          </div>

          {topProducts.length === 0 ? (
            <div className="text-center py-6 text-xs text-zinc-400">
              Belum ada data penjualan pada periode ini.
            </div>
          ) : (
            <div className="space-y-2.5">
              {topProducts.map((p, idx) => (
                <div key={p.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold font-mono text-[10px] flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                      {idx + 1}
                    </span>
                    <span className="font-bold truncate max-w-[200px] sm:max-w-[280px] text-zinc-800 dark:text-zinc-200">
                      {p.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 font-numeric font-mono">
                      {p.qty} terjual ({formatRupiah(p.revenue)})
                    </div>
                    <div className="text-[10px] text-emerald-500 font-numeric font-mono">
                      Laba: +{formatRupiah(p.profit)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Methods Distribution */}
        <div className="md:col-span-5 p-4 rounded-2xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <h3 className="font-extrabold text-sm mb-3 tracking-tight text-zinc-900 dark:text-zinc-100">
            Metode Pembayaran
          </h3>
          {Object.keys(paymentBreakdown).length === 0 ? (
            <div className="text-center py-6 text-xs text-zinc-400">
              Belum ada transaksi pada periode ini.
            </div>
          ) : (
            <div className="space-y-2.5 text-xs">
              {Object.entries(paymentBreakdown).map(([method, data]: [string, { count: number; amount: number }]) => {
                const percent = totalOmzet > 0 ? ((data.amount / totalOmzet) * 100).toFixed(1) : '0';
                return (
                  <div key={method} className="space-y-1">
                    <div className="flex justify-between font-semibold">
                      <span className="uppercase font-mono text-zinc-700 dark:text-zinc-300">
                        {method} ({data.count}x)
                      </span>
                      <span className="font-numeric font-mono text-zinc-900 dark:text-zinc-100">
                        {formatRupiah(data.amount)} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* KHUSUS ADMIN/OWNER: Perbandingan Laba Rugi & Perputaran Uang Per Cabang */}
      {!isCashier && branches.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 className="font-black text-sm flex items-center gap-2 text-zinc-950 dark:text-zinc-100">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <span>Laba Rugi &amp; Perputaran Uang Per Cabang ({periodTitle})</span>
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                Perbandingan performa penjualan, omzet perputaran uang, dan laba bersih antar cabang
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold self-start sm:self-auto">
              Mode Pemilik
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-zinc-100 dark:bg-zinc-950/80 text-zinc-600 dark:text-zinc-400 font-bold uppercase text-[10px] border-b border-zinc-200 dark:border-zinc-800 font-mono">
                <tr>
                  <th className="py-2.5 px-3">Cabang Toko</th>
                  <th className="py-2.5 px-3 text-center">Transaksi</th>
                  <th className="py-2.5 px-3 text-right">Perputaran (Omzet)</th>
                  <th className="py-2.5 px-3 text-right">Modal Kulakan</th>
                  <th className="py-2.5 px-3 text-right">Laba Bersih</th>
                  <th className="py-2.5 px-3 text-center">Margin</th>
                  <th className="py-2.5 px-3 text-center">Aksi Filter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 font-mono">
                {branchReportsSummary.map(({ branch, count, omzet, profit, cost, margin }) => {
                  const isFiltered = branchFilter === branch.id;
                  return (
                    <tr
                      key={branch.id}
                      className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors ${
                        isFiltered ? 'bg-amber-500/5 font-bold' : ''
                      }`}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-sans">
                          <span className="text-xs">🏢</span>
                          <span className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100">
                            {branch.name}
                          </span>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono">
                            {branch.code}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-zinc-800 dark:text-zinc-200">
                        {count} trx
                      </td>
                      <td className="py-3 px-3 text-right font-black text-zinc-900 dark:text-zinc-100">
                        {formatRupiah(omzet)}
                      </td>
                      <td className="py-3 px-3 text-right text-zinc-500 dark:text-zinc-400">
                        {formatRupiah(cost)}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                        +{formatRupiah(profit)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black">
                          {margin}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setBranchFilter(isFiltered ? 'ALL' : branch.id)}
                          className="px-2 py-1 rounded-lg text-[10px] font-sans font-black bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                        >
                          {isFiltered ? 'Lihat Semua' : 'Fokus Cabang'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed Transactions History Table */}
      <div
        id="transactions-table-card"
        className="rounded-2xl border shadow-xl overflow-hidden bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
      >
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-3 items-center justify-between bg-zinc-50 dark:bg-zinc-950/60">
          <div>
            <h3 className="font-extrabold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">
              Riwayat Transaksi Penjualan
            </h3>
            <p className="text-xs text-zinc-500 font-mono">
              {filteredTransactions.length} transaksi tercatat pada sistem
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-52">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari faktur, rek, hp..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-800 dark:text-zinc-100"
              />
            </div>

            {branches.length > 0 && (
              isCashier ? (
                <div className="px-2.5 py-1.5 rounded-lg border text-xs bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200 font-bold flex items-center gap-1">
                  <span>🔒 Cabang Anda</span>
                </div>
              ) : (
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border text-xs bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-800 dark:text-zinc-100"
                >
                  <option value="ALL">Semua Cabang ({branches.length})</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )
            )}

            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border text-xs bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-800 dark:text-zinc-100"
            >
              <option value="ALL">Semua Layanan</option>
              <option value="TARIK_TUNAI">💳 Tarik Tunai</option>
              <option value="SETOR_TUNAI">📥 Setor Tunai</option>
              <option value="TRANSFER_BANK">🔁 Transfer Bank</option>
              <option value="PULSA">📱 Pulsa &amp; Data</option>
              <option value="TOPUP_EWALLET">👛 Top Up E-Wallet</option>
              <option value="TOKEN_PLN">⚡ Token PLN</option>
              <option value="TAGIHAN_PPOB">🧾 Tagihan PPOB</option>
              <option value="PRODUK_FISIK">📦 Produk Fisik</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border text-xs bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-800 dark:text-zinc-100"
            >
              <option value="ALL">Semua Bayar</option>
              <option value="TUNAI">Tunai</option>
              <option value="QRIS">QRIS</option>
              <option value="TRANSFER_BANK">Transfer Bank</option>
              <option value="KASBON">Kasbon</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-950/70 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 uppercase tracking-wider font-bold font-mono text-[10px]">
              <tr>
                <th className="px-4 py-3.5">Faktur &amp; Ref</th>
                <th className="px-4 py-3.5 font-sans">Cabang &amp; Layanan</th>
                <th className="px-4 py-3.5 font-sans">Detail Rek / HP / Token</th>
                <th className="px-4 py-3.5">Metode</th>
                <th className="px-4 py-3.5 text-right">Total Bayar</th>
                <th className="px-4 py-3.5 text-right">Laba Admin</th>
                <th className="px-4 py-3.5 text-center font-sans">Aksi Struk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-400">
                    Tidak ada transaksi yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((trx) => (
                  <tr
                    key={trx.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-bold">
                      <div className="text-amber-500 dark:text-amber-400">#{trx.invoiceNumber}</div>
                      {trx.referenceNumber && (
                        <div className="text-[10px] text-zinc-400 font-normal">{trx.referenceNumber}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-800 dark:text-zinc-200">
                      <div className="font-extrabold text-xs">{trx.items[0]?.productName || 'Transaksi'}</div>
                      <div className="text-[10px] text-zinc-400 font-mono">
                        {trx.branchName || 'Cabang'} • {formatDateIndo(trx.date).split(' ')[1]} {formatDateIndo(trx.date).split(' ')[2]} • Kasir: {trx.cashierName}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                      {trx.accountNumber && (
                        <div className="text-zinc-800 dark:text-zinc-200 font-bold">
                          {trx.destinationBank || ''} {trx.accountNumber}
                        </div>
                      )}
                      {trx.customerPhone && (
                        <div>No: {trx.customerPhone}</div>
                      )}
                      {trx.tokenCode && (
                        <div className="text-amber-500 font-black text-[10px]">{trx.tokenCode}</div>
                      )}
                      {trx.snNumber && (
                        <div className="text-[10px] text-emerald-500">{trx.snNumber}</div>
                      )}
                      {!trx.accountNumber && !trx.customerPhone && !trx.tokenCode && !trx.snNumber && (
                        <span className="text-zinc-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 uppercase">
                        {trx.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-numeric font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {formatRupiah(trx.grandTotal)}
                    </td>
                    <td className="px-4 py-3 text-right font-numeric font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      +{formatRupiah(trx.totalProfit)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                          trx.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                        }`}
                      >
                        {trx.status === 'COMPLETED' ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                            <span>Sukses</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-rose-500" />
                            <span>Batal</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onViewReceipt(trx)}
                          title="Lihat / Cetak Ulang Struk"
                          className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-500" />
                          <span>Struk</span>
                        </button>
                        {trx.status === 'COMPLETED' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Batalkan transaksi ${trx.invoiceNumber} dan kembalikan stok barang?`)) {
                                onCancelTransaction(trx.id);
                              }
                            }}
                            title="Batalkan Transaksi / Retur"
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

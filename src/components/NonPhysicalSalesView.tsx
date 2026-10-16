import React, { useState, useMemo, useEffect } from 'react';
import {
  Smartphone,
  Plus,
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Share2,
  Copy,
  Check,
  Trash2,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Wallet,
  Building2,
  Zap,
  PhoneCall,
  CreditCard,
  Receipt,
  X,
  ExternalLink,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, StoreSettings, StoreBranch, CashierUser, ServiceType } from '../types';
import { formatRupiah, formatDateIndo } from '../services/export';
import { sound } from '../services/sound';
import { MiniATMTransactionModal } from './MiniATMTransactionModal';

interface NonPhysicalSalesViewProps {
  transactions: Transaction[];
  activeBranch?: StoreBranch;
  branches?: StoreBranch[];
  settings: StoreSettings;
  currentUser: CashierUser | null;
  onCompleteTransaction: (trx: Transaction) => void;
  onAdjustBranchBalances?: (
    branchId: string,
    balanceChanges: { cashChange: number; bankChange: number; digiposChange: number },
    meta: {
      category: 'TRANSAKSI' | 'TARIK_BANK' | 'SETOR_BANK' | 'TOPUP_SERVER' | 'MODAL_AWAL' | 'PENGELUARAN' | 'LAINNYA';
      description: string;
    }
  ) => void;
  onViewReceipt: (trx: Transaction) => void;
  onDeleteTransaction?: (trxId: string) => void;
  darkMode: boolean;
}

export const NonPhysicalSalesView: React.FC<NonPhysicalSalesViewProps> = ({
  transactions,
  activeBranch,
  branches,
  settings,
  currentUser,
  onCompleteTransaction,
  onAdjustBranchBalances,
  onViewReceipt,
  onDeleteTransaction,
  darkMode,
}) => {
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [initialServiceType, setInitialServiceType] = useState<ServiceType | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState<'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'ALL'>('TODAY');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedTrxDetail, setSelectedTrxDetail] = useState<Transaction | null>(null);

  // Keyboard shortcut F2 to open transaction modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setInitialServiceType(undefined);
        setIsRecordModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCopyText = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    sound.playSuccess();
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Filter transactions strictly for non-physical/digital/services
  const nonPhysicalTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Must be a non-physical transaction
      const isNonPhysical =
        (t.serviceType && t.serviceType !== 'PRODUK_FISIK') ||
        t.items.some((item) => item.serviceType && item.serviceType !== 'PRODUK_FISIK');
      if (!isNonPhysical) return false;

      // Filter by branch if restricted
      if (activeBranch && currentUser?.role === 'CASHIER') {
        if (t.branchId && t.branchId !== activeBranch.id) return false;
      }

      return true;
    });
  }, [transactions, activeBranch, currentUser]);

  // Apply date, service and search filters
  const filteredList = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return nonPhysicalTransactions.filter((t) => {
      const tTime = new Date(t.date).getTime();

      // Period filter
      if (periodFilter === 'TODAY' && tTime < todayStart) return false;
      if (periodFilter === 'YESTERDAY' && (tTime < yesterdayStart || tTime >= todayStart)) return false;
      if (periodFilter === 'WEEK' && tTime < weekStart) return false;
      if (periodFilter === 'MONTH' && tTime < monthStart) return false;

      // Service type filter
      if (serviceFilter !== 'ALL') {
        if (serviceFilter === 'PULSA_DATA') {
          if (t.serviceType !== 'PULSA' && t.serviceType !== 'PAKET_DATA') return false;
        } else if (t.serviceType !== serviceFilter) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesInvoice = t.invoiceNumber.toLowerCase().includes(q);
        const matchesRef = (t.referenceNumber || '').toLowerCase().includes(q);
        const matchesService = (t.serviceType || '').toLowerCase().includes(q);
        const matchesItemName = t.items.some((i) => i.productName.toLowerCase().includes(q));
        const matchesCustomer = (t.customerName || '').toLowerCase().includes(q);
        const matchesPhone = (t.customerPhone || '').includes(q);
        const matchesAccount = (t.accountNumber || '').includes(q);
        const matchesBank = (t.destinationBank || '').toLowerCase().includes(q);
        const matchesSn = (t.snNumber || '').toLowerCase().includes(q);
        const matchesToken = (t.tokenCode || '').replace(/-/g, '').includes(q.replace(/-/g, ''));

        if (
          !matchesInvoice &&
          !matchesRef &&
          !matchesService &&
          !matchesItemName &&
          !matchesCustomer &&
          !matchesPhone &&
          !matchesAccount &&
          !matchesBank &&
          !matchesSn &&
          !matchesToken
        ) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [nonPhysicalTransactions, periodFilter, serviceFilter, searchQuery]);

  // Aggregate KPI metrics
  const stats = useMemo(() => {
    let totalCount = filteredList.length;
    let totalModal = 0;
    let totalJual = 0;
    let totalMargin = 0;

    filteredList.forEach((t) => {
      const modal = t.totalCost || (t.nominalAmount || 0);
      const jual = t.grandTotal;
      const margin = t.totalProfit || Math.max(0, jual - modal);

      totalModal += modal;
      totalJual += jual;
      totalMargin += margin;
    });

    const avgMargin = totalCount > 0 ? Math.round(totalMargin / totalCount) : 0;

    return { totalCount, totalModal, totalJual, totalMargin, avgMargin };
  }, [filteredList]);

  // Quick service icon & label helper
  const getServiceInfo = (t: Transaction) => {
    const sType = t.serviceType || t.items[0]?.serviceType;
    const name = t.items[0]?.productName || sType || 'Layanan Digital';

    switch (sType) {
      case 'TARIK_TUNAI':
        return { icon: '🏧', badge: 'Tarik Tunai', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', name };
      case 'TRANSFER_BANK':
        return { icon: '🏦', badge: 'Transfer Bank', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', name };
      case 'SETOR_TUNAI':
        return { icon: '📥', badge: 'Setor Tunai', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20', name };
      case 'PULSA':
      case 'PAKET_DATA':
        return { icon: '📱', badge: 'Pulsa / Paket Data', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', name };
      case 'TOPUP_EWALLET':
        return { icon: '💳', badge: 'Top Up E-Wallet', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20', name };
      case 'TOKEN_PLN':
        return { icon: '⚡', badge: 'Token PLN', color: 'bg-amber-400/15 text-amber-700 dark:text-amber-300 border-amber-400/30', name };
      case 'TAGIHAN_PPOB':
        return { icon: '📄', badge: 'Tagihan PPOB', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20', name };
      default:
        return { icon: '⚡', badge: 'Layanan Non-Fisik', color: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20', name };
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = filteredList.map((t, idx) => {
      const modal = t.totalCost || (t.nominalAmount || 0);
      const hargaJual = t.grandTotal;
      const margin = t.totalProfit || Math.max(0, hargaJual - modal);
      const info = getServiceInfo(t);

      return {
        No: idx + 1,
        'Tanggal & Jam': formatDateIndo(t.date),
        'No. Faktur': t.invoiceNumber,
        'Jenis Transaksi': info.badge,
        'Nama Produk / Layanan': info.name,
        'Tujuan (Rek/HP/ID)': t.accountNumber || t.customerPhone || '-',
        'Bank / Operator': t.destinationBank || t.items[0]?.provider || '-',
        'Nama Pelanggan': t.customerName || t.accountName || '-',
        'Modal (Rp)': modal,
        'Harga Jual (Rp)': hargaJual,
        Satuan: 'Trx',
        'Margin / Keuntungan (Rp)': margin,
        'Serial Number (SN)': t.snNumber || '-',
        'Kode Token PLN': t.tokenCode || '-',
        'Metode Pembayaran': t.paymentMethod,
        Kasir: t.cashierName,
        Cabang: t.branchName || '-',
        Status: t.status,
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Penjualan Non-Fisik');
    XLSX.writeFile(
      wb,
      `Penjualan_NonFisik_${settings.storeName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    sound.playSuccess();
  };

  // Export to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`LAPORAN PENJUALAN NON-FISIK (PULSA & LAYANAN)`, 14, 15);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${settings.storeName} | Dicetak: ${new Date().toLocaleString('id-ID')}`, 14, 22);

    const tableRows = filteredList.map((t, idx) => {
      const modal = t.totalCost || (t.nominalAmount || 0);
      const hargaJual = t.grandTotal;
      const margin = t.totalProfit || Math.max(0, hargaJual - modal);
      const info = getServiceInfo(t);

      return [
        idx + 1,
        formatDateIndo(t.date),
        `${info.badge}\n${info.name}`,
        t.accountNumber || t.customerPhone || '-',
        formatRupiah(modal),
        formatRupiah(hargaJual),
        'Trx',
        formatRupiah(margin),
        t.snNumber || t.tokenCode || '-',
      ];
    });

    autoTable(doc, {
      startY: 28,
      head: [['No', 'Tanggal', 'Jenis Transaksi', 'Tujuan / Akun', 'Modal', 'Harga Jual', 'Satuan', 'Margin (Untung)', 'SN / Token']],
      body: tableRows,
      theme: 'grid',
      styles: { fontSize: 8, font: 'helvetica' },
      headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0], fontStyle: 'bold' },
    });

    doc.save(`Penjualan_NonFisik_${new Date().toISOString().slice(0, 10)}.pdf`);
    sound.playSuccess();
  };

  // Handle open specific quick transaction
  const handleOpenQuickService = (st: ServiceType) => {
    setInitialServiceType(st);
    setIsRecordModalOpen(true);
  };

  return (
    <div id="non-physical-sales-container" className="space-y-4 max-w-7xl mx-auto pb-16">
      {/* 1. Header Bar with Direct Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center text-xl shrink-0">
            📱
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-zinc-950 dark:text-zinc-50">
                Catat Penjualan Non-Fisik (Pulsa &amp; Layanan)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-amber-500 text-zinc-950">
                Fokus Digital &amp; Mini ATM
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium mt-0.5">
              Tabel pencatatan khusus isi pulsa, kuota, tarik tunai, transfer bank, e-wallet, dan token PLN lengkap dengan modal, harga jual, dan margin keuntungan.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            id="btn-add-non-physical-trx"
            type="button"
            onClick={() => {
              setInitialServiceType(undefined);
              setIsRecordModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-black text-xs sm:text-sm shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            title="Catat transaksi pulsa, transfer atau tarik tunai baru (Hotkey: F2)"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ CATAT TRANSAKSI BARU (F2)</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleExportExcel}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Unduh format Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Unduh format PDF"
            >
              <FileText className="w-4 h-4 text-rose-600" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Transaksi */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-1 font-medium">
            <span>Total Transaksi</span>
            <span className="text-amber-500 font-mono font-bold">Trx</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-zinc-100 font-numeric">
            {stats.totalCount} <span className="text-xs font-bold text-zinc-500">transaksi</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 truncate">
            Periode: {periodFilter === 'TODAY' ? 'Hari Ini' : periodFilter === 'YESTERDAY' ? 'Kemarin' : periodFilter === 'WEEK' ? '7 Hari' : periodFilter === 'MONTH' ? 'Bulan Ini' : 'Semua'}
          </div>
        </div>

        {/* Total Modal Pokok */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-1 font-medium">
            <span>Total Modal (Pokok)</span>
            <span className="text-blue-500 font-bold">💼</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-zinc-900 dark:text-zinc-200 font-numeric truncate">
            {formatRupiah(stats.totalModal)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 truncate">
            Saldo modal / uang kas terpakai
          </div>
        </div>

        {/* Total Harga Jual (Omzet) */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-1 font-medium">
            <span>Total Harga Jual</span>
            <span className="text-amber-500 font-bold">💰</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-zinc-950 dark:text-zinc-50 font-numeric truncate">
            {formatRupiah(stats.totalJual)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 truncate">
            Total dibayar oleh pelanggan
          </div>
        </div>

        {/* Total Margin Keuntungan (HIGHLIGHT) */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-2 border-emerald-500/40 shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs mb-1 font-black">
            <span>TOTAL MARGIN (LABA)</span>
            <span className="text-emerald-500 font-black">📈</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-numeric truncate">
            +{formatRupiah(stats.totalMargin)}
          </div>
          <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-1 font-bold">
            Keuntungan bersih kasir/agen
          </div>
        </div>

        {/* Rata-rata Margin per Trx */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-1 font-medium">
            <span>Rata-Rata Margin</span>
            <span className="text-purple-500 font-bold">⚡</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-zinc-900 dark:text-zinc-100 font-numeric truncate">
            +{formatRupiah(stats.avgMargin)} <span className="text-xs font-bold text-zinc-500">/ trx</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 truncate">
            Fee rata-rata per transaksi
          </div>
        </div>
      </div>

      {/* 3. Quick Service Buttons (1-Click Shortcuts) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-bold text-zinc-400 shrink-0 font-mono">Pintas Cepat:</span>
        <button
          type="button"
          onClick={() => handleOpenQuickService('TARIK_TUNAI')}
          className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer text-zinc-800 dark:text-zinc-200"
        >
          <span>🏧</span>
          <span>Tarik Tunai</span>
        </button>
        <button
          type="button"
          onClick={() => handleOpenQuickService('TRANSFER_BANK')}
          className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer text-zinc-800 dark:text-zinc-200"
        >
          <span>🏦</span>
          <span>Transfer Bank</span>
        </button>
        <button
          type="button"
          onClick={() => handleOpenQuickService('PULSA')}
          className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer text-zinc-800 dark:text-zinc-200"
        >
          <span>📱</span>
          <span>Pulsa &amp; Kuota</span>
        </button>
        <button
          type="button"
          onClick={() => handleOpenQuickService('TOPUP_EWALLET')}
          className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer text-zinc-800 dark:text-zinc-200"
        >
          <span>💳</span>
          <span>Top Up E-Wallet</span>
        </button>
        <button
          type="button"
          onClick={() => handleOpenQuickService('TOKEN_PLN')}
          className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer text-zinc-800 dark:text-zinc-200"
        >
          <span>⚡</span>
          <span>Token PLN</span>
        </button>
        <button
          type="button"
          onClick={() => handleOpenQuickService('TAGIHAN_PPOB')}
          className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer text-zinc-800 dark:text-zinc-200"
        >
          <span>📄</span>
          <span>Tagihan PPOB</span>
        </button>
      </div>

      {/* 4. Filter & Search Toolbar */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari no. faktur, nama nasabah, no. HP, no. rekening, bank, atau SN/Token PLN..."
              className="w-full pl-10 pr-10 py-2 rounded-xl border text-xs sm:text-sm font-medium bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Period Tabs */}
          <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-x-auto">
            {(
              [
                { id: 'TODAY', label: 'Hari Ini' },
                { id: 'YESTERDAY', label: 'Kemarin' },
                { id: 'WEEK', label: '7 Hari' },
                { id: 'MONTH', label: 'Bulan Ini' },
                { id: 'ALL', label: 'Semua' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriodFilter(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  periodFilter === p.id
                    ? 'bg-amber-500 text-zinc-950 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Service Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 text-xs scrollbar-none">
          <span className="text-zinc-400 font-bold font-mono text-[11px] shrink-0">Filter Layanan:</span>
          {[
            { id: 'ALL', label: 'Semua Layanan' },
            { id: 'TARIK_TUNAI', label: '🏧 Tarik Tunai' },
            { id: 'TRANSFER_BANK', label: '🏦 Transfer Bank' },
            { id: 'PULSA_DATA', label: '📱 Pulsa & Data' },
            { id: 'TOPUP_EWALLET', label: '💳 E-Wallet' },
            { id: 'TOKEN_PLN', label: '⚡ Token PLN' },
            { id: 'TAGIHAN_PPOB', label: '📄 Tagihan PPOB' },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setServiceFilter(s.id)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
                serviceFilter === s.id
                  ? 'bg-zinc-950 text-amber-400 border border-zinc-700 font-black'
                  : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Main Requested Table */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            {/* Table Header */}
            <thead>
              <tr className="bg-zinc-100 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-black text-[11px] uppercase tracking-wider font-mono">
                <th className="py-3 px-3 text-center w-12">No</th>
                <th className="py-3 px-3.5 min-w-[140px]">Tanggal &amp; Waktu</th>
                <th className="py-3 px-3.5 min-w-[170px]">Jenis Transaksi</th>
                <th className="py-3 px-3.5 min-w-[160px]">Tujuan / Akun / No. HP</th>
                <th className="py-3 px-3.5 text-right min-w-[110px]">Modal (Rp)</th>
                <th className="py-3 px-3.5 text-right min-w-[110px]">Harga Jual (Rp)</th>
                <th className="py-3 px-2.5 text-center w-16">Satuan</th>
                <th className="py-3 px-3.5 text-right min-w-[125px]">Margin (Untung)</th>
                <th className="py-3 px-3.5 min-w-[160px]">SN / Token PLN</th>
                <th className="py-3 px-3 text-center min-w-[110px]">Aksi</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-zinc-500">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center text-2xl mx-auto">
                        📱
                      </div>
                      <div className="font-black text-sm text-zinc-900 dark:text-zinc-100">
                        Belum Ada Transaksi Non-Fisik Tercatat
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Gunakan tombol di bawah untuk mencatat transaksi non-fisik pertama Anda seperti isi pulsa, transfer bank, tarik tunai mini ATM, atau token PLN.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setInitialServiceType(undefined);
                          setIsRecordModalOpen(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Catat Transaksi Non-Fisik Sekarang</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((t, idx) => {
                  const modal = t.totalCost || (t.nominalAmount || 0);
                  const hargaJual = t.grandTotal;
                  const margin = t.totalProfit || Math.max(0, hargaJual - modal);
                  const info = getServiceInfo(t);

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-amber-50/40 dark:hover:bg-zinc-800/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedTrxDetail(t)}
                    >
                      {/* 1. No */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-zinc-500">
                        {idx + 1}
                      </td>

                      {/* 2. Tanggal */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">
                          {formatDateIndo(t.date)}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          #{t.invoiceNumber}
                        </div>
                      </td>

                      {/* 3. Jenis Transaksi */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{info.icon}</span>
                          <div>
                            <div className="font-extrabold text-zinc-950 dark:text-zinc-50 line-clamp-1">
                              {info.name}
                            </div>
                            <span
                              className={`inline-block text-[9px] px-1.5 py-0.2 rounded border font-mono font-black ${info.color}`}
                            >
                              {info.badge}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 4. Tujuan / Akun / No HP */}
                      <td className="py-3 px-3.5">
                        <div className="space-y-0.5">
                          {t.destinationBank && (
                            <div className="font-bold text-[11px] text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                              <span>🏦</span>
                              <span>{t.destinationBank}</span>
                            </div>
                          )}
                          {(t.accountNumber || t.customerPhone) ? (
                            <div className="font-mono font-bold text-[11px] text-zinc-950 dark:text-zinc-100 flex items-center gap-1">
                              <span>{t.accountNumber || t.customerPhone}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyText(t.accountNumber || t.customerPhone || '', `acc-${t.id}`);
                                }}
                                className="p-0.5 rounded text-zinc-400 hover:text-amber-500 cursor-pointer"
                                title="Salin nomor"
                              >
                                {copiedField === `acc-${t.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-zinc-400 italic text-[11px]">-</span>
                          )}
                          {t.customerName && (
                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                              a.n. {t.customerName}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 5. Modal */}
                      <td className="py-3 px-3.5 text-right font-mono font-numeric font-bold text-zinc-600 dark:text-zinc-400">
                        {formatRupiah(modal)}
                      </td>

                      {/* 6. Harga Jual */}
                      <td className="py-3 px-3.5 text-right font-mono font-numeric font-black text-zinc-950 dark:text-zinc-50 text-[13px]">
                        {formatRupiah(hargaJual)}
                      </td>

                      {/* 7. Satuan */}
                      <td className="py-3 px-2.5 text-center">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold">
                          Trx
                        </span>
                      </td>

                      {/* 8. Margin (Keuntungan) HIGHLIGHT */}
                      <td className="py-3 px-3.5 text-right font-mono font-numeric">
                        <div className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          +{formatRupiah(margin)}
                        </div>
                        {modal > 0 && (
                          <div className="text-[9px] text-emerald-700/80 dark:text-emerald-500/80 font-bold">
                            {((margin / modal) * 100).toFixed(1)}% margin
                          </div>
                        )}
                      </td>

                      {/* 9. SN / Token PLN */}
                      <td className="py-3 px-3.5 font-mono">
                        {t.tokenCode ? (
                          <div className="p-1 rounded bg-amber-50 dark:bg-zinc-800/80 border border-amber-300 dark:border-amber-500/30">
                            <div className="text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase">
                              TOKEN PLN:
                            </div>
                            <div className="flex items-center justify-between gap-1 font-black text-[11px] text-zinc-950 dark:text-white">
                              <span>{t.tokenCode}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyText(t.tokenCode!, `token-${t.id}`);
                                }}
                                className="p-0.5 rounded text-amber-600 hover:text-amber-800 cursor-pointer"
                                title="Salin token PLN"
                              >
                                {copiedField === `token-${t.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        ) : t.snNumber ? (
                          <div className="flex items-center gap-1 text-[11px] text-zinc-700 dark:text-zinc-300">
                            <span className="truncate max-w-[120px] font-bold">{t.snNumber}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyText(t.snNumber!, `sn-${t.id}`);
                              }}
                              className="p-0.5 rounded text-zinc-400 hover:text-amber-500 cursor-pointer"
                              title="Salin SN"
                            >
                              {copiedField === `sn-${t.id}` ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-zinc-400 text-[10px]">-</span>
                        )}
                      </td>

                      {/* 10. Aksi */}
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onViewReceipt(t)}
                            className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                            title="Cetak Struk Thermal & Bagikan Foto WA"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {onDeleteTransaction && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Batalkan / hapus transaksi #${t.invoiceNumber}?`)) {
                                  onDeleteTransaction(t.id);
                                }
                              }}
                              className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-500 hover:text-white text-zinc-400 transition-colors cursor-pointer"
                              title="Hapus transaksi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Modal Detail Transaksi Non-Fisik */}
      {selectedTrxDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  📱
                </div>
                <div>
                  <h3 className="font-black text-sm text-zinc-950 dark:text-zinc-50">
                    Rincian Transaksi Non-Fisik
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    #{selectedTrxDetail.invoiceNumber} • {formatDateIndo(selectedTrxDetail.date)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTrxDetail(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-400 block font-medium">Layanan:</span>
                <span className="font-extrabold text-zinc-950 dark:text-zinc-50">
                  {selectedTrxDetail.items[0]?.productName || selectedTrxDetail.serviceType}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-400 block font-medium">Metode Pembayaran:</span>
                <span className="font-extrabold text-zinc-950 dark:text-zinc-50 uppercase">
                  {selectedTrxDetail.paymentMethod}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-400 block font-medium">Tujuan / Rek / HP:</span>
                <span className="font-mono font-bold text-zinc-950 dark:text-zinc-50">
                  {selectedTrxDetail.accountNumber || selectedTrxDetail.customerPhone || '-'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-400 block font-medium">Bank / Operator:</span>
                <span className="font-bold text-zinc-950 dark:text-zinc-50">
                  {selectedTrxDetail.destinationBank || '-'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-400 block font-medium">Modal Pokok:</span>
                <span className="font-mono font-bold text-zinc-600 dark:text-zinc-400 text-sm">
                  {formatRupiah(selectedTrxDetail.totalCost || (selectedTrxDetail.nominalAmount || 0))}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-400 block font-medium">Harga Jual (Total):</span>
                <span className="font-mono font-black text-zinc-950 dark:text-zinc-50 text-sm">
                  {formatRupiah(selectedTrxDetail.grandTotal)}
                </span>
              </div>
            </div>

            {/* Margin Card */}
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 block">
                  KEUNTUNGAN BERSIH (MARGIN)
                </span>
                <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                  Harga Jual - Modal Pokok
                </span>
              </div>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                +{formatRupiah(selectedTrxDetail.totalProfit || Math.max(0, selectedTrxDetail.grandTotal - (selectedTrxDetail.totalCost || 0)))}
              </span>
            </div>

            {selectedTrxDetail.tokenCode && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-zinc-950 border border-amber-300 dark:border-amber-500/30 text-center">
                <div className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase mb-1">
                  KODE TOKEN PLN PRABAYAR 20 DIGIT
                </div>
                <div className="text-base font-black font-mono tracking-widest text-zinc-950 dark:text-white">
                  {selectedTrxDetail.tokenCode}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  onViewReceipt(selectedTrxDetail);
                  setSelectedTrxDetail(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Struk &amp; Kirim Foto WA</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTrxDetail(null)}
                className="px-4 py-2.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal Catat Transaksi Baru (Mini ATM, Pulsa, Transfer, E-Wallet, PLN) */}
      {isRecordModalOpen && activeBranch && (
        <MiniATMTransactionModal
          isOpen={isRecordModalOpen}
          onClose={() => {
            setIsRecordModalOpen(false);
            setInitialServiceType(undefined);
          }}
          activeBranch={activeBranch}
          settings={settings}
          currentUser={currentUser}
          initialService={initialServiceType}
          onCompleteTransaction={(newTrx, balanceChanges, mutationMeta) => {
            onCompleteTransaction(newTrx);
            if (onAdjustBranchBalances) {
              onAdjustBranchBalances(activeBranch.id, balanceChanges, mutationMeta);
            }
            setIsRecordModalOpen(false);
            setInitialServiceType(undefined);
            sound.playSuccess();
          }}
          darkMode={darkMode}
        />
      )}
    </div>
  );
};

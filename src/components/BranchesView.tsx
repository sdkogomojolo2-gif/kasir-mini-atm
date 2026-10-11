import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  ArrowUpDown,
  Coins,
  CreditCard,
  Smartphone,
  Wallet,
  CheckCircle2,
  Edit2,
  Trash2,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Search,
  FileSpreadsheet,
  FileText,
  Calendar,
  Layers,
  MapPin,
  Phone,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';
import { StoreBranch, BalanceMutation, CashierUser, StoreSettings } from '../types';
import { formatRupiah, formatDateIndo } from '../services/export';
import { sound } from '../services/sound';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AdjustRealBalancesModal } from './AdjustRealBalancesModal';

interface BranchesViewProps {
  branches: StoreBranch[];
  activeBranchId: string;
  onSetActiveBranch: (branchId: string) => void;
  onSaveBranch: (branch: StoreBranch) => void;
  onDeleteBranch: (branchId: string) => void;
  mutations: BalanceMutation[];
  onRecordMutation: (
    branchId: string,
    changes: { cashChange?: number; bankChange?: number; digiposChange?: number },
    meta: {
      category: 'TRANSAKSI' | 'TARIK_BANK' | 'SETOR_BANK' | 'TOPUP_SERVER' | 'MODAL_AWAL' | 'PENGELUARAN' | 'LAINNYA';
      description: string;
      cashierName: string;
    }
  ) => void;
  onSetRealBalances?: (
    branchId: string,
    newBalances: {
      cashDrawerBalance: number;
      bankBalance: number;
      digiposBalance: number;
      ewalletBalance?: number;
    },
    meta: {
      reason?: string;
      adminName: string;
    }
  ) => void;
  currentUser: CashierUser | null;
  users?: CashierUser[];
  settings: StoreSettings;
  darkMode: boolean;
}

export const BranchesView: React.FC<BranchesViewProps> = ({
  branches,
  activeBranchId,
  onSetActiveBranch,
  onSaveBranch,
  onDeleteBranch,
  mutations,
  onRecordMutation,
  onSetRealBalances,
  currentUser,
  users = [],
  settings,
  darkMode,
}) => {
  // Modals state
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<StoreBranch | null>(null);
  const [isMutationModalOpen, setIsMutationModalOpen] = useState(false);
  const [selectedMutationBranchId, setSelectedMutationBranchId] = useState<string>(activeBranchId);
  const [isAdjustRealModalOpen, setIsAdjustRealModalOpen] = useState(false);
  const [adjustingBranch, setAdjustingBranch] = useState<StoreBranch | null>(null);

  const handleOpenAdjustRealModal = (branch?: StoreBranch) => {
    const target = branch || branches.find((b) => b.id === activeBranchId) || branches[0];
    setAdjustingBranch(target);
    setIsAdjustRealModalOpen(true);
  };

  // Filters for mutations table
  const [historyBranchFilter, setHistoryBranchFilter] = useState<string>('ALL');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'ALL' | 'CASH' | 'BANK' | 'DIGIPOS'>('ALL');
  const [searchMutation, setSearchMutation] = useState('');

  // Branch form state
  const [branchFormData, setBranchFormData] = useState({
    code: '',
    name: '',
    address: '',
    phone: '',
    cashDrawerBalance: 2000000,
    bankBalance: 5000000,
    digiposBalance: 1000000,
    isMain: false,
    notes: '',
  });

  // Mutation form state (Kelola Mandiri Kas & Bank)
  const [mutationType, setMutationType] = useState<
    'TARIK_BANK' | 'SETOR_BANK' | 'TOPUP_SERVER' | 'MODAL_AWAL' | 'PENGELUARAN' | 'KOREKSI'
  >('TARIK_BANK');
  const [mutationAmount, setMutationAmount] = useState<number>(1000000);
  const [mutationAmountInput, setMutationAmountInput] = useState<string>('1000000');
  const [mutationDescription, setMutationDescription] = useState<string>('Tarik tunai dari rekening bank untuk isi laci kas');
  const [correctionTarget, setCorrectionTarget] = useState<'CASH' | 'BANK' | 'DIGIPOS'>('CASH');

  // Cashier role isolation
  const isCashier = currentUser?.role === 'KASIR';
  const cashierBranchId = isCashier
    ? (currentUser?.branchId || activeBranchId || branches[0]?.id)
    : null;

  const displayBranches = useMemo(() => {
    if (isCashier && cashierBranchId) {
      const match = branches.filter((b) => b.id === cashierBranchId);
      return match.length > 0 ? match : [branches[0]];
    }
    return branches;
  }, [isCashier, cashierBranchId, branches]);

  // Total metrics across visible branches (isolated for cashier)
  const totals = useMemo(() => {
    const totalCash = displayBranches.reduce((sum, b) => sum + (b.cashDrawerBalance || 0), 0);
    const totalBank = displayBranches.reduce((sum, b) => sum + (b.bankBalance || 0), 0);
    const totalDigipos = displayBranches.reduce((sum, b) => sum + (b.digiposBalance || 0), 0);
    const grandLiquidity = totalCash + totalBank + totalDigipos;
    return { totalCash, totalBank, totalDigipos, grandLiquidity };
  }, [displayBranches]);

  // Open Add Branch Modal
  const handleOpenAddBranch = () => {
    setEditingBranch(null);
    const nextNum = branches.length + 1;
    setBranchFormData({
      code: `CABANG-0${nextNum}`,
      name: `Cabang ${nextNum} - Baru`,
      address: '',
      phone: settings.phone || '',
      cashDrawerBalance: 2000000,
      bankBalance: 5000000,
      digiposBalance: 1000000,
      isMain: branches.length === 0,
      notes: '',
    });
    setIsBranchModalOpen(true);
  };

  // Open Edit Branch Modal
  const handleOpenEditBranch = (branch: StoreBranch) => {
    setEditingBranch(branch);
    setBranchFormData({
      code: branch.code,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      cashDrawerBalance: branch.cashDrawerBalance || 0,
      bankBalance: branch.bankBalance || 0,
      digiposBalance: branch.digiposBalance || 0,
      isMain: branch.isMain || false,
      notes: branch.notes || '',
    });
    setIsBranchModalOpen(true);
  };

  // Save Branch Form Submit
  const handleSaveBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchFormData.name.trim()) return;

    if (editingBranch) {
      const updated: StoreBranch = {
        ...editingBranch,
        code: branchFormData.code.trim().toUpperCase(),
        name: branchFormData.name.trim(),
        address: branchFormData.address.trim(),
        phone: branchFormData.phone.trim(),
        isMain: branchFormData.isMain,
        notes: branchFormData.notes.trim(),
      };
      onSaveBranch(updated);
    } else {
      const newBranch: StoreBranch = {
        id: `branch-${Date.now()}`,
        code: branchFormData.code.trim().toUpperCase() || `CBG-${Date.now().toString().slice(-4)}`,
        name: branchFormData.name.trim(),
        address: branchFormData.address.trim(),
        phone: branchFormData.phone.trim(),
        cashDrawerBalance: branchFormData.cashDrawerBalance,
        bankBalance: branchFormData.bankBalance,
        digiposBalance: branchFormData.digiposBalance,
        isMain: branchFormData.isMain,
        notes: branchFormData.notes.trim(),
        createdAt: new Date().toISOString(),
      };
      onSaveBranch(newBranch);
    }

    sound.playSuccess();
    setIsBranchModalOpen(false);
  };

  // Handle Delete Branch
  const handleDeleteBranchClick = (branch: StoreBranch) => {
    if (branch.isMain) {
      sound.playError();
      alert('Cabang Pusat / Utama tidak dapat dihapus. Anda dapat mengubah nama atau alamatnya.');
      return;
    }
    if (branches.length <= 1) {
      sound.playError();
      alert('Minimal harus ada 1 cabang aktif di aplikasi.');
      return;
    }
    if (confirm(`Hapus cabang "${branch.name}" (${branch.code})? Data transaksi lampau tetap tersimpan.`)) {
      onDeleteBranch(branch.id);
      sound.playSuccess();
    }
  };

  // Open Mutation Modal
  const handleOpenMutationModal = (branchId?: string) => {
    setSelectedMutationBranchId(branchId || activeBranchId || branches[0]?.id);
    setMutationType('TARIK_BANK');
    setMutationAmount(1000000);
    setMutationAmountInput('1000000');
    setMutationDescription('Tarik tunai dari rekening bank untuk isi modal kas laci');
    setIsMutationModalOpen(true);
  };

  // Handle Mutation Form Submit
  const handleSaveMutationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const branch = branches.find((b) => b.id === selectedMutationBranchId) || branches[0];
    if (!branch) return;

    if (mutationAmount <= 0) {
      sound.playError();
      alert('Nominal mutasi harus lebih besar dari Rp 0');
      return;
    }

    const cashierName = currentUser?.name || 'Owner / Pengelola';

    if (mutationType === 'TARIK_BANK') {
      // Tarik tunai dari bank: Rekening Bank -amount, Kas Laci +amount
      if ((branch.bankBalance || 0) < mutationAmount) {
        sound.playError();
        alert(`Saldo bank di cabang ${branch.name} tidak cukup (${formatRupiah(branch.bankBalance || 0)}) untuk ditarik Rp ${formatRupiah(mutationAmount)}`);
        return;
      }
      onRecordMutation(
        branch.id,
        { bankChange: -mutationAmount, cashChange: mutationAmount },
        {
          category: 'TARIK_BANK',
          description: mutationDescription || `Tarik Tunai dari Bank ke Laci Kas (${formatRupiah(mutationAmount)})`,
          cashierName,
        }
      );
    } else if (mutationType === 'SETOR_BANK') {
      // Setor kas laci ke bank: Kas Laci -amount, Rekening Bank +amount
      if ((branch.cashDrawerBalance || 0) < mutationAmount) {
        sound.playError();
        alert(`Uang kas tunai di laci cabang ${branch.name} tidak cukup (${formatRupiah(branch.cashDrawerBalance || 0)}) untuk disetor Rp ${formatRupiah(mutationAmount)}`);
        return;
      }
      onRecordMutation(
        branch.id,
        { cashChange: -mutationAmount, bankChange: mutationAmount },
        {
          category: 'SETOR_BANK',
          description: mutationDescription || `Setor Kas Laci ke Rekening Bank (${formatRupiah(mutationAmount)})`,
          cashierName,
        }
      );
    } else if (mutationType === 'TOPUP_SERVER') {
      // Top up saldo pulsa dari bank: Bank -amount, Digipos +amount
      if ((branch.bankBalance || 0) < mutationAmount) {
        sound.playError();
        alert(`Saldo bank di cabang ${branch.name} tidak cukup (${formatRupiah(branch.bankBalance || 0)}) untuk top up saldo server`);
        return;
      }
      onRecordMutation(
        branch.id,
        { bankChange: -mutationAmount, digiposChange: mutationAmount },
        {
          category: 'TOPUP_SERVER',
          description: mutationDescription || `Top Up Saldo Server Pulsa/Digipos dari Bank (${formatRupiah(mutationAmount)})`,
          cashierName,
        }
      );
    } else if (mutationType === 'MODAL_AWAL') {
      // Tambah modal kas tunai: Kas Laci +amount
      onRecordMutation(
        branch.id,
        { cashChange: mutationAmount },
        {
          category: 'MODAL_AWAL',
          description: mutationDescription || `Suntikan Modal Kas Tunai Laci (${formatRupiah(mutationAmount)})`,
          cashierName,
        }
      );
    } else if (mutationType === 'PENGELUARAN') {
      // Pengeluaran operasional toko dari kas: Kas Laci -amount
      if ((branch.cashDrawerBalance || 0) < mutationAmount) {
        sound.playError();
        alert(`Uang kas tunai di laci tidak cukup untuk pengeluaran ${formatRupiah(mutationAmount)}`);
        return;
      }
      onRecordMutation(
        branch.id,
        { cashChange: -mutationAmount },
        {
          category: 'PENGELUARAN',
          description: mutationDescription || `Pengeluaran Operasional Toko (${formatRupiah(mutationAmount)})`,
          cashierName,
        }
      );
    } else if (mutationType === 'KOREKSI') {
      // Penyesuaian koreksi opname
      const changes: { cashChange?: number; bankChange?: number; digiposChange?: number } = {};
      if (correctionTarget === 'CASH') changes.cashChange = mutationAmount;
      if (correctionTarget === 'BANK') changes.bankChange = mutationAmount;
      if (correctionTarget === 'DIGIPOS') changes.digiposChange = mutationAmount;
      onRecordMutation(
        branch.id,
        changes,
        {
          category: 'LAINNYA',
          description: mutationDescription || `Koreksi Saldo ${correctionTarget} (${formatRupiah(mutationAmount)})`,
          cashierName,
        }
      );
    }

    sound.playSuccess();
    setIsMutationModalOpen(false);
  };

  // Filter mutations for table (isolated for cashier)
  const filteredMutations = useMemo(() => {
    return (mutations || []).filter((m) => {
      // Cashiers can strictly ONLY see their branch's mutations
      if (isCashier && cashierBranchId && m.branchId !== cashierBranchId) {
        return false;
      }
      const matchBranch = historyBranchFilter === 'ALL' || m.branchId === historyBranchFilter;
      const matchType = historyTypeFilter === 'ALL' || m.type === historyTypeFilter;
      const q = searchMutation.toLowerCase().trim();
      const matchQuery =
        !q ||
        m.description.toLowerCase().includes(q) ||
        (m.branchName && m.branchName.toLowerCase().includes(q)) ||
        m.category.toLowerCase().includes(q) ||
        m.cashierName.toLowerCase().includes(q);
      return matchBranch && matchType && matchQuery;
    });
  }, [mutations, isCashier, cashierBranchId, historyBranchFilter, historyTypeFilter, searchMutation]);

  // Export Mutations to Excel
  const handleExportExcel = () => {
    if (filteredMutations.length === 0) {
      alert('Tidak ada data mutasi saldo untuk diekspor.');
      return;
    }
    const dataRows = filteredMutations.map((m, idx) => ({
      No: idx + 1,
      Tanggal: formatDateIndo(m.date),
      Cabang: m.branchName || m.branchId,
      'Jenis Saldo': m.type === 'CASH' ? 'Kas Tunai Laci' : m.type === 'BANK' ? 'Saldo Rekening Bank' : 'Saldo Pulsa Digipos',
      Arus: m.flow === 'IN' ? 'MASUK' : 'KELUAR',
      Nominal: m.amount,
      'Saldo Sebelum': m.balanceBefore,
      'Saldo Sesudah': m.balanceAfter,
      Kategori: m.category,
      Keterangan: m.description,
      Kasir: m.cashierName,
    }));

    const ws = XLSX.utils.json_to_sheet(dataRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mutasi_Saldo');
    XLSX.writeFile(wb, `Mutasi_Kas_Bank_${new Date().toISOString().slice(0, 10)}.xlsx`);
    sound.playSuccess();
  };

  // Export Mutations to PDF
  const handleExportPDF = () => {
    if (filteredMutations.length === 0) {
      alert('Tidak ada data mutasi saldo untuk diekspor.');
      return;
    }
    const doc = new jsPDF('landscape');
    doc.setFontSize(14);
    doc.text(`LAPORAN MUTASI SALDO KAS & BANK CABANG`, 14, 15);
    doc.setFontSize(10);
    doc.text(`${settings.storeName} - Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);

    const headers = [['No', 'Tanggal', 'Cabang', 'Akun', 'Arus', 'Nominal', 'Saldo Akhir', 'Keterangan', 'Kasir']];
    const rows = filteredMutations.slice(0, 150).map((m, idx) => [
      idx + 1,
      formatDateIndo(m.date),
      m.branchName || m.branchId,
      m.type,
      m.flow,
      formatRupiah(m.amount),
      formatRupiah(m.balanceAfter),
      m.description,
      m.cashierName,
    ]);

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [245, 158, 11] },
    });

    doc.save(`Laporan_Mutasi_Kas_${new Date().toISOString().slice(0, 10)}.pdf`);
    sound.playSuccess();
  };

  return (
    <div id="branches-view-container" className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* 1. Header Overview & Total Liquidity Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-950 border border-zinc-800 text-white shadow-xl">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-amber-400" />
            <span>
              {isCashier
                ? `Uang Kas & Rekening Bank — ${displayBranches[0]?.name || 'Cabang'}`
                : 'Uang Kas & Rekening Bank'}
            </span>
            {isCashier && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950 font-black">
                Akun Kasir
              </span>
            )}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 mt-1 max-w-2xl font-medium">
            {isCashier
              ? 'Pantau uang tunai fisik di laci kas, saldo rekening bank/EDC, dan saldo server pulsa cabang Anda.'
              : 'Pantau uang tunai fisik di laci kas, saldo rekening bank/EDC, dan saldo server pulsa & e-wallet seluruh cabang.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => handleOpenAdjustRealModal()}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            title="Atur & Sesuaikan Saldo Riil Kas, Bank & Pulsa Toko (Khusus Pemilik/Admin)"
          >
            <ShieldCheck className="w-4 h-4 text-zinc-950" />
            <span>⚙️ Atur Saldo Riil (Khusus Admin)</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenMutationModal()}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-xs border border-zinc-700 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <ArrowUpDown className="w-4 h-4 text-amber-400" />
            <span>+ Catat Mutasi Kas/Bank</span>
          </button>
          {!isCashier && (
            <button
              type="button"
              onClick={handleOpenAddBranch}
              className="px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-xs border border-zinc-700 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>+ Tambah Cabang</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Stat Cards: Total Liquidity Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Kas Laci Tunai */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-2">
            <span>{isCashier ? 'KAS TUNAI LACI CABANG' : 'UANG TUNAI LACI (CASH)'}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              💵
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {formatRupiah(totals.totalCash)}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            {isCashier ? 'Uang fisik tersedia di laci kasir cabang Anda' : 'Uang fisik tersedia di seluruh laci kasir'}
          </p>
        </div>

        {/* Total Saldo Bank / EDC */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-2">
            <span>{isCashier ? 'SALDO REKENING BANK CABANG' : 'SALDO REKENING BANK / EDC'}</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              🏦
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
            {formatRupiah(totals.totalBank)}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            {isCashier ? 'Saldo rekening bank operasional cabang Anda' : 'Saldo rekening bank / EDC operasional agen'}
          </p>
        </div>

        {/* Total Saldo Pulsa & Digipos */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-2">
            <span>{isCashier ? 'SALDO SERVER PULSA CABANG' : 'SALDO DIGIPOS & PULSA'}</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              📱
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
            {formatRupiah(totals.totalDigipos)}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            {isCashier ? 'Saldo server pulsa cabang Anda' : 'Saldo server pulsa, kuota & PPOB'}
          </p>
        </div>

        {/* Grand Total Asset Modal */}
        <div className="p-4 rounded-2xl bg-amber-500 text-zinc-950 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-extrabold text-zinc-900 mb-2">
            <span>{isCashier ? 'TOTAL LIKUIDITAS CABANG' : 'TOTAL LIKUIDITAS AGEN'}</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-950/20 text-zinc-950 flex items-center justify-center font-bold">
              💰
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-zinc-950">
            {formatRupiah(totals.grandLiquidity)}
          </div>
          <p className="text-[11px] text-zinc-800 font-semibold mt-1">
            {isCashier ? 'Total aset kas + bank + pulsa cabang Anda' : 'Total aset kas + bank + pulsa gabungan'}
          </p>
        </div>
      </div>

      {/* 3. Branch Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>
              {isCashier
                ? `Informasi Cabang Kasir Anda (${displayBranches.length})`
                : `Daftar Cabang Toko (${branches.length})`}
            </span>
          </h3>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {isCashier
              ? 'Anda bertugas di cabang ini. Semua transaksi kasir terhubung ke cabang ini.'
              : 'Akun Admin mengawasi seluruh cabang. Untuk melayani transaksi cabang tertentu, silakan login dengan akun PIN kasir cabang.'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayBranches.map((branch) => {
            const isActive = branch.id === activeBranchId;
            const branchTotalModal =
              (branch.cashDrawerBalance || 0) + (branch.bankBalance || 0) + (branch.digiposBalance || 0);
            const assignedKasirList = users.filter((u) => u.role === 'KASIR' && u.branchId === branch.id);

            return (
              <div
                key={branch.id}
                className="p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 shadow-2xs"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-black uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
                          {branch.code}
                        </span>
                        {branch.isMain && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            PUSAT
                          </span>
                        )}
                        {isCashier && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-zinc-950 font-black">
                            CABANG ANDA
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100 mt-1.5">
                        {branch.name}
                      </h4>
                    </div>

                    {!isCashier && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditBranch(branch)}
                          title="Edit Cabang"
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!branch.isMain && branches.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteBranchClick(branch)}
                            title="Hapus Cabang"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Petugas Kasir Yang Ditugaskan */}
                  {assignedKasirList.length > 0 && (
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 mb-3 bg-zinc-100/70 dark:bg-zinc-800/70 px-2.5 py-1 rounded-lg">
                      <span className="text-amber-500 font-bold">👤 Kasir:</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-200">
                        {assignedKasirList.map((k) => k.name).join(', ')}
                      </span>
                    </div>
                  )}

                  {/* Address and Phone */}
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1 mb-4">
                    {branch.address && (
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                        <span className="truncate">{branch.address}</span>
                      </div>
                    )}
                    {branch.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                        <span>{branch.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* 3 Real-time Balances breakdown */}
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                        <span>💵</span> Kas Laci Tunai:
                      </span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatRupiah(branch.cashDrawerBalance || 0)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                        <span>🏦</span> Saldo Bank / EDC:
                      </span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {formatRupiah(branch.bankBalance || 0)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                        <span>📱</span> Saldo Server Pulsa:
                      </span>
                      <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                        {formatRupiah(branch.digiposBalance || 0)}
                      </span>
                    </div>

                    <div className="border-t border-zinc-200 dark:border-zinc-800 pt-1.5 flex items-center justify-between text-xs font-black">
                      <span className="text-zinc-700 dark:text-zinc-300">Total Modal Cabang:</span>
                      <span className="font-mono text-zinc-900 dark:text-zinc-100">
                        {formatRupiah(branchTotalModal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Card Actions: Khusus Admin atau Kasir */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                  {isCashier ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 py-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs text-center border border-amber-500/30 flex items-center justify-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        <span>Cabang Tugas Anda</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenMutationModal(branch.id)}
                        className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                        title="Catat Mutasi Saldo Kas / Bank Cabang Ini"
                      >
                        <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
                        <span>Mutasi</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenAdjustRealModal(branch)}
                        className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                        title="Atur & Sesuaikan Saldo Riil Cabang Ini (Khusus Pemilik/Admin)"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-zinc-950" />
                        <span>Atur Saldo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenMutationModal(branch.id)}
                        className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        title="Catat Mutasi Saldo Kas / Bank Cabang Ini"
                      >
                        <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
                        <span>Catat Mutasi</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Real-time Balance Mutation History Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <ArrowUpDown className="w-5 h-5 text-amber-500" />
              <span>Buku Mutasi Saldo Kas & Bank</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Pencatatan riwayat penarikan, setoran, transfer, top up server, dan pergerakan kas laci vs rekening
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Cari mutasi, keterangan, kasir..."
              value={searchMutation}
              onChange={(e) => setSearchMutation(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {isCashier ? (
            <div className="px-3 py-2 rounded-xl text-xs bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 font-bold flex items-center gap-1.5">
              <span>🔒 Cabang: {displayBranches[0]?.name || 'Cabang Kasir'}</span>
            </div>
          ) : (
            <select
              value={historyBranchFilter}
              onChange={(e) => setHistoryBranchFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">Semua Cabang ({branches.length})</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          )}

          <select
            value={historyTypeFilter}
            onChange={(e) => setHistoryTypeFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="ALL">Semua Tipe Akun Saldo</option>
            <option value="CASH">💵 Uang Kas Laci Tunai</option>
            <option value="BANK">🏦 Saldo Rekening Bank / EDC</option>
            <option value="DIGIPOS">📱 Saldo Server Pulsa & Digipos</option>
          </select>
        </div>

        {/* Mutations Table */}
        <div className="overflow-x-auto border rounded-xl border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100 dark:bg-zinc-950/80 text-zinc-600 dark:text-zinc-400 font-bold uppercase tracking-wider text-[11px] border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="py-2.5 px-3">Waktu</th>
                <th className="py-2.5 px-3">Cabang</th>
                <th className="py-2.5 px-3">Akun Saldo</th>
                <th className="py-2.5 px-3">Arus & Nominal</th>
                <th className="py-2.5 px-3">Sebelum → Sesudah</th>
                <th className="py-2.5 px-3">Kategori & Keterangan</th>
                <th className="py-2.5 px-3">Kasir / Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono">
              {filteredMutations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-400 font-sans">
                    Belum ada riwayat mutasi saldo yang tercatat.
                  </td>
                </tr>
              ) : (
                filteredMutations.map((m) => {
                  const isIncoming = m.flow === 'IN';
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                        {formatDateIndo(m.date)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-sans font-bold text-zinc-800 dark:text-zinc-200">
                        {m.branchName || m.branchId}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.type === 'CASH'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : m.type === 'BANK'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                              : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                          }`}
                        >
                          {m.type === 'CASH' ? '💵 KAS LACI' : m.type === 'BANK' ? '🏦 BANK EDC' : '📱 DIGIPOS'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-bold">
                        <span
                          className={`inline-flex items-center gap-1 ${
                            isIncoming ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isIncoming ? (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {isIncoming ? '+' : '-'} {formatRupiah(m.amount)}
                          </span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-zinc-500 dark:text-zinc-400 text-[11px]">
                        <span>{formatRupiah(m.balanceBefore)}</span>
                        <span className="mx-1 text-zinc-300 dark:text-zinc-700">→</span>
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{formatRupiah(m.balanceAfter)}</span>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-zinc-700 dark:text-zinc-300 max-w-xs truncate">
                        <div className="font-semibold text-[11px] text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                          {m.category}
                        </div>
                        <div className="truncate text-xs">{m.description}</div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-sans text-zinc-500 dark:text-zinc-400 text-[11px]">
                        {m.cashierName}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Modal: Tambah / Edit Cabang */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="font-black text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-500" />
                <span>{editingBranch ? 'Edit Data Cabang' : 'Tambah Cabang Baru'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsBranchModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBranchSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Kode Cabang</label>
                  <input
                    type="text"
                    required
                    value={branchFormData.code}
                    onChange={(e) => setBranchFormData({ ...branchFormData, code: e.target.value })}
                    placeholder="e.g. CABANG-02"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono uppercase focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Nama Cabang</label>
                  <input
                    type="text"
                    required
                    value={branchFormData.name}
                    onChange={(e) => setBranchFormData({ ...branchFormData, name: e.target.value })}
                    placeholder="e.g. Cabang Simpang Pasar"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Alamat Cabang</label>
                <input
                  type="text"
                  value={branchFormData.address}
                  onChange={(e) => setBranchFormData({ ...branchFormData, address: e.target.value })}
                  placeholder="e.g. Jl. Raya Pasar Sentral No. 12"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">No. Telepon / WhatsApp</label>
                <input
                  type="text"
                  value={branchFormData.phone}
                  onChange={(e) => setBranchFormData({ ...branchFormData, phone: e.target.value })}
                  placeholder="e.g. 0812-3456-7890"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {!editingBranch && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <div className="font-bold text-zinc-800 dark:text-zinc-200 text-[11px] uppercase tracking-wider">
                    Modal Awal Cabang Baru:
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-zinc-500">Kas Laci</label>
                      <input
                        type="number"
                        value={branchFormData.cashDrawerBalance}
                        onChange={(e) => setBranchFormData({ ...branchFormData, cashDrawerBalance: Number(e.target.value) })}
                        className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500">Saldo Bank</label>
                      <input
                        type="number"
                        value={branchFormData.bankBalance}
                        onChange={(e) => setBranchFormData({ ...branchFormData, bankBalance: Number(e.target.value) })}
                        className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500">Saldo Pulsa</label>
                      <input
                        type="number"
                        value={branchFormData.digiposBalance}
                        onChange={(e) => setBranchFormData({ ...branchFormData, digiposBalance: Number(e.target.value) })}
                        className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-is-main"
                  checked={branchFormData.isMain}
                  onChange={(e) => setBranchFormData({ ...branchFormData, isMain: e.target.checked })}
                  className="rounded text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="chk-is-main" className="text-zinc-700 dark:text-zinc-300 text-xs cursor-pointer">
                  Jadikan Cabang Utama / Pusat
                </label>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black shadow-md transition-all cursor-pointer"
                >
                  {editingBranch ? 'Simpan Perubahan' : 'Buat Cabang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal: Catat Mutasi Kas / Bank (Kelola Mandiri) */}
      {isMutationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="font-black text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-amber-500" />
                <span>Pencatatan Mutasi Kas & Saldo Mandiri</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsMutationModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMutationSubmit} className="space-y-4 text-xs">
              {/* Branch Selector */}
              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Pilih Cabang</label>
                <select
                  value={selectedMutationBranchId}
                  onChange={(e) => setSelectedMutationBranchId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold focus:ring-2 focus:ring-amber-500"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code}) - Kas: {formatRupiah(b.cashDrawerBalance || 0)} | Bank: {formatRupiah(b.bankBalance || 0)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mutation Operation Type */}
              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">Jenis Transaksi Mutasi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMutationType('TARIK_BANK');
                      setMutationDescription('Tarik tunai dari rekening bank untuk modal laci kas');
                    }}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      mutationType === 'TARIK_BANK'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 font-bold shadow-xs'
                        : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="font-extrabold flex items-center gap-1">
                      <span>🏦 ➔ 💵</span> Tarik Tunai Bank
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Bank (-), Kas Laci (+)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMutationType('SETOR_BANK');
                      setMutationDescription('Setor kas tunai laci ke rekening bank operasional');
                    }}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      mutationType === 'SETOR_BANK'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 font-bold shadow-xs'
                        : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="font-extrabold flex items-center gap-1">
                      <span>💵 ➔ 🏦</span> Setor Kas ke Bank
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Kas Laci (-), Bank (+)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMutationType('TOPUP_SERVER');
                      setMutationDescription('Top Up Saldo Server Pulsa/Digipos dari Rekening Bank');
                    }}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      mutationType === 'TOPUP_SERVER'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 font-bold shadow-xs'
                        : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="font-extrabold flex items-center gap-1">
                      <span>🏦 ➔ 📱</span> Top Up Server Pulsa
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Bank (-), Digipos (+)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMutationType('MODAL_AWAL');
                      setMutationDescription('Suntikan modal uang tunai tambahan ke laci');
                    }}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      mutationType === 'MODAL_AWAL'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 font-bold shadow-xs'
                        : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="font-extrabold flex items-center gap-1">
                      <span>➕</span> Tambah Modal Kas
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Kas Laci (+)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMutationType('PENGELUARAN');
                      setMutationDescription('Biaya operasional / listrik / kertas struk toko');
                    }}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      mutationType === 'PENGELUARAN'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 font-bold shadow-xs'
                        : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="font-extrabold flex items-center gap-1">
                      <span>➖</span> Biaya Operasional
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Kas Laci (-)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMutationType('KOREKSI');
                      setMutationDescription('Koreksi / Penyesuaian Saldo');
                    }}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      mutationType === 'KOREKSI'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 font-bold shadow-xs'
                        : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="font-extrabold flex items-center gap-1">
                      <span>📝</span> Koreksi Saldo Opname
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Penyesuaian nominal</div>
                  </button>
                </div>
              </div>

              {mutationType === 'KOREKSI' && (
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Target Akun Koreksi</label>
                  <select
                    value={correctionTarget}
                    onChange={(e) => setCorrectionTarget(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="CASH">💵 Kas Laci Tunai</option>
                    <option value="BANK">🏦 Saldo Rekening Bank / EDC</option>
                    <option value="DIGIPOS">📱 Saldo Server Pulsa & Digipos</option>
                  </select>
                </div>
              )}

              {/* Amount Input */}
              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nominal Mutasi: <span className="font-mono text-amber-500">{formatRupiah(mutationAmount)}</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-zinc-400">Rp</span>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    required
                    value={mutationAmountInput}
                    onChange={(e) => {
                      setMutationAmountInput(e.target.value);
                      setMutationAmount(Number(e.target.value) || 0);
                    }}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono font-bold text-base focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Quick nominal shortcuts */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[200000, 500000, 1000000, 2000000, 5000000, 10000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setMutationAmount(amt);
                        setMutationAmountInput(String(amt));
                      }}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                    >
                      {formatRupiah(amt)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description Input */}
              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Keterangan / Catatan</label>
                <input
                  type="text"
                  required
                  value={mutationDescription}
                  onChange={(e) => setMutationDescription(e.target.value)}
                  placeholder="e.g. Tarik uang tunai di ATM BRI Unit Pasar untuk kasir"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsMutationModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black shadow-md transition-all cursor-pointer"
                >
                  Proses & Catat Mutasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Atur Saldo Riil (Khusus Admin / Pemilik) */}
      {isAdjustRealModalOpen && adjustingBranch && onSetRealBalances && (
        <AdjustRealBalancesModal
          isOpen={isAdjustRealModalOpen}
          onClose={() => setIsAdjustRealModalOpen(false)}
          branch={adjustingBranch}
          currentUser={currentUser}
          users={users}
          onSaveRealBalances={onSetRealBalances}
        />
      )}
    </div>
  );
};

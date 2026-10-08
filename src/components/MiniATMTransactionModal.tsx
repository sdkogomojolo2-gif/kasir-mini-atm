import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Smartphone,
  Wallet,
  Zap,
  X,
  CheckCircle2,
  AlertTriangle,
  Building2,
  CreditCard,
  Phone,
  User,
  ShieldCheck,
  Sparkles,
  Printer,
  Coins,
} from 'lucide-react';
import {
  ServiceType,
  Transaction,
  StoreBranch,
  StoreSettings,
  CashierUser,
  PaymentMethod,
} from '../types';
import { formatRupiah } from '../services/export';
import { sound } from '../services/sound';

interface MiniATMTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeBranch: StoreBranch;
  settings: StoreSettings;
  currentUser: CashierUser | null;
  initialService?: ServiceType;
  onCompleteTransaction: (
    trx: Transaction,
    balanceChanges: { cashChange: number; bankChange: number; digiposChange: number },
    mutationMeta: {
      category: 'TRANSAKSI' | 'TARIK_BANK' | 'SETOR_BANK' | 'TOPUP_SERVER' | 'MODAL_AWAL' | 'PENGELUARAN' | 'LAINNYA';
      description: string;
    }
  ) => void;
  darkMode: boolean;
}

const BANK_OPTIONS = [
  { code: 'BRI', name: 'Bank BRI', icon: '🏦' },
  { code: 'BCA', name: 'Bank BCA', icon: '🏦' },
  { code: 'MANDIRI', name: 'Bank Mandiri', icon: '🏦' },
  { code: 'BNI', name: 'Bank BNI', icon: '🏦' },
  { code: 'BSI', name: 'Bank Syariah Indonesia (BSI)', icon: '🕌' },
  { code: 'BTN', name: 'Bank BTN', icon: '🏦' },
  { code: 'CIMB', name: 'CIMB Niaga', icon: '🏦' },
  { code: 'PERMATA', name: 'Bank Permata', icon: '🏦' },
  { code: 'JATIM', name: 'Bank Jatim / BPD Lainnya', icon: '🏦' },
];

const EWALLET_OPTIONS = [
  { code: 'DANA', name: 'DANA E-Wallet', color: 'bg-blue-600', icon: '💙' },
  { code: 'SHOPEEPAY', name: 'ShopeePay', color: 'bg-orange-500', icon: '🧡' },
  { code: 'GOPAY', name: 'GoPay Customer', color: 'bg-emerald-600', icon: '💚' },
  { code: 'OVO', name: 'OVO Cash', color: 'bg-purple-600', icon: '💜' },
  { code: 'LINKAJA', name: 'LinkAja', color: 'bg-red-600', icon: '❤️' },
  { code: 'MAXIM', name: 'Maxim Driver/Cust', color: 'bg-yellow-500', icon: '🚖' },
];

const PULSA_NOMINALS = [
  { nominal: 5000, buy: 5500, fee: 2000, sell: 7500 },
  { nominal: 10000, buy: 10400, fee: 2000, sell: 12500 },
  { nominal: 15000, buy: 15200, fee: 2000, sell: 17500 },
  { nominal: 20000, buy: 20100, fee: 2500, sell: 22500 },
  { nominal: 25000, buy: 25100, fee: 2500, sell: 27500 },
  { nominal: 50000, buy: 49800, fee: 2500, sell: 52500 },
  { nominal: 100000, buy: 98500, fee: 3000, sell: 101500 },
];

const DATA_PACKAGES = [
  { name: 'Kuota Harian 3GB (3 Hari)', buy: 12000, sell: 15000 },
  { name: 'Kuota Mingguan 7GB (7 Hari)', buy: 24000, sell: 28000 },
  { name: 'Kuota Bulanan 10GB (30 Hari)', buy: 35000, sell: 40000 },
  { name: 'Kuota Bulanan 25GB (30 Hari)', buy: 70000, sell: 77000 },
  { name: 'Kuota Jumbo 50GB (30 Hari)', buy: 110000, sell: 120000 },
];

export const MiniATMTransactionModal: React.FC<MiniATMTransactionModalProps> = ({
  isOpen,
  onClose,
  activeBranch,
  settings,
  currentUser,
  initialService = 'TARIK_TUNAI',
  onCompleteTransaction,
  darkMode,
}) => {
  const [activeTab, setActiveTab] = useState<ServiceType>(initialService);

  // Common Form States
  const [destinationBank, setDestinationBank] = useState('BRI');
  const [sourceBank, setSourceBank] = useState('BRI');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [nominalAmount, setNominalAmount] = useState<number>(100000);
  const [customNominalInput, setCustomNominalInput] = useState('100000');
  const [adminFee, setAdminFee] = useState<number>(settings.defaultAdminFee || 5000);
  const [customFeeInput, setCustomFeeInput] = useState(String(settings.defaultAdminFee || 5000));
  const [selectedEwallet, setSelectedEwallet] = useState('DANA');
  const [selectedDataPkg, setSelectedDataPkg] = useState(DATA_PACKAGES[2].name);
  const [plnType, setPlnType] = useState<'TOKEN' | 'PASCA'>('TOKEN');
  const [idPelanggan, setIdPelanggan] = useState('');
  const [ppobType, setPpobType] = useState<'BPJS' | 'PDAM' | 'WIFI' | 'LEASING'>('BPJS');
  const [adminMode, setAdminMode] = useState<'LUAR' | 'DALAM'>('LUAR');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  // Auto detect cellular provider from phone prefix
  const detectProvider = (phone: string): string => {
    const clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0811') || clean.startsWith('0812') || clean.startsWith('0813') || clean.startsWith('0821') || clean.startsWith('0822') || clean.startsWith('0852') || clean.startsWith('0853')) {
      return 'Telkomsel';
    }
    if (clean.startsWith('0814') || clean.startsWith('0815') || clean.startsWith('0816') || clean.startsWith('0855') || clean.startsWith('0856') || clean.startsWith('0857') || clean.startsWith('0858')) {
      return 'Indosat';
    }
    if (clean.startsWith('0817') || clean.startsWith('0818') || clean.startsWith('0819') || clean.startsWith('0859') || clean.startsWith('0877') || clean.startsWith('0878')) {
      return 'XL Axiata';
    }
    if (clean.startsWith('0831') || clean.startsWith('0832') || clean.startsWith('0838')) {
      return 'Axis';
    }
    if (clean.startsWith('0895') || clean.startsWith('0896') || clean.startsWith('0897') || clean.startsWith('0898') || clean.startsWith('0899')) {
      return 'Tri (3)';
    }
    if (clean.startsWith('0881') || clean.startsWith('0882') || clean.startsWith('0887') || clean.startsWith('0888') || clean.startsWith('0889')) {
      return 'Smartfren';
    }
    return 'Semua Operator';
  };

  const detectedProvider = detectProvider(customerPhone);

  // Generate 20 digit realistic PLN Token
  const generateToken20Digit = (): string => {
    const blocks: string[] = [];
    for (let i = 0; i < 5; i++) {
      const num = Math.floor(1000 + Math.random() * 9000);
      blocks.push(String(num));
    }
    return blocks.join('-');
  };

  // Generate reference number
  const generateRefNumber = (): string => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `REF-${dateStr}-${rand}`;
  };

  const handleNominalSelect = (val: number) => {
    setNominalAmount(val);
    setCustomNominalInput(String(val));
    sound.playBeep(700, 0.03);
  };

  const handleFeeChange = (val: number) => {
    setAdminFee(val);
    setCustomFeeInput(String(val));
  };

  // Validation & Balance Checking
  const isCashSufficientForTarikTunai = (activeBranch.cashDrawerBalance || 0) >= nominalAmount;
  const isBankSufficientForSetor = (activeBranch.bankBalance || 0) >= nominalAmount;
  const isDigiposSufficientForPulsa = (activeBranch.digiposBalance || 0) >= nominalAmount;

  // Process and finalize transaction
  const handleSubmitTransaction = (e: React.FormEvent) => {
    e.preventDefault();

    const refNo = generateRefNumber();
    const invoiceNo = `INV-${Date.now().toString().slice(-8)}`;
    const nowIso = new Date().toISOString();
    const cashierName = currentUser?.name || 'Kasir Agen';
    const cashierId = currentUser?.id || 'kasir-1';

    let serviceTitle = '';
    let productName = '';
    let totalCost = nominalAmount;
    let grandTotal = nominalAmount + adminFee;
    let profit = adminFee;
    let tokenCode: string | undefined = undefined;
    let snNumber: string | undefined = undefined;

    // Balance changes: { cashChange, bankChange, digiposChange }
    let cashChange = 0;
    let bankChange = 0;
    let digiposChange = 0;
    let mutationCategory: 'TRANSAKSI' | 'TARIK_BANK' | 'SETOR_BANK' | 'TOPUP_SERVER' = 'TRANSAKSI';
    let mutationDesc = '';

    if (activeTab === 'TARIK_TUNAI') {
      const requiredCash = adminMode === 'DALAM' ? Math.max(0, nominalAmount - adminFee) : nominalAmount;
      if ((activeBranch.cashDrawerBalance || 0) < requiredCash) {
        sound.playError();
        alert(`Uang kas tunai di laci tidak mencukupi! Kas saat ini: ${formatRupiah(activeBranch.cashDrawerBalance || 0)}. Dibutuhkan uang tunai: ${formatRupiah(requiredCash)}.`);
        return;
      }
      serviceTitle = 'TARIK TUNAI ATM / EDC';
      if (adminMode === 'DALAM') {
        productName = `Tarik Tunai ${destinationBank} ${formatRupiah(nominalAmount)} (Potong Admin)`;
        totalCost = nominalAmount - adminFee;
        grandTotal = nominalAmount;
        profit = adminFee;
        cashChange = -requiredCash;
        bankChange = nominalAmount;
        mutationDesc = `Tarik Tunai ${destinationBank} [Potong Saldo Fee: ${formatRupiah(adminFee)}] Rek: ${accountNumber || '-'} (${accountName || 'Nasabah'})`;
      } else {
        productName = `Tarik Tunai ${destinationBank} ${formatRupiah(nominalAmount)}`;
        totalCost = nominalAmount;
        grandTotal = nominalAmount + adminFee;
        profit = adminFee;
        // Kas laci keluar nominal ke nasabah: -nominal
        // Saldo rekening bank agen bertambah: +(nominal + adminFee) karena nasabah mendebet kartu ke rekening agen
        cashChange = -nominalAmount;
        bankChange = nominalAmount + adminFee;
        mutationDesc = `Tarik Tunai ${destinationBank} Rek: ${accountNumber || '-'} (${accountName || 'Nasabah'})`;
      }
    } else if (activeTab === 'SETOR_TUNAI') {
      if (!isBankSufficientForSetor) {
        sound.playError();
        alert(`Saldo rekening bank agen tidak mencukupi! Saldo bank saat ini: ${formatRupiah(activeBranch.bankBalance || 0)}. Dibutuhkan saldo: ${formatRupiah(nominalAmount)}.`);
        return;
      }
      serviceTitle = 'SETOR TUNAI BANK';
      productName = `Setor Tunai ${destinationBank} ${formatRupiah(nominalAmount)}`;
      totalCost = nominalAmount;
      grandTotal = nominalAmount + adminFee;
      profit = adminFee;
      // Nasabah menyerahkan uang fisik ke laci: +(nominal + adminFee)
      // Agen transfer dari rekening bank ke nasabah: -nominal
      cashChange = nominalAmount + adminFee;
      bankChange = -nominalAmount;
      mutationDesc = `Setor Tunai ${destinationBank} Rek: ${accountNumber || '-'} a/n ${accountName || 'Nasabah'}`;
    } else if (activeTab === 'TRANSFER_BANK') {
      if (!isBankSufficientForSetor) {
        sound.playError();
        alert(`Saldo bank agen tidak mencukupi untuk transfer! Saldo saat ini: ${formatRupiah(activeBranch.bankBalance || 0)}.`);
        return;
      }
      serviceTitle = 'TRANSFER ANTAR BANK';
      productName = `Transfer ke ${destinationBank} ${formatRupiah(nominalAmount)}`;
      totalCost = nominalAmount;
      grandTotal = nominalAmount + adminFee;
      profit = adminFee;
      cashChange = nominalAmount + adminFee;
      bankChange = -nominalAmount;
      mutationDesc = `Transfer ${sourceBank} ke ${destinationBank} Rek: ${accountNumber} a/n ${accountName || 'Penerima'}`;
    } else if (activeTab === 'PULSA' || activeTab === 'PAKET_DATA') {
      serviceTitle = activeTab === 'PULSA' ? 'ISI PULSA REGULER' : 'PAKET DATA INTERNET';
      productName = activeTab === 'PULSA'
        ? `Pulsa ${detectedProvider} ${formatRupiah(nominalAmount)}`
        : `${selectedDataPkg} (${detectedProvider})`;
      totalCost = nominalAmount;
      grandTotal = nominalAmount + adminFee;
      profit = adminFee;
      snNumber = `SN${Date.now().toString().slice(-10)}/${Math.floor(1000 + Math.random() * 9000)}`;
      // Pelanggan bayar tunai: +(nominal + admin)
      // Saldo digipos agen berkurang modal: -nominal
      cashChange = nominalAmount + adminFee;
      digiposChange = -nominalAmount;
      mutationDesc = `${serviceTitle} ${customerPhone} (${detectedProvider})`;
    } else if (activeTab === 'TOPUP_EWALLET') {
      serviceTitle = `TOP UP ${selectedEwallet}`;
      productName = `Top Up ${selectedEwallet} ${formatRupiah(nominalAmount)}`;
      totalCost = nominalAmount;
      grandTotal = nominalAmount + adminFee;
      profit = adminFee;
      snNumber = `EW${Date.now().toString().slice(-8)}OK`;
      cashChange = nominalAmount + adminFee;
      bankChange = -nominalAmount; // E-wallet biasanya dipotong saldo rekening/VA bank
      mutationDesc = `Top Up ${selectedEwallet} No: ${customerPhone} a/n ${accountName || 'User'}`;
    } else if (activeTab === 'TOKEN_PLN') {
      if (plnType === 'TOKEN') {
        tokenCode = generateToken20Digit();
        serviceTitle = 'TOKEN LISTRIK PLN PRABAYAR';
        productName = `Token Listrik PLN ${formatRupiah(nominalAmount)}`;
        totalCost = nominalAmount;
        grandTotal = nominalAmount + adminFee;
        profit = adminFee;
      } else {
        serviceTitle = 'TAGIHAN LISTRIK PLN PASCA';
        productName = `Bayar Listrik PLN ID: ${idPelanggan}`;
        totalCost = nominalAmount;
        grandTotal = nominalAmount + adminFee;
        profit = adminFee;
      }
      cashChange = nominalAmount + adminFee;
      bankChange = -nominalAmount;
      mutationDesc = `${serviceTitle} ID: ${idPelanggan || customerPhone}`;
    } else if (activeTab === 'TAGIHAN_PPOB') {
      serviceTitle = `TAGIHAN ${ppobType}`;
      productName = `Bayar Tagihan ${ppobType} ID: ${idPelanggan}`;
      totalCost = nominalAmount;
      grandTotal = nominalAmount + adminFee;
      profit = adminFee;
      cashChange = nominalAmount + adminFee;
      bankChange = -nominalAmount;
      mutationDesc = `Bayar Tagihan ${ppobType} ID: ${idPelanggan}`;
    }

    const newTrx: Transaction = {
      id: `trx-${Date.now()}`,
      invoiceNumber: invoiceNo,
      referenceNumber: refNo,
      date: nowIso,
      cashierId,
      cashierName,
      branchId: activeBranch.id,
      branchName: activeBranch.name,
      items: [
        {
          productId: `prod-svc-${Date.now()}`,
          productName,
          barcode: refNo,
          category: activeTab === 'TARIK_TUNAI' || activeTab === 'SETOR_TUNAI' || activeTab === 'TRANSFER_BANK'
            ? 'Layanan Mini ATM'
            : activeTab === 'PULSA' || activeTab === 'PAKET_DATA'
            ? 'Pulsa & Paket Data'
            : activeTab === 'TOPUP_EWALLET'
            ? 'Top Up E-Wallet'
            : 'Token & Listrik PLN',
          buyPrice: totalCost,
          sellPrice: grandTotal,
          quantity: 1,
          discount: 0,
          subtotal: grandTotal,
          profit,
          serviceType: activeTab,
          provider: destinationBank || selectedEwallet || detectedProvider,
        },
      ],
      totalQuantity: 1,
      subtotal: grandTotal,
      discount: 0,
      grandTotal,
      totalCost,
      totalProfit: profit,
      paymentMethod: 'TUNAI',
      cashAmount: grandTotal,
      changeAmount: 0,
      customerName: accountName || undefined,
      customerPhone: customerPhone || undefined,
      notes: notes || undefined,
      status: 'COMPLETED',
      serviceType: activeTab,
      destinationBank: destinationBank || undefined,
      sourceBank: sourceBank || undefined,
      accountNumber: accountNumber || idPelanggan || undefined,
      accountName: accountName || undefined,
      nominalAmount,
      adminFee,
      tokenCode,
      snNumber,
    };

    onCompleteTransaction(
      newTrx,
      { cashChange, bankChange, digiposChange },
      {
        category: mutationCategory,
        description: mutationDesc,
      }
    );

    sound.playSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div
        className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border my-6 flex flex-col ${
          darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
              🏧
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight text-zinc-900 dark:text-zinc-100">
                  Transaksi Cepat Mini ATM &amp; Konter
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-mono font-bold">
                  {activeBranch.code}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                Cabang: <strong className="text-zinc-300">{activeBranch.name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Balance Bar for this Branch */}
        <div className="px-5 py-2.5 bg-zinc-100 dark:bg-zinc-950/70 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between text-xs font-mono gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400">Kas Laci Fisik:</span>
            <span className={`font-bold ${activeBranch.cashDrawerBalance < 200000 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {formatRupiah(activeBranch.cashDrawerBalance || 0)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400">Saldo Bank / EDC:</span>
            <span className="font-bold text-blue-400">
              {formatRupiah(activeBranch.bankBalance || 0)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400">Saldo Server Pulsa:</span>
            <span className="font-bold text-amber-400">
              {formatRupiah(activeBranch.digiposBalance || 0)}
            </span>
          </div>
        </div>

        {/* Service Tab Switcher */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-4 bg-zinc-50 dark:bg-zinc-950/40 overflow-x-auto text-xs font-bold gap-1 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('TARIK_TUNAI')}
            className={`px-3 py-2 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'TARIK_TUNAI'
                ? 'bg-white dark:bg-zinc-900 text-amber-500 border-amber-500 shadow-xs'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            <span>Tarik Tunai</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SETOR_TUNAI')}
            className={`px-3 py-2 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'SETOR_TUNAI'
                ? 'bg-white dark:bg-zinc-900 text-amber-500 border-amber-500 shadow-xs'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-blue-400" />
            <span>Setor Tunai</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TRANSFER_BANK')}
            className={`px-3 py-2 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'TRANSFER_BANK'
                ? 'bg-white dark:bg-zinc-900 text-amber-500 border-amber-500 shadow-xs'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <RefreshCw className="w-4 h-4 text-purple-400" />
            <span>Transfer Bank</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PULSA')}
            className={`px-3 py-2 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'PULSA'
                ? 'bg-white dark:bg-zinc-900 text-amber-500 border-amber-500 shadow-xs'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Smartphone className="w-4 h-4 text-amber-400" />
            <span>Pulsa &amp; Data</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TOPUP_EWALLET')}
            className={`px-3 py-2 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'TOPUP_EWALLET'
                ? 'bg-white dark:bg-zinc-900 text-amber-500 border-amber-500 shadow-xs'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Wallet className="w-4 h-4 text-cyan-400" />
            <span>Top Up E-Wallet</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TOKEN_PLN')}
            className={`px-3 py-2 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'TOKEN_PLN'
                ? 'bg-white dark:bg-zinc-900 text-amber-500 border-amber-500 shadow-xs'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Zap className="w-4 h-4 text-yellow-400" />
            <span>Token PLN</span>
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmitTransaction} className="p-5 space-y-4 overflow-y-auto max-h-[65vh]">
          {/* TAB 1: TARIK TUNAI ATM / EDC */}
          {activeTab === 'TARIK_TUNAI' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-start gap-2">
                <ArrowDownLeft className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Tarik Tunai Kartu ATM / EDC Agen:</strong> Nasabah mendebet kartu/transfer ke rekening agen, agen menyerahkan uang tunai fisik dari laci kas.
                </div>
              </div>

              {!isCashSufficientForTarikTunai && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Peringatan: Uang kas fisik di laci tidak cukup untuk nominal penarikan ini.</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">
                    Bank Kartu Nasabah:
                  </label>
                  <select
                    value={destinationBank}
                    onChange={(e) => setDestinationBank(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-bold bg-zinc-950 border-zinc-800 text-white focus:border-amber-500 focus:outline-hidden"
                  >
                    {BANK_OPTIONS.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.icon} {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">
                    Nama Pemilik Rekening / Nasabah:
                  </label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-zinc-950 border-zinc-800 text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1 font-mono">
                    Nomor Rekening / Kartu (Opsional):
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="1234567890"
                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono bg-zinc-950 border-zinc-800 text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1 font-mono">
                    No. WhatsApp Nasabah (Kirim Struk):
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="08123456789"
                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono bg-zinc-950 border-zinc-800 text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Nominal Quick Chips */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1.5">
                  Pilih Nominal Penarikan Tunai:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {[50000, 100000, 200000, 500000, 1000000, 2000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleNominalSelect(amt)}
                      className={`py-2 px-1 text-center rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                        nominalAmount === amt
                          ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-sm'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      {formatRupiah(amt).replace('Rp ', '')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SETOR TUNAI BANK */}
          {activeTab === 'SETOR_TUNAI' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 flex items-start gap-2">
                <ArrowUpRight className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Setor Tunai ke Rekening Bank:</strong> Nasabah memberikan uang tunai ke agen, agen mentransfer nominal uang dari rekening bank agen ke rekening tujuan nasabah.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">
                    Bank Tujuan Setoran:
                  </label>
                  <select
                    value={destinationBank}
                    onChange={(e) => setDestinationBank(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-bold bg-zinc-950 border-zinc-800 text-white focus:border-amber-500 focus:outline-hidden"
                  >
                    {BANK_OPTIONS.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.icon} {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1 font-mono">
                    Nomor Rekening Tujuan: <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Contoh: 0012019920192"
                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold bg-zinc-950 border-zinc-800 text-amber-400 placeholder-zinc-600 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">
                    Nama Pemilik Rekening Tujuan: <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Contoh: Siti Rahmawati"
                    className="w-full px-3 py-2 rounded-xl border text-xs font-bold bg-zinc-950 border-zinc-800 text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1 font-mono">
                    No. WhatsApp Penyetor (Struk):
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="08123456789"
                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono bg-zinc-950 border-zinc-800 text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Nominal Quick Chips */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1.5">
                  Pilih Nominal Setoran:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {[50000, 100000, 200000, 500000, 1000000, 2500000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleNominalSelect(amt)}
                      className={`py-2 px-1 text-center rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                        nominalAmount === amt
                          ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-sm'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      {formatRupiah(amt).replace('Rp ', '')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TRANSFER ANTAR BANK */}
          {activeTab === 'TRANSFER_BANK' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-400 flex items-start gap-2">
                <RefreshCw className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Transfer Antar Bank:</strong> Kirim uang ke rekening bank mana saja di seluruh Indonesia secara instan dengan bukti struk perbankan resmi.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">
                    Bank Asal Agen:
                  </label>
                  <select
                    value={sourceBank}
                    onChange={(e) => setSourceBank(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-bold bg-zinc-950 border-zinc-800 text-white focus:border-amber-500 focus:outline-hidden"
                  >
                    {BANK_OPTIONS.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.icon} {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">
                    Bank Tujuan Penerima:
                  </label>
                  <select
                    value={destinationBank}
                    onChange={(e) => setDestinationBank(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-bold bg-zinc-950 border-zinc-800 text-white focus:border-amber-500 focus:outline-hidden"
                  >
                    {BANK_OPTIONS.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.icon} {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1 font-mono">
                    Nomor Rekening Tujuan: <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Contoh: 1234567890"
                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold bg-zinc-950 border-zinc-800 text-amber-400 placeholder-zinc-600 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">
                    Nama Penerima: <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Contoh: Bambang Hermanto"
                    className="w-full px-3 py-2 rounded-xl border text-xs font-bold bg-zinc-950 border-zinc-800 text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PULSA & PAKET DATA */}
          {activeTab === 'PULSA' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 flex items-start gap-2">
                <Smartphone className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Isi Ulang Pulsa &amp; Kuota Data:</strong> Masukkan nomor HP, operator akan terdeteksi otomatis (Telkomsel, Indosat, XL, Tri, Axis, Smartfren).
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1 font-mono">
                    Nomor Handphone Pelanggan: <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="0812xxxxxxx"
                      className="w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold bg-zinc-950 border-zinc-800 text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-hidden"
                    />
                    <span className="absolute right-3 top-2 text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-amber-400 font-bold">
                      {detectedProvider}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">
                    Jenis Produk:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setNotes('Pulsa Reguler')}
                      className={`py-2 text-xs font-bold rounded-xl border cursor-pointer ${
                        notes !== 'Paket Data'
                          ? 'bg-amber-500 text-zinc-950 border-amber-500'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-300'
                      }`}
                    >
                      Pulsa Reguler
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotes('Paket Data')}
                      className={`py-2 text-xs font-bold rounded-xl border cursor-pointer ${
                        notes === 'Paket Data'
                          ? 'bg-amber-500 text-zinc-950 border-amber-500'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-300'
                      }`}
                    >
                      Paket Kuota
                    </button>
                  </div>
                </div>
              </div>

              {notes === 'Paket Data' ? (
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">
                    Pilih Paket Kuota Internet:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {DATA_PACKAGES.map((pkg) => (
                      <button
                        key={pkg.name}
                        type="button"
                        onClick={() => {
                          setSelectedDataPkg(pkg.name);
                          setNominalAmount(pkg.buy);
                          setAdminFee(pkg.sell - pkg.buy);
                        }}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          selectedDataPkg === pkg.name
                            ? 'bg-amber-500/10 border-amber-500 text-white ring-1 ring-amber-500'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <div className="text-xs font-bold">{pkg.name}</div>
                        <div className="text-[11px] font-mono text-amber-400 mt-0.5">
                          Harga Jual: {formatRupiah(pkg.sell)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">
                    Pilih Nominal Pulsa:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PULSA_NOMINALS.map((p) => (
                      <button
                        key={p.nominal}
                        type="button"
                        onClick={() => {
                          setNominalAmount(p.nominal);
                          setAdminFee(p.sell - p.nominal);
                        }}
                        className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                          nominalAmount === p.nominal
                            ? 'bg-amber-500 text-zinc-950 border-amber-500 font-bold'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <div className="text-xs font-mono font-bold">
                          {formatRupiah(p.nominal).replace('Rp ', '')}
                        </div>
                        <div className="text-[10px] opacity-80 mt-0.5">
                          Jual: {formatRupiah(p.sell)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: TOP UP E-WALLET */}
          {activeTab === 'TOPUP_EWALLET' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-400 flex items-start gap-2">
                <Wallet className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Top Up Saldo E-Wallet:</strong> DANA, OVO, GoPay, ShopeePay, LinkAja, Maxim. Langsung masuk ke akun pelanggan secara instan.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1.5">
                  Pilih Layanan E-Wallet:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {EWALLET_OPTIONS.map((ew) => (
                    <button
                      key={ew.code}
                      type="button"
                      onClick={() => setSelectedEwallet(ew.code)}
                      className={`p-2 rounded-xl border text-center cursor-pointer transition-all flex flex-col items-center gap-1 ${
                        selectedEwallet === ew.code
                          ? 'bg-amber-500 text-zinc-950 border-amber-500 font-bold'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <span className="text-base">{ew.icon}</span>
                      <span className="text-[11px] font-bold">{ew.code}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1 font-mono">
                    Nomor HP / Akun {selectedEwallet}: <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="08123456789"
                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold bg-zinc-950 border-zinc-800 text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">
                    Nama Akun E-Wallet (Opsional):
                  </label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Nama di aplikasi"
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-zinc-950 border-zinc-800 text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1.5">
                  Nominal Top Up:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {[20000, 50000, 100000, 200000, 300000, 500000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleNominalSelect(amt)}
                      className={`py-2 px-1 text-center rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                        nominalAmount === amt
                          ? 'bg-amber-500 text-zinc-950 border-amber-500'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      {formatRupiah(amt).replace('Rp ', '')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: TOKEN PLN & LISTRIK */}
          {activeTab === 'TOKEN_PLN' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400 flex items-start gap-2">
                <Zap className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Token Listrik PLN Prabayar:</strong> Struk akan otomatis mencetak 20 digit kode stroom token PLN yang dapat langsung dimasukkan ke meteran listrik.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1 font-mono">
                    ID Pelanggan / No. Meter PLN (11-12 Digit): <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={idPelanggan}
                    onChange={(e) => setIdPelanggan(e.target.value)}
                    placeholder="Contoh: 14029102910"
                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold bg-zinc-950 border-zinc-800 text-amber-400 placeholder-zinc-600 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">
                    Nama Pemilik Meteran:
                  </label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Contoh: Bpk. Ahmad"
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-zinc-950 border-zinc-800 text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1.5">
                  Nominal Token Listrik:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {[20000, 50000, 100000, 200000, 500000, 1000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleNominalSelect(amt)}
                      className={`py-2 px-1 text-center rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                        nominalAmount === amt
                          ? 'bg-amber-500 text-zinc-950 border-amber-500'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      {formatRupiah(amt).replace('Rp ', '')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Common Nominal & Admin Fee Adjustment Bar */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            {/* Mode Biaya Admin (Khusus Tarik Tunai & Transfer) */}
            {(activeTab === 'TARIK_TUNAI' || activeTab === 'TRANSFER_BANK') && (
              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2">
                <span className="text-xs font-black text-zinc-300">Mode Biaya Admin:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAdminMode('LUAR')}
                    className={`px-3 py-1 rounded-md text-xs font-black transition-all cursor-pointer ${
                      adminMode === 'LUAR'
                        ? 'bg-amber-500 text-zinc-950 shadow-xs'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Admin di Luar
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminMode('DALAM')}
                    className={`px-3 py-1 rounded-md text-xs font-black transition-all cursor-pointer ${
                      adminMode === 'DALAM'
                        ? 'bg-amber-500 text-zinc-950 shadow-xs'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Potong Saldo (Admin di Dalam)
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 font-mono">
                  Nominal Transaksi (Rp): <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  required
                  value={customNominalInput}
                  onChange={(e) => {
                    setCustomNominalInput(e.target.value);
                    setNominalAmount(Number(e.target.value) || 0);
                  }}
                  className="w-full px-3 py-2 rounded-xl border text-sm font-mono font-black bg-zinc-900 border-zinc-800 text-white focus:border-amber-500 focus:outline-hidden"
                />
                {/* Quick nominal buttons */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {[50000, 100000, 200000, 500000, 1000000, 2000000, 5000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleNominalSelect(amt)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                        nominalAmount === amt
                          ? 'bg-amber-500 text-zinc-950'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      {amt >= 1000000 ? `${amt / 1000000}Jt` : `${amt / 1000}Rb`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 font-mono flex items-center justify-between">
                  <span>Biaya Admin Agen (Untung):</span>
                  <span className="text-[10px] text-amber-400 font-bold">Laba Langsung</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  required
                  value={customFeeInput}
                  onChange={(e) => {
                    setCustomFeeInput(e.target.value);
                    setAdminFee(Number(e.target.value) || 0);
                  }}
                  className="w-full px-3 py-2 rounded-xl border text-sm font-mono font-black bg-zinc-900 border-zinc-800 text-amber-400 focus:border-amber-500 focus:outline-hidden"
                />
                {/* Quick fee buttons */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {[2000, 3000, 5000, 7000, 10000, 15000].map((fee) => (
                    <button
                      key={fee}
                      type="button"
                      onClick={() => handleFeeChange(fee)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                        adminFee === fee
                          ? 'bg-emerald-500 text-zinc-950'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      {formatRupiah(fee).replace('Rp ', '')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Total Billing Preview Card */}
            <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-zinc-400 font-mono">
                  {adminMode === 'DALAM' && activeTab === 'TARIK_TUNAI'
                    ? 'Uang Tunai Diserahkan ke Nasabah:'
                    : 'Total Yang Dibayar Nasabah:'}
                </div>
                <div className="text-lg font-black text-white font-mono">
                  {adminMode === 'DALAM' && activeTab === 'TARIK_TUNAI'
                    ? formatRupiah(Math.max(0, nominalAmount - adminFee))
                    : formatRupiah(nominalAmount + adminFee)}
                </div>
                {adminMode === 'DALAM' && activeTab === 'TARIK_TUNAI' && (
                  <div className="text-[10px] text-amber-400 font-mono font-bold">
                    (Kartu didebet: {formatRupiah(nominalAmount)})
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-[10px] text-zinc-400 font-mono">Keuntungan Admin:</div>
                <div className="text-sm font-bold text-emerald-400 font-mono">
                  +{formatRupiah(adminFee)}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white font-bold text-xs cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs rounded-xl shadow-lg cursor-pointer transition-all active:scale-95 flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Proses Transaksi &amp; Cetak Struk</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

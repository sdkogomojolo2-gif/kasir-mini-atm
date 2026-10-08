import React, { useState, useMemo } from 'react';
import {
  Calculator,
  X,
  ArrowRight,
  Sparkles,
  Coins,
  CreditCard,
  Building2,
  Check,
  Percent,
  TrendingUp,
} from 'lucide-react';
import { ServiceType, StoreBranch } from '../types';
import { formatRupiah } from '../services/export';
import { sound } from '../services/sound';

interface QuickFeeCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAdminFee: number;
  activeBranch?: StoreBranch;
  onSelectTransaction?: (params: {
    serviceType: ServiceType;
    nominal: number;
    adminFee: number;
    adminMode: 'LUAR' | 'DALAM';
    bank?: string;
  }) => void;
  darkMode: boolean;
}

const PRESET_NOMINALS = [
  50000, 100000, 200000, 300000, 500000, 1000000, 1500000, 2000000, 3000000, 5000000, 10000000,
];

const PRESET_FEES = [2000, 2500, 3000, 5000, 7000, 10000, 15000, 20000];

export const QuickFeeCalculatorModal: React.FC<QuickFeeCalculatorModalProps> = ({
  isOpen,
  onClose,
  defaultAdminFee = 5000,
  activeBranch,
  onSelectTransaction,
  darkMode,
}) => {
  const [serviceType, setServiceType] = useState<ServiceType>('TARIK_TUNAI');
  const [nominal, setNominal] = useState<number>(500000);
  const [nominalInput, setNominalInput] = useState<string>('500000');
  const [adminFee, setAdminFee] = useState<number>(defaultAdminFee);
  const [feeInput, setFeeInput] = useState<string>(String(defaultAdminFee));
  const [adminMode, setAdminMode] = useState<'LUAR' | 'DALAM'>('LUAR');
  const [bank, setBank] = useState<string>('BRI');

  if (!isOpen) return null;

  const handleNominalChange = (val: number) => {
    setNominal(val);
    setNominalInput(String(val));
    sound.playBeep(700, 0.03);
  };

  const handleFeeChange = (val: number) => {
    setAdminFee(val);
    setFeeInput(String(val));
    sound.playBeep(750, 0.03);
  };

  // Calculations based on mode
  const calc = useMemo(() => {
    if (adminMode === 'LUAR') {
      // Admin Di Luar:
      // Tarik Tunai: Nasabah gesek (Nominal + Admin), nasabah terima uang tunai fisik seharga Nominal.
      // Setor/Transfer: Nasabah serahkan uang tunai (Nominal + Admin), agen transfer seharga Nominal.
      const totalCustomerPays = nominal + adminFee;
      const cashHanded = serviceType === 'TARIK_TUNAI' ? nominal : 0;
      const cashReceived = serviceType === 'TARIK_TUNAI' ? 0 : totalCustomerPays;
      const bankDebit = serviceType === 'TARIK_TUNAI' ? totalCustomerPays : nominal;
      const profit = adminFee;
      return {
        totalCustomerPays,
        cashHanded,
        cashReceived,
        bankDebit,
        profit,
        customerReceives: serviceType === 'TARIK_TUNAI' ? nominal : nominal,
      };
    } else {
      // Admin Di Dalam (Potong Saldo):
      // Tarik Tunai: Nasabah gesek seharga Nominal pas, nasabah terima uang tunai fisik (Nominal - Admin).
      // Sangat sering saat saldo kartu nasabah pas di kelipatan ATM!
      const totalCustomerPays = nominal;
      const cashHanded = Math.max(0, nominal - adminFee);
      const cashReceived = serviceType === 'TARIK_TUNAI' ? 0 : nominal;
      const bankDebit = nominal;
      const profit = adminFee;
      return {
        totalCustomerPays,
        cashHanded,
        cashReceived,
        bankDebit,
        profit,
        customerReceives: serviceType === 'TARIK_TUNAI' ? cashHanded : nominal - adminFee,
      };
    }
  }, [nominal, adminFee, adminMode, serviceType]);

  const handleProcessTransaction = () => {
    if (onSelectTransaction) {
      onSelectTransaction({
        serviceType,
        nominal,
        adminFee,
        adminMode,
        bank,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-zinc-950 flex items-center justify-between border-b border-amber-600/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-950 text-amber-400 flex items-center justify-center font-bold text-lg shadow-sm">
              <Calculator className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-zinc-950 flex items-center gap-2">
                Kalkulator Fee &amp; Simulasi Transaksi Agen
              </h2>
              <p className="text-xs font-bold text-zinc-900">
                Hitung instan biaya admin, potong saldo, dan laba bersih per transaksi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-950/10 hover:bg-zinc-950/20 text-zinc-950 font-black transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* 1. Pilih Jenis Layanan */}
          <div>
            <label className="block text-xs font-black text-zinc-950 dark:text-zinc-200 uppercase tracking-wider mb-2">
              1. Pilih Jenis Layanan:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { type: 'TARIK_TUNAI' as ServiceType, label: 'Tarik Tunai', icon: '💳' },
                { type: 'SETOR_TUNAI' as ServiceType, label: 'Setor Tunai', icon: '📥' },
                { type: 'TRANSFER_BANK' as ServiceType, label: 'Transfer Bank', icon: '🔁' },
                { type: 'TOPUP_EWALLET' as ServiceType, label: 'Top Up E-Wallet', icon: '👛' },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => {
                    setServiceType(item.type);
                    sound.playBeep(650, 0.03);
                  }}
                  className={`p-2.5 rounded-xl border text-left font-black text-xs flex items-center gap-2 transition-all cursor-pointer ${
                    serviceType === item.type
                      ? 'bg-amber-500 border-amber-600 text-zinc-950 shadow-sm'
                      : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 hover:border-amber-400'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Mode Perhitungan Biaya Admin (Sangat Penting untuk Agen Mini ATM) */}
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
            <label className="block text-xs font-black text-zinc-950 dark:text-zinc-200 uppercase tracking-wider mb-2">
              2. Mode Biaya Admin:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAdminMode('LUAR');
                  sound.playBeep(650, 0.03);
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  adminMode === 'LUAR'
                    ? 'bg-zinc-950 text-white border-zinc-900 shadow-md'
                    : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs">Admin di Luar (Standar)</span>
                  {adminMode === 'LUAR' && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="text-[11px] mt-1 opacity-80 font-medium">
                  {serviceType === 'TARIK_TUNAI'
                    ? 'Gesek (Nominal + Admin), nasabah terima uang tunai utuh.'
                    : 'Nasabah serahkan uang tunai (Nominal + Admin).'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAdminMode('DALAM');
                  sound.playBeep(650, 0.03);
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  adminMode === 'DALAM'
                    ? 'bg-zinc-950 text-white border-zinc-900 shadow-md'
                    : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-amber-400">Admin di Dalam (Potong Saldo)</span>
                  {adminMode === 'DALAM' && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="text-[11px] mt-1 opacity-80 font-medium">
                  {serviceType === 'TARIK_TUNAI'
                    ? 'Gesek nominal pas, uang tunai dipotong biaya admin.'
                    : 'Transfer dipotong dari uang tunai nasabah.'}
                </p>
              </button>
            </div>
          </div>

          {/* 3. Nominal Transaksi & Preset Cepat */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black text-zinc-950 dark:text-zinc-200 uppercase tracking-wider">
                3. Nominal Transaksi:
              </label>
              <span className="font-mono text-sm font-black text-zinc-950 dark:text-amber-400">
                {formatRupiah(nominal)}
              </span>
            </div>

            <div className="relative mb-2">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-900 font-black">
                Rp
              </div>
              <input
                type="number"
                value={nominalInput}
                onChange={(e) => {
                  setNominalInput(e.target.value);
                  const parsed = parseInt(e.target.value, 10);
                  setNominal(isNaN(parsed) || parsed < 0 ? 0 : parsed);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-base font-black text-zinc-950 dark:text-zinc-100 font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                placeholder="0"
              />
            </div>

            {/* Preset Buttons */}
            <div className="flex flex-wrap gap-1.5">
              {PRESET_NOMINALS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleNominalChange(preset)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-black transition-colors cursor-pointer ${
                    nominal === preset
                      ? 'bg-zinc-950 text-amber-400 dark:bg-white dark:text-zinc-950 shadow-xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 hover:bg-zinc-200 border border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  {preset >= 1000000 ? `${preset / 1000000} Jt` : `${preset / 1000} Rb`}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Biaya Admin Fee Agen */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black text-zinc-950 dark:text-zinc-200 uppercase tracking-wider">
                4. Biaya Admin (Fee Agen):
              </label>
              <span className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                +{formatRupiah(adminFee)}
              </span>
            </div>

            <div className="relative mb-2">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-900 font-black">
                Rp
              </div>
              <input
                type="number"
                value={feeInput}
                onChange={(e) => {
                  setFeeInput(e.target.value);
                  const parsed = parseInt(e.target.value, 10);
                  setAdminFee(isNaN(parsed) || parsed < 0 ? 0 : parsed);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-base font-black text-zinc-950 dark:text-zinc-100 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="0"
              />
            </div>

            {/* Preset Fees */}
            <div className="flex flex-wrap gap-1.5">
              {PRESET_FEES.map((fee) => (
                <button
                  key={fee}
                  type="button"
                  onClick={() => handleFeeChange(fee)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-black transition-colors cursor-pointer ${
                    adminFee === fee
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 hover:bg-zinc-200 border border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  {formatRupiah(fee)}
                </button>
              ))}
            </div>
          </div>

          {/* 5. HASIL SIMULASI LENGKAP (RINGKASAN AKURAT) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950 text-white border border-zinc-800 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <span className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> HASIL PERHITUNGAN TRANSAKSI
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold">
                Mode: {adminMode === 'LUAR' ? 'Admin Di Luar' : 'Potong Saldo'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                <span className="text-zinc-400 font-bold block text-[11px]">
                  {serviceType === 'TARIK_TUNAI' ? 'Nasabah Gesek di Kartu / EDC:' : 'Nasabah Membayar (Total):'}
                </span>
                <span className="text-base font-black font-mono text-white block">
                  {formatRupiah(calc.totalCustomerPays)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                <span className="text-zinc-400 font-bold block text-[11px]">
                  {serviceType === 'TARIK_TUNAI' ? 'Uang Tunai Diterima Nasabah:' : 'Nominal Diterima Rekening Tujuan:'}
                </span>
                <span className="text-base font-black font-mono text-emerald-400 block">
                  {formatRupiah(calc.customerReceives)}
                </span>
              </div>
            </div>

            {/* Dampak Saldo Kas & Rekening */}
            <div className="pt-2 border-t border-zinc-800 space-y-1 text-xs">
              <div className="flex justify-between items-center text-zinc-300">
                <span className="font-medium">Uang Kas Laci Fisik:</span>
                <span className={`font-mono font-black ${serviceType === 'TARIK_TUNAI' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {serviceType === 'TARIK_TUNAI'
                    ? `- ${formatRupiah(calc.cashHanded)} (Keluar)`
                    : `+ ${formatRupiah(calc.cashReceived)} (Masuk)`}
                </span>
              </div>

              <div className="flex justify-between items-center text-zinc-300">
                <span className="font-medium">Saldo Rekening Bank / EDC:</span>
                <span className={`font-mono font-black ${serviceType === 'TARIK_TUNAI' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {serviceType === 'TARIK_TUNAI'
                    ? `+ ${formatRupiah(calc.totalCustomerPays)} (Bertambah)`
                    : `- ${formatRupiah(nominal)} (Berkurang)`}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-zinc-800/80">
                <span className="font-black text-amber-400 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  Keuntungan Bersih Agen (Laba):
                </span>
                <span className="font-mono font-black text-lg text-amber-400">
                  +{formatRupiah(calc.profit)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 font-black text-xs hover:bg-zinc-50 transition-colors cursor-pointer"
          >
            Tutup
          </button>

          {onSelectTransaction && (
            <button
              type="button"
              onClick={handleProcessTransaction}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <span>Lanjut Proses Transaksi Ini</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

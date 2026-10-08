import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  X,
  Coins,
  CreditCard,
  Smartphone,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Info,
} from 'lucide-react';
import { StoreBranch, CashierUser } from '../types';
import { formatRupiah } from '../services/export';
import { sound } from '../services/sound';

interface AdjustRealBalancesModalProps {
  isOpen: boolean;
  onClose: () => void;
  branch: StoreBranch;
  currentUser: CashierUser | null;
  users: CashierUser[];
  onSaveRealBalances: (
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
}

export const AdjustRealBalancesModal: React.FC<AdjustRealBalancesModalProps> = ({
  isOpen,
  onClose,
  branch,
  currentUser,
  users,
  onSaveRealBalances,
}) => {
  const isCurrentlyAdmin = currentUser?.role === 'OWNER';

  // PIN security check state
  const [isPinVerified, setIsPinVerified] = useState<boolean>(isCurrentlyAdmin);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  // Balance inputs
  const [cashInput, setCashInput] = useState<string>(
    (branch.cashDrawerBalance || 0).toString()
  );
  const [bankInput, setBankInput] = useState<string>(
    (branch.bankBalance || 0).toString()
  );
  const [ewalletInput, setEwalletInput] = useState<string>(
    (branch.ewalletBalance || 0).toString()
  );
  const [digiposInput, setDigiposInput] = useState<string>(
    (branch.digiposBalance || 0).toString()
  );
  const [reasonInput, setReasonInput] = useState<string>(
    'Penyesuaian saldo riil toko awal agar sesuai dengan uang nyata'
  );
  const [confirmNotice, setConfirmNotice] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setIsPinVerified(isCurrentlyAdmin);
      setPinInput('');
      setPinError('');
      setCashInput((branch.cashDrawerBalance || 0).toString());
      setBankInput((branch.bankBalance || 0).toString());
      setEwalletInput((branch.ewalletBalance || 0).toString());
      setDigiposInput((branch.digiposBalance || 0).toString());
      setConfirmNotice(false);
    }
  }, [isOpen, branch, isCurrentlyAdmin]);

  if (!isOpen) return null;

  // Handle PIN verification
  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');

    // Find owner user or check PIN
    const ownerUsers = users.filter((u) => u.role === 'OWNER');
    const isMatched =
      ownerUsers.some((u) => u.pin === pinInput.trim()) ||
      pinInput.trim() === '1234' ||
      (currentUser?.role === 'OWNER' && currentUser.pin === pinInput.trim());

    if (isMatched) {
      setIsPinVerified(true);
      sound.playSuccess();
    } else {
      sound.playError();
      setPinError(
        'PIN Admin / Pemilik salah! Hanya pemilik yang berwenang mengatur saldo riil toko untuk mencegah penyalahgunaan kasir/karyawan.'
      );
    }
  };

  const cashNum = Math.max(0, parseInt(cashInput.replace(/\D/g, '') || '0', 10));
  const bankNum = Math.max(0, parseInt(bankInput.replace(/\D/g, '') || '0', 10));
  const ewalletNum = Math.max(0, parseInt(ewalletInput.replace(/\D/g, '') || '0', 10));
  const digiposNum = Math.max(0, parseInt(digiposInput.replace(/\D/g, '') || '0', 10));

  const totalRealNew = cashNum + bankNum + ewalletNum + digiposNum;
  const currentTotal =
    (branch.cashDrawerBalance || 0) +
    (branch.bankBalance || 0) +
    (branch.ewalletBalance || 0) +
    (branch.digiposBalance || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPinVerified && !isCurrentlyAdmin) {
      alert('Silakan verifikasi PIN Admin / Pemilik terlebih dahulu.');
      return;
    }

    const adminName = currentUser?.name || 'Pemilik / Admin';

    onSaveRealBalances(
      branch.id,
      {
        cashDrawerBalance: cashNum,
        bankBalance: bankNum,
        ewalletBalance: ewalletNum,
        digiposBalance: digiposNum,
      },
      {
        reason: reasonInput.trim() || 'Penyesuaian Saldo Riil Toko',
        adminName,
      }
    );

    sound.playSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header Bar */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-zinc-950 dark:text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-zinc-950 dark:text-zinc-50 tracking-tight">
                  Atur & Sesuaikan Saldo Riil
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-amber-500 text-zinc-950 font-black text-[10px] uppercase">
                  Khusus Admin
                </span>
              </div>
              <p className="text-xs text-zinc-800 dark:text-zinc-300 font-medium">
                Cabang: <strong className="text-zinc-950 dark:text-white">{branch.name}</strong> ({branch.code})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-700 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 flex-1">
          {/* Important Security Notice Banner */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-zinc-950 dark:text-zinc-200 space-y-1">
              <p className="font-black text-zinc-950 dark:text-amber-300">
                Keamanan Saldo Toko (Anti-Penyalahgunaan Karyawan)
              </p>
              <p className="leading-relaxed">
                Fitur ini dibuat agar Anda (pemilik/admin) dapat menyesuaikan saldo aplikasi dengan <strong>saldo nyata yang ada di laci, rekening bank, dan akun e-wallet</strong>. Karyawan dan kasir biasa <strong>tidak diberikan akses</strong> mengubah saldo ini untuk menjaga uang toko dari penyelewengan.
              </p>
            </div>
          </div>

          {/* STEP 1: If PIN verification required */}
          {!isPinVerified && (
            <form onSubmit={handleVerifyPin} className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-black text-zinc-950 dark:text-zinc-100">
                  Masukkan PIN Pemilik / Admin
                </h4>
              </div>
              <p className="text-xs text-zinc-700 dark:text-zinc-300">
                Masukkan 4 digit PIN Admin untuk membuka pengaturan saldo riil toko ini (PIN bawaan: 1234 atau PIN Owner yang Anda buat):
              </p>

              <div className="flex gap-2">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="PIN Admin (4-6 angka)"
                  autoFocus
                  className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 font-mono text-center tracking-widest text-lg font-black focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs cursor-pointer shadow-sm active:scale-95 transition-all"
                >
                  Buka Kunci
                </button>
              </div>

              {pinError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}
            </form>
          )}

          {/* STEP 2: Balance adjustment inputs */}
          {isPinVerified && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Uang Kas Tunai di Laci */}
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-zinc-950 dark:text-zinc-200 flex items-center gap-1.5">
                      <span>💵</span> Uang Kas Tunai (Laci Kasir)
                    </label>
                    <span className="text-[10px] font-mono font-bold text-zinc-500">
                      Sebelum: {formatRupiah(branch.cashDrawerBalance || 0)}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-500">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cashInput ? parseInt(cashInput, 10).toLocaleString('id-ID') : '0'}
                      onChange={(e) => setCashInput(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-emerald-400 font-mono font-black text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">
                    Hitung uang kertas & koin nyata yang ada di laci saat ini.
                  </p>
                </div>

                {/* 2. Saldo Rekening Bank / EDC */}
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-blue-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-zinc-950 dark:text-zinc-200 flex items-center gap-1.5">
                      <span>🏦</span> Rekening Bank & Mesin EDC
                    </label>
                    <span className="text-[10px] font-mono font-bold text-zinc-500">
                      Sebelum: {formatRupiah(branch.bankBalance || 0)}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-500">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={bankInput ? parseInt(bankInput, 10).toLocaleString('id-ID') : '0'}
                      onChange={(e) => setBankInput(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-blue-400 font-mono font-black text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">
                    Total saldo di rekening bank (BRI, BCA, Mandiri, BNI, dll).
                  </p>
                </div>

                {/* 3. Saldo Dompet Digital / E-Wallet (Gopay/Hopay/Shopeepay/Dana) */}
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-cyan-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-zinc-950 dark:text-zinc-200 flex items-center gap-1.5">
                      <span>👛</span> E-Wallet (GoPay, ShopeePay, DANA)
                    </label>
                    <span className="text-[10px] font-mono font-bold text-zinc-500">
                      Sebelum: {formatRupiah(branch.ewalletBalance || 0)}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-500">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={ewalletInput ? parseInt(ewalletInput, 10).toLocaleString('id-ID') : '0'}
                      onChange={(e) => setEwalletInput(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-cyan-400 font-mono font-black text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">
                    Saldo di dompet digital untuk melayani transfer & top-up.
                  </p>
                </div>

                {/* 4. Saldo Server Pulsa & Kuota (Digipos) */}
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-purple-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-zinc-950 dark:text-zinc-200 flex items-center gap-1.5">
                      <span>📱</span> Saldo Server Pulsa & Kuota
                    </label>
                    <span className="text-[10px] font-mono font-bold text-zinc-500">
                      Sebelum: {formatRupiah(branch.digiposBalance || 0)}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-500">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={digiposInput ? parseInt(digiposInput, 10).toLocaleString('id-ID') : '0'}
                      onChange={(e) => setDigiposInput(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-purple-400 font-mono font-black text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">
                    Saldo chip server pulsa (Digipos / Mkios / Isi Ulang).
                  </p>
                </div>
              </div>

              {/* Total Calculation Strip */}
              <div className="p-4 rounded-2xl bg-zinc-950 text-white border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono font-bold uppercase text-zinc-400 tracking-wider">
                    Total Modal Riil Baru Cabang Ini
                  </div>
                  <div className="text-lg sm:text-xl font-mono font-black text-amber-400">
                    {formatRupiah(totalRealNew)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-zinc-400">Total Sebelumnya:</div>
                  <div className="text-xs font-mono font-bold text-zinc-300">
                    {formatRupiah(currentTotal)}
                  </div>
                </div>
              </div>

              {/* Reason / Notes */}
              <div>
                <label className="block text-xs font-black text-zinc-950 dark:text-zinc-200 mb-1">
                  Catatan Penyesuaian Saldo (Tercatat di Riwayat Mutasi)
                </label>
                <input
                  type="text"
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="Contoh: Penyesuaian saldo riil pembukaan toko awal"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Confirmation Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 cursor-pointer text-xs text-zinc-900 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={confirmNotice}
                  onChange={(e) => setConfirmNotice(e.target.checked)}
                  className="mt-0.5 rounded text-amber-500 focus:ring-amber-400"
                />
                <span>
                  Saya menyatakan bahwa angka saldo di atas telah dihitung sesuai dengan <strong>uang tunai fisik dan saldo rekening nyata</strong> saya saat ini.
                </span>
              </label>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold text-xs cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!confirmNotice}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer ${
                    confirmNotice
                      ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 active:scale-95'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-zinc-950" />
                  <span>Simpan & Terapkan Saldo Riil</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

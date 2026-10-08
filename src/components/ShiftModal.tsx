import React, { useState, useMemo } from 'react';
import { Clock, DollarSign, CheckCircle, AlertTriangle, Printer, X, ShieldCheck } from 'lucide-react';
import { CashierShift, CashierUser, Transaction, StoreSettings } from '../types';
import { formatRupiah, formatDateIndo } from '../services/export';
import { sound } from '../services/sound';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeShift: CashierShift | null;
  onOpenShift: (startingCash: number) => void;
  onCloseShift: (actualCash: number, notes?: string) => void;
  transactions: Transaction[];
  currentUser: CashierUser | null;
  settings: StoreSettings;
  darkMode: boolean;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  onClose,
  activeShift,
  onOpenShift,
  onCloseShift,
  transactions,
  currentUser,
  settings,
  darkMode,
}) => {
  const [startingCash, setStartingCash] = useState<number>(200000);
  const [actualCash, setActualCash] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const currentShiftStats = useMemo(() => {
    if (!activeShift) return { totalSales: 0, cashSales: 0, nonCashSales: 0, count: 0, expectedCash: 0 };
    const shiftStartTime = new Date(activeShift.startTime).getTime();

    const shiftTrxs = transactions.filter(
      (t) => new Date(t.date).getTime() >= shiftStartTime && t.status === 'COMPLETED'
    );

    const totalSales = shiftTrxs.reduce((sum, t) => sum + t.grandTotal, 0);
    const cashSales = shiftTrxs
      .filter((t) => t.paymentMethod === 'TUNAI')
      .reduce((sum, t) => sum + t.grandTotal, 0);
    const nonCashSales = totalSales - cashSales;

    return {
      totalSales,
      cashSales,
      nonCashSales,
      count: shiftTrxs.length,
      expectedCash: activeShift.startingCash + cashSales,
    };
  }, [activeShift, transactions]);

  if (!isOpen) return null;

  const handleStartShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playSuccess();
    onOpenShift(startingCash);
    onClose();
  };

  const handleCloseShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playSuccess();
    onCloseShift(actualCash, notes);
    onClose();
  };

  const cashDiff = actualCash - (currentShiftStats.expectedCash || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border bg-zinc-900 border-zinc-800 text-zinc-100"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="font-black text-base tracking-tight text-white">
                {activeShift ? 'Tutup Shift / Rekapitulasi Kasir' : 'Buka Shift Baru Kasir'}
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                Petugas: {currentUser?.name || 'Kasir'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {!activeShift ? (
            /* Form Buka Shift */
            <form onSubmit={handleStartShiftSubmit} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 font-mono">
                Masukkan modal uang kembalian awal di laci kasir sebelum melayani transaksi penjualan.
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 font-mono">
                  Modal Uang Awal di Laci (Rp):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-bold text-zinc-400 text-sm font-mono">Rp</span>
                  <input
                    type="number"
                    value={startingCash}
                    onChange={(e) => setStartingCash(Number(e.target.value))}
                    className="w-full pl-11 pr-3 py-2.5 rounded-xl border text-base font-bold font-numeric font-mono bg-zinc-950 border-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[100000, 200000, 300000, 500000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setStartingCash(amt)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold font-numeric font-mono bg-zinc-950 text-zinc-300 hover:bg-zinc-800 border border-zinc-800 cursor-pointer"
                    >
                      {formatRupiah(amt)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-zinc-800 text-zinc-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md cursor-pointer"
                >
                  Buka Shift Sekarang
                </button>
              </div>
            </form>
          ) : (
            /* Form Tutup Shift & Rekapitulasi Kas */
            <form onSubmit={handleCloseShiftSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-500 uppercase text-[10px]">Modal Awal:</span>
                  <div className="text-sm font-bold text-white font-numeric">
                    {formatRupiah(activeShift.startingCash)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-500 uppercase text-[10px]">Penjualan Tunai:</span>
                  <div className="text-sm font-bold text-emerald-400 font-numeric">
                    +{formatRupiah(currentShiftStats.cashSales)}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950 border border-amber-500/30 flex justify-between items-baseline font-mono">
                <span className="text-xs font-bold text-zinc-300">UANG SEHARUSNYA DI LACI:</span>
                <span className="text-lg font-black text-amber-400 font-numeric">
                  {formatRupiah(currentShiftStats.expectedCash)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 font-mono">
                  Uang Fisik Kasir Hasil Hitung Manual (Rp):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-bold text-zinc-400 text-sm font-mono">Rp</span>
                  <input
                    type="number"
                    value={actualCash || ''}
                    onChange={(e) => setActualCash(Number(e.target.value))}
                    placeholder="Masukkan jumlah uang fisik di laci..."
                    className="w-full pl-11 pr-3 py-2.5 rounded-xl border text-base font-bold font-numeric font-mono bg-zinc-950 border-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              {actualCash > 0 && (
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono ${
                    cashDiff === 0
                      ? 'bg-zinc-950 border-emerald-500/40 text-emerald-400'
                      : cashDiff > 0
                      ? 'bg-zinc-950 border-amber-500/40 text-amber-400'
                      : 'bg-zinc-950 border-rose-500/40 text-rose-400'
                  }`}
                >
                  <span className="font-bold">
                    {cashDiff === 0 ? '✓ Selisih Uang Pas (Tepat)' : cashDiff > 0 ? 'Lebih Fisik:' : 'Kurang Fisik:'}
                  </span>
                  <span className="text-sm font-black font-numeric">
                    {cashDiff === 0 ? 'Rp 0' : formatRupiah(Math.abs(cashDiff))}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 font-mono">
                  Catatan / Keterangan Kasir (Opsional):
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Uang pecahan 2000 ada 50 lembar"
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-zinc-950 border-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-zinc-800 text-zinc-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md cursor-pointer"
                >
                  Konfirmasi Tutup Shift
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

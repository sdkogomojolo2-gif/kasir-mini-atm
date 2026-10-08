import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Share2,
  Calendar,
  X,
  CheckSquare,
  Square,
} from 'lucide-react';
import { CustomerDebt, StoreSettings, CashierUser } from '../types';
import { formatRupiah, formatDateIndo, exportDebtsToExcel } from '../services/export';
import { sound } from '../services/sound';

interface DebtsViewProps {
  debts: CustomerDebt[];
  onSaveDebt: (debt: CustomerDebt) => void;
  onRecordPayment: (debtId: string, amount: number, notes?: string) => void;
  settings: StoreSettings;
  currentUser: CashierUser | null;
  darkMode: boolean;
}

export const DebtsView: React.FC<DebtsViewProps> = ({
  debts,
  onSaveDebt,
  onRecordPayment,
  settings,
  currentUser,
  darkMode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<CustomerDebt | null>(null);
  const [selectedDebtIds, setSelectedDebtIds] = useState<string[]>([]);

  // New Debt Form
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    address: '',
    amount: 50000,
    dueDate: '',
    notes: 'Belanja sembako harian',
  });

  // Repayment form
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payNotes, setPayNotes] = useState<string>('Bayar cicilan kasbon');

  const filteredDebts = useMemo(() => {
    return debts.filter((d) => {
      const q = searchQuery.toLowerCase().trim();
      return (
        !q ||
        d.customerName.toLowerCase().includes(q) ||
        (d.phone && d.phone.includes(q)) ||
        (d.address && d.address.toLowerCase().includes(q))
      );
    });
  }, [debts, searchQuery]);

  const totalOutstandingDebt = debts.reduce((sum, d) => sum + d.totalDebt, 0);

  // Checkbox helpers
  const isAllDebtsSelected = useMemo(() => {
    if (filteredDebts.length === 0) return false;
    return filteredDebts.every((d) => selectedDebtIds.includes(d.id));
  }, [filteredDebts, selectedDebtIds]);

  const toggleSelectAllDebts = () => {
    if (isAllDebtsSelected) {
      setSelectedDebtIds([]);
    } else {
      setSelectedDebtIds(filteredDebts.map((d) => d.id));
    }
  };

  const toggleSelectDebt = (debtId: string) => {
    setSelectedDebtIds((prev) =>
      prev.includes(debtId) ? prev.filter((id) => id !== debtId) : [...prev, debtId]
    );
  };

  // Bulk Settle All Checked Debts
  const handleBulkSettleDebts = () => {
    if (selectedDebtIds.length === 0) return;
    const unpaidSelected = debts.filter((d) => selectedDebtIds.includes(d.id) && d.totalDebt > 0);
    if (unpaidSelected.length === 0) {
      alert('Semua pelanggan yang dipilih sudah lunas.');
      return;
    }

    const totalToSettle = unpaidSelected.reduce((sum, d) => sum + d.totalDebt, 0);
    if (
      confirm(
        `Konfirmasi pelunasan massal untuk ${unpaidSelected.length} pelanggan?\nTotal pelunasan: ${formatRupiah(
          totalToSettle
        )}`
      )
    ) {
      unpaidSelected.forEach((d) => {
        onRecordPayment(d.id, d.totalDebt, 'Pelunasan Kasbon Sekaligus (Massal)');
      });
      setSelectedDebtIds([]);
      sound.playSuccess();
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName.trim()) {
      alert('Nama pelanggan wajib diisi.');
      return;
    }

    const newDebt: CustomerDebt = {
      id: `debt-${Date.now()}`,
      customerName: formData.customerName.trim(),
      phone: formData.phone.trim() || undefined,
      address: formData.address.trim() || undefined,
      totalDebt: Number(formData.amount),
      createdAt: new Date().toISOString(),
      dueDate: formData.dueDate || undefined,
      notes: formData.notes.trim() || undefined,
      transactions: [
        {
          transactionId: `trx-debt-${Date.now()}`,
          invoiceNumber: `BON-${Date.now().toString().slice(-6)}`,
          date: new Date().toISOString(),
          amount: Number(formData.amount),
          description: formData.notes.trim() || 'Hutang awal belanja',
        },
      ],
      payments: [],
    };

    onSaveDebt(newDebt);
    sound.playSuccess();
    setIsAddModalOpen(false);
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt || payAmount <= 0) return;

    onRecordPayment(selectedDebt.id, payAmount, payNotes);
    sound.playSuccess();
    setIsPayModalOpen(false);
  };

  const sendWhatsAppReminder = (debt: CustomerDebt) => {
    const msg = `Halo ${debt.customerName}, ini pengingat ramah dari ${settings.storeName}.\nSaat ini tercatat sisa catatan kasbon sebesar *${formatRupiah(debt.totalDebt)}*.\nTerima kasih atas kerjasamanya! 🙏`;
    const phone = debt.phone ? debt.phone.replace(/[^0-9]/g, '') : '';
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div id="debts-view-container" className="max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
            <BookOpen className="w-5 h-5 text-amber-500" />
            <span>Catatan Hutang / Kasbon Pelanggan</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Daftar kasbon langganan toko &amp; riwayat pembayaran cicilan
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-export-debts-excel"
            type="button"
            onClick={() => exportDebtsToExcel(debts, settings)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Ekspor Excel</span>
          </button>

          <button
            id="btn-add-debt"
            type="button"
            onClick={() => {
              setFormData({
                customerName: '',
                phone: '',
                address: '',
                amount: 50000,
                dueDate: '',
                notes: 'Belanja sembako harian',
              });
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all tracking-wide cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Catat Hutang Baru</span>
          </button>
        </div>
      </div>

      {/* Metric Banner Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase font-mono">
            TOTAL PIUTANG AKTIF
          </div>
          <div className="text-2xl font-black font-numeric font-mono text-amber-500 dark:text-amber-400 mt-1">
            {formatRupiah(totalOutstandingDebt)}
          </div>
          <div className="text-xs text-zinc-400 mt-1 font-mono">
            Dari {debts.filter((d) => d.totalDebt > 0).length} pelanggan belum lunas
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase font-mono">
            TOTAL PELANGGAN KASBON
          </div>
          <div className="text-2xl font-black font-numeric font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {debts.length} Orang
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-semibold font-mono">
            {debts.filter((d) => d.totalDebt <= 0).length} pelanggan sudah lunas
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-zinc-100 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Pengingat Ramah WhatsApp</span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            Kirim rincian sisa kasbon langsung ke nomor WA pelanggan dengan 1 klik.
          </p>
        </div>
      </div>

      {/* Search Bar & Bulk Settle Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama pelanggan / no. HP..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs sm:text-sm bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
          />
        </div>

        {selectedDebtIds.length > 0 && (
          <div className="flex items-center gap-2 animate-in fade-in duration-150">
            <button
              type="button"
              onClick={handleBulkSettleDebts}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Lunaskan {selectedDebtIds.length} Kasbon Tercentang</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedDebtIds([])}
              className="px-3 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-300 transition-colors cursor-pointer"
            >
              Batal ({selectedDebtIds.length})
            </button>
          </div>
        )}
      </div>

      {/* Debts Table */}
      <div className="rounded-2xl border shadow-xl overflow-hidden bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-950/70 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 uppercase tracking-wider font-bold font-mono text-[10px]">
              <tr>
                <th className="px-3 py-3.5 text-center w-10">
                  <button
                    type="button"
                    onClick={toggleSelectAllDebts}
                    title={isAllDebtsSelected ? 'Batalkan Semua Pilihan' : 'Centang Semua'}
                    className="p-1 rounded text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    {isAllDebtsSelected ? (
                      <CheckSquare className="w-4 h-4 text-amber-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3.5 font-sans">Nama Pelanggan</th>
                <th className="px-4 py-3.5">No. HP / WA</th>
                <th className="px-4 py-3.5 font-sans">Alamat / RT</th>
                <th className="px-4 py-3.5 text-right">Sisa Hutang</th>
                <th className="px-4 py-3.5">Jatuh Tempo</th>
                <th className="px-4 py-3.5 text-center font-sans">Status</th>
                <th className="px-4 py-3.5 text-center font-sans">Aksi Bayar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
              {filteredDebts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-400">
                    Belum ada data catatan kasbon pelanggan.
                  </td>
                </tr>
              ) : (
                filteredDebts.map((debt) => {
                  const isPaidOff = debt.totalDebt <= 0;
                  const isChecked = selectedDebtIds.includes(debt.id);
                  return (
                    <tr
                      key={debt.id}
                      className={`transition-colors ${
                        isChecked
                          ? 'bg-amber-500/10'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectDebt(debt.id)}
                          className="p-1 rounded text-zinc-400 hover:text-zinc-600 cursor-pointer"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-bold text-zinc-900 dark:text-zinc-100">
                        {debt.customerName}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 font-mono">
                        {debt.phone || '-'}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
                        {debt.address || '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-numeric font-mono font-black text-sm text-amber-500 dark:text-amber-400">
                        {formatRupiah(debt.totalDebt)}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 font-mono text-[11px]">
                        {debt.dueDate || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                            isPaidOff
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }`}
                        >
                          {isPaidOff ? 'LUNAS' : 'BELUM LUNAS'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {!isPaidOff && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDebt(debt);
                                setPayAmount(debt.totalDebt);
                                setIsPayModalOpen(true);
                              }}
                              className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-[11px] shadow-2xs transition-colors cursor-pointer"
                            >
                              Bayar / Cicil
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => sendWhatsAppReminder(debt)}
                            title="Kirim Pesan Tagihan WA"
                            className="p-1 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
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

      {/* Add New Debt Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border bg-zinc-900 border-zinc-800 text-zinc-100">
            <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center">
              <h3 className="font-extrabold text-sm tracking-tight text-white">Catat Kasbon Pelanggan Baru</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Nama Pelanggan:</label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="Contoh: Pak RT / Bu Marni"
                  className="w-full px-3 py-2 rounded-xl border text-xs font-bold bg-zinc-950 border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 font-mono">No. WhatsApp:</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0812xxxxxxxx"
                  className="w-full px-3 py-2 rounded-xl border text-xs font-mono bg-zinc-950 border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Alamat / RT (Opsional):</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="RT 02 / Gang Kenanga"
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-zinc-950 border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1 font-mono">Nominal Hutang (Rp):</label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold text-amber-400 bg-zinc-950 border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1 font-mono">Jatuh Tempo:</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono bg-zinc-950 border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Keterangan Belanja:</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-zinc-950 border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs shadow-md cursor-pointer"
                >
                  Simpan Kasbon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Repayment Modal */}
      {isPayModalOpen && selectedDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border bg-zinc-900 border-zinc-800 text-zinc-100">
            <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-sm text-white">Catat Cicilan / Pelunasan</h3>
                <p className="text-[11px] text-zinc-400">{selectedDebt.customerName}</p>
              </div>
              <button onClick={() => setIsPayModalOpen(false)} className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePaySubmit} className="p-5 space-y-3.5">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 font-mono">
                <span className="text-[10px] text-zinc-400 uppercase">Sisa Kasbon Saat Ini:</span>
                <div className="text-xl font-black text-amber-400">
                  {formatRupiah(selectedDebt.totalDebt)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 font-mono">
                  Jumlah yang Dibayar (Rp):
                </label>
                <input
                  type="number"
                  min="500"
                  max={selectedDebt.totalDebt}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border text-sm font-mono font-bold text-emerald-400 bg-zinc-950 border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Catatan Pembayaran:</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-zinc-950 border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs shadow-md cursor-pointer"
                >
                  Konfirmasi Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

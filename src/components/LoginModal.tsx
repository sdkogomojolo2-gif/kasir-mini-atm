import React, { useState } from 'react';
import { Lock, ShieldCheck, UserCheck, Delete, ArrowRight, UserPlus, X } from 'lucide-react';
import { CashierUser, StoreBranch } from '../types';
import { sound } from '../services/sound';

interface LoginModalProps {
  users: CashierUser[];
  onLoginSuccess: (user: CashierUser) => void;
  onAddUser?: (name: string, pin: string, role: 'OWNER' | 'KASIR', branchId?: string) => void;
  branches?: StoreBranch[];
  darkMode: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  users,
  onLoginSuccess,
  onAddUser,
  branches = [],
  darkMode,
}) => {
  const [selectedUser, setSelectedUser] = useState<CashierUser | null>(
    users.find((u) => u.isActive) || users[0] || null
  );
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserPin, setNewUserPin] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<'OWNER' | 'KASIR'>('KASIR');
  const [newUserBranchId, setNewUserBranchId] = useState<string>(branches[1]?.id || branches[0]?.id || 'branch-cabang-2');

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      sound.playBeep(600, 0.05);
      const newPin = pin + digit;
      setPin(newPin);
      setErrorMsg('');

      if (selectedUser && newPin === selectedUser.pin) {
        sound.playSuccess();
        setTimeout(() => {
          onLoginSuccess(selectedUser);
        }, 150);
      }
    }
  };

  const handleDelete = () => {
    sound.playBeep(400, 0.04);
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg('');
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setErrorMsg('Pilih profil kasir terlebih dahulu.');
      return;
    }
    if (pin === selectedUser.pin) {
      sound.playSuccess();
      onLoginSuccess(selectedUser);
    } else {
      sound.playError();
      setErrorMsg('PIN salah! Silakan coba lagi.');
      setPin('');
    }
  };

  const handleCreateNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || newUserPin.length < 4) {
      setErrorMsg('Nama wajib diisi dan PIN minimal 4 angka');
      return;
    }

    if (onAddUser) {
      onAddUser(
        newUserName.trim(),
        newUserPin,
        newUserRole,
        newUserRole === 'KASIR' ? newUserBranchId : 'branch-pusat'
      );
    }
    setShowAddForm(false);
    setNewUserName('');
    setNewUserPin('');
    setErrorMsg('');
  };

  return (
    <div
      id="login-screen-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-sm"
    >
      <div
        id="login-card"
        className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border bg-zinc-900 border-zinc-800 text-zinc-100"
      >
        {/* Header */}
        <div className="bg-zinc-950 border-b border-zinc-800 px-6 py-5 text-white text-center relative shadow-md">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-700/80 text-amber-400 flex items-center justify-center mx-auto mb-2">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight">Kunci Layar Kasir-Q</h2>
          <p className="text-xs text-zinc-400 mt-1 flex items-center justify-center gap-1.5 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Database Lokal Terenkripsi AES-256
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {showAddForm ? (
            <form onSubmit={handleCreateNewUser} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="font-extrabold text-sm flex items-center gap-2 text-white">
                  <UserPlus className="w-4 h-4 text-amber-400" />
                  <span>Daftarkan Kasir Baru</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">
                  Nama Petugas Kasir:
                </label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Contoh: Budi / Kasir 2"
                  className="w-full px-3 py-2.5 rounded-xl border text-sm font-bold bg-zinc-950 border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 font-mono">
                  PIN Masuk (4-6 Digit Angka):
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={newUserPin}
                  onChange={(e) => setNewUserPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Masukkan 4 digit PIN..."
                  className="w-full px-3 py-2.5 rounded-xl border text-sm font-mono tracking-widest bg-zinc-950 border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 font-mono">
                  Peran / Akses:
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as 'OWNER' | 'KASIR')}
                  className="w-full px-3 py-2.5 rounded-xl border text-xs font-bold bg-zinc-950 border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="KASIR">Petugas Kasir (Khusus 1 Cabang)</option>
                  <option value="OWNER">Pemilik Toko (Akses Penuh Semua Cabang)</option>
                </select>
              </div>

              {newUserRole === 'KASIR' && branches.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1 font-mono">
                    Penugasan Cabang Toko:
                  </label>
                  <select
                    value={newUserBranchId}
                    onChange={(e) => setNewUserBranchId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border text-xs font-bold bg-zinc-950 border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Kasir ini hanya dapat melihat saldo &amp; transaksi cabang yang dipilih.
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black rounded-xl shadow-md cursor-pointer"
                >
                  Simpan Kasir
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* User selector chips */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-zinc-400 font-mono">
                    PILIH KASIR BERTUGAS:
                  </label>
                  {onAddUser && (
                    <button
                      type="button"
                      onClick={() => setShowAddForm(true)}
                      className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1 font-mono cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Tambah Kasir</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {users.map((u) => {
                    const isSelected = selectedUser?.id === u.id;
                    return (
                      <button
                        key={u.id}
                        id={`login-user-select-${u.id}`}
                        type="button"
                        onClick={() => {
                          setSelectedUser(u);
                          setPin('');
                          setErrorMsg('');
                        }}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 text-white font-bold ring-1 ring-amber-500/30'
                            : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-zinc-300'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold font-mono ${
                            isSelected
                              ? 'bg-amber-500 text-zinc-950 font-black'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-xs truncate font-bold text-white">
                            {u.name}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1 truncate">
                            <span>
                              {u.role === 'OWNER'
                                ? '👑 Pemilik (Semua Cabang)'
                                : `🏢 ${branches.find((b) => b.id === u.branchId)?.name || 'Cabang Kasir'}`}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PIN Input Indicator */}
              <div>
                <div className="text-center text-xs text-zinc-400 mb-1.5 font-mono">
                  Masukkan PIN Kasir Anda:
                </div>
                <div className="flex justify-center items-center gap-3 my-2">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                        pin.length > idx
                          ? 'bg-amber-400 border-amber-400 scale-110 shadow-sm shadow-amber-400/30'
                          : 'border-zinc-700 bg-transparent'
                      }`}
                    />
                  ))}
                </div>

                {errorMsg && (
                  <p className="text-center text-xs font-semibold text-rose-500 mt-2 font-mono">
                    {errorMsg}
                  </p>
                )}
              </div>

              {/* Numeric Keypad */}
              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    id={`btn-pin-${d}`}
                    onClick={() => handleDigit(d)}
                    className="py-3 text-lg font-bold font-numeric font-mono rounded-xl border bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-white transition-all active:scale-95 cursor-pointer"
                  >
                    {d}
                  </button>
                ))}
                <button
                  type="button"
                  id="btn-pin-clear"
                  onClick={handleClear}
                  className="py-3 text-xs font-bold font-mono rounded-xl border bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 transition-all active:scale-95 cursor-pointer"
                >
                  HAPUS
                </button>
                <button
                  type="button"
                  id="btn-pin-0"
                  onClick={() => handleDigit('0')}
                  className="py-3 text-lg font-bold font-numeric font-mono rounded-xl border bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-white transition-all active:scale-95 cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  id="btn-pin-backspace"
                  onClick={handleDelete}
                  className="py-3 flex items-center justify-center rounded-xl border bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 transition-all active:scale-95 cursor-pointer"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                id="btn-login-submit"
                onClick={handleManualSubmit}
                disabled={!pin}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 font-black rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-98 tracking-wide cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>Masuk Kasir</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

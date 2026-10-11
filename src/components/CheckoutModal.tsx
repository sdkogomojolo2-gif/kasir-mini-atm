import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  DollarSign,
  QrCode,
  Smartphone,
  BookOpen,
  CheckCircle,
  X,
  CreditCard,
  Building2,
  AlertCircle,
  User,
  Image as ImageIcon,
} from 'lucide-react';
import { CartItem, PaymentMethod, Transaction, StoreSettings, CashierUser } from '../types';
import { formatRupiah } from '../services/export';
import { sound } from '../services/sound';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  subtotal: number;
  discount: number;
  grandTotal: number;
  totalCost: number;
  settings: StoreSettings;
  currentUser: CashierUser | null;
  onPaymentSuccess: (transaction: Transaction) => void;
  darkMode: boolean;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  subtotal,
  discount,
  grandTotal,
  totalCost,
  settings,
  currentUser,
  onPaymentSuccess,
  darkMode,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TUNAI');
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [digitalProvider, setDigitalProvider] = useState<'GOPAY' | 'OVO' | 'DANA' | 'SHOPEEPAY' | 'TRANSFER_BANK'>('GOPAY');
  const [bankName, setBankName] = useState<string>('BCA');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Suggested Cash Denominations
  const quickCashOptions = [
    grandTotal, // Uang Pas
    10000,
    20000,
    50000,
    100000,
    150000,
    200000,
    300000,
    500000,
  ].filter((v, idx, arr) => arr.indexOf(v) === idx && (v >= grandTotal || v === 10000 || v === 20000 || v === 50000 || v === 100000));

  useEffect(() => {
    if (isOpen) {
      setCashGiven(grandTotal);
      setPaymentMethod('TUNAI');
      setIsProcessing(false);
    }
  }, [isOpen, grandTotal]);

  if (!isOpen) return null;

  const invoiceNumber = `INV-${new Date().getFullYear()}${(new Date().getMonth() + 1)
    .toString()
    .padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;

  const changeAmount = Math.max(0, cashGiven - grandTotal);
  const isCashSufficient = cashGiven >= grandTotal;

  const handleCompleteTransaction = (chosenMethod: PaymentMethod = paymentMethod) => {
    if (chosenMethod === 'TUNAI' && !isCashSufficient) {
      sound.playError();
      return;
    }

    if (chosenMethod === 'KASBON' && !customerName.trim()) {
      sound.playError();
      alert('Nama pelanggan wajib diisi untuk pencatatan kasbon / hutang!');
      return;
    }

    setIsProcessing(true);
    sound.playSuccess();

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch {
      // Ignore if confetti fails
    }

    const transaction: Transaction = {
      id: `trx-${Date.now()}`,
      invoiceNumber,
      date: new Date().toISOString(),
      cashierId: currentUser?.id || 'cashier-default',
      cashierName: currentUser?.name || 'Kasir',
      branchId: settings.activeBranchId || 'branch-pusat',
      branchName: settings.storeName || 'Cabang Utama',
      serviceType: 'PRODUK_FISIK',
      items: items.map((i) => ({
        productId: i.product.id,
        barcode: i.product.barcode,
        productName: i.product.name,
        category: i.product.category,
        buyPrice: i.product.buyPrice,
        sellPrice: i.product.sellPrice,
        quantity: i.quantity,
        unit: i.product.unit,
        discount: i.discount,
        subtotal: i.subtotal,
      })),
      totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal,
      discount,
      grandTotal,
      totalCost,
      totalProfit: grandTotal - totalCost,
      paymentMethod: chosenMethod,
      cashAmount: chosenMethod === 'TUNAI' ? cashGiven : grandTotal,
      changeAmount: chosenMethod === 'TUNAI' ? changeAmount : 0,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      notes: notes.trim() || undefined,
      status: 'COMPLETED',
      qrisRef: chosenMethod === 'QRIS' ? settings.qrisNmid : undefined,
    };

    setTimeout(() => {
      onPaymentSuccess(transaction);
    }, 200);
  };

  return (
    <div
      id="checkout-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/80 backdrop-blur-sm overflow-y-auto"
    >
      <div
        id="checkout-modal-card"
        className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border my-6 bg-zinc-900 border-zinc-800 text-zinc-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-white">Pembayaran Kasir</h2>
            <p className="text-xs text-zinc-400 font-mono">
              Total {items.length} macam barang ({items.reduce((s, i) => s + i.quantity, 0)} pcs)
            </p>
          </div>
          <button
            id="btn-close-checkout"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grand Total Banner */}
        <div className="bg-zinc-950 px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
              TOTAL TAGIHAN KASIR
            </div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight font-numeric font-mono text-amber-400">
              {formatRupiah(grandTotal)}
            </div>
          </div>
          <div className="text-right text-xs text-zinc-400 hidden sm:block font-mono">
            <div>Faktur: <span className="font-bold text-white">#{invoiceNumber}</span></div>
            <div>Kasir: <span className="font-bold text-white">{currentUser?.name || 'Kasir'}</span></div>
          </div>
        </div>

        {/* Payment Method Selector Tabs */}
        <div className="grid grid-cols-4 p-2 bg-zinc-950 gap-1.5 border-b border-zinc-800 text-xs font-bold">
          <button
            id="tab-pay-tunai"
            type="button"
            onClick={() => {
              sound.playBeep(520, 0.04);
              setPaymentMethod('TUNAI');
            }}
            className={`py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all border cursor-pointer ${
              paymentMethod === 'TUNAI'
                ? 'bg-zinc-900 border-amber-500 text-amber-400 shadow-sm ring-1 ring-amber-500/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Tunai (Cash)</span>
          </button>

          <button
            id="tab-pay-qris"
            type="button"
            onClick={() => {
              sound.playBeep(520, 0.04);
              setPaymentMethod('QRIS');
            }}
            className={`py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all border cursor-pointer ${
              paymentMethod === 'QRIS'
                ? 'bg-zinc-900 border-amber-500 text-amber-400 shadow-sm ring-1 ring-amber-500/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <QrCode className="w-4 h-4 text-amber-400" />
            <span>QRIS</span>
          </button>

          <button
            id="tab-pay-digital"
            type="button"
            onClick={() => {
              sound.playBeep(520, 0.04);
              setPaymentMethod(digitalProvider);
            }}
            className={`py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all border cursor-pointer ${
              ['GOPAY', 'OVO', 'DANA', 'SHOPEEPAY', 'TRANSFER_BANK'].includes(paymentMethod)
                ? 'bg-zinc-900 border-amber-500 text-amber-400 shadow-sm ring-1 ring-amber-500/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Smartphone className="w-4 h-4 text-zinc-300" />
            <span>E-Wallet / Bank</span>
          </button>

          <button
            id="tab-pay-kasbon"
            type="button"
            onClick={() => {
              sound.playBeep(520, 0.04);
              setPaymentMethod('KASBON');
            }}
            className={`py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all border cursor-pointer ${
              paymentMethod === 'KASBON'
                ? 'bg-zinc-900 border-amber-500 text-amber-400 shadow-sm ring-1 ring-amber-500/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>Kasbon</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 space-y-4">
          {/* 1. TUNAI / CASH METHOD */}
          {paymentMethod === 'TUNAI' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-2 font-mono">
                  PILIH PECAHAN CEPAT TUNAI:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {quickCashOptions.map((amount) => {
                    const isExact = amount === grandTotal;
                    const isSelected = cashGiven === amount;
                    return (
                      <button
                        key={amount}
                        id={`btn-cash-quick-${amount}`}
                        type="button"
                        onClick={() => {
                          sound.playBeep(650, 0.04);
                          setCashGiven(amount);
                        }}
                        className={`py-2 px-2 rounded-xl border text-xs font-bold font-numeric font-mono transition-all active:scale-95 cursor-pointer ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30'
                            : isExact
                            ? 'border-zinc-700 bg-zinc-800 text-white'
                            : 'border-zinc-800 bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        {isExact ? `Pas (${formatRupiah(amount)})` : formatRupiah(amount)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Cash Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1 font-mono">
                    Nominal Uang Fisik Diterima:
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 font-bold text-zinc-400 text-sm">Rp</span>
                    <input
                      id="input-cash-amount"
                      type="number"
                      value={cashGiven || ''}
                      onChange={(e) => setCashGiven(Number(e.target.value))}
                      placeholder="0"
                      className="w-full pl-11 pr-3 py-2.5 rounded-xl border text-base font-bold font-numeric font-mono bg-zinc-950 border-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Change Calculation Box */}
                <div
                  className={`p-3 rounded-xl border flex flex-col justify-center ${
                    isCashSufficient
                      ? 'bg-zinc-950 border-emerald-500/30'
                      : 'bg-zinc-950 border-rose-500/30'
                  }`}
                >
                  <span className="text-[10px] font-bold text-zinc-400 font-mono">
                    {isCashSufficient ? 'UANG KEMBALIAN PEMBELI:' : 'UANG MASIH KURANG:'}
                  </span>
                  <span
                    className={`text-xl font-black font-numeric font-mono ${
                      isCashSufficient ? 'text-emerald-400' : 'text-rose-500'
                    }`}
                  >
                    {isCashSufficient ? formatRupiah(changeAmount) : formatRupiah(grandTotal - cashGiven)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 2. QRIS METHOD (FOTO QRIS RESMI TOKO) */}
          {paymentMethod === 'QRIS' && (
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
              <div className="bg-white p-3 rounded-xl shadow-md border border-zinc-300 flex flex-col items-center shrink-0">
                <div className="text-[9px] font-black tracking-widest text-zinc-800 uppercase mb-1.5 font-mono">
                  QRIS RESMI TOKO
                </div>
                {settings.qrisImageUrl ? (
                  <div className="w-[170px] h-[170px] flex items-center justify-center bg-white p-1 overflow-hidden">
                    <img
                      src={settings.qrisImageUrl}
                      alt="QRIS Toko"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-[170px] h-[170px] flex flex-col items-center justify-center p-3 text-center bg-zinc-50 rounded-lg border-2 border-dashed border-zinc-300">
                    <ImageIcon className="w-10 h-10 text-zinc-400 mb-2" />
                    <span className="text-[11px] font-extrabold text-zinc-700 leading-tight">
                      Foto QRIS Belum Diunggah
                    </span>
                    <span className="text-[9px] text-zinc-500 mt-1 leading-tight">
                      Unggah foto QRIS toko di menu Pengaturan &gt; QRIS Pembayaran
                    </span>
                  </div>
                )}
                <div className="text-[10px] font-extrabold font-mono text-zinc-800 mt-1.5 text-center truncate max-w-[170px]">
                  {settings.qrisMerchantName || settings.storeName}
                </div>
              </div>

              <div className="space-y-3 flex-1 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono bg-purple-500/10 border border-purple-500/30 text-purple-400">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Scan QRIS Toko</span>
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">
                    {settings.qrisMerchantName || settings.storeName}
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Pelanggan dapat scan barcode di samping menggunakan aplikasi m-banking (BCA, BRImo, Livin Mandiri, BNI Mobile) atau e-wallet (GoPay, OVO, ShopeePay, DANA, LinkAja).
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
                  <div className="text-[10px] text-zinc-400 uppercase font-mono">Total Pembayaran:</div>
                  <strong className="font-mono text-xl text-amber-400 block mt-0.5">
                    {formatRupiah(grandTotal)}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* 3. E-WALLET / DIGITAL */}
          {['GOPAY', 'OVO', 'DANA', 'SHOPEEPAY', 'TRANSFER_BANK'].includes(paymentMethod) && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-zinc-400 font-mono">
                PILIH METODE PEMBAYARAN:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'GOPAY', name: 'GoPay' },
                  { id: 'OVO', name: 'OVO' },
                  { id: 'DANA', name: 'DANA' },
                  { id: 'SHOPEEPAY', name: 'ShopeePay' },
                  { id: 'TRANSFER_BANK', name: 'Transfer Bank' },
                ].map((prov) => (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => {
                      sound.playBeep(600, 0.04);
                      setDigitalProvider(prov.id as any);
                      setPaymentMethod(prov.id as any);
                    }}
                    className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === prov.id
                        ? 'border-amber-500 bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="truncate">{prov.name}</div>
                  </button>
                ))}
              </div>

              {paymentMethod === 'TRANSFER_BANK' && (
                <div className="flex gap-2 pt-1">
                  {['BCA', 'BRI', 'Mandiri', 'BNI', 'BSI'].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBankName(b)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                        bankName === b
                          ? 'bg-amber-500 text-zinc-950 border-amber-500'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. KASBON METHOD */}
          {paymentMethod === 'KASBON' && (
            <div className="space-y-3 p-4 rounded-xl bg-zinc-950 border border-amber-500/30">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Pencatatan Buku Kasbon / Hutang Pelanggan</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Nama Pelanggan (Wajib):
                  </label>
                  <input
                    id="input-kasbon-customer-name"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Contoh: Bu Hj. Aminah (RT 03)"
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-zinc-900 border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    No. WhatsApp Pelanggan:
                  </label>
                  <input
                    id="input-kasbon-customer-phone"
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-zinc-900 border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Optional customer info for receipt */}
          {paymentMethod !== 'KASBON' && (
            <div className="flex gap-2 pt-1">
              <div className="relative flex-1">
                <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
                <input
                  id="input-opt-customer-name"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nama Pelanggan (opsional untuk struk)..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg border text-xs bg-zinc-950 border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                />
              </div>
              <input
                id="input-opt-customer-phone"
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="No. WA (opsional)..."
                className="w-36 px-3 py-2 rounded-lg border text-xs bg-zinc-950 border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between">
          <button
            id="btn-cancel-checkout"
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 text-xs font-bold hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            id="btn-confirm-payment-done"
            type="button"
            onClick={() => handleCompleteTransaction(paymentMethod)}
            disabled={isProcessing || (paymentMethod === 'TUNAI' && !isCashSufficient)}
            className="py-3 px-6 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all active:scale-98 cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            <span>
              {paymentMethod === 'KASBON'
                ? 'Catat ke Buku Kasbon'
                : `Konfirmasi Bayar (${formatRupiah(grandTotal)})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

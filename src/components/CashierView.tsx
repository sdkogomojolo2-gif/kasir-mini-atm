import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Scan,
  Plus,
  Minus,
  Trash2,
  Tag,
  PauseCircle,
  PlayCircle,
  ShoppingBag,
  ArrowRight,
  Package,
  CheckSquare,
  Square,
  Percent,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ChevronUp,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Smartphone,
  Zap,
  Wallet,
  Building2,
  Coins,
  Calculator,
} from 'lucide-react';
import {
  Product,
  ProductCategory,
  CartItem,
  HeldCart,
  StoreSettings,
  CashierUser,
  Transaction,
  StoreBranch,
  ServiceType,
} from '../types';
import { formatRupiah } from '../services/export';
import { sound } from '../services/sound';
import { CheckoutModal } from './CheckoutModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { ProductImageUploader } from './ProductImageUploader';
import { MiniATMTransactionModal } from './MiniATMTransactionModal';
import { QuickFeeCalculatorModal } from './QuickFeeCalculatorModal';

const CATEGORIES: ('ALL' | ProductCategory)[] = [
  'ALL',
  'Layanan Mini ATM',
  'Pulsa & Paket Data',
  'Top Up E-Wallet',
  'Token & Listrik PLN',
  'Tagihan PPOB & BPJS',
  'Kartu Perdana & Voucher',
  'Aksesoris Handphone',
];

const CATEGORY_ICONS: Record<string, string> = {
  'Layanan Mini ATM': '🏧',
  'Pulsa & Paket Data': '📱',
  'Top Up E-Wallet': '👛',
  'Token & Listrik PLN': '⚡',
  'Tagihan PPOB & BPJS': '🧾',
  'Kartu Perdana & Voucher': '🪪',
  'Aksesoris Handphone': '🎧',
};

interface CashierViewProps {
  products: Product[];
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  heldCarts: HeldCart[];
  setHeldCarts: React.Dispatch<React.SetStateAction<HeldCart[]>>;
  settings: StoreSettings;
  currentUser: CashierUser | null;
  onTransactionCompleted: (trx: Transaction) => void;
  onSaveProduct?: (product: Product) => void;
  activeBranch?: StoreBranch;
  branches?: StoreBranch[];
  onSelectBranch?: (branchId: string) => void;
  onAdjustBranchBalances?: (
    branchId: string,
    changes: { cashChange?: number; bankChange?: number; digiposChange?: number },
    meta: {
      category: 'TRANSAKSI' | 'TARIK_BANK' | 'SETOR_BANK' | 'TOPUP_SERVER' | 'MODAL_AWAL' | 'PENGELUARAN' | 'LAINNYA';
      description: string;
      cashierName: string;
      referenceId?: string;
    }
  ) => void;
  darkMode: boolean;
}

export const CashierView: React.FC<CashierViewProps> = ({
  products,
  cart,
  setCart,
  heldCarts,
  setHeldCarts,
  settings,
  currentUser,
  onTransactionCompleted,
  onSaveProduct,
  activeBranch,
  branches = [],
  onSelectBranch,
  onAdjustBranchBalances,
  darkMode,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | ProductCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [cartDiscount, setCartDiscount] = useState<number>(0);
  const [showDiscountInput, setShowDiscountInput] = useState<boolean>(false);
  const [selectedCartIds, setSelectedCartIds] = useState<string[]>([]);
  const [scanToast, setScanToast] = useState<string | null>(null);
  const [isMobileCartDrawerOpen, setIsMobileCartDrawerOpen] = useState(false);

  // Mini ATM & Konter Pulsa Modal State
  const [isMiniATMModalOpen, setIsMiniATMModalOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [miniATMInitialService, setMiniATMInitialService] = useState<ServiceType>('TARIK_TUNAI');

  const handleOpenMiniATM = (svc: ServiceType) => {
    setMiniATMInitialService(svc);
    setIsMiniATMModalOpen(true);
    sound.playBeep(750, 0.04);
  };

  // Search input ref for F2 shortcut
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Quick Register Modal State for Unrecognized Packaging Barcodes
  const [isQuickRegisterOpen, setIsQuickRegisterOpen] = useState(false);
  const [quickRegisterBarcode, setQuickRegisterBarcode] = useState('');
  const [quickName, setQuickName] = useState('');
  const [quickCategory, setQuickCategory] = useState<ProductCategory>('Pulsa & Paket Data');
  const [quickBuyPrice, setQuickBuyPrice] = useState<number>(0);
  const [quickSellPrice, setQuickSellPrice] = useState<number>(0);
  const [quickStock, setQuickStock] = useState<number>(20);
  const [quickUnit, setQuickUnit] = useState<string>('pcs');
  const [quickImageUrl, setQuickImageUrl] = useState<string | undefined>(undefined);

  // Cart Checkbox Selection Helpers
  const isAllCartSelected = useMemo(() => {
    if (cart.length === 0) return false;
    return cart.every((item) => selectedCartIds.includes(item.product.id));
  }, [cart, selectedCartIds]);

  const toggleSelectAllCart = () => {
    if (isAllCartSelected) {
      setSelectedCartIds([]);
    } else {
      setSelectedCartIds(cart.map((item) => item.product.id));
    }
  };

  const toggleSelectCartItem = (productId: string) => {
    setSelectedCartIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleBulkRemoveFromCart = () => {
    if (selectedCartIds.length === 0) return;
    sound.playBeep(400, 0.04);
    setCart((prev) => prev.filter((item) => !selectedCartIds.includes(item.product.id)));
    setSelectedCartIds([]);
  };

  // Filter products by category and query
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.isActive) return false;
      const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  // Fast add product to cart
  const handleAddToCart = (product: Product, qtyToAdd = 1) => {
    if (product.stock <= 0) {
      sound.playError();
      alert(`Stok ${product.name} saat ini habis!`);
      return;
    }

    sound.playBeep(880, 0.05);

    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.product.id === product.id);
      if (existingIdx > -1) {
        const item = prev[existingIdx];
        const newQty = item.quantity + qtyToAdd;
        if (newQty > product.stock) {
          alert(`Maksimal stok tersedia hanya ${product.stock} ${product.unit}`);
          return prev;
        }
        const updated = [...prev];
        updated[existingIdx] = {
          ...item,
          quantity: newQty,
          subtotal: newQty * item.product.sellPrice - item.discount,
        };
        return updated;
      } else {
        const defaultQty = qtyToAdd;
        const sub = defaultQty * product.sellPrice;
        return [
          ...prev,
          {
            product,
            quantity: defaultQty,
            discount: 0,
            subtotal: sub,
          },
        ];
      }
    });
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.stock) {
              alert(`Maksimal stok tersedia: ${item.product.stock} ${item.product.unit}`);
              return item;
            }
            sound.playBeep(700, 0.03);
            return {
              ...item,
              quantity: newQty,
              subtotal: newQty * item.product.sellPrice - item.discount,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleDirectQtyChange = (productId: string, newQtyNum: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const qty = Math.max(1, newQtyNum);
          if (qty > item.product.stock) {
            alert(`Maksimal stok tersedia: ${item.product.stock} ${item.product.unit}`);
            return item;
          }
          return {
            ...item,
            quantity: qty,
            subtotal: Math.round(qty * item.product.sellPrice) - item.discount,
          };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (productId: string) => {
    sound.playBeep(400, 0.04);
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (confirm('Kosongkan semua barang di keranjang?')) {
      setCart([]);
      setCartDiscount(0);
    }
  };

  // Hold current cart
  const handleHoldCart = () => {
    if (cart.length === 0) return;
    const name =
      prompt('Masukkan nama antrian (contoh: Bu Siti / Antrian 1):') ||
      `Antrian #${heldCarts.length + 1}`;
    const newHold: HeldCart = {
      id: `hold-${Date.now()}`,
      name,
      items: [...cart],
      savedAt: new Date().toISOString(),
    };
    setHeldCarts((prev) => [...prev, newHold]);
    setCart([]);
    setCartDiscount(0);
    sound.playSuccess();
  };

  // Restore held cart
  const handleRestoreCart = (held: HeldCart) => {
    if (cart.length > 0) {
      if (
        !confirm(
          'Keranjang saat ini berisi barang. Simpan antrian saat ini dulu sebelum membuka antrian lain?'
        )
      ) {
        return;
      }
      handleHoldCart();
    }
    setCart(held.items);
    setHeldCarts((prev) => prev.filter((h) => h.id !== held.id));
    sound.playSuccess();
  };

  // Totals calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.subtotal, 0);
  }, [cart]);

  const grandTotal = Math.max(0, subtotal - cartDiscount);

  const totalCost = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.product.buyPrice * item.quantity, 0);
  }, [cart]);

  const totalItemCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  // Barcode scanned handler
  const handleBarcodeScanned = (barcode: string) => {
    const clean = barcode.trim();
    if (!clean) return;

    const found = products.find(
      (p) =>
        p.barcode === clean ||
        p.barcode.endsWith(clean) ||
        clean.endsWith(p.barcode)
    );

    if (found) {
      handleAddToCart(found, 1);
      setScanToast(`+1 ${found.name} (${formatRupiah(found.sellPrice)}) masuk keranjang`);
      setTimeout(() => setScanToast(null), 3000);
      sound.playBeep(880, 0.08);
    } else {
      sound.playError();
      setQuickRegisterBarcode(clean);
      setQuickName('');
      setQuickBuyPrice(0);
      setQuickSellPrice(0);
      setQuickStock(20);
      setQuickUnit('pcs');
      setIsQuickRegisterOpen(true);
    }
  };

  // Keyboard Shortcuts: F2 (Search), F4 (Scanner), F8 (Hold), F9 (Checkout)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Don't trigger if modal is open (except ESC)
      if (isCheckoutOpen || isScannerOpen || isQuickRegisterOpen) {
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'F4') {
        e.preventDefault();
        setIsScannerOpen(true);
      } else if (e.key === 'F8') {
        e.preventDefault();
        handleHoldCart();
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0) {
          setIsCheckoutOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [cart, isCheckoutOpen, isScannerOpen, isQuickRegisterOpen]);

  // Hardware Scanner Gun Listener
  const keyBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT');

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (keyBufferRef.current.length >= 6) {
          e.preventDefault();
          const scannedCode = keyBufferRef.current.trim();
          keyBufferRef.current = '';
          handleBarcodeScanned(scannedCode);
          return;
        }
        keyBufferRef.current = '';
        return;
      }

      if (e.key.length === 1) {
        if (timeDiff > 100) {
          if (!isInputFocused) {
            keyBufferRef.current = e.key;
          } else {
            keyBufferRef.current = '';
          }
        } else {
          keyBufferRef.current += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, cart]);

  // Quick Register Product Form Submit
  const handleQuickRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;

    const newProd: Product = {
      id: `prod-${Date.now()}`,
      barcode: quickRegisterBarcode.trim(),
      name: quickName.trim(),
      category: quickCategory,
      buyPrice: quickBuyPrice,
      sellPrice: quickSellPrice,
      stock: quickStock,
      minStock: 5,
      unit: quickUnit.trim() || 'pcs',
      imageUrl: quickImageUrl || undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveProduct?.(newProd);
    handleAddToCart(newProd, 1);
    setIsQuickRegisterOpen(false);
    setQuickImageUrl(undefined);
    setScanToast(`✓ +1 ${newProd.name} didaftarkan & masuk keranjang!`);
    setTimeout(() => setScanToast(null), 3500);
    sound.playSuccess();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      const query = searchQuery.trim();
      const found = products.find(
        (p) =>
          p.barcode === query ||
          p.barcode.endsWith(query) ||
          p.name.toLowerCase() === query.toLowerCase()
      );
      if (found) {
        handleAddToCart(found, 1);
        setSearchQuery('');
        setScanToast(`+1 ${found.name} masuk keranjang`);
        setTimeout(() => setScanToast(null), 2500);
        sound.playSuccess();
      }
    }
  };

  return (
    <div id="cashier-pos-container" className="max-w-7xl mx-auto space-y-3 relative pb-24 lg:pb-8">
      {/* Toast Notification */}
      {scanToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 text-white px-5 py-2.5 rounded-xl shadow-2xl font-bold text-xs sm:text-sm flex items-center gap-2 border border-zinc-700 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{scanToast}</span>
        </div>
      )}

      {/* 1. Branch HUD & Real-Time Cash/Bank Balances Bar */}
      {activeBranch && (
        <div className="p-3 sm:p-3.5 rounded-2xl bg-zinc-950 text-white border border-zinc-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-lg shrink-0">
              🏦
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-amber-400 border border-zinc-700">
                  {activeBranch.code}
                </span>
                <span className="font-extrabold text-xs sm:text-sm text-white">
                  {activeBranch.name}
                </span>
                {currentUser?.role === 'KASIR' ? (
                  <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    🔒 Cabang Anda
                  </span>
                ) : (
                  branches && branches.length > 1 && onSelectBranch && (
                    <select
                      value={activeBranch.id}
                      onChange={(e) => onSelectBranch(e.target.value)}
                      className="ml-1 text-[11px] font-bold bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-0.5 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                      title="Ganti Cabang Kasir (Mode Admin)"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          Ganti: {b.name}
                        </option>
                      ))}
                    </select>
                  )
                )}
              </div>
              <p className="text-[10px] text-zinc-400 truncate max-w-md mt-0.5">
                {activeBranch.address || 'Agen Mini ATM, Transfer Bank & Konter Pulsa'}
              </p>
            </div>
          </div>

          {/* Real-time Balances HUD */}
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 md:pb-0 shrink-0">
            <div className="px-2.5 py-1.5 rounded-xl bg-zinc-900/90 border border-emerald-500/30 flex items-center gap-2">
              <span className="text-sm">💵</span>
              <div>
                <div className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">Kas Laci</div>
                <div className="text-xs font-mono font-black text-emerald-400">{formatRupiah(activeBranch.cashDrawerBalance || 0)}</div>
              </div>
            </div>

            <div className="px-2.5 py-1.5 rounded-xl bg-zinc-900/90 border border-blue-500/30 flex items-center gap-2">
              <span className="text-sm">🏦</span>
              <div>
                <div className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">Saldo Bank</div>
                <div className="text-xs font-mono font-black text-blue-400">{formatRupiah(activeBranch.bankBalance || 0)}</div>
              </div>
            </div>

            <div className="px-2.5 py-1.5 rounded-xl bg-zinc-900/90 border border-purple-500/30 flex items-center gap-2">
              <span className="text-sm">📱</span>
              <div>
                <div className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">Saldo Pulsa</div>
                <div className="text-xs font-mono font-black text-purple-400">{formatRupiah(activeBranch.digiposBalance || 0)}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCalculatorOpen(true)}
              className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95 shrink-0"
              title="Kalkulator Fee & Potong Saldo"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Kalkulator Fee</span>
            </button>
          </div>
        </div>
      )}

      {/* Low Balance Alert Strip */}
      {activeBranch &&
        ((activeBranch.cashDrawerBalance || 0) < 300000 ||
          (activeBranch.bankBalance || 0) < 500000 ||
          (activeBranch.digiposBalance || 0) < 200000) && (
          <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs font-bold flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm shrink-0">⚠️</span>
              <span>
                <strong>Perhatian Saldo Menipis:</strong>{' '}
                {(activeBranch.cashDrawerBalance || 0) < 300000 && 'Kas Tunai Laci Rendah. '}
                {(activeBranch.bankBalance || 0) < 500000 && 'Saldo Rekening/EDC Rendah. '}
                {(activeBranch.digiposBalance || 0) < 200000 && 'Saldo Server Pulsa Rendah.'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsCalculatorOpen(true)}
              className="text-[11px] font-black underline cursor-pointer hover:text-amber-600 dark:hover:text-amber-200 shrink-0"
            >
              Simulasi Fee
            </button>
          </div>
        )}

      {/* 2. Mini ATM & PPOB Quick Action Launch Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        <button
          type="button"
          onClick={() => handleOpenMiniATM('TARIK_TUNAI')}
          className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 text-left transition-all shadow-2xs group cursor-pointer active:scale-95"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-base">💳</span>
            <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">EDC</span>
          </div>
          <div className="font-black text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-500 transition-colors">Tarik Tunai</div>
          <div className="text-[10px] text-zinc-400 truncate">Semua Bank</div>
        </button>

        <button
          type="button"
          onClick={() => handleOpenMiniATM('SETOR_TUNAI')}
          className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 text-left transition-all shadow-2xs group cursor-pointer active:scale-95"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-base">📥</span>
            <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">Setor</span>
          </div>
          <div className="font-black text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-blue-500 transition-colors">Setor Tunai</div>
          <div className="text-[10px] text-zinc-400 truncate">BRI/BCA/Mandiri</div>
        </button>

        <button
          type="button"
          onClick={() => handleOpenMiniATM('TRANSFER_BANK')}
          className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-amber-500 text-left transition-all shadow-2xs group cursor-pointer active:scale-95"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-base">🔁</span>
            <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">Realtime</span>
          </div>
          <div className="font-black text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-amber-500 transition-colors">Transfer Bank</div>
          <div className="text-[10px] text-zinc-400 truncate">Antar Bank RI</div>
        </button>

        <button
          type="button"
          onClick={() => handleOpenMiniATM('PULSA')}
          className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-purple-500 text-left transition-all shadow-2xs group cursor-pointer active:scale-95"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-base">📱</span>
            <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">All Op</span>
          </div>
          <div className="font-black text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-purple-500 transition-colors">Pulsa & Kuota</div>
          <div className="text-[10px] text-zinc-400 truncate">Tsel/Isat/XL/Tri</div>
        </button>

        <button
          type="button"
          onClick={() => handleOpenMiniATM('TOPUP_EWALLET')}
          className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-cyan-500 text-left transition-all shadow-2xs group cursor-pointer active:scale-95"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-base">👛</span>
            <span className="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">Dompet</span>
          </div>
          <div className="font-black text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-cyan-500 transition-colors">Top Up E-Wallet</div>
          <div className="text-[10px] text-zinc-400 truncate">DANA/Gopay/OVO</div>
        </button>

        <button
          type="button"
          onClick={() => handleOpenMiniATM('TOKEN_PLN')}
          className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-yellow-500 text-left transition-all shadow-2xs group cursor-pointer active:scale-95"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-base">⚡</span>
            <span className="text-[10px] font-mono font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded">20 Digit</span>
          </div>
          <div className="font-black text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-yellow-500 transition-colors">Token Listrik</div>
          <div className="text-[10px] text-zinc-400 truncate">PLN Prabayar</div>
        </button>

        <button
          type="button"
          onClick={() => handleOpenMiniATM('TAGIHAN_PPOB')}
          className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-rose-500 text-left transition-all shadow-2xs group cursor-pointer active:scale-95"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-base">🧾</span>
            <span className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">PPOB</span>
          </div>
          <div className="font-black text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-rose-500 transition-colors">Bayar Tagihan</div>
          <div className="text-[10px] text-zinc-400 truncate">BPJS/PDAM/Wifi</div>
        </button>
      </div>

      {/* Top Search & Scanner Action Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            ref={searchInputRef}
            id="input-pos-product-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Cari nama barang atau scan barcode kemasan... (Tekan F2)"
            className="w-full pl-10 pr-16 py-2.5 rounded-xl border text-xs sm:text-sm font-medium bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all shadow-xs"
          />
          <kbd className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 border border-zinc-200 dark:border-zinc-700 rounded bg-zinc-50 dark:bg-zinc-800">
            F2
          </kbd>
        </div>

        {/* Scan Camera Button */}
        <button
          id="btn-pos-open-scanner"
          type="button"
          onClick={() => setIsScannerOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-800 text-white hover:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-700 text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
          title="Buka Kamera Barcode Scanner (F4)"
        >
          <Scan className="w-4 h-4 text-amber-400" />
          <span>Pindai Kamera</span>
          <kbd className="hidden md:inline px-1 text-[10px] font-mono text-zinc-400 border border-zinc-700 rounded">
            F4
          </kbd>
        </button>

        {/* Held Carts / Antrian Indicator */}
        {heldCarts.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-bold text-amber-500 flex items-center gap-1 shrink-0 font-mono">
              <PauseCircle className="w-3.5 h-3.5" />
              <span>Antrian:</span>
            </span>
            {heldCarts.map((h) => (
              <button
                key={h.id}
                onClick={() => handleRestoreCart(h)}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-amber-400 text-xs font-bold flex items-center gap-1 hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer font-mono"
              >
                <PlayCircle className="w-3 h-3 text-emerald-400" />
                <span>{h.name} ({h.items.length})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Category Segmented Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          const icon = cat === 'ALL' ? '🌟' : CATEGORY_ICONS[cat] || '📦';
          return (
            <button
              key={cat}
              id={`cat-chip-${cat.replace(/\s+/g, '-')}`}
              type="button"
              onClick={() => {
                sound.playBeep(600, 0.03);
                setSelectedCategory(cat);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                isSelected
                  ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-sm'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <span>{icon}</span>{' '}
              <span>{cat === 'ALL' ? 'Semua Kategori' : cat}</span>
            </button>
          );
        })}
      </div>

      {/* Main Split Screen: Left Catalog (7-8 cols), Right Cart (4-5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Side: Product Grid */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-bold uppercase tracking-wider font-mono text-[11px]">
              Katalog Produk ({filteredProducts.length})
            </span>
            <span className="hidden sm:inline text-[11px]">
              Klik barang untuk menambah ke struk belanja
            </span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center border border-dashed rounded-2xl border-zinc-300 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/40 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mx-auto flex items-center justify-center text-xl">
                🛒
              </div>
              <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                {products.length === 0
                  ? 'Katalog Toko Bersih (0 Barang)'
                  : 'Tidak Ada Produk Ditemukan'}
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                {products.length === 0
                  ? 'Database aplikasi telah dikosongkan agar tidak tercampur dengan data lama. Silakan daftarkan produk toko Anda untuk mulai melayani transaksi kasir.'
                  : 'Coba ubah kata kunci pencarian atau pilih kategori produk lain.'}
              </p>
              {products.length === 0 && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickRegisterBarcode(String(Date.now()).slice(-8));
                      setIsQuickRegisterOpen(true);
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer active:scale-95 inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Tambah Produk Cepat</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
              {filteredProducts.map((product) => {
                const inCartItem = cart.find((i) => i.product.id === product.id);
              const isLowStock = product.stock <= product.minStock;
              const isOutOfStock = product.stock <= 0;
              const icon = CATEGORY_ICONS[product.category] || '📦';

              return (
                <button
                  key={product.id}
                  id={`btn-product-card-${product.id}`}
                  type="button"
                  onClick={() => {
                    if (product.serviceType && product.serviceType !== 'PRODUK_FISIK') {
                      handleOpenMiniATM(product.serviceType);
                    } else {
                      handleAddToCart(product, 1);
                    }
                  }}
                  disabled={isOutOfStock}
                  className={`group text-left p-3 rounded-xl border transition-all duration-150 relative flex flex-col justify-between overflow-hidden cursor-pointer shadow-2xs ${
                    isOutOfStock
                      ? 'opacity-40 grayscale cursor-not-allowed bg-zinc-100 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-amber-500/60 dark:hover:border-amber-400 active:scale-[0.98]'
                  }`}
                >
                  {/* Cart badge if item is in cart */}
                  {inCartItem && (
                    <div className="absolute top-2 right-2 bg-amber-500 text-zinc-950 font-black text-xs w-6 h-6 rounded-md flex items-center justify-center shadow-xs font-mono z-10">
                      {inCartItem.quantity}
                    </div>
                  )}

                  <div>
                    {/* Quiet Metadata Header: Category & Stock */}
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5 gap-1">
                      <span className="truncate flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                        <span>{icon}</span>
                        <span className="truncate">{product.category.split('&')[0]}</span>
                      </span>
                      <span
                        className={`font-mono text-[10px] font-semibold shrink-0 ${
                          isOutOfStock
                            ? 'text-rose-500'
                            : isLowStock
                            ? 'text-amber-500'
                            : 'text-zinc-400'
                        }`}
                      >
                        {isOutOfStock ? 'Habis' : `Stok: ${product.stock}`}
                      </span>
                    </div>

                    {/* Product Image / Icon and Name */}
                    <div className="flex items-start gap-2.5">
                      {product.imageUrl ? (
                        <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                      ) : null}
                      <h3 className="font-bold text-xs sm:text-sm line-clamp-2 leading-snug text-zinc-900 dark:text-zinc-100 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors flex-1">
                        {product.name}
                      </h3>
                    </div>
                  </div>

                  {/* Price & Add Footer */}
                  <div className="pt-2.5 mt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-end justify-between">
                    <div>
                      <div className="text-[10px] text-zinc-400 font-mono">
                        #{product.barcode.slice(-6)}
                      </div>
                      <div className="font-black text-sm sm:text-base text-zinc-900 dark:text-zinc-100 font-numeric font-mono">
                        {formatRupiah(product.sellPrice)}
                      </div>
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-zinc-950 group-hover:border-amber-500 transition-colors">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

        {/* Right Side: Cart & Checkout Summary (Desktop sticky panel) */}
        <div className="hidden lg:flex lg:col-span-5 xl:col-span-4 flex-col">
          <div
            id="pos-cart-panel"
            className="rounded-2xl border shadow-xl flex flex-col min-h-[500px] h-[calc(100vh-140px)] sticky top-2 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
          >
            {/* Cart Header */}
            <div className="p-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/60 rounded-t-2xl">
              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleSelectAllCart}
                    title={isAllCartSelected ? 'Batalkan Semua Pilihan' : 'Centang Semua Item'}
                    className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 cursor-pointer"
                  >
                    {isAllCartSelected ? (
                      <CheckSquare className="w-4 h-4 text-amber-500" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-400" />
                    )}
                  </button>
                )}
                <div className="w-7 h-7 rounded-lg bg-zinc-900 text-amber-400 border border-zinc-700 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-extrabold text-xs sm:text-sm tracking-tight">Keranjang Struk</h2>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    {cart.length} barang · {totalItemCount} pcs
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {selectedCartIds.length > 0 && (
                  <button
                    id="btn-bulk-remove-cart"
                    type="button"
                    onClick={handleBulkRemoveFromCart}
                    className="px-2 py-1 rounded-lg bg-rose-500/10 text-rose-500 text-xs font-bold border border-rose-500/20 hover:bg-rose-500/20 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                    <span>Hapus ({selectedCartIds.length})</span>
                  </button>
                )}
                {cart.length > 0 && (
                  <>
                    <button
                      id="btn-hold-cart"
                      type="button"
                      onClick={handleHoldCart}
                      title="Simpan Antrian (F8)"
                      className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold border border-zinc-200 dark:border-zinc-700 hover:text-amber-400 cursor-pointer"
                    >
                      <PauseCircle className="w-3.5 h-3.5 inline mr-1" />
                      <span>Antrian</span>
                    </button>
                    <button
                      id="btn-clear-cart"
                      type="button"
                      onClick={handleClearCart}
                      title="Kosongkan Keranjang"
                      className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
                  <Package className="w-10 h-10 mb-2 stroke-[1.2] text-zinc-300 dark:text-zinc-700" />
                  <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Keranjang Masih Kosong</p>
                  <p className="text-[11px] text-zinc-400 mt-1 max-w-[200px]">
                    Klik barang pada katalog atau scan barcode kemasan untuk menambah belanjaan.
                  </p>
                </div>
              ) : (
                cart.map((item) => {
                  const isChecked = selectedCartIds.includes(item.product.id);
                  return (
                    <div
                      key={item.product.id}
                      className={`pt-2 first:pt-0 p-1.5 rounded-lg transition-colors ${
                        isChecked ? 'bg-amber-500/10' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleSelectCartItem(item.product.id)}
                            className="p-0.5 rounded text-zinc-400 hover:text-zinc-600 cursor-pointer"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-3.5 h-3.5 text-amber-500" />
                            ) : (
                              <Square className="w-3.5 h-3.5" />
                            )}
                          </button>
                          {item.product.imageUrl && (
                            <img
                              src={item.product.imageUrl}
                              alt={item.product.name}
                              className="w-7 h-7 rounded-md object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-xs truncate text-zinc-900 dark:text-zinc-100">
                              {item.product.name}
                            </h4>
                            <div className="text-[10px] text-zinc-400 font-mono">
                              {formatRupiah(item.product.sellPrice)} / {item.product.unit}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bold text-xs font-mono font-numeric text-zinc-900 dark:text-zinc-100">
                            {formatRupiah(item.subtotal)}
                          </div>
                        </div>
                      </div>

                      {/* Quantity Stepper & Direct Input */}
                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-950 rounded-lg p-0.5 border border-zinc-200 dark:border-zinc-800">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.product.id, -1)}
                            className="w-6 h-6 flex items-center justify-center rounded text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={item.product.stock}
                            value={item.quantity}
                            onChange={(e) =>
                              handleDirectQtyChange(item.product.id, Number(e.target.value))
                            }
                            className="w-10 text-center font-bold text-xs bg-transparent focus:outline-none font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.product.id, 1)}
                            className="w-6 h-6 flex items-center justify-center rounded text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.product.id)}
                          className="p-1 text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title="Hapus dari keranjang"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Cart Summary & Massive Checkout Button */}
            <div className="p-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 rounded-b-2xl space-y-2.5">
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                  <span>Subtotal</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 font-numeric">
                    {formatRupiah(subtotal)}
                  </span>
                </div>

                {/* Optional Global Discount */}
                {showDiscountInput ? (
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[11px] text-zinc-500">Diskon (Rp):</span>
                    <input
                      type="number"
                      value={cartDiscount || ''}
                      onChange={(e) => setCartDiscount(Math.max(0, Number(e.target.value)))}
                      placeholder="0"
                      className="w-24 px-2 py-1 rounded border text-xs text-right font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDiscountInput(false)}
                      className="text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-zinc-500">
                    <button
                      type="button"
                      onClick={() => setShowDiscountInput(true)}
                      className="text-[11px] text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Tag className="w-3 h-3" />
                      <span>+ Beri Potongan / Diskon</span>
                    </button>
                    {cartDiscount > 0 && (
                      <span className="font-bold text-rose-500 font-numeric">
                        -{formatRupiah(cartDiscount)}
                      </span>
                    )}
                  </div>
                )}

                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2 flex justify-between items-baseline">
                  <span className="font-extrabold text-sm tracking-tight text-zinc-800 dark:text-zinc-200">
                    TOTAL BAYAR
                  </span>
                  <span className="font-black text-xl sm:text-2xl text-amber-500 dark:text-amber-400 font-numeric">
                    {formatRupiah(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Big Ergonomic Checkout Button */}
              <button
                id="btn-open-checkout"
                type="button"
                onClick={() => {
                  if (cart.length === 0) return;
                  sound.playBeep(650, 0.04);
                  setIsCheckoutOpen(true);
                }}
                disabled={cart.length === 0}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-black text-sm sm:text-base rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-98 tracking-wide cursor-pointer"
              >
                <span>BAYAR SEKARANG</span>
                <span className="text-xs font-mono opacity-80">(F9)</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Bar for Mobile / HP (Pinned above mobile nav) */}
      {cart.length > 0 && (
        <div
          id="mobile-cart-floating-bar"
          className="lg:hidden fixed bottom-14 left-0 right-0 z-30 p-2.5 bg-zinc-950 border-t border-zinc-800 shadow-2xl flex items-center justify-between gap-2 safe-bottom animate-in slide-in-from-bottom-2 duration-150"
        >
          <button
            type="button"
            onClick={() => setIsMobileCartDrawerOpen(true)}
            className="flex items-center gap-2 text-left min-w-0 flex-1 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 text-amber-400 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="text-[10px] text-zinc-400 font-mono">
                {totalItemCount} barang di keranjang
              </div>
              <div className="font-black text-sm text-amber-400 font-mono font-numeric leading-tight">
                {formatRupiah(grandTotal)}
              </div>
            </div>
            <ChevronUp className="w-4 h-4 text-zinc-400 ml-1" />
          </button>

          <button
            id="mobile-btn-quick-checkout"
            type="button"
            onClick={() => setIsCheckoutOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center gap-1.5 shadow-md shrink-0 cursor-pointer active:scale-95"
          >
            <span>Bayar (F9)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mobile Cart Slide-up Sheet / Drawer */}
      {isMobileCartDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-xs lg:hidden animate-in fade-in duration-150">
          <div className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden text-zinc-100 shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <h3 className="font-extrabold text-sm">Keranjang Belanja ({cart.length})</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileCartDrawerOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-zinc-800">
              {cart.map((item) => (
                <div key={item.product.id} className="pt-2 first:pt-0">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {item.product.imageUrl && (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-8 h-8 rounded-lg object-cover border border-zinc-700 shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-white truncate">{item.product.name}</div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          {formatRupiah(item.product.sellPrice)} / {item.product.unit}
                        </div>
                      </div>
                    </div>
                    <div className="font-bold text-xs text-amber-400 font-mono shrink-0 pl-2">
                      {formatRupiah(item.subtotal)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 bg-zinc-950 rounded-lg p-1 border border-zinc-800">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.product.id, -1)}
                        className="w-7 h-7 flex items-center justify-center rounded text-zinc-300 hover:bg-zinc-800 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center font-bold text-xs font-mono">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.product.id, 1)}
                        className="w-7 h-7 flex items-center justify-center rounded text-zinc-300 hover:bg-zinc-800 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.product.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 bg-zinc-950 border-t border-zinc-800 space-y-3">
              <div className="flex justify-between items-baseline font-mono">
                <span className="text-xs text-zinc-400 font-bold">TOTAL:</span>
                <span className="font-black text-xl text-amber-400">
                  {formatRupiah(grandTotal)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleHoldCart();
                    setIsMobileCartDrawerOpen(false);
                  }}
                  className="py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 text-xs font-bold"
                >
                  Simpan Antrian
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileCartDrawerOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black flex items-center justify-center gap-1.5"
                >
                  <span>Lanjut Bayar</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        products={products}
        onScanSuccess={handleBarcodeScanned}
        mode="CASHIER"
        cartCount={totalItemCount}
        cartTotal={grandTotal}
        onRegisterProduct={(barcode) => {
          setQuickRegisterBarcode(barcode);
          setQuickName('');
          setQuickBuyPrice(0);
          setQuickSellPrice(0);
          setQuickStock(20);
          setQuickUnit('pcs');
          setIsQuickRegisterOpen(true);
        }}
        darkMode={darkMode}
      />

      {/* Quick Register Modal for Unrecognized Barcodes */}
      {isQuickRegisterOpen && (
        <div
          id="quick-register-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm overflow-y-auto"
        >
          <div
            id="quick-register-card"
            className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border bg-zinc-900 border-zinc-800 text-zinc-100"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950/60">
              <div>
                <h3 className="font-black text-sm sm:text-base flex items-center gap-1.5 text-amber-400">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Daftarkan Barang dari Kemasan</span>
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Barcode: <span className="font-mono font-bold text-amber-400">{quickRegisterBarcode}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickRegisterOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickRegisterSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">
                  Nama Produk:
                </label>
                <input
                  type="text"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  placeholder="Contoh: Roma Kelapa 300g / Aqua 600ml"
                  className="w-full px-3 py-2 rounded-xl border text-xs font-bold bg-zinc-950 border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  autoFocus
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">
                    Kategori:
                  </label>
                  <select
                    value={quickCategory}
                    onChange={(e) => setQuickCategory(e.target.value as ProductCategory)}
                    className="w-full px-2.5 py-2 rounded-xl border text-xs bg-zinc-950 border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {CATEGORIES.filter((c) => c !== 'ALL').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">
                    Satuan:
                  </label>
                  <input
                    type="text"
                    value={quickUnit}
                    onChange={(e) => setQuickUnit(e.target.value)}
                    placeholder="pcs, bks, btl"
                    className="w-full px-3 py-2 rounded-xl border text-xs font-bold bg-zinc-950 border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">
                    Harga Modal (Rp):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={quickBuyPrice || ''}
                    onChange={(e) => setQuickBuyPrice(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono bg-zinc-950 border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">
                    Harga Jual (Rp):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={quickSellPrice || ''}
                    onChange={(e) => setQuickSellPrice(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold text-amber-400 bg-zinc-950 border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">
                  Jumlah Stok Awal:
                </label>
                <input
                  type="number"
                  min="1"
                  value={quickStock}
                  onChange={(e) => setQuickStock(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-mono bg-zinc-950 border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              {/* Photo Uploader */}
              <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <ProductImageUploader
                  currentImageUrl={quickImageUrl}
                  onImageChange={(img) => setQuickImageUrl(img)}
                  productName={quickName}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsQuickRegisterOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan & Masuk Keranjang</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cart}
        subtotal={subtotal}
        discount={cartDiscount}
        grandTotal={grandTotal}
        totalCost={totalCost}
        settings={settings}
        currentUser={currentUser}
        onPaymentSuccess={(trx) => {
          setIsCheckoutOpen(false);
          setIsMobileCartDrawerOpen(false);
          setCart([]);
          setCartDiscount(0);
          onTransactionCompleted(trx);
        }}
        darkMode={darkMode}
      />

      {/* Mini ATM & Konter Pulsa Transaction Modal */}
      {isMiniATMModalOpen && activeBranch && (
        <MiniATMTransactionModal
          isOpen={isMiniATMModalOpen}
          onClose={() => setIsMiniATMModalOpen(false)}
          activeBranch={activeBranch}
          settings={settings}
          currentUser={currentUser}
          initialService={miniATMInitialService}
          onCompleteTransaction={(trx, balanceChanges, mutationMeta) => {
            setIsMiniATMModalOpen(false);
            onAdjustBranchBalances?.(activeBranch.id, balanceChanges, {
              category: mutationMeta.category,
              description: mutationMeta.description,
              cashierName: currentUser?.name || 'Kasir Agen',
              referenceId: trx.referenceNumber,
            });
            onTransactionCompleted(trx);
          }}
          darkMode={darkMode}
        />
      )}

      {/* Quick Fee & Profit Calculator Modal */}
      {isCalculatorOpen && (
        <QuickFeeCalculatorModal
          isOpen={isCalculatorOpen}
          onClose={() => setIsCalculatorOpen(false)}
          defaultAdminFee={settings.defaultAdminFee || 5000}
          activeBranch={activeBranch}
          onSelectTransaction={(data) => {
            setMiniATMInitialService(data.serviceType);
            setIsCalculatorOpen(false);
            setIsMiniATMModalOpen(true);
          }}
          darkMode={darkMode}
        />
      )}
    </div>
  );
};

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
  ChevronDown,
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
  PaymentMethod,
} from '../types';
import { formatRupiah } from '../services/export';
import { sound } from '../services/sound';
import { CheckoutModal } from './CheckoutModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { ProductImageUploader } from './ProductImageUploader';

export const PHYSICAL_CATEGORIES: ProductCategory[] = [
  'Cas & Charger',
  'Casing & Tempered Glass',
  'Kabel Data',
  'Handphone & Audio',
  'Flashdisk & Memori',
  'Aksesoris Handphone',
  'Kartu Perdana',
  'Voucher Fisik',
];

const CATEGORIES: ('ALL' | ProductCategory)[] = [
  'ALL',
  ...PHYSICAL_CATEGORIES,
];

const CATEGORY_ICONS: Record<string, string> = {
  ALL: '🌟',
  'Cas & Charger': '🔌',
  'Casing & Tempered Glass': '🛡️',
  'Kabel Data': '⚡',
  'Handphone & Audio': '🎧',
  'Flashdisk & Memori': '💾',
  'Aksesoris Handphone': '📦',
  'Kartu Perdana': '🪪',
  'Voucher Fisik': '🎟️',
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
  initialCategoryGroup?: 'ALL' | 'DIGITAL' | 'FISIK';
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
  initialCategoryGroup,
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

  // Category Dropdown State & Banner Visibility
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isBannerVisible, setIsBannerVisible] = useState(true);
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close category dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(e.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search input ref for F2 shortcut
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Quick Register Modal State for Physical Konter Items
  const [isQuickRegisterOpen, setIsQuickRegisterOpen] = useState(false);
  const [quickRegisterBarcode, setQuickRegisterBarcode] = useState('');
  const [quickName, setQuickName] = useState('');
  const [quickCategory, setQuickCategory] = useState<ProductCategory>('Cas & Charger');
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

  // Helper: strictly identify physical products (excludes any digital/pulsa/mini ATM/token/e-wallet)
  const isPhysicalProduct = (p: Product): boolean => {
    if (p.serviceType && p.serviceType !== 'PRODUK_FISIK') return false;
    const cat = (p.category || '').toLowerCase();
    const isDigitalCat =
      cat.includes('pulsa') ||
      cat.includes('paket') ||
      cat.includes('data') ||
      cat.includes('atm') ||
      cat.includes('tunai') ||
      cat.includes('transfer') ||
      cat.includes('wallet') ||
      cat.includes('pln') ||
      cat.includes('listrik') ||
      cat.includes('ppob') ||
      cat.includes('bpjs') ||
      cat.includes('layanan');
    return !isDigitalCat;
  };

  // 100% strictly physical products list
  const physicalProducts = useMemo(() => {
    return products.filter((p) => p.isActive && isPhysicalProduct(p));
  }, [products]);

  // Real-time product counts per physical category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: physicalProducts.length,
    };
    PHYSICAL_CATEGORIES.forEach((cat) => {
      counts[cat] = physicalProducts.filter((p) => p.category === cat).length;
    });
    return counts;
  }, [physicalProducts]);

  // Filter physical products by selected category (Dropdown/Pills) and search query
  const filteredProducts = useMemo(() => {
    return physicalProducts.filter((p) => {
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false;
      }

      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      return (
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [physicalProducts, selectedCategory, searchQuery]);

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

  // 1-Click Quick Sell for Physical Goods (Catat Penjualan Fisik Kilat tanpa ribet keranjang)
  const handleQuickSellProduct = (
    product: Product,
    paymentMethod: PaymentMethod = 'TUNAI'
  ) => {
    if (product.stock <= 0) {
      sound.playError();
      alert(`Stok ${product.name} saat ini habis!`);
      return;
    }

    sound.playSuccess();
    const profit = Math.max(0, product.sellPrice - product.buyPrice);
    const now = new Date();
    const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(1000 + Math.random() * 9000))}`;

    const trx: Transaction = {
      id: `trx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      invoiceNumber,
      referenceNumber: `KONTER-${Date.now().toString().slice(-6)}`,
      date: now.toISOString(),
      cashierId: currentUser?.id || 'cashier-1',
      cashierName: currentUser?.name || 'Kasir Konter',
      branchId: activeBranch?.id || 'branch-pusat',
      branchName: activeBranch?.name || 'Konter Pusat',
      items: [
        {
          productId: product.id,
          productName: product.name,
          barcode: product.barcode,
          category: product.category,
          buyPrice: product.buyPrice,
          sellPrice: product.sellPrice,
          quantity: 1,
          unit: product.unit,
          discount: 0,
          subtotal: product.sellPrice,
          profit: profit,
          serviceType: product.serviceType || 'PRODUK_FISIK',
        },
      ],
      totalQuantity: 1,
      subtotal: product.sellPrice,
      discount: 0,
      grandTotal: product.sellPrice,
      totalCost: product.buyPrice,
      totalProfit: profit,
      paymentMethod,
      cashAmount: paymentMethod === 'TUNAI' ? product.sellPrice : undefined,
      changeAmount: 0,
      notes: `Penjualan Kilat: ${product.name}`,
      status: 'COMPLETED',
    };

    // Adjust branch balances
    onAdjustBranchBalances?.(
      activeBranch?.id || 'branch-pusat',
      {
        cashChange: paymentMethod === 'TUNAI' ? product.sellPrice : 0,
        bankChange: paymentMethod === 'QRIS' ? product.sellPrice : 0,
      },
      {
        category: 'TRANSAKSI',
        description: `Penjualan Kilat: ${product.name}`,
        cashierName: currentUser?.name || 'Kasir Konter',
        referenceId: invoiceNumber,
      }
    );

    // Save stock reduction if product is updated
    if (onSaveProduct) {
      onSaveProduct({
        ...product,
        stock: Math.max(0, product.stock - 1),
        updatedAt: now.toISOString(),
      });
    }

    onTransactionCompleted(trx);
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

      {/* 1. Banner Penjualan Barang Fisik Konter (Kombinasi Putih & Biru - Responsif Mobile & Tablet) */}
      {isBannerVisible ? (
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/40 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800 text-white shadow-lg transition-all">
          {/* Subtle Ambient Glow Effects */}
          <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 left-1/4 w-48 h-48 bg-sky-400/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative p-3.5 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4">
            {/* Left: Graphic Icon + Title + Description */}
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="relative shrink-0 mt-0.5">
                <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-white flex items-center justify-center text-xl sm:text-2xl shadow-md text-blue-700 font-black">
                  🔌
                </div>
                <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-md bg-blue-600 border border-white flex items-center justify-center text-[10px] shadow-xs">
                  🛡️
                </div>
              </div>

              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider font-mono bg-white text-blue-800 shadow-2xs shrink-0">
                    BARANG FISIK
                  </span>
                  <span className="text-[11px] sm:text-xs text-blue-100 font-mono font-bold truncate">
                    {activeBranch ? activeBranch.name : 'Konter Utama'}
                  </span>
                </div>
                <h2 className="text-sm sm:text-base lg:text-lg font-black tracking-tight text-white leading-snug">
                  Catat Penjualan Fisik: Barang Konter
                </h2>
                <p className="text-xs text-blue-100 leading-relaxed line-clamp-2 sm:line-clamp-none">
                  Pencatatan khusus barang konter fisik (Cas &amp; Charger, Casing, Tempered Glass, Kabel Data, Audio, dll). Transaksi otomatis potong stok &amp; langsung masuk kas toko.
                </p>
              </div>
            </div>

            {/* Right: Quick Action Buttons & Collapse */}
            <div className="flex items-center gap-2 w-full lg:w-auto shrink-0 justify-between sm:justify-end pt-2.5 lg:pt-0 border-t lg:border-t-0 border-blue-600/50">
              <button
                type="button"
                onClick={() => {
                  setQuickRegisterBarcode(String(Date.now()).slice(-8));
                  setQuickName('');
                  setQuickBuyPrice(0);
                  setQuickSellPrice(0);
                  setQuickStock(20);
                  setQuickUnit('pcs');
                  setQuickCategory('Cas & Charger');
                  setIsQuickRegisterOpen(true);
                }}
                className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-blue-800 text-xs font-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 whitespace-nowrap"
              >
                <Plus className="w-4 h-4 text-blue-700 shrink-0" />
                <span>+ Tambah Barang Baru</span>
              </button>

              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="px-3 py-2.5 rounded-xl bg-blue-900/60 hover:bg-blue-900 text-white text-xs font-bold border border-blue-400/40 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shrink-0 whitespace-nowrap"
                title="Buka Kamera Barcode Scanner (F4)"
              >
                <Scan className="w-4 h-4 text-blue-200 shrink-0" />
                <span>Scan</span>
              </button>

              <button
                type="button"
                onClick={() => setIsBannerVisible(false)}
                className="p-2 rounded-xl text-blue-200 hover:text-white hover:bg-blue-900/50 transition-colors cursor-pointer shrink-0"
                title="Sembunyikan Banner untuk Layar Lebih Luas"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Banner Quick Footer Ribbon */}
          <div className="px-3.5 sm:px-5 py-2 bg-blue-950/50 border-t border-blue-600/40 flex flex-wrap items-center justify-between text-[11px] text-blue-100 gap-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5 font-mono">
                <Package className="w-3.5 h-3.5 text-white shrink-0" />
                <span className="text-white font-bold">{physicalProducts.length}</span>
                <span>Barang Fisik</span>
              </span>
              <span className="flex items-center gap-1.5 font-mono">
                <Tag className="w-3.5 h-3.5 text-white shrink-0" />
                <span className="text-white font-bold">{PHYSICAL_CATEGORIES.length}</span>
                <span>Kategori</span>
              </span>
              <span className="hidden md:inline-flex items-center gap-1.5 text-emerald-300 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>100% Khusus Barang Fisik</span>
              </span>
            </div>

            <div className="hidden lg:flex items-center gap-2 font-mono text-[10px] text-blue-200">
              <span>Shortcut:</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-900/70 text-white">F2: Cari</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-900/70 text-white">F4: Scan</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-900/70 text-white">F9: Bayar</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-slate-900 border border-blue-200 dark:border-slate-800 text-xs">
          <span className="font-bold text-blue-900 dark:text-slate-300 flex items-center gap-1.5 truncate">
            <span>🔌</span>
            <span className="truncate">Banner Penjualan Barang Fisik</span>
          </span>
          <button
            type="button"
            onClick={() => setIsBannerVisible(true)}
            className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer shrink-0 ml-2"
          >
            <span>Tampilkan</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Controls: Search Bar + TOMBOL KATEGORI DROP DOWN + Barcode Scanner + Antrian */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500" />
          <input
            ref={searchInputRef}
            id="input-pos-product-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Cari cas, charger, casing, kabel data, aksesoris, barcode... (Tekan F2)"
            className="w-full pl-10 pr-20 py-2.5 rounded-xl border text-xs sm:text-sm font-medium bg-white dark:bg-slate-900 border-blue-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-9 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              title="Hapus pencarian"
            >
              ✕
            </button>
          )}
          <kbd className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-blue-700 border border-blue-200 dark:border-slate-700 rounded bg-blue-50 dark:bg-slate-800">
            F2
          </kbd>
        </div>

        {/* 3. TOMBOL KATEGORI DROP DOWN */}
        <div className="relative shrink-0" ref={categoryDropdownRef}>
          <button
            id="btn-category-dropdown"
            type="button"
            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
            className={`w-full sm:w-auto h-11 px-3.5 sm:px-4 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-between sm:justify-start gap-2 transition-all cursor-pointer shadow-xs select-none ${
              selectedCategory !== 'ALL'
                ? 'bg-blue-600 border-blue-700 text-white shadow-sm shadow-blue-600/20'
                : 'bg-white dark:bg-slate-900 border-blue-200 dark:border-slate-800 text-blue-950 dark:text-slate-200 hover:border-blue-400 hover:bg-blue-50/50'
            }`}
            title="Klik untuk memilih kategori barang fisik"
          >
            <div className="flex items-center gap-2 truncate">
              <Tag className={`w-4 h-4 shrink-0 ${selectedCategory !== 'ALL' ? 'text-white' : 'text-blue-600'}`} />
              <span className={`hidden sm:inline font-normal ${selectedCategory !== 'ALL' ? 'text-blue-100' : 'text-slate-500'}`}>Kategori:</span>
              <span className="font-extrabold truncate max-w-[130px] sm:max-w-[170px]">
                {selectedCategory === 'ALL'
                  ? 'Semua Kategori'
                  : `${CATEGORY_ICONS[selectedCategory] || '📦'} ${selectedCategory}`}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-black ${
                selectedCategory !== 'ALL'
                  ? 'bg-white text-blue-700'
                  : 'bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-slate-300'
              }`}>
                {categoryCounts[selectedCategory] ?? 0}
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  selectedCategory !== 'ALL' ? 'text-white' : 'text-blue-600'
                } ${isCategoryDropdownOpen ? 'rotate-180' : ''}`}
              />
            </div>
          </button>

          {/* Category Dropdown Menu Popup */}
          {isCategoryDropdownOpen && (
            <div
              id="category-dropdown-menu"
              className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="px-2.5 py-2 border-b border-blue-100 dark:border-slate-800/80 mb-1 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-slate-400 font-mono">
                  Kategori Barang Fisik
                </span>
                {selectedCategory !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('ALL');
                      setIsCategoryDropdownOpen(false);
                      sound.playBeep(700, 0.03);
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-bold cursor-pointer"
                  >
                    Reset (Semua)
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                {/* Option: Semua Kategori */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('ALL');
                    setIsCategoryDropdownOpen(false);
                    sound.playBeep(700, 0.03);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    selectedCategory === 'ALL'
                      ? 'bg-blue-600 text-white font-black shadow-xs'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">🌟</span>
                    <span>Semua Kategori Barang Fisik</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      selectedCategory === 'ALL'
                        ? 'bg-white text-blue-700'
                        : 'bg-blue-50 dark:bg-slate-800 text-blue-700'
                    }`}
                  >
                    {categoryCounts.ALL}
                  </span>
                </button>

                {/* Options: Each Physical Category */}
                {PHYSICAL_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  const count = categoryCounts[cat] || 0;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        setIsCategoryDropdownOpen(false);
                        sound.playBeep(700, 0.03);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white font-black shadow-xs'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="text-base">{CATEGORY_ICONS[cat] || '📦'}</span>
                        <span className="truncate">{cat}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ml-2 ${
                          isSelected
                            ? 'bg-white text-blue-700'
                            : count > 0
                            ? 'bg-blue-50 dark:bg-slate-800 text-blue-700'
                            : 'bg-slate-100 dark:bg-slate-800/40 text-slate-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Barcode Scanner Button */}
        <button
          type="button"
          onClick={() => setIsScannerOpen(true)}
          className="h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-amber-500 text-zinc-700 dark:text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs active:scale-95"
          title="Buka Kamera Barcode Scanner (F4)"
        >
          <Scan className="w-4 h-4 text-amber-500" />
          <span className="hidden md:inline">Scan (F4)</span>
        </button>

        {/* Held Carts / Antrian */}
        {heldCarts.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto shrink-0">
            <span className="text-[11px] font-bold text-amber-500 flex items-center gap-1 shrink-0 font-mono">
              <PauseCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Antrian:</span>
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

      {/* 4. Horizontal Quick Category Chips (Tampilan Akses Cepat di Bawah Drop Down) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <button
          type="button"
          onClick={() => {
            setSelectedCategory('ALL');
            sound.playBeep(700, 0.03);
          }}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer text-xs flex items-center gap-1.5 ${
            selectedCategory === 'ALL'
              ? 'bg-amber-500 text-zinc-950 font-black shadow-xs'
              : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'
          }`}
        >
          <span>🌟 Semua</span>
          <span className="text-[10px] opacity-75 font-mono">({categoryCounts.ALL})</span>
        </button>

        {PHYSICAL_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          const count = categoryCounts[cat] || 0;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setSelectedCategory(cat);
                sound.playBeep(700, 0.03);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer text-xs flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-amber-500 text-zinc-950 font-black shadow-xs'
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <span>{CATEGORY_ICONS[cat]}</span>
              <span>{cat}</span>
              <span className="text-[10px] opacity-75 font-mono">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Main Split Screen: Left Catalog (7-8 cols), Right Cart (4-5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Side: Product Grid */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="font-bold uppercase tracking-wider font-mono text-[11px] text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <span>🔌</span>
                <span>
                  {selectedCategory === 'ALL'
                    ? 'Katalog Barang Fisik Konter'
                    : `Kategori: ${selectedCategory}`}
                </span>
                <span className="ml-1 font-normal text-zinc-400 font-mono">({filteredProducts.length})</span>
              </span>
              {selectedCategory !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ALL')}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-amber-500 font-bold cursor-pointer transition-colors"
                  title="Lihat semua produk tanpa filter"
                >
                  Semua Produk ✕
                </button>
              )}
            </div>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 max-h-[calc(100vh-170px)] overflow-y-auto pr-1 pb-12">
              {filteredProducts.map((product) => {
                const inCartItem = cart.find((i) => i.product.id === product.id);
              const isLowStock = product.stock <= product.minStock;
              const isOutOfStock = product.stock <= 0;
              const icon = CATEGORY_ICONS[product.category] || '📦';

              return (
                <div
                  key={product.id}
                  id={`btn-product-card-${product.id}`}
                  role="button"
                  tabIndex={isOutOfStock ? -1 : 0}
                  onClick={() => {
                    if (isOutOfStock) return;
                    handleAddToCart(product, 1);
                  }}
                  onKeyDown={(e) => {
                    if (isOutOfStock) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleAddToCart(product, 1);
                    }
                  }}
                  className={`group text-left p-3 rounded-xl border transition-all duration-150 relative flex flex-col justify-between overflow-hidden shadow-2xs select-none ${
                    isOutOfStock
                      ? 'opacity-40 grayscale cursor-not-allowed bg-zinc-100 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800'
                      : 'cursor-pointer bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-amber-500/60 dark:hover:border-amber-400 active:scale-[0.98]'
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
                  <div className="pt-2.5 mt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] text-zinc-400 font-mono truncate">
                        #{product.barcode.slice(-6)}
                      </div>
                      <div className="font-black text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 font-numeric font-mono truncate">
                        {formatRupiah(product.sellPrice)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {(!product.serviceType || product.serviceType === 'PRODUK_FISIK') && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickSellProduct(product, 'TUNAI');
                          }}
                          title="Jual Kilat 1x (Langsung Catat Tunai Selesai)"
                          className="px-2 py-1 rounded-lg text-[10px] font-black bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white border border-emerald-500/20 transition-all flex items-center gap-0.5 cursor-pointer active:scale-95 shadow-2xs"
                        >
                          <span>⚡</span>
                          <span className="hidden sm:inline">Jual</span>
                        </button>
                      )}
                      <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-zinc-950 group-hover:border-amber-500 transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
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

      {/* Floating Bottom Bar for Mobile & Tablet (Pinned above bottom nav) */}
      {cart.length > 0 && (
        <div
          id="mobile-cart-floating-bar"
          className="lg:hidden fixed bottom-14 left-0 right-0 z-30 p-2.5 bg-white dark:bg-slate-900 border-t border-blue-200 dark:border-slate-800 shadow-[0_-4px_20px_-4px_rgba(37,99,235,0.2)] flex items-center justify-between gap-2 safe-bottom animate-in slide-in-from-bottom-2 duration-150"
        >
          <button
            type="button"
            onClick={() => setIsMobileCartDrawerOpen(true)}
            className="flex items-center gap-2.5 text-left min-w-0 flex-1 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                {totalItemCount} barang di keranjang
              </div>
              <div className="font-black text-sm text-blue-700 dark:text-blue-400 font-mono font-numeric leading-tight">
                {formatRupiah(grandTotal)}
              </div>
            </div>
            <ChevronUp className="w-4 h-4 text-blue-600 ml-1 shrink-0" />
          </button>

          <button
            id="mobile-btn-quick-checkout"
            type="button"
            onClick={() => setIsCheckoutOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shrink-0 cursor-pointer active:scale-95"
          >
            <span>Bayar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mobile & Tablet Cart Slide-up Sheet / Drawer */}
      {isMobileCartDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs lg:hidden animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border-t border-blue-200 dark:border-slate-800 rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100 shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-blue-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 text-white">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-white" />
                <h3 className="font-extrabold text-sm">Keranjang Belanja ({cart.length})</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileCartDrawerOpen(false)}
                className="p-1 rounded-lg text-blue-100 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-blue-100 dark:divide-slate-800">
              {cart.map((item) => (
                <div key={item.product.id} className="pt-2 first:pt-0">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {item.product.imageUrl && (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-8 h-8 rounded-lg object-cover border border-blue-200 dark:border-slate-700 shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">{item.product.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {formatRupiah(item.product.sellPrice)} / {item.product.unit}
                        </div>
                      </div>
                    </div>
                    <div className="font-bold text-xs text-blue-700 dark:text-blue-400 font-mono shrink-0 pl-2">
                      {formatRupiah(item.subtotal)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 bg-blue-50/70 dark:bg-slate-950 rounded-lg p-1 border border-blue-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.product.id, -1)}
                        className="w-7 h-7 flex items-center justify-center rounded text-blue-700 dark:text-slate-300 hover:bg-blue-100 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center font-bold text-xs font-mono text-slate-900 dark:text-white">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.product.id, 1)}
                        className="w-7 h-7 flex items-center justify-center rounded text-blue-700 dark:text-slate-300 hover:bg-blue-100 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.product.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 bg-blue-50/50 dark:bg-slate-950 border-t border-blue-100 dark:border-slate-800 space-y-3">
              <div className="flex justify-between items-baseline font-mono">
                <span className="text-xs text-slate-500 font-bold">TOTAL:</span>
                <span className="font-black text-xl text-blue-700 dark:text-blue-400">
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
                  className="py-2.5 rounded-xl border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-blue-900 dark:text-slate-200 text-xs font-bold cursor-pointer"
                >
                  Simpan Antrian
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileCartDrawerOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
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
                  <span>Daftarkan Barang Fisik Konter</span>
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
                  placeholder="Contoh: Casing Matte iPhone 13 / Charger 20W Type-C / Kabel Fast Charge"
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
    </div>
  );
};

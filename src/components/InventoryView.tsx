import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  Edit2,
  Trash2,
  ArrowUpDown,
  History,
  Check,
  X,
  Coins,
  CheckSquare,
  Square,
  Layers,
  CheckCircle2,
  Scan,
} from 'lucide-react';
import { Product, ProductCategory, StockLog, StoreSettings, ServiceType } from '../types';
import { formatRupiah, exportStockToExcel, exportStockPDF } from '../services/export';
import { sound } from '../services/sound';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { ProductImageUploader } from './ProductImageUploader';

const ALL_CATEGORIES: ProductCategory[] = [
  'Layanan Mini ATM',
  'Pulsa & Paket Data',
  'Top Up E-Wallet',
  'Token & Listrik PLN',
  'Tagihan PPOB & BPJS',
  'Kartu Perdana & Voucher',
  'Aksesoris Handphone',
];

interface InventoryViewProps {
  products: Product[];
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onBulkDeleteProducts?: (productIds: string[]) => void;
  onAdjustStock: (productId: string, quantityChange: number, reason: string) => void;
  stockLogs: StockLog[];
  settings: StoreSettings;
  darkMode: boolean;
  onLoadSampleData?: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  onSaveProduct,
  onDeleteProduct,
  onBulkDeleteProducts,
  onAdjustStock,
  stockLogs,
  settings,
  darkMode,
  onLoadSampleData,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [priceAdjustProduct, setPriceAdjustProduct] = useState<Product | null>(null);

  // Checkbox Selection State
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isBulkCategoryModalOpen, setIsBulkCategoryModalOpen] = useState(false);
  const [bulkCategoryTarget, setBulkCategoryTarget] = useState<ProductCategory>('Pulsa & Paket Data');

  // Quick Price Adjustment Form
  const [quickSellPrice, setQuickSellPrice] = useState<number>(0);
  const [quickBuyPrice, setQuickBuyPrice] = useState<number>(0);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    barcode: '',
    name: '',
    category: 'Layanan Mini ATM' as ProductCategory,
    buyPrice: 0,
    sellPrice: 0,
    stock: 999,
    minStock: 5,
    unit: 'trx',
    imageUrl: '' as string | undefined,
    serviceType: 'TARIK_TUNAI' as ServiceType | undefined,
    provider: 'BRI',
    nominal: 100000,
    adminFee: 5000,
  });

  // Stock Adjustment Form
  const [adjustQty, setAdjustQty] = useState<number>(10);
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT'>('IN');
  const [adjustReason, setAdjustReason] = useState<string>('Kulakan Stok Baru / Pembelian');

  // Low stock products count
  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.stock <= p.minStock && p.stock > 0).length;
  }, [products]);

  const outOfStockCount = useMemo(() => {
    return products.filter((p) => p.stock <= 0).length;
  }, [products]);

  const totalAssetValue = useMemo(() => {
    return products.reduce((acc, p) => acc + p.buyPrice * p.stock, 0);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);

      let matchStock = true;
      if (stockFilter === 'LOW') matchStock = p.stock <= p.minStock && p.stock > 0;
      if (stockFilter === 'OUT') matchStock = p.stock <= 0;

      return matchCat && matchQuery && matchStock;
    });
  }, [products, selectedCategory, searchQuery, stockFilter]);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      barcode: `ATM${Math.floor(100000 + Math.random() * 900000)}`,
      name: '',
      category: 'Layanan Mini ATM',
      buyPrice: 100000,
      sellPrice: 105000,
      stock: 999,
      minStock: 5,
      unit: 'trx',
      imageUrl: undefined,
      serviceType: 'TARIK_TUNAI',
      provider: 'BRI',
      nominal: 100000,
      adminFee: 5000,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      barcode: product.barcode,
      name: product.name,
      category: product.category,
      buyPrice: product.buyPrice,
      sellPrice: product.sellPrice,
      stock: product.stock,
      minStock: product.minStock,
      unit: product.unit,
      imageUrl: product.imageUrl,
      serviceType: product.serviceType,
      provider: product.provider || 'BRI',
      nominal: product.nominal || product.buyPrice,
      adminFee: product.adminFee || (product.sellPrice - product.buyPrice),
    });
    setIsModalOpen(true);
  };

  const openPriceModal = (product: Product) => {
    setPriceAdjustProduct(product);
    setQuickSellPrice(product.sellPrice);
    setQuickBuyPrice(product.buyPrice);
    setIsPriceModalOpen(true);
  };

  const openAdjustModal = (product: Product) => {
    setAdjustingProduct(product);
    setAdjustQty(10);
    setAdjustType('IN');
    setAdjustReason('Kulakan Stok Baru / Pembelian');
    setIsAdjustModalOpen(true);
  };

  const handleSavePriceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceAdjustProduct) return;

    const updated: Product = {
      ...priceAdjustProduct,
      sellPrice: Number(quickSellPrice),
      buyPrice: Number(quickBuyPrice),
      updatedAt: new Date().toISOString(),
    };

    onSaveProduct(updated);
    sound.playSuccess();
    setIsPriceModalOpen(false);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Nama produk wajib diisi.');
      return;
    }

    const productToSave: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      barcode: formData.barcode.trim() || `899${Date.now().toString().slice(-9)}`,
      name: formData.name.trim(),
      category: formData.category,
      buyPrice: Number(formData.buyPrice),
      sellPrice: Number(formData.sellPrice),
      stock: Number(formData.stock),
      minStock: Number(formData.minStock),
      unit: formData.unit.trim() || 'pcs',
      imageUrl: formData.imageUrl || undefined,
      isActive: true,
      createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveProduct(productToSave);
    sound.playSuccess();
    setIsModalOpen(false);
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    const finalChange = adjustType === 'IN' ? Math.abs(adjustQty) : -Math.abs(adjustQty);
    onAdjustStock(adjustingProduct.id, finalChange, adjustReason);
    sound.playSuccess();
    setIsAdjustModalOpen(false);
  };

  // Checkbox Selection Helpers
  const isAllSelected = useMemo(() => {
    if (filteredProducts.length === 0) return false;
    return filteredProducts.every((p) => selectedProductIds.includes(p.id));
  }, [filteredProducts, selectedProductIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map((p) => p.id));
    }
  };

  const toggleSelectProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleBulkDelete = () => {
    if (selectedProductIds.length === 0) return;
    if (
      confirm(
        `Yakin ingin menghapus ${selectedProductIds.length} barang yang dicentang sekaligus? Data yang dihapus tidak dapat dikembalikan.`
      )
    ) {
      if (onBulkDeleteProducts) {
        onBulkDeleteProducts(selectedProductIds);
      } else {
        selectedProductIds.forEach((id) => onDeleteProduct(id));
      }
      setSelectedProductIds([]);
      sound.playSuccess();
    }
  };

  const handleBulkChangeCategory = () => {
    if (selectedProductIds.length === 0) return;
    selectedProductIds.forEach((id) => {
      const prod = products.find((p) => p.id === id);
      if (prod) {
        onSaveProduct({
          ...prod,
          category: bulkCategoryTarget,
          updatedAt: new Date().toISOString(),
        });
      }
    });
    setSelectedProductIds([]);
    setIsBulkCategoryModalOpen(false);
    sound.playSuccess();
  };

  return (
    <div id="inventory-management-container" className="max-w-7xl mx-auto space-y-5">
      {/* Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
            <Package className="w-6 h-6 text-amber-500" />
            <span>Stok Barang, Pulsa &amp; Produk</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Total {products.length} produk &amp; pulsa terdaftar • Total Nilai Modal: {formatRupiah(totalAssetValue)}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-export-stock-excel"
            type="button"
            onClick={() => exportStockToExcel(products, settings)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Ekspor Excel</span>
          </button>

          <button
            id="btn-export-stock-pdf"
            type="button"
            onClick={() => exportStockPDF(products, settings)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 border border-slate-300 dark:border-slate-800 flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <FileText className="w-4 h-4 text-rose-500" />
            <span>Ekspor PDF</span>
          </button>

          <button
            id="btn-open-stock-history"
            type="button"
            onClick={() => setIsHistoryModalOpen(true)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 border border-slate-300 dark:border-slate-800 flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <History className="w-4 h-4 text-blue-500" />
            <span>Riwayat Mutasi</span>
          </button>

          <button
            id="btn-add-product"
            type="button"
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl text-xs font-black bg-amber-500 text-zinc-950 hover:bg-amber-400 flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all tracking-wide cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Barang Baru</span>
          </button>
        </div>
      </div>

      {/* Bulk Action Bar (Shows when items are checked) */}
      {selectedProductIds.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-emerald-600 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm font-mono">
              {selectedProductIds.length}
            </div>
            <div>
              <div className="font-bold text-sm">
                {selectedProductIds.length} Barang Tercentang / Dipilih
              </div>
              <div className="text-[11px] text-emerald-100 font-medium">
                Pilih aksi massal yang ingin Anda terapkan pada barang yang dipilih
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setIsBulkCategoryModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Ubah Kategori Massal</span>
            </button>

            <button
              id="btn-bulk-delete-products"
              type="button"
              onClick={handleBulkDelete}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus {selectedProductIds.length} Barang Tercentang</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedProductIds([])}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900/40 hover:bg-slate-900/60 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Batal</span>
            </button>
          </div>
        </div>
      )}

      {/* Stock Alerts Notice */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-semibold">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <span>
              Peringatan: Terdapat <strong className="font-mono">{lowStockCount} barang</strong> stok menipis dan{' '}
              <strong className="font-mono">{outOfStockCount} barang</strong> habis.
            </span>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => setStockFilter('LOW')}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-700 dark:text-amber-200 font-bold text-[11px] transition-colors"
            >
              Lihat Menipis
            </button>
            <button
              onClick={() => setStockFilter('OUT')}
              className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-700 dark:text-rose-200 font-bold text-[11px] transition-colors"
            >
              Lihat Habis
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            id="input-inventory-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari barang kelontong, barcode, merek..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
              darkMode
                ? 'bg-slate-900/90 border-slate-800 text-slate-100 placeholder-slate-500'
                : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
            }`}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1">
          {/* Category Dropdown */}
          <select
            id="select-inventory-category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <option value="ALL">Semua Kategori</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Stock Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setStockFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                stockFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('LOW')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                stockFilter === 'LOW'
                  ? 'bg-amber-500 text-slate-950 shadow-2xs'
                  : 'text-slate-500 hover:text-amber-400'
              }`}
            >
              Menipis
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('OUT')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                stockFilter === 'OUT'
                  ? 'bg-rose-500 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-rose-400'
              }`}
            >
              Habis
            </button>
          </div>
        </div>
      </div>

      {/* Product Table */}
      <div
        id="inventory-table-card"
        className={`rounded-2xl border shadow-xl overflow-hidden ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider font-bold font-mono">
              <tr>
                <th className="px-3 py-3.5 text-center w-10">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    title={isAllSelected ? 'Batalkan Semua Pilihan' : 'Pilih / Centang Semua Barang'}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="px-3 py-3.5">No</th>
                <th className="px-4 py-3.5">Barcode</th>
                <th className="px-4 py-3.5 font-sans">Nama Produk</th>
                <th className="px-4 py-3.5 font-sans">Kategori</th>
                <th className="px-4 py-3.5 text-right">Harga Beli</th>
                <th className="px-4 py-3.5 text-right">Harga Jual</th>
                <th className="px-4 py-3.5 text-right">Margin Untung</th>
                <th className="px-4 py-3.5 text-center">Stok</th>
                <th className="px-4 py-3.5 text-center font-sans">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    {products.length === 0 ? (
                      <div className="max-w-md mx-auto space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mx-auto flex items-center justify-center text-xl">
                          🏧
                        </div>
                        <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                          Katalog Layanan &amp; Pulsa Bersih (0 Layanan)
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          Database telah dikosongkan agar tidak tercampur data lama. Anda dapat mulai menambahkan layanan Mini ATM / pulsa baru, atau muat katalog lengkap Mini ATM &amp; Konter Pulsa (Tarik tunai, transfer BRI/BCA/Mandiri/BNI, pulsa Telkomsel/Indosat/XL, token PLN, e-wallet DANA/GoPay/OVO).
                        </p>
                        <div className="flex items-center justify-center gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              sound.playBeep(550, 0.05);
                              setIsModalOpen(true);
                            }}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Tambah Layanan Pertama</span>
                          </button>
                          {onLoadSampleData && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Muat katalog lengkap layanan Mini ATM, Transfer Bank, Pulsa provider & E-Wallet?')) {
                                  onLoadSampleData();
                                }
                              }}
                              className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold text-xs rounded-xl transition-all cursor-pointer"
                            >
                              Muat Katalog Mini ATM &amp; Pulsa
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      'Tidak ada barang yang cocok dengan filter pencarian.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product, idx) => {
                  const margin = product.sellPrice - product.buyPrice;
                  const isLow = product.stock <= product.minStock && product.stock > 0;
                  const isOut = product.stock <= 0;
                  const isChecked = selectedProductIds.includes(product.id);

                  return (
                    <tr
                      key={product.id}
                      className={`transition-colors ${
                        isChecked
                          ? 'bg-emerald-500/10 dark:bg-emerald-500/15'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectProduct(product.id)}
                          title="Centang barang ini"
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">{product.barcode}</td>
                      <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100">
                        <div className="flex items-center gap-2.5">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0 shadow-2xs"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center shrink-0 text-slate-400 text-xs">
                              📦
                            </div>
                          )}
                          <span className="truncate max-w-[200px] sm:max-w-xs">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{product.category}</td>
                      <td className="px-4 py-3 text-right font-numeric text-slate-600 dark:text-slate-400">
                        {formatRupiah(product.buyPrice)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openPriceModal(product)}
                          title="Klik untuk ubah harga cepat"
                          className="font-numeric font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                        >
                          <span>{formatRupiah(product.sellPrice)}</span>
                          <span className="text-[10px] font-mono text-slate-400">/{product.unit}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right font-numeric text-blue-600 dark:text-blue-400">
                        +{formatRupiah(margin)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md font-mono font-bold text-[11px] border ${
                            isOut
                              ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                              : isLow
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          }`}
                        >
                          {product.stock.toLocaleString('id-ID')} {product.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            id={`btn-price-adjust-${product.id}`}
                            type="button"
                            onClick={() => openPriceModal(product)}
                            title="Penyesuaian Harga Cepat"
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                          >
                            <Coins className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`btn-adjust-stock-${product.id}`}
                            type="button"
                            onClick={() => openAdjustModal(product)}
                            title="Penyesuaian / Kulakan Stok"
                            className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`btn-edit-product-${product.id}`}
                            type="button"
                            onClick={() => openEditModal(product)}
                            title="Edit Data Produk"
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`btn-delete-product-${product.id}`}
                            type="button"
                            onClick={() => {
                              if (confirm(`Hapus barang "${product.name}" dari katalog?`)) {
                                onDeleteProduct(product.id);
                              }
                            }}
                            title="Hapus Produk"
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* QUICK PRICE ADJUSTMENT MODAL */}
      {isPriceModalOpen && priceAdjustProduct && (
        <div
          id="modal-quick-price-adjust"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div
            className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-emerald-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5" />
                <div>
                  <h3 className="font-black text-sm">Penyesuaian Harga: {priceAdjustProduct.name}</h3>
                  <p className="text-xs text-emerald-100 font-mono">
                    Satuan: {priceAdjustProduct.unit}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPriceModalOpen(false)}
                className="p-1 rounded-lg text-white hover:bg-emerald-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePriceSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 font-mono">
                  HARGA JUAL KONSUMEN (RP):
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={quickSellPrice || ''}
                  onChange={(e) => setQuickSellPrice(Math.max(0, parseInt(e.target.value) || 0))}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-lg font-black font-numeric focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800 text-emerald-400'
                      : 'bg-white border-slate-300 text-emerald-700'
                  }`}
                />

                {/* Quick adjustments +/- 500, 1000 */}
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {[-1000, -500, +500, +1000].map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setQuickSellPrice((prev) => Math.max(0, prev + diff))}
                      className="px-2 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      {diff > 0 ? `+${diff}` : diff}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 font-mono">
                  HARGA BELI / MODAL KULAKAN (RP):
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={quickBuyPrice || ''}
                  onChange={(e) => setQuickBuyPrice(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-base font-bold font-numeric bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 dark:text-slate-300"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs flex justify-between items-center">
                <span className="text-slate-500">Margin Laba / Satuan:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 font-numeric">
                  +{formatRupiah(quickSellPrice - quickBuyPrice)}
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPriceModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all active:scale-98"
                >
                  <Check className="w-4 h-4" />
                  <span>Terapkan Harga Baru</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div
          id="product-form-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
        >
          <div
            id="product-form-card"
            className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border my-8 ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
              <h3 className="font-extrabold text-base tracking-tight">
                {editingProduct ? 'Edit Data Barang' : 'Tambah Barang Kelontong Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 font-mono">Kode Barcode / SKU:</label>
                    <button
                      type="button"
                      onClick={() => setIsBarcodeScannerOpen(true)}
                      className="text-[11px] font-bold text-purple-600 dark:text-pink-400 hover:text-pink-500 flex items-center gap-1 cursor-pointer bg-purple-500/10 hover:bg-purple-500/20 px-2 py-0.5 rounded-lg border border-purple-500/20 transition-all active:scale-95"
                    >
                      <Scan className="w-3 h-3" />
                      <span>Scan Kemasan</span>
                    </button>
                  </div>
                  <input
                    id="input-form-barcode"
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Scan kemasan atau ketik 899..."
                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 font-mono">Kategori:</label>
                  <select
                    id="select-form-category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as ProductCategory })}
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {ALL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Nama Barang:</label>
                <input
                  id="input-form-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Beras Ramos Super 5kg / Indomie Goreng"
                  className="w-full px-3 py-2 rounded-xl border text-xs font-bold bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Photo Uploader (Camera & Gallery with automatic lightweight compression) */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                <ProductImageUploader
                  currentImageUrl={formData.imageUrl}
                  onImageChange={(newImg) => setFormData({ ...formData, imageUrl: newImg })}
                  productName={formData.name}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 font-mono">Harga Beli / Modal (Rp):</label>
                  <input
                    id="input-form-buyprice"
                    type="number"
                    value={formData.buyPrice || ''}
                    onChange={(e) => setFormData({ ...formData, buyPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-bold font-numeric bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 font-mono">Harga Jual (Rp):</label>
                  <input
                    id="input-form-sellprice"
                    type="number"
                    value={formData.sellPrice || ''}
                    onChange={(e) => setFormData({ ...formData, sellPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-bold font-numeric text-emerald-600 dark:text-emerald-400 bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 font-mono">Jumlah Stok:</label>
                  <input
                    id="input-form-stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 font-mono">Min. Peringatan:</label>
                  <input
                    id="input-form-minstock"
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 font-mono">Satuan Unit:</label>
                  <select
                    id="input-form-unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  >
                    <option value="pcs">pcs (Buah)</option>
                    <option value="bungkus">bungkus</option>
                    <option value="botol">botol</option>
                    <option value="kaleng">kaleng</option>
                    <option value="sachet">sachet</option>
                    <option value="renceng">renceng</option>
                    <option value="kotak">kotak</option>
                    <option value="pack">pack</option>
                    <option value="slop">slop</option>
                    <option value="dus">dus / karton</option>
                    <option value="kg">kg (Kilogram)</option>
                    <option value="karung">karung (Sak)</option>
                    <option value="tabung">tabung</option>
                    <option value="galon">galon</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 hover:bg-emerald-500 dark:hover:bg-emerald-400 tracking-wide"
                >
                  Simpan Barang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {isAdjustModalOpen && adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div
            className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex justify-between items-center">
              <h3 className="font-bold text-sm">Penyesuaian Stok: {adjustingProduct.name}</h3>
              <button onClick={() => setIsAdjustModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdjustSubmit} className="p-5 space-y-4">
              <div className="text-xs text-slate-500 font-mono">
                Stok Saat Ini: <strong className="text-slate-900 dark:text-white font-bold">{adjustingProduct.stock} {adjustingProduct.unit}</strong>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdjustType('IN');
                    setAdjustReason('Kulakan Stok Baru / Pembelian');
                  }}
                  className={`py-2 rounded-xl font-bold text-xs border ${
                    adjustType === 'IN'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'border-slate-300 dark:border-slate-800 text-slate-400'
                  }`}
                >
                  + Tambah Stok (Masuk)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdjustType('OUT');
                    setAdjustReason('Barang Rusak / Kadaluwarsa / Hilang');
                  }}
                  className={`py-2 rounded-xl font-bold text-xs border ${
                    adjustType === 'OUT'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'border-slate-300 dark:border-slate-800 text-slate-400'
                  }`}
                >
                  - Kurangi Stok (Keluar)
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 font-mono">Jumlah Perubahan ({adjustingProduct.unit}):</label>
                <input
                  type="number"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-xl border text-sm font-bold font-numeric bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Keterangan / Alasan:</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-800 text-slate-400 hover:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 hover:bg-emerald-500 dark:hover:bg-emerald-400"
                >
                  Konfirmasi Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Change Category Modal */}
      {isBulkCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div
            className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-sm">Ubah Kategori Massal ({selectedProductIds.length} Barang)</h3>
              </div>
              <button onClick={() => setIsBulkCategoryModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-500">
                Pilih kategori baru untuk {selectedProductIds.length} barang yang sedang Anda centang:
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase font-mono mb-1.5">
                  Kategori Tujuan
                </label>
                <select
                  value={bulkCategoryTarget}
                  onChange={(e) => setBulkCategoryTarget(e.target.value as ProductCategory)}
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  {ALL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleBulkChangeCategory}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 hover:bg-emerald-500 dark:hover:bg-emerald-400 cursor-pointer"
                >
                  Terapkan Perubahan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock Logs / Mutation History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div
            className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border max-h-[85vh] flex flex-col ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-500" />
                <h3 className="font-black text-sm tracking-tight">Riwayat Mutasi & Perubahan Stok</h3>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800/60">
              {stockLogs.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Belum ada catatan mutasi stok.
                </div>
              ) : (
                stockLogs.slice().reverse().map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold">{log.productName}</div>
                      <div className="text-slate-500 font-mono text-[11px]">
                        {log.reason} • {new Date(log.timestamp).toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-mono font-bold ${
                          log.quantityChange > 0 ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {log.quantityChange > 0 ? `+${log.quantityChange}` : log.quantityChange}
                      </span>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {log.previousStock} → {log.currentStock}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal for Packaging */}
      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        products={products}
        onScanSuccess={(scannedBarcode) => {
          setFormData((prev) => ({ ...prev, barcode: scannedBarcode }));
          sound.playSuccess();
          setIsBarcodeScannerOpen(false);
        }}
        mode="INPUT"
        darkMode={darkMode}
      />
    </div>
  );
};

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Product,
  Transaction,
  CustomerDebt,
  CashierUser,
  CashierShift,
  StoreSettings,
  StockLog,
  CartItem,
  HeldCart,
  StoreBranch,
  BalanceMutation,
} from './types';
import { db } from './services/db';
import { cloudSync } from './services/cloudSync';
import { sound } from './services/sound';
import { Sidebar, TabType } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { DashboardView } from './components/DashboardView';
import { LoginModal } from './components/LoginModal';
import { CashierView } from './components/CashierView';
import { BranchesView } from './components/BranchesView';
import { InventoryView } from './components/InventoryView';
import { ReportsView } from './components/ReportsView';
import { DebtsView } from './components/DebtsView';
import { SettingsModal } from './components/SettingsModal';
import { ShiftModal } from './components/ShiftModal';
import { ReceiptModal } from './components/ReceiptModal';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { GuideView } from './components/GuideView';
import { MobileBottomNav } from './components/MobileBottomNav';

export default function App() {
  // Database state
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<CustomerDebt[]>([]);
  const [users, setUsers] = useState<CashierUser[]>([]);
  const [activeShift, setActiveShift] = useState<CashierShift | null>(null);
  const [shiftHistory, setShiftHistory] = useState<CashierShift[]>([]);
  const [branches, setBranches] = useState<StoreBranch[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string>('branch-pusat');
  const [mutations, setMutations] = useState<BalanceMutation[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(db.load().settings);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'ONLINE' | 'OFFLINE' | 'SYNCED'>('SYNCED');

  // App UI State
  const [currentUser, setCurrentUser] = useState<CashierUser | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_dark_mode');
      if (saved !== null) {
        return saved === 'true';
      }
      return true; // Default to Option 2: Minimalist High Contrast (Dark)
    }
    return true;
  });

  // Modals state
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null);

  // Sync debounce ref to avoid excessive cloud writes
  const isSyncingFromCloudRef = useRef(false);

  // Load local database on mount
  const loadDatabase = useCallback(() => {
    // Check if URL specifies a store ID for this client (e.g. ?store=toko_berkah)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlStoreId = params.get('store') || params.get('toko');
      if (urlStoreId && urlStoreId.trim()) {
        const cleanStoreId = urlStoreId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        const currentData = db.load();
        if (currentData.settings.storeId !== cleanStoreId) {
          const updatedSettings = { ...currentData.settings, storeId: cleanStoreId };
          db.saveSettings(updatedSettings);
        }
      }
    }

    const data = db.load();
    setProducts(data.products || []);
    setTransactions(data.transactions || []);
    setDebts(data.debts || []);
    setUsers(data.users || []);
    setActiveShift(data.activeShift);
    setShiftHistory(data.shiftHistory || []);
    const loadedBranches = data.branches && data.branches.length > 0 ? data.branches : db.getBranches();
    setBranches(loadedBranches);
    setActiveBranchId(data.settings?.activeBranchId || loadedBranches[0]?.id || 'branch-pusat');
    setMutations(data.mutations || db.getMutations());
    setSettings(data.settings);
    setStockLogs(data.stockLogs || []);
    setHeldCarts(data.heldCarts || []);
    sound.enabled = data.settings?.playAudioFeedback ?? true;
  }, []);

  useEffect(() => {
    loadDatabase();
  }, [loadDatabase]);

  // Real-time Cloud Synchronization (Firebase Firestore)
  // Default is 100% OFFLINE STANDALONE - Cloud only runs if explicitly activated
  useEffect(() => {
    if (!settings?.enableCloudSync) {
      setCloudSyncStatus('OFFLINE');
      return;
    }

    const currentStoreId = settings?.storeId || db.load().settings?.storeId || 'toko_kelontong_main';

    // 1. Initial Cloud Pull & Sync
    cloudSync
      .pullFullStoreFromCloud(currentStoreId)
      .then((cloudData) => {
        if (cloudData && (cloudData.products || cloudData.transactions)) {
          isSyncingFromCloudRef.current = true;
          if (cloudData.products && cloudData.products.length > 0) {
            setProducts(cloudData.products);
          }
          if (cloudData.transactions && cloudData.transactions.length > 0) {
            setTransactions(cloudData.transactions);
          }
          if (cloudData.debts && cloudData.debts.length > 0) {
            setDebts(cloudData.debts);
          }
          if (cloudData.settings) {
            setSettings(cloudData.settings);
          }
          setCloudSyncStatus('SYNCED');
          setTimeout(() => {
            isSyncingFromCloudRef.current = false;
          }, 500);
        } else {
          // First time cloud initialization: push initial local seed
          const current = db.load();
          cloudSync.pushFullStoreToCloud(current).then((success) => {
            setCloudSyncStatus(success ? 'SYNCED' : 'OFFLINE');
          });
        }
      })
      .catch((err) => {
        console.debug('Initial cloud sync deferred (running in local offline mode):', err);
        setCloudSyncStatus('OFFLINE');
      });

    // 2. Real-time Live Listener for Multi-Device Multi-Cashier Sync
    const unsub = cloudSync.subscribeToRealtimeChanges(
      (newProducts) => {
        isSyncingFromCloudRef.current = true;
        setProducts(newProducts);
        const current = db.load();
        db.save({ ...current, products: newProducts });
        setTimeout(() => {
          isSyncingFromCloudRef.current = false;
        }, 300);
      },
      (newTransactions) => {
        isSyncingFromCloudRef.current = true;
        setTransactions(newTransactions);
        const current = db.load();
        db.save({ ...current, transactions: newTransactions });
        setTimeout(() => {
          isSyncingFromCloudRef.current = false;
        }, 300);
      },
      (newDebts) => {
        isSyncingFromCloudRef.current = true;
        setDebts(newDebts);
        const current = db.load();
        db.save({ ...current, debts: newDebts });
        setTimeout(() => {
          isSyncingFromCloudRef.current = false;
        }, 300);
      },
      (newSettings) => {
        isSyncingFromCloudRef.current = true;
        setSettings(newSettings);
        const current = db.load();
        db.save({ ...current, settings: newSettings });
        setTimeout(() => {
          isSyncingFromCloudRef.current = false;
        }, 300);
      },
      currentStoreId
    );

    return () => unsub();
  }, [settings?.storeId]);

  // Sync dark mode class with DOM
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('pos_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('pos_dark_mode', 'false');
    }
  }, [darkMode]);

  // Helper to persist all state to local encrypted database AND Cloud Firestore
  const persistDatabase = (updated: {
    products?: Product[];
    transactions?: Transaction[];
    debts?: CustomerDebt[];
    users?: CashierUser[];
    activeShift?: CashierShift | null;
    shiftHistory?: CashierShift[];
    branches?: StoreBranch[];
    mutations?: BalanceMutation[];
    settings?: StoreSettings;
    stockLogs?: StockLog[];
    heldCarts?: HeldCart[];
  }) => {
    const current = db.load();
    const nextSchema = {
      ...current,
      ...updated,
    };
    db.save(nextSchema);

    // Sync changes to Cloud Firestore
    if (!isSyncingFromCloudRef.current) {
      cloudSync.pushFullStoreToCloud(nextSchema).then((success) => {
        setCloudSyncStatus(success ? 'SYNCED' : 'OFFLINE');
      });
    }
  };

  // Branch management handlers
  const handleSetActiveBranch = (branchId: string) => {
    if (currentUser && currentUser.role === 'KASIR' && currentUser.branchId && branchId !== currentUser.branchId) {
      sound.playError();
      return;
    }
    setActiveBranchId(branchId);
    db.setActiveBranchId(branchId);
    const updatedSettings = { ...settings, activeBranchId: branchId };
    setSettings(updatedSettings);
    db.saveSettings(updatedSettings);
    sound.playBeep(700, 0.03);
  };

  const handleSaveBranch = (branch: StoreBranch) => {
    const currentBranches = branches.length > 0 ? [...branches] : db.getBranches();
    const idx = currentBranches.findIndex((b) => b.id === branch.id);
    let updated: StoreBranch[];
    if (idx !== -1) {
      updated = [...currentBranches];
      updated[idx] = branch;
    } else {
      updated = [...currentBranches, branch];
    }
    setBranches(updated);
    db.saveBranches(updated);
    persistDatabase({ branches: updated });
  };

  const handleDeleteBranch = (branchId: string) => {
    const updated = branches.filter((b) => b.id !== branchId);
    setBranches(updated);
    db.saveBranches(updated);
    if (activeBranchId === branchId) {
      const nextActive = updated[0]?.id || 'branch-pusat';
      setActiveBranchId(nextActive);
      db.setActiveBranchId(nextActive);
    }
    persistDatabase({ branches: updated });
  };

  const handleRecordMutation = (
    branchId: string,
    changes: { cashChange?: number; bankChange?: number; digiposChange?: number },
    meta: {
      category: 'TRANSAKSI' | 'TARIK_BANK' | 'SETOR_BANK' | 'TOPUP_SERVER' | 'MODAL_AWAL' | 'PENGELUARAN' | 'LAINNYA';
      description: string;
      cashierName: string;
      referenceId?: string;
    }
  ) => {
    db.adjustBranchBalances(branchId, changes, meta);
    const updatedBranches = db.getBranches();
    const updatedMutations = db.getMutations();
    setBranches(updatedBranches);
    setMutations(updatedMutations);
    persistDatabase({ branches: updatedBranches, mutations: updatedMutations });
  };

  const handleSetBranchRealBalances = (
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
  ) => {
    db.setBranchRealBalances(branchId, newBalances, meta);
    const updatedBranches = db.getBranches();
    const updatedMutations = db.getMutations();
    setBranches(updatedBranches);
    setMutations(updatedMutations);
    persistDatabase({ branches: updatedBranches, mutations: updatedMutations });
  };

  // Transaction completed event (stock deduction + receipt trigger)
  const handleTransactionCompleted = (newTrx: Transaction) => {
    // 1. Deduct Product Stock & Log
    const newLogs: StockLog[] = [];
    const updatedProducts = products.map((prod) => {
      const soldItem = newTrx.items.find((i) => i.productId === prod.id);
      if (soldItem) {
        const nextStock = Math.max(0, prod.stock - soldItem.quantity);
        newLogs.push({
          id: `log-${Date.now()}-${prod.id}`,
          productId: prod.id,
          productName: prod.name,
          type: 'SALE',
          quantityChange: -soldItem.quantity,
          previousStock: prod.stock,
          currentStock: nextStock,
          reason: `Penjualan Kasir #${newTrx.invoiceNumber}`,
          timestamp: new Date().toISOString(),
          cashierName: newTrx.cashierName,
        });
        return {
          ...prod,
          stock: nextStock,
          updatedAt: new Date().toISOString(),
        };
      }
      return prod;
    });

    // 2. Handle Debt if Kasbon
    let updatedDebts = [...debts];
    if (newTrx.paymentMethod === 'KASBON' && newTrx.customerName) {
      const existingDebtIdx = updatedDebts.findIndex(
        (d) => d.customerName.toLowerCase() === newTrx.customerName?.toLowerCase()
      );
      if (existingDebtIdx > -1) {
        const d = updatedDebts[existingDebtIdx];
        updatedDebts[existingDebtIdx] = {
          ...d,
          totalDebt: d.totalDebt + newTrx.grandTotal,
          phone: newTrx.customerPhone || d.phone,
          transactions: [
            ...d.transactions,
            {
              transactionId: newTrx.id,
              invoiceNumber: newTrx.invoiceNumber,
              date: newTrx.date,
              amount: newTrx.grandTotal,
              description: `Belanja Kasir #${newTrx.invoiceNumber} (${newTrx.totalQuantity} items)`,
            },
          ],
        };
      } else {
        updatedDebts.push({
          id: `debt-${Date.now()}`,
          customerName: newTrx.customerName,
          phone: newTrx.customerPhone,
          totalDebt: newTrx.grandTotal,
          createdAt: newTrx.date,
          transactions: [
            {
              transactionId: newTrx.id,
              invoiceNumber: newTrx.invoiceNumber,
              date: newTrx.date,
              amount: newTrx.grandTotal,
              description: `Belanja Kasir #${newTrx.invoiceNumber}`,
            },
          ],
          payments: [],
        });
      }
    }

    const updatedTransactions = [newTrx, ...transactions];
    const updatedStockLogs = [...stockLogs, ...newLogs];

    setProducts(updatedProducts);
    setTransactions(updatedTransactions);
    setDebts(updatedDebts);
    setStockLogs(updatedStockLogs);

    persistDatabase({
      products: updatedProducts,
      transactions: updatedTransactions,
      debts: updatedDebts,
      stockLogs: updatedStockLogs,
    });

    // Automatically show receipt modal
    setSelectedReceipt(newTrx);
  };

  // Transaction cancelled event (restore stock)
  const handleCancelTransaction = (trxId: string) => {
    const target = transactions.find((t) => t.id === trxId);
    if (!target || target.status === 'CANCELLED') return;

    // Restore stock
    const newLogs: StockLog[] = [];
    const updatedProducts = products.map((prod) => {
      const soldItem = target.items.find((i) => i.productId === prod.id);
      if (soldItem) {
        const nextStock = prod.stock + soldItem.quantity;
        newLogs.push({
          id: `log-restore-${Date.now()}-${prod.id}`,
          productId: prod.id,
          productName: prod.name,
          type: 'ADJUSTMENT',
          quantityChange: soldItem.quantity,
          previousStock: prod.stock,
          currentStock: nextStock,
          reason: `Pembatalan Transaksi #${target.invoiceNumber}`,
          timestamp: new Date().toISOString(),
          cashierName: currentUser?.name || 'Kasir',
        });
        return {
          ...prod,
          stock: nextStock,
          updatedAt: new Date().toISOString(),
        };
      }
      return prod;
    });

    const updatedTransactions = transactions.map((t) =>
      t.id === trxId ? { ...t, status: 'CANCELLED' as const } : t
    );
    const updatedStockLogs = [...stockLogs, ...newLogs];

    setProducts(updatedProducts);
    setTransactions(updatedTransactions);
    setStockLogs(updatedStockLogs);

    persistDatabase({
      products: updatedProducts,
      transactions: updatedTransactions,
      stockLogs: updatedStockLogs,
    });

    sound.playSuccess();
    alert(`Transaksi #${target.invoiceNumber} berhasil dibatalkan dan stok dikembalikan.`);
  };

  // Inventory Save Product
  const handleSaveProduct = (product: Product) => {
    let updatedProducts: Product[];
    const exists = products.some((p) => p.id === product.id);
    if (exists) {
      updatedProducts = products.map((p) => (p.id === product.id ? product : p));
    } else {
      updatedProducts = [product, ...products];
    }
    setProducts(updatedProducts);
    persistDatabase({ products: updatedProducts });
  };

  // Inventory Delete Product (single)
  const handleDeleteProduct = (productId: string) => {
    const updatedProducts = products.filter((p) => p.id !== productId);
    setProducts(updatedProducts);
    persistDatabase({ products: updatedProducts });
  };

  // Inventory Bulk Delete Products
  const handleBulkDeleteProducts = (productIds: string[]) => {
    const idSet = new Set(productIds);
    const updatedProducts = products.filter((p) => !idSet.has(p.id));
    setProducts(updatedProducts);
    persistDatabase({ products: updatedProducts });
    sound.playSuccess();
  };

  // Inventory Adjust Stock
  const handleAdjustStock = (productId: string, quantityChange: number, reason: string) => {
    let newLog: StockLog | null = null;
    const updatedProducts = products.map((prod) => {
      if (prod.id === productId) {
        const nextStock = Math.max(0, prod.stock + quantityChange);
        newLog = {
          id: `log-adj-${Date.now()}`,
          productId: prod.id,
          productName: prod.name,
          type: quantityChange > 0 ? 'IN' : 'OUT',
          quantityChange,
          previousStock: prod.stock,
          currentStock: nextStock,
          reason,
          timestamp: new Date().toISOString(),
          cashierName: currentUser?.name || 'Kasir',
        };
        return {
          ...prod,
          stock: nextStock,
          updatedAt: new Date().toISOString(),
        };
      }
      return prod;
    });

    const updatedLogs = newLog ? [...stockLogs, newLog] : stockLogs;
    setProducts(updatedProducts);
    setStockLogs(updatedLogs);
    persistDatabase({
      products: updatedProducts,
      stockLogs: updatedLogs,
    });
  };

  // Save Debt
  const handleSaveDebt = (newDebt: CustomerDebt) => {
    const updated = [newDebt, ...debts];
    setDebts(updated);
    persistDatabase({ debts: updated });
  };

  // Record Debt Payment
  const handleRecordDebtPayment = (debtId: string, amount: number, notes?: string) => {
    const updated = debts.map((d) => {
      if (d.id === debtId) {
        const remaining = Math.max(0, d.totalDebt - amount);
        return {
          ...d,
          totalDebt: remaining,
          payments: [
            ...d.payments,
            {
              id: `pay-${Date.now()}`,
              date: new Date().toISOString(),
              amount,
              cashierName: currentUser?.name || 'Kasir',
              notes,
            },
          ],
        };
      }
      return d;
    });
    setDebts(updated);
    persistDatabase({ debts: updated });
  };

  // Shift Management: Open Shift
  const handleOpenShift = (startingCash: number) => {
    const newShift: CashierShift = {
      id: `shift-${Date.now()}`,
      cashierId: currentUser?.id || 'cashier-1',
      cashierName: currentUser?.name || 'Kasir',
      startTime: new Date().toISOString(),
      startingCash,
      expectedCash: startingCash,
      totalTransactions: 0,
      totalSales: 0,
      totalCashSales: 0,
      totalNonCashSales: 0,
      status: 'OPEN',
    };
    setActiveShift(newShift);
    persistDatabase({ activeShift: newShift });
  };

  // Shift Management: Close Shift
  const handleCloseShift = (actualCash: number, shiftNotes?: string) => {
    if (!activeShift) return;
    const shiftStartTime = new Date(activeShift.startTime).getTime();
    const shiftTrxs = transactions.filter(
      (t) => new Date(t.date).getTime() >= shiftStartTime && t.status === 'COMPLETED'
    );
    const totalSales = shiftTrxs.reduce((sum, t) => sum + t.grandTotal, 0);
    const cashSales = shiftTrxs
      .filter((t) => t.paymentMethod === 'TUNAI')
      .reduce((sum, t) => sum + t.grandTotal, 0);
    const nonCashSales = totalSales - cashSales;
    const expectedCash = activeShift.startingCash + cashSales;
    const cashDifference = actualCash - expectedCash;

    const closedShift: CashierShift = {
      ...activeShift,
      endTime: new Date().toISOString(),
      expectedCash,
      actualCash,
      cashDifference,
      totalTransactions: shiftTrxs.length,
      totalSales,
      totalCashSales: cashSales,
      totalNonCashSales: nonCashSales,
      status: 'CLOSED',
      notes: shiftNotes,
    };

    const updatedHistory = [closedShift, ...shiftHistory];
    setActiveShift(null);
    setShiftHistory(updatedHistory);
    persistDatabase({
      activeShift: null,
      shiftHistory: updatedHistory,
    });
  };

  // Save Settings
  const handleSaveSettings = (newSettings: StoreSettings) => {
    setSettings(newSettings);
    persistDatabase({ settings: newSettings });
  };

  // Save Users
  const handleSaveUsers = (newUsers: CashierUser[]) => {
    setUsers(newUsers);
    persistDatabase({ users: newUsers });
  };

  const handleAddUser = (name: string, pin: string, role: 'OWNER' | 'KASIR', branchId?: string) => {
    const newUser: CashierUser = {
      id: `user-${Date.now()}`,
      name,
      username: name.toLowerCase().replace(/\s+/g, ''),
      pin,
      role,
      branchId: branchId || (role === 'OWNER' ? 'branch-pusat' : 'branch-cabang-2'),
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    const currentUsers = users.length > 0 ? users : db.load().users;
    const updatedUsers = [...currentUsers, newUser];
    setUsers(updatedUsers);
    persistDatabase({ users: updatedUsers });
    sound.playSuccess();
  };

  // Update Owner Profile (Name & PIN)
  const handleUpdateOwner = (newName: string, newPin?: string) => {
    // 1. Update currentUser
    if (currentUser) {
      const updatedCurrent: CashierUser = {
        ...currentUser,
        name: newName,
        ...(newPin ? { pin: newPin } : {}),
      };
      setCurrentUser(updatedCurrent);
    }

    // 2. Update users in DB
    const currentUsers = users.length > 0 ? users : db.load().users;
    const updatedUsers = currentUsers.map((u) => {
      if (u.role === 'OWNER' || (currentUser && u.id === currentUser.id)) {
        return {
          ...u,
          name: newName,
          ...(newPin ? { pin: newPin } : {}),
        };
      }
      return u;
    });
    setUsers(updatedUsers);

    // 3. Update store settings ownerName
    const updatedSettings: StoreSettings = {
      ...settings,
      ownerName: newName,
    };
    setSettings(updatedSettings);

    // 4. Persist to local vault & cloud
    persistDatabase({
      users: updatedUsers,
      settings: updatedSettings,
    });

    sound.playSuccess();
  };

  // Full Database Wipe / Reset (To ensure no old data remains or gets mixed)
  const handleWipeDatabase = async (options?: { wipeCloud?: boolean; resetSettings?: boolean }) => {
    if (options?.wipeCloud && settings?.enableCloudSync) {
      await cloudSync.wipeCloudStore(settings?.storeId);
    }
    const fresh = db.wipeAllData(options);
    setProducts([]);
    setTransactions([]);
    setDebts([]);
    setActiveShift(null);
    setShiftHistory([]);
    setStockLogs([]);
    setHeldCarts([]);
    setCart([]);
    setBranches(fresh.branches || []);
    setActiveBranchId(fresh.settings?.activeBranchId || 'branch-pusat');
    setMutations([]);
    if (options?.resetSettings) {
      setSettings(fresh.settings);
    }
    sound.playSuccess();
  };

  // Load sample Mini ATM and pulsa items if requested by user
  const handleLoadSampleData = () => {
    const updated = db.loadSampleMiniAtmProducts();
    setProducts(updated.products);
    sound.playSuccess();
  };

  const activeBranch = useMemo(() => {
    return branches.find((b) => b.id === activeBranchId) || branches[0] || db.getActiveBranch();
  }, [branches, activeBranchId]);

  const handleTabChange = (tab: TabType) => {
    sound.playBeep(650, 0.03);
    if (tab === 'settings') {
      if (currentUser?.role === 'KASIR') {
        sound.playError();
        alert('Akses Terbatas: Menu Pengaturan Toko & Database hanya dapat diakses oleh Pemilik Toko / Administrator.');
        return;
      }
      setIsSettingsModalOpen(true);
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div
      id="pos-app-root"
      className={`h-screen w-screen overflow-hidden flex flex-col md:flex-row font-sans transition-colors duration-200 ${
        darkMode ? 'bg-[#0B1120] text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* 1. Left Vertical Locked Sidebar (Tidak Bisa Discroll Ke Bawah) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        currentUser={currentUser}
        activeShift={activeShift}
        settings={settings}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onOpenShiftModal={() => setIsShiftModalOpen(true)}
        onLogout={() => setCurrentUser(null)}
        cartItemCount={cart.reduce((s, i) => s + i.quantity, 0)}
        cloudSyncStatus={cloudSyncStatus}
        isMobileDrawerOpen={isMobileDrawerOpen}
        setIsMobileDrawerOpen={setIsMobileDrawerOpen}
        onUpdateOwner={handleUpdateOwner}
        branches={branches}
        activeBranchId={activeBranchId}
      />

      {/* 2. Right Main Scrollable View Area */}
      <div className="flex-1 h-screen overflow-y-auto flex flex-col bg-slate-50 dark:bg-[#0B1120]">
        {/* Top Header Bar */}
        <TopHeader
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          settings={settings}
          activeShift={activeShift}
          onOpenShiftModal={() => setIsShiftModalOpen(true)}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          cloudSyncStatus={cloudSyncStatus}
          onToggleMobileSidebar={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
          branches={branches}
          activeBranchId={activeBranchId}
          onSelectBranch={handleSetActiveBranch}
          currentUser={currentUser}
        />

        {/* Main Tab Screens */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 pb-20">
          {activeTab === 'dashboard' && (
            <DashboardView
              products={products}
              transactions={transactions}
              debts={debts}
              activeShift={activeShift}
              settings={settings}
              branches={branches}
              activeBranchId={activeBranchId}
              onSetActiveBranch={handleSetActiveBranch}
              darkMode={darkMode}
              onNavigate={handleTabChange}
              onOpenShiftModal={() => setIsShiftModalOpen(true)}
              onViewReceipt={(trx) => setSelectedReceipt(trx)}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'cashier' && (
            <CashierView
              products={products}
              cart={cart}
              setCart={setCart}
              heldCarts={heldCarts}
              setHeldCarts={setHeldCarts}
              settings={settings}
              currentUser={currentUser}
              onTransactionCompleted={handleTransactionCompleted}
              onSaveProduct={handleSaveProduct}
              activeBranch={activeBranch}
              branches={branches}
              onSelectBranch={handleSetActiveBranch}
              onAdjustBranchBalances={handleRecordMutation}
              darkMode={darkMode}
            />
          )}

          {activeTab === 'branches' && (
            <BranchesView
              branches={branches}
              activeBranchId={activeBranchId}
              onSetActiveBranch={handleSetActiveBranch}
              onSaveBranch={handleSaveBranch}
              onDeleteBranch={handleDeleteBranch}
              mutations={mutations}
              onRecordMutation={handleRecordMutation}
              onSetRealBalances={handleSetBranchRealBalances}
              currentUser={currentUser}
              users={users}
              settings={settings}
              darkMode={darkMode}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              products={products}
              onSaveProduct={handleSaveProduct}
              onDeleteProduct={handleDeleteProduct}
              onBulkDeleteProducts={handleBulkDeleteProducts}
              onAdjustStock={handleAdjustStock}
              stockLogs={stockLogs}
              settings={settings}
              darkMode={darkMode}
              onLoadSampleData={handleLoadSampleData}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              transactions={transactions}
              onCancelTransaction={handleCancelTransaction}
              onViewReceipt={(trx) => setSelectedReceipt(trx)}
              settings={settings}
              branches={branches}
              darkMode={darkMode}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'debts' && (
            <DebtsView
              debts={debts}
              onSaveDebt={handleSaveDebt}
              onRecordPayment={handleRecordDebtPayment}
              settings={settings}
              currentUser={currentUser}
              darkMode={darkMode}
            />
          )}

          {activeTab === 'guide' && (
            <GuideView
              darkMode={darkMode}
              onNavigateTab={handleTabChange}
              onOpenSettings={() => setIsSettingsModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* 3. PIN Authentication Screen (if logged out / locked) */}
      {!currentUser && (
        <LoginModal
          users={users.length > 0 ? users : db.load().users}
          branches={branches}
          onAddUser={handleAddUser}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            // Cashier is strictly locked to their assigned branch
            if (user.role === 'KASIR' && user.branchId) {
              setActiveBranchId(user.branchId);
              db.setActiveBranchId(user.branchId);
            }
            // If no active shift, auto open shift modal on first login
            if (!activeShift) {
              setIsShiftModalOpen(true);
            }
          }}
          darkMode={darkMode}
        />
      )}

      {/* 4. Shift Opening / Closing Modal */}
      <ShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        activeShift={activeShift}
        onOpenShift={handleOpenShift}
        onCloseShift={handleCloseShift}
        transactions={transactions}
        currentUser={currentUser}
        settings={settings}
        darkMode={darkMode}
      />

      {/* 5. Settings & Database Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        users={users}
        onSaveUsers={handleSaveUsers}
        onRestoreCompleted={loadDatabase}
        onUpdateOwner={handleUpdateOwner}
        onWipeDatabase={handleWipeDatabase}
        onLoadSampleData={handleLoadSampleData}
        darkMode={darkMode}
      />

      {/* 6. Thermal Receipt Modal */}
      <ReceiptModal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        transaction={selectedReceipt}
        settings={settings}
        darkMode={darkMode}
        onNewTransaction={() => {
          setSelectedReceipt(null);
          setActiveTab('cashier');
        }}
      />

      {/* 8. Mobile Bottom Navigation (Ergonomic layout for smartphones & PWA) */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        cartItemCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        onOpenMobileMenu={() => setIsMobileDrawerOpen(true)}
        darkMode={darkMode}
      />

      {/* 8. PWA Quick Install Banner (Floating at bottom for mobile / desktop) */}
      <PWAInstallPrompt variant="banner" darkMode={darkMode} />
    </div>
  );
}

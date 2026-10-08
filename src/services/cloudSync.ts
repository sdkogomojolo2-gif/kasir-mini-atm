import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db as firestoreDb } from './firebase';
import {
  Product,
  Transaction,
  CustomerDebt,
  CashierUser,
  CashierShift,
  StoreSettings,
  StockLog,
  StoreBranch,
} from '../types';

export interface CloudSyncState {
  status: 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'ERROR';
  lastSyncedAt: string | null;
  syncedStoresCount: number;
}

const DEFAULT_STORE_ID = 'toko_kelontong_main';

export class CloudSyncService {
  private unsubscribeListeners: Array<() => void> = [];
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  // Get Store ID for multi-tenant isolation
  public getStoreId(settings?: StoreSettings): string {
    const custom = settings?.storeId;
    if (custom && custom.trim()) {
      return custom.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    }
    return DEFAULT_STORE_ID;
  }

  // Push Full Store State to Cloud Firestore
  public async pushFullStoreToCloud(data: {
    products: Product[];
    transactions: Transaction[];
    debts: CustomerDebt[];
    users: CashierUser[];
    settings: StoreSettings;
    stockLogs: StockLog[];
    shiftHistory: CashierShift[];
    activeShift: CashierShift | null;
    branches?: StoreBranch[];
  }): Promise<boolean> {
    try {
      const storeId = this.getStoreId(data.settings);
      const storeRef = doc(firestoreDb, 'stores', storeId);
      await setDoc(
        storeRef,
        {
          settings: data.settings,
          activeShift: data.activeShift || null,
          users: data.users,
          branches: data.branches || data.settings?.branches || [],
          updatedAt: serverTimestamp(),
          updatedAtISO: new Date().toISOString(),
        },
        { merge: true }
      );

      // Batch write products for fast sync
      const batch = writeBatch(firestoreDb);
      data.products.forEach((prod) => {
        const pRef = doc(firestoreDb, `stores/${storeId}/products`, prod.id);
        batch.set(pRef, prod, { merge: true });
      });

      // Save latest transactions
      data.transactions.slice(-100).forEach((trx) => {
        const tRef = doc(firestoreDb, `stores/${storeId}/transactions`, trx.id);
        batch.set(tRef, trx, { merge: true });
      });

      // Save customer debts
      data.debts.forEach((debt) => {
        const dRef = doc(firestoreDb, `stores/${storeId}/debts`, debt.id);
        batch.set(dRef, debt, { merge: true });
      });

      await batch.commit();
      return true;
    } catch (err) {
      console.warn('Cloud sync error (fallback to local):', err);
      return false;
    }
  }

  // Real-time listener for multi-device sync
  public subscribeToRealtimeChanges(
    onProductsChange: (products: Product[]) => void,
    onTransactionsChange: (transactions: Transaction[]) => void,
    onDebtsChange: (debts: CustomerDebt[]) => void,
    onSettingsChange: (settings: StoreSettings) => void,
    customStoreId?: string
  ): () => void {
    // Clear old subscriptions
    this.unsubscribe();

    const storeId = customStoreId && customStoreId.trim()
      ? customStoreId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_')
      : DEFAULT_STORE_ID;

    try {
      // 1. Listen to Store Settings
      const storeRef = doc(firestoreDb, 'stores', storeId);
      const unsubStore = onSnapshot(
        storeRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.settings) onSettingsChange(data.settings);
          }
        },
        (err) => {
          console.debug('Store snapshot offline fallback (operating locally):', err?.message);
        }
      );
      this.unsubscribeListeners.push(unsubStore);

      // 2. Listen to Products Collection (Stock & Price changes in real-time)
      const productsCol = collection(firestoreDb, `stores/${storeId}/products`);
      const unsubProducts = onSnapshot(
        productsCol,
        (snap) => {
          if (!snap.empty) {
            const prods: Product[] = [];
            snap.forEach((docSnap) => {
              prods.push(docSnap.data() as Product);
            });
            if (prods.length > 0) {
              onProductsChange(prods);
            }
          }
        },
        (err) => {
          console.debug('Products snapshot offline fallback (operating locally):', err?.message);
        }
      );
      this.unsubscribeListeners.push(unsubProducts);

      // 3. Listen to Transactions Collection
      const trxCol = collection(firestoreDb, `stores/${storeId}/transactions`);
      const unsubTrx = onSnapshot(
        trxCol,
        (snap) => {
          if (!snap.empty) {
            const trxs: Transaction[] = [];
            snap.forEach((docSnap) => {
              trxs.push(docSnap.data() as Transaction);
            });
            if (trxs.length > 0) {
              // Sort by date descending
              trxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              onTransactionsChange(trxs);
            }
          }
        },
        (err) => {
          console.debug('Transactions snapshot offline fallback (operating locally):', err?.message);
        }
      );
      this.unsubscribeListeners.push(unsubTrx);

      // 4. Listen to Debts Collection
      const debtsCol = collection(firestoreDb, `stores/${storeId}/debts`);
      const unsubDebts = onSnapshot(
        debtsCol,
        (snap) => {
          if (!snap.empty) {
            const debtsList: CustomerDebt[] = [];
            snap.forEach((docSnap) => {
              debtsList.push(docSnap.data() as CustomerDebt);
            });
            if (debtsList.length > 0) {
              onDebtsChange(debtsList);
            }
          }
        },
        (err) => {
          console.debug('Debts snapshot offline fallback (operating locally):', err?.message);
        }
      );
      this.unsubscribeListeners.push(unsubDebts);
    } catch (e) {
      console.warn('Realtime subscription error:', e);
    }

    return () => this.unsubscribe();
  }

  // Pull initial cloud data
  public async pullFullStoreFromCloud(customStoreId?: string): Promise<{
    products?: Product[];
    transactions?: Transaction[];
    debts?: CustomerDebt[];
    settings?: StoreSettings;
  } | null> {
    try {
      const storeId = customStoreId && customStoreId.trim()
        ? customStoreId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_')
        : DEFAULT_STORE_ID;

      const storeRef = doc(firestoreDb, 'stores', storeId);
      const storeSnap = await getDoc(storeRef);
      const settings = storeSnap.exists() ? storeSnap.data()?.settings : undefined;

      const productsCol = collection(firestoreDb, `stores/${storeId}/products`);
      const prodSnap = await getDocs(productsCol);
      const products: Product[] = [];
      prodSnap.forEach((d) => products.push(d.data() as Product));

      const trxCol = collection(firestoreDb, `stores/${storeId}/transactions`);
      const trxSnap = await getDocs(trxCol);
      const transactions: Transaction[] = [];
      trxSnap.forEach((d) => transactions.push(d.data() as Transaction));

      const debtsCol = collection(firestoreDb, `stores/${storeId}/debts`);
      const debtSnap = await getDocs(debtsCol);
      const debts: CustomerDebt[] = [];
      debtSnap.forEach((d) => debts.push(d.data() as CustomerDebt));

      return {
        products: products.length > 0 ? products : undefined,
        transactions: transactions.length > 0 ? transactions : undefined,
        debts: debts.length > 0 ? debts : undefined,
        settings,
      };
    } catch (err) {
      console.warn('Error pulling cloud data:', err);
      return null;
    }
  }

  // Wipe all store documents from Firestore Cloud
  public async wipeCloudStore(customStoreId?: string): Promise<boolean> {
    try {
      const storeId = customStoreId && customStoreId.trim()
        ? customStoreId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_')
        : DEFAULT_STORE_ID;

      // 1. Delete all products in cloud
      const productsCol = collection(firestoreDb, `stores/${storeId}/products`);
      const prodSnap = await getDocs(productsCol);
      if (!prodSnap.empty) {
        const batch1 = writeBatch(firestoreDb);
        prodSnap.forEach((d) => batch1.delete(d.ref));
        await batch1.commit();
      }

      // 2. Delete all transactions in cloud
      const trxCol = collection(firestoreDb, `stores/${storeId}/transactions`);
      const trxSnap = await getDocs(trxCol);
      if (!trxSnap.empty) {
        const batch2 = writeBatch(firestoreDb);
        trxSnap.forEach((d) => batch2.delete(d.ref));
        await batch2.commit();
      }

      // 3. Delete all debts in cloud
      const debtsCol = collection(firestoreDb, `stores/${storeId}/debts`);
      const debtSnap = await getDocs(debtsCol);
      if (!debtSnap.empty) {
        const batch3 = writeBatch(firestoreDb);
        debtSnap.forEach((d) => batch3.delete(d.ref));
        await batch3.commit();
      }

      // 4. Reset store document in cloud
      const storeRef = doc(firestoreDb, 'stores', storeId);
      await setDoc(
        storeRef,
        {
          activeShift: null,
          updatedAt: serverTimestamp(),
          updatedAtISO: new Date().toISOString(),
        },
        { merge: true }
      );

      return true;
    } catch (err) {
      console.warn('Error wiping cloud store:', err);
      return false;
    }
  }

  public unsubscribe() {
    this.unsubscribeListeners.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
    this.unsubscribeListeners = [];
  }
}

export const cloudSync = new CloudSyncService();

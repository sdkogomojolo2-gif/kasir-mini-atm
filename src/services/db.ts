import CryptoJS from 'crypto-js';
import {
  Product,
  Transaction,
  CustomerDebt,
  CashierUser,
  CashierShift,
  StoreSettings,
  StockLog,
  HeldCart,
  StoreBranch,
  BalanceMutation,
} from '../types';

const STORAGE_KEY = 'miniatm_konter_vault_v1';
const LEGACY_STORAGE_KEY_V2 = 'kelontong_pos_vault_v2';
const LEGACY_STORAGE_KEY_V1 = 'kelontong_pos_vault_v1';
const MASTER_KEY_STORAGE = 'miniatm_vault_secret_key';
const DEFAULT_KEY = 'MINIATM_KONTER_AES256_SECURE_VAULT_KEY_2026';

const IDB_NAME = 'kelontong_pos_idb';
const IDB_STORE = 'vault';
const IDB_KEY = 'primary_data';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveToIDB(dataStr: string): Promise<void> {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(dataStr, IDB_KEY);
  } catch (err) {
    console.warn('Could not save to IndexedDB mirror:', err);
  }
}

async function loadFromIDB(): Promise<string | null> {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export interface DatabaseSchema {
  version: number;
  products: Product[];
  transactions: Transaction[];
  debts: CustomerDebt[];
  users: CashierUser[];
  activeShift: CashierShift | null;
  shiftHistory: CashierShift[];
  branches: StoreBranch[];
  mutations: BalanceMutation[];
  settings: StoreSettings;
  stockLogs: StockLog[];
  heldCarts: HeldCart[];
  lastBackupDate?: string;
}

export const INITIAL_BRANCHES: StoreBranch[] = [
  {
    id: 'branch-pusat',
    code: 'PUSAT-01',
    name: 'Pusat - Konter & Mini ATM Utama',
    address: 'Jl. Raya Utama No. 88 (Ruko Depan Pasar)',
    phone: '0812-3456-7890',
    cashDrawerBalance: 5000000, // Rp 5.000.000 Kas Laci Fisik
    bankBalance: 15000000,      // Rp 15.000.000 Saldo Rekening Bank / EDC
    digiposBalance: 2000000,    // Rp 2.000.000 Saldo Server Pulsa / Digipos
    isMain: true,
    notes: 'Cabang Induk Mini ATM, BRILink & Konter Pulsa',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'branch-cabang-2',
    code: 'CABANG-02',
    name: 'Cabang 2 - Simpang Pasar',
    address: 'Jl. Pasar Baru No. 12B',
    phone: '0813-8899-7711',
    cashDrawerBalance: 3000000,
    bankBalance: 10000000,
    digiposBalance: 1500000,
    isMain: false,
    notes: 'Konter & Agen Mini ATM Mandiri Cabang Pasar',
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_USERS: CashierUser[] = [
  {
    id: 'user-owner-1',
    name: 'Pemilik / Agen Utama',
    username: 'agen',
    pin: '1234',
    role: 'OWNER',
    branchId: 'branch-pusat',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-kasir-1',
    name: 'Kasir Cabang Pasar',
    username: 'kasir1',
    pin: '2222',
    role: 'KASIR',
    branchId: 'branch-cabang-2',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_SETTINGS: StoreSettings = {
  storeId: 'agen_miniatm_pusat',
  activeBranchId: 'branch-pusat',
  storeName: 'Mini ATM & Konter Pulsa Berkah',
  ownerName: 'Pemilik / Agen Resmi',
  tagline: 'Tarik Tunai, Transfer Bank, Pulsa, E-Wallet & Bayar Tagihan',
  address: 'Jl. Raya Utama No. 88 (Ruko Depan Pasar)',
  phone: '0812-3456-7890',
  footerMessage: 'Simpan struk ini sebagai bukti transaksi sah. Terima kasih atas kepercayaan Anda!',
  taxPercentage: 0,
  enableTax: false,
  paperSize: '58mm',
  qrisMerchantName: 'MINI ATM & KONTER BERKAH',
  qrisNmid: 'ID1020038920192',
  qrisCity: 'JAKARTA',
  qrisMode: 'DYNAMIC_NMID',
  autoPrintReceipt: true,
  playAudioFeedback: true,
  encryptionEnabled: true,
  enableCloudSync: false,
  showSalesBrochure: false,
  agentCode: 'AGEN-7892',
  agentTerminalId: 'TID-88201',
  agentPartnerName: 'AGEN MINI ATM & KONTER CELL',
  defaultAdminFee: 5000,
  branches: INITIAL_BRANCHES,
};

export const SAMPLE_MINI_ATM_PRODUCTS: Product[] = [
  // 1. Layanan Mini ATM (Tarik Tunai, Setor Tunai, Transfer)
  {
    id: 'atm-tarik-100k',
    barcode: 'ATM100K',
    name: 'Tarik Tunai Rp 100.000',
    category: 'Layanan Mini ATM',
    serviceType: 'TARIK_TUNAI',
    nominal: 100000,
    adminFee: 5000,
    buyPrice: 100000,
    sellPrice: 105000,
    stock: 999,
    minStock: 10,
    unit: 'trx',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'atm-tarik-200k',
    barcode: 'ATM200K',
    name: 'Tarik Tunai Rp 200.000',
    category: 'Layanan Mini ATM',
    serviceType: 'TARIK_TUNAI',
    nominal: 200000,
    adminFee: 5000,
    buyPrice: 200000,
    sellPrice: 205000,
    stock: 999,
    minStock: 10,
    unit: 'trx',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'atm-tarik-500k',
    barcode: 'ATM500K',
    name: 'Tarik Tunai Rp 500.000',
    category: 'Layanan Mini ATM',
    serviceType: 'TARIK_TUNAI',
    nominal: 500000,
    adminFee: 7000,
    buyPrice: 500000,
    sellPrice: 507000,
    stock: 999,
    minStock: 10,
    unit: 'trx',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'atm-tarik-1jt',
    barcode: 'ATM1JT',
    name: 'Tarik Tunai Rp 1.000.000',
    category: 'Layanan Mini ATM',
    serviceType: 'TARIK_TUNAI',
    nominal: 1000000,
    adminFee: 10000,
    buyPrice: 1000000,
    sellPrice: 1010000,
    stock: 999,
    minStock: 10,
    unit: 'trx',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'atm-tarik-2jt',
    barcode: 'ATM2JT',
    name: 'Tarik Tunai Rp 2.000.000',
    category: 'Layanan Mini ATM',
    serviceType: 'TARIK_TUNAI',
    nominal: 2000000,
    adminFee: 15000,
    buyPrice: 2000000,
    sellPrice: 2015000,
    stock: 999,
    minStock: 10,
    unit: 'trx',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'atm-setor-tunai',
    barcode: 'ATMSETOR',
    name: 'Setor Tunai Rekening Bank (BRI/BCA/Mandiri)',
    category: 'Layanan Mini ATM',
    serviceType: 'SETOR_TUNAI',
    nominal: 0,
    adminFee: 5000,
    buyPrice: 0,
    sellPrice: 5000,
    stock: 999,
    minStock: 10,
    unit: 'trx',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'atm-transfer-bank',
    barcode: 'ATMTRF',
    name: 'Transfer Antar Bank (Semua Bank)',
    category: 'Layanan Mini ATM',
    serviceType: 'TRANSFER_BANK',
    nominal: 0,
    adminFee: 6500,
    buyPrice: 0,
    sellPrice: 6500,
    stock: 999,
    minStock: 10,
    unit: 'trx',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 2. Pulsa & Paket Data
  {
    id: 'pls-tsel-10k',
    barcode: 'TSEL10',
    name: 'Pulsa Telkomsel 10.000',
    category: 'Pulsa & Paket Data',
    serviceType: 'PULSA',
    provider: 'Telkomsel',
    nominal: 10000,
    adminFee: 2000,
    buyPrice: 10500,
    sellPrice: 12500,
    stock: 999,
    minStock: 10,
    unit: 'nomor',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pls-tsel-20k',
    barcode: 'TSEL20',
    name: 'Pulsa Telkomsel 20.000',
    category: 'Pulsa & Paket Data',
    serviceType: 'PULSA',
    provider: 'Telkomsel',
    nominal: 20000,
    adminFee: 2500,
    buyPrice: 20200,
    sellPrice: 22500,
    stock: 999,
    minStock: 10,
    unit: 'nomor',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pls-tsel-50k',
    barcode: 'TSEL50',
    name: 'Pulsa Telkomsel 50.000',
    category: 'Pulsa & Paket Data',
    serviceType: 'PULSA',
    provider: 'Telkomsel',
    nominal: 50000,
    adminFee: 2500,
    buyPrice: 49800,
    sellPrice: 52500,
    stock: 999,
    minStock: 10,
    unit: 'nomor',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pls-tsel-100k',
    barcode: 'TSEL100',
    name: 'Pulsa Telkomsel 100.000',
    category: 'Pulsa & Paket Data',
    serviceType: 'PULSA',
    provider: 'Telkomsel',
    nominal: 100000,
    adminFee: 3000,
    buyPrice: 98500,
    sellPrice: 102000,
    stock: 999,
    minStock: 10,
    unit: 'nomor',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pls-isat-10k',
    barcode: 'ISAT10',
    name: 'Pulsa Indosat Ooredoo 10.000',
    category: 'Pulsa & Paket Data',
    serviceType: 'PULSA',
    provider: 'Indosat',
    nominal: 10000,
    adminFee: 2000,
    buyPrice: 10400,
    sellPrice: 12500,
    stock: 999,
    minStock: 10,
    unit: 'nomor',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pls-isat-25k',
    barcode: 'ISAT25',
    name: 'Pulsa Indosat Ooredoo 25.000',
    category: 'Pulsa & Paket Data',
    serviceType: 'PULSA',
    provider: 'Indosat',
    nominal: 25000,
    adminFee: 2500,
    buyPrice: 25100,
    sellPrice: 27500,
    stock: 999,
    minStock: 10,
    unit: 'nomor',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pls-xl-10k',
    barcode: 'XL10',
    name: 'Pulsa XL Axiata 10.000',
    category: 'Pulsa & Paket Data',
    serviceType: 'PULSA',
    provider: 'XL',
    nominal: 10000,
    adminFee: 2000,
    buyPrice: 10300,
    sellPrice: 12500,
    stock: 999,
    minStock: 10,
    unit: 'nomor',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'data-tsel-10gb',
    barcode: 'DATATSEL10',
    name: 'Paket Data Telkomsel 10GB 30 Hari',
    category: 'Pulsa & Paket Data',
    serviceType: 'PAKET_DATA',
    provider: 'Telkomsel',
    nominal: 35000,
    adminFee: 3000,
    buyPrice: 35000,
    sellPrice: 38000,
    stock: 999,
    minStock: 10,
    unit: 'nomor',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'data-tsel-25gb',
    barcode: 'DATATSEL25',
    name: 'Paket Data Telkomsel 25GB Bulanan',
    category: 'Pulsa & Paket Data',
    serviceType: 'PAKET_DATA',
    provider: 'Telkomsel',
    nominal: 70000,
    adminFee: 5000,
    buyPrice: 70000,
    sellPrice: 75000,
    stock: 999,
    minStock: 10,
    unit: 'nomor',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 3. Top Up E-Wallet
  {
    id: 'ewallet-dana-50k',
    barcode: 'DANA50',
    name: 'Top Up Saldo DANA 50.000',
    category: 'Top Up E-Wallet',
    serviceType: 'TOPUP_EWALLET',
    provider: 'DANA',
    nominal: 50000,
    adminFee: 2500,
    buyPrice: 50500,
    sellPrice: 53000,
    stock: 999,
    minStock: 10,
    unit: 'nomor',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ewallet-dana-100k',
    barcode: 'DANA100',
    name: 'Top Up Saldo DANA 100.000',
    category: 'Top Up E-Wallet',
    serviceType: 'TOPUP_EWALLET',
    provider: 'DANA',
    nominal: 100000,
    adminFee: 3000,
    buyPrice: 100500,
    sellPrice: 103500,
    stock: 999,
    minStock: 10,
    unit: 'nomor',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ewallet-dana-200k',
    barcode: 'DANA200',
    name: 'Top Up Saldo DANA 200.000',
    category: 'Top Up E-Wallet',
    serviceType: 'TOPUP_EWALLET',
    provider: 'DANA',
    nominal: 200000,
    adminFee: 3500,
    buyPrice: 200500,
    sellPrice: 204000,
    stock: 999,
    minStock: 10,
    unit: 'nomor',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ewallet-shopee-50k',
    barcode: 'SHOPEE50',
    name: 'Top Up ShopeePay 50.000',
    category: 'Top Up E-Wallet',
    serviceType: 'TOPUP_EWALLET',
    provider: 'ShopeePay',
    nominal: 50000,
    adminFee: 2500,
    buyPrice: 50500,
    sellPrice: 53000,
    stock: 999,
    minStock: 10,
    unit: 'nomor',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ewallet-gopay-50k',
    barcode: 'GOPAY50',
    name: 'Top Up GoPay Customer 50.000',
    category: 'Top Up E-Wallet',
    serviceType: 'TOPUP_EWALLET',
    provider: 'GoPay',
    nominal: 50000,
    adminFee: 2500,
    buyPrice: 50500,
    sellPrice: 53000,
    stock: 999,
    minStock: 10,
    unit: 'nomor',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ewallet-ovo-50k',
    barcode: 'OVO50',
    name: 'Top Up OVO 50.000',
    category: 'Top Up E-Wallet',
    serviceType: 'TOPUP_EWALLET',
    provider: 'OVO',
    nominal: 50000,
    adminFee: 2500,
    buyPrice: 50500,
    sellPrice: 53000,
    stock: 999,
    minStock: 10,
    unit: 'nomor',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 4. Token & Listrik PLN
  {
    id: 'pln-token-20k',
    barcode: 'PLN20',
    name: 'Token Listrik PLN 20.000',
    category: 'Token & Listrik PLN',
    serviceType: 'TOKEN_PLN',
    provider: 'PLN',
    nominal: 20000,
    adminFee: 3000,
    buyPrice: 20500,
    sellPrice: 23500,
    stock: 999,
    minStock: 10,
    unit: 'kwh',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pln-token-50k',
    barcode: 'PLN50',
    name: 'Token Listrik PLN 50.000',
    category: 'Token & Listrik PLN',
    serviceType: 'TOKEN_PLN',
    provider: 'PLN',
    nominal: 50000,
    adminFee: 3000,
    buyPrice: 50500,
    sellPrice: 53500,
    stock: 999,
    minStock: 10,
    unit: 'kwh',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pln-token-100k',
    barcode: 'PLN100',
    name: 'Token Listrik PLN 100.000',
    category: 'Token & Listrik PLN',
    serviceType: 'TOKEN_PLN',
    provider: 'PLN',
    nominal: 100000,
    adminFee: 3000,
    buyPrice: 100500,
    sellPrice: 103500,
    stock: 999,
    minStock: 10,
    unit: 'kwh',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pln-tagihan-pasca',
    barcode: 'PLNPASCA',
    name: 'Bayar Tagihan Listrik PLN Pasca',
    category: 'Token & Listrik PLN',
    serviceType: 'TAGIHAN_PPOB',
    provider: 'PLN',
    nominal: 0,
    adminFee: 3500,
    buyPrice: 0,
    sellPrice: 3500,
    stock: 999,
    minStock: 10,
    unit: 'trx',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 5. Tagihan PPOB & BPJS
  {
    id: 'ppob-bpjs-kes',
    barcode: 'BPJSKES',
    name: 'Bayar Iuran BPJS Kesehatan',
    category: 'Tagihan PPOB & BPJS',
    serviceType: 'TAGIHAN_PPOB',
    provider: 'BPJS',
    nominal: 0,
    adminFee: 3000,
    buyPrice: 0,
    sellPrice: 3000,
    stock: 999,
    minStock: 10,
    unit: 'trx',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ppob-pdam-air',
    barcode: 'PDAMAIR',
    name: 'Bayar Tagihan PDAM Air Bersih',
    category: 'Tagihan PPOB & BPJS',
    serviceType: 'TAGIHAN_PPOB',
    provider: 'PDAM',
    nominal: 0,
    adminFee: 3000,
    buyPrice: 0,
    sellPrice: 3000,
    stock: 999,
    minStock: 10,
    unit: 'trx',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ppob-wifi-indihome',
    barcode: 'INDIHOME',
    name: 'Bayar Tagihan Wifi / Indihome',
    category: 'Tagihan PPOB & BPJS',
    serviceType: 'TAGIHAN_PPOB',
    provider: 'Telkom',
    nominal: 0,
    adminFee: 3500,
    buyPrice: 0,
    sellPrice: 3500,
    stock: 999,
    minStock: 10,
    unit: 'trx',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 6. Kartu Perdana & Voucher Fisik
  {
    id: 'fisik-perdana-tsel-10gb',
    barcode: '8999901001',
    name: 'Kartu Perdana Telkomsel Kuota 10GB Segel',
    category: 'Kartu Perdana & Voucher',
    serviceType: 'PRODUK_FISIK',
    provider: 'Telkomsel',
    buyPrice: 28000,
    sellPrice: 35000,
    stock: 25,
    minStock: 5,
    unit: 'pcs',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'fisik-voucher-isat-5gb',
    barcode: '8999901002',
    name: 'Voucher Fisik Indosat Freedom 5GB 7 Hari',
    category: 'Kartu Perdana & Voucher',
    serviceType: 'PRODUK_FISIK',
    provider: 'Indosat',
    buyPrice: 16000,
    sellPrice: 20000,
    stock: 30,
    minStock: 5,
    unit: 'voucher',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 7. Aksesoris Handphone
  {
    id: 'acc-kabel-typec',
    barcode: '8999902001',
    name: 'Kabel Data Fast Charging Type-C 65W Braided',
    category: 'Aksesoris Handphone',
    serviceType: 'PRODUK_FISIK',
    buyPrice: 12000,
    sellPrice: 25000,
    stock: 20,
    minStock: 4,
    unit: 'pcs',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'acc-charger-20w',
    barcode: '8999902002',
    name: 'Kepala Charger Fast Charging 20W PD/QC',
    category: 'Aksesoris Handphone',
    serviceType: 'PRODUK_FISIK',
    buyPrice: 22000,
    sellPrice: 45000,
    stock: 15,
    minStock: 3,
    unit: 'pcs',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// AES-256 Vault Manager for local data persistence
class LocalEncryptedDatabase {
  private memoryCache: DatabaseSchema | null = null;
  private listeners: Set<() => void> = new Set();

  private getVaultKey(): string {
    if (typeof window === 'undefined') return DEFAULT_KEY;
    const stored = localStorage.getItem(MASTER_KEY_STORAGE);
    return stored || DEFAULT_KEY;
  }

  public setVaultKey(newKey: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(MASTER_KEY_STORAGE, newKey);
    // Re-save existing data with new key
    if (this.memoryCache) {
      this.save(this.memoryCache);
    }
  }

  // Encrypt string with AES-256
  private encrypt(data: string, secretKey: string): string {
    return CryptoJS.AES.encrypt(data, secretKey).toString();
  }

  // Decrypt string with AES-256
  private decrypt(ciphertext: string, secretKey: string): string {
    const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  // Initialize and load data
  public load(): DatabaseSchema {
    if (this.memoryCache) return this.memoryCache;

    if (typeof window === 'undefined') {
      return this.getInitialSchema();
    }

    try {
      // Purge legacy storage from previous grocery builds
      try {
        if (localStorage.getItem(LEGACY_STORAGE_KEY_V1)) localStorage.removeItem(LEGACY_STORAGE_KEY_V1);
        if (localStorage.getItem(LEGACY_STORAGE_KEY_V2)) localStorage.removeItem(LEGACY_STORAGE_KEY_V2);
      } catch {}

      const encrypted = localStorage.getItem(STORAGE_KEY);
      if (!encrypted) {
        const initial = this.getInitialSchema();
        this.save(initial);
        this.memoryCache = initial;
        return initial;
      }

      const key = this.getVaultKey();
      let decryptedStr = '';
      try {
        decryptedStr = this.decrypt(encrypted, key);
      } catch {
        // Fallback to default key if custom key failed
        decryptedStr = this.decrypt(encrypted, DEFAULT_KEY);
      }

      if (!decryptedStr) {
        // Fallback or plain text migration
        try {
          const plainObj = JSON.parse(encrypted);
          this.memoryCache = plainObj;
          this.save(plainObj);
          return plainObj;
        } catch {
          const initial = this.getInitialSchema();
          this.save(initial);
          this.memoryCache = initial;
          return initial;
        }
      }

      const data: DatabaseSchema = JSON.parse(decryptedStr);
      
      // Clean up legacy store names if present
      if (
        data.settings &&
        data.settings.storeName &&
        (data.settings.storeName.toLowerCase().includes('sawit') ||
          data.settings.storeName.toLowerCase().includes('hasil bumi') ||
          data.settings.storeName.toLowerCase().includes('toko kelontong'))
      ) {
        data.settings = INITIAL_SETTINGS;
      }

      // Ensure branches exist
      if (!data.branches || data.branches.length === 0) {
        data.branches = INITIAL_BRANCHES;
      }
      if (!data.mutations) {
        data.mutations = [];
      }

      // Ensure settings & active branch exist
      if (!data.settings) {
        data.settings = INITIAL_SETTINGS;
      } else {
        if (!data.settings.activeBranchId) {
          data.settings.activeBranchId = 'branch-pusat';
        }
        if (!data.settings.branches || data.settings.branches.length === 0) {
          data.settings.branches = data.branches;
        }
      }

      // If products is empty, populate pre-configured Mini ATM, Pulsa & PPOB catalog
      if (!data.products || data.products.length === 0) {
        data.products = SAMPLE_MINI_ATM_PRODUCTS;
      }

      // Ensure users exist and have assigned branches
      if (!data.users || data.users.length === 0) {
        data.users = INITIAL_USERS;
      } else {
        data.users = data.users.map((u) => {
          if (!u.branchId) {
            return {
              ...u,
              branchId: u.role === 'OWNER' ? 'branch-pusat' : 'branch-cabang-2',
            };
          }
          return u;
        });
      }

      if (!data.debts) data.debts = [];
      if (!data.transactions) data.transactions = [];
      if (!data.stockLogs) data.stockLogs = [];
      if (!data.heldCarts) data.heldCarts = [];
      if (!data.shiftHistory) data.shiftHistory = [];

      this.memoryCache = data;
      return data;
    } catch {
      const initial = this.getInitialSchema();
      this.save(initial);
      this.memoryCache = initial;
      return initial;
    }
  }

  public save(data: DatabaseSchema): void {
    this.memoryCache = data;
    if (typeof window === 'undefined') return;

    try {
      const jsonStr = JSON.stringify(data);
      const key = this.getVaultKey();
      const encrypted = this.encrypt(jsonStr, key);
      localStorage.setItem(STORAGE_KEY, encrypted);
      saveToIDB(jsonStr); // Mirror into browser IndexedDB
      this.notifyListeners();
    } catch {
      // LocalStorage full or private browsing exception
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => fn());
  }

  private getInitialSchema(): DatabaseSchema {
    return {
      version: 2,
      products: SAMPLE_MINI_ATM_PRODUCTS,
      transactions: [],
      debts: [],
      users: INITIAL_USERS,
      activeShift: null,
      shiftHistory: [],
      branches: INITIAL_BRANCHES,
      mutations: [],
      settings: INITIAL_SETTINGS,
      stockLogs: [],
      heldCarts: [],
      lastBackupDate: new Date().toISOString(),
    };
  }

  // Check if browser has granted persistent storage permission
  public async isStoragePersisted(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
      try {
        return await navigator.storage.persisted();
      } catch {
        return false;
      }
    }
    return false;
  }

  // Request persistent storage so browser never purges app data
  public async requestPersistentStorage(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        return await navigator.storage.persist();
      } catch {
        return false;
      }
    }
    return false;
  }

  // Asynchronous recovery check from IndexedDB if LocalStorage was cleared
  public async checkAndRecoverFromIndexedDB(): Promise<boolean> {
    try {
      const idbData = await loadFromIDB();
      if (!idbData) return false;
      const parsed: DatabaseSchema = JSON.parse(idbData);
      if (parsed.products && parsed.products.length > 0) {
        this.save(parsed);
        return true;
      }
    } catch {
      // Ignore
    }
    return false;
  }

  // Export full human-readable JSON backup
  public exportJsonBackup(): string {
    const data = this.load();
    const backupObj = {
      app: 'KasirKelontong POS Modern',
      version: data.version || 1,
      exportedAt: new Date().toISOString(),
      storeName: data.settings?.storeName || 'Toko Kelontong',
      summary: {
        totalProducts: data.products?.length || 0,
        totalTransactions: data.transactions?.length || 0,
        totalDebts: data.debts?.length || 0,
      },
      data,
    };
    return JSON.stringify(backupObj, null, 2);
  }

  // Restore from JSON backup
  public restoreJsonBackup(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      const schema: DatabaseSchema = parsed.data || parsed.schema || parsed;
      if (!schema.products || !schema.users) return false;
      this.save(schema);
      return true;
    } catch {
      return false;
    }
  }

  // Raw encrypted backup export (with AES-256)
  public exportEncryptedBackup(customPassword?: string): string {
    const data = this.load();
    const payload = JSON.stringify({
      schema: data,
      exportedAt: new Date().toISOString(),
      app: 'KasirKelontong POS',
      encryption: 'AES-256',
    });
    const key = customPassword || this.getVaultKey();
    return CryptoJS.AES.encrypt(payload, key).toString();
  }

  // Restore encrypted backup file
  public restoreEncryptedBackup(encryptedString: string, password?: string): boolean {
    const key = password || this.getVaultKey();
    try {
      let decrypted = '';
      try {
        decrypted = this.decrypt(encryptedString, key);
      } catch {
        decrypted = this.decrypt(encryptedString, DEFAULT_KEY);
      }

      if (!decrypted) return false;
      const parsed = JSON.parse(decrypted);
      const schema: DatabaseSchema = parsed.schema || parsed;
      if (!schema.products || !schema.users) return false;

      this.save(schema);
      return true;
    } catch {
      return false;
    }
  }

  // Branch management (Multi-Cabang & Kelola Mandiri)
  public getBranches(): StoreBranch[] {
    const data = this.load();
    return data.branches && data.branches.length > 0 ? data.branches : INITIAL_BRANCHES;
  }

  public saveBranches(branches: StoreBranch[]): void {
    const data = this.load();
    data.branches = branches;
    if (data.settings) {
      data.settings.branches = branches;
    }
    this.save(data);
  }

  public getActiveBranch(): StoreBranch {
    const data = this.load();
    const activeId = data.settings?.activeBranchId || 'branch-pusat';
    const branches = data.branches && data.branches.length > 0 ? data.branches : INITIAL_BRANCHES;
    const found = branches.find((b) => b.id === activeId);
    return found || branches[0];
  }

  public setActiveBranchId(branchId: string): void {
    const data = this.load();
    if (!data.settings) data.settings = INITIAL_SETTINGS;
    data.settings.activeBranchId = branchId;
    this.save(data);
  }

  // Balance mutations (Kas Laci vs Saldo Bank vs Saldo Pulsa Digipos)
  public getMutations(branchId?: string): BalanceMutation[] {
    const data = this.load();
    const muts = data.mutations || [];
    if (branchId) {
      return muts.filter((m) => m.branchId === branchId);
    }
    return muts;
  }

  public adjustBranchBalances(
    branchId: string,
    changes: {
      cashChange?: number;
      bankChange?: number;
      digiposChange?: number;
    },
    meta: {
      category: 'TRANSAKSI' | 'TARIK_BANK' | 'SETOR_BANK' | 'TOPUP_SERVER' | 'MODAL_AWAL' | 'PENGELUARAN' | 'LAINNYA';
      description: string;
      referenceId?: string;
      cashierName: string;
    }
  ): { branch: StoreBranch; newMutations: BalanceMutation[] } {
    const data = this.load();
    const branches = data.branches && data.branches.length > 0 ? [...data.branches] : [...INITIAL_BRANCHES];
    const bIndex = branches.findIndex((b) => b.id === branchId);
    const targetIndex = bIndex !== -1 ? bIndex : 0;
    const branch = { ...branches[targetIndex] };
    const newMutations: BalanceMutation[] = [];
    const now = new Date().toISOString();

    // 1. Kas Laci Tunai Fisik
    if (changes.cashChange && changes.cashChange !== 0) {
      const before = branch.cashDrawerBalance || 0;
      const after = before + changes.cashChange;
      branch.cashDrawerBalance = Math.max(0, after);
      newMutations.push({
        id: `mut-cash-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        branchId: branch.id,
        branchName: branch.name,
        date: now,
        type: 'CASH',
        flow: changes.cashChange > 0 ? 'IN' : 'OUT',
        amount: Math.abs(changes.cashChange),
        balanceBefore: before,
        balanceAfter: branch.cashDrawerBalance,
        category: meta.category,
        description: meta.description,
        referenceId: meta.referenceId,
        cashierName: meta.cashierName,
      });
    }

    // 2. Saldo Rekening Bank / EDC Agen
    if (changes.bankChange && changes.bankChange !== 0) {
      const before = branch.bankBalance || 0;
      const after = before + changes.bankChange;
      branch.bankBalance = Math.max(0, after);
      newMutations.push({
        id: `mut-bank-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        branchId: branch.id,
        branchName: branch.name,
        date: now,
        type: 'BANK',
        flow: changes.bankChange > 0 ? 'IN' : 'OUT',
        amount: Math.abs(changes.bankChange),
        balanceBefore: before,
        balanceAfter: branch.bankBalance,
        category: meta.category,
        description: meta.description,
        referenceId: meta.referenceId,
        cashierName: meta.cashierName,
      });
    }

    // 3. Saldo Server Pulsa / Digipos
    if (changes.digiposChange && changes.digiposChange !== 0) {
      const before = branch.digiposBalance || 0;
      const after = before + changes.digiposChange;
      branch.digiposBalance = Math.max(0, after);
      newMutations.push({
        id: `mut-digi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        branchId: branch.id,
        branchName: branch.name,
        date: now,
        type: 'DIGIPOS',
        flow: changes.digiposChange > 0 ? 'IN' : 'OUT',
        amount: Math.abs(changes.digiposChange),
        balanceBefore: before,
        balanceAfter: branch.digiposBalance,
        category: meta.category,
        description: meta.description,
        referenceId: meta.referenceId,
        cashierName: meta.cashierName,
      });
    }

    branches[targetIndex] = branch;
    data.branches = branches;
    data.mutations = [...newMutations, ...(data.mutations || [])].slice(0, 500);
    if (data.settings) {
      data.settings.branches = branches;
    }
    this.save(data);
    return { branch, newMutations };
  }

  // Set Saldo Riil Langsung (Khusus Admin / Owner)
  public setBranchRealBalances(
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
  ): { branch: StoreBranch; newMutations: BalanceMutation[] } {
    const data = this.load();
    const branches = data.branches && data.branches.length > 0 ? [...data.branches] : [...INITIAL_BRANCHES];
    const bIndex = branches.findIndex((b) => b.id === branchId);
    const targetIndex = bIndex !== -1 ? bIndex : 0;
    const branch = { ...branches[targetIndex] };
    const newMutations: BalanceMutation[] = [];
    const now = new Date().toISOString();

    const oldCash = branch.cashDrawerBalance || 0;
    const oldBank = branch.bankBalance || 0;
    const oldDigi = branch.digiposBalance || 0;
    const oldEwallet = branch.ewalletBalance || 0;

    const diffCash = newBalances.cashDrawerBalance - oldCash;
    const diffBank = newBalances.bankBalance - oldBank;
    const diffDigi = newBalances.digiposBalance - oldDigi;
    const diffEwallet = (newBalances.ewalletBalance ?? oldEwallet) - oldEwallet;

    branch.cashDrawerBalance = Math.max(0, newBalances.cashDrawerBalance);
    branch.bankBalance = Math.max(0, newBalances.bankBalance);
    branch.digiposBalance = Math.max(0, newBalances.digiposBalance);
    if (newBalances.ewalletBalance !== undefined) {
      branch.ewalletBalance = Math.max(0, newBalances.ewalletBalance);
    }

    if (diffCash !== 0) {
      newMutations.push({
        id: `mut-cash-adj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        branchId: branch.id,
        branchName: branch.name,
        date: now,
        type: 'CASH',
        flow: diffCash > 0 ? 'IN' : 'OUT',
        amount: Math.abs(diffCash),
        balanceBefore: oldCash,
        balanceAfter: branch.cashDrawerBalance,
        category: 'LAINNYA',
        description: `Penyesuaian Saldo Riil Tunai oleh Admin (${meta.reason || 'Koreksi Saldo Nyata'})`,
        cashierName: meta.adminName,
      });
    }

    if (diffBank !== 0) {
      newMutations.push({
        id: `mut-bank-adj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        branchId: branch.id,
        branchName: branch.name,
        date: now,
        type: 'BANK',
        flow: diffBank > 0 ? 'IN' : 'OUT',
        amount: Math.abs(diffBank),
        balanceBefore: oldBank,
        balanceAfter: branch.bankBalance,
        category: 'LAINNYA',
        description: `Penyesuaian Saldo Riil Bank oleh Admin (${meta.reason || 'Koreksi Saldo Nyata'})`,
        cashierName: meta.adminName,
      });
    }

    if (diffDigi !== 0) {
      newMutations.push({
        id: `mut-digi-adj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        branchId: branch.id,
        branchName: branch.name,
        date: now,
        type: 'DIGIPOS',
        flow: diffDigi > 0 ? 'IN' : 'OUT',
        amount: Math.abs(diffDigi),
        balanceBefore: oldDigi,
        balanceAfter: branch.digiposBalance,
        category: 'LAINNYA',
        description: `Penyesuaian Saldo Riil Pulsa oleh Admin (${meta.reason || 'Koreksi Saldo Nyata'})`,
        cashierName: meta.adminName,
      });
    }

    if (diffEwallet !== 0) {
      newMutations.push({
        id: `mut-ewallet-adj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        branchId: branch.id,
        branchName: branch.name,
        date: now,
        type: 'EWALLET',
        flow: diffEwallet > 0 ? 'IN' : 'OUT',
        amount: Math.abs(diffEwallet),
        balanceBefore: oldEwallet,
        balanceAfter: branch.ewalletBalance || 0,
        category: 'LAINNYA',
        description: `Penyesuaian Saldo Riil E-Wallet oleh Admin (${meta.reason || 'Koreksi Saldo Nyata'})`,
        cashierName: meta.adminName,
      });
    }

    branches[targetIndex] = branch;
    data.branches = branches;
    data.mutations = [...newMutations, ...(data.mutations || [])].slice(0, 500);
    if (data.settings) {
      data.settings.branches = branches;
    }
    this.save(data);
    return { branch, newMutations };
  }

  // Reset database completely to pristine state
  public resetToFactoryDefault(keepSettings = false) {
    const current = this.load();
    const fresh: DatabaseSchema = {
      version: 2,
      products: SAMPLE_MINI_ATM_PRODUCTS,
      transactions: [],
      debts: [],
      users: INITIAL_USERS,
      activeShift: null,
      shiftHistory: [],
      branches: INITIAL_BRANCHES,
      mutations: [],
      settings: keepSettings ? current.settings : INITIAL_SETTINGS,
      stockLogs: [],
      heldCarts: [],
      lastBackupDate: new Date().toISOString(),
    };
    this.save(fresh);
    return fresh;
  }

  // Wipes all data completely from localStorage and IDB so that no old data remains
  public wipeAllData(options?: { resetSettings?: boolean }) {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(LEGACY_STORAGE_KEY_V1);
        localStorage.removeItem(LEGACY_STORAGE_KEY_V2);
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
    const fresh = this.getInitialSchema();
    if (!options?.resetSettings && this.memoryCache?.settings) {
      fresh.settings = { ...this.memoryCache.settings, showSalesBrochure: false };
    }
    this.save(fresh);
    return fresh;
  }

  // Load sample Mini ATM and Pulsa catalog
  public loadSampleMiniAtmProducts() {
    const current = this.load();
    current.products = [...SAMPLE_MINI_ATM_PRODUCTS];
    this.save(current);
    return current;
  }

  // Alias for backward compatibility
  public loadSampleGroceryProducts() {
    return this.loadSampleMiniAtmProducts();
  }

  // Clear all products (for empty catalog setup)
  public clearAllProducts() {
    const current = this.load();
    current.products = [];
    current.heldCarts = [];
    this.save(current);
    return current;
  }

  // Clear transactional history only (keeps products and branches)
  public clearTransactionsAndHistory() {
    const current = this.load();
    current.transactions = [];
    current.debts = [];
    current.activeShift = null;
    current.shiftHistory = [];
    current.stockLogs = [];
    current.heldCarts = [];
    current.mutations = [];
    this.save(current);
    return current;
  }

  // Clear transactional history for a new store client
  public clearStoreForNewClient(options?: { keepProducts?: boolean }) {
    const current = this.load();
    const freshSchema: DatabaseSchema = {
      ...current,
      transactions: [],
      debts: [],
      activeShift: null,
      shiftHistory: [],
      stockLogs: [],
      heldCarts: [],
      mutations: [],
      products: options?.keepProducts ? current.products : [],
    };
    this.save(freshSchema);
    return freshSchema;
  }

  public saveSettings(settings: StoreSettings) {
    const current = this.load();
    current.settings = settings;
    if (settings.branches) {
      current.branches = settings.branches;
    }
    this.save(current);
  }
}

export const db = new LocalEncryptedDatabase();

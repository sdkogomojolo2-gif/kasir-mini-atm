export type ProductCategory =
  | 'Layanan Mini ATM'
  | 'Pulsa & Paket Data'
  | 'Top Up E-Wallet'
  | 'Token & Listrik PLN'
  | 'Tagihan PPOB & BPJS'
  | 'Kartu Perdana & Voucher'
  | 'Aksesoris Handphone'
  | string;

export type ServiceType =
  | 'TARIK_TUNAI'
  | 'SETOR_TUNAI'
  | 'TRANSFER_BANK'
  | 'PULSA'
  | 'PAKET_DATA'
  | 'TOPUP_EWALLET'
  | 'TOKEN_PLN'
  | 'TAGIHAN_PPOB'
  | 'PRODUK_FISIK';

export interface Product {
  id: string;
  barcode: string;
  name: string;
  category: ProductCategory;
  buyPrice: number; // Harga modal / harga agen / harga server
  sellPrice: number; // Harga jual ke pelanggan (termasuk biaya admin)
  stock: number;
  minStock: number;
  unit: string; // trx, pcs, voucher, kwh, nomor, nomor_id
  imageUrl?: string;
  serviceType?: ServiceType;
  provider?: string; // Telkomsel, Indosat, BRI, BCA, DANA, PLN, dll
  nominal?: number; // Nominal pulsa / ewallet / transfer
  adminFee?: number; // Keuntungan admin agen per transaksi
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number; // diskon nominal per item
  subtotal: number;
  customCustomerPhone?: string;
  customAccountNumber?: string;
  customAccountName?: string;
  customDestinationBank?: string;
}

export type PaymentMethod =
  | 'TUNAI'
  | 'QRIS'
  | 'DEBIT_EDC'
  | 'TRANSFER_BANK'
  | 'SALDO_BANK'
  | 'GOPAY'
  | 'OVO'
  | 'DANA'
  | 'SHOPEEPAY'
  | 'KASBON';

export interface TransactionItem {
  productId: string;
  productName: string;
  barcode: string;
  category: string;
  buyPrice: number;
  sellPrice: number;
  quantity: number;
  unit?: string;
  discount: number;
  subtotal: number;
  profit: number;
  serviceType?: ServiceType;
  provider?: string;
}

export interface Transaction {
  id: string;
  invoiceNumber: string;
  referenceNumber?: string; // Nomor referensi bank/operator unik
  date: string; // ISO string
  cashierId: string;
  cashierName: string;
  branchId: string; // ID Cabang transaksi
  branchName: string; // Nama Cabang transaksi
  items: TransactionItem[];
  totalQuantity: number;
  subtotal: number;
  discount: number;
  grandTotal: number;
  totalCost: number;
  totalProfit: number;
  paymentMethod: PaymentMethod;
  cashAmount?: number;
  changeAmount?: number;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  status: 'COMPLETED' | 'CANCELLED';
  qrisRef?: string;

  // Detail khusus Mini ATM, Konter Pulsa, Transfer & PPOB
  serviceType?: ServiceType;
  destinationBank?: string;
  sourceBank?: string;
  accountNumber?: string;
  accountName?: string;
  nominalAmount?: number;
  adminFee?: number;
  tokenCode?: string; // Kode Token PLN 20 Digit (e.g. 1234-5678-9012-3456-7890)
  snNumber?: string; // Serial Number pengisian pulsa/data
}

export interface CustomerDebt {
  id: string;
  customerName: string;
  phone?: string;
  address?: string;
  totalDebt: number;
  createdAt: string;
  dueDate?: string;
  notes?: string;
  transactions: {
    transactionId: string;
    invoiceNumber: string;
    date: string;
    amount: number;
    description: string;
  }[];
  payments: {
    id: string;
    date: string;
    amount: number;
    cashierName: string;
    notes?: string;
  }[];
}

export interface CashierUser {
  id: string;
  name: string;
  username: string;
  pin: string; // 4-6 digit PIN
  role: 'OWNER' | 'KASIR';
  branchId?: string; // Penugasan cabang spesifik
  isActive: boolean;
  createdAt: string;
}

export interface CashierShift {
  id: string;
  cashierId: string;
  cashierName: string;
  branchId?: string;
  startTime: string;
  endTime?: string;
  startingCash: number; // modal uang tunai awal di laci
  expectedCash: number;
  actualCash?: number;
  cashDifference?: number;
  totalTransactions: number;
  totalSales: number;
  totalCashSales: number;
  totalNonCashSales: number;
  totalAdminProfit?: number; // Total laba biaya admin selama shift
  status: 'OPEN' | 'CLOSED';
  notes?: string;
}

export interface StoreBranch {
  id: string;
  code: string; // e.g. KNT-01, ATM-PUSAT
  name: string; // e.g. "Pusat - Konter & Mini ATM Utama"
  address: string;
  phone: string;
  cashDrawerBalance: number; // Uang kas tunai di laci fisik
  bankBalance: number; // Saldo rekening bank / EDC agen
  digiposBalance: number; // Saldo server pulsa / digipos agen
  ewalletBalance?: number; // Saldo e-wallet agen (GoPay, ShopeePay, DANA, OVO)
  isMain: boolean;
  notes?: string;
  createdAt: string;
}

export interface BalanceMutation {
  id: string;
  branchId: string;
  branchName?: string;
  date: string;
  type: 'CASH' | 'BANK' | 'DIGIPOS' | 'EWALLET';
  flow: 'IN' | 'OUT';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  category: 'TRANSAKSI' | 'TARIK_BANK' | 'SETOR_BANK' | 'TOPUP_SERVER' | 'MODAL_AWAL' | 'PENGELUARAN' | 'LAINNYA';
  description: string;
  referenceId?: string;
  cashierName: string;
}

export interface StoreSettings {
  storeId?: string; // ID Unik Toko / Tenant ID
  activeBranchId?: string; // Cabang yang sedang aktif dikelola
  storeName: string;
  ownerName?: string;
  tagline: string;
  address: string;
  phone: string;
  footerMessage: string;
  taxPercentage: number;
  enableTax: boolean;
  paperSize: '58mm' | '80mm';
  qrisMerchantName: string;
  qrisNmid: string;
  qrisCity?: string;
  qrisMode?: 'DYNAMIC_NMID' | 'CUSTOM_IMAGE' | 'RAW_STRING';
  qrisImageUrl?: string;
  qrisRawString?: string;
  autoPrintReceipt: boolean;
  playAudioFeedback: boolean;
  encryptionEnabled: boolean;
  enableCloudSync?: boolean;
  showSalesBrochure?: boolean;
  vaultKeyHash?: string;

  // Mini ATM & Konter Pulsa specific settings
  agentCode?: string; // Kode agen e.g. "BRILINK-08912"
  agentTerminalId?: string; // Terminal ID e.g. "TID-88219"
  agentPartnerName?: string; // e.g. "AGEN BRILINK / BANK MANDIRI & KONTER CELL"
  defaultAdminFee?: number; // Biaya admin default e.g. 5000
  branches?: StoreBranch[]; // Daftar cabang
}

export interface StockLog {
  id: string;
  productId: string;
  productName: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'SALE';
  quantityChange: number;
  previousStock: number;
  currentStock: number;
  reason: string;
  timestamp: string;
  cashierName: string;
}

export interface HeldCart {
  id: string;
  name: string;
  customerName?: string;
  items: CartItem[];
  savedAt: string;
}

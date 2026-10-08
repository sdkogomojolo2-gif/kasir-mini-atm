import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Product, Transaction, CustomerDebt, StoreSettings } from '../types';

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateIndo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

// ---------------- EXCEL EXPORTS ----------------

// Export Sales Transactions to Excel
export function exportSalesToExcel(
  transactions: Transaction[],
  storeSettings: StoreSettings,
  startDate?: string,
  endDate?: string
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Ringkasan Transaksi
  const summaryRows = transactions.map((t, idx) => ({
    No: idx + 1,
    'No. Faktur': t.invoiceNumber,
    Tanggal: formatDateIndo(t.date),
    Kasir: t.cashierName,
    'Jumlah Item': t.totalQuantity,
    'Metode Bayar': t.paymentMethod,
    Subtotal: t.subtotal,
    Diskon: t.discount,
    'Total Bayar': t.grandTotal,
    'Total Modal': t.totalCost,
    'Laba Bersih': t.totalProfit,
    Pelanggan: t.customerName || '-',
    Status: t.status,
  }));

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Transaksi');

  // Sheet 2: Rincian Produk Terjual
  const itemRows: {
    'No. Faktur': string;
    Tanggal: string;
    Barcode: string;
    'Nama Barang': string;
    Kategori: string;
    Qty: number;
    'Harga Jual': number;
    'Harga Beli': number;
    Subtotal: number;
    Laba: number;
  }[] = [];

  transactions.forEach((t) => {
    t.items.forEach((item) => {
      itemRows.push({
        'No. Faktur': t.invoiceNumber,
        Tanggal: formatDateIndo(t.date),
        Barcode: item.barcode,
        'Nama Barang': item.productName,
        Kategori: item.category,
        Qty: item.quantity,
        'Harga Jual': item.sellPrice,
        'Harga Beli': item.buyPrice,
        Subtotal: item.subtotal,
        Laba: item.profit,
      });
    });
  });

  const wsItems = XLSX.utils.json_to_sheet(itemRows);
  XLSX.utils.book_append_sheet(wb, wsItems, 'Detail Item Terjual');

  const fileName = `Laporan_Penjualan_${storeSettings.storeName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// Export Inventory Stock to Excel
export function exportStockToExcel(products: Product[], storeSettings: StoreSettings) {
  const wb = XLSX.utils.book_new();

  let totalAssetModal = 0;
  let totalAssetJual = 0;

  const rows = products.map((p, idx) => {
    const assetModal = p.stock * p.buyPrice;
    const assetJual = p.stock * p.sellPrice;
    totalAssetModal += assetModal;
    totalAssetJual += assetJual;

    return {
      No: idx + 1,
      Barcode: p.barcode,
      'Nama Barang': p.name,
      Kategori: p.category,
      Satuan: p.unit,
      Stok: p.stock,
      'Min. Stok': p.minStock,
      'Harga Beli (Modal)': p.buyPrice,
      'Harga Jual': p.sellPrice,
      'Margin Laba / Satuan': p.sellPrice - p.buyPrice,
      'Nilai Aset Modal': assetModal,
      'Estimasi Omzet Jual': assetJual,
      Status: p.stock <= p.minStock ? 'STOK MENIPIS' : 'AMAN',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Stok Barang');

  const fileName = `Katalog_Stok_${storeSettings.storeName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// Export Debts / Kasbon to Excel
export function exportDebtsToExcel(debts: CustomerDebt[], storeSettings: StoreSettings) {
  const wb = XLSX.utils.book_new();

  const rows = debts.map((d, idx) => ({
    No: idx + 1,
    'Nama Pelanggan': d.customerName,
    'No. HP': d.phone || '-',
    Alamat: d.address || '-',
    'Sisa Hutang': d.totalDebt,
    'Jatuh Tempo': d.dueDate || '-',
    Catatan: d.notes || '-',
    'Tanggal Dicatat': formatDateIndo(d.createdAt),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Buku Kasbon');

  const fileName = `Buku_Kasbon_${storeSettings.storeName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// ---------------- PDF EXPORTS ----------------

// Export Sales Report to PDF
export function exportSalesReportPDF(
  transactions: Transaction[],
  storeSettings: StoreSettings,
  filterTitle = 'Semua Periode'
) {
  const doc = new jsPDF('p', 'mm', 'a4');

  const totalOmzet = transactions.reduce((acc, t) => acc + (t.status === 'COMPLETED' ? t.grandTotal : 0), 0);
  const totalProfit = transactions.reduce((acc, t) => acc + (t.status === 'COMPLETED' ? t.totalProfit : 0), 0);
  const totalModal = transactions.reduce((acc, t) => acc + (t.status === 'COMPLETED' ? t.totalCost : 0), 0);
  const totalItems = transactions.reduce((acc, t) => acc + (t.status === 'COMPLETED' ? t.totalQuantity : 0), 0);

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(26, 77, 46); // Forest green tone
  doc.text(storeSettings.storeName.toUpperCase(), 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(storeSettings.address, 14, 24);
  doc.text(`Telp/WA: ${storeSettings.phone} | Dicetak: ${formatDateIndo(new Date().toISOString())}`, 14, 29);

  // Line divider
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(14, 32, 196, 32);

  // Title Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text(`LAPORAN PENJUALAN (${filterTitle})`, 14, 40);

  // Summary Metrics Banner Box
  doc.setFillColor(245, 248, 245);
  doc.roundedRect(14, 44, 182, 22, 2, 2, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('TOTAL OMZET (PENDAPATAN)', 18, 51);
  doc.text('TOTAL LABA BERSIH', 75, 51);
  doc.text('TOTAL MODAL BARANG', 130, 51);
  doc.text('TOTAL TRANSAKSI', 170, 51);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 120, 60);
  doc.text(formatRupiah(totalOmzet), 18, 60);
  doc.setTextColor(20, 90, 180);
  doc.text(formatRupiah(totalProfit), 75, 60);
  doc.setTextColor(180, 50, 50);
  doc.text(formatRupiah(totalModal), 130, 60);
  doc.setTextColor(30, 30, 30);
  doc.text(`${transactions.length} Trx (${totalItems} pcs)`, 170, 60);

  // Table
  const tableData = transactions.map((t, idx) => [
    idx + 1,
    t.invoiceNumber,
    formatDateIndo(t.date).slice(0, 17),
    t.cashierName.split(' ')[0],
    t.paymentMethod,
    t.totalQuantity,
    formatRupiah(t.grandTotal),
    formatRupiah(t.totalProfit),
    t.status,
  ]);

  autoTable(doc, {
    startY: 72,
    head: [['No', 'Faktur', 'Tanggal', 'Kasir', 'Metode', 'Qty', 'Total Bayar', 'Laba Bersih', 'Status']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [30, 110, 65],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 248],
    },
  });

  const fileName = `Laporan_Penjualan_${storeSettings.storeName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

// Export Stock Catalog to PDF
export function exportStockPDF(products: Product[], storeSettings: StoreSettings) {
  const doc = new jsPDF('p', 'mm', 'a4');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(26, 77, 46);
  doc.text(storeSettings.storeName.toUpperCase(), 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`Katalog & Stok Barang Toko | Dicetak: ${formatDateIndo(new Date().toISOString())}`, 14, 24);

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(14, 28, 196, 28);

  let totalAssetModal = 0;
  let totalAssetJual = 0;
  let totalQty = 0;

  products.forEach((p) => {
    totalAssetModal += p.stock * p.buyPrice;
    totalAssetJual += p.stock * p.sellPrice;
    totalQty += p.stock;
  });

  // Summary Metrics Banner Box
  doc.setFillColor(245, 248, 245);
  doc.roundedRect(14, 32, 182, 18, 2, 2, 'F');

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('TOTAL MACAM PRODUK', 18, 38);
  doc.text('TOTAL FISIK BARANG', 70, 38);
  doc.text('TOTAL ASET MODAL', 115, 38);
  doc.text('POTENSI OMZET', 160, 38);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(`${products.length} SKU`, 18, 45);
  doc.text(`${totalQty} Unit/Pcs`, 70, 45);
  doc.setTextColor(180, 50, 50);
  doc.text(formatRupiah(totalAssetModal), 115, 45);
  doc.setTextColor(16, 120, 60);
  doc.text(formatRupiah(totalAssetJual), 160, 45);

  const tableData = products.map((p, idx) => [
    idx + 1,
    p.barcode,
    p.name,
    p.category,
    `${p.stock} ${p.unit}`,
    formatRupiah(p.buyPrice),
    formatRupiah(p.sellPrice),
    formatRupiah(p.sellPrice - p.buyPrice),
    p.stock <= p.minStock ? 'MENIPIS' : 'AMAN',
  ]);

  autoTable(doc, {
    startY: 55,
    head: [['No', 'Barcode', 'Nama Barang', 'Kategori', 'Stok', 'Harga Beli', 'Harga Jual', 'Margin', 'Status']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
    },
    headStyles: {
      fillColor: [30, 110, 65],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
  });

  const fileName = `Katalog_Stok_${storeSettings.storeName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

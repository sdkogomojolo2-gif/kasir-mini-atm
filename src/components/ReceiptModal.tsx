import React, { useRef, useState, useEffect } from 'react';
import {
  Printer,
  FileDown,
  Share2,
  CheckCircle2,
  X,
  RefreshCw,
  Bluetooth,
  BluetoothConnected,
  Loader2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Image as ImageIcon,
  MessageCircle,
  Send,
  Download,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Transaction, StoreSettings } from '../types';
import { formatRupiah, formatDateIndo } from '../services/export';
import { bluetoothPrinter, isIframeEnvironment, openAppInNewTab } from '../services/bluetoothPrinter';
import { sound } from '../services/sound';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  settings: StoreSettings;
  darkMode: boolean;
  onNewTransaction: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  transaction,
  settings,
  darkMode,
  onNewTransaction,
}) => {
  const receiptRef = useRef<HTMLDivElement | null>(null);
  const [btStatus, setBtStatus] = useState(bluetoothPrinter.getStatus());
  const [isPrinting, setIsPrinting] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [waPhotoModalData, setWaPhotoModalData] = useState<{
    imageUrl: string;
    phone: string;
    blob: Blob;
    copied: boolean;
  } | null>(null);
  const [customPhoneInput, setCustomPhoneInput] = useState('');
  const [printMessage, setPrintMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const autoPrintedTrxIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (transaction?.customerPhone) {
      setCustomPhoneInput(transaction.customerPhone);
    } else {
      setCustomPhoneInput('');
    }
    setWaPhotoModalData(null);
  }, [transaction?.id, transaction?.customerPhone]);

  const handleCopyText = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    sound.playSuccess();
    setTimeout(() => {
      setCopiedField(null);
    }, 2500);
  };

  useEffect(() => {
    return bluetoothPrinter.subscribe(setBtStatus);
  }, []);

  // Direct Web / USB Print
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const receiptHtml = receiptRef.current ? receiptRef.current.innerHTML : '';
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Struk_${transaction?.invoiceNumber || 'POS'}</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 12px;
              color: #000;
              margin: 0;
              padding: 10px;
              width: ${settings.paperSize === '80mm' ? '72mm' : '48mm'};
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .double-divider { border-top: 2px dashed #000; margin: 6px 0; }
            .flex-between { display: flex; justify-content: space-between; }
            .item-row { margin-bottom: 4px; }
            @media print {
              @page { margin: 0; }
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${receiptHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // The 1-Click Smart Universal Print handler (Foolproof for any cashier)
  const handleSmartPrint = async () => {
    if (!transaction) return;
    setIsPrinting(true);
    setPrintMessage({ text: 'Sedang mencetak struk...', type: 'info' });

    // 1. If Bluetooth is already connected and not in restricted iframe, use ESC/POS
    if (btStatus.isConnected && !isIframeEnvironment()) {
      try {
        await bluetoothPrinter.printReceipt(transaction, settings);
        sound.playSuccess();
        setPrintMessage({ text: `Struk sukses dikirim ke ${btStatus.deviceName || 'Printer Bluetooth'}!`, type: 'success' });
        setTimeout(() => setPrintMessage(null), 3000);
        setIsPrinting(false);
        return;
      } catch (err: any) {
        console.warn('Bluetooth print failed, falling back to standard print:', err);
      }
    }

    // 2. Direct seamless print via printer USB / standard print dialog
    try {
      handlePrint();
      sound.playSuccess();
      setPrintMessage({ text: 'Struk siap dicetak.', type: 'success' });
    } catch {
      setPrintMessage({ text: 'Gagal membuka printer.', type: 'error' });
    } finally {
      setIsPrinting(false);
      setTimeout(() => setPrintMessage(null), 3000);
    }
  };

  // Auto-print receipt if enabled in settings
  useEffect(() => {
    if (isOpen && transaction && settings.autoPrintReceipt) {
      if (autoPrintedTrxIdRef.current !== transaction.id) {
        autoPrintedTrxIdRef.current = transaction.id;
        const timer = setTimeout(() => {
          handleSmartPrint();
        }, 350);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, transaction?.id, settings.autoPrintReceipt]);

  if (!isOpen || !transaction) return null;

  // Direct Bluetooth connect & print manually
  const handlePrintBluetoothManual = async () => {
    try {
      setIsPrinting(true);
      setPrintMessage({ text: 'Menghubungkan printer Bluetooth...', type: 'info' });
      await bluetoothPrinter.printReceipt(transaction, settings);
      sound.playSuccess();
      setPrintMessage({ text: 'Struk berhasil dicetak via Bluetooth!', type: 'success' });
      setTimeout(() => setPrintMessage(null), 3500);
    } catch (err: any) {
      sound.playError();
      const errMsg = String(err?.message || '');
      if (
        err?.isIframePolicy ||
        errMsg.toLowerCase().includes('permissions policy') ||
        errMsg.toLowerCase().includes('disallowed')
      ) {
        // Cashier friendly fallback: print standard and advise new tab
        setPrintMessage({ text: 'Akses Bluetooth dibatasi di pratinjau. Membuka cetak standar...', type: 'info' });
        handlePrint();
      } else if (!err?.isCancelled) {
        setPrintMessage({ text: errMsg || 'Gagal koneksi Bluetooth.', type: 'error' });
      }
      setTimeout(() => setPrintMessage(null), 4000);
    } finally {
      setIsPrinting(false);
    }
  };

  // RawBT Print handler for Indonesian Android POS
  const handleRawBTPrint = () => {
    if (!transaction) return;
    const ok = bluetoothPrinter.printWithRawBT(transaction, settings);
    if (ok) {
      sound.playSuccess();
      setPrintMessage({ text: 'Meneruskan ke aplikasi RawBT Android...', type: 'success' });
      setTimeout(() => setPrintMessage(null), 3000);
    }
  };

  // Download PDF receipt
  const handleDownloadPDF = () => {
    const is80mm = settings.paperSize === '80mm';
    const docWidth = is80mm ? 80 : 58;
    const itemsCount = transaction.items.length;
    const docHeight = Math.max(120, 90 + itemsCount * 8);

    const doc = new jsPDF({
      unit: 'mm',
      format: [docWidth, docHeight],
    });

    doc.setFont('courier', 'bold');
    doc.setFontSize(10);
    doc.text(settings.storeName.slice(0, 24), docWidth / 2, 8, { align: 'center' });

    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.text(settings.address.slice(0, 32), docWidth / 2, 12, { align: 'center' });
    doc.text(`Telp: ${settings.phone}`, docWidth / 2, 16, { align: 'center' });

    doc.text('-'.repeat(is80mm ? 42 : 30), docWidth / 2, 20, { align: 'center' });

    doc.setFontSize(7);
    doc.text(`No: ${transaction.invoiceNumber}`, 4, 24);
    doc.text(`Tgl: ${formatDateIndo(transaction.date)}`, 4, 28);
    doc.text(`Kasir: ${transaction.cashierName.slice(0, 15)}`, 4, 32);
    if (transaction.customerName) {
      doc.text(`Pelanggan: ${transaction.customerName.slice(0, 15)}`, 4, 36);
    }

    let currentY = transaction.customerName ? 40 : 36;
    doc.text('-'.repeat(is80mm ? 42 : 30), docWidth / 2, currentY, { align: 'center' });
    currentY += 4;

    // Items
    transaction.items.forEach((item) => {
      doc.setFont('courier', 'bold');
      doc.text(item.productName.slice(0, is80mm ? 28 : 20), 4, currentY);
      currentY += 3.5;
      doc.setFont('courier', 'normal');

      const itemDetail = `${item.quantity} ${item.unit || 'pcs'} x @${formatRupiah(item.sellPrice).replace('Rp', '')}`;
      doc.text(itemDetail, 4, currentY);
      doc.text(formatRupiah(item.subtotal), docWidth - 4, currentY, { align: 'right' });
      currentY += 4.5;
    });

    doc.text('-'.repeat(is80mm ? 42 : 30), docWidth / 2, currentY, { align: 'center' });
    currentY += 4;

    doc.text('Subtotal:', 4, currentY);
    doc.text(formatRupiah(transaction.subtotal), docWidth - 4, currentY, { align: 'right' });
    currentY += 4;

    if (transaction.discount > 0) {
      doc.text('Diskon:', 4, currentY);
      doc.text(`-${formatRupiah(transaction.discount)}`, docWidth - 4, currentY, { align: 'right' });
      currentY += 4;
    }

    doc.setFont('courier', 'bold');
    doc.setFontSize(8.5);
    doc.text('TOTAL:', 4, currentY);
    doc.text(formatRupiah(transaction.grandTotal), docWidth - 4, currentY, { align: 'right' });
    currentY += 4.5;

    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.text(`Metode: ${transaction.paymentMethod}`, 4, currentY);
    currentY += 4;

    if (transaction.paymentMethod === 'TUNAI' && transaction.cashAmount) {
      doc.text('Tunai:', 4, currentY);
      doc.text(formatRupiah(transaction.cashAmount), docWidth - 4, currentY, { align: 'right' });
      currentY += 4;
      doc.text('Kembalian:', 4, currentY);
      doc.text(formatRupiah(transaction.changeAmount || 0), docWidth - 4, currentY, { align: 'right' });
      currentY += 4.5;
    }

    doc.text('='.repeat(is80mm ? 42 : 30), docWidth / 2, currentY, { align: 'center' });
    currentY += 4;

    doc.setFontSize(6.5);
    doc.text(settings.footerMessage.slice(0, 36), docWidth / 2, currentY, { align: 'center' });

    doc.save(`Struk_${transaction.invoiceNumber}.pdf`);
  };

  // Generate high-resolution receipt image blob (3x scale for crystal clear fonts)
  const generateReceiptImageBlob = async (): Promise<{ blob: Blob; dataUrl: string } | null> => {
    if (!receiptRef.current) return null;
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          const dataUrl = canvas.toDataURL('image/png');
          resolve({ blob, dataUrl });
        }, 'image/png');
      });
    } catch (err) {
      console.error('Failed to generate receipt image:', err);
      return null;
    }
  };

  // Download receipt as PNG image
  const handleDownloadImage = async () => {
    if (!transaction) return;
    setIsGeneratingImage(true);
    setPrintMessage({ text: 'Sedang membuat foto struk...', type: 'info' });

    try {
      const result = await generateReceiptImageBlob();
      if (!result) throw new Error('Gagal memproses gambar');

      const link = document.createElement('a');
      link.href = result.dataUrl;
      link.download = `Struk_${transaction.invoiceNumber}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      sound.playSuccess();
      setPrintMessage({ text: 'Foto struk berhasil diunduh (.png)!', type: 'success' });
      setTimeout(() => setPrintMessage(null), 3000);
    } catch {
      sound.playError();
      setPrintMessage({ text: 'Gagal mengunduh foto struk.', type: 'error' });
      setTimeout(() => setPrintMessage(null), 3000);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Share receipt as PHOTO to WhatsApp (Bukan teks)
  const handleShareWAPhoto = async () => {
    if (!transaction) return;
    setIsGeneratingImage(true);
    setPrintMessage({ text: 'Menyiapkan foto struk...', type: 'info' });

    try {
      const result = await generateReceiptImageBlob();
      if (!result) throw new Error('Gagal membuat gambar struk');

      const { blob, dataUrl } = result;
      const fileName = `Struk_${transaction.invoiceNumber}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // Clean customer phone number
      const targetPhoneRaw = customPhoneInput || transaction.customerPhone || '';
      let cleanPhone = targetPhoneRaw.replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '62' + cleanPhone.slice(1);
      }

      // Check if browser supports Web Share API with Files (Android Chrome, iOS Safari)
      const canShareFiles =
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] });

      if (canShareFiles) {
        setPrintMessage({ text: 'Membuka menu kirim WhatsApp...', type: 'info' });
        try {
          await navigator.share({
            files: [file],
            title: `Struk ${settings.storeName} #${transaction.invoiceNumber}`,
            text: `Struk Pembayaran Resmi ${settings.storeName}\nFaktur: #${transaction.invoiceNumber}`,
          });
          sound.playSuccess();
          setPrintMessage({ text: 'Foto struk berhasil dibagikan ke WhatsApp!', type: 'success' });
          setTimeout(() => setPrintMessage(null), 3500);
          return;
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') {
            setPrintMessage(null);
            return;
          }
          console.warn('Native share failed or dismissed, fallback to clipboard:', shareErr);
        }
      }

      // Desktop WhatsApp Web / Browser Fallback:
      // 1. Copy image to Clipboard so user can immediately press Ctrl+V (Paste) in WhatsApp
      let copied = false;
      try {
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          copied = true;
        }
      } catch (clipErr) {
        console.warn('Clipboard write image failed:', clipErr);
      }

      // 2. Also download the image file so it is saved locally
      try {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch {}

      // 3. Open WhatsApp chat
      const waUrl = cleanPhone
        ? `https://wa.me/${cleanPhone}`
        : `https://web.whatsapp.com/`;
      window.open(waUrl, '_blank');

      sound.playSuccess();

      // 4. Show instructional dialog with image preview
      setWaPhotoModalData({
        imageUrl: dataUrl,
        phone: cleanPhone,
        blob,
        copied,
      });

      setPrintMessage({
        text: copied
          ? '📸 Foto struk disalin! Tekan Paste (Ctrl+V) di chat WhatsApp.'
          : '📸 Foto struk diunduh! Silakan lampirkan foto ke chat WhatsApp.',
        type: 'success',
      });
      setTimeout(() => setPrintMessage(null), 6000);
    } catch (err) {
      console.error(err);
      sound.playError();
      setPrintMessage({ text: 'Gagal memproses foto struk WhatsApp.', type: 'error' });
      setTimeout(() => setPrintMessage(null), 3500);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Optional: Share via WhatsApp as Text
  const handleShareWAText = () => {
    let msg = `*STRUK RESMI - ${settings.storeName.toUpperCase()}*\n`;
    if (transaction.branchName) msg += `Cabang: ${transaction.branchName}\n`;
    if (settings.agentCode) msg += `Kode Agen: ${settings.agentCode} | TID: ${settings.agentTerminalId || '-'}\n`;
    msg += `No. Faktur: ${transaction.invoiceNumber}\n`;
    if (transaction.referenceNumber) msg += `No. Referensi: ${transaction.referenceNumber}\n`;
    msg += `Tanggal: ${formatDateIndo(transaction.date)}\n`;
    msg += `Kasir: ${transaction.cashierName}\n`;
    msg += `-----------------------------\n`;

    if (transaction.serviceType && transaction.serviceType !== 'PRODUK_FISIK') {
      msg += `*LAYANAN: ${transaction.items[0]?.productName || transaction.serviceType}*\n`;
      if (transaction.destinationBank) msg += `Bank Tujuan: ${transaction.destinationBank}\n`;
      if (transaction.accountNumber) msg += `No. Rekening/ID: ${transaction.accountNumber}\n`;
      if (transaction.accountName) msg += `Nama Penerima: ${transaction.accountName}\n`;
      if (transaction.customerPhone) msg += `No. Handphone: ${transaction.customerPhone}\n`;
      if (transaction.snNumber) msg += `Serial Number (SN): ${transaction.snNumber}\n`;
      if (transaction.tokenCode) msg += `*KODE TOKEN PLN: ${transaction.tokenCode}*\n`;
      msg += `Nominal Pokok: ${formatRupiah(transaction.nominalAmount || transaction.grandTotal - (transaction.adminFee || 0))}\n`;
      msg += `Biaya Admin: ${formatRupiah(transaction.adminFee || 0)}\n`;
    } else {
      transaction.items.forEach((item) => {
        msg += `• *${item.productName}*\n`;
        msg += `  ${item.quantity} ${item.unit || 'pcs'} x ${formatRupiah(item.sellPrice)} = ${formatRupiah(item.subtotal)}\n`;
      });
    }

    msg += `-----------------------------\n`;
    msg += `*TOTAL BAYAR: ${formatRupiah(transaction.grandTotal)}*\n`;
    msg += `Metode: ${transaction.paymentMethod}\n`;
    if (transaction.cashAmount) {
      msg += `Tunai: ${formatRupiah(transaction.cashAmount)}\n`;
      msg += `Kembalian: ${formatRupiah(transaction.changeAmount || 0)}\n`;
    }
    msg += `\n_${settings.footerMessage}_`;

    const targetPhoneRaw = customPhoneInput || transaction.customerPhone || '';
    const phone = targetPhoneRaw.replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('0') ? '62' + phone.slice(1) : phone;
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div
      id="receipt-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
    >
      <div
        id="receipt-modal-card"
        className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border my-8 flex flex-col ${
          darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header Notification Banner - Official Agent Theme */}
        <div className="bg-zinc-950 px-6 py-4 text-white flex items-center justify-between border-b border-amber-500/30 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-black text-sm tracking-tight text-white flex items-center gap-2">
                Transaksi Berhasil &amp; Tercatat
              </h3>
              <p className="text-xs text-amber-400 font-mono font-bold">Faktur #{transaction.invoiceNumber} • {transaction.branchName || 'Kasir Agen'}</p>
            </div>
          </div>
          <button
            id="btn-close-receipt"
            onClick={onClose}
            className="p-1.5 rounded-lg opacity-80 hover:opacity-100 hover:bg-white/10 transition-colors cursor-pointer text-zinc-300"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Printable Thermal Receipt Card */}
        <div className="p-5 flex justify-center bg-slate-100 dark:bg-slate-950">
          <div
            ref={receiptRef}
            id="thermal-receipt-paper"
            className="bg-white text-slate-900 p-5 rounded-xl shadow-lg font-mono text-xs w-full max-w-[340px] border border-slate-200 select-all"
          >
            {/* Store Header */}
            <div className="text-center pb-2 text-black">
              <div className="font-black text-sm tracking-tight text-black">{settings.storeName}</div>
              {transaction.branchName && (
                <div className="text-[11px] font-black text-zinc-900">{transaction.branchName}</div>
              )}
              <div className="text-[11px] text-zinc-900 font-bold">{settings.address}</div>
              <div className="text-[11px] text-zinc-900 font-bold">Telp/WA: {settings.phone}</div>
              {settings.agentCode && (
                <div className="text-[10px] text-black mt-0.5 font-black">
                  KODE AGEN: {settings.agentCode} {settings.agentTerminalId ? `| TID: ${settings.agentTerminalId}` : ''}
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-zinc-400 my-2.5" />

            {/* Metadata */}
            <div className="space-y-0.5 text-[11px] text-black font-medium">
              <div className="flex justify-between">
                <span className="text-zinc-900 font-bold">No. Faktur:</span>
                <span className="font-black text-black">#{transaction.invoiceNumber}</span>
              </div>
              {transaction.referenceNumber && (
                <div className="flex justify-between">
                  <span className="text-zinc-900 font-bold">No. Ref / RRN:</span>
                  <span className="font-black text-black">{transaction.referenceNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-900 font-bold">Tanggal:</span>
                <span className="font-bold text-black">{formatDateIndo(transaction.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-900 font-bold">Kasir:</span>
                <span className="font-bold text-black">{transaction.cashierName}</span>
              </div>
              {transaction.customerName && (
                <div className="flex justify-between">
                  <span className="text-zinc-900 font-bold">Pelanggan:</span>
                  <span className="font-black text-black">{transaction.customerName}</span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-zinc-400 my-2.5" />

            {/* Mini ATM / PPOB Special Details if applicable */}
            {transaction.serviceType && transaction.serviceType !== 'PRODUK_FISIK' && (
              <div className="space-y-1 py-1 text-[11px] bg-zinc-50 p-2 rounded border border-zinc-300 mb-2 text-black">
                <div className="font-black text-black uppercase">
                  {transaction.items[0]?.productName || transaction.serviceType}
                </div>
                {transaction.destinationBank && (
                  <div className="flex justify-between">
                    <span className="text-zinc-900 font-bold">Bank Tujuan:</span>
                    <span className="font-black text-black">{transaction.destinationBank}</span>
                  </div>
                )}
                {transaction.accountNumber && (
                  <div className="flex justify-between">
                    <span className="text-zinc-900 font-bold">No. Rek / ID:</span>
                    <span className="font-black text-black">{transaction.accountNumber}</span>
                  </div>
                )}
                {transaction.accountName && (
                  <div className="flex justify-between">
                    <span className="text-zinc-900 font-bold">Nama Penerima:</span>
                    <span className="font-black text-black">{transaction.accountName}</span>
                  </div>
                )}
                {transaction.customerPhone && (
                  <div className="flex justify-between">
                    <span className="text-zinc-900 font-bold">No. HP:</span>
                    <span className="font-black text-black">{transaction.customerPhone}</span>
                  </div>
                )}
                {transaction.snNumber && (
                  <div className="flex items-center justify-between text-[10px] gap-1">
                    <span className="text-zinc-900 font-bold">Serial No (SN):</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-black">{transaction.snNumber}</span>
                      <button
                        type="button"
                        data-html2canvas-ignore="true"
                        onClick={() => handleCopyText(transaction.snNumber!, 'SN')}
                        className="px-1.5 py-0.5 rounded bg-zinc-200 hover:bg-zinc-300 text-zinc-950 font-bold text-[9px] flex items-center gap-1 cursor-pointer transition-colors"
                        title="Salin SN"
                      >
                        {copiedField === 'SN' ? (
                          <>
                            <Check className="w-2.5 h-2.5 text-emerald-600" />
                            <span className="text-emerald-700">Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-2.5 h-2.5" />
                            <span>Salin</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
                {transaction.tokenCode && (
                  <div className="my-1.5 p-2 bg-white border-2 border-zinc-950 rounded-lg text-center shadow-xs">
                    <div className="flex items-center justify-between text-[9px] text-black font-black uppercase mb-1">
                      <span>KODE TOKEN PLN PRABAYAR</span>
                      <button
                        type="button"
                        data-html2canvas-ignore="true"
                        onClick={() => handleCopyText(transaction.tokenCode!, 'TOKEN')}
                        className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 text-[9px] font-black flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
                      >
                        {copiedField === 'TOKEN' ? (
                          <>
                            <Check className="w-2.5 h-2.5" />
                            <span>Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-2.5 h-2.5" />
                            <span>Salin 20 Digit</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="text-sm sm:text-base font-black tracking-widest text-black font-mono my-1 bg-amber-50/50 py-1 rounded border border-amber-200">
                      {transaction.tokenCode}
                    </div>
                    <div className="text-[8px] text-zinc-900 font-bold">Masukkan 20 digit ke meteran listrik pelanggan</div>
                  </div>
                )}
              </div>
            )}

            {/* Items Table */}
            <div className="space-y-1.5 py-1 text-[11px] text-black">
              {transaction.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex items-center justify-between font-black text-black">
                    <span>{item.productName}</span>
                  </div>
                  <div className="flex justify-between text-zinc-900 font-bold">
                    <span>
                      {item.quantity} {item.unit || 'pcs'} x {formatRupiah(item.sellPrice)}
                    </span>
                    <span className="font-black text-black">{formatRupiah(item.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-zinc-400 my-2.5" />

            {/* Totals */}
            <div className="space-y-1 text-[11px] text-black">
              <div className="flex justify-between font-bold">
                <span className="text-zinc-900">Subtotal:</span>
                <span className="font-black text-black">{formatRupiah(transaction.subtotal)}</span>
              </div>
              {transaction.discount > 0 && (
                <div className="flex justify-between font-black text-rose-700">
                  <span>Diskon:</span>
                  <span>-{formatRupiah(transaction.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm pt-1.5 border-t border-zinc-300">
                <span>TOTAL:</span>
                <span className="text-black font-black">{formatRupiah(transaction.grandTotal)}</span>
              </div>
              <div className="flex justify-between pt-1 font-bold">
                <span className="text-zinc-900">Metode:</span>
                <span className="font-black uppercase text-black">{transaction.paymentMethod}</span>
              </div>
              {transaction.paymentMethod === 'TUNAI' && transaction.cashAmount && (
                <>
                  <div className="flex justify-between font-bold">
                    <span className="text-zinc-900">Tunai:</span>
                    <span className="font-black text-black">{formatRupiah(transaction.cashAmount)}</span>
                  </div>
                  <div className="flex justify-between font-black text-black">
                    <span className="text-zinc-900">Kembalian:</span>
                    <span className="font-black text-black">{formatRupiah(transaction.changeAmount || 0)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-dashed border-zinc-400 my-3" />

            {/* Footer Thank You Note */}
            <div className="text-center text-[10px] text-zinc-900 font-bold space-y-1">
              <p>{settings.footerMessage}</p>
              <p className="font-black text-black">~ Terima Kasih Atas Kunjungan Anda ~</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
          {/* Status Message Notification */}
          {printMessage && (
            <div
              className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                printMessage.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                  : printMessage.type === 'error'
                  ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                  : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20'
              }`}
            >
              {printMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : printMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              )}
              <span className="flex-1">{printMessage.text}</span>
            </div>
          )}

          {/* 1-CLICK UNIVERSAL PRINT BUTTON */}
          <button
            id="btn-receipt-smart-print"
            type="button"
            onClick={handleSmartPrint}
            disabled={isPrinting}
            className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-black text-sm sm:text-base rounded-xl flex items-center justify-center gap-2.5 shadow-lg shadow-amber-500/20 active:scale-98 transition-all cursor-pointer"
          >
            {isPrinting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Sedang Mencetak Struk...</span>
              </>
            ) : (
              <>
                <Printer className="w-5 h-5" />
                <span>CETAK STRUK SEKARANG</span>
                {btStatus.isConnected && (
                  <span className="ml-1 px-2 py-0.5 text-[10px] font-bold bg-zinc-950/20 rounded-full text-zinc-950">
                    Bluetooth
                  </span>
                )}
              </>
            )}
          </button>

          {/* Input WhatsApp Number Tujuan */}
          <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
            <span className="font-bold text-zinc-600 dark:text-zinc-400 shrink-0">No. WA Pelanggan:</span>
            <input
              type="tel"
              placeholder="Contoh: 08123456789 (Bisa diisi jika kosong)"
              value={customPhoneInput}
              onChange={(e) => setCustomPhoneInput(e.target.value)}
              className="flex-1 bg-transparent text-zinc-950 dark:text-zinc-100 font-mono font-bold outline-hidden px-1 placeholder:text-zinc-400 placeholder:font-normal"
            />
            {customPhoneInput && (
              <button
                type="button"
                onClick={() => setCustomPhoneInput('')}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs font-bold px-1"
                title="Hapus nomor"
              >
                ✕
              </button>
            )}
          </div>

          {/* PRIMARY: KIRIM FOTO STRUK KE WHATSAPP (BUKAN TEKS) */}
          <button
            id="btn-receipt-wa-photo"
            type="button"
            onClick={handleShareWAPhoto}
            disabled={isGeneratingImage}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer"
          >
            {isGeneratingImage ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sedang Menyiapkan Foto Struk...</span>
              </>
            ) : (
              <>
                <MessageCircle className="w-4 h-4 text-emerald-100" />
                <span>KIRIM FOTO STRUK KE WHATSAPP</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-200 font-mono font-black">
                  📸 Foto
                </span>
              </>
            )}
          </button>

          {/* Secondary Quick Options: Unduh Foto PNG & Unduh File PDF */}
          <div className="grid grid-cols-2 gap-2">
            <button
              id="btn-receipt-save-image"
              type="button"
              onClick={handleDownloadImage}
              disabled={isGeneratingImage}
              className="py-2.5 px-3 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              title="Simpan file gambar PNG ke galeri perangkat"
            >
              <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
              <span>Unduh Foto (.PNG)</span>
            </button>
            <button
              id="btn-receipt-pdf"
              type="button"
              onClick={handleDownloadPDF}
              className="py-2.5 px-3 border border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors active:scale-95 cursor-pointer text-zinc-800 dark:text-zinc-200"
            >
              <FileDown className="w-3.5 h-3.5 text-blue-500" />
              <span>Unduh File PDF</span>
            </button>
          </div>

          {/* Toggle for Advanced Options (Bluetooth connect, RawBT, Tab Baru, Teks WA) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="text-[11px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 font-medium underline text-center w-full cursor-pointer py-1"
            >
              {showAdvancedOptions ? '▲ Sembunyikan Pilihan Lain' : '▼ Opsi Printer Lainnya (Bluetooth / RawBT / Teks WA)'}
            </button>

            {showAdvancedOptions && (
              <div className="mt-2 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Pilih Metode Lain:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handlePrintBluetoothManual}
                    className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium flex items-center justify-center gap-1.5 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  >
                    <Bluetooth className="w-3.5 h-3.5 text-blue-500" />
                    <span>Pindai Bluetooth Manual</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRawBTPrint}
                    className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium flex items-center justify-center gap-1.5 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-500" />
                    <span>Cetak via RawBT (HP Android)</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleShareWAText}
                  className="w-full p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium flex items-center justify-center gap-1.5 cursor-pointer hover:bg-zinc-200"
                >
                  <Share2 className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Kirim Format Teks Biasa ke WA (Opsional)</span>
                </button>
                {isIframeEnvironment() && (
                  <button
                    type="button"
                    onClick={() => openAppInNewTab()}
                    className="w-full p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium flex items-center justify-center gap-1.5 cursor-pointer hover:bg-zinc-200"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Kasir di Tab Baru (Untuk Layar Penuh)</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Selesai & Transaksi Baru */}
          <button
            id="btn-receipt-new-transaction"
            type="button"
            onClick={() => {
              onClose();
              onNewTransaction();
            }}
            className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 tracking-wide cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-amber-400" />
            <span>Selesai &amp; Transaksi Baru</span>
          </button>
        </div>
      </div>

      {/* WhatsApp Photo Instruction Modal */}
      {waPhotoModalData && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">
                  <MessageCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-zinc-950 dark:text-zinc-50">
                    Foto Struk Siap Dikirim!
                  </h4>
                  <p className="text-xs text-zinc-500 font-mono">
                    {waPhotoModalData.phone ? `Tujuan: +${waPhotoModalData.phone}` : 'Chat WhatsApp'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWaPhotoModalData(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Image Thumbnail */}
            <div className="p-3 bg-zinc-100 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 flex justify-center max-h-56 overflow-y-auto">
              <img
                src={waPhotoModalData.imageUrl}
                alt="Pratinjau Foto Struk"
                className="max-w-[240px] rounded shadow-md border border-zinc-300"
              />
            </div>

            {/* Instructions */}
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-black text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  {waPhotoModalData.copied
                    ? 'Foto Struk Berhasil Disalin ke Clipboard!'
                    : 'Foto Struk Berhasil Dibuat & Diunduh!'}
                </span>
              </div>
              <p className="leading-relaxed text-[11px] text-zinc-700 dark:text-zinc-300">
                {waPhotoModalData.copied ? (
                  <>
                    Jendela WhatsApp sudah terbuka. Cukup klik pada kolom ketik chat WhatsApp lalu tekan{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400 font-black">
                      Tempel / Paste (Ctrl+V)
                    </strong>{' '}
                    untuk langsung mengirim foto struk ke pelanggan.
                  </>
                ) : (
                  <>
                    Jendela WhatsApp sudah terbuka. Silakan lampirkan (attach) file foto struk yang baru diunduh ke chat WhatsApp pelanggan.
                  </>
                )}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const waUrl = waPhotoModalData.phone
                    ? `https://wa.me/${waPhotoModalData.phone}`
                    : `https://web.whatsapp.com/`;
                  window.open(waUrl, '_blank');
                }}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Chat WA Lagi</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    if (navigator.clipboard && window.ClipboardItem) {
                      await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': waPhotoModalData.blob }),
                      ]);
                      sound.playSuccess();
                      setPrintMessage({ text: 'Foto struk disalin ulang ke Clipboard!', type: 'success' });
                      setTimeout(() => setPrintMessage(null), 3000);
                    }
                  } catch {}
                }}
                className="py-2.5 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <Copy className="w-3.5 h-3.5 text-zinc-500" />
                <span>Salin Ulang Foto</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setWaPhotoModalData(null)}
              className="w-full py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs rounded-xl cursor-pointer"
            >
              Tutup Panduan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

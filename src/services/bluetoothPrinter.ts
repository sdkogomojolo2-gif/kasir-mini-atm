import { Transaction, StoreSettings } from '../types';
import { formatDateIndo, formatRupiah } from './export';

// ESC/POS Command Constants
const ESC = 0x1b;
const GS = 0x1d;

const CMD = {
  INIT: [ESC, 0x40], // Initialize printer
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  TEXT_NORMAL: [GS, 0x21, 0x00],
  TEXT_DOUBLE_HEIGHT: [GS, 0x21, 0x01],
  TEXT_DOUBLE_WIDTH: [GS, 0x21, 0x10],
  TEXT_DOUBLE: [GS, 0x21, 0x11],
  CUT_PAPER: [GS, 0x56, 0x41, 0x03],
};

// Common Bluetooth Printer Service UUIDs
const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard Printer Service
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent UART
  '0000ae30-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 UART
  '0000ff00-0000-1000-8000-00805f9b34fb',
];

export interface BluetoothDeviceStatus {
  isConnected: boolean;
  deviceName: string | null;
  error?: string | null;
  isIframeRestricted?: boolean;
}

export function isIframeEnvironment(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true;
  }
}

export function openAppInNewTab(): void {
  if (typeof window !== 'undefined') {
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
  }
}

class BluetoothThermalPrinter {
  private device: any = null;
  private characteristic: any = null;
  private isConnecting: boolean = false;
  private listeners: Set<(status: BluetoothDeviceStatus) => void> = new Set();

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public getStatus(): BluetoothDeviceStatus {
    return {
      isConnected: Boolean(this.device && this.device.gatt?.connected && this.characteristic),
      deviceName: this.device?.name || null,
    };
  }

  public subscribe(listener: (status: BluetoothDeviceStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach((l) => l(status));
  }

  /**
   * Request user to pick a Bluetooth thermal printer and connect
   */
  public async connect(): Promise<boolean> {
    if (!this.isSupported()) {
      throw new Error(
        'Web Bluetooth tidak didukung pada browser ini. Gunakan Google Chrome pada Android, Windows, Mac, atau ChromeOS.'
      );
    }

    if (this.isConnecting) return false;
    this.isConnecting = true;

    try {
      // Prompt user to pick printer
      const nav = navigator as any;
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICES,
      });

      if (!device) {
        throw new Error('Tidak ada perangkat printer yang dipilih.');
      }

      this.device = device;
      device.addEventListener('gattserverdisconnected', () => {
        this.characteristic = null;
        this.notify();
      });

      // Connect to GATT Server
      const server = await device.gatt.connect();

      // Find writable characteristic across common services
      let targetChar: any = null;

      for (const serviceUuid of PRINTER_SERVICES) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              targetChar = char;
              break;
            }
          }
          if (targetChar) break;
        } catch {
          // Try next service UUID
          continue;
        }
      }

      // If not found in known UUIDs, inspect all available primary services
      if (!targetChar) {
        try {
          const services = await server.getPrimaryServices();
          for (const service of services) {
            const characteristics = await service.getCharacteristics();
            for (const char of characteristics) {
              if (char.properties.write || char.properties.writeWithoutResponse) {
                targetChar = char;
                break;
              }
            }
            if (targetChar) break;
          }
        } catch (e) {
          console.warn('Could not inspect all services:', e);
        }
      }

      if (!targetChar) {
        throw new Error('Karakteristik cetak Bluetooth (write) tidak ditemukan pada perangkat ini.');
      }

      this.characteristic = targetChar;
      this.notify();
      return true;
    } catch (error: any) {
      this.characteristic = null;
      this.notify();

      const errMsg = String(error?.message || error || '');
      const errName = String(error?.name || '');

      // Check for browser Permissions Policy error (running inside an iframe)
      if (
        errName === 'SecurityError' ||
        errMsg.toLowerCase().includes('permissions policy') ||
        errMsg.toLowerCase().includes('disallowed by permissions policy') ||
        errMsg.toLowerCase().includes('disallowed')
      ) {
        const policyError = new Error(
          'Akses Bluetooth dibatasi di dalam jendela pratinjau (iframe). Buka aplikasi di Tab Baru untuk menghubungkan printer Bluetooth.'
        );
        (policyError as any).isIframePolicy = true;
        console.warn('Bluetooth access is disallowed inside iframe by browser permissions policy.');
        throw policyError;
      }

      // Check for user cancelled picker dialog
      if (
        errName === 'NotFoundError' ||
        errMsg.toLowerCase().includes('cancelled') ||
        errMsg.toLowerCase().includes('user cancelled')
      ) {
        const cancelError = new Error('Pemilihan printer Bluetooth dibatalkan.');
        (cancelError as any).isCancelled = true;
        throw cancelError;
      }

      console.error('Bluetooth connection failed:', error);
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.device && this.device.gatt?.connected) {
      await this.device.gatt.disconnect();
    }
    this.device = null;
    this.characteristic = null;
    this.notify();
  }

  /**
   * Send binary buffer to the thermal printer in safe chunks
   */
  private async writeRaw(buffer: Uint8Array): Promise<void> {
    if (!this.characteristic) {
      throw new Error('Printer Bluetooth belum terhubung.');
    }

    const CHUNK_SIZE = 64; // Safe BLE MTU payload
    for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
      const chunk = buffer.slice(i, i + CHUNK_SIZE);
      if (this.characteristic.writeValueWithoutResponse) {
        await this.characteristic.writeValueWithoutResponse(chunk);
      } else {
        await this.characteristic.writeValue(chunk);
      }
      // Small pause between chunks to prevent printer buffer overflow
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  /**
   * Helper to format text with ESC/POS commands
   */
  private createReceiptBytes(transaction: Transaction, settings: StoreSettings): Uint8Array {
    const is80mm = settings.paperSize === '80mm';
    const cols = is80mm ? 48 : 32;

    const encoder = new TextEncoder();
    const bytes: number[] = [];

    const addBytes = (arr: number[]) => bytes.push(...arr);
    const addText = (text: string) => {
      const encoded = encoder.encode(text);
      for (let i = 0; i < encoded.length; i++) {
        bytes.push(encoded[i]);
      }
    };
    const addLine = (text: string = '') => {
      addText(text + '\n');
    };

    const padLine = (left: string, right: string) => {
      const leftLen = left.length;
      const rightLen = right.length;
      const spaces = Math.max(1, cols - leftLen - rightLen);
      return left + ' '.repeat(spaces) + right;
    };

    const separator = '-'.repeat(cols);
    const doubleSeparator = '='.repeat(cols);

    // 1. Initialize Printer
    addBytes(CMD.INIT);

    // 2. Store Header (Centered, Bold, Double Size)
    addBytes(CMD.ALIGN_CENTER);
    addBytes(CMD.TEXT_DOUBLE);
    addBytes(CMD.BOLD_ON);
    addLine(settings.storeName || 'TOKO KELONTONG');

    addBytes(CMD.TEXT_NORMAL);
    addBytes(CMD.BOLD_OFF);
    if (settings.tagline) {
      addLine(settings.tagline);
    }
    addLine(settings.address || 'Jl. Toko Kelontong');
    addLine(`Telp/WA: ${settings.phone || '-'}`);
    addLine(separator);

    // 3. Metadata (Left Aligned)
    addBytes(CMD.ALIGN_LEFT);
    addLine(padLine(`Faktur: ${transaction.invoiceNumber}`, formatDateIndo(transaction.date)));
    addLine(padLine(`Kasir: ${transaction.cashierName}`, `Pmb: ${transaction.paymentMethod}`));
    if (transaction.customerName) {
      addLine(`Pelanggan: ${transaction.customerName}`);
    }
    addLine(separator);

    // 4. Items Table
    transaction.items.forEach((item) => {
      addBytes(CMD.BOLD_ON);
      addLine(item.productName.slice(0, cols));
      addBytes(CMD.BOLD_OFF);

      const qtyPrice = `  ${item.quantity} ${item.unit || 'pcs'} x @${formatRupiah(item.sellPrice).replace('Rp', '').trim()}`;
      const sub = formatRupiah(item.subtotal);
      addLine(padLine(qtyPrice, sub));
    });

    addLine(separator);

    // 5. Totals & Payment
    addLine(padLine('Subtotal:', formatRupiah(transaction.subtotal)));
    if (transaction.discount > 0) {
      addLine(padLine('Diskon:', `-${formatRupiah(transaction.discount)}`));
    }

    addBytes(CMD.BOLD_ON);
    addBytes(CMD.TEXT_DOUBLE_HEIGHT);
    addLine(padLine('TOTAL:', formatRupiah(transaction.grandTotal)));
    addBytes(CMD.TEXT_NORMAL);
    addBytes(CMD.BOLD_OFF);

    if (transaction.paymentMethod === 'TUNAI' && transaction.cashAmount) {
      addLine(padLine('Tunai:', formatRupiah(transaction.cashAmount)));
      addBytes(CMD.BOLD_ON);
      addLine(padLine('Kembalian:', formatRupiah(transaction.changeAmount || 0)));
      addBytes(CMD.BOLD_OFF);
    }

    addLine(doubleSeparator);

    // 6. Footer message
    addBytes(CMD.ALIGN_CENTER);
    if (settings.footerMessage) {
      addLine(settings.footerMessage);
    }
    addLine('~ Terima Kasih Atas Kunjungan Anda ~');
    addLine('Simpan struk ini sebagai bukti sah');

    // 7. Feed lines & Cut paper
    addLine('\n\n\n');
    addBytes(CMD.CUT_PAPER);

    return new Uint8Array(bytes);
  }

  /**
   * Check if user is on Android device
   */
  public isAndroid(): boolean {
    return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
  }

  /**
   * Convert uint8array to base64 string
   */
  private uint8ToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Print using RawBT Print Service app (Standard for Indonesian Android POS)
   * Does NOT require Web Bluetooth or browser security permissions!
   */
  public printWithRawBT(transaction: Transaction, settings: StoreSettings): boolean {
    try {
      const bytes = this.createReceiptBytes(transaction, settings);
      const base64 = this.uint8ToBase64(bytes);
      // RawBT standard custom URI scheme
      const rawbtUrl = `rawbt:data:application/octet-stream;base64,${base64}`;
      window.location.href = rawbtUrl;
      return true;
    } catch (err) {
      console.error('RawBT print failed:', err);
      return false;
    }
  }

  /**
   * Print a complete transaction directly to connected Bluetooth thermal printer
   */
  public async printReceipt(transaction: Transaction, settings: StoreSettings): Promise<void> {
    if (!this.getStatus().isConnected) {
      const connected = await this.connect();
      if (!connected) throw new Error('Koneksi printer Bluetooth dibatalkan.');
    }

    const bytes = this.createReceiptBytes(transaction, settings);
    await this.writeRaw(bytes);
  }

  /**
   * Print a quick self-test ticket to verify connection
   */
  public async printTest(settings: StoreSettings): Promise<void> {
    if (!this.getStatus().isConnected) {
      const connected = await this.connect();
      if (!connected) throw new Error('Koneksi printer Bluetooth dibatalkan.');
    }

    const encoder = new TextEncoder();
    const bytes: number[] = [];
    const addBytes = (arr: number[]) => bytes.push(...arr);
    const addText = (text: string) => {
      const encoded = encoder.encode(text);
      for (let i = 0; i < encoded.length; i++) bytes.push(encoded[i]);
    };
    const addLine = (text: string = '') => addText(text + '\n');

    addBytes(CMD.INIT);
    addBytes(CMD.ALIGN_CENTER);
    addBytes(CMD.TEXT_DOUBLE);
    addBytes(CMD.BOLD_ON);
    addLine('TEST CETAK BERHASIL!');

    addBytes(CMD.TEXT_NORMAL);
    addBytes(CMD.BOLD_OFF);
    addLine(settings.storeName);
    addLine('Koneksi Bluetooth ESC/POS Aktif');
    addLine(`Ukuran Kertas: ${settings.paperSize}`);
    addLine(new Date().toLocaleString('id-ID'));
    addLine('--------------------------------');
    addLine('Printer thermal siap melayani!');
    addLine('\n\n\n');
    addBytes(CMD.CUT_PAPER);

    await this.writeRaw(new Uint8Array(bytes));
  }
}

export const bluetoothPrinter = new BluetoothThermalPrinter();

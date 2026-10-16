import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  Download,
  Upload,
  Key,
  Store,
  QrCode,
  Users,
  Volume2,
  Printer,
  RefreshCw,
  CheckCircle2,
  Lock,
  Cloud,
  CloudUpload,
  FileCode,
  X,
  Image as ImageIcon,
  FileUp,
  Trash2,
  HelpCircle,
  Info,
  Sparkles,
  Eye,
  Check,
  Smartphone,
  Edit2,
  Bluetooth,
  BluetoothConnected,
  HardDrive,
  FileJson,
  Copy,
  ExternalLink,
  Terminal,
  AlertCircle,
  Database,
  Server,
  Radio,
  Zap,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { StoreSettings, CashierUser, FirebaseCustomConfig } from '../types';
import { db } from '../services/db';
import { sound } from '../services/sound';
import {
  getStoredCustomFirebaseConfig,
  isCustomFirebaseEnabled,
  testCustomFirebaseConfig,
  switchActiveFirebase,
  parseFirebaseConfigInput,
  getActiveFirebaseInfo,
} from '../services/firebase';
import {
  bluetoothPrinter,
  BluetoothDeviceStatus,
  isIframeEnvironment,
  openAppInNewTab,
} from '../services/bluetoothPrinter';
import { PWAInstallPrompt } from './PWAInstallPrompt';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
  onSaveSettings: (settings: StoreSettings) => void;
  users: CashierUser[];
  onSaveUsers: (users: CashierUser[]) => void;
  onRestoreCompleted: () => void;
  onUpdateOwner?: (newName: string, newPin?: string) => void;
  onWipeDatabase?: (options?: { wipeCloud?: boolean; resetSettings?: boolean }) => Promise<void> | void;
  onLoadSampleData?: () => void;
  darkMode: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  users,
  onSaveUsers,
  onRestoreCompleted,
  onUpdateOwner,
  onWipeDatabase,
  onLoadSampleData,
  darkMode,
}) => {
  const [activeTab, setActiveTab] = useState<'STORE' | 'PRINTER' | 'QRIS' | 'SECURITY' | 'USERS' | 'CLOUD'>('STORE');

  // Bluetooth thermal printer state
  const [btStatus, setBtStatus] = useState<BluetoothDeviceStatus>(bluetoothPrinter.getStatus());
  const [isBtConnecting, setIsBtConnecting] = useState(false);
  const [isTestingBt, setIsTestingBt] = useState(false);

  // Persistent storage state (Solution #1: Anti-Clear Cache)
  const [isPersisted, setIsPersisted] = useState<boolean | null>(null);
  const [isRequestingPersist, setIsRequestingPersist] = useState(false);
  const [isBtIframeBlocked, setIsBtIframeBlocked] = useState(false);

  useEffect(() => {
    return bluetoothPrinter.subscribe(setBtStatus);
  }, []);

  useEffect(() => {
    db.isStoragePersisted().then(setIsPersisted);
  }, []);

  const handleRequestPersist = async () => {
    setIsRequestingPersist(true);
    try {
      const granted = await db.requestPersistentStorage();
      setIsPersisted(granted);
      if (granted) {
        sound.playSuccess();
        setStatusMsg({
          text: 'Penyimpanan Permanen Aktif! Browser tidak akan menghapus data toko saat memori penuh.',
          type: 'success',
        });
      } else {
        setStatusMsg({
          text: 'Browser belum memberikan izin penyimpanan permanen. Pastikan bookmark toko ini di browser.',
          type: 'error',
        });
      }
    } catch {
      setStatusMsg({ text: 'Gagal meminta izin penyimpanan permanen ke browser.', type: 'error' });
    } finally {
      setIsRequestingPersist(false);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  const handleConnectBt = async () => {
    setIsBtConnecting(true);
    setIsBtIframeBlocked(false);
    try {
      await bluetoothPrinter.connect();
      sound.playSuccess();
      setStatusMsg({ text: 'Printer Bluetooth thermal berhasil terhubung!', type: 'success' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      sound.playError();
      const errMsg = String(err?.message || '');
      if (
        err?.isIframePolicy ||
        errMsg.toLowerCase().includes('permissions policy') ||
        errMsg.toLowerCase().includes('disallowed') ||
        errMsg.toLowerCase().includes('jendela pratinjau')
      ) {
        setIsBtIframeBlocked(true);
        setStatusMsg({
          text: 'Akses Bluetooth dibatasi di jendela pratinjau. Silakan gunakan tombol "Buka di Tab Baru".',
          type: 'error',
        });
      } else if (err?.isCancelled) {
        setStatusMsg({ text: 'Pemilihan printer Bluetooth dibatalkan.', type: 'info' });
      } else {
        setStatusMsg({ text: errMsg || 'Gagal menghubungkan printer Bluetooth.', type: 'error' });
      }
      setTimeout(() => setStatusMsg(null), 5000);
    } finally {
      setIsBtConnecting(false);
    }
  };

  const handleDisconnectBt = async () => {
    await bluetoothPrinter.disconnect();
    sound.playBeep(440, 0.08);
    setStatusMsg({ text: 'Koneksi printer Bluetooth berhasil diputus.', type: 'success' });
    setTimeout(() => setStatusMsg(null), 2500);
  };

  const handleTestPrintBt = async () => {
    setIsTestingBt(true);
    try {
      await bluetoothPrinter.printTest(storeForm);
      sound.playSuccess();
      setStatusMsg({ text: 'Perintah tes cetak berhasil dikirim ke printer!', type: 'success' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      sound.playError();
      const errMsg = String(err?.message || '');
      if (
        err?.isIframePolicy ||
        errMsg.toLowerCase().includes('permissions policy') ||
        errMsg.toLowerCase().includes('disallowed')
      ) {
        setIsBtIframeBlocked(true);
        setStatusMsg({
          text: 'Akses Bluetooth dibatasi di jendela pratinjau. Buka di Tab Baru browser.',
          type: 'error',
        });
      } else {
        setStatusMsg({ text: errMsg || 'Gagal melakukan tes cetak Bluetooth.', type: 'error' });
      }
      setTimeout(() => setStatusMsg(null), 5000);
    } finally {
      setIsTestingBt(false);
    }
  };

  // Store form state
  const [storeForm, setStoreForm] = useState<StoreSettings>(() => {
    const s = { ...settings };
    if (!s.ownerName) s.ownerName = 'Pemilik / Kasir Utama';
    s.qrisMode = 'CUSTOM_IMAGE';
    if (s.showSalesBrochure === undefined) s.showSalesBrochure = true;
    return s;
  });

  // Custom Database Setup state (Tips Nomor 3: Setup Database Mandiri)
  const [firebaseSnippetInput, setFirebaseSnippetInput] = useState('');
  const [fbApiKey, setFbApiKey] = useState('');
  const [fbProjectId, setFbProjectId] = useState('');
  const [fbAppId, setFbAppId] = useState('');
  const [fbAuthDomain, setFbAuthDomain] = useState('');
  const [fbStorageBucket, setFbStorageBucket] = useState('');
  const [fbSenderId, setFbSenderId] = useState('');
  const [isTestingFb, setIsTestingFb] = useState(false);
  const [fbTestResult, setFbTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeFbInfo, setActiveFbInfo] = useState(() => getActiveFirebaseInfo());
  const [showGuideTips, setShowGuideTips] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const s = { ...settings };
      if (!s.ownerName) s.ownerName = 'Pemilik / Kasir Utama';
      s.qrisMode = 'CUSTOM_IMAGE';
      if (s.showSalesBrochure === undefined) s.showSalesBrochure = true;
      setStoreForm(s);
      setUserList([...users]);

      // Load custom Firebase config if present
      const storedFb = getStoredCustomFirebaseConfig() || s.customFirebaseConfig;
      if (storedFb) {
        setFbApiKey(storedFb.apiKey || '');
        setFbProjectId(storedFb.projectId || '');
        setFbAppId(storedFb.appId || '');
        setFbAuthDomain(storedFb.authDomain || '');
        setFbStorageBucket(storedFb.storageBucket || '');
        setFbSenderId(storedFb.messagingSenderId || '');
      }
      setActiveFbInfo(getActiveFirebaseInfo());
      setFbTestResult(null);
    }
  }, [isOpen]);

  // Handle auto-parse snippet when pasted into the quick textarea
  const handleSnippetPaste = (text: string) => {
    setFirebaseSnippetInput(text);
    const parsed = parseFirebaseConfigInput(text);
    if (parsed) {
      setFbApiKey(parsed.apiKey);
      setFbProjectId(parsed.projectId);
      setFbAppId(parsed.appId);
      setFbAuthDomain(parsed.authDomain);
      if (parsed.storageBucket) setFbStorageBucket(parsed.storageBucket);
      if (parsed.messagingSenderId) setFbSenderId(parsed.messagingSenderId);
      sound.playSuccess();
      setStatusMsg({
        text: `Berhasil mengekstrak konfigurasi Firebase proyek "${parsed.projectId}"!`,
        type: 'success',
      });
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  // Test connection directly to Firestore
  const handleTestFirebaseConnection = async () => {
    if (!fbApiKey.trim() || !fbProjectId.trim() || !fbAppId.trim()) {
      setFbTestResult({
        success: false,
        message: 'Mohon lengkapi minimal API Key, Project ID, dan App ID sebelum melakukan tes koneksi.',
      });
      sound.playError();
      return;
    }

    setIsTestingFb(true);
    setFbTestResult(null);

    const configToTest: FirebaseCustomConfig = {
      apiKey: fbApiKey.trim(),
      projectId: fbProjectId.trim(),
      appId: fbAppId.trim(),
      authDomain: fbAuthDomain.trim() || `${fbProjectId.trim()}.firebaseapp.com`,
      storageBucket: fbStorageBucket.trim() || `${fbProjectId.trim()}.appspot.com`,
      messagingSenderId: fbSenderId.trim(),
    };

    const result = await testCustomFirebaseConfig(configToTest);
    setIsTestingFb(false);
    setFbTestResult(result);
    if (result.success) {
      sound.playSuccess();
    } else {
      sound.playError();
    }
  };

  // Save & Connect custom database
  const handleSaveAndConnectFirebase = async () => {
    if (!fbApiKey.trim() || !fbProjectId.trim() || !fbAppId.trim()) {
      setStatusMsg({
        text: 'Mohon isi API Key, Project ID, dan App ID.',
        type: 'error',
      });
      sound.playError();
      setTimeout(() => setStatusMsg(null), 3000);
      return;
    }

    const config: FirebaseCustomConfig = {
      apiKey: fbApiKey.trim(),
      projectId: fbProjectId.trim(),
      appId: fbAppId.trim(),
      authDomain: fbAuthDomain.trim() || `${fbProjectId.trim()}.firebaseapp.com`,
      storageBucket: fbStorageBucket.trim() || `${fbProjectId.trim()}.appspot.com`,
      messagingSenderId: fbSenderId.trim(),
    };

    try {
      await switchActiveFirebase(config, true);
      const updatedStoreForm: StoreSettings = {
        ...storeForm,
        customFirebaseConfig: config,
        enableCloudSync: true,
        cloudSyncMode: 'CUSTOM_FIREBASE',
      };
      setStoreForm(updatedStoreForm);
      onSaveSettings(updatedStoreForm);
      setActiveFbInfo(getActiveFirebaseInfo());
      sound.playSuccess();
      setStatusMsg({
        text: `Sukses! Aplikasi kini tersambung ke database Cloud proyek "${config.projectId}".`,
        type: 'success',
      });
      setTimeout(() => setStatusMsg(null), 3500);
    } catch (err: any) {
      sound.playError();
      setStatusMsg({
        text: `Gagal menyambungkan database: ${err.message}`,
        type: 'error',
      });
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  // Disconnect to local offline mode
  const handleDisconnectToLocalOffline = async () => {
    if (
      confirm(
        'Kembalikan aplikasi ke Mode Offline Lokal?\n\nData toko Anda tetap aman tersimpan di perangkat ini tanpa sinkronisasi internet.'
      )
    ) {
      try {
        await switchActiveFirebase(null, false);
        const updatedStoreForm: StoreSettings = {
          ...storeForm,
          enableCloudSync: false,
          cloudSyncMode: 'LOCAL_OFFLINE',
        };
        setStoreForm(updatedStoreForm);
        onSaveSettings(updatedStoreForm);
        setActiveFbInfo(getActiveFirebaseInfo());
        sound.playBeep(440, 0.05);
        setStatusMsg({
          text: 'Aplikasi kini berjalan dalam Mode Offline Lokal murni.',
          type: 'success',
        });
        setTimeout(() => setStatusMsg(null), 3000);
      } catch (err: any) {
        sound.playError();
      }
    }
  };

  // Handle upload of custom QRIS image
  const handleQrisImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setStatusMsg({ text: 'Ukuran gambar terlalu besar! Maksimal 3MB.', type: 'error' });
      sound.playError();
      setTimeout(() => setStatusMsg(null), 3500);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setStoreForm((prev) => ({
          ...prev,
          qrisImageUrl: base64,
          qrisMode: 'CUSTOM_IMAGE',
        }));
        sound.playSuccess();
        setStatusMsg({ text: 'Gambar QRIS berhasil diunggah!', type: 'success' });
        setTimeout(() => setStatusMsg(null), 3000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveQrisImage = () => {
    setStoreForm((prev) => ({
      ...prev,
      qrisImageUrl: undefined,
      qrisMode: 'CUSTOM_IMAGE',
    }));
    sound.playBeep(440, 0.05);
  };

  // Security form state
  const [vaultPassword, setVaultPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Cloud backup state
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // User manager state
  const [userList, setUserList] = useState<CashierUser[]>([...users]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPin, setNewUserPin] = useState('');
  const [newUserRole, setNewUserRole] = useState<'OWNER' | 'KASIR'>('KASIR');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserName, setEditingUserName] = useState('');
  const [editingUserPin, setEditingUserPin] = useState('');

  if (!isOpen) return null;

  const handleSaveStoreSettings = (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    const formToSave: StoreSettings = {
      ...storeForm,
      qrisMode: 'CUSTOM_IMAGE',
    };
    setStoreForm(formToSave);
    onSaveSettings(formToSave);
    sound.playSuccess();
    setStatusMsg({ text: 'Pengaturan berhasil disimpan!', type: 'success' });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleStartEditUser = (user: CashierUser) => {
    setEditingUserId(user.id);
    setEditingUserName(user.name);
    setEditingUserPin(user.pin);
  };

  const handleSaveEditUser = (userId: string) => {
    if (!editingUserName.trim()) return;
    const updated = userList.map((u) => {
      if (u.id === userId) {
        return {
          ...u,
          name: editingUserName.trim(),
          pin: editingUserPin.trim() || u.pin,
        };
      }
      return u;
    });
    setUserList(updated);
    onSaveUsers(updated);

    const editedUser = updated.find((u) => u.id === userId);
    if (editedUser && editedUser.role === 'OWNER') {
      onUpdateOwner?.(editedUser.name, editedUser.pin);
    }

    setEditingUserId(null);
    sound.playSuccess();
    setStatusMsg({ text: 'Data pengguna kasir/pemilik berhasil diperbarui!', type: 'success' });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  // Download Full JSON Backup (Human-Readable & Safe)
  const handleExportJsonBackup = () => {
    try {
      const jsonString = db.exportJsonBackup();
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cadangan_KasirKelontong_Lengkap_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      sound.playSuccess();
      setStatusMsg({ text: 'File cadangan JSON lengkap berhasil diunduh!', type: 'success' });
      setTimeout(() => setStatusMsg(null), 3500);
    } catch {
      setStatusMsg({ text: 'Gagal membuat file cadangan JSON.', type: 'error' });
    }
  };

  // Download Encrypted AES-256 Backup
  const handleExportBackup = () => {
    try {
      const encryptedString = db.exportEncryptedBackup(vaultPassword || undefined);
      const blob = new Blob([encryptedString], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Backup_KasirKelontong_AES256_${new Date().toISOString().slice(0, 10)}.enc`;
      a.click();
      URL.revokeObjectURL(url);
      sound.playSuccess();
      setStatusMsg({ text: 'File cadangan terenkripsi AES-256 berhasil diunduh!', type: 'success' });
      setTimeout(() => setStatusMsg(null), 3500);
    } catch {
      setStatusMsg({ text: 'Gagal membuat file backup.', type: 'error' });
    }
  };

  // Upload and Restore Universal Backup (.json, .enc, .pos, .db)
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      let success = false;
      // Try JSON first if content looks like JSON
      if (file.name.endsWith('.json') || content.trim().startsWith('{')) {
        success = db.restoreJsonBackup(content);
      }
      // If not successful or encrypted, try encrypted backup
      if (!success) {
        success = db.restoreEncryptedBackup(content, vaultPassword || undefined);
      }

      if (success) {
        sound.playSuccess();
        alert('Database toko berhasil dipulihkan secara menyeluruh! Semua produk, transaksi, dan data telah aktif kembali.');
        onRestoreCompleted();
        onClose();
      } else {
        sound.playError();
        alert('Gagal memulihkan database. Pastikan file valid (.json atau .enc) atau masukkan kata sandi enkripsi yang benar.');
      }
    };
    reader.readAsText(file);
  };

  // Simulate Cloud Sync / Backup
  const handleCloudSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncTime(new Date().toLocaleString('id-ID'));
      sound.playSuccess();
      setStatusMsg({ text: 'Sinkronisasi awan cadangan berhasil diselesaikan!', type: 'success' });
      setTimeout(() => setStatusMsg(null), 3000);
    }, 1200);
  };

  // Add Cashier User
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserPin.trim()) return;

    const newUser: CashierUser = {
      id: `user-${Date.now()}`,
      name: newUserName.trim(),
      username: newUserName.toLowerCase().replace(/\s+/g, ''),
      pin: newUserPin.trim(),
      role: newUserRole,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const updated = [...userList, newUser];
    setUserList(updated);
    onSaveUsers(updated);
    setNewUserName('');
    setNewUserPin('');
    sound.playSuccess();
  };

  const handleDeleteUser = (userId: string) => {
    if (userList.length <= 1) {
      alert('Minimal harus ada 1 pengguna aktif.');
      return;
    }
    const updated = userList.filter((u) => u.id !== userId);
    setUserList(updated);
    onSaveUsers(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div
        className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border my-6 flex flex-col ${
          darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Settings className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-zinc-900 dark:text-zinc-100">
                Pengaturan Sistem MINI ATM-Q
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                Identitas toko, printer thermal, QRIS, akun kasir &amp; database
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-4 bg-zinc-100 dark:bg-zinc-950/80 overflow-x-auto text-xs font-bold gap-1 pt-2">
          <button
            onClick={() => setActiveTab('STORE')}
            className={`px-3 py-2 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'STORE'
                ? 'bg-white dark:bg-zinc-900 text-amber-500 dark:text-amber-400 border-amber-500 shadow-xs font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Profil Toko</span>
          </button>

          <button
            onClick={() => setActiveTab('PRINTER')}
            className={`px-3 py-2 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'PRINTER'
                ? 'bg-white dark:bg-zinc-900 text-amber-500 dark:text-amber-400 border-amber-500 shadow-xs font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Printer Thermal</span>
          </button>

          <button
            onClick={() => setActiveTab('QRIS')}
            className={`px-3 py-2 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'QRIS'
                ? 'bg-white dark:bg-zinc-900 text-amber-500 dark:text-amber-400 border-amber-500 shadow-xs font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>QRIS Pembayaran</span>
          </button>

          <button
            onClick={() => setActiveTab('SECURITY')}
            className={`px-3 py-2 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'SECURITY'
                ? 'bg-white dark:bg-zinc-900 text-amber-500 dark:text-amber-400 border-amber-500 shadow-xs font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Keamanan &amp; Backup</span>
          </button>

          <button
            onClick={() => setActiveTab('USERS')}
            className={`px-3 py-2 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'USERS'
                ? 'bg-white dark:bg-zinc-900 text-amber-500 dark:text-amber-400 border-amber-500 shadow-xs font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Kasir &amp; PIN</span>
          </button>

          <button
            onClick={() => setActiveTab('CLOUD')}
            className={`px-3 py-2 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'CLOUD'
                ? 'bg-white dark:bg-zinc-900 text-amber-500 dark:text-amber-400 border-amber-500 shadow-xs font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Sinkronisasi Awan</span>
          </button>
        </div>

        {/* Status Notification */}
        {statusMsg && (
          <div
            className={`px-6 py-2.5 text-xs font-bold flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-amber-500/10 text-amber-400 border-b border-amber-500/20'
                : 'bg-rose-500/10 text-rose-400 border-b border-rose-500/20'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Tab Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[65vh]">
          {/* TAB 1: PROFIL TOKO (1 TOKO 1 APLIKASI) */}
          {activeTab === 'STORE' && (
            <form onSubmit={handleSaveStoreSettings} className="space-y-4">
              {/* Single Store Identity Info Card */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-white flex items-center gap-2">
                    <span>Profil Resmi Toko Anda</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-mono font-bold">
                      1 Toko 1 Aplikasi
                    </span>
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                    Aplikasi ini dikonfigurasi khusus untuk satu toko ini saja. Seluruh data nama toko, alamat, dan kontak di bawah ini akan tercetak langsung di kepala struk belanja kertas thermal &amp; struk digital WhatsApp.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-zinc-950 dark:text-zinc-200 mb-1">
                    Nama Toko / Agen: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={storeForm.storeName}
                    onChange={(e) => setStoreForm({ ...storeForm, storeName: e.target.value })}
                    placeholder="Contoh: Agen Mini ATM & Konter Berkah"
                    className="w-full px-3 py-2.5 rounded-xl border text-xs font-black bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white placeholder-zinc-400 focus:outline-hidden focus:border-amber-500 shadow-2xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-zinc-950 dark:text-zinc-200 mb-1">
                    Nama Pemilik / Penanggung Jawab:
                  </label>
                  <input
                    type="text"
                    value={storeForm.ownerName || ''}
                    onChange={(e) => setStoreForm({ ...storeForm, ownerName: e.target.value })}
                    placeholder="Contoh: Pak Haji Budi"
                    className="w-full px-3 py-2.5 rounded-xl border text-xs font-black bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white placeholder-zinc-400 focus:outline-hidden focus:border-amber-500 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-zinc-950 dark:text-zinc-200 mb-1">
                  Slogan / Tagline Toko:
                </label>
                <input
                  type="text"
                  value={storeForm.tagline}
                  onChange={(e) => setStoreForm({ ...storeForm, tagline: e.target.value })}
                  placeholder="Contoh: Tarik Tunai, Transfer Bank, Pulsa, E-Wallet & Bayar Tagihan"
                  className="w-full px-3 py-2.5 rounded-xl border text-xs font-bold bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white placeholder-zinc-400 focus:outline-hidden focus:border-amber-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-zinc-950 dark:text-zinc-200 mb-1">
                  Alamat Lengkap Toko (Tercetak di Struk): <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={storeForm.address}
                  onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                  placeholder="Contoh: Jl. Raya Utama No. 88 (Ruko Depan Pasar)"
                  className="w-full px-3 py-2.5 rounded-xl border text-xs font-bold bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white placeholder-zinc-400 focus:outline-hidden focus:border-amber-500 shadow-2xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-zinc-950 dark:text-zinc-200 mb-1 font-mono">
                    No. Telp / WhatsApp Toko (Untuk Kirim Struk): <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={storeForm.phone}
                    onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                    placeholder="Contoh: 081234567890"
                    className="w-full px-3 py-2.5 rounded-xl border text-xs font-mono font-black bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white placeholder-zinc-400 focus:outline-hidden focus:border-amber-500 shadow-2xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-zinc-950 dark:text-zinc-200 mb-1 font-mono">
                    Ukuran Lebar Kertas Struk:
                  </label>
                  <select
                    value={storeForm.paperSize}
                    onChange={(e) => setStoreForm({ ...storeForm, paperSize: e.target.value as '58mm' | '80mm' })}
                    className="w-full px-3 py-2.5 rounded-xl border text-xs bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white font-black focus:outline-hidden focus:border-amber-500 shadow-2xs"
                  >
                    <option value="58mm">58mm (Printer Thermal Standar Mini POS Bluetooth)</option>
                    <option value="80mm">80mm (Printer Thermal Lebar Kasir Supermarket)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-zinc-950 dark:text-zinc-200 mb-1">
                  Pesan Penutup Struk (Footer Pesan Terima Kasih):
                </label>
                <input
                  type="text"
                  value={storeForm.footerMessage}
                  onChange={(e) => setStoreForm({ ...storeForm, footerMessage: e.target.value })}
                  placeholder="Contoh: Simpan struk ini sebagai bukti transaksi sah. Terima kasih!"
                  className="w-full px-3 py-2.5 rounded-xl border text-xs font-bold bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white placeholder-zinc-400 focus:outline-hidden focus:border-amber-500 shadow-2xs"
                />
              </div>

              {/* Toggles */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <label className="flex items-center justify-between cursor-pointer text-xs font-semibold text-zinc-200">
                  <div className="flex items-start gap-2">
                    <Printer className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <span>Cetak Struk Otomatis</span>
                      <p className="text-[10px] text-zinc-400 font-normal">
                        Default Nonaktif: Struk hanya dicetak bila pembeli meminta (hemat kertas thermal).
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={storeForm.autoPrintReceipt}
                    onChange={(e) => setStoreForm({ ...storeForm, autoPrintReceipt: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer text-xs font-semibold text-zinc-200">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-amber-400" />
                    <span>Suara Beep &amp; Audio Saat Scan &amp; Bayar</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={storeForm.playAudioFeedback}
                    onChange={(e) => {
                      setStoreForm({ ...storeForm, playAudioFeedback: e.target.checked });
                      sound.enabled = e.target.checked;
                    }}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </label>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs rounded-xl shadow-md tracking-wide cursor-pointer transition-all active:scale-95 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Profil Toko</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: PRINTER & HARDWARE (SOLUSI NOMOR 2: SILENT PRINTING) */}
          {activeTab === 'PRINTER' && (
            <div className="space-y-6">
              {/* Header Info Banner */}
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200 space-y-1.5">
                <div className="font-extrabold text-sm flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <Printer className="w-5 h-5" />
                  <span>Pengaturan Printer Thermal & Cetak Cepat (ESC/POS)</span>
                </div>
                <p className="opacity-90 leading-relaxed text-slate-600 dark:text-slate-300">
                  Aplikasi mendukung cetak langsung tanpa jendela dialog browser (silent printing) menggunakan <strong>Web Bluetooth ESC/POS</strong> untuk printer kasir thermal nirkabel, serta mode <strong>Kiosk Printing</strong> untuk komputer kasir desktop.
                </p>
              </div>

              {/* PWA Standalone Mode Installation Card */}
              <PWAInstallPrompt variant="settings-card" darkMode={darkMode} />

              {/* Section 1: Bluetooth Thermal Printer */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-4">
                {/* Iframe detection notice */}
                {(isIframeEnvironment() || isBtIframeBlocked) && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-[11px] leading-relaxed">
                        <span className="font-bold">Aplikasi dibuka di Jendela Pratinjau (Iframe):</span> Browser membatasi izin Web Bluetooth pada iframe. Buka aplikasi di Tab Baru untuk menyambungkan printer fisik nirkabel Anda.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openAppInNewTab()}
                      className="py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka di Tab Baru</span>
                    </button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {btStatus.isConnected ? (
                        <BluetoothConnected className="w-6 h-6 text-emerald-500" />
                      ) : (
                        <Bluetooth className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-black text-zinc-950 dark:text-white flex items-center gap-2">
                        <span>Printer Thermal Bluetooth</span>
                        {btStatus.isConnected ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black">
                            Terhubung: {btStatus.deviceName || 'Thermal Printer'}
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-400 font-bold">
                            Belum Terhubung
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-700 dark:text-zinc-300 mt-0.5 font-medium">
                        Cetak struk 1 detik langsung keluar dari printer tanpa popup konfirmasi.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {btStatus.isConnected ? (
                      <button
                        type="button"
                        onClick={handleDisconnectBt}
                        className="py-2 px-3 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-950 dark:text-zinc-200 font-black text-xs rounded-xl transition-all cursor-pointer"
                      >
                        Putuskan
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConnectBt}
                        disabled={isBtConnecting}
                        className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                      >
                        <Bluetooth className="w-3.5 h-3.5" />
                        <span>{isBtConnecting ? 'Mencari...' : 'Pindai & Sambungkan'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleTestPrintBt}
                      disabled={isTestingBt}
                      className="py-2 px-3 border border-blue-400 dark:border-blue-800 bg-white dark:bg-zinc-900 hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-700 dark:text-blue-400 font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{isTestingBt ? 'Mencetak...' : 'Tes Cetak'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-700 dark:text-zinc-300 space-y-1">
                  <div className="font-black text-zinc-950 dark:text-white">
                    Merek &amp; Tipe Printer yang Didukung:
                  </div>
                  <div className="font-medium">
                    Mendukung seluruh printer kasir thermal Bluetooth 58mm &amp; 80mm di pasaran, seperti: <strong>RPP02N, VSC MP-58, Panda, Eppos, Iware, Zjiang, Sunmi, Mini POS, dll.</strong>
                  </div>
                </div>
              </div>

              {/* Section 2: Format Kertas & Struk */}
              <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 space-y-4">
                <div className="font-black text-xs text-zinc-950 dark:text-white">
                  Pengaturan Format Struk Belanja
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-zinc-950 dark:text-zinc-200 mb-1.5">
                      Ukuran Kertas Thermal:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setStoreForm((p) => ({ ...p, receiptPaperSize: '58mm' }))}
                        className={`py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                          (storeForm.receiptPaperSize || '58mm') === '58mm'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700 font-bold'
                        }`}
                      >
                        58 mm (Mini Kasir)
                      </button>
                      <button
                        type="button"
                        onClick={() => setStoreForm((p) => ({ ...p, receiptPaperSize: '80mm' }))}
                        className={`py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                          storeForm.receiptPaperSize === '80mm'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700 font-bold'
                        }`}
                      >
                        80 mm (Standar POS)
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-start gap-2.5 text-xs font-black text-zinc-950 dark:text-zinc-200 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={storeForm.autoPrintReceipt}
                        onChange={(e) => setStoreForm((p) => ({ ...p, autoPrintReceipt: e.target.checked }))}
                        className="w-4 h-4 rounded text-purple-600 border-zinc-300 focus:ring-purple-500 accent-purple-600 mt-0.5"
                      />
                      <div>
                        <span>Cetak struk otomatis saat pembayaran selesai</span>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal">
                          (Default: Nonaktif — hemat kertas &amp; struk hanya dicetak manual bila diminta)
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Section 3: Kiosk Silent Print Guide for Desktop */}
              <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 space-y-3">
                <div className="font-black text-xs text-zinc-950 dark:text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-purple-500" />
                  <span>Panduan Cetak Cepat Tanpa Dialog di PC / Laptop (Mode Kiosk)</span>
                </div>
                <p className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
                  Jika menggunakan PC/Laptop kasir dengan printer USB, Anda dapat mengaktifkan fitur cetak otomatis tanpa dialog (seperti minimarket Indomaret/Alfamart) dengan menambahkan parameter berikut pada pintasan Google Chrome Anda:
                </p>
                <div className="p-3 bg-zinc-950 text-emerald-400 rounded-xl font-mono text-[11px] flex items-center justify-between gap-2 overflow-x-auto border border-zinc-800">
                  <code>chrome.exe --kiosk --kiosk-printing &quot;https://app-anda.com&quot;</code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('chrome.exe --kiosk --kiosk-printing');
                      sound.playSuccess();
                      setStatusMsg({ text: 'Perintah Kiosk berhasil disalin ke clipboard!', type: 'success' });
                      setTimeout(() => setStatusMsg(null), 2500);
                    }}
                    className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg cursor-pointer shrink-0"
                    title="Salin Perintah"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveStoreSettings}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs rounded-xl shadow-md tracking-wide cursor-pointer transition-all active:scale-95 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Pengaturan Printer</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: QRIS PEMBAYARAN (FOTO QRIS SENDIRI) */}
          {activeTab === 'QRIS' && (
            <div className="space-y-6">
              {/* Header Info Banner */}
              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-300 space-y-1.5">
                <div className="font-extrabold text-sm flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-purple-600 dark:text-pink-400" />
                  <span>Pengaturan QRIS Pembayaran Toko</span>
                </div>
                <p className="opacity-90 leading-relaxed text-zinc-700 dark:text-zinc-300">
                  Gunakan foto atau gambar stiker QRIS resmi toko Anda (dari BCA, Mandiri, BRI, BNI, GoPay, OVO, DANA, ShopeePay, dll). Foto QRIS ini akan langsung ditampilkan di layar kasir saat kasir memilih metode pembayaran QRIS agar pembeli dapat langsung scan.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left Side: Upload & Store Label */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4 shadow-2xs">
                    <div>
                      <label className="block text-xs font-black text-zinc-950 dark:text-zinc-200 mb-1">
                        Nama Toko / Nama Merchant QRIS:
                      </label>
                      <input
                        type="text"
                        value={storeForm.qrisMerchantName || ''}
                        onChange={(e) => setStoreForm({ ...storeForm, qrisMerchantName: e.target.value })}
                        placeholder="Contoh: AGEN MINI ATM & KONTER BERKAH"
                        className="w-full px-3 py-2.5 rounded-xl border text-xs font-black uppercase bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white placeholder-zinc-400 focus:outline-hidden focus:border-purple-500 shadow-2xs"
                      />
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 block font-medium">
                        Nama ini akan tercantum di bawah foto barcode QRIS pada layar pembayaran kasir.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-zinc-950 dark:text-zinc-200 mb-2">
                        Unggah File Foto / Gambar QRIS Toko Anda:
                      </label>

                      {storeForm.qrisImageUrl ? (
                        <div className="p-4 rounded-2xl border-2 border-dashed border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col sm:flex-row items-center gap-4">
                          <div className="w-24 h-24 bg-white p-1 rounded-xl shadow-md border border-zinc-200 shrink-0 flex items-center justify-center overflow-hidden">
                            <img
                              src={storeForm.qrisImageUrl}
                              alt="Foto QRIS Toko"
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                          <div className="space-y-2 text-center sm:text-left flex-1">
                            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-center sm:justify-start gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <span>Foto QRIS Berhasil Terpasang</span>
                            </div>
                            <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                              Foto ini siap ditampilkan kepada pelanggan di layar saat memilih pembayaran QRIS di kasir.
                            </p>
                            <div className="flex items-center gap-2 justify-center sm:justify-start pt-1">
                              <label className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-sm">
                                <FileUp className="w-3.5 h-3.5" />
                                <span>Ganti Foto</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleQrisImageUpload}
                                  className="hidden"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={handleRemoveQrisImage}
                                className="px-3.5 py-1.5 rounded-xl border border-rose-300 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-black cursor-pointer transition-colors inline-flex items-center gap-1.5"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus Foto</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <label className="border-2 border-dashed border-purple-300 dark:border-purple-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-all group bg-white dark:bg-zinc-900">
                          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-pink-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <FileUp className="w-6 h-6" />
                          </div>
                          <span className="text-xs font-black text-zinc-900 dark:text-white mb-1">
                            Klik Di Sini Untuk Memilih Foto QRIS Toko Anda
                          </span>
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed">
                            Format file JPG, PNG, atau WebP (Maksimal 3MB). Bisa berupa foto stiker cetak QRIS atau screenshot dari BCA/BRI/Mandiri/GoPay/DANA/ShopeePay.
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleQrisImageUpload}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side: Live Cashier Preview */}
                <div className="lg:col-span-5 flex flex-col items-center">
                  <div className="w-full p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col items-center text-center">
                    <div className="text-[10px] font-black tracking-widest text-zinc-500 uppercase mb-2 font-mono flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-purple-500" />
                      <span>PRATINJAU LANGSUNG DI KASIR</span>
                    </div>

                    {/* QR Preview Frame */}
                    <div className="bg-white p-3 rounded-2xl border-2 border-zinc-200 dark:border-zinc-300 shadow-inner flex flex-col items-center max-w-[220px] w-full my-2">
                      <div className="text-[9px] font-black tracking-widest text-zinc-800 uppercase mb-1.5 font-mono">
                        QRIS RESMI TOKO
                      </div>

                      {storeForm.qrisImageUrl ? (
                        <div className="w-[170px] h-[170px] flex items-center justify-center overflow-hidden bg-white p-1">
                          <img
                            src={storeForm.qrisImageUrl}
                            alt="Preview QRIS"
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-[170px] h-[170px] flex flex-col items-center justify-center p-3 text-center bg-zinc-50 rounded-xl border border-dashed border-zinc-300">
                          <ImageIcon className="w-8 h-8 text-zinc-400 mb-1.5" />
                          <span className="text-[11px] font-black text-zinc-700">Foto QRIS Belum Ada</span>
                          <span className="text-[9px] text-zinc-500 mt-0.5">Unggah foto di samping kiri</span>
                        </div>
                      )}

                      <div className="text-[10px] font-black font-mono text-zinc-900 mt-2 truncate max-w-full px-1">
                        {storeForm.qrisMerchantName || storeForm.storeName || 'NAMA TOKO ANDA'}
                      </div>
                    </div>

                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 px-2 leading-relaxed">
                      <span className="font-bold text-purple-600 dark:text-pink-400">💡 Tampilan Kasir:</span> Pelanggan akan melihat foto QRIS di atas pada saat transaksi untuk pembayaran non-tunai.
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-3 flex justify-end border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={handleSaveStoreSettings}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xs rounded-xl shadow-lg tracking-wide cursor-pointer transition-all active:scale-95 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Pengaturan QRIS Toko</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: KEAMANAN & CADANGAN DATABASE (SOLUSI NOMOR 1) */}
          {activeTab === 'SECURITY' && (
            <div className="space-y-4">
              {/* Solution 1: Persistent Storage Status Card */}
              <div className="p-4 rounded-2xl border border-purple-500/20 bg-purple-500/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-purple-600 dark:text-pink-400" />
                    <div>
                      <div className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <span>Penyimpanan Permanen Browser (Anti-Hapus)</span>
                        {isPersisted ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Aktif & Dilindungi
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold">
                            Siap Diaktifkan
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        Data kasir dicadangkan otomatis ganda ke <strong>LocalStorage + IndexedDB</strong>.
                      </p>
                    </div>
                  </div>

                  {!isPersisted && (
                    <button
                      type="button"
                      onClick={handleRequestPersist}
                      disabled={isRequestingPersist}
                      className="py-1.5 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all active:scale-95 shrink-0"
                    >
                      {isRequestingPersist ? 'Meminta Izin...' : 'Kunci Penyimpanan Permanen'}
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Dengan mengaktifkan fitur ini, browser Chrome/Android/Edge tidak akan pernah menghapus data toko Anda secara otomatis meskipun memori penyimpanan ponsel atau laptop hampir penuh.
                </p>
              </div>

              {/* Master Password Input */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 font-mono">
                  Kunci Vault Kustom / Master Password (Opsional):
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
                  <input
                    type="password"
                    value={vaultPassword}
                    onChange={(e) => setVaultPassword(e.target.value)}
                    placeholder="Masukkan kunci enkripsi kustom jika ingin..."
                    className="w-full pl-10 pr-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Backup & Restore Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Export JSON (Universal) */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                      <FileJson className="w-4 h-4 text-emerald-500" />
                      <span>Cadangan Lengkap (.json)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                      Format standar terbuka berisi produk, stok, transaksi, hutang, dan profil toko.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportJsonBackup}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh .json</span>
                  </button>
                </div>

                {/* Export Encrypted File */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                      <ShieldCheck className="w-4 h-4 text-purple-500" />
                      <span>Cadangan Enkripsi (.enc)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                      Terkunci dengan enkripsi AES-256 militer, aman disimpan di flashdisk publik.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh .enc</span>
                  </button>
                </div>

                {/* Universal Restore File */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                      <Upload className="w-4 h-4 text-pink-500" />
                      <span>Pulihkan Database (Restore)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                      Unggah file cadangan (.json atau .enc) untuk mengembalikan seluruh data toko.
                    </p>
                  </div>
                  <label className="w-full py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Pilih File Backup</span>
                    <input
                      type="file"
                      accept=".json,.enc,.pos,.db"
                      onChange={handleImportBackup}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Database Clean & Wipe Section (To prevent mixing with old data) */}
              <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/5 space-y-3">
                <div className="flex items-center gap-2 text-rose-500 font-bold text-xs">
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <span>Hapus &amp; Bersihkan Database (Agar Tidak Tercampur Data Lama)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Fitur ini dirancang khusus untuk mengosongkan seluruh database toko. Semua data produk lama, transaksi kasir, hutang kasbon, shift, dan keranjang belanja akan dihapus total sehingga pembukuan Anda benar-benar bersih dan tidak tercampur data lama.
                </p>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  {/* Primary Total Wipe Button */}
                  <button
                    type="button"
                    onClick={async () => {
                      const confirm1 = confirm(
                        'PERINGATAN RESMI: Apakah Anda yakin ingin MENGHAPUS TOTAL seluruh database aplikasi ini?\n\n' +
                        'Yang akan dihapus permanen:\n' +
                        '• Seluruh katalog produk (menjadi 0 barang)\n' +
                        '• Semua riwayat penjualan & struk transaksi\n' +
                        '• Semua catatan hutang piutang pelanggan\n' +
                        '• Semua riwayat shift kasir & log stok\n\n' +
                        'Aplikasi akan menjadi 100% BERSIH tanpa ada data lama yang tercampur. Lanjutkan?'
                      );
                      if (confirm1) {
                        const confirm2 = confirm('Konfirmasi Terakhir: Anda benar-benar ingin mengosongkan database sekarang? Tindakan ini tidak dapat dibatalkan.');
                        if (confirm2) {
                          if (onWipeDatabase) {
                            await onWipeDatabase({ wipeCloud: true, resetSettings: false });
                          } else {
                            db.wipeAllData();
                            onRestoreCompleted();
                          }
                          sound.playSuccess();
                          alert('Database aplikasi BERHASIL DIHAPUS TOTAL!\n\nSeluruh produk, transaksi, dan riwayat lama telah dibersihkan. Anda sekarang dapat mulai memasukkan data toko yang baru dari nol.');
                        }
                      }
                    }}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl cursor-pointer shadow-lg transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>HAPUS &amp; BERSIHKAN SELURUH DATABASE SEKARANG</span>
                  </button>

                  {/* Clean Transactions Only */}
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Apakah Anda ingin membersihkan seluruh riwayat transaksi, kasbon, dan shift saja? (Data produk toko Anda tetap AMAN dan tidak dihapus)')) {
                        db.clearTransactionsAndHistory();
                        onRestoreCompleted();
                        sound.playSuccess();
                        alert('Riwayat transaksi dan hutang berhasil dibersihkan! Katalog produk toko Anda tetap tersimpan.');
                      }
                    }}
                    className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-xs rounded-xl cursor-pointer transition-all active:scale-95"
                  >
                    Bersihkan Riwayat Transaksi Saja
                  </button>

                  {/* Optional Load Sample Products */}
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Muat katalog layanan Mini ATM (Tarik/Setor/Transfer Bank), Pulsa, Paket Data, Top-up E-Wallet, Token Listrik, & PPOB sebagai sampel?')) {
                        if (onLoadSampleData) {
                          onLoadSampleData();
                        } else {
                          db.loadSampleMiniAtmProducts();
                          onRestoreCompleted();
                        }
                        sound.playSuccess();
                        alert('Katalog sampel layanan Mini ATM & Konter Pulsa berhasil dimuat!');
                      }
                    }}
                    className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 font-bold text-xs rounded-xl cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Muat Contoh Layanan Mini ATM &amp; Pulsa (Demo)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: KELOLA KASIR & PIN */}
          {activeTab === 'USERS' && (
            <div className="space-y-4">
              {/* Existing Users List */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-zinc-950 dark:text-zinc-200 font-mono">DAFTAR KASIR &amp; AKSES:</label>
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
                  {userList.map((u) => (
                    <div key={u.id} className="p-3.5 bg-white dark:bg-zinc-900 transition-colors">
                      {editingUserId === u.id ? (
                        <div className="space-y-2">
                          <div className="text-xs font-black text-purple-700 dark:text-pink-400">
                            Edit Data {u.role === 'OWNER' ? 'Pemilik Toko' : 'Kasir'}:
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] font-bold text-zinc-950 dark:text-zinc-300 mb-0.5">Nama Pengguna:</label>
                              <input
                                type="text"
                                value={editingUserName}
                                onChange={(e) => setEditingUserName(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border text-xs font-black text-zinc-950 dark:text-white bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-zinc-950 dark:text-zinc-300 mb-0.5">PIN Masuk Baru (4-6 Digit):</label>
                              <input
                                type="password"
                                maxLength={6}
                                value={editingUserPin}
                                onChange={(e) => setEditingUserPin(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-black text-zinc-950 dark:text-white bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                required
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingUserId(null)}
                              className="px-3 py-1 rounded-lg text-xs font-bold text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditUser(u.id)}
                              className="px-3.5 py-1 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-lg cursor-pointer shadow-sm"
                            >
                              Simpan
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <div className="font-black flex items-center gap-2 text-zinc-950 dark:text-zinc-100">
                              <span className="text-sm font-black text-zinc-950 dark:text-white">{u.name}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-900 dark:text-pink-300 font-mono font-black border border-purple-300 dark:border-purple-800">
                                {u.role === 'OWNER' ? '👑 Pemilik' : 'Kasir'}
                              </span>
                            </div>
                            <div className="text-zinc-800 dark:text-zinc-300 text-xs font-mono font-bold mt-0.5">PIN Masuk: •••• (Tersimpan Aman)</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleStartEditUser(u)}
                              className="text-purple-700 dark:text-pink-400 hover:underline text-xs font-black flex items-center gap-1 cursor-pointer px-2 py-1 rounded hover:bg-purple-50 dark:hover:bg-purple-950/40"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            {u.role !== 'OWNER' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u.id)}
                                className="text-rose-600 dark:text-rose-400 hover:text-rose-700 text-xs font-black cursor-pointer px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              >
                                Hapus
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Cashier */}
              <form onSubmit={handleAddUser} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
                <h4 className="font-black text-xs text-zinc-950 dark:text-zinc-100 tracking-tight">Tambah Kasir Baru</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Nama Kasir (contoh: Rina)"
                    className="px-3 py-1.5 rounded-lg border text-xs font-bold text-zinc-950 dark:text-white bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-zinc-400"
                    required
                  />
                  <input
                    type="password"
                    maxLength={6}
                    value={newUserPin}
                    onChange={(e) => setNewUserPin(e.target.value)}
                    placeholder="PIN 4 Digit (contoh: 2222)"
                    className="px-3 py-1.5 rounded-lg border text-xs font-mono font-bold text-zinc-950 dark:text-white bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-zinc-400"
                    required
                  />
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as 'OWNER' | 'KASIR')}
                    className="px-3 py-1.5 rounded-lg border text-xs font-black text-zinc-950 dark:text-white bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="KASIR">Kasir</option>
                    <option value="OWNER">Pemilik Toko</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-lg cursor-pointer shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <span>+ Simpan Kasir Baru</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 5: FORM SETUP DATABASE MANDIRI & SINKRONISASI CLOUD (TIPS NOMOR 3) */}
          {activeTab === 'CLOUD' && (
            <div className="space-y-5">
              {/* 1. Real-time Connection Status Banner */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  activeFbInfo.isCustom && activeFbInfo.isEnabled
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        activeFbInfo.isCustom && activeFbInfo.isEnabled
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black tracking-wide uppercase text-white">
                          Status Database Cloud:
                        </span>
                        {activeFbInfo.isCustom && activeFbInfo.isEnabled ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5 animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            🟢 Tersambung ke Cloud Mandiri
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-zinc-400" />
                            ⚪ Mode Offline Lokal (Aman di Perangkat)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                        {activeFbInfo.isCustom && activeFbInfo.isEnabled ? (
                          <>
                            Aplikasi aktif terhubung ke Google Firebase proyek:{' '}
                            <strong className="text-emerald-400 font-mono font-bold">
                              {activeFbInfo.projectId}
                            </strong>
                            . Seluruh transaksi kasir dicadangkan ke database milik toko ini secara otomatis.
                          </>
                        ) : (
                          <>
                            Aplikasi saat ini berjalan dalam <strong>Mode Offline Lokal murni</strong>. Seluruh data transaksi, kasbon, dan produk tersimpan 100% aman di memori perangkat ini (IndexedDB &amp; LocalStorage).
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {activeFbInfo.isCustom && activeFbInfo.isEnabled && (
                    <button
                      type="button"
                      onClick={handleDisconnectToLocalOffline}
                      className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-bold shrink-0 cursor-pointer transition-all active:scale-95"
                    >
                      Putuskan Koneksi (Kembali ke Offline)
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Educational Value & Logic Explanation (Tips Nomor 3) */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-amber-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-extrabold flex items-center gap-2 text-amber-400 text-xs">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Fitur Setup Database Mandiri (1 Aplikasi Untuk Semua Toko)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGuideTips(!showGuideTips)}
                    className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <span>{showGuideTips ? 'Tutup Panduan' : 'Lihat Cara Bikin Firebase (3 Menit)'}</span>
                    {showGuideTips ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Dengan fitur ini, Anda <strong>cukup memelihara 1 master aplikasi kasir tunggal</strong>. Saat menjual ke Toko A, Toko B, atau Agen Mini ATM lain, Anda <em>tidak perlu repot ganti kodingan, build ulang, atau sewa banyak hosting</em>. Cukup masukkan konfigurasi Firebase milik toko di bawah ini, klik <strong>Tes &amp; Sambungkan</strong>, dan database toko langsung terpisah secara mandiri!
                </p>

                {/* Collapsible Step-by-Step Guide for Firebase Console */}
                {showGuideTips && (
                  <div className="pt-3 border-t border-zinc-800/80 space-y-3 text-xs">
                    <div className="text-[11px] font-black uppercase text-amber-300 font-mono tracking-wider">
                      Langkah 3 Menit Membuat Database Gratis di Google Firebase:
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1">
                        <div className="text-amber-400 font-black text-xs">1. Buat Proyek</div>
                        <p className="text-[11px] text-zinc-400 leading-snug">
                          Buka <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-amber-400 underline inline-flex items-center gap-0.5">console.firebase.google.com <ExternalLink className="w-3 h-3" /></a> dengan akun Google. Klik <strong>Add Project</strong> (misal: <em>sembako-barokah</em>).
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1">
                        <div className="text-amber-400 font-black text-xs">2. Buat Firestore DB</div>
                        <p className="text-[11px] text-zinc-400 leading-snug">
                          Masuk menu <strong>Firestore Database</strong> &gt; Klik <strong>Create database</strong> &gt; Pilih lokasi (misal: <em>asia-southeast1 / Jakarta</em>) &gt; Pilih <strong>Start in test mode</strong> &gt; Selesai.
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1">
                        <div className="text-amber-400 font-black text-xs">3. Salin Konfigurasi Web</div>
                        <p className="text-[11px] text-zinc-400 leading-snug">
                          Klik ikon <strong>&lt;/&gt; (Web App)</strong> di dashboard proyek &gt; Salin kode <code className="text-amber-300">firebaseConfig</code> &gt; Tempel ke kotak di bawah ini!
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Quick Paste & Auto-Extraction Area */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-purple-400" />
                    <span>Metode Cepat: Tempel (Paste) Kode Konfigurasi Firebase dari Google</span>
                  </label>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30 font-bold">
                    Otomatis Ekstrak
                  </span>
                </div>

                <div className="space-y-2">
                  <textarea
                    rows={4}
                    value={firebaseSnippetInput}
                    onChange={(e) => handleSnippetPaste(e.target.value)}
                    placeholder={`Tempel teks konfigurasi dari Firebase Console di sini...\nContoh:\nconst firebaseConfig = {\n  apiKey: "AIzaSyD-example...",\n  projectId: "toko-barokah",\n  appId: "1:1055880338253:web:28c3..."\n};`}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300 placeholder-zinc-500 focus:outline-hidden focus:border-purple-500"
                  />
                  <span className="text-[10px] text-zinc-500 block leading-tight">
                    💡 Sistem otomatis membaca dan mengekstrak API Key, Project ID, dan App ID tanpa perlu mengetik manual.
                  </span>
                </div>
              </div>

              {/* 4. Structured Form Fields */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                  <h4 className="font-black text-xs text-white flex items-center gap-2">
                    <Server className="w-4 h-4 text-amber-400" />
                    <span>Rincian Konfigurasi Database Toko Ini:</span>
                  </h4>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    Tersimpan di Penyimpanan Lokal Perangkat Toko (LocalStorage)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-black text-zinc-300 mb-1">
                      Project ID Google Firebase: <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={fbProjectId}
                      onChange={(e) => setFbProjectId(e.target.value.trim())}
                      placeholder="Contoh: sembako-barokah-app"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-amber-400 font-mono font-bold placeholder-zinc-500 focus:outline-hidden focus:border-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-zinc-300 mb-1">
                      Web App ID: <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={fbAppId}
                      onChange={(e) => setFbAppId(e.target.value.trim())}
                      placeholder="Contoh: 1:123456789:web:abcdef123"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono text-[11px] placeholder-zinc-500 focus:outline-hidden focus:border-amber-500"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-black text-zinc-300 mb-1">
                      API Key (Web API Key): <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={fbApiKey}
                      onChange={(e) => setFbApiKey(e.target.value.trim())}
                      placeholder="Contoh: AIzaSyApZ9y1D0RiXkSdk..."
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono text-[11px] placeholder-zinc-500 focus:outline-hidden focus:border-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-zinc-400 mb-1">
                      Auth Domain (Opsional):
                    </label>
                    <input
                      type="text"
                      value={fbAuthDomain}
                      onChange={(e) => setFbAuthDomain(e.target.value.trim())}
                      placeholder={fbProjectId ? `${fbProjectId}.firebaseapp.com` : 'nama-project.firebaseapp.com'}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-[11px] placeholder-zinc-600 focus:outline-hidden focus:border-zinc-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-zinc-400 mb-1">
                      Storage Bucket (Opsional):
                    </label>
                    <input
                      type="text"
                      value={fbStorageBucket}
                      onChange={(e) => setFbStorageBucket(e.target.value.trim())}
                      placeholder={fbProjectId ? `${fbProjectId}.appspot.com` : 'nama-project.appspot.com'}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-[11px] placeholder-zinc-600 focus:outline-hidden focus:border-zinc-600"
                    />
                  </div>
                </div>

                {/* Test Result Feedback Box */}
                {fbTestResult && (
                  <div
                    className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs font-semibold ${
                      fbTestResult.success
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                    }`}
                  >
                    {fbTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="font-bold">
                        {fbTestResult.success ? 'Uji Koneksi Berhasil!' : 'Uji Koneksi Gagal'}
                      </div>
                      <div className="text-[11px] mt-0.5 opacity-90 leading-relaxed font-normal">
                        {fbTestResult.message}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons: Test Connection & Save */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={handleTestFirebaseConnection}
                    disabled={isTestingFb || !fbProjectId || !fbApiKey}
                    className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-700"
                  >
                    {isTestingFb ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        <span>Menguji Sambungan ke Google...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>🧪 Tes Sambungan Database</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveAndConnectFirebase}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-xs flex items-center gap-2 shadow-lg cursor-pointer transition-all active:scale-95"
                    >
                      <Check className="w-4 h-4" />
                      <span>💾 Simpan &amp; Sambungkan Database Toko</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 5. Store ID & Multi-Tenant Isolation */}
              <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-950 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-400" />
                    <span>Kode Lisensi Toko / Sub-Folder Cloud:</span>
                  </h4>
                  <span className="text-[10px] text-zinc-500 font-mono">Multi-Tenant Store ID</span>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={storeForm.storeId || ''}
                    onChange={(e) =>
                      setStoreForm({
                        ...storeForm,
                        storeId: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
                      })
                    }
                    placeholder="Contoh: toko_barokah_01"
                    className="w-full px-3 py-2.5 rounded-xl border text-xs font-mono font-bold bg-zinc-900 border-zinc-800 text-amber-400 focus:outline-hidden focus:border-amber-500"
                  />
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Kode ini memastikan database terorganisir per toko (misal: <code className="text-amber-400">toko_barokah_01</code>, <code className="text-amber-400">konter_cell_02</code>).
                  </p>
                </div>

                {/* Direct Link Generator */}
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1.5">
                  <div className="text-[10px] font-mono font-bold text-zinc-400 uppercase">
                    Link Akses Langsung Khusus Toko Ini (Bisa Dibuka di HP Kasir):
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={
                        typeof window !== 'undefined'
                          ? `${window.location.origin}${window.location.pathname}?store=${storeForm.storeId || 'toko_utama'}`
                          : `?store=${storeForm.storeId || 'toko_utama'}`
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-300 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const link = `${window.location.origin}${window.location.pathname}?store=${storeForm.storeId || 'toko_utama'}`;
                        navigator.clipboard.writeText(link);
                        sound.playSuccess();
                        setStatusMsg({ text: 'Link akses toko berhasil disalin!', type: 'success' });
                        setTimeout(() => setStatusMsg(null), 2500);
                      }}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer transition-all active:scale-95"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin</span>
                    </button>
                  </div>
                </div>

                {/* Manual Push Button */}
                <div className="pt-2 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={handleCloudSync}
                    disabled={isSyncing}
                    className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl border border-zinc-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <CloudUpload className="w-4 h-4 text-amber-400" />
                    <span>{isSyncing ? 'Sedang Menyinkronkan...' : 'Unggah Paksa Cadangan Saat Ini ke Cloud'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

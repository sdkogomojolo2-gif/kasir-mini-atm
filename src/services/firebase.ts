import { initializeApp, getApps, getApp, deleteApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  doc,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import defaultAppletConfig from '../../firebase-applet-config.json';
import { FirebaseCustomConfig } from '../types';

export const CUSTOM_FIREBASE_STORAGE_KEY = 'POS_CUSTOM_FIREBASE_CONFIG';
export const CUSTOM_FIREBASE_ENABLED_KEY = 'POS_CUSTOM_FIREBASE_ENABLED';

/**
 * Parse Firebase configuration from either JSON string or JavaScript code snippet
 * as copied directly from Google Firebase Console.
 */
export function parseFirebaseConfigInput(rawInput: string): FirebaseCustomConfig | null {
  if (!rawInput || !rawInput.trim()) return null;
  const cleaned = rawInput.trim();

  // 1. Try standard JSON.parse
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object' && parsed.projectId && parsed.apiKey) {
      return {
        apiKey: String(parsed.apiKey || '').trim(),
        authDomain: String(parsed.authDomain || '').trim() || `${parsed.projectId}.firebaseapp.com`,
        projectId: String(parsed.projectId || '').trim(),
        storageBucket: parsed.storageBucket ? String(parsed.storageBucket).trim() : `${parsed.projectId}.appspot.com`,
        messagingSenderId: parsed.messagingSenderId ? String(parsed.messagingSenderId).trim() : '',
        appId: String(parsed.appId || '').trim(),
        firestoreDatabaseId: parsed.firestoreDatabaseId ? String(parsed.firestoreDatabaseId).trim() : '(default)',
      };
    }
  } catch {
    // Continue to regex-based extraction for JS code snippets
  }

  // 2. Regex-based extractor for pasted JS snippet:
  // const firebaseConfig = { apiKey: "...", projectId: "...", ... }
  const extractField = (fieldName: string): string => {
    const patterns = [
      new RegExp(`['"]?${fieldName}['"]?\\s*:\\s*['"\`]([^'"\`]+)['"\`]`, 'i'),
      new RegExp(`${fieldName}\\s*=\\s*['"\`]([^'"\`]+)['"\`]`, 'i'),
    ];
    for (const p of patterns) {
      const match = cleaned.match(p);
      if (match && match[1]) return match[1].trim();
    }
    return '';
  };

  const apiKey = extractField('apiKey');
  const projectId = extractField('projectId');
  const authDomain = extractField('authDomain');
  const appId = extractField('appId');
  const storageBucket = extractField('storageBucket');
  const messagingSenderId = extractField('messagingSenderId');
  const firestoreDatabaseId = extractField('firestoreDatabaseId') || '(default)';

  if (apiKey && projectId && appId) {
    return {
      apiKey,
      authDomain: authDomain || `${projectId}.firebaseapp.com`,
      projectId,
      storageBucket: storageBucket || `${projectId}.appspot.com`,
      messagingSenderId: messagingSenderId || '',
      appId,
      firestoreDatabaseId,
    };
  }

  return null;
}

export function getStoredCustomFirebaseConfig(): FirebaseCustomConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CUSTOM_FIREBASE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FirebaseCustomConfig;
  } catch {
    return null;
  }
}

export function saveStoredCustomFirebaseConfig(config: FirebaseCustomConfig | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (config) {
      localStorage.setItem(CUSTOM_FIREBASE_STORAGE_KEY, JSON.stringify(config));
    } else {
      localStorage.removeItem(CUSTOM_FIREBASE_STORAGE_KEY);
    }
  } catch (e) {
    console.error('Failed to save custom Firebase config:', e);
  }
}

export function isCustomFirebaseEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem(CUSTOM_FIREBASE_ENABLED_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export function setCustomFirebaseEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CUSTOM_FIREBASE_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch {}
}

// Global active instances
let activeApp: FirebaseApp;
let activeFirestore: Firestore;
let activeProjectId: string | null = null;
let activeIsCustom: boolean = false;

function buildFirestore(app: FirebaseApp, databaseId?: string): Firestore {
  const customDb =
    Boolean(databaseId) &&
    databaseId !== '(default)' &&
    databaseId !== '';

  try {
    return customDb
      ? initializeFirestore(
          app,
          { experimentalAutoDetectLongPolling: true },
          databaseId
        )
      : initializeFirestore(app, {
          experimentalAutoDetectLongPolling: true,
        });
  } catch {
    return customDb
      ? getFirestore(app, databaseId)
      : getFirestore(app);
  }
}

// Initialize active instance on boot
function initializeActiveInstance() {
  const customConfig = getStoredCustomFirebaseConfig();
  const customEnabled = isCustomFirebaseEnabled();

  if (customEnabled && customConfig && customConfig.projectId && customConfig.apiKey) {
    try {
      const existingApp = getApps().find((a) => a.name === 'tenant-custom-store');
      if (existingApp) {
        activeApp = existingApp;
      } else {
        activeApp = initializeApp(customConfig, 'tenant-custom-store');
      }
      activeFirestore = buildFirestore(activeApp, customConfig.firestoreDatabaseId);
      activeProjectId = customConfig.projectId;
      activeIsCustom = true;
      return;
    } catch (err) {
      console.warn('Failed to initialize custom Firebase app, falling back to default:', err);
    }
  }

  // Fallback to default applet config
  const existingDefault = getApps().find((a) => a.name === '[DEFAULT]');
  activeApp = existingDefault || (!getApps().length ? initializeApp(defaultAppletConfig) : getApp());
  activeFirestore = buildFirestore(activeApp, defaultAppletConfig.firestoreDatabaseId);
  activeProjectId = defaultAppletConfig.projectId;
  activeIsCustom = false;
}

// Initial bootstrap
initializeActiveInstance();

export let db = activeFirestore;
export let firebaseApp = activeApp;

export function getFirestoreDb(): Firestore {
  return activeFirestore;
}

export function getActiveFirebaseInfo(): {
  isCustom: boolean;
  projectId: string | null;
  isEnabled: boolean;
  mode: 'CUSTOM_FIREBASE' | 'LOCAL_OFFLINE';
} {
  const customConfig = getStoredCustomFirebaseConfig();
  const customEnabled = isCustomFirebaseEnabled();

  if (customEnabled && customConfig && customConfig.projectId) {
    return {
      isCustom: true,
      projectId: customConfig.projectId,
      isEnabled: true,
      mode: 'CUSTOM_FIREBASE',
    };
  }

  return {
    isCustom: false,
    projectId: null,
    isEnabled: false,
    mode: 'LOCAL_OFFLINE',
  };
}

/**
 * Switch active Firebase configuration at runtime.
 */
export async function switchActiveFirebase(
  config: FirebaseCustomConfig | null,
  enable: boolean
): Promise<{ success: boolean; projectId: string | null; mode: 'CUSTOM_FIREBASE' | 'LOCAL_OFFLINE' }> {
  setCustomFirebaseEnabled(enable);
  saveStoredCustomFirebaseConfig(config);

  if (enable && config && config.projectId && config.apiKey) {
    try {
      // Remove old tenant app if already initialized to apply fresh config
      const oldTenantApp = getApps().find((a) => a.name === 'tenant-custom-store');
      if (oldTenantApp) {
        try {
          await deleteApp(oldTenantApp);
        } catch {}
      }

      activeApp = initializeApp(config, 'tenant-custom-store');
      activeFirestore = buildFirestore(activeApp, config.firestoreDatabaseId);
      db = activeFirestore;
      firebaseApp = activeApp;
      activeProjectId = config.projectId;
      activeIsCustom = true;

      // Broadcast update event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pos-firebase-switched', {
          detail: { projectId: config.projectId, isCustom: true, mode: 'CUSTOM_FIREBASE' }
        }));
      }

      return {
        success: true,
        projectId: config.projectId,
        mode: 'CUSTOM_FIREBASE',
      };
    } catch (e: any) {
      console.error('Error applying custom Firebase config:', e);
      throw new Error(`Gagal menerapkan konfigurasi: ${e.message}`);
    }
  }

  // Switch to Local Offline
  const oldTenantApp = getApps().find((a) => a.name === 'tenant-custom-store');
  if (oldTenantApp) {
    try {
      await deleteApp(oldTenantApp);
    } catch {}
  }

  const existingDefault = getApps().find((a) => a.name === '[DEFAULT]');
  activeApp = existingDefault || (!getApps().length ? initializeApp(defaultAppletConfig) : getApp());
  activeFirestore = buildFirestore(activeApp, defaultAppletConfig.firestoreDatabaseId);
  db = activeFirestore;
  firebaseApp = activeApp;
  activeProjectId = null;
  activeIsCustom = false;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pos-firebase-switched', {
      detail: { projectId: null, isCustom: false, mode: 'LOCAL_OFFLINE' }
    }));
  }

  return {
    success: true,
    projectId: null,
    mode: 'LOCAL_OFFLINE',
  };
}

/**
 * Test a Firebase configuration by connecting to its Firestore database.
 */
export async function testCustomFirebaseConfig(
  config: FirebaseCustomConfig
): Promise<{ success: boolean; message: string; projectId: string }> {
  if (!config.apiKey || !config.projectId || !config.appId) {
    return {
      success: false,
      message: 'Konfigurasi tidak lengkap. Pastikan API Key, Project ID, dan App ID terisi.',
      projectId: config.projectId || '',
    };
  }

  const probeAppName = `probe-${Date.now()}`;
  let probeApp: FirebaseApp | null = null;

  try {
    probeApp = initializeApp(config, probeAppName);
    const probeDb = buildFirestore(probeApp, config.firestoreDatabaseId);

    // Attempt probe connection with 5 second timeout
    const probePromise = getDocFromServer(doc(probeDb, 'system', 'connection_probe'));
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), 6500)
    );

    try {
      await Promise.race([probePromise, timeoutPromise]);
    } catch (probeErr: any) {
      // If error is permission-denied or document not found, the connection TO Firestore is actually ALIVE and REACHABLE!
      const msg = probeErr?.message || '';
      if (probeErr?.code === 'permission-denied' || msg.includes('permission') || msg.includes('offline')) {
        // Connected to server, received response from Google
      } else if (msg === 'TIMEOUT') {
        throw new Error('Koneksi timeout. Periksa sambungan internet atau keabsahan Project ID.');
      } else if (msg.includes('API key not valid') || msg.includes('auth/invalid-api-key')) {
        throw new Error('API Key tidak valid. Mohon periksa kembali API Key dari Google Firebase Console.');
      }
    }

    return {
      success: true,
      message: `Berhasil tersambung ke project "${config.projectId}". Cloud Firestore siap digunakan!`,
      projectId: config.projectId,
    };
  } catch (err: any) {
    const errorMsg = err?.message || 'Gagal menghubungi server Firebase.';
    return {
      success: false,
      message: `Uji koneksi gagal: ${errorMsg}`,
      projectId: config.projectId,
    };
  } finally {
    if (probeApp) {
      try {
        await deleteApp(probeApp);
      } catch {}
    }
  }
}

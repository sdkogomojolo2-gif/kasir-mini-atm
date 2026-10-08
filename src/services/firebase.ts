import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore, doc, getDocFromServer, Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
export const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const hasCustomDb =
  Boolean(firebaseConfig.firestoreDatabaseId) &&
  firebaseConfig.firestoreDatabaseId !== '(default)' &&
  firebaseConfig.firestoreDatabaseId !== '';

let firestoreInstance: Firestore;
try {
  firestoreInstance = hasCustomDb
    ? initializeFirestore(
        firebaseApp,
        {
          experimentalAutoDetectLongPolling: true,
        },
        firebaseConfig.firestoreDatabaseId
      )
    : initializeFirestore(firebaseApp, {
        experimentalAutoDetectLongPolling: true,
      });
} catch {
  firestoreInstance = hasCustomDb
    ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
    : getFirestore(firebaseApp);
}

export const db = firestoreInstance;

// Test Firestore connection on boot
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'system', 'connection_test'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase connection: Client is offline or waiting for Firestore rules.');
    } else {
      console.debug('Firestore probe completed:', error);
    }
    return false;
  }
}

// Run connection check in background
if (typeof window !== 'undefined') {
  testFirestoreConnection().catch(() => {});
}

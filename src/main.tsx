import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Automatically register service worker for PWA offline capabilities in production
if (import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('Kasir-Q: Konten baru tersedia, memuat pembaruan di latar belakang...');
      },
      onOfflineReady() {
        console.log('Kasir-Q: Aplikasi siap bekerja penuh dalam mode offline.');
      },
    });
  } catch (err) {
    console.debug('Service worker registration bypassed in dev:', err);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

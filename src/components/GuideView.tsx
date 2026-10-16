import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  ShoppingCart,
  Package,
  BarChart3,
  BookMarked,
  Settings,
  Printer,
  Clock,
  ShieldCheck,
  Smartphone,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Laptop,
  ArrowRight,
  Zap,
  Sparkles,
  Layers,
  RotateCcw,
  Share2,
  FileText,
  DollarSign,
  QrCode,
  Sliders,
  Check,
  Keyboard,
} from 'lucide-react';
import { openAppInNewTab, isIframeEnvironment } from '../services/bluetoothPrinter';

interface GuideViewProps {
  darkMode: boolean;
  onNavigateTab: (tab: 'dashboard' | 'cashier' | 'inventory' | 'reports' | 'debts' | 'settings') => void;
  onOpenSettings: () => void;
  onOpenBrochure?: () => void;
}

type GuideCategory = 'all' | 'workflow' | 'navigation' | 'printer' | 'shortcuts' | 'faq';

export const GuideView: React.FC<GuideViewProps> = ({
  darkMode,
  onNavigateTab,
  onOpenSettings,
  onOpenBrochure,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<GuideCategory>('all');
  const [expandedSection, setExpandedSection] = useState<string | null>('daily-flow');

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  const categories = [
    { id: 'all' as GuideCategory, label: 'Semua Panduan', icon: BookOpen },
    { id: 'workflow' as GuideCategory, label: 'Alur Kasir Harian', icon: Clock },
    { id: 'navigation' as GuideCategory, label: 'Menu & Fitur Layar', icon: Layers },
    { id: 'printer' as GuideCategory, label: 'Printer & Kertas Struk', icon: Printer },
    { id: 'shortcuts' as GuideCategory, label: 'Tombol & Shortcut', icon: Keyboard },
    { id: 'faq' as GuideCategory, label: 'Solusi Masalah (FAQ)', icon: HelpCircle },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-zinc-950 border border-zinc-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-amber-400 text-xs font-mono font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>PANDUAN PENGGUNAAN RESMI KASIR KELONTONG (KASIR-Q)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
            Buku Panduan Operasional &amp; Fitur Kasir
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base max-w-3xl leading-relaxed">
            Panduan lengkap mulai dari membuka toko di pagi hari, melayani transaksi cepat via shortcut keyboard, scan barcode kamera &amp; USB, penyesuaian stok, koneksi printer thermal Bluetooth, hingga tutup kasir malam hari.
          </p>

          {/* Search Box */}
          <div className="pt-2 max-w-xl">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Cari panduan... (contoh: kasbon, print epson, diskon, tutup shift, barcode)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-sm font-medium focus:outline-hidden focus:border-amber-500 shadow-lg"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold px-2 py-1 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id && !searchQuery;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id);
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-zinc-950 font-black shadow-md'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Notice Card for Quick Installation (PWA) */}
      <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-emerald-50/70 border-emerald-200'
      }`}>
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
              Tips Praktis: Jadikan Aplikasi Ikon di Layar HP / Desktop Komputer
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 max-w-2xl">
              Agar kasir tidak perlu membuka tab browser atau mencari link toko setiap hari, pasang aplikasi ini ke Layar Utama melalui tombol <strong>"Pasang Aplikasi"</strong> di bar atas atau buka di jendela mandiri.
            </p>
          </div>
        </div>
        {isIframeEnvironment() && (
          <button
            type="button"
            onClick={() => openAppInNewTab()}
            className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-xs active:scale-95 transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Buka Layar Penuh (Tab Baru)</span>
          </button>
        )}
      </div>

      {/* Main Guide Content Blocks */}
      <div className="space-y-4">
        {/* ============================================================ */}
        {/* SECTION 1: ALUR KERJA HARIAN KASIR (STEP BY STEP) */}
        {/* ============================================================ */}
        {(activeCategory === 'all' || activeCategory === 'workflow') && (
          <div className={`rounded-2xl border transition-all ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          } shadow-sm overflow-hidden`}>
            <button
              type="button"
              onClick={() => toggleSection('daily-flow')}
              className="w-full p-5 sm:p-6 flex items-center justify-between text-left cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100">
                    Bab 1: Alur Kerja Harian Kasir (Pagi, Siang & Malam)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Standard Operating Procedure (SOP) harian penjaga kasir toko kelontong
                  </p>
                </div>
              </div>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform ${
                expandedSection === 'daily-flow' ? 'rotate-90 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'text-slate-400'
              }`}>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>

            {expandedSection === 'daily-flow' && (
              <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 dark:border-slate-800 space-y-6">
                {/* Step 1: Pagi */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-xs">1</span>
                    <span>Pagi Hari: Buka Shift Kasir & Modal Awal (Kembalian)</span>
                  </div>
                  <div className="ml-8 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1.5 leading-relaxed bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p>
                      • Saat pertama kali datang, buka aplikasi dan masuk menggunakan <strong>PIN Kasir</strong> Anda.
                    </p>
                    <p>
                      • Klik pill <strong>"Shift: Kasir Aktif"</strong> di bilah atas atau pilih menu <strong>Dashboard</strong>.
                    </p>
                    <p>
                      • Klik tombol <strong className="text-emerald-600 dark:text-emerald-400">"Buka Shift Baru"</strong>, lalu masukkan nominal <strong>Modal Kas Awal</strong> (uang receh pecahan Rp2.000, Rp5.000, Rp10.000 yang disiapkan di laci untuk kembalian pembeli).
                    </p>
                  </div>
                </div>

                {/* Step 2: Siang */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-extrabold text-sm">
                    <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-xs">2</span>
                    <span>Sepanjang Hari: Melayani Transaksi Mini ATM, Pulsa &amp; Tagihan</span>
                  </div>
                  <div className="ml-8 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p>
                      • <strong>Transaksi Instan Mini ATM:</strong> Klik tombol cepat di bilah atas kasir (<strong>Tarik Tunai</strong>, <strong>Setor Tunai</strong>, <strong>Transfer Bank</strong>, <strong>Pulsa</strong>, <strong>Top Up E-Wallet</strong>, atau <strong>Token Listrik PLN</strong>).
                    </p>
                    <p>
                      • <strong>Pilihan Mode Biaya Admin:</strong>
                      <br />- <strong>Admin di Luar (Standar):</strong> Nasabah bayar nominal pokok + biaya admin (Contoh: Tarik Rp500.000 + Admin Rp5.000 = Gesek Rp505.000).
                      <br />- <strong>Potong Saldo (Admin di Dalam):</strong> Nasabah gesek kartu Rp500.000 pas, uang tunai yang diserahkan kasir adalah Rp495.000 (otomatis dipotong fee Rp5.000).
                    </p>
                    <p>
                      • <strong>Kalkulator Fee &amp; Simulasi Profit:</strong> Klik tombol kuning <strong>"Kalkulator Fee"</strong> di bilah atas untuk menghitung keuntungan agen dan simulasi kas sebelum memproses transaksi.
                    </p>
                    <p>
                      • <strong>Cetak Struk Thermal &amp; Kirim WhatsApp (Format Foto):</strong>
                      <br />- Cetak langsung ke printer Bluetooth / USB Thermal ukuran 58mm atau 80mm.
                      <br />- Klik <strong>"Kirim Foto Struk ke WhatsApp"</strong> untuk mengirim bukti digital resmi dalam bentuk <strong>foto/gambar jernih</strong> (bukan teks) langsung ke nomor WhatsApp pelanggan.
                      <br />- Tersedia juga tombol <strong>"Unduh Foto (.PNG)"</strong> untuk menyimpan bukti transaksi ke galeri perangkat.
                    </p>
                  </div>
                </div>

                {/* Step 3: Malam */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-extrabold text-sm">
                    <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-xs">3</span>
                    <span>Malam Hari / Tutup Toko: Tutup Shift & Rekonsiliasi Kas</span>
                  </div>
                  <div className="ml-8 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1.5 leading-relaxed bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p>
                      • Klik status shift di bilah atas, lalu pilih <strong>"Tutup Shift Kasir"</strong>.
                    </p>
                    <p>
                      • Hitung seluruh uang tunai fisik yang ada di dalam laci kasir, lalu ketikkan ke kolom <strong>"Uang Fisik Aktual"</strong>.
                    </p>
                    <p>
                      • Sistem otomatis membandingkan dengan <strong>Uang Ekspektasi Sistem</strong> (Modal Awal + Penjualan Tunai). Jika ada selisih lebih/kurang, tulis keterangannya pada kolom catatan.
                    </p>
                    <p>
                      • Cetak <strong>Laporan Penutupan Shift</strong> sebagai bukti serah terima kasir kepada pemilik toko.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION 2: PANDUAN LENGKAP SEMUA NAVIGASI & FITUR */}
        {/* ============================================================ */}
        {(activeCategory === 'all' || activeCategory === 'navigation') && (
          <div className={`rounded-2xl border transition-all ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          } shadow-sm overflow-hidden`}>
            <button
              type="button"
              onClick={() => toggleSection('nav-features')}
              className="w-full p-5 sm:p-6 flex items-center justify-between text-left cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100">
                    Bab 2: Panduan Setiap Menu Navigasi & Tombol
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Fungsi lengkap menu Dashboard, Kasir, Produk/Stok, Kasbon, Laporan & Pengaturan
                  </p>
                </div>
              </div>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform ${
                expandedSection === 'nav-features' ? 'rotate-90 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'text-slate-400'
              }`}>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>

            {expandedSection === 'nav-features' && (
              <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 dark:border-slate-800 space-y-5">
                {/* Menu 1: Dashboard */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-200">
                      <span className="p-1.5 rounded-lg bg-blue-500 text-white"><FileText className="w-3.5 h-3.5" /></span>
                      <span>1. Menu Dashboard (Pusat Kendali Toko)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigateTab('dashboard')}
                      className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Buka Dashboard</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                    <li><strong>Total Omset Hari Ini:</strong> Menampilkan seluruh uang masuk dari penjualan hari ini secara live.</li>
                    <li><strong>Estimasi Laba Bersih:</strong> Menghitung keuntungan bersih (Harga Jual dikurangi Harga Modal Beli).</li>
                    <li><strong>Peringatan Stok Kritis:</strong> Memberitahu produk sembako mana saja yang stoknya tinggal sedikit di bawah batas aman agar segera kulak ke agen.</li>
                    <li><strong>Riwayat Transaksi Terakhir:</strong> Daftar struk terbaru dan tombol cepat untuk cetak ulang struk jika pembeli meminta salinan.</li>
                  </ul>
                </div>

                {/* Menu 2: Kasir POS */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-200">
                      <span className="p-1.5 rounded-lg bg-emerald-500 text-white"><ShoppingCart className="w-3.5 h-3.5" /></span>
                      <span>2. Menu Kasir / Penjualan (Layar Utama Transaksi)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigateTab('cashier')}
                      className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Buka Kasir</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                    <li><strong>Katalog Produk & Kategori:</strong> Klik tab kategori (Sembako, Minuman, Makanan, Rokok, dll) atau klik langsung foto barang untuk memasukkannya ke keranjang belanja.</li>
                    <li><strong>Keranjang Belanja (Sebelah Kanan):</strong> Menampilkan daftar barang yang dibeli, harga satuan, subtotal, dan kalkulator diskon.</li>
                    <li><strong>Tombol Diskon / Potongan:</strong> Bisa memberikan potongan persen (%) atau nominal rupiah (Rp) langsung ke nota belanja.</li>
                    <li><strong>Tombol Kosongkan Keranjang:</strong> Membatalkan seluruh belanjaan jika pembeli membatalkan pesanan.</li>
                  </ul>
                </div>

                {/* Menu 3: Produk & Stok */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-200">
                      <span className="p-1.5 rounded-lg bg-amber-500 text-white"><Package className="w-3.5 h-3.5" /></span>
                      <span>3. Menu Produk & Stok Barang (Manajemen Inventory)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigateTab('inventory')}
                      className="text-xs text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Buka Produk</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                    <li><strong>Tombol Tambah Produk Baru:</strong> Tambahkan barang dagangan baru, lengkapi dengan barcode, nama, harga modal, harga jual, dan stok awal.</li>
                    <li><strong>Foto Produk (Kamera & Galeri):</strong> Bisa jepret langsung dari kamera HP atau unggah dari galeri. Foto otomatis dikompres ringan (~25 KB) sehingga kasir cepat mengenali barang tanpa membuat HP lemot.</li>
                    <li><strong>Penyesuaian Stok Cepat (Adjust Stock):</strong> Tombol untuk menambah stok saat barang baru datang dari distributor, atau mengurangi stok saat ada barang pecah/kedaluwarsa (disertai alasan pencatatan).</li>
                    <li><strong>Cetak Label Barcode:</strong> Cetak stiker barcode untuk barang yang belum memiliki barcode dari pabrik (misal: beras curah, gula kiloan, telur).</li>
                    <li><strong>Hapus Massal & Filter:</strong> Pilih banyak barang sekaligus untuk dihapus atau diperbarui.</li>
                  </ul>
                </div>

                {/* Menu 4: Tagihan / Kasbon */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-200">
                      <span className="p-1.5 rounded-lg bg-purple-500 text-white"><BookMarked className="w-3.5 h-3.5" /></span>
                      <span>4. Menu Tagihan / Kasbon (Buku Hutang Pelanggan)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigateTab('debts')}
                      className="text-xs text-purple-600 dark:text-purple-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Buka Kasbon</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                    <li><strong>Pencatatan Otomatis dari Kasir:</strong> Hutang pembeli yang bayar pakai kasbon langsung tercatat rapi per nama pelanggan.</li>
                    <li><strong>Pencatatan Cicilan:</strong> Saat pelanggan mencicil sebagian hutang, klik <strong>"Catat Pembayaran Cicilan"</strong>. Sisa saldo hutang otomatis berkurang.</li>
                    <li><strong>Kirim Pengingat WhatsApp:</strong> Ada tombol satu klik untuk mengirimkan rincian hutang dan nota belanja langsung ke nomor WA pelanggan dengan sopan.</li>
                  </ul>
                </div>

                {/* Menu 5: Laporan & Analisis */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-200">
                      <span className="p-1.5 rounded-lg bg-indigo-500 text-white"><BarChart3 className="w-3.5 h-3.5" /></span>
                      <span>5. Menu Laporan & Analisis Keuangan</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigateTab('reports')}
                      className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Buka Laporan</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                    <li><strong>Rekap Omset & Laba Bersih:</strong> Filter laporan berdasarkan Hari Ini, 7 Hari Terakhir, Bulan Ini, atau Rentang Tanggal Bebas.</li>
                    <li><strong>Grafik Tren Penjualan:</strong> Visual interaktif jam-jam tersibuk toko Anda untuk mengatur jam kerja karyawan.</li>
                    <li><strong>Daftar Barang Paling Laris (Top Sellers):</strong> Mengetahui barang yang perputarannya paling cepat agar tidak pernah telat kulakan.</li>
                    <li><strong>Pembatalan Transaksi (Retur Kasir):</strong> Tombol batalkan transaksi jika ada kekeliruan kasir. Uang transaksi dikoreksi dan stok barang otomatis dikembalikan ke inventaris toko!</li>
                  </ul>
                </div>

                {/* Menu 6: Pengaturan Toko */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-200">
                      <span className="p-1.5 rounded-lg bg-slate-700 text-white"><Settings className="w-3.5 h-3.5" /></span>
                      <span>6. Menu Pengaturan Toko (Sistem & Printer)</span>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenSettings}
                      className="text-xs text-slate-600 dark:text-slate-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Buka Pengaturan</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                    <li><strong>Profil Toko:</strong> Ganti Nama Toko, Alamat, No Telepon/WA, dan Pesan Penutup di struk belanja (contoh: <em>"Terima kasih atas kunjungan Anda"</em>).</li>
                    <li><strong>Pengaturan Printer Thermal:</strong> Sambungkan printer kasir Bluetooth, atur ukuran kertas (58mm atau 80mm), dan aktifkan fitur auto-print struk saat pembayaran selesai.</li>
                    <li><strong>Keamanan & Backup Database:</strong> Unduh file cadangan data terenkripsi AES-256 ke flashdisk / komputer Anda agar data toko tidak akan pernah hilang.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION 3: SOLUSI PRINTER & CETAK STRUK (EPSON VS THERMAL) */}
        {/* ============================================================ */}
        {(activeCategory === 'all' || activeCategory === 'printer') && (
          <div className={`rounded-2xl border transition-all ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          } shadow-sm overflow-hidden`}>
            <button
              type="button"
              onClick={() => toggleSection('printer-guide')}
              className="w-full p-5 sm:p-6 flex items-center justify-between text-left cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100">
                    Bab 3: Solusi Printer & Kenapa Keluar Kertas A4 (Epson L3250)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Penjelasan mengapa dialog print Epson muncul dan cara menggunakan printer thermal kasir roll 58mm
                  </p>
                </div>
              </div>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform ${
                expandedSection === 'printer-guide' ? 'rotate-90 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'text-slate-400'
              }`}>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>

            {expandedSection === 'printer-guide' && (
              <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 dark:border-slate-800 space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2">
                  <div className="flex items-center gap-2 font-black text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Penjelasan Layar Print Epson L3250 yang Muncul di Laptop Anda:</span>
                  </div>
                  <p className="leading-relaxed">
                    Printer <strong>Epson L3250</strong> adalah printer dokumen kantor yang menggunakan kertas besar (A4/Folio). Sedangkan struk kasir toko dirancang untuk kertas roll thermal kecil (lebar 58mm). Saat laptop mengirim perintah cetak ke Epson L3250, komputer otomatis meletakkannya di sudut kertas A4.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Jika Toko Anda Menggunakan Printer Thermal Kasir:</span>
                    </h4>
                    <p className="text-xs leading-relaxed">
                      1. Beli printer thermal Bluetooth / USB ukuran 58mm (harga kisaran Rp150.000 - Rp250.000 di toko online).
                      <br />2. Pasang kabel USB ke laptop atau sambungkan Bluetooth.
                      <br />3. Saat jendela print muncul, pada opsi <strong>"Printer / Destination"</strong>, pilih nama printer kasir Anda (jangan pilih Epson L3250). Kertas struk kasir Anda akan langsung terpotong rapi.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-blue-500" />
                      <span>Jika Kasir Menggunakan HP Android (Aplikasi RawBT):</span>
                    </h4>
                    <p className="text-xs leading-relaxed">
                      1. Di HP kasir, install aplikasi gratis bernama <strong>RawBT Print Service</strong> dari Google Play Store.
                      <br />2. Sambungkan HP ke printer thermal Bluetooth Anda.
                      <br />3. Di aplikasi kasir ini, klik tombol <strong>"Opsi Printer Lainnya &gt; Cetak via RawBT"</strong>. Struk akan langsung tercetak tanpa perlu membuka jendela browser!
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <Zap className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Mau struk tercetak otomatis saat kasir klik Bayar?</span>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg cursor-pointer shrink-0"
                  >
                    Aktifkan di Pengaturan
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION 4: DAFTAR TOMBOL PENTING & SHORTCUT */}
        {/* ============================================================ */}
        {(activeCategory === 'all' || activeCategory === 'shortcuts') && (
          <div className={`rounded-2xl border transition-all ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          } shadow-sm overflow-hidden`}>
            <button
              type="button"
              onClick={() => toggleSection('shortcuts-guide')}
              className="w-full p-5 sm:p-6 flex items-center justify-between text-left cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
                  <Keyboard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100">
                    Bab 4: Arti Tombol Layar & Pintasan Cepat Kasir
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Penjelasan tombol warna, ikon status, dan cara mempercepat kerja kasir di jam sibuk
                  </p>
                </div>
              </div>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform ${
                expandedSection === 'shortcuts-guide' ? 'rotate-90 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'text-slate-400'
              }`}>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>

            {expandedSection === 'shortcuts-guide' && (
              <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-1">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-mono text-[11px]">Hijau (Bayar)</span>
                      <span>Selesaikan Transaksi</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400">
                      Membuka jendela kalkulator pembayaran, pemilihan tunai, QRIS, atau kasbon.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-1">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono text-[11px]">Tahan (Hold)</span>
                      <span>Antrian Keranjang</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400">
                      Menyimpan belanjaan sementara saat pembeli izin ambil barang lain tanpa mengganggu antrian.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-1">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-mono text-[11px]">Kosongkan</span>
                      <span>Reset Keranjang</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400">
                      Menghapus seluruh daftar barang belanjaan yang ada di kasir jika pembeli batal total.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-1">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-amber-500 text-white font-mono text-[11px]">Pill Shift</span>
                      <span>Buka/Tutup Kas</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400">
                      Terletak di bar atas, untuk memantau modal kas awal dan menghitung uang kas fisik kasir.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-1">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-emerald-500 text-white font-mono text-[11px]">Awan Hijau</span>
                      <span>Status Sinkronisasi</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400">
                      Data toko tersimpan ganda: aman di memori offline lokal dan otomatis tersimpan di cloud database.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-1">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-slate-700 text-white font-mono text-[11px]">Bulan / Matahari</span>
                      <span>Mode Gelap / Terang</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400">
                      Mengubah tampilan layar agar nyaman di mata kasir saat melayani di malam hari.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION 5: FAQ & TROUBLESHOOTING */}
        {/* ============================================================ */}
        {(activeCategory === 'all' || activeCategory === 'faq') && (
          <div className={`rounded-2xl border transition-all ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          } shadow-sm overflow-hidden`}>
            <button
              type="button"
              onClick={() => toggleSection('faq-guide')}
              className="w-full p-5 sm:p-6 flex items-center justify-between text-left cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100">
                    Bab 5: Pertanyaan Sering Ditanyakan (FAQ & Solusi Masalah)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Solusi cepat saat terjadi kendala operasional kasir di toko
                  </p>
                </div>
              </div>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform ${
                expandedSection === 'faq-guide' ? 'rotate-90 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'text-slate-400'
              }`}>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>

            {expandedSection === 'faq-guide' && (
              <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 dark:border-slate-800 space-y-3 text-xs sm:text-sm">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-1">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100">
                    Q: Pembeli salah beli atau kasir keliru input barang, bagaimana cara retur?
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                    <strong>Jawab:</strong> Masuk ke menu <strong>Laporan & Analisis</strong>, cari nomor nota transaksi tersebut, lalu klik tombol <strong>"Batalkan Transaksi"</strong>. Uang penjualan akan dikoreksi dan stok barang otomatis kembali bertambah di etalase tanpa perlu edit manual.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-1">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100">
                    Q: Bagaimana jika internet di toko tiba-tiba mati / mati lampu?
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                    <strong>Jawab:</strong> Aplikasi kasir tetap bisa beroperasi 100% normal tanpa koneksi internet (Offline First). Semua transaksi tersimpan di memori perangkat, dan begitu internet menyala kembali, sistem otomatis menyinkronkan data ke cloud database secara otomatis.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-1">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100">
                    Q: Bagaimana cara backup data toko agar aman dari kerusakan laptop?
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                    <strong>Jawab:</strong> Buka menu <strong>Pengaturan Toko</strong>, gulir ke bagian <strong>Cadangkan Database (Backup)</strong>, lalu klik <strong>"Download File Vault (Backup)"</strong>. Simpan file tersebut ke flashdisk atau Google Drive Anda seminggu sekali.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-1">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100">
                    Q: Kasir lupa PIN akun, apa yang harus dilakukan?
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                    <strong>Jawab:</strong> Akun Pemilik Toko (Owner) dapat membuka menu <strong>Pengaturan Toko &gt; Kelola Pengguna Kasir</strong>, lalu mereset PIN kasir yang bersangkutan menjadi PIN baru.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Support Card */}
      <div className={`p-6 rounded-2xl border text-center space-y-3 ${
        darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          KasirKelontong POS dirancang khusus untuk toko kelontong, minimarket mandiri, dan warung sembako modern di Indonesia.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => onNavigateTab('cashier')}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Mulai Melayani Transaksi Kasir</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Simpan Buku Panduan ke PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};

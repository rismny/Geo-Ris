# Rencana Peningkatan Peta & Dukungan Aplikasi Komputer PC (Desktop)

Rencana ini memuat perbaikan detail render citra satelit resolusi tinggi saat diperbesar (*zoom in*), kehalusan pergerakan zoom (*smooth zoom*), navigasi geser peta menggunakan klik kanan mouse pada pratinjau cetak, serta transformasi aplikasi agar dapat dipasang dan dijalankan langsung di komputer PC layaknya aplikasi desktop native.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Keputusan Berdasarkan Jawaban Pengguna:**
> - **Format Aplikasi PC**: Aplikasi akan dilengkapi kapabilitas **Aplikasi Desktop PC (PWA Standalone)** yang dapat langsung dipasang ke Windows/Mac dalam 1 klik (memiliki ikon shortcut di Desktop & Start Menu, berjalan di jendela tersendiri tanpa address bar/tab browser, dengan engine terisolasi). Kami juga menyertakan modul dokumentasi dan generator konfigurasi Electron untuk pengguna yang memerlukan bundel installer file `.exe` mandiri.
> - **Penanganan Citra Satelit Zoom Maksimal**: Mengaktifkan *overzooming & hardware tile upscaling* hingga level 22 (`maxNativeZoom: 18/19`, `maxZoom: 22`) dengan filter CSS `image-rendering: crisp-edges` dan `contrast` tinggi, sehingga gambar tetap tajam dan tidak pernah hilang/menjadi kotak abu-abu.
> - **Kontrol Navigasi Geser Mouse**: Mengaktifkan navigasi geser peta (*pan dragging*) menggunakan **klik kanan mouse** maupun **klik kiri mouse** pada kanvas pratinjau cetak dan kanvas peta kerja.

---

### 1. Overview & Core Concept

* **Tujuan**: Memberikan pengalaman navigasi spasial yang presisi, responsif, dan tajam saat melakukan zoom in ke batas patok tanah terkecil, mempermudah penataan sudut pandang cetak dokumen kartografis dengan klik kanan mouse, serta memfasilitasi penggunaan aplikasi langsung di PC Windows tanpa membuka browser web secara manual.
* **Fitur Utama**:
  1. **Ultra-HD Satellite Zoom**: Menghilangkan batasan zoom level 18/19 bawaan penyedia peta agar surveyor dapat memperbesar hingga zoom level 22 untuk melihat detail batas vegetasi, parit, dan patok lahan secara tajam.
  2. **Butter-Smooth Zooming**: Pengaturan kurva pembesaran `zoomSnap: 0.1` dan `zoomDelta: 0.35` untuk transisi animasi perbesaran yang lembut dan tidak melompat mendadak.
  3. **Dual Mouse Pan Navigation**: Memungkinkan surveyor menggeser area kerja peta cetak dengan menekan dan menahan tombol **klik kanan mouse** (mencegah context menu browser yang mengganggu) maupun klik kiri standar.
  4. **Desktop PC Mode (PWA & Offline Shell)**: Tombol *"Pasang ke Komputer / Install PC App"* langsung di header aplikasi. Memiliki cache service worker untuk aset antarmuka dan basis data lokal untuk proyek pengukuran saat koneksi terputus.

---

### 2. User Experience & Visual Design

* **Pengalaman Instalasi PC**:
  * Pengguna akan melihat tombol **"Pasang ke Komputer (PC Desktop)"** di pojok kanan atas / menu sidebar.
  * Begitu diklik, Windows akan membuat ikon aplikasi di Desktop dan Start Menu. Aplikasi terbuka sebagai jendela program mandiri (layaknya AutoCAD atau QGIS ringan), terbebas dari bilah alamat URL atau tab peramban web.
* **Navigasi Klik Kanan pada Pratinjau Cetak**:
  * Saat mouse ditekan menggunakan klik kanan (`right-click drag`) di atas kanvas peta pratinjau kartografi, kursor berubah menjadi `grabbing` dan peta bergeser dengan sangat mulus.
  * Klik kiri tetap berfungsi untuk memilih bidang atau titik patok, atau menggeser peta.
* **Tampilan Citra Satelit Super Tajam**:
  * Lapisan satelit Google Hybrid dan ESRI World Imagery dikonfigurasi dengan *seamless tile upscaling*. Tidak ada lagi kedipan layar atau kotak abu-abu *"Map data not available"* saat diperbesar di atas level 18.
  * Teks dan garis batas poligon tetap tajam dengan rasio kontras tinggi.

---

### 3. Key Product Decisions & Trade-Offs

* **Pertanyaan 1: Apakah pengubahan ke App PC akan membuat fitur Google Map/Earth hilang?**
  * **Jawaban & Keputusan**: **TIDAK**. Aplikasi desktop berbasis PWA / Chromium Webview menjalankan engine rendering modern yang sama dengan browser. Semua tile Google Satellite, ESRI Worldview, kalkulasi Geodesi WGS84, dan layer poligon tetap utuh 100%.
* **Pertanyaan 2: Apakah bisa digunakan tanpa internet?**
  * **Jawaban & Keputusan**:
    * **Fitur Offline**: Perhitungan luas, panjang sisi, azimuth, kalkulasi sudut dalam, tabel patok, ekspor KML/GeoJSON, penyuntingan batas, dan penyimpanan file proyek (`.ysr`) **berjalan 100% offline** di komputer pengguna.
    * **Citra Satelit**: Membutuhkan internet karena citra resolusi tinggi seluruh dunia disimpan di cloud server penyedia satelit (terabyte data). Namun, area peta yang pernah dibuka sebelumnya akan tersimpan dalam *cache tile* sementara.
* **Pertanyaan 3: Kekurangan atau penurunan kualitas?**
  * **Jawaban & Keputusan**: Tidak ada penurunan kualitas sama sekali. Justru aplikasi desktop PC memiliki ruang kerja layar penuh yang lebih luas, performa grafis terakselerasi GPU komputer, dan shortcut keyboard yang lebih bebas dari konflik shortcut browser.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    DESKTOP ENVIRONMENT                      │
│   Windows Desktop Shortcut / PWA Standalone Window          │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    APPLICATION CORE                         │
│                                                             │
│   ┌────────────────────────┐    ┌───────────────────────┐   │
│   │ Leaflet Map Engine     │    │ Print Preview Layout  │   │
│   │ • zoomSnap: 0.1        │    │ • Right-Click Drag    │   │
│   │ • maxZoom: 22          │    │ • Left-Click Drag     │   │
│   │ • maxNativeZoom: 18/19 │    │ • Dynamic Inset Sync  │   │
│   │ • Tile Crisp Upscaling │    │ • Double Neatline     │   │
│   └───────────┬────────────┘    └───────────┬───────────┘   │
│               │                             │               │
│   ┌───────────▼─────────────────────────────▼───────────┐   │
│   │ Service Worker & Web App Manifest (PWA)             │   │
│   │ • Standalone Display Mode                           │   │
│   │ • Workbox Precache (UI Assets & Font Cache)         │   │
│   │ • IndexedDB / LocalStorage Project Vault            │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

* **Tile Scaling Implementation**:
  * Menetapkan `maxNativeZoom: 18` (ESRI) / `19` (Google Hybrid), dan `maxZoom: 22`.
  * Mengaplikasikan class CSS `.leaflet-tile` dengan `image-rendering: -webkit-optimize-contrast;` untuk menghindari efek blur berlebihan saat upscaling.
* **Right-Click Drag Navigation**:
  * Menambahkan mouse event listener: `mousedown` (mendeteksi `button === 2`), `mousemove`, dan `mouseup` dengan `map.panBy(...)` untuk pergerakan halus, serta `e.preventDefault()` pada event `contextmenu` di kanvas pratinjau cetak.
* **PWA & Desktop Packaging**:
  * Menambahkan `vite-plugin-pwa` atau manifest standalone `manifest.json` yang lengkap dengan ikon aplikasi dan konfigurasi `display: standalone`.
  * Menyediakan tombol *"Pasang ke Komputer (PC)"* dengan handler `beforeinstallprompt` dan panduan instalasi.
  * **Solusi Unduhan Paket Installer PC Windows**:
    1. **Launcher Desktop Windows (.bat)**: Skrip otomatis 1-klik yang membuat pintasan `YSR PETA PRO.lnk` di Desktop pengguna dan membuka aplikasi dalam mode jendela mandiri (Standalone Window) berakselerasi GPU tanpa bilah browser.
    2. **Paket Builder File .EXE Murni (.zip)**: Dibuat langsung secara in-memory menggunakan JSZip, berisi file `main.js`, `package.json`, `build-exe.bat`, dan panduan lengkap untuk mengompilasi installer `YSR_PETA_PRO_Setup.exe`.
    3. **File Pintasan Desktop (.url)**: Unduhan instan file pintasan desktop untuk ditaruh di desktop pengguna.


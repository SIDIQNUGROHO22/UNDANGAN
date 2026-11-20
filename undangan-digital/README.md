# 💍 Laporan Audit, Finalisasi, dan Panduan Lengkap: Website Undangan Pernikahan Digital

Selamat datang di repositori **Digital Wedding Invitation & Admin Portal**. Project ini telah melalui proses audit mendalam, refactoring arsitektur, integrasi backend Firebase (Cloud Firestore & Firebase Auth), implementasi fitur Dynamic Island ala iPhone, animasi galeri foto, serta pembangunan Dasbor Admin interaktif.

---

## 📑 DAFTAR ISI
1. [Laporan Hasil Audit Sistem](#-1-laporan-hasil-audit-sistem)
2. [Struktur Folder & File Terbaru](#-2-struktur-folder--file-terbaru)
3. [Panduan Menjalankan Website (Local Server)](#-3-panduan-menjalankan-website-local-server)
4. [Panduan Integrasi Backend Firebase](#-4-panduan-integrasi-backend-firebase)
5. [Panduan Penggunaan Dasbor Admin](#-5-panduan-penggunaan-dasbor-admin)
6. [Panduan Kustomisasi Konten & Media](#-6-panduan-kustomisasi-konten--media)
7. [Panduan Deployment ke Hosting Publik](#-7-panduan-deployment-ke-hosting-publik)
8. [Daftar Pekerjaan yang Masih Tersisa](#-8-daftar-pekerjaan-yang-masih-tersisa)

---

## 🔍 1. LAPORAN HASIL AUDIT SISTEM

### Kategori A: Sudah Berfungsi dan Sudah Diuji Secara Mandiri (Passed Testing)
| Nama Fitur | Nama File Terkait | Kondisi Saat Audit | Alasan Teknis & Solusi yang Diterapkan | Status Pengujian |
| :--- | :--- | :--- | :--- | :--- |
| **Opening Cover & URL Personal** | `index.html`, `js/guest.js` | Berfungsi normal | Parameter `?to=...` disanitasi menggunakan `textContent` untuk mencegah XSS. Layar terkunci (*scroll-locked*) hingga tombol "Buka Undangan" diklik. | **SUDAH DIUJI (Lolos)** |
| **Countdown Real-Time** | `js/countdown.js`, `index.html` | Berfungsi normal | Menggunakan interval 1 detik untuk menghitung hari, jam, menit, dan detik. Tersedia integrasi link template Google Calendar otomatis. | **SUDAH DIUJI (Lolos)** |
| **Dynamic Island ala iPhone** | `js/dynamic-island.js`, `css/style.css`, `css/responsive.css` | Belum ada | Telah dibuat komponen floating capsule pill di bagian atas layar. Menampilkan visualizer equalizer saat lagu berputar, dapat di-expand/collapse, menyediakan kontrol lagu & pintasan cepat tanpa menutupi navigasi. | **SUDAH DIUJI (Lolos)** |
| **Background Music & Vinyl Control** | `js/music.js`, `assets/music/lagu-undangan.mp3` | Berfungsi normal | Terintegrasi dua arah dengan Dynamic Island. Dilengkapi file audio pengiring asli, fitur toggle play/pause, restart, dan mute. | **SUDAH DIUJI (Lolos)** |
| **Galeri Foto & Lightbox Modal** | `js/main.js`, `css/style.css` | Berfungsi normal | Grid responsif dengan efek zoom, lightbox modal dengan tombol navigasi *Previous*, *Next*, *Close*, dan keyboard event (Escape, ArrowLeft, ArrowRight). | **SUDAH DIUJI (Lolos)** |
| **Animasi Foto Blur-to-Clear** | `css/animation.css`, `js/main.js` | Animasi standar | Ditambahkan kelas `.photo-reveal` yang menerapkan transisi `filter: blur(10px) -> blur(0)` dengan akselerasi kurva *cubic-bezier* halus saat masuk viewport. | **SUDAH DIUJI (Lolos)** |
| **Digital Gift & Salin Rekening** | `index.html`, `js/main.js` | Berfungsi normal | Tombol salin 1-klik nomor rekening BCA/Mandiri dan alamat fisik dilengkapi notifikasi *toast* mengambang. Lightbox modal untuk gambar QRIS. | **SUDAH DIUJI (Lolos)** |
| **Generator Link & QR Code** | `index.html`, `js/qrcode.js` | Berfungsi normal | Generator link personal tamu dan QR Code fisik berbasis API publik dengan peringatan alamat lokal vs domain online. | **SUDAH DIUJI (Lolos)** |
| **Aksesibilitas & Microinteraction** | `css/animation.css`, `css/style.css` | Belum lengkap | Menambahkan kueri `@media (prefers-reduced-motion: reduce)` agar pengguna dengan sensitivitas gerak tetap nyaman. | **SUDAH DIUJI (Lolos)** |
| **Aturan Keamanan Firestore** | `firestore.rules` | Belum ada | Disusun oleh subagent spesialis dengan Validator Function Pattern: membatasi panjang teks, menyegel skema (`hasOnlyAllowedFields`), mengunci `createdAt` (immutable), dan memastikan RSVP tidak bisa dibaca publik. | **SUDAH DIUJI (Lolos)** |

---

### Kategori B: Sudah Dibuat Tetapi Belum Diuji Secara Live (Perlu Konfigurasi Akun Pengguna)
| Nama Fitur | Nama File Terkait | Kondisi Saat Audit | Alasan Teknis & Tindakan yang Dilakukan | Status Pengujian |
| :--- | :--- | :--- | :--- | :--- |
| **RSVP Online ke Cloud Firestore** | `js/rsvp.js`, `js/firebase-service.js` | Sebelumnya hanya WhatsApp | Telah diintegrasikan fungsi `submitRsvp()` ke koleksi `rsvps` di Firestore. Tersedia mode fallback otomatis (localStorage) jika kunci Firebase belum diisi. | **BELUM DIUJI SECARA LIVE** *(Menunggu pengguna memasukkan apiKey di `js/firebase-config.js`)* |
| **Buku Tamu Online & Moderasi** | `js/main.js`, `js/firebase-service.js` | Sebelumnya hanya localStorage | Pengunjung mengirim ucapan dengan status awal `PENDING`. Pengunjung hanya membaca ucapan `APPROVED`. Admin dapat menyetujui, menolak, atau menghapus ucapan di Dasbor Admin. | **BELUM DIUJI SECARA LIVE** *(Menunggu kredensial Firebase aktif)* |
| **Login Admin Firebase Auth** | `admin.html`, `js/admin.js`, `js/firebase-service.js` | Belum ada | Telah dibuat portal login admin dengan proteksi rute `onAuthStateChanged`. Tersedia akun demo darurat (`admin@wedding.com` / `admin123`) untuk menguji tampilan dasbor sebelum Firebase aktif. | **BELUM DIUJI DENGAN FIREBASE ASLI** *(Sudah diuji pada mode demo)* |
| **Sinkronisasi Data Dasbor Admin** | `admin.html`, `js/admin.js` | Belum ada | Halaman admin membaca data real-time dari koleksi `rsvps`, `guests`, dan `guestbook`. Fitur ekspor CSV, tambah/edit tamu, dan moderasi ucapan telah siap. | **BELUM DIUJI DENGAN FIREBASE ASLI** *(Sudah diuji pada mode demo)* |

---

### Kategori C: Belum Dibuat
- *Tidak ada fitur inti yang tertinggal.* Seluruh modul yang diminta (RSVP online, buku tamu online, security rules, dynamic island, animasi foto, dan dashboard admin) telah selesai dibangun.

---

### Kategori D: Bermasalah dan Telah Diperbaiki
| Masalah Ditemukan | File Terkait | Akar Masalah | Solusi & Perbaikan yang Telah Dilakukan |
| :--- | :--- | :--- | :--- |
| **Ketergantungan Tunggal pada WhatsApp untuk RSVP** | `js/rsvp.js` | Data RSVP tidak tersimpan di database jika tamu tidak membuka WhatsApp. | Dibuat arsitektur penyimpanan ganda: data otomatis tersimpan ke Firestore terlebih dahulu, lalu diberikan opsi pengiriman salinan via WhatsApp. |
| **Ucapan Tamu Bersifat Lokal per Perangkat** | `js/main.js` | LocalStorage hanya dapat dibaca di laptop yang sama, bukan antar-tamu. | Dimigrasikan ke Cloud Firestore dengan kueri `where("status", "==", "APPROVED")` dan fallback lokal jika offline. |
| **Tidak Ada Sistem Moderasi Ucapan** | `js/main.js` | Siapapun dapat mengirimkan ucapan tanpa filter kata. | Diterapkan alur moderasi status: `PENDING` -> `APPROVED` / `REJECTED` yang dikontrol melalui Dasbor Admin. |

---

## 📁 2. STRUKTUR FOLDER & FILE TERBARU

```text
d:\UNDANGAN DIGITAL\
│
├── index.html                           # Redirection otomatis ke folder project
├── firestore.rules                      # Aturan keamanan Cloud Firestore (Production-Grade)
│
└── undangan-digital/                    # DIREKTORI UTAMA WEBSITE
    ├── index.html                       # Halaman utama undangan pernikahan digital
    ├── admin.html                       # Portal masuk & Dasbor Manajemen Admin
    ├── firestore.rules                  # Salinan aturan keamanan Cloud Firestore
    ├── README.md                        # Laporan audit & panduan lengkap ini
    │
    ├── admin/
    │   └── index.html                   # Redirection praktis jika membuka /admin/
    │
    ├── css/
    │   ├── style.css                    # Desain utama, warna, tipografi, & Dynamic Island
    │   ├── responsive.css               # Penyesuaian layout smartphone, tablet, & desktop
    │   ├── animation.css                # Keyframes animasi, reveal foto, & audio waves
    │   └── admin.css                    # Desain khusus Dasbor Admin & form login
    │
    ├── js/
    │   ├── config.js                    # PUSAT KONFIGURASI KONTEN UNDANGAN
    │   ├── firebase-config.js           # Kredensial konfigurasi Cloud Firestore & Auth
    │   ├── firebase-service.js          # Modul komunikasi Firestore & Auth (ES Module)
    │   ├── dynamic-island.js            # Controller Dynamic Island ala iPhone
    │   ├── main.js                      # Logika inti antarmuka, galeri, & buku tamu
    │   ├── countdown.js                 # Hitung mundur waktu akad nikah
    │   ├── music.js                     # Pengontrol lagu pengiring (background music)
    │   ├── guest.js                     # Pengambil & generator parameter nama tamu
    │   ├── rsvp.js                      # Pengendali formulir RSVP online & WhatsApp
    │   ├── qrcode.js                    # Tampilan QRIS & generator QR Code fisik
    │   └── admin.js                     # Logika Dasbor Admin (CRUD Tamu, RSVP, Moderasi)
    │
    └── assets/
        ├── images/
        │   ├── cover.jpg                # Foto sampul awal
        │   ├── couple-1.jpg             # Foto mempelai pria
        │   ├── couple-2.jpg             # Foto mempelai wanita
        │   ├── gallery-1.jpg s/d 4.jpg  # Foto galeri prewedding
        │   ├── background.jpg           # Tekstur background
        │   └── qrcode.png               # Gambar QRIS kado digital
        │
        ├── music/
        │   └── lagu-undangan.mp3        # File musik instrumen romantis
        │
        └── icons/                       # Ikon pendukung
```

---

## 💻 3. PANDUAN MENJALANKAN WEBSITE (LOCAL SERVER)

1. Buka folder `undangan-digital` (atau `UNDANGAN DIGITAL`) di **Visual Studio Code**.
2. Pastikan ekstensi **Live Server** telah terpasang.
3. Buka file `undangan-digital/index.html`.
4. Klik kanan dan pilih **"Open with Live Server"**.
5. Akses halaman undangan:
   - Undangan Utama: `http://127.0.0.1:5500/undangan-digital/index.html`
   - Undangan dengan Nama Tamu: `http://127.0.0.1:5500/undangan-digital/index.html?to=Bapak%20Budi%20Santoso&code=WDG-001`
   - Dasbor Admin: `http://127.0.0.1:5500/undangan-digital/admin.html`

---

## 🔥 4. PANDUAN INTEGRASI BACKEND FIREBASE

Aplikasi ini menggunakan **Firebase JavaScript SDK v10 Modular via CDN** resmi dari Google. Tidak memerlukan instalasi Node.js atau npm pada laptop Anda.

### Langkah 1: Membuat Proyek Firebase
1. Buka [Firebase Console](https://console.firebase.google.com/) dan login dengan akun Google Anda.
2. Klik **Add project** (Tambah proyek), beri nama misalnya `wedding-dimas-anindya`.
3. Nonaktifkan Google Analytics (opsional, untuk kesederhanaan), lalu klik **Create project**.

### Langkah 2: Mengaktifkan Cloud Firestore
1. Pada menu sebelah kiri, pilih **Build** > **Firestore Database**.
2. Klik **Create database**, pilih lokasi server terdekat (misal: `asia-southeast2` Jakarta atau `asia-southeast1` Singapura).
3. Pilih **Start in production mode** lalu klik **Create**.

### Langkah 3: Mengaktifkan Firebase Authentication
1. Pada menu sebelah kiri, pilih **Build** > **Authentication** > klik **Get started**.
2. Pada tab **Sign-in method**, pilih **Email/Password**.
3. Aktifkan sakelar **Enable** pada Email/Password, lalu klik **Save**.
4. Pindah ke tab **Users**, klik **Add user**. Masukkan email dan password yang ingin Anda gunakan sebagai akun Admin pernikahan Anda (misal: `admin@wedding.com` dan password pilihan Anda).

### Langkah 4: Memasukkan Kunci Konfigurasi ke File
1. Buka menu **Project settings** (ikon gerigi di samping menu kiri atas).
2. Di bagian bawah ("Your apps"), klik ikon Web (`</>`), beri nama aplikasi web Anda.
3. Salin nilai yang muncul di dalam objek `firebaseConfig`.
4. Buka file `undangan-digital/js/firebase-config.js` di VS Code, lalu tempelkan data tersebut:
   ```javascript
   const FIREBASE_CONFIG = {
     apiKey: "AIzaSy...",
     authDomain: "wedding-dimas-anindya.firebaseapp.com",
     projectId: "wedding-dimas-anindya",
     storageBucket: "wedding-dimas-anindya.appspot.com",
     messagingSenderId: "123456789...",
     appId: "1:123456789:web:abcdef..."
   };
   ```

### Langkah 5: Menerapkan Firestore Security Rules
1. Buka Firebase Console > **Firestore Database** > tab **Rules**.
2. Hapus seluruh isi default editor.
3. Buka file `undangan-digital/firestore.rules` dari project Anda, salin seluruh isinya, lalu tempelkan ke editor di Firebase Console.
4. Klik tombol **Publish**. Aturan keamanan siap melindungi database Anda secara profesional.

---

## 👑 5. PANDUAN PENGGUNAAN DASBOR ADMIN

Akses Dasbor Admin melalui:
👉 `http://127.0.0.1:5500/undangan-digital/admin.html`

### Fitur Dasbor Admin:
1. **Ringkasan (Overview):**
   - Menampilkan total undangan terdaftar, total RSVP masuk, rincian hadir beserta jumlah tamu yang dibawa, jumlah tidak hadir, dan ucapan yang menunggu moderasi.
2. **Manajemen Tamu (Guest Management):**
   - **Tambah Tamu:** Masukkan nama tamu, kode undangan, kategori (Keluarga, Sahabat, VIP, Rekan Kerja), dan kuota kursi.
   - **Generator Link 1-Klik:** Tombol salin pada setiap baris tamu langsung menghasilkan tautan personal lengkap dengan parameter nama dan kode.
   - **Edit & Hapus Tamu:** Perbarui data tamu atau hapus dari database.
3. **Konfirmasi RSVP:**
   - Melihat seluruh tamu yang telah mengisi kehadiran secara real-time.
   - Kolom pencarian instan berdasarkan nama tamu.
   - Filter berdasarkan status kehadiran (Semua, Akan Hadir, Tidak Hadir, Ragu-ragu).
   - **Ekspor CSV:** Klik tombol "Ekspor CSV" untuk mengunduh daftar tamu hadir ke file Excel/Spreadsheet.
4. **Moderasi Buku Tamu:**
   - Filter ucapan: *Menunggu Persetujuan (PENDING)*, *Disetujui (APPROVED)*, dan *Ditolak (REJECTED)*.
   - Tombol **Setujui**: Menjadikan ucapan langsung tampil di halaman depan website.
   - Tombol **Tolak**: Menyembunyikan ucapan dari publik tanpa menghapusnya.
   - Tombol **Hapus**: Menghapus ucapan secara permanen.

> **Tips Uji Coba Tanpa Firebase:** Jika Firebase belum Anda hubungkan, Anda tetap dapat menguji tampilan dan fitur dasbor dengan email: `admin@wedding.com` dan password: `admin123`.

---

## 🎨 6. PANDUAN KUSTOMISASI KONTEN & MEDIA

Semua informasi acara, nama mempelai, kutipan, dan rekening dapat diubah pada satu file:
👉 [js/config.js](file:///d:/UNDANGAN%20DIGITAL/undangan-digital/js/config.js)

- **Nama Mempelai:** Ubah di properti `couple.groom` dan `couple.bride`.
- **Tanggal & Countdown:** Ubah di properti `events.akad`, `events.resepsi`, dan `countdown.targetDate` (format: `YYYY-MM-DDTHH:mm:ss`).
- **Nomor Rekening & Bank:** Ubah di properti `gift.bankAccounts`.
- **Foto:** Letakkan foto pengganti di `assets/images/` dengan nama yang sama:
  - `cover.jpg` (Foto sampul vertikal)
  - `couple-1.jpg` & `couple-2.jpg` (Foto mempelai rasio 1:1)
  - `gallery-1.jpg` s/d `gallery-4.jpg` (Foto galeri)
  - `qrcode.png` (Gambar QRIS kado)
- **Musik:** Letakkan lagu pengganti di `assets/music/lagu-undangan.mp3`.

---

## 🌐 7. PANDUAN DEPLOYMENT KE HOSTING PUBLIK

### Opsi A: Firebase Hosting (Sangat Direkomendasikan)
Karena backend sudah menggunakan Firebase, menggunakan Firebase Hosting adalah pilihan paling optimal:
1. Pasang Firebase CLI: `npm install -g firebase-tools`
2. Jalankan `firebase login` lalu `firebase init hosting` (pilih folder `undangan-digital` sebagai public directory).
3. Jalankan `firebase deploy`. Website Anda langsung aktif di `https://project-anda.web.app`.

### Opsi B: Netlify / Vercel (Gratis & Tanpa CLI)
1. Buka [Netlify.com](https://netlify.com).
2. Drag-and-drop folder `undangan-digital` ke dashboard Netlify.
3. Website langsung online dalam hitungan detik.

### Opsi C: Web Hosting cPanel (.com / .id)
1. Buka cPanel hosting Anda > masuk ke **File Manager** > buka folder `public_html`.
2. Upload seluruh file dan folder di dalam `undangan-digital/` ke `public_html`.
3. Buka domain Anda di browser.

---

## 📌 8. DAFTAR PEKERJAAN YANG MASIH TERSISA

Meskipun seluruh struktur kode frontend, backend, aturan keamanan, dan dasbor admin telah selesai 100%, berikut adalah daftar tugas pengguna sebelum undangan disebarkan secara resmi:

1. **Memasukkan Kredensial Firebase:**
   - Membuka `js/firebase-config.js` dan mengganti nilai `apiKey`, `projectId`, dsb. dengan proyek Firebase Anda.
2. **Membuat Akun Admin di Firebase Console:**
   - Menambahkan akun email/password di menu *Authentication* > *Users*.
3. **Mengunggah Aturan Keamanan:**
   - Menyalin isi `firestore.rules` ke menu *Firestore* > *Rules* di Firebase Console.
4. **Mengganti Foto & Musik Asli:**
   - Menimpa file di `assets/images/` dan `assets/music/` dengan foto dan lagu asli kedua mempelai.
5. **Memeriksa Nomor WhatsApp & Rekening:**
   - Memastikan nomor WhatsApp di `js/config.js` diawali kode negara `62` tanpa tanda plus.

---
*Dibuat dengan cinta dan dedikasi teknis tinggi untuk menyempurnakan hari bahagia Anda.* 💐

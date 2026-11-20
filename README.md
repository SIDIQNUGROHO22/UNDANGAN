# 💍 Website Undangan Pernikahan Digital Fullstack (Node.js & Modern UI)

Selamat datang di project **Undangan Digital Modern Fullstack**. Project ini telah dirancang ulang secara menyeluruh dengan memisahkan arsitektur **Backend (Server & Database)** dan **Frontend (Antarmuka Modern)** ke dalam folder terpisah yang rapi, modular, dan siap diakses online.

---

## ⚡ CARA MEMBUKA & MENCOBANYA SEKARANG (PANDUAN CEPAT)

### 1. Menjalankan Server:
* **Cara Paling Praktis (1-Klik):** Cukup **klik dua kali (double click)** file **`JALANKAN_SERVER.bat`** di folder utama ini.
* **Cara Terminal:** Buka terminal di folder ini, lalu jalankan:
  ```bash
  npm start
  ```

### 2. Membuka di Browser Anda:
* **Halaman Undangan Utama:** [http://localhost:3000](http://localhost:3000)
* **Contoh Undangan Kustom Nama WA:** [http://localhost:3000/?to=Bapak+Budi+Santoso](http://localhost:3000/?to=Bapak+Budi+Santoso)
* **Panel Dasbor Admin:** [http://localhost:3000/admin](http://localhost:3000/admin) (atau `http://localhost:3000/admin.html`)
  * **Email Login:** `admin@wedding.com`
  * **Password:** `admin123`

> 🔒 **Catatan Keamanan:**
> Tautan menu Admin sengaja **dipisahkan dan tidak ditaruh di bawah (footer) website tamu** agar tamu undangan tidak iseng mengacak-acak website. Akses admin hanya bisa dibuka melalui link rahasia di atas dan dilindungi oleh kata sandi login.

---

## 📁 1. STRUKTUR FOLDER TERBARU

```text
d:\UNDANGAN DIGITAL\
│
├── JALANKAN_SERVER.bat            # File jalan pintas: klik 2x untuk menyalakan server otomatis
├── package.json                   # Script utama: npm start untuk menjalankan seluruh website
├── README.md                      # Panduan lengkap pengguna
├── index.html                     # Redirection cepat ke halaman frontend
│
├── backend/                       # ================= BACKEND (SERVER & REST API) =================
│   ├── server.js                  # Entry point Express.js (melayani REST API & file statis)
│   ├── package.json               # Dependensi server (express, cors)
│   │
│   ├── config/
│   │   └── default-invitation.json# Template konfigurasi default undangan
│   │
│   ├── data/                      # DATABASE SERVER MANDIRI (JSON Database)
│   │   ├── settings.json          # Data kustomisasi undangan aktif (nama mempelai, acara, dsb)
│   │   ├── guests.json            # Database daftar tamu undangan
│   │   ├── rsvps.json             # Database konfirmasi kehadiran (RSVP) tamu
│   │   ├── wishes.json            # Database ucapan doa restu & like
│   │   └── admin.json             # Kredensial akun admin & session token
│   │
│   ├── middleware/
│   │   └── auth.middleware.js     # Proteksi rute admin via Token Bearer
│   │
│   ├── routes/
│   │   ├── invitation.routes.js   # GET & POST kustomisasi konten undangan
│   │   ├── rsvp.routes.js         # API simpan konfirmasi kehadiran tamu
│   │   ├── wishes.routes.js       # API ucapan doa & like
│   │   ├── guests.routes.js       # API CRUD daftar tamu
│   │   ├── wa.routes.js           # API generator pesan & link WhatsApp kustom
│   │   ├── auth.routes.js         # API login, logout, & verifikasi admin
│   │   └── export.routes.js       # API ekspor data ke Excel / CSV
│   │
│   └── services/
│       └── db.service.js          # Layanan baca-tulis atomic JSON database yang aman
│
└── frontend/                      # ================= FRONTEND (UI/UX MODERN) =====================
    ├── index.html                 # Halaman utama undangan pernikahan digital
    ├── admin.html                 # Portal Dasbor Pengelola / Admin
    │
    ├── admin/
    │   └── index.html             # Redirection praktis jika membuka /admin/
    │
    ├── css/
    │   ├── style.css              # Desain luxury modern, tipografi serif, glassmorphism
    │   ├── responsive.css         # Optimalisasi tampilan layar smartphone & tablet
    │   ├── animation.css          # Animasi reveal foto, vinyl berputar, audio waves
    │   └── admin.css              # Desain Dasbor Admin & form login
    │
    ├── js/
    │   ├── api.js                 # API Client penghubung frontend ke backend server
    │   ├── config.js              # Fallback konfigurasi statis (offline resilience)
    │   ├── guest.js               # Parser parameter URL nama tamu (?to=...)
    │   ├── countdown.js           # Hitung mundur presisi + Google Calendar
    │   ├── music.js               # Pengontrol audio latar (background music)
    │   ├── dynamic-island.js      # Widget Dynamic Island ala iPhone di bagian atas
    │   ├── rsvp.js                # Handler formulir RSVP (tersimpan ke server + WhatsApp)
    │   ├── wa-generator.js        # Generator pesan WhatsApp kustom siap kirim
    │   ├── qrcode.js              # Generator QR Code fisik
    │   ├── main.js                # Logika utama, render data dinamis, galeri & buku tamu
    │   └── admin.js               # Logika Dasbor Admin (CRUD tamu, RSVP, moderasi, editor)
    │
    └── assets/
        ├── images/                # Foto cover, mempelai, galeri, background, QRIS
        └── music/                 # File audio instrumen romantis (lagu-undangan.mp3)
```

---

## 🚀 2. CARA MENJALANKAN SERVER

Pastikan Node.js telah terpasang di komputer Anda.

### Cara 1: Jalankan dari Folder Utama (Paling Mudah)
Buka terminal (PowerShell / Command Prompt) di folder `D:\UNDANGAN DIGITAL`:
```bash
npm start
```

### Cara 2: Jalankan dari Folder Backend
```bash
cd backend
npm start
```

Server akan langsung aktif dan menampilkan output:
```text
================================================================
💍 SERVER UNDANGAN DIGITAL BERHASIL DIJALANKAN!
📡 URL Website Utama    : http://localhost:3000
💌 Contoh Link Tamu WA  : http://localhost:3000/?to=Bapak+Budi+Santoso
🔐 Dasbor Kelola Admin  : http://localhost:3000/admin.html
⚙️  API Endpoint         : http://localhost:3000/api/invitation
================================================================
```

---

## 💌 3. CARA MENGAKSES & KUSTOMISASI NAMA TAMU

### A. Mengakses Website Utama
- Buka browser dan ketik: `http://localhost:3000`

### B. Mengirimkan Undangan dengan Nama Tamu Khusus (WhatsApp)
Anda cukup menambahkan parameter `?to=...` di belakang alamat website:
- Contoh 1: `http://localhost:3000/?to=Bapak+Budi+Santoso`
- Contoh 2: `http://localhost:3000/?to=Ibu+Ratna+Dewi+%26+Keluarga`
- Contoh 3: `http://localhost:3000/?to=Sahabatku+Rian`

Saat tautan tersebut dibuka oleh tamu:
1. Halaman sampul (cover) akan otomatis menampilkan tulisan:
   > **Kepada Yth. Bapak/Ibu/Saudara/i:**
   > **Bapak Budi Santoso**
2. Kolom nama pada formulir RSVP akan otomatis terisi dengan nama tamu tersebut.

### C. Menggunakan Generator WhatsApp Otomatis
Anda tidak perlu repot mengetik URL secara manual!
1. Buka section **"Kirim Undangan via WhatsApp"** di halaman undangan (atau di Tab **Broadcast WA** pada Dasbor Admin).
2. Masukkan nama tamu (contoh: *Bapak Dr. Faisal & Istri*).
3. Masukkan nomor HP (opsional).
4. Pilih gaya bahasa:
   - **Formal / Sopan**: Cocok untuk keluarga besar, dosen, atasan, atau kolega.
   - **Santai / Akrab**: Cocok untuk teman sebaya dan sahabat.
   - **Islami & Doa**: Dilengkapi salam pembuka dan doa barokah.
5. Klik **"Salin Teks Pesan Lengkap"** atau klik **"Buka & Kirim di WhatsApp"** untuk langsung mengirimkan undangan via WhatsApp Web atau aplikasi ponsel!

---

## 👑 4. DASBOR ADMIN & KUSTOMISASI KONTEN UNDANGAN

Akses Dasbor Admin di: `http://localhost:3000/admin.html` (atau `http://localhost:3000/admin`)

- **Email Login:** `admin@wedding.com`
- **Password:** `admin123`

### Fitur Dasbor Admin:
1. **Ringkasan (Overview):**
   - Menampilkan total tamu terdaftar, jumlah RSVP masuk, total orang yang hadir (*pax count*), tamu yang berhalangan, serta ucapan yang masuk.
2. **Daftar Tamu:**
   - Tambah tamu baru beserta kuota pax dan nomor meja.
   - Tombol **"WA"** (1-klik langsung membuka WhatsApp dengan pesan undangan personal siap kirim ke tamu tersebut).
   - Ekspor daftar tamu ke file CSV / Excel.
3. **Konfirmasi RSVP:**
   - Melihat daftar konfirmasi dari tamu secara real-time.
   - Filter status: Hadir, Tidak Hadir, atau Ragu-ragu.
   - Ekspor data RSVP ke Excel / CSV untuk kebutuhan katering dan penataan meja.
4. **Moderasi Ucapan:**
   - Setujui (Approve), Tolak (Reject), atau Hapus ucapan tamu yang tidak pantas.
5. **Broadcast WhatsApp:**
   - Alat bantu kirim pesan undangan massal untuk setiap tamu.
6. **Kustomisasi Konten & Tema Undangan (Fitur Baru!):**
   - **Tab 1 - 5 (Data Mempelai & Acara):** Mengubah Nama Mempelai, Nama Orang Tua, Tanggal Akad, Jam, Lokasi, Link Google Maps, Cerita Cinta, dan Nomor Rekening Bank langsung melalui formulir dasbor.
   - **Tab 6 (Musik Multi-Sumber & Dual Kayon Wayang):**
     - **Musik Berbagai Sumber:** Mendukung link share **YouTube** (otomatis memutar audio video YouTube tanpa iklan), file **MP3 offline** di folder project, maupun URL direct audio online (CDN, Google Drive, Dropbox).
     - **Dual Kayon Gunungan (Kiri & Kanan):** Dapat memasukkan 2 gambar Kayon berbeda untuk sisi kiri dan kanan (mendukung link gambar dari **Pinterest**, **Google Drive**, link web, maupun file offline), serta dilengkapi animasi belah tirai kelir wayang yang sangat halus (*ultra-smooth cinematic glide*).
     - **Uji Putar Musik:** Tombol live preview untuk mendengarkan lagu sebelum disimpan.
   - Klik **"Simpan Seluruh Perubahan"**, dan website undangan akan langsung ter-update secara otomatis tanpa perlu mengubah baris kode program satu pun!

---

## 💡 5. SARAN & KOREKSI TERBAIK (IDE PENYEMPURNAAN)

Berikut beberapa peningkatan penting yang telah diterapkan dalam arsitektur baru ini:

1. **Mengapa Memakai Server Backend Mandiri (Node.js) Lebih Bagus Dibandingkan Firebase Murni?**
   - **Kelebihan:** Pengguna tidak perlu pusing membuat akun Google Cloud, mendaftar Firebase Console, copy-paste apiKey, atau setting database billing.
   - Server ini bekerja **100% Plug-and-Play** di laptop Anda saat ini juga, dan datanya tersimpan aman di folder `backend/data/`.
2. **Kesiapan Deployment Online (Bisa Diakses dari Seluruh Dunia):**
   - Folder telah terpisah rapi menjadi `backend/` dan `frontend/`.
   - Jika Anda ingin meng-online-kan undangan agar bisa dibuka oleh siapa saja di internet:
     - **Opsi A (Paling Mudah - 1 Layanan Fullstack):** Unggah repositori ini ke **Render.com** atau **Railway.app**. Masukkan build command `npm install` dan start command `npm start`. Anda akan langsung mendapatkan domain online seperti `https://undangan-dimas-anindya.onrender.com`.
     - **Opsi B (Terpisah):** Frontend di-hosting di **Vercel** / **Netlify** / **GitHub Pages**, dan Backend di-hosting di **Render** / **Cloud Run**. API endpoint di `frontend/js/api.js` sudah siap mendukung komunikasi lintas domain (CORS).
3. **Penyimpanan Atomic Write untuk Mencegah File Rusak:**
   - Database file JSON dilengkapi teknik *atomic write* (menulis ke file sementara terlebih dahulu sebelum menggantikan file utama), sehingga data RSVP dan ucapan tidak akan pernah corrupt meskipun server mendadak dimatikan.
4. **Interaktivitas Modern 2026:**
   - Tamu undangan dapat memberikan reaksi **Like (Hati)** pada ucapan tamu lain secara langsung.
   - Tombol salin nomor rekening dan alamat kado fisik dilengkapi notifikasi *toast* mengambang yang elegan.


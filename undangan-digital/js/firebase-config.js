/**
 * ==============================================================================
 * FIREBASE CONFIGURATION (firebase-config.js)
 * ==============================================================================
 * File konfigurasi Cloud Firestore dan Firebase Authentication.
 * 
 * PANDUAN PENGISIAN UNTUK PENGGUNA:
 * 1. Buka Firebase Console: https://console.firebase.google.com/
 * 2. Buat proyek baru (misal: "wedding-sidiq-anisa").
 * 3. Tambahkan Web App (ikon </>) lalu salin objek "firebaseConfig" ke bawah ini.
 * 4. Aktifkan "Email/Password" di menu Firebase Authentication > Sign-in method.
 * 5. Aktifkan "Cloud Firestore" di menu Firestore Database (pilih mode produksi).
 * 6. Terapkan aturan keamanan dari file "firestore.rules".
 * ==============================================================================
 */

const FIREBASE_CONFIG = {
  // Ganti nilai placeholder di bawah ini dengan konfigurasi asli dari Firebase Console Anda:
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Freeze agar tidak dapat diubah secara tidak sengaja di runtime
if (typeof Object.freeze === "function") {
  Object.freeze(FIREBASE_CONFIG);
}

/**
 * ==============================================================================
 * FIREBASE SERVICE (firebase-service.js)
 * ==============================================================================
 * Lapisan abstraksi modular untuk Cloud Firestore dan Firebase Authentication.
 * Menggunakan Firebase SDK v10 via CDN resmi Google (tanpa npm / build tool).
 * 
 * Dilengkapi "Graceful Fallback Mode" jika konfigurasi Firebase belum diisi:
 * - Aplikasi tetap berjalan normal di mode offline/lokal.
 * - Data tersimpan sementara di localStorage saat Firebase belum terhubung.
 * - Memberikan log informatif di konsol tanpa menghasilkan error fatal.
 * ==============================================================================
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const FirebaseService = (function () {
  let app = null;
  let auth = null;
  let db = null;
  let isReady = false;

  // Nama koleksi Firestore
  const COLLECTIONS = {
    RSVPS: "rsvps",
    GUESTBOOK: "guestbook",
    GUESTS: "guests",
    EVENTS: "events"
  };

  /**
   * Mengecek apakah konfigurasi Firebase sudah diisi dengan data asli
   * @returns {boolean}
   */
  function isConfigured() {
    if (typeof FIREBASE_CONFIG === "undefined") return false;
    const key = FIREBASE_CONFIG.apiKey;
    return Boolean(
      key && 
      key !== "YOUR_FIREBASE_API_KEY" && 
      key.trim().length > 10 && 
      !key.includes("YOUR_")
    );
  }

  /**
   * Inisialisasi Firebase App, Auth, dan Firestore
   */
  function init() {
    if (!isConfigured()) {
      console.info(
        "%c[Firebase Notice]%c Konfigurasi Firebase belum diisi di js/firebase-config.js. Website otomatis berjalan dalam mode fallback lokal (localStorage). Setelah Anda memasukkan kunci Firebase, data akan langsung tersimpan di Cloud Firestore online.",
        "color: #c5a059; font-weight: bold;",
        "color: inherit;"
      );
      return false;
    }

    try {
      app = initializeApp(FIREBASE_CONFIG);
      auth = getAuth(app);
      db = getFirestore(app);
      isReady = true;
      console.log("%c[Firebase Connected]%c Cloud Firestore & Auth aktif.", "color: #15803d; font-weight: bold;", "color: inherit;");
      return true;
    } catch (err) {
      console.error("[Firebase Init Error] Gagal menginisialisasi Firebase:", err);
      isReady = false;
      return false;
    }
  }

  // Langsung inisialisasi saat modul dimuat
  init();

  // ============================================================================
  // 1. MODUL RSVP (KONFIRMASI KEHADIRAN)
  // ============================================================================

  /**
   * Mengirim data RSVP ke Cloud Firestore
   * @param {Object} data { guestName, invitationCode, status, guestsCount, message }
   * @returns {Promise<{success: boolean, id?: string, fallback?: boolean, error?: string}>}
   */
  async function submitRsvp(data) {
    // Validasi input
    if (!data.guestName || data.guestName.trim().length === 0) {
      return { success: false, error: "Nama tamu wajib diisi." };
    }
    if (!data.status || !["hadir", "tidak-hadir", "ragu"].includes(data.status)) {
      return { success: false, error: "Status kehadiran tidak valid." };
    }

    const payload = {
      guestName: data.guestName.trim().slice(0, 100),
      invitationCode: (data.invitationCode || "").trim().slice(0, 50),
      status: data.status,
      guestsCount: Math.min(Math.max(parseInt(data.guestsCount, 10) || 1, 1), 10),
      message: (data.message || "").trim().slice(0, 500),
      createdAt: isReady ? serverTimestamp() : new Date().toISOString()
    };

    if (isReady && db) {
      try {
        const docRef = await addDoc(collection(db, COLLECTIONS.RSVPS), payload);
        return { success: true, id: docRef.id, online: true };
      } catch (err) {
        console.error("[Firestore Error] Gagal menyimpan RSVP online:", err);
        // Fallback simpan lokal jika koneksi gagal
        saveRsvpLocally(payload);
        return { success: true, fallback: true, error: err.message };
      }
    } else {
      saveRsvpLocally(payload);
      return { success: true, fallback: true };
    }
  }

  function saveRsvpLocally(payload) {
    try {
      const existing = JSON.parse(localStorage.getItem("wedding_rsvps_local") || "[]");
      existing.unshift({ ...payload, id: "local_" + Date.now() });
      localStorage.setItem("wedding_rsvps_local", JSON.stringify(existing));
    } catch (e) {
      console.warn("Gagal menyimpan RSVP lokal:", e);
    }
  }

  /**
   * Mengambil seluruh data RSVP (Hanya untuk Admin)
   * @returns {Promise<Array>}
   */
  async function getRsvps() {
    if (isReady && db) {
      try {
        const q = query(collection(db, COLLECTIONS.RSVPS), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const list = [];
        snapshot.forEach(docSnap => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            ...d,
            createdAtFormatted: formatTimestamp(d.createdAt)
          });
        });
        return list;
      } catch (err) {
        console.error("[Firestore Error] Gagal mengambil daftar RSVP:", err);
        return getLocalRsvps();
      }
    }
    return getLocalRsvps();
  }

  function getLocalRsvps() {
    try {
      return JSON.parse(localStorage.getItem("wedding_rsvps_local") || "[]");
    } catch (e) {
      return [];
    }
  }

  async function deleteRsvp(id) {
    if (isReady && db && !id.startsWith("local_")) {
      await deleteDoc(doc(db, COLLECTIONS.RSVPS, id));
      return true;
    }
    // Hapus dari local
    const local = getLocalRsvps().filter(r => r.id !== id);
    localStorage.setItem("wedding_rsvps_local", JSON.stringify(local));
    return true;
  }

  // ============================================================================
  // 2. MODUL BUKU TAMU (GUESTBOOK) DENGAN MODERASI
  // ============================================================================

  /**
   * Mengirim ucapan baru oleh pengunjung (Status awal: PENDING)
   * @param {Object} data { name, message }
   * @returns {Promise<{success: boolean, id?: string, fallback?: boolean, error?: string}>}
   */
  async function submitWish(data) {
    if (!data.name || data.name.trim().length === 0) {
      return { success: false, error: "Nama pengirim wajib diisi." };
    }
    if (!data.message || data.message.trim().length === 0) {
      return { success: false, error: "Pesan ucapan wajib diisi." };
    }

    const payload = {
      name: data.name.trim().slice(0, 100),
      message: data.message.trim().slice(0, 1000),
      status: "PENDING", // Wajib PENDING pada pengiriman publik
      createdAt: isReady ? serverTimestamp() : new Date().toISOString()
    };

    if (isReady && db) {
      try {
        const docRef = await addDoc(collection(db, COLLECTIONS.GUESTBOOK), payload);
        return { success: true, id: docRef.id, online: true };
      } catch (err) {
        console.error("[Firestore Error] Gagal mengirim ucapan online:", err);
        saveWishLocally(payload);
        return { success: true, fallback: true, error: err.message };
      }
    } else {
      saveWishLocally(payload);
      return { success: true, fallback: true };
    }
  }

  function saveWishLocally(payload) {
    try {
      const existing = JSON.parse(localStorage.getItem("wedding_wishes_data") || "[]");
      const dateStr = new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }) + ", " + new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

      existing.unshift({
        id: "local_" + Date.now(),
        name: payload.name,
        message: payload.message,
        status: "APPROVED", // Di mode fallback lokal langsung approve agar pengunjung lokal bisa melihat hasil
        date: dateStr
      });
      localStorage.setItem("wedding_wishes_data", JSON.stringify(existing));
    } catch (e) {
      console.warn("Gagal menyimpan ucapan lokal:", e);
    }
  }

  /**
   * Mengambil ucapan yang sudah disetujui (APPROVED) untuk pembaca umum
   * @returns {Promise<Array>}
   */
  async function getApprovedWishes() {
    if (isReady && db) {
      try {
        const q = query(
          collection(db, COLLECTIONS.GUESTBOOK),
          where("status", "==", "APPROVED"),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        const list = [];
        snapshot.forEach(docSnap => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            name: d.name,
            message: d.message,
            status: d.status,
            date: formatTimestamp(d.createdAt)
          });
        });
        return list;
      } catch (err) {
        console.warn("[Firestore Read] Belum dapat mengambil ucapan online:", err);
      }
    }

    // Fallback: baca dari local storage atau default
    try {
      const stored = localStorage.getItem("wedding_wishes_data");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  }

  /**
   * Mengambil seluruh ucapan (PENDING, APPROVED, REJECTED) untuk Admin
   * @returns {Promise<Array>}
   */
  async function getAllWishes() {
    if (isReady && db) {
      try {
        const q = query(collection(db, COLLECTIONS.GUESTBOOK), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const list = [];
        snapshot.forEach(docSnap => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            ...d,
            date: formatTimestamp(d.createdAt)
          });
        });
        return list;
      } catch (err) {
        console.error("[Firestore Error] Gagal mengambil seluruh buku tamu:", err);
      }
    }

    // Fallback
    try {
      return JSON.parse(localStorage.getItem("wedding_wishes_data") || "[]");
    } catch (e) {
      return [];
    }
  }

  /**
   * Mengubah status moderasi ucapan (APPROVED / REJECTED)
   * @param {string} id 
   * @param {'APPROVED'|'REJECTED'} newStatus 
   */
  async function updateWishStatus(id, newStatus) {
    if (!["APPROVED", "REJECTED", "PENDING"].includes(newStatus)) return false;

    if (isReady && db && !id.startsWith("local_")) {
      const ref = doc(db, COLLECTIONS.GUESTBOOK, id);
      await updateDoc(ref, { status: newStatus });
      return true;
    }

    // Update lokal
    try {
      const stored = JSON.parse(localStorage.getItem("wedding_wishes_data") || "[]");
      const target = stored.find(w => w.id === id);
      if (target) {
        target.status = newStatus;
        localStorage.setItem("wedding_wishes_data", JSON.stringify(stored));
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Menghapus ucapan secara permanen
   * @param {string} id 
   */
  async function deleteWish(id) {
    if (isReady && db && !id.startsWith("local_")) {
      await deleteDoc(doc(db, COLLECTIONS.GUESTBOOK, id));
      return true;
    }

    try {
      const stored = JSON.parse(localStorage.getItem("wedding_wishes_data") || "[]");
      const filtered = stored.filter(w => w.id !== id);
      localStorage.setItem("wedding_wishes_data", JSON.stringify(filtered));
      return true;
    } catch (e) {
      return false;
    }
  }

  // ============================================================================
  // 3. MODUL MANAJEMEN TAMU (GUESTS)
  // ============================================================================

  async function getGuests() {
    if (isReady && db) {
      try {
        const q = query(collection(db, COLLECTIONS.GUESTS), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const list = [];
        snapshot.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        return list;
      } catch (err) {
        console.warn("[Firestore] Gagal mengambil daftar tamu online:", err);
      }
    }
    try {
      return JSON.parse(localStorage.getItem("wedding_guests_local") || "[]");
    } catch (e) {
      return [];
    }
  }

  async function addGuest(data) {
    const payload = {
      name: (data.name || "").trim().slice(0, 100),
      code: (data.code || generateGuestCode(data.name)).trim().toUpperCase(),
      category: data.category || "Umum",
      pax: parseInt(data.pax, 10) || 2,
      notes: (data.notes || "").trim(),
      createdAt: isReady ? serverTimestamp() : new Date().toISOString()
    };

    if (isReady && db) {
      const ref = await addDoc(collection(db, COLLECTIONS.GUESTS), payload);
      return { success: true, id: ref.id, ...payload };
    }

    const local = JSON.parse(localStorage.getItem("wedding_guests_local") || "[]");
    const item = { id: "guest_" + Date.now(), ...payload };
    local.unshift(item);
    localStorage.setItem("wedding_guests_local", JSON.stringify(local));
    return { success: true, ...item };
  }

  async function updateGuest(id, data) {
    if (isReady && db && !id.startsWith("guest_")) {
      const ref = doc(db, COLLECTIONS.GUESTS, id);
      await updateDoc(ref, data);
      return true;
    }
    const local = JSON.parse(localStorage.getItem("wedding_guests_local") || "[]");
    const idx = local.findIndex(g => g.id === id);
    if (idx !== -1) {
      local[idx] = { ...local[idx], ...data };
      localStorage.setItem("wedding_guests_local", JSON.stringify(local));
    }
    return true;
  }

  async function deleteGuest(id) {
    if (isReady && db && !id.startsWith("guest_")) {
      await deleteDoc(doc(db, COLLECTIONS.GUESTS, id));
      return true;
    }
    const local = JSON.parse(localStorage.getItem("wedding_guests_local") || "[]");
    const filtered = local.filter(g => g.id !== id);
    localStorage.setItem("wedding_guests_local", JSON.stringify(filtered));
    return true;
  }

  function generateGuestCode(name) {
    const prefix = (name || "TAMU").replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase() || "WDG";
    const rand = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${rand}`;
  }

  // ============================================================================
  // 4. MODUL AUTENTIKASI ADMIN
  // ============================================================================

  async function loginAdmin(email, password) {
    if (!isReady || !auth) {
      // Fallback demo login jika Firebase belum dihubungkan pengguna
      if (email === "admin@wedding.com" && password === "admin123") {
        const dummyUser = { email: "admin@wedding.com", uid: "demo_admin_user" };
        sessionStorage.setItem("wedding_admin_session", JSON.stringify(dummyUser));
        return { success: true, user: dummyUser, isDemo: true };
      }
      return { 
        success: false, 
        error: "Firebase belum terhubung. Untuk mode uji coba lokal sebelum mengisi Firebase, Anda dapat menggunakan email: admin@wedding.com dan password: admin123" 
      };
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: cred.user };
    } catch (err) {
      let msg = "Gagal login. Periksa email dan password Anda.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        msg = "Email atau password yang Anda masukkan salah.";
      } else if (err.code === "auth/too-many-requests") {
        msg = "Terlalu banyak percobaan gagal. Silakan coba beberapa saat lagi.";
      }
      return { success: false, error: msg };
    }
  }

  async function logoutAdmin() {
    sessionStorage.removeItem("wedding_admin_session");
    if (isReady && auth) {
      await signOut(auth);
    }
    return true;
  }

  function onAdminAuthStateChanged(callback) {
    if (isReady && auth) {
      return onAuthStateChanged(auth, user => {
        callback(user);
      });
    } else {
      // Periksa session demo
      const session = sessionStorage.getItem("wedding_admin_session");
      if (session) {
        try {
          callback(JSON.parse(session));
        } catch (e) {
          callback(null);
        }
      } else {
        callback(null);
      }
      return () => {};
    }
  }

  function getCurrentUser() {
    if (isReady && auth) return auth.currentUser;
    try {
      const session = sessionStorage.getItem("wedding_admin_session");
      return session ? JSON.parse(session) : null;
    } catch (e) {
      return null;
    }
  }

  // Helper pemformat tanggal timestamp Firestore
  function formatTimestamp(ts) {
    if (!ts) return "";
    let d;
    if (ts.toDate && typeof ts.toDate === "function") {
      d = ts.toDate();
    } else if (typeof ts === "string" || typeof ts === "number") {
      d = new Date(ts);
    } else if (ts.seconds) {
      d = new Date(ts.seconds * 1000);
    } else {
      d = new Date();
    }
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }) + ", " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  }

  return {
    isConfigured: isConfigured,
    isReady: function () { return isReady; },
    // RSVP
    submitRsvp: submitRsvp,
    getRsvps: getRsvps,
    deleteRsvp: deleteRsvp,
    // Guestbook
    submitWish: submitWish,
    getApprovedWishes: getApprovedWishes,
    getAllWishes: getAllWishes,
    updateWishStatus: updateWishStatus,
    deleteWish: deleteWish,
    // Guests
    getGuests: getGuests,
    addGuest: addGuest,
    updateGuest: updateGuest,
    deleteGuest: deleteGuest,
    // Auth
    loginAdmin: loginAdmin,
    logoutAdmin: logoutAdmin,
    onAdminAuthStateChanged: onAdminAuthStateChanged,
    getCurrentUser: getCurrentUser
  };
})();

// Ekspor ke window agar dapat dipanggil dari skrip vanilla non-modul
window.WeddingFirebase = FirebaseService;
export default FirebaseService;

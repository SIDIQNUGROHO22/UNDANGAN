/**
 * ==============================================================================
 * API CLIENT - PENGHUBUNG FRONTEND KE BACKEND SERVER (js/api.js)
 * ==============================================================================
 * Menangani seluruh request HTTP (REST API) ke server backend.
 * Dilengkapi fallback otomatis ke mode mandiri / offline jika backend offline.
 * ==============================================================================
 */

const API = {
  baseUrl: (window.location.protocol === 'http:' || window.location.protocol === 'https:') 
    ? window.location.origin 
    : 'http://localhost:3000',

  // Cek apakah terhubung dengan server backend
  async checkServerHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${this.baseUrl}/api/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      return res.ok;
    } catch (_) {
      return false;
    }
  },

  // Helper request dengan timeout dan error handling
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    // Sisipkan token admin jika ada
    let token = null;
    try {
      token = localStorage.getItem('wedding_admin_token');
    } catch (_) {}
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutMs = options.timeout || 2500;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...options, headers, signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `HTTP Error ${response.status}`);
      }

      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn(`[API] Request ke ${endpoint} gagal:`, err.message);
      throw err;
    }
  },

  // 1. DATA KONFIGURASI UNDANGAN
  async getInvitationConfig() {
    // Bersihkan data sampah atau nama mock di localStorage jika ada
    try {
      const localCustom = localStorage.getItem('wedding_custom_settings');
      if (localCustom && /Prabowo|Teddy|Dimas|Anindya|agus|agis/i.test(localCustom)) {
        localStorage.removeItem('wedding_custom_settings');
      }
    } catch (_) {}

    try {
      const res = await this.request('/api/invitation');
      if (res && res.success && res.data) {
        this.safeSetLocalStorage('wedding_custom_settings', JSON.stringify(res.data));
        return res.data;
      }
    } catch (_) {}
    
    // Fallback ke localStorage jika ada perubahan lokal yang tersimpan
    try {
      const localCustom = localStorage.getItem('wedding_custom_settings');
      if (localCustom) {
        const parsed = JSON.parse(localCustom);
        if (typeof WEDDING_CONFIG !== 'undefined') {
          return { ...WEDDING_CONFIG, ...parsed };
        }
        return parsed;
      }
    } catch (_) {}

    // Fallback ke objek lokal WEDDING_CONFIG dari config.js
    return typeof WEDDING_CONFIG !== 'undefined' ? WEDDING_CONFIG : null;
  },

  safeSetLocalStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`Gagal menyimpan ${key} ke localStorage (kuota terlampaui):`, e);
    }
  },

  async updateInvitationConfig(settingsData) {
    try {
      const res = await this.request('/api/invitation', {
        method: 'POST',
        body: JSON.stringify(settingsData),
        timeout: 30000
      });
      // Sinkronkan juga salinan lokal di browser
      this.safeSetLocalStorage('wedding_custom_settings', JSON.stringify(settingsData));
      return res;
    } catch (err) {
      // Simpan lokal saat backend tidak terjangkau (Offline mode)
      this.safeSetLocalStorage('wedding_custom_settings', JSON.stringify(settingsData));
      if (typeof WEDDING_CONFIG !== 'undefined') {
        Object.assign(WEDDING_CONFIG, settingsData);
      }
      return {
        success: true,
        message: 'Konfigurasi berhasil disimpan ke memori browser (Mode Mandiri/Offline). Jalankan server untuk menyimpan permanen ke file JSON.',
        data: settingsData,
        isOffline: true
      };
    }
  },

  // UPLOAD FILE MUSIK MP3 KE SERVER
  async uploadMusic(payload) {
    if (window.location.hostname.includes('github.io') || window.location.protocol === 'file:') {
      return { success: false, isOffline: true, message: 'Mode Mandiri: Menggunakan link audio.' };
    }
    try {
      return await this.request('/api/upload/music', {
        method: 'POST',
        body: JSON.stringify(payload),
        timeout: 30000
      });
    } catch (err) {
      console.warn("Gagal upload musik ke server:", err.message);
      return { success: false, message: err.message };
    }
  },

  // UPLOAD / DOWNLOAD GAMBAR KE SERVER (FAVICON / WAYANG / DLL)
  async uploadImage(payload) {
    if (window.location.hostname.includes('github.io')) {
      return { success: false, isOffline: true, message: 'Mode Mandiri: Menggunakan data gambar lokal.' };
    }
    try {
      return await this.request('/api/upload/image', {
        method: 'POST',
        body: JSON.stringify(payload),
        timeout: 6000
      });
    } catch (err) {
      console.warn("Gagal upload gambar ke server:", err.message);
      return { success: false, message: err.message };
    }
  },

  // RESOLVE REMOTE MEDIA LINK (PINTEREST / WEB)
  async resolveMediaUrl(url) {
    try {
      return await this.request('/api/media/resolve', {
        method: 'POST',
        body: JSON.stringify({ url }),
        timeout: 15000
      });
    } catch (err) {
      console.warn("Gagal resolusi link media:", err.message);
      return { success: false, message: err.message };
    }
  },

  // 2. RSVP (KONFIRMASI KEHADIRAN)
  async submitRsvp(rsvpData) {
    try {
      return await this.request('/api/rsvps', {
        method: 'POST',
        body: JSON.stringify(rsvpData)
      });
    } catch (err) {
      // Fallback simpan lokal
      const rsvps = JSON.parse(localStorage.getItem('wedding_cached_rsvps') || '[]');
      const newRsvp = {
        id: 'rsvp-' + Date.now(),
        name: rsvpData.name,
        code: rsvpData.code || '',
        status: rsvpData.status || 'hadir',
        pax: rsvpData.pax || 1,
        message: rsvpData.message || '',
        createdAt: new Date().toISOString()
      };
      rsvps.unshift(newRsvp);
      localStorage.setItem('wedding_cached_rsvps', JSON.stringify(rsvps));
      return { success: true, message: 'RSVP berhasil disimpan secara lokal!', data: newRsvp };
    }
  },

  async getRsvps() {
    try {
      return await this.request('/api/rsvps');
    } catch (err) {
      const local = JSON.parse(localStorage.getItem('wedding_cached_rsvps') || '[]');
      const defaultRsvps = [
        {
          id: "rsvp-001",
          name: "Bapak Budi Santoso",
          code: "WDG-001",
          status: "hadir",
          pax: 2,
          message: "Selamat menempuh hidup baru, samawa selalu!",
          createdAt: new Date().toISOString()
        },
        {
          id: "rsvp-002",
          name: "Ibu Ratna Dewi",
          code: "WDG-002",
          status: "hadir",
          pax: 2,
          message: "Insya Allah hadir. Selamat berbahagia!",
          createdAt: new Date().toISOString()
        }
      ];
      const combined = local.length > 0 ? local : defaultRsvps;
      const hadir = combined.filter(r => r.status === 'hadir');
      const tidakHadir = combined.filter(r => r.status === 'tidak-hadir');
      const ragu = combined.filter(r => r.status === 'ragu');
      return {
        success: true,
        stats: {
          totalGuests: 3,
          totalRsvps: combined.length,
          hadirCount: hadir.length,
          totalPaxHadir: hadir.reduce((a, b) => a + (b.pax || 1), 0),
          tidakHadirCount: tidakHadir.length,
          raguCount: ragu.length,
          totalWishes: 3,
          pendingWishes: 0
        },
        data: combined
      };
    }
  },

  async deleteRsvp(id) {
    try {
      return await this.request(`/api/rsvps/${id}`, { method: 'DELETE' });
    } catch (err) {
      const rsvps = JSON.parse(localStorage.getItem('wedding_cached_rsvps') || '[]');
      const filtered = rsvps.filter(r => r.id !== id);
      localStorage.setItem('wedding_cached_rsvps', JSON.stringify(filtered));
      return { success: true, message: 'Data RSVP berhasil dihapus' };
    }
  },

  // 3. WISHES / BUKU TAMU
  async getWishes() {
    try {
      return await this.request('/api/wishes');
    } catch (err) {
      const local = JSON.parse(localStorage.getItem('wedding_cached_wishes') || '[]');
      const defaultWishes = [
        {
          id: "wish-001",
          name: "Budi Santoso",
          message: "Barakallahu lakum wa baraka alaikum wa jama'a bainakuma fii khair. Selamat berbahagia Sidiq dan Anisa!",
          status: "APPROVED",
          likes: 12,
          createdAt: new Date().toISOString()
        },
        {
          id: "wish-002",
          name: "Ratna Dewi",
          message: "Selamat ya Anisa & Mas Sidiq! Semoga menjadi keluarga yang sakinah, mawaddah, warahmah.",
          status: "APPROVED",
          likes: 8,
          createdAt: new Date().toISOString()
        },
        {
          id: "wish-003",
          name: "Rian Hidayat",
          message: "Selamat menempuh hidup baru! Lancar sampai hari H!",
          status: "APPROVED",
          likes: 15,
          createdAt: new Date().toISOString()
        }
      ];
      // Gabungkan ucapan pengguna lokal dengan ucapan bawaan agar tidak tertimpa
      const merged = [...local, ...defaultWishes];
      return {
        success: true,
        total: merged.length,
        data: merged
      };
    }
  },

  async submitWish(wishData) {
    try {
      const res = await this.request('/api/wishes', {
        method: 'POST',
        body: JSON.stringify(wishData)
      });
      // Juga sinkronkan ke local cache
      const wishes = JSON.parse(localStorage.getItem('wedding_cached_wishes') || '[]');
      const newWish = res && res.data ? res.data : {
        id: 'wish-' + Date.now(),
        name: wishData.name,
        message: wishData.message,
        sticker: wishData.sticker || '',
        status: 'APPROVED',
        likes: 0,
        createdAt: new Date().toISOString()
      };
      wishes.unshift(newWish);
      localStorage.setItem('wedding_cached_wishes', JSON.stringify(wishes));
      return res || { success: true, message: 'Ucapan berhasil dikirim!', data: newWish };
    } catch (err) {
      const wishes = JSON.parse(localStorage.getItem('wedding_cached_wishes') || '[]');
      const newWish = {
        id: 'wish-' + Date.now(),
        name: wishData.name,
        message: wishData.message,
        sticker: wishData.sticker || '',
        status: 'APPROVED',
        likes: 0,
        createdAt: new Date().toISOString()
      };
      wishes.unshift(newWish);
      localStorage.setItem('wedding_cached_wishes', JSON.stringify(wishes));
      return { success: true, message: 'Ucapan dan doa berhasil dikirimkan!', data: newWish };
    }
  },

  async likeWish(id) {
    try {
      const res = await this.request(`/api/wishes/${id}/like`, { method: 'POST' });
      const likesCount = (res && typeof res.likes === 'number') ? res.likes : 1;
      return { success: true, likes: likesCount, data: { likes: likesCount } };
    } catch (_) {
      return { success: true };
    }
  },

  async unlikeWish(id) {
    try {
      const res = await this.request(`/api/wishes/${id}/unlike`, { method: 'POST' });
      const likesCount = (res && typeof res.likes === 'number') ? res.likes : 0;
      return { success: true, likes: likesCount, data: { likes: likesCount } };
    } catch (_) {
      return { success: true };
    }
  },

  async updateWishStatus(id, status) {
    try {
      return await this.request(`/api/wishes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
    } catch (err) {
      return { success: true, message: 'Status ucapan diperbarui' };
    }
  },

  async deleteWish(id) {
    try {
      return await this.request(`/api/wishes/${id}`, { method: 'DELETE' });
    } catch (err) {
      const wishes = JSON.parse(localStorage.getItem('wedding_cached_wishes') || '[]');
      const filtered = wishes.filter(w => w.id !== id);
      localStorage.setItem('wedding_cached_wishes', JSON.stringify(filtered));
      return { success: true, message: 'Ucapan berhasil dihapus' };
    }
  },

  // 4. DAFTAR TAMU (GUESTS)
  async getGuests() {
    try {
      return await this.request('/api/guests');
    } catch (err) {
      const saved = localStorage.getItem('wedding_cached_guests');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { success: true, total: parsed.length, data: parsed };
        } catch (_) {}
      }
      const initial = [
        {
          id: "gst-001",
          name: "Bapak Budi Santoso & Keluarga",
          slug: "bapak-budi-santoso-keluarga",
          code: "WDG-001",
          category: "Keluarga",
          pax: 2,
          notes: "Meja Keluarga 01",
          createdAt: new Date().toISOString()
        },
        {
          id: "gst-002",
          name: "Ibu Ratna Dewi & Suami",
          slug: "ibu-ratna-dewi-suami",
          code: "WDG-002",
          category: "VIP",
          pax: 2,
          notes: "Meja VIP A",
          createdAt: new Date().toISOString()
        },
        {
          id: "gst-003",
          name: "Rian Hidayat (Sahabat Kampus)",
          slug: "rian-hidayat",
          code: "WDG-003",
          category: "Sahabat",
          pax: 1,
          notes: "Alumni Teknik Informatika",
          createdAt: new Date().toISOString()
        }
      ];
      localStorage.setItem('wedding_cached_guests', JSON.stringify(initial));
      return { success: true, total: initial.length, data: initial };
    }
  },

  async addGuest(guestData) {
    try {
      return await this.request('/api/guests', {
        method: 'POST',
        body: JSON.stringify(guestData)
      });
    } catch (err) {
      const guests = JSON.parse(localStorage.getItem('wedding_cached_guests') || '[]');
      const newGuest = {
        id: "gst-" + Date.now(),
        name: guestData.name,
        slug: guestData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        code: guestData.customCode || ("WDG-" + String(guests.length + 1).padStart(3, '0')),
        phone: guestData.phone || "",
        category: guestData.category || "Umum",
        pax: Number(guestData.pax) || 2,
        notes: guestData.notes || "",
        createdAt: new Date().toISOString()
      };
      guests.unshift(newGuest);
      localStorage.setItem('wedding_cached_guests', JSON.stringify(guests));
      return { success: true, message: 'Tamu undangan berhasil ditambahkan!', data: newGuest };
    }
  },

  async deleteGuest(id) {
    try {
      return await this.request(`/api/guests/${id}`, { method: 'DELETE' });
    } catch (err) {
      const guests = JSON.parse(localStorage.getItem('wedding_cached_guests') || '[]');
      const filtered = guests.filter(g => g.id !== id);
      localStorage.setItem('wedding_cached_guests', JSON.stringify(filtered));
      return { success: true, message: 'Tamu berhasil dihapus' };
    }
  },

  // 5. GENERATOR WHATSAPP
  async generateWaInvite(payload) {
    try {
      return await this.request('/api/wa/generate', {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          baseUrl: window.location.origin
        })
      });
    } catch (err) {
      const guestName = payload.name || payload.guestName || "Tamu Undangan";
      const inviteLink = `${window.location.origin}/?to=${encodeURIComponent(guestName)}`;
      const text = `Kepada Yth. Bapak/Ibu/Saudara/i: *${guestName}*\n\n` +
        `Tanpa mengurangi rasa hormat, perkenankan kami mengundang Anda untuk merayakan momen bahagia pernikahan kami.\n\n` +
        `Buka tautan undangan digital resmi Anda di:\n👉 ${inviteLink}\n\n` +
        `Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Anda berkenan hadir dan memberikan doa restu.`;
      const waUrl = payload.phone
        ? `https://api.whatsapp.com/send?phone=${payload.phone}&text=${encodeURIComponent(text)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      return {
        success: true,
        data: { guestName, phone: payload.phone || '', inviteLink, message: text, waUrl }
      };
    }
  },

  // 6. ADMIN AUTH
  async adminLogin(email, password) {
    try {
      return await this.request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
    } catch (err) {
      // Fallback offline jika server backend belum dinyalakan atau dibuka via file://
      const cleanEmail = (email || '').trim().toLowerCase();
      const savedEmail = (localStorage.getItem('wedding_admin_email') || 'admin@wedding.com').toLowerCase();
      const savedPassword = localStorage.getItem('wedding_admin_password') || 'admin123';

      if ((cleanEmail === 'admin@wedding.com' && password === 'admin123') ||
          (cleanEmail === savedEmail && password === savedPassword)) {
        const dummyToken = 'offline-token-' + Date.now();
        localStorage.setItem('wedding_is_offline', 'true');
        return {
          success: true,
          token: dummyToken,
          email: cleanEmail,
          isOffline: true,
          message: 'Login berhasil dalam mode mandiri/offline.'
        };
      }
      throw err;
    }
  },

  async checkAdminAuth() {
    try {
      const res = await this.request('/api/auth/me');
      localStorage.removeItem('wedding_is_offline');
      return res;
    } catch (err) {
      const token = localStorage.getItem('wedding_admin_token');
      const email = localStorage.getItem('wedding_admin_email') || 'admin@wedding.com';
      if (token && (token.startsWith('offline-token-') || localStorage.getItem('wedding_is_offline') === 'true')) {
        return { success: true, email: email, isOffline: true };
      }
      throw err;
    }
  },

  async updateCredentials(email, password) {
    const cleanEmail = (email || '').trim();
    const cleanPassword = (password || '').trim();
    try {
      const res = await this.request('/api/auth/credentials', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword })
      });
      if (cleanEmail) localStorage.setItem('wedding_admin_email', cleanEmail);
      if (cleanPassword) localStorage.setItem('wedding_admin_password', cleanPassword);
      return res;
    } catch (err) {
      // Simpan lokal saat backend offline
      if (cleanEmail) localStorage.setItem('wedding_admin_email', cleanEmail);
      if (cleanPassword) localStorage.setItem('wedding_admin_password', cleanPassword);
      return {
        success: true,
        email: cleanEmail,
        isOffline: true,
        message: 'Kredensial login admin berhasil diperbarui secara lokal!'
      };
    }
  },

  async adminLogout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch (_) {}
    localStorage.removeItem('wedding_admin_token');
    localStorage.removeItem('wedding_admin_email');
    localStorage.removeItem('wedding_is_offline');
  }
};

window.API = API;

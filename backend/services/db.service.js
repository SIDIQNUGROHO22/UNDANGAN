const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CONFIG_DIR = path.join(__dirname, '..', 'config');

// Pastikan direktori data ada
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const FILES = {
  settings: path.join(DATA_DIR, 'settings.json'),
  guests: path.join(DATA_DIR, 'guests.json'),
  rsvps: path.join(DATA_DIR, 'rsvps.json'),
  wishes: path.join(DATA_DIR, 'wishes.json'),
  admin: path.join(DATA_DIR, 'admin.json'),
  defaultConfig: path.join(CONFIG_DIR, 'default-invitation.json')
};

// Fungsi aman membaca JSON
function readJson(filePath, defaultValue = []) {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error membaca file ${filePath}:`, err.message);
    return defaultValue;
  }
}

// Fungsi aman menulis JSON dengan atomic write
function writeJson(filePath, data) {
  const tempPath = `${filePath}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
    return true;
  } catch (err) {
    console.error(`Error menulis file ${filePath}:`, err.message);
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (_) {}
    }
    return false;
  }
}

// Inisialisasi awal database jika file belum ada
function initDb() {
  // 1. Settings
  if (!fs.existsSync(FILES.settings)) {
    const defaultData = readJson(FILES.defaultConfig, {});
    writeJson(FILES.settings, defaultData);
  }

  // 2. Guests
  if (!fs.existsSync(FILES.guests)) {
    const initialGuests = [
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
    writeJson(FILES.guests, initialGuests);
  }

  // 3. RSVPs
  if (!fs.existsSync(FILES.rsvps)) {
    const initialRsvps = [
      {
        id: "rsvp-001",
        name: "Bapak Budi Santoso",
        code: "WDG-001",
        status: "hadir",
        pax: 2,
        message: "Selamat menempuh hidup baru Dimas & Anindya, semoga samawa selamanya!",
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
      },
      {
        id: "rsvp-002",
        name: "Ibu Ratna Dewi",
        code: "WDG-002",
        status: "hadir",
        pax: 2,
        message: "Insya Allah kami hadir. Bahagia selalu untuk kedua mempelai.",
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
      }
    ];
    writeJson(FILES.rsvps, initialRsvps);
  }

  // 4. Wishes
  if (!fs.existsSync(FILES.wishes)) {
    const initialWishes = [
      {
        id: "wish-001",
        name: "Budi Santoso",
        message: "Barakallahu lakum wa baraka alaikum wa jama'a bainakuma fii khair. Selamat berbahagia Dimas dan Anindya!",
        status: "APPROVED",
        likes: 12,
        createdAt: new Date(Date.now() - 3600000 * 6).toISOString()
      },
      {
        id: "wish-002",
        name: "Ratna Dewi",
        message: "Selamat ya Anin & Mas Dimas! Semoga menjadi keluarga yang sakinah, mawaddah, warahmah dan lekas dikaruniai momongan.",
        status: "APPROVED",
        likes: 8,
        createdAt: new Date(Date.now() - 3600000 * 3).toISOString()
      },
      {
        id: "wish-003",
        name: "Rian Hidayat",
        message: "Akhirnya berlabuh juga di pelaminan kawan sejuangan! Selamat buat Dimas & Anindya, lancar acaranya sampai hari H!",
        status: "APPROVED",
        likes: 15,
        createdAt: new Date(Date.now() - 3600000 * 1).toISOString()
      }
    ];
    writeJson(FILES.wishes, initialWishes);
  }

  // 5. Admin Auth
  if (!fs.existsSync(FILES.admin)) {
    const defaultAdmin = {
      email: "admin@wedding.com",
      password: "admin123", // dapat diubah via dashboard
      tokens: []
    };
    writeJson(FILES.admin, defaultAdmin);
  }
}

// Panggil inisialisasi awal
initDb();

// DB Service Object
const db = {
  // SETTINGS
  getSettings() {
    return readJson(FILES.settings, readJson(FILES.defaultConfig, {}));
  },
  updateSettings(newData) {
    const current = this.getSettings();
    const merged = { ...current, ...newData };
    writeJson(FILES.settings, merged);
    return merged;
  },

  // GUESTS
  getGuests() {
    return readJson(FILES.guests, []);
  },
  addGuest({ name, category = "Umum", pax = 2, notes = "", customCode = "" }) {
    const guests = this.getGuests();
    const id = "gst-" + crypto.randomBytes(4).toString('hex');
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const code = customCode || "WDG-" + String(guests.length + 1).padStart(3, '0');
    
    const newGuest = {
      id,
      name,
      slug,
      code,
      category,
      pax: Number(pax) || 1,
      notes,
      createdAt: new Date().toISOString()
    };
    
    guests.unshift(newGuest);
    writeJson(FILES.guests, guests);
    return newGuest;
  },
  deleteGuest(id) {
    const guests = this.getGuests();
    const filtered = guests.filter(g => g.id !== id);
    writeJson(FILES.guests, filtered);
    return filtered.length !== guests.length;
  },

  // RSVPS
  getRsvps() {
    return readJson(FILES.rsvps, []);
  },
  addRsvp({ name, code = "", status = "hadir", pax = 1, message = "" }) {
    const rsvps = this.getRsvps();
    const id = "rsvp-" + crypto.randomBytes(4).toString('hex');
    const newRsvp = {
      id,
      name: name.trim(),
      code: code.trim(),
      status: ["hadir", "tidak-hadir", "ragu"].includes(status) ? status : "hadir",
      pax: status === "hadir" ? (Number(pax) || 1) : 0,
      message: message.trim(),
      createdAt: new Date().toISOString()
    };

    // Jika ada pesan ucapan, otomatis tambahkan ke buku tamu juga!
    if (newRsvp.message) {
      this.addWish({
        name: newRsvp.name,
        message: newRsvp.message,
        status: "APPROVED"
      });
    }

    rsvps.unshift(newRsvp);
    writeJson(FILES.rsvps, rsvps);
    return newRsvp;
  },
  deleteRsvp(id) {
    const rsvps = this.getRsvps();
    const filtered = rsvps.filter(r => r.id !== id);
    writeJson(FILES.rsvps, filtered);
    return filtered.length !== rsvps.length;
  },

  // WISHES
  getWishes(onlyApproved = true) {
    const wishes = readJson(FILES.wishes, []);
    if (onlyApproved) {
      return wishes.filter(w => w.status === 'APPROVED');
    }
    return wishes;
  },
  addWish({ name, message, status = "APPROVED" }) {
    const wishes = readJson(FILES.wishes, []);
    const id = "wish-" + crypto.randomBytes(4).toString('hex');
    const newWish = {
      id,
      name: name.trim(),
      message: message.trim(),
      status: status || "APPROVED",
      likes: 0,
      createdAt: new Date().toISOString()
    };
    wishes.unshift(newWish);
    writeJson(FILES.wishes, wishes);
    return newWish;
  },
  updateWishStatus(id, status) {
    const wishes = readJson(FILES.wishes, []);
    const wish = wishes.find(w => w.id === id);
    if (!wish) return null;
    wish.status = status;
    writeJson(FILES.wishes, wishes);
    return wish;
  },
  deleteWish(id) {
    const wishes = readJson(FILES.wishes, []);
    const filtered = wishes.filter(w => w.id !== id);
    writeJson(FILES.wishes, filtered);
    return filtered.length !== wishes.length;
  },
  likeWish(id) {
    const wishes = readJson(FILES.wishes, []);
    const wish = wishes.find(w => w.id === id);
    if (!wish) return null;
    wish.likes = (wish.likes || 0) + 1;
    writeJson(FILES.wishes, wishes);
    return wish;
  },

  // ADMIN AUTH
  getAdminData() {
    return readJson(FILES.admin, { email: "admin@wedding.com", password: "admin123", tokens: [] });
  },
  validateLogin(email, password) {
    const admin = this.getAdminData();
    if (admin.email.toLowerCase() === email.toLowerCase() && admin.password === password) {
      const token = crypto.randomBytes(24).toString('hex');
      admin.tokens = admin.tokens || [];
      admin.tokens.push(token);
      // Simpan max 10 sesi aktif
      if (admin.tokens.length > 10) admin.tokens.shift();
      writeJson(FILES.admin, admin);
      return { success: true, token, email: admin.email };
    }
    return { success: false, message: "Email atau password admin salah!" };
  },
  verifyToken(token) {
    if (!token) return false;
    const admin = this.getAdminData();
    return Array.isArray(admin.tokens) && admin.tokens.includes(token);
  },
  logout(token) {
    const admin = this.getAdminData();
    if (Array.isArray(admin.tokens)) {
      admin.tokens = admin.tokens.filter(t => t !== token);
      writeJson(FILES.admin, admin);
    }
    return true;
  },
  updateAdminCredentials(newEmail, newPassword) {
    const admin = this.getAdminData();
    if (newEmail) admin.email = newEmail.trim();
    if (newPassword) admin.password = newPassword.trim();
    writeJson(FILES.admin, admin);
    return { success: true, email: admin.email };
  },

  // STATISTIK
  getStats() {
    const guests = this.getGuests();
    const rsvps = this.getRsvps();
    const wishes = readJson(FILES.wishes, []);

    const hadirRsvps = rsvps.filter(r => r.status === 'hadir');
    const tidakHadirRsvps = rsvps.filter(r => r.status === 'tidak-hadir');
    const raguRsvps = rsvps.filter(r => r.status === 'ragu');
    const totalPaxHadir = hadirRsvps.reduce((acc, curr) => acc + (curr.pax || 1), 0);
    const pendingWishes = wishes.filter(w => w.status === 'PENDING').length;

    return {
      totalGuests: guests.length,
      totalRsvps: rsvps.length,
      hadirCount: hadirRsvps.length,
      totalPaxHadir,
      tidakHadirCount: tidakHadirRsvps.length,
      raguCount: raguRsvps.length,
      totalWishes: wishes.length,
      pendingWishes
    };
  }
};

module.exports = db;


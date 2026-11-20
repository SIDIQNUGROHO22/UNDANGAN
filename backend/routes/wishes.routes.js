const express = require('express');
const router = express.Router();
const db = require('../services/db.service');
const { requireAdminAuth } = require('../middleware/auth.middleware');

// GET /api/wishes - Mengambil daftar ucapan (Publik hanya melihat APPROVED, Admin melihat semua jika kirim token)
router.get('/', (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const isAdmin = authHeader && db.verifyToken(authHeader.replace('Bearer ', ''));

    // Jika admin meminta semua ucapan (misal untuk moderasi)
    const wishes = db.getWishes(!isAdmin);

    res.json({
      success: true,
      total: wishes.length,
      data: wishes
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil ucapan: ' + err.message
    });
  }
});

// POST /api/wishes - Mengirimkan ucapan baru (Publik)
router.post('/', (req, res) => {
  try {
    const { name, message } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Nama pengirim wajib diisi!' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Isi ucapan dan doa tidak boleh kosong!' });
    }

    const newWish = db.addWish({
      name,
      message,
      status: "APPROVED" // langsung tampil agar tamu langsung melihat ucapannya
    });

    res.status(201).json({
      success: true,
      message: 'Ucapan dan doa Anda berhasil dikirimkan!',
      data: newWish
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengirim ucapan: ' + err.message
    });
  }
});

// POST /api/wishes/:id/like - Memberi like/hati pada ucapan (Publik)
router.post('/:id/like', (req, res) => {
  try {
    const updated = db.likeWish(req.params.id);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Ucapan tidak ditemukan!' });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menyukai ucapan: ' + err.message });
  }
});

// PATCH /api/wishes/:id - Mengubah status ucapan APPROVED / REJECTED (Khusus Admin)
router.patch('/:id', requireAdminAuth, (req, res) => {
  try {
    const { status } = req.body;
    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status tidak valid!' });
    }
    const updated = db.updateWishStatus(req.params.id, status);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Ucapan tidak ditemukan!' });
    }
    res.json({ success: true, message: `Status ucapan berhasil diubah ke ${status}`, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengubah status: ' + err.message });
  }
});

// DELETE /api/wishes/:id - Menghapus ucapan (Khusus Admin)
router.delete('/:id', requireAdminAuth, (req, res) => {
  try {
    const deleted = db.deleteWish(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Ucapan tidak ditemukan!' });
    }
    res.json({ success: true, message: 'Ucapan berhasil dihapus!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menghapus ucapan: ' + err.message });
  }
});

module.exports = router;


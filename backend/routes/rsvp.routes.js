const express = require('express');
const router = express.Router();
const db = require('../services/db.service');
const { requireAdminAuth } = require('../middleware/auth.middleware');

// GET /api/rsvps - Mengambil semua data RSVP (Khusus Admin)
router.get('/', requireAdminAuth, (req, res) => {
  try {
    const rsvps = db.getRsvps();
    const stats = db.getStats();
    res.json({
      success: true,
      stats,
      data: rsvps
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data RSVP: ' + err.message
    });
  }
});

// POST /api/rsvps - Mengirimkan RSVP dari tamu (Publik)
router.post('/', (req, res) => {
  try {
    const { name, code, status, pax, message } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nama wajib diisi!'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Konfirmasi kehadiran wajib dipilih!'
      });
    }

    const savedRsvp = db.addRsvp({
      name,
      code,
      status,
      pax,
      message
    });

    res.status(201).json({
      success: true,
      message: 'Terima kasih! Konfirmasi kehadiran Anda berhasil disimpan.',
      data: savedRsvp
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Gagal menyimpan konfirmasi RSVP: ' + err.message
    });
  }
});

// DELETE /api/rsvps/:id - Menghapus RSVP (Khusus Admin)
router.delete('/:id', requireAdminAuth, (req, res) => {
  try {
    const deleted = db.deleteRsvp(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Data RSVP tidak ditemukan!' });
    }
    res.json({ success: true, message: 'Data RSVP berhasil dihapus!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menghapus data: ' + err.message });
  }
});

module.exports = router;


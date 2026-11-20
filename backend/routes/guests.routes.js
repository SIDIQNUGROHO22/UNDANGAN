const express = require('express');
const router = express.Router();
const db = require('../services/db.service');
const { requireAdminAuth } = require('../middleware/auth.middleware');

// GET /api/guests - Daftar seluruh tamu undangan (Khusus Admin)
router.get('/', requireAdminAuth, (req, res) => {
  try {
    const guests = db.getGuests();
    res.json({
      success: true,
      total: guests.length,
      data: guests
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data tamu: ' + err.message
    });
  }
});

// POST /api/guests - Tambah tamu baru (Khusus Admin)
router.post('/', requireAdminAuth, (req, res) => {
  try {
    const { name, category, pax, notes, customCode } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Nama tamu wajib diisi!' });
    }

    const newGuest = db.addGuest({
      name: name.trim(),
      category: category || "Umum",
      pax: pax || 2,
      notes: notes || "",
      customCode: customCode ? customCode.trim() : ""
    });

    res.status(201).json({
      success: true,
      message: 'Tamu undangan berhasil ditambahkan!',
      data: newGuest
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan tamu: ' + err.message
    });
  }
});

// DELETE /api/guests/:id - Hapus tamu (Khusus Admin)
router.delete('/:id', requireAdminAuth, (req, res) => {
  try {
    const deleted = db.deleteGuest(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Tamu tidak ditemukan!' });
    }
    res.json({ success: true, message: 'Tamu berhasil dihapus!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menghapus data tamu: ' + err.message });
  }
});

module.exports = router;


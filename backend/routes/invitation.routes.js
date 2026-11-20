const express = require('express');
const router = express.Router();
const db = require('../services/db.service');
const { requireAdminAuth } = require('../middleware/auth.middleware');

// GET /api/invitation - Mendapatkan seluruh konfigurasi undangan (Publik)
router.get('/', (req, res) => {
  try {
    const settings = db.getSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data undangan: ' + err.message
    });
  }
});

// POST /api/invitation - Mengupdate konfigurasi undangan (Khusus Admin)
router.post('/', requireAdminAuth, (req, res) => {
  try {
    const updated = db.updateSettings(req.body);
    res.json({
      success: true,
      message: 'Konfigurasi undangan berhasil diperbarui!',
      data: updated
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui data undangan: ' + err.message
    });
  }
});

module.exports = router;


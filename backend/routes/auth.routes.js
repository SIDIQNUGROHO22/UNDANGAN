const express = require('express');
const router = express.Router();
const db = require('../services/db.service');
const { requireAdminAuth } = require('../middleware/auth.middleware');

// POST /api/auth/login - Login Admin
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email dan password harus diisi!' });
    }

    const result = db.validateLogin(email, password);
    if (!result.success) {
      return res.status(401).json(result);
    }

    res.json({
      success: true,
      message: 'Login berhasil!',
      token: result.token,
      email: result.email
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error server saat login: ' + err.message });
  }
});

// GET /api/auth/me - Cek status login token
router.get('/me', requireAdminAuth, (req, res) => {
  const admin = db.getAdminData();
  res.json({
    success: true,
    email: admin.email
  });
});

// POST /api/auth/logout - Logout Admin
router.post('/logout', requireAdminAuth, (req, res) => {
  db.logout(req.adminToken);
  res.json({ success: true, message: 'Berhasil keluar.' });
});

// POST /api/auth/credentials - Ganti email & password admin
router.post('/credentials', requireAdminAuth, (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email && !password) {
      return res.status(400).json({ success: false, message: 'Data tidak boleh kosong.' });
    }
    const updated = db.updateAdminCredentials(email, password);
    res.json({ success: true, message: 'Kredensial admin berhasil diperbarui!', email: updated.email });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui kredensial: ' + err.message });
  }
});

module.exports = router;


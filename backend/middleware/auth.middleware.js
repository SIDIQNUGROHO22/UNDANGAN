const db = require('../services/db.service');

function requireAdminAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token || !db.verifyToken(token)) {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak: Anda harus login sebagai admin terlebih dahulu!'
    });
  }

  req.adminToken = token;
  next();
}

module.exports = { requireAdminAuth };


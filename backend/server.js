const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging sederhana untuk melihat permintaan masuk
app.use((req, res, next) => {
  const timestamp = new Date().toLocaleTimeString('id-ID');
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Path folder Frontend
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

// Routes API Backend
app.use('/api/invitation', require('./routes/invitation.routes'));
app.use('/api/rsvps', require('./routes/rsvp.routes'));
app.use('/api/wishes', require('./routes/wishes.routes'));
app.use('/api/guests', require('./routes/guests.routes'));
app.use('/api/wa', require('./routes/wa.routes'));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/export', require('./routes/export.routes'));

// Endpoint Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    message: 'Server Undangan Digital Berjalan Normal',
    timestamp: new Date().toISOString()
  });
});

// Menyajikan file statis Frontend
if (fs.existsSync(FRONTEND_DIR)) {
  // Route praktis untuk /admin dan /admin/ langsung membuka admin.html
  app.get(['/admin', '/admin/'], (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'admin.html'));
  });

  app.use(express.static(FRONTEND_DIR));

  // Fallback untuk route lainnya mengarah ke index.html
  app.get('*', (req, res) => {
    if (req.url.startsWith('/api')) {
      return res.status(404).json({ success: false, message: 'Endpoint API tidak ditemukan' });
    }
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('API Server Berjalan. Folder frontend belum terhubung.');
  });
}

// Menjalankan server
app.listen(PORT, () => {
  console.log('================================================================');
  console.log(`💍 SERVER UNDANGAN DIGITAL BERHASIL DIJALANKAN!`);
  console.log(`📡 URL Website Utama    : http://localhost:${PORT}`);
  console.log(`💌 Contoh Link Tamu WA  : http://localhost:${PORT}/?to=Bapak+Budi+Santoso`);
  console.log(`🔐 Dasbor Kelola Admin  : http://localhost:${PORT}/admin.html`);
  console.log(`⚙️  API Endpoint         : http://localhost:${PORT}/api/invitation`);
  console.log('================================================================');
});


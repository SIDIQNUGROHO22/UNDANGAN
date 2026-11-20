const express = require('express');
const router = express.Router();
const db = require('../services/db.service');
const { requireAdminAuth } = require('../middleware/auth.middleware');

function escapeCsv(field) {
  if (field === null || field === undefined) return '""';
  const str = String(field).replace(/"/g, '""');
  return `"${str}"`;
}

// GET /api/export/rsvps.csv - Ekspor data RSVP ke format CSV
router.get('/rsvps.csv', requireAdminAuth, (req, res) => {
  try {
    const rsvps = db.getRsvps();

    let csvContent = '\uFEFF'; // BOM UTF-8 agar karakter Indonesia dan aksen terbaca rapi di Excel
    csvContent += 'No,Nama Tamu,Kode Undangan,Status Kehadiran,Jumlah Tamu,Pesan Ucapan,Waktu Konfirmasi\n';

    rsvps.forEach((item, index) => {
      const row = [
        index + 1,
        escapeCsv(item.name),
        escapeCsv(item.code || '-'),
        escapeCsv(item.status === 'hadir' ? 'Hadir' : (item.status === 'tidak-hadir' ? 'Tidak Hadir' : 'Ragu-ragu')),
        item.pax || 0,
        escapeCsv(item.message || '-'),
        escapeCsv(new Date(item.createdAt).toLocaleString('id-ID'))
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="data-rsvp-pernikahan.csv"');
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengekspor CSV: ' + err.message });
  }
});

// GET /api/export/guests.csv - Ekspor data tamu ke format CSV
router.get('/guests.csv', requireAdminAuth, (req, res) => {
  try {
    const guests = db.getGuests();

    let csvContent = '\uFEFF';
    csvContent += 'No,Nama Tamu,Kode Undangan,Kategori,Kuota Pax,Catatan,Tautan Personal\n';

    const origin = req.headers.host ? `${req.protocol}://${req.headers.host}` : '';

    guests.forEach((item, index) => {
      const personalLink = `${origin}/?to=${encodeURIComponent(item.name)}`;
      const row = [
        index + 1,
        escapeCsv(item.name),
        escapeCsv(item.code),
        escapeCsv(item.category),
        item.pax || 2,
        escapeCsv(item.notes || '-'),
        escapeCsv(personalLink)
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="daftar-tamu-undangan.csv"');
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengekspor CSV: ' + err.message });
  }
});

module.exports = router;


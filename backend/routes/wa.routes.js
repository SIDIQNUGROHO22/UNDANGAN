const express = require('express');
const router = express.Router();
const db = require('../services/db.service');

// Format nomor HP Indonesia ke format internasional (misal 0812 -> 62812)
function formatIndonesianPhone(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('+62')) {
    cleaned = '62' + cleaned.substring(3);
  }
  return cleaned;
}

// POST /api/wa/generate - Menghasilkan Tautan & Teks Undangan WhatsApp Kustom
router.post('/generate', (req, res) => {
  try {
    const { name, guestName: aliasName, phone = '', templateType = 'formal', customMessage = '', baseUrl = '' } = req.body;
    const finalName = (name || aliasName || '').trim();

    if (!finalName) {
      return res.status(400).json({
        success: false,
        message: 'Nama tamu wajib diisi untuk membuat undangan WhatsApp!'
      });
    }

    const settings = db.getSettings();
    const guestName = finalName;
    
    // Tentukan Base URL
    let origin = baseUrl;
    if (!origin) {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      origin = `${protocol}://${host}`;
    }

    // Format personal URL
    const queryParam = encodeURIComponent(guestName);
    const inviteLink = `${origin}/?to=${queryParam}`;

    // Ambil data mempelai & acara dari setting
    const groomName = settings.couple?.groom?.callName || "Sidiq";
    const brideName = settings.couple?.bride?.callName || "Anisa";
    const eventDate = settings.events?.akad?.dateFormatted || "Sabtu, 19 Desember 2026";
    const venueName = `${settings.events?.akad?.venueName || "Masjid Agung"} & ${settings.events?.resepsi?.venueName || "Grand Ballroom"}`;

    let text = "";

    if (customMessage && customMessage.trim()) {
      // Gunakan template kustom dari pengguna
      text = customMessage
        .replace(/{guest_name}/g, guestName)
        .replace(/{groom_name}/g, groomName)
        .replace(/{bride_name}/g, brideName)
        .replace(/{event_date}/g, eventDate)
        .replace(/{venue_name}/g, venueName)
        .replace(/{invite_link}/g, inviteLink);
    } else {
      const templates = settings.whatsappTemplates || {};
      const template = templates[templateType] || templates.formal || "";

      if (template) {
        text = template
          .replace(/{guest_name}/g, guestName)
          .replace(/{groom_name}/g, groomName)
          .replace(/{bride_name}/g, brideName)
          .replace(/{event_date}/g, eventDate)
          .replace(/{venue_name}/g, venueName)
          .replace(/{invite_link}/g, inviteLink);
      } else {
        // Fallback default format
        text = `Kepada Yth. Bapak/Ibu/Saudara/i: *${guestName}*\n\n` +
          `Tanpa mengurangi rasa hormat, perkenankan kami mengundang Anda untuk merayakan momen bahagia pernikahan kami:\n\n` +
          `💍 *${groomName} & ${brideName}* 💍\n\n` +
          `📅 ${eventDate}\n` +
          `📍 ${venueName}\n\n` +
          `Buka tautan undangan digital di bawah ini:\n👉 ${inviteLink}\n\n` +
          `Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Anda berkenan hadir dan memberikan doa restu.\n\n` +
          `Salam hangat,\n*${groomName} & ${brideName}*`;
      }
    }

    // Buat URL WhatsApp langsung
    const formattedPhone = formatIndonesianPhone(phone);
    const encodedText = encodeURIComponent(text);
    let waUrl = '';

    if (formattedPhone) {
      waUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedText}`;
    } else {
      waUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    }

    res.json({
      success: true,
      data: {
        guestName,
        phone: formattedPhone,
        inviteLink,
        message: text,
        waUrl
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Gagal membuat undangan WhatsApp: ' + err.message
    });
  }
});

module.exports = router;


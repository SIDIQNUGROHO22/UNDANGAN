/**
 * ==============================================================================
 * COUNTDOWN HANDLER (countdown.js)
 * ==============================================================================
 * Menghitung mundur waktu menuju acara akad nikah secara real-time.
 * Menampilkan Hari, Jam, Menit, dan Detik.
 * Mendukung fitur "Simpan ke Google Kalender".
 * Otomatis tersinkronisasi saat tanggal Akad Nikah dikustomisasi di Admin.
 * ==============================================================================
 */

const CountdownHandler = (function () {
  let timerInterval = null;

  /**
   * Menambahkan angka 0 di depan angka satuan (01, 02, dst.)
   * @param {number} num 
   * @returns {string}
   */
  function padZero(num) {
    return num < 10 ? `0${num}` : `${num}`;
  }

  function getConfig() {
    return window.CURRENT_CONFIG || (typeof WEDDING_CONFIG !== "undefined" ? WEDDING_CONFIG : null);
  }

  /**
   * Menghubungkan teks tanggal Bahasa Indonesia (misal: "21 November 2026")
   * dan teks jam (misal: "08.00 - 10.00 WIB") menjadi format ISO valid (YYYY-MM-DDTHH:MM:SS)
   */
  function parseIndoDateToIso(dateStr, timeStr) {
    if (!dateStr || typeof dateStr !== "string") return null;
    dateStr = dateStr.trim();

    let year = null, month = null, day = null;

    // 1. Cek format YYYY-MM-DD atau YYYY/MM/DD
    const isoMatch = dateStr.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
    if (isoMatch) {
      year = parseInt(isoMatch[1], 10);
      month = parseInt(isoMatch[2], 10);
      day = parseInt(isoMatch[3], 10);
    }

    // 2. Cek format DD-MM-YYYY atau DD/MM/YYYY
    if (!year) {
      const dmyMatch = dateStr.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/);
      if (dmyMatch) {
        day = parseInt(dmyMatch[1], 10);
        month = parseInt(dmyMatch[2], 10);
        year = parseInt(dmyMatch[3], 10);
      }
    }

    // 3. Cek format nama bulan Indonesia (misal: "21 November 2026", "Sabtu, 21 November 2026")
    if (!year) {
      const monthMap = {
        jan: 1, januari: 1, january: 1,
        feb: 2, februari: 2, february: 2,
        mar: 3, maret: 3, march: 3,
        apr: 4, april: 4,
        mei: 5, may: 5,
        jun: 6, juni: 6, june: 6,
        jul: 7, juli: 7, july: 7,
        agu: 8, ags: 8, agustus: 8, august: 8, aug: 8,
        sep: 9, september: 9,
        okt: 10, oktober: 10, october: 10, oct: 10,
        nov: 11, november: 11,
        des: 12, desember: 12, december: 12, dec: 12
      };

      const textMatch = dateStr.match(/(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/);
      if (textMatch) {
        day = parseInt(textMatch[1], 10);
        const mKey = textMatch[2].toLowerCase();
        month = monthMap[mKey] || null;
        year = parseInt(textMatch[3], 10);
      }
    }

    if (!year || !month || !day) return null;

    // Ambil jam mulai acara
    let hour = 8, minute = 0;
    if (timeStr && typeof timeStr === "string") {
      const timeMatch = timeStr.match(/(\d{1,2})[:.](\d{2})/);
      if (timeMatch) {
        hour = parseInt(timeMatch[1], 10);
        minute = parseInt(timeMatch[2], 10);
      }
    }

    const pad = (n) => String(n).padStart(2, "0");
    return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00`;
  }

  /**
   * Menentukan tanggal target countdown yang paling tepat
   * Selalu memprioritaskan tanggal Akad Nikah yang telah dikustomisasi pengguna
   */
  function resolveTargetDate(cfg) {
    if (!cfg) return "2026-11-21T08:00:00";

    const explicitTarget = cfg.countdown?.targetDate;
    const akadDateStr = cfg.events?.akad?.dateFormatted || "";
    const akadTimeStr = cfg.events?.akad?.timeFormatted || "";
    const parsedFromAkad = parseIndoDateToIso(akadDateStr, akadTimeStr);

    // Jika ada tanggal akad yang diisi user
    if (parsedFromAkad) {
      if (!explicitTarget) {
        return parsedFromAkad;
      }
      // Jika explicitTarget masih default lama sedangkan tanggal akad dikustomisasi,
      // gunakan parsedFromAkad agar hitung mundur selaras dengan tanggal acara
      const expDate = new Date(explicitTarget);
      const akdDate = new Date(parsedFromAkad);
      if (expDate.getDate() !== akdDate.getDate() || expDate.getMonth() !== akdDate.getMonth() || expDate.getFullYear() !== akdDate.getFullYear()) {
        return parsedFromAkad;
      }
      return explicitTarget;
    }

    return explicitTarget || "2026-11-21T08:00:00";
  }

  /**
   * Mengupdate tampilan hitung mundur
   */
  function updateCountdown() {
    const cfg = getConfig();
    if (!cfg) return;

    const targetString = resolveTargetDate(cfg);
    if (!targetString) return;

    const targetDate = new Date(targetString).getTime();
    const now = new Date().getTime();
    const distance = targetDate - now;

    const daysEl = document.getElementById("cd-days");
    const hoursEl = document.getElementById("cd-hours");
    const minutesEl = document.getElementById("cd-minutes");
    const secondsEl = document.getElementById("cd-seconds");
    const passedNoticeEl = document.getElementById("countdown-passed-message");

    // Jika waktu acara telah terlewati
    if (distance <= 0) {
      if (timerInterval) clearInterval(timerInterval);

      if (daysEl) daysEl.textContent = "00";
      if (hoursEl) hoursEl.textContent = "00";
      if (minutesEl) minutesEl.textContent = "00";
      if (secondsEl) secondsEl.textContent = "00";

      if (passedNoticeEl) {
        passedNoticeEl.textContent = cfg.countdown?.eventPassedMessage || "Alhamdulillah, acara pernikahan telah selesai diselenggarakan.";
        passedNoticeEl.classList.remove("hidden");
      }
      return;
    }

    // Pastikan notifikasi acara selesai disembunyikan jika acara di masa depan
    if (passedNoticeEl) {
      passedNoticeEl.classList.add("hidden");
    }

    // Perhitungan waktu
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    // Tampilkan di elemen DOM
    if (daysEl) daysEl.textContent = padZero(days);
    if (hoursEl) hoursEl.textContent = padZero(hours);
    if (minutesEl) minutesEl.textContent = padZero(minutes);
    if (secondsEl) secondsEl.textContent = padZero(seconds);
  }

  /**
   * Membuat tautan untuk menambahkan acara ke Google Calendar
   */
  function setupAddToCalendarButton() {
    const btn = document.getElementById("add-to-calendar-btn");
    if (!btn) return;

    try {
      const cfg = getConfig();
      if (!cfg || !cfg.couple || !cfg.events) return;

      const brideName = cfg.couple.bride ? cfg.couple.bride.callName : "";
      const groomName = cfg.couple.groom ? cfg.couple.groom.callName : "";
      const eventTitle = encodeURIComponent(`Pernikahan ${groomName} & ${brideName}`);
      const akadVenue = cfg.events.akad ? cfg.events.akad.venueName : "";
      const resepsiVenue = cfg.events.resepsi ? cfg.events.resepsi.venueName : "";
      const akadAddress = cfg.events.akad ? cfg.events.akad.venueAddress : "";
      const eventDetails = encodeURIComponent(
        `Menghadiri pernikahan ${cfg.couple.groom.fullName || groomName} & ${cfg.couple.bride.fullName || brideName}.\n` +
        `Akad: ${akadVenue}\n` +
        `Resepsi: ${resepsiVenue}`
      );
      const eventLocation = encodeURIComponent(
        `${akadVenue}, ${akadAddress}`
      );

      // Konversi format tanggal target (YYYYMMDDTHHMMSSZ)
      const targetDateStr = resolveTargetDate(cfg);
      const targetDate = new Date(targetDateStr);
      const endDate = new Date(targetDate.getTime() + (6 * 60 * 60 * 1000)); // +6 jam durasi

      const formatIso = (date) => {
        return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
      };

      const datesParam = `${formatIso(targetDate)}/${formatIso(endDate)}`;

      const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${datesParam}&details=${eventDetails}&location=${eventLocation}`;

      btn.setAttribute("href", gcalUrl);
      btn.setAttribute("target", "_blank");
      btn.setAttribute("rel", "noopener noreferrer");
    } catch (err) {
      console.warn("Gagal membuat link kalender:", err);
    }
  }

  return {
    init: function () {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      updateCountdown();
      timerInterval = setInterval(updateCountdown, 1000);
      setupAddToCalendarButton();
    },
    parseIndoDateToIso: parseIndoDateToIso,
    resolveTargetDate: resolveTargetDate
  };
})();

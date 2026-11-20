/**
 * ==============================================================================
 * GUEST HANDLER (guest.js)
 * ==============================================================================
 * Menangani pengambilan nama tamu dari URL Parameter, sanitasi keamanan (mencegah XSS),
 * serta penyediaan generator link undangan personal.
 * 
 * Contoh URL:
 * - index.html?to=Bapak%20Budi%20Santoso
 * - index.html?to=Keluarga%20Besar%20Hendra
 * ==============================================================================
 */

const GuestHandler = (function () {
  /**
   * Mengambil nama tamu dari URL query parameters (?to=... atau ?u=... atau ?nama=...)
   * @returns {string} Nama tamu yang sudah dibersihkan
   */
  function getGuestNameFromUrl() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      // Mendukung parameter 'to', 'u', atau 'nama'
      const rawName = urlParams.get("to") || urlParams.get("u") || urlParams.get("nama");

      if (rawName && rawName.trim().length > 0) {
        return rawName.trim();
      }
    } catch (e) {
      console.warn("Gagal membaca URL parameters:", e);
    }

    // Fallback jika tidak ada parameter nama di URL
    const guestCfg = window.CURRENT_CONFIG?.guest || (typeof WEDDING_CONFIG !== "undefined" ? WEDDING_CONFIG.guest : null);
    return guestCfg?.defaultName || "Tamu Undangan";
  }

  /**
   * Menampilkan nama tamu ke elemen Cover dan formulir RSVP dengan aman
   */
  function displayGuestName() {
    const guestName = getGuestNameFromUrl();
    const guestCfg = window.CURRENT_CONFIG?.guest || (typeof WEDDING_CONFIG !== "undefined" ? WEDDING_CONFIG.guest : null);
    const defaultName = guestCfg?.defaultName || "Tamu Undangan";
    const prefixGreeting = guestCfg?.prefixGreeting || "Kepada Yth. Bapak/Ibu/Saudara/i:";

    // 1. Tampilkan di Halaman Sampul (Cover)
    const coverGuestEl = document.getElementById("cover-guest-name");
    if (coverGuestEl) {
      coverGuestEl.textContent = guestName;
    }

    // 2. Tampilkan di Salam Pembuka Sampul
    const coverGreetingEl = document.getElementById("cover-guest-greeting");
    if (coverGreetingEl) {
      coverGreetingEl.textContent = prefixGreeting;
    }

    // 3. Otomatis isi kolom nama di formulir RSVP jika bukan nama default
    const rsvpNameInput = document.getElementById("rsvp-name");
    if (rsvpNameInput && guestName !== defaultName) {
      rsvpNameInput.value = guestName;
    }

    // 4. Otomatis isi kolom nama di Buku Tamu jika bukan default
    const guestbookNameInput = document.getElementById("guestbook-name");
    if (guestbookNameInput && guestName !== defaultName) {
      guestbookNameInput.value = guestName;
    }
  }

  /**
   * Membuat URL undangan personal berdasarkan nama tamu
   * @param {string} name - Nama tamu
   * @returns {string} URL lengkap dengan parameter
   */
  function createPersonalLink(name) {
    if (!name || name.trim().length === 0) return "";
    
    // Ambil basis URL saat ini tanpa query parameters
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?to=${encodeURIComponent(name.trim())}`;
  }

  return {
    init: function () {
      displayGuestName();
    },
    getGuestName: getGuestNameFromUrl,
    createPersonalLink: createPersonalLink
  };
})();

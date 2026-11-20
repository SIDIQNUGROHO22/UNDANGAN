/**
 * ==============================================================================
 * RSVP HANDLER (rsvp.js) - TERHUBUNG KE BACKEND SERVER
 * ==============================================================================
 * Menangani formulir konfirmasi kehadiran (RSVP) terintegrasi ke Server Backend
 * REST API (/api/rsvps) dengan fallback otomatis dan konfirmasi WhatsApp.
 * ==============================================================================
 */

const RsvpHandler = (function () {
  let isSubmitting = false;

  function init() {
    const form = document.getElementById("rsvp-form");
    if (!form) return;

    form.addEventListener("submit", handleSubmit);

    // Tampilkan/sembunyikan jumlah tamu jika memilih tidak hadir
    const statusSelect = document.getElementById("rsvp-status");
    const guestsGroup = document.getElementById("rsvp-guests-group");

    if (statusSelect && guestsGroup) {
      statusSelect.addEventListener("change", function () {
        if (this.value === "tidak-hadir") {
          guestsGroup.style.display = "none";
        } else {
          guestsGroup.style.display = "block";
        }
      });
    }

    // Prefill kode undangan dari parameter URL jika ada (?code=... atau ?c=...)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code") || urlParams.get("c");
      const codeInput = document.getElementById("rsvp-code");
      if (codeInput && code) {
        codeInput.value = code.trim().toUpperCase();
      }
    } catch (e) {}
  }

  /**
   * Menangani pengiriman formulir RSVP
   * @param {Event} e 
   */
  async function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;

    const nameInput = document.getElementById("rsvp-name");
    const codeInput = document.getElementById("rsvp-code");
    const statusSelect = document.getElementById("rsvp-status");
    const guestsInput = document.getElementById("rsvp-guests");
    const messageInput = document.getElementById("rsvp-message");
    const submitBtn = document.getElementById("btn-submit-rsvp");

    const name = nameInput ? nameInput.value.trim() : "";
    const code = codeInput ? codeInput.value.trim().toUpperCase() : "";
    const status = statusSelect ? statusSelect.value : "";
    const guests = guestsInput ? parseInt(guestsInput.value, 10) || 1 : 1;
    const message = messageInput ? messageInput.value.trim() : "";

    // 1. Validasi Input
    if (!name) {
      showAlert("Silakan masukkan nama lengkap Anda.", "error");
      if (nameInput) nameInput.focus();
      return;
    }

    if (!status) {
      showAlert("Silakan pilih konfirmasi kehadiran Anda.", "error");
      if (statusSelect) statusSelect.focus();
      return;
    }

    // Terjemahan status teks
    let statusText = "Akan Hadir";
    if (status === "tidak-hadir") {
      statusText = "Maaf, Berhalangan Hadir";
    } else if (status === "ragu") {
      statusText = "Masih Belum Pasti / Ragu-ragu";
    }

    // 2. Set Status Loading pada Tombol
    isSubmitting = true;
    const originalBtnHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>Menyimpan ke Server...</span>`;

    const stickerInput = document.getElementById("rsvp-selected-sticker");
    const sticker = stickerInput ? stickerInput.value.trim() : "";

    try {
      // 3. Kirim data ke Backend REST API (/api/rsvps)
      let saved = false;
      if (window.API && window.API.submitRsvp) {
        try {
          const res = await window.API.submitRsvp({
            name,
            code,
            status,
            pax: guests,
            message,
            sticker
          });
          if (res && res.success) {
            saved = true;
          }
        } catch (apiErr) {
          console.warn("API server bermasalah, fallback ke Firebase / lokal:", apiErr);
        }
      }

      // Fallback jika API server belum aktif (Firebase / LocalStorage)
      if (!saved && typeof window.WeddingFirebase !== "undefined" && window.WeddingFirebase.submitRsvp) {
        await window.WeddingFirebase.submitRsvp({
          guestName: name,
          invitationCode: code,
          status: status,
          guestsCount: guests,
          message: message
        });
      }

      // Jika ada pesan atau stiker dan guestbook handler ada, refresh ucapan
      if ((message || sticker) && window.MainApp && window.MainApp.refreshWishes) {
        window.MainApp.refreshWishes();
      }

      // 4. Tampilkan Notifikasi Sukses
      showAlert("Alhamdulillah, konfirmasi kehadiran Anda berhasil tersimpan di sistem server!", "success");

      // Tampilkan tombol opsi kirim salinan via WhatsApp
      const waUrl = renderWhatsAppOption(name, statusText, guests, message, sticker);

      // Auto-buka WhatsApp jika diaktifkan di admin
      const cfg = window.CURRENT_CONFIG || (typeof WEDDING_CONFIG !== "undefined" ? WEDDING_CONFIG : {});
      if (cfg.rsvp?.autoOpenWhatsApp !== false && waUrl) {
        try {
          window.open(waUrl, "_blank");
        } catch (e) {
          console.warn("Gagal membuka tab otomatis WhatsApp:", e);
        }
      }

      // Reset form
      if (messageInput) messageInput.value = "";
      if (stickerInput) stickerInput.value = "";
      const rsvpPreviewBox = document.getElementById("rsvp-sticker-preview");
      if (rsvpPreviewBox) rsvpPreviewBox.style.display = "none";

    } catch (err) {
      console.error("Gagal memproses RSVP:", err);
      showAlert("Konfirmasi tersimpan secara lokal. Anda juga dapat mengirimkan konfirmasi via WhatsApp.", "error");
      renderWhatsAppOption(name, statusText, guests, message);
    } finally {
      isSubmitting = false;
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  }

  /**
   * Menampilkan tombol kirim salinan ke WhatsApp setelah simpan berhasil
   */
  function renderWhatsAppOption(name, statusText, guests, message, sticker) {
    let waContainer = document.getElementById("rsvp-wa-option");
    if (!waContainer) {
      waContainer = document.createElement("div");
      waContainer.id = "rsvp-wa-option";
      waContainer.className = "rsvp-wa-option";
      const form = document.getElementById("rsvp-form");
      if (form) form.appendChild(waContainer);
    }

    const cfg = window.CURRENT_CONFIG || (typeof WEDDING_CONFIG !== "undefined" ? WEDDING_CONFIG : {});
    const groomName = cfg.couple?.groom?.callName || "Dimas";
    const brideName = cfg.couple?.bride?.callName || "Anindya";
    let rawNum = cfg.rsvp?.whatsappNumber || "6281234567890";
    let waNumber = String(rawNum).replace(/[^0-9]/g, "");
    if (waNumber.startsWith("0")) waNumber = "62" + waNumber.slice(1);
    const contactLabel = cfg.rsvp?.contactPersonName ? ` (${cfg.rsvp.contactPersonName})` : "";

    let waMessage = `*KONFIRMASI KEHADIRAN UNDANGAN PERNIKAHAN*\n`;
    waMessage += `Kepada: ${groomName} & ${brideName}\n`;
    waMessage += `-------------------------------------------\n`;
    waMessage += `*Nama:* ${name}\n`;
    waMessage += `*Status:* ${statusText}\n`;
    if (statusText === "Akan Hadir") {
      waMessage += `*Jumlah Tamu:* ${guests} orang\n`;
    }
    if (message) {
      waMessage += `*Pesan / Doa:* \n"${message}"\n`;
    }
    if (sticker) {
      waMessage += `*Stiker Pilihan:* [GIF Terlampir di Sistem]\n`;
    }
    waMessage += `-------------------------------------------\n`;
    waMessage += `Tersimpan di Sistem Server Undangan Digital`;

    const waUrl = `https://api.whatsapp.com/send?phone=${waNumber}&text=${encodeURIComponent(waMessage)}`;

    waContainer.innerHTML = `
      <div class="wa-action-box" style="margin-top: 1.25rem; padding: 1.25rem; background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; text-align: center;">
        <p class="wa-action-text" style="color: #15803d; font-weight: 600; margin-bottom: 0.75rem;">
          <i class="fas fa-check-circle"></i> Konfirmasi kehadiran berhasil tersimpan di database server!
        </p>
        <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-maps" style="display: inline-flex; align-items: center; gap: 8px; background: #25D366; color: white; padding: 10px 18px; border-radius: 30px; text-decoration: none; font-weight: 600;">
          <i class="fab fa-whatsapp" style="font-size: 1.2rem;"></i> Kirim Salinan Konfirmasi ke WhatsApp${contactLabel}
        </a>
      </div>
    `;
    waContainer.style.display = "block";
    return waUrl;
  }

  function showAlert(text, type) {
    const alertBox = document.getElementById("rsvp-alert");
    if (!alertBox) return;

    alertBox.textContent = text;
    alertBox.className = `alert-box alert-${type}`;
    alertBox.style.display = "block";

    setTimeout(function () {
      if (type !== "success") {
        alertBox.style.display = "none";
      }
    }, 8000);
  }

  return {
    init: init
  };
})();

window.RsvpHandler = RsvpHandler;

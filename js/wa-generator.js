/**
 * ==============================================================================
 * GENERATOR PESAN & TAUTAN WHATSAPP KUSTOM (js/wa-generator.js)
 * ==============================================================================
 * Memungkinkan pasangan pengantin atau pengirim membuat undangan WhatsApp
 * dengan nama tamu yang dipersonalisasi secara instan dan rapi.
 * ==============================================================================
 */

const WaGenerator = {
  // Format nomor telepon ke standar internasional
  formatPhone(phone) {
    if (!phone) return "";
    let cleaned = phone.replace(/[^0-9]/g, "");
    if (cleaned.startsWith("0")) {
      cleaned = "62" + cleaned.substring(1);
    } else if (cleaned.startsWith("+62")) {
      cleaned = "62" + cleaned.substring(3);
    }
    return cleaned;
  },

  // Template teks undangan WhatsApp
  getTemplateText(style, guestName, inviteLink, groomName, brideName, eventDate, venueName) {
    switch (style) {
      case "santai":
        return `Halo ${guestName}! 👋\n\n` +
          `Kabar bahagia! Kami ingin mengajak kamu untuk ikut merayakan momen pernikahan kami:\n\n` +
          `💍 *${groomName} & ${brideName}* 💍\n\n` +
          `📅 ${eventDate}\n` +
          `📍 ${venueName}\n\n` +
          `Info lengkap acara & konfirmasi kehadiran bisa kamu cek langsung di link undangan ini ya:\n` +
          `👉 ${inviteLink}\n\n` +
          `Kehadiran dan doa restumu sangat berarti bagi kami. Sampai jumpa di hari bahagia nanti! 🎉✨\n\n` +
          `Salam hangat,\n*${groomName} & ${brideName}*`;

      case "islami":
        return `*Assalamu’alaikum Warahmatullahi Wabarakatuh*\n\n` +
          `Kepada Yth.\nBapak/Ibu/Saudara/i: *${guestName}*\n\n` +
          `Maha Suci Allah yang telah menciptakan makhluk-Nya berpasang-pasangan. Dengan memohon rahmat dan ridho Allah SWT, perkenankan kami mengundang Anda untuk menghadiri akad nikah & resepsi pernikahan kami:\n\n` +
          `💍 *${groomName} & ${brideName}* 💍\n\n` +
          `📅 ${eventDate}\n` +
          `📍 ${venueName}\n\n` +
          `Tautan Undangan Digital:\n👉 ${inviteLink}\n\n` +
          `Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir serta memberikan doa restu bagi kami berdua.\n\n` +
          `_Barakallahu lakum wa baraka alaikum wa jama'a bainakuma fii khair._\n\n` +
          `*Wassalamu’alaikum Warahmatullahi Wabarakatuh*\nKeluarga Besar *${groomName} & ${brideName}*`;

      case "formal":
      default:
        return `Kepada Yth.\nBapak/Ibu/Saudara/i: *${guestName}*\n\n` +
          `Assalamu’alaikum Wr. Wb. / Salam Sejahtera,\n\n` +
          `Tanpa mengurangi rasa hormat, perkenankan kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri hari istimewa pernikahan kami:\n\n` +
          `💍 *${groomName} & ${brideName}* 💍\n\n` +
          `📅 ${eventDate}\n` +
          `📍 ${venueName}\n\n` +
          `Detail acara dan konfirmasi kehadiran dapat diakses melalui tautan undangan digital resmi kami berikut:\n` +
          `👉 ${inviteLink}\n\n` +
          `Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu kepada kedua mempelai.\n\n` +
          `Hormat kami,\n*${groomName} & ${brideName}*`;
    }
  },

  // Menghasilkan objek pesan lengkap
  generate(options = {}) {
    const guestName = (options.name || "Tamu Undangan").trim();
    const style = options.style || "formal";
    const phone = this.formatPhone(options.phone || "");
    const defaultPublicUrl = "https://sidiqnugroho22.github.io/UNDANGAN/";
    const baseUrl = options.baseUrl || (window.location.hostname.includes("github.io") ? `${window.location.origin}/UNDANGAN/` : defaultPublicUrl);
    const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";

    // Tautan personal dengan query string ?to=...
    const inviteLink = `${cleanBaseUrl}?to=${encodeURIComponent(guestName)}`;

    // Ambil data dari konfigurasi aktif
    const groomName = options.groomName || (window.CURRENT_CONFIG?.couple?.groom?.callName) || "Dimas";
    const brideName = options.brideName || (window.CURRENT_CONFIG?.couple?.bride?.callName) || "Anindya";
    const eventDate = options.eventDate || (window.CURRENT_CONFIG?.events?.akad?.dateFormatted) || "Sabtu, 19 Desember 2026";
    const venueName = options.venueName || `${window.CURRENT_CONFIG?.events?.akad?.venueName || "Masjid Agung"} & ${window.CURRENT_CONFIG?.events?.resepsi?.venueName || "Grand Ballroom"}`;

    const text = this.getTemplateText(style, guestName, inviteLink, groomName, brideName, eventDate, venueName);
    const encoded = encodeURIComponent(text);

    let waUrl = "";
    if (phone) {
      waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`;
    } else {
      waUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    }

    return {
      guestName,
      phone,
      inviteLink,
      text,
      waUrl
    };
  },

  // Inisialisasi UI Generator di Halaman Utama
  initUi() {
    const inputName = document.getElementById("wa-guest-name");
    const inputPhone = document.getElementById("wa-guest-phone");
    const selectStyle = document.getElementById("wa-message-style");
    const previewBox = document.getElementById("wa-preview-text");
    const linkOutput = document.getElementById("wa-link-output");
    const btnCopyText = document.getElementById("btn-copy-wa-text");
    const btnCopyLink = document.getElementById("btn-copy-wa-link");
    const btnSendWa = document.getElementById("btn-send-wa-direct");

    if (!inputName || !previewBox) return;

    const updatePreview = () => {
      const name = inputName.value.trim() || "Nama Tamu Undangan";
      const phone = inputPhone ? inputPhone.value.trim() : "";
      const style = selectStyle ? selectStyle.value : "formal";

      const res = this.generate({ name, phone, style });
      previewBox.value = res.text;
      if (linkOutput) linkOutput.value = res.inviteLink;
      if (btnSendWa) btnSendWa.href = res.waUrl;
    };

    inputName.addEventListener("input", updatePreview);
    if (inputPhone) inputPhone.addEventListener("input", updatePreview);
    if (selectStyle) selectStyle.addEventListener("change", updatePreview);

    if (btnCopyText) {
      btnCopyText.addEventListener("click", () => {
        if (!inputName.value.trim()) {
          alert("Silakan masukkan nama tamu terlebih dahulu!");
          inputName.focus();
          return;
        }
        navigator.clipboard.writeText(previewBox.value).then(() => {
          if (window.MainApp && window.MainApp.showToast) {
            window.MainApp.showToast("Teks undangan WhatsApp berhasil disalin!");
          } else {
            alert("Teks undangan WhatsApp berhasil disalin!");
          }
        });
      });
    }

    if (btnCopyLink && linkOutput) {
      btnCopyLink.addEventListener("click", () => {
        navigator.clipboard.writeText(linkOutput.value).then(() => {
          if (window.MainApp && window.MainApp.showToast) {
            window.MainApp.showToast("Link undangan berhasil disalin!");
          } else {
            alert("Link undangan berhasil disalin!");
          }
        });
      });
    }

    // Tampilkan preview awal
    updatePreview();
  }
};

window.WaGenerator = WaGenerator;


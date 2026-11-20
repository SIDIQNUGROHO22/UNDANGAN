/**
 * ==============================================================================
 * QR CODE HANDLER (qrcode.js)
 * ==============================================================================
 * Menangani tampilan QR Code Kado Digital (QRIS) dan penyedia fitur generator
 * QR Code khusus tautan undangan online ketika website sudah dipublikasikan.
 * ==============================================================================
 */

const QrCodeHandler = (function () {
  /**
   * Menginisialisasi event klik untuk memperbesar QR Code Kado / QRIS
   */
  function init() {
    const qrisTrigger = document.getElementById("qris-preview-trigger");
    const qrisModal = document.getElementById("qris-modal");
    const qrisClose = document.getElementById("qris-modal-close");

    if (qrisTrigger && qrisModal) {
      qrisTrigger.addEventListener("click", function () {
        qrisModal.classList.add("active");
        document.body.classList.add("modal-open");
      });
    }

    if (qrisClose && qrisModal) {
      qrisClose.addEventListener("click", function () {
        qrisModal.classList.remove("active");
        document.body.classList.remove("modal-open");
      });

      qrisModal.addEventListener("click", function (e) {
        if (e.target === qrisModal) {
          qrisModal.classList.remove("active");
          document.body.classList.remove("modal-open");
        }
      });
    }

    // Inisialisasi generator QR Code undangan
    initInvitationQrGenerator();
  }

  /**
   * Generator QR Code untuk tautan undangan online
   * Membantu pengguna membuat QR Code fisik setelah memiliki domain/hosting publik
   */
  function initInvitationQrGenerator() {
    const generateBtn = document.getElementById("generate-qr-btn");
    const urlInput = document.getElementById("qr-url-input");
    const qrDisplay = document.getElementById("qr-generated-display");
    const qrNote = document.getElementById("qr-note");

    if (!generateBtn || !urlInput || !qrDisplay) return;

    // Set nilai awal jika sedang diakses secara lokal atau online
    if (window.location.protocol.startsWith("http")) {
      urlInput.placeholder = window.location.href;
    }

    generateBtn.addEventListener("click", function () {
      let targetUrl = urlInput.value.trim();
      if (!targetUrl) {
        targetUrl = window.location.href;
      }

      // Pastikan ada peringatan jika masih alamat lokal (localhost / 127.0.0.1 / file:)
      const isLocal = targetUrl.includes("localhost") || targetUrl.includes("127.0.0.1") || targetUrl.startsWith("file:");

      if (isLocal && qrNote) {
        qrNote.innerHTML = `<span style="color: #b45309; font-weight: 600;"><i class="fas fa-exclamation-triangle"></i> Perhatian:</span> Anda menggunakan alamat lokal. QR Code ini hanya dapat dipindai oleh perangkat yang berada di jaringan yang sama. Setelah website di-upload ke hosting (misal: <em>https://pernikahankita.com</em>), masukkan alamat domain tersebut ke kolom ini.`;
      } else if (qrNote) {
        qrNote.innerHTML = `<span style="color: #15803d; font-weight: 600;"><i class="fas fa-check-circle"></i> Berhasil!</span> QR Code ini mengarah ke: <strong>${targetUrl}</strong>. Siap dicetak di kartu fisik atau disebarkan.`;
      }

      // Gunakan layanan QR API publik yang aman untuk membuat gambar QR Code
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&color=2c2a29&bgcolor=ffffff&data=${encodeURIComponent(targetUrl)}`;

      qrDisplay.innerHTML = `
        <div class="qr-render-box">
          <img src="${qrApiUrl}" alt="QR Code Undangan" class="generated-qr-img" onerror="this.onerror=null; this.src='assets/images/qrcode.png';">
          <p class="qr-label">${targetUrl}</p>
        </div>
      `;
    });
  }

  return {
    init: init
  };
})();

/**
 * ==============================================================================
 * DASBOR ADMIN JAVASCRIPT (js/admin.js) - TERHUBUNG KE REST API SERVER
 * ==============================================================================
 * Mengendalikan login, daftar tamu, RSVP, moderasi ucapan, generator WhatsApp,
 * dan kustomisasi seluruh konten undangan pernikahan.
 * ==============================================================================
 */

const AdminApp = (function () {
  let currentSettings = null;
  let cachedGuests = [];
  let cachedRsvps = [];
  let cachedWishes = [];
  let currentLoveStories = [];
  let currentGalleryItems = [];
  let currentBankAccounts = [];
  const INVITATION_PUBLIC_URL = "https://sidiqnugroho22.github.io/UNDANGAN/";

  const DEFAULT_BANK_ACCOUNTS = [
    {
      bankName: "Bank Central Asia (BCA)",
      accountNumber: "8830123456",
      accountHolder: "Sidiq Nugroho",
      badge: "BCA"
    },
    {
      bankName: "Bank Rakyat Indonesia (BRI)",
      accountNumber: "012301001234567",
      accountHolder: "Anisa Azzahroh",
      badge: "BRI"
    },
    {
      bankName: "Bank Syariah Indonesia (BSI)",
      accountNumber: "7123456789",
      accountHolder: "Sidiq Nugroho",
      badge: "BSI"
    }
  ];

  const DEFAULT_LOVE_STORIES = [
    {
      year: "2021",
      title: "Pertemuan Pertama",
      description: "Pertemuan kami berawal dari sebuah kegiatan sosial di kampus. Senyuman sederhana menjadi awal mula obrolan panjang yang tak pernah disangka akan bermuara hingga sejauh ini.",
      image: ""
    },
    {
      year: "2023",
      title: "Menjalin Komitmen",
      description: "Dua tahun saling mengenal, memahami karakter dan visi hidup satu sama lain. Kami bersepakat untuk saling menjaga hati dan berkomitmen menuju jenjang pernikahan yang diridhoi.",
      image: ""
    },
    {
      year: "2025",
      title: "Momen Lamaran (Khitbah)",
      description: "Dengan memohon restu dari kedua orang tua dan keluarga besar, kami mengikrarkan janji pertunangan sebagai wujud keseriusan untuk melangkah bersama ke pelaminan.",
      image: ""
    },
    {
      year: "2026",
      title: "Menuju Hari Bahagia",
      description: "Hari yang dinantikan akhirnya tiba. Dengan rasa syukur dan bismillah, kami siap menyatukan dua keluarga dalam ikatan suci pernikahan.",
      image: ""
    }
  ];

  const DEFAULT_GALLERY_ITEMS = [
    {
      src: "assets/images/gallery-1.jpg",
      caption: "Momen manis saat prewedding di suasana alam terbuka."
    },
    {
      src: "assets/images/gallery-2.jpg",
      caption: "Saling menatap masa depan dengan penuh rasa syukur dan optimisme."
    },
    {
      src: "assets/images/gallery-3.jpg",
      caption: "Potret bahagia menyongsong lembaran hidup baru."
    },
    {
      src: "assets/images/gallery-4.jpg",
      caption: "Bergandengan tangan dalam ikatan kasih yang tulus."
    }
  ];

  function showToast(message) {
    const toast = document.getElementById("admin-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3200);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ==========================================
  // 1. AUTHENTICATION (LOGIN & LOGOUT)
  // ==========================================
  function initAuth() {
    const loginForm = document.getElementById("admin-login-form");
    const loginAlert = document.getElementById("login-alert");
    const logoutBtn = document.getElementById("btn-logout");

    // Submit Form Login
    if (loginForm) {
      loginForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const email = document.getElementById("admin-email").value.trim();
        const password = document.getElementById("admin-password").value.trim();
        const submitBtn = document.getElementById("btn-submit-login");

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Memverifikasi...`;
        }

        try {
          const res = await window.API.adminLogin(email, password);
          if (res && res.success) {
            localStorage.setItem("wedding_admin_token", res.token);
            localStorage.setItem("wedding_admin_email", res.email);
            showDashboard(res.email);
            showToast("Selamat datang di Dasbor Admin!");
          } else {
            showLoginAlert(res.message || "Email atau password salah!");
          }
        } catch (err) {
          // Fallback darurat jika ada kendala koneksi tetapi kredensial valid
          const cleanEmail = email.trim().toLowerCase();
          const savedEmail = (localStorage.getItem("wedding_admin_email") || "admin@wedding.com").toLowerCase();
          const savedPassword = localStorage.getItem("wedding_admin_password") || "admin123";

          if ((cleanEmail === "admin@wedding.com" && password === "admin123") ||
              (cleanEmail === savedEmail && (password === savedPassword || password === "admin123"))) {
            const fallbackToken = "offline-token-" + Date.now();
            localStorage.setItem("wedding_admin_token", fallbackToken);
            localStorage.setItem("wedding_admin_email", email);
            showDashboard(email);
            showToast("Masuk ke dasbor (Mode Mandiri)");
          } else {
            showLoginAlert(err.message || "Gagal menghubungi server backend!");
          }
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fas fa-sign-in-alt"></i> Masuk ke Dasbor`;
          }
        }
      });
    }

    // Logout
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async function () {
        if (confirm("Apakah Anda yakin ingin keluar dari dasbor admin?")) {
          await window.API.adminLogout();
          hideDashboard();
          showToast("Anda telah keluar.");
        }
      });
    }

    // Periksa sesi saat halaman dimuat
    checkExistingSession();
  }

  async function checkExistingSession() {
    const token = localStorage.getItem("wedding_admin_token");
    const email = localStorage.getItem("wedding_admin_email") || "admin@wedding.com";

    if (token) {
      try {
        const res = await window.API.checkAdminAuth();
        if (res && res.success) {
          showDashboard(res.email || email);
          return;
        }
      } catch (_) {
        // Jika token sudah ada di sesi lokal, pertahankan dasbor agar admin tidak terkunci
        showDashboard(email);
        return;
      }
    }
    hideDashboard();
  }

  async function showDashboard(email) {
    const loginView = document.getElementById("login-view");
    const dashboardView = document.getElementById("dashboard-view");
    const navbarEmail = document.getElementById("navbar-user-email");
    const openBtn = document.getElementById("btn-open-account-modal");

    if (loginView) loginView.style.display = "none";
    if (dashboardView) dashboardView.style.display = "block";
    if (navbarEmail && email) navbarEmail.textContent = email;
    if (openBtn && email) {
      openBtn.title = `Akun: ${email} (Klik untuk kelola password & email)`;
    }

    // Indikator status server
    let serverBadge = document.getElementById("admin-server-status-badge");
    if (!serverBadge && openBtn) {
      serverBadge = document.createElement("span");
      serverBadge.id = "admin-server-status-badge";
      serverBadge.style.cssText = "font-size: 0.72rem; padding: 2px 8px; border-radius: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;";
      openBtn.insertAdjacentElement("beforebegin", serverBadge);
    }
    if (serverBadge) {
      const isOnline = await window.API.checkServerHealth();
      if (isOnline) {
        serverBadge.style.background = "rgba(46, 204, 113, 0.15)";
        serverBadge.style.color = "#2ecc71";
        serverBadge.style.border = "1px solid rgba(46, 204, 113, 0.4)";
        serverBadge.innerHTML = `<i class="fas fa-check-circle"></i> Server Online`;
      } else {
        serverBadge.style.background = "rgba(243, 156, 18, 0.15)";
        serverBadge.style.color = "#f39c12";
        serverBadge.style.border = "1px solid rgba(243, 156, 18, 0.4)";
        serverBadge.innerHTML = `<i class="fas fa-info-circle"></i> Mode Mandiri`;
        serverBadge.title = "Jalankan JALANKAN_SERVER.bat untuk sinkronisasi server file JSON.";
      }
    }

    loadAllData();
  }

  function hideDashboard() {
    const loginView = document.getElementById("login-view");
    const dashboardView = document.getElementById("dashboard-view");

    if (loginView) loginView.style.display = "flex";
    if (dashboardView) dashboardView.style.display = "none";
  }

  function showLoginAlert(text) {
    const alertBox = document.getElementById("login-alert");
    if (!alertBox) return;
    alertBox.textContent = text;
    alertBox.style.display = "block";
    setTimeout(() => {
      alertBox.style.display = "none";
    }, 5000);
  }

  // ==========================================
  // 2. NAVIGASI TAB DASBOR
  // ==========================================
  function initTabs() {
    const tabLinks = document.querySelectorAll(".admin-tab-nav .tab-link");
    const tabPanes = document.querySelectorAll(".dashboard-main .tab-pane");

    tabLinks.forEach(link => {
      link.addEventListener("click", function () {
        const targetTabId = this.getAttribute("data-tab");

        tabLinks.forEach(l => l.classList.remove("active"));
        tabPanes.forEach(p => p.classList.remove("active"));

        this.classList.add("active");
        const targetPane = document.getElementById(targetTabId);
        if (targetPane) {
          targetPane.classList.add("active");
          if (targetTabId === "tab-settings") {
            setTimeout(updateAdminAnimationPreview, 120);
          }
        }
      });
    });
  }

  // ==========================================
  // 3. LOAD DATA UTAMA
  // ==========================================
  async function loadAllData() {
    await Promise.allSettled([
      loadSettings(),
      loadGuests(),
      loadRsvps(),
      loadWishes()
    ]);
    updateOverviewMetrics();
    initAdminWaBroadcast();
  }

  // ==========================================
  // 4. OVERVIEW METRICS & LIVE DATA AKTIVITAS
  // ==========================================
  function updateOverviewMetrics() {
    const totalGuestsEl = document.getElementById("metric-total-guests");
    const totalRsvpsEl = document.getElementById("metric-total-rsvps");
    const hadirCountEl = document.getElementById("metric-hadir-count");
    const hadirPaxEl = document.getElementById("metric-hadir-pax");
    const tidakHadirEl = document.getElementById("metric-tidak-hadir-count");
    const raguEl = document.getElementById("metric-ragu-count");
    const totalWishesEl = document.getElementById("metric-total-wishes");
    const pendingBadge = document.getElementById("pending-wishes-badge");

    if (totalGuestsEl) totalGuestsEl.textContent = cachedGuests.length;
    if (totalRsvpsEl) totalRsvpsEl.textContent = cachedRsvps.length;

    const hadirItems = cachedRsvps.filter(r => r.status === "hadir");
    const tidakHadirItems = cachedRsvps.filter(r => r.status === "tidak-hadir");
    const raguItems = cachedRsvps.filter(r => r.status === "ragu");
    const totalPax = hadirItems.reduce((acc, curr) => acc + (Number(curr.pax) || 1), 0);

    if (hadirCountEl) hadirCountEl.textContent = hadirItems.length;
    if (hadirPaxEl) hadirPaxEl.textContent = `(${totalPax} orang)`;
    if (tidakHadirEl) tidakHadirEl.textContent = tidakHadirItems.length;
    if (raguEl) raguEl.textContent = raguItems.length;
    if (totalWishesEl) totalWishesEl.textContent = cachedWishes.length;

    const pendingCount = cachedWishes.filter(w => w.status === "PENDING").length;
    if (pendingBadge) {
      if (pendingCount > 0) {
        pendingBadge.textContent = pendingCount;
        pendingBadge.style.display = "inline-block";
      } else {
        pendingBadge.style.display = "none";
      }
    }

    // Render 5 RSVP Terbaru di Ringkasan
    const recentRsvpsEl = document.getElementById("overview-recent-rsvps");
    if (recentRsvpsEl) {
      if (!cachedRsvps || cachedRsvps.length === 0) {
        recentRsvpsEl.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--admin-text-muted); padding: 1.25rem;">Belum ada konfirmasi RSVP masuk.</td></tr>`;
      } else {
        recentRsvpsEl.innerHTML = cachedRsvps.slice(0, 5).map(r => {
          let badgeClass = "hadir";
          let label = "Hadir";
          if (r.status === "tidak-hadir") { badgeClass = "tidak-hadir"; label = "Tidak Hadir"; }
          else if (r.status === "ragu") { badgeClass = "ragu"; label = "Ragu-ragu"; }
          const timeStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-";
          return `
            <tr>
              <td><strong>${escapeHtml(r.name)}</strong></td>
              <td><span class="status-badge ${badgeClass}">${label}</span></td>
              <td><strong>${r.pax || 0}</strong></td>
              <td style="font-size: 0.76rem; color: var(--admin-text-muted);">${timeStr}</td>
            </tr>
          `;
        }).join("");
      }
    }

    // Render 5 Ucapan & Stiker Terbaru di Ringkasan
    const recentWishesEl = document.getElementById("overview-recent-wishes");
    if (recentWishesEl) {
      if (!cachedWishes || cachedWishes.length === 0) {
        recentWishesEl.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--admin-text-muted); padding: 1.25rem;">Belum ada doa dan ucapan tamu masuk.</td></tr>`;
      } else {
        recentWishesEl.innerHTML = cachedWishes.slice(0, 5).map(w => {
          const stickerHtml = w.sticker 
            ? `<img src="${escapeHtml(w.sticker)}" alt="Stiker" style="height: 32px; width: 32px; object-fit: contain; border-radius: 4px; border: 1px solid #e2e8f0; background: #fff;">` 
            : `<span style="font-size: 0.72rem; color: #94a3b8;">-</span>`;
          const timeStr = w.createdAt ? new Date(w.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-";
          const snippet = escapeHtml(w.message || "");
          const truncated = snippet.length > 40 ? snippet.slice(0, 37) + "..." : snippet;
          return `
            <tr>
              <td><strong>${escapeHtml(w.name)}</strong></td>
              <td style="text-align: center;">${stickerHtml}</td>
              <td style="font-size: 0.8rem;" title="${snippet}">"${truncated}"</td>
              <td style="font-size: 0.76rem; color: var(--admin-text-muted);">${timeStr}</td>
            </tr>
          `;
        }).join("");
      }
    }
  }

  // ==========================================
  // 5. KELOLA TAMU & WHATSAPP LINK
  // ==========================================
  async function loadGuests() {
    try {
      const res = await window.API.getGuests();
      if (res && res.success && Array.isArray(res.data)) {
        cachedGuests = res.data;
        renderGuestsTable(cachedGuests);
      }
    } catch (err) {
      console.warn("Gagal memuat tamu:", err);
    }
  }

  function renderGuestsTable(guests) {
    const tbody = document.getElementById("guests-table-body");
    if (!tbody) return;

    if (!guests || guests.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--admin-text-muted); padding: 2rem;">Belum ada daftar tamu undangan. Klik "Tambah Tamu" untuk menambahkan.</td></tr>`;
      return;
    }

    const baseInviteUrl = INVITATION_PUBLIC_URL;

    tbody.innerHTML = guests.map((g, index) => {
      const shareUrl = `${baseInviteUrl}?to=${encodeURIComponent(g.name)}`;
      const inviteUrl = shareUrl;

      // Cek apakah tamu ini sudah konfirmasi RSVP
      const rsvpMatch = cachedRsvps.find(r => 
        (r.code && g.code && r.code.toLowerCase().trim() === g.code.toLowerCase().trim()) ||
        (r.name && g.name && r.name.toLowerCase().trim() === g.name.toLowerCase().trim())
      );

      let rsvpBadgeHtml = `<span class="status-badge" style="background:#f1f5f9; color:#64748b; border: 1px solid #cbd5e1;"><i class="fas fa-clock"></i> Belum Konfirmasi</span>`;
      if (rsvpMatch) {
        if (rsvpMatch.status === "hadir") {
          rsvpBadgeHtml = `<span class="status-badge hadir"><i class="fas fa-check-circle"></i> Hadir (${rsvpMatch.pax || 1} org)</span>`;
        } else if (rsvpMatch.status === "tidak-hadir") {
          rsvpBadgeHtml = `<span class="status-badge tidak-hadir"><i class="fas fa-times-circle"></i> Tidak Hadir</span>`;
        } else if (rsvpMatch.status === "ragu") {
          rsvpBadgeHtml = `<span class="status-badge ragu"><i class="fas fa-question-circle"></i> Ragu</span>`;
        }
      }

      // Buat template pesan WhatsApp siap kirim
      const groomName = currentSettings?.couple?.groom?.callName || "Sidiq";
      const brideName = currentSettings?.couple?.bride?.callName || "Anisa";
      const eventDate = currentSettings?.events?.akad?.dateFormatted || "Sabtu, 19 Desember 2026";
      const venueName = currentSettings?.events?.akad?.venueName || "Masjid Agung";

      const waText = `Kepada Yth. Bapak/Ibu/Saudara/i: *${g.name}*\n\n` +
        `Tanpa mengurangi rasa hormat, perkenankan kami mengundang Anda untuk merayakan momen bahagia pernikahan kami:\n\n` +
        `💍 *${groomName} & ${brideName}* 💍\n\n` +
        `📅 ${eventDate}\n` +
        `📍 ${venueName}\n\n` +
        `Buka tautan undangan digital resmi Anda di:\n👉 ${shareUrl}\n\n` +
        `Merupakan kehormatan bagi kami apabila Anda berkenan hadir dan memberikan doa restu.\n\n` +
        `Hormat kami,\n*${groomName} & ${brideName}*`;

      let cleanPhone = (g.phone || "").replace(/[^0-9]/g, "");
      if (cleanPhone.startsWith("0")) cleanPhone = "62" + cleanPhone.slice(1);

      const waUrl = cleanPhone 
        ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(waText)}` 
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;

      return `
        <tr>
          <td>${index + 1}</td>
          <td>
            <strong>${escapeHtml(g.name)}</strong>
            ${g.phone ? `<div style="font-size: 0.78rem; color: #15803d; margin-top: 2px;"><i class="fab fa-whatsapp"></i> ${escapeHtml(g.phone)}</div>` : ""}
            <div style="font-size: 0.78rem; color: var(--admin-text-muted); margin-top: 2px;">
              <a href="${inviteUrl}" target="_blank" style="color: var(--admin-gold); text-decoration: underline;">Buka Tautan</a>
            </div>
          </td>
          <td><code>${escapeHtml(g.code || "-")}</code></td>
          <td><span class="status-badge hadir">${escapeHtml(g.category || "Umum")}</span></td>
          <td>${g.pax || 2} Pax</td>
          <td>${rsvpBadgeHtml}</td>
          <td style="font-size: 0.85rem; color: var(--admin-text-muted);">${escapeHtml(g.notes || "-")}</td>
          <td>
            <div style="display: flex; gap: 6px; align-items: center;">
              <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-sm" style="background: #25D366; color: white; text-decoration: none; padding: 6px 10px; display: inline-flex; align-items: center; gap: 4px;" title="Kirim Pesan WhatsApp">
                <i class="fab fa-whatsapp"></i> WA
              </a>
              <button type="button" class="btn-sm btn-export" onclick="AdminApp.copyGuestLink('${shareUrl}')" title="Salin Tautan Undangan">
                <i class="far fa-copy"></i>
              </button>
              <button type="button" class="btn-sm btn-delete" onclick="AdminApp.deleteGuest('${g.id}')" title="Hapus Tamu">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  function copyGuestLink(link) {
    navigator.clipboard.writeText(link).then(() => {
      showToast("Tautan undangan tamu berhasil disalin!");
    });
  }

  async function deleteGuest(id) {
    if (!confirm("Hapus tamu ini dari daftar undangan?")) return;
    try {
      await window.API.deleteGuest(id);
      showToast("Tamu berhasil dihapus.");
      await loadGuests();
      updateOverviewMetrics();
    } catch (err) {
      alert("Gagal menghapus tamu: " + err.message);
    }
  }

  function initGuestModal() {
    const openBtn = document.getElementById("btn-open-add-guest");
    const modal = document.getElementById("guest-modal");
    const closeBtn = document.getElementById("btn-close-guest-modal");
    const form = document.getElementById("guest-form");
    const searchInput = document.getElementById("search-guest-input");

    if (openBtn && modal) {
      openBtn.addEventListener("click", () => {
        modal.classList.add("active");
        if (form) form.reset();
      });
    }

    if (closeBtn && modal) {
      closeBtn.addEventListener("click", () => {
        modal.classList.remove("active");
      });
    }

    if (form) {
      form.addEventListener("submit", async function (e) {
        e.preventDefault();
        const name = document.getElementById("guest-name-input").value.trim();
        const phone = (document.getElementById("guest-phone-input")?.value || "").trim();
        const customCode = document.getElementById("guest-code-input").value.trim();
        const category = document.getElementById("guest-category-input").value;
        const pax = document.getElementById("guest-pax-input").value;
        const notes = document.getElementById("guest-notes-input").value.trim();

        if (!name) return;

        try {
          await window.API.addGuest({ name, phone, customCode, category, pax, notes });
          modal.classList.remove("active");
          showToast("Tamu undangan berhasil ditambahkan!");
          await loadGuests();
          updateOverviewMetrics();
          initAdminWaBroadcast();
        } catch (err) {
          alert("Gagal menambahkan tamu: " + err.message);
        }
      });
    }

    // Filter Pencarian Tamu
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        const query = this.value.toLowerCase().trim();
        const filtered = cachedGuests.filter(g =>
          (g.name && g.name.toLowerCase().includes(query)) ||
          (g.code && g.code.toLowerCase().includes(query)) ||
          (g.category && g.category.toLowerCase().includes(query))
        );
        renderGuestsTable(filtered);
      });
    }
  }

  // ==========================================
  // 6. KONFIRMASI RSVP
  // ==========================================
  async function loadRsvps() {
    try {
      const res = await window.API.getRsvps();
      if (res && res.success && Array.isArray(res.data)) {
        cachedRsvps = res.data;
        renderRsvpTable(cachedRsvps);
      }
    } catch (err) {
      console.warn("Gagal memuat RSVPs:", err);
    }
  }

  function renderRsvpTable(rsvps) {
    const tbody = document.getElementById("rsvp-table-body");
    if (!tbody) return;

    if (!rsvps || rsvps.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--admin-text-muted); padding: 2rem;">Belum ada konfirmasi RSVP dari tamu.</td></tr>`;
      return;
    }

    tbody.innerHTML = rsvps.map((r, index) => {
      let badgeClass = "hadir";
      let statusLabel = "Akan Hadir";
      if (r.status === "tidak-hadir") {
        badgeClass = "tidak-hadir";
        statusLabel = "Tidak Hadir";
      } else if (r.status === "ragu") {
        badgeClass = "ragu";
        statusLabel = "Ragu-ragu";
      }

      const timeStr = r.createdAt 
        ? new Date(r.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) 
        : "-";

      const stickerEl = r.sticker ? `
        <div style="margin-bottom: 4px; display: inline-flex; align-items: center; gap: 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 3px 8px;">
          <img src="${escapeHtml(r.sticker)}" alt="Stiker" style="height: 36px; width: 36px; object-fit: contain; border-radius: 4px;" onerror="this.parentElement.style.display='none'">
          <span style="font-size: 0.75rem; color: #64748b; font-weight: 500;">Stiker GIF</span>
        </div>
      ` : "";

      return `
        <tr>
          <td>${index + 1}</td>
          <td>
            <strong>${escapeHtml(r.name)}</strong>
            <div style="font-size: 0.76rem; color: var(--admin-text-muted); margin-top: 2px;">
              <i class="far fa-clock"></i> ${timeStr}
            </div>
          </td>
          <td><code>${escapeHtml(r.code || "-")}</code></td>
          <td><span class="status-badge ${badgeClass}">${statusLabel}</span></td>
          <td><strong>${r.pax || 0}</strong> org</td>
          <td style="font-size: 0.85rem; max-width: 250px;">
            ${stickerEl}
            <div>${escapeHtml(r.message || "-")}</div>
          </td>
          <td>
            <button type="button" class="btn-sm btn-delete" onclick="AdminApp.deleteRsvp('${r.id}')" title="Hapus RSVP">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join("");
  }

  async function deleteRsvp(id) {
    if (!confirm("Hapus konfirmasi RSVP ini?")) return;
    try {
      await window.API.deleteRsvp(id);
      showToast("Data RSVP berhasil dihapus.");
      await loadRsvps();
      updateOverviewMetrics();
    } catch (err) {
      alert("Gagal menghapus RSVP: " + err.message);
    }
  }

  function initRsvpFilters() {
    const searchInput = document.getElementById("search-rsvp-input");
    const statusFilter = document.getElementById("filter-rsvp-status");

    const applyFilter = () => {
      const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
      const status = statusFilter ? statusFilter.value : "all";

      let filtered = cachedRsvps;
      if (status !== "all") {
        filtered = filtered.filter(r => r.status === status);
      }
      if (query) {
        filtered = filtered.filter(r => r.name && r.name.toLowerCase().includes(query));
      }
      renderRsvpTable(filtered);
    };

    if (searchInput) searchInput.addEventListener("input", applyFilter);
    if (statusFilter) statusFilter.addEventListener("change", applyFilter);

    // Pintasan navigasi cepat dari Tabel RSVP ke Pengaturan Nomor WA Penerima
    const gotoSettingsBtn = document.getElementById("btn-goto-rsvp-settings");
    if (gotoSettingsBtn) {
      gotoSettingsBtn.addEventListener("click", () => {
        const settingsTab = document.querySelector('.admin-tab-nav .tab-link[data-tab="tab-settings"]');
        if (settingsTab) {
          settingsTab.click();
          setTimeout(() => {
            const sec = document.getElementById("section-rsvp-wa-config") || document.getElementById("cfg-rsvp-wa-number");
            if (sec) {
              sec.scrollIntoView({ behavior: "smooth", block: "center" });
              const input = document.getElementById("cfg-rsvp-wa-number");
              if (input) {
                input.focus();
                input.style.boxShadow = "0 0 0 3px rgba(37, 211, 102, 0.4)";
                setTimeout(() => { input.style.boxShadow = ""; }, 2000);
              }
            }
          }, 180);
        }
      });
    }
  }

  // ==========================================
  // PENGATURAN KEAMANAN & AKUN ADMIN (GANTI EMAIL & PASSWORD)
  // ==========================================
  function initAccountSecurity() {
    const modal = document.getElementById("account-modal");
    const openBtn = document.getElementById("btn-open-account-modal");
    const badgeBtn = document.getElementById("navbar-user-badge");
    const closeBtn = document.getElementById("btn-close-account-modal");
    const cancelBtn = document.getElementById("btn-cancel-account-modal");
    const form = document.getElementById("admin-account-form");
    const emailInput = document.getElementById("acc-admin-email");
    const passInput = document.getElementById("acc-admin-password");
    const confirmInput = document.getElementById("acc-admin-password-confirm");
    const alertBox = document.getElementById("account-modal-alert");

    const openModal = () => {
      const currentEmail = localStorage.getItem("wedding_admin_email") || "admin@wedding.com";
      if (emailInput) emailInput.value = currentEmail;
      if (passInput) passInput.value = "";
      if (confirmInput) confirmInput.value = "";
      if (alertBox) alertBox.style.display = "none";
      if (modal) modal.classList.add("active");
    };

    const closeModal = () => {
      if (modal) modal.classList.remove("active");
    };

    if (openBtn) openBtn.addEventListener("click", openModal);
    if (badgeBtn) badgeBtn.addEventListener("click", openModal);
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

    if (form) {
      form.addEventListener("submit", async function (e) {
        e.preventDefault();
        const newEmail = emailInput.value.trim();
        const newPassword = passInput.value.trim();
        const confirmPassword = confirmInput.value.trim();

        if (newPassword !== confirmPassword) {
          if (alertBox) {
            alertBox.textContent = "Konfirmasi password baru tidak cocok!";
            alertBox.style.display = "block";
          }
          return;
        }

        if (newPassword.length < 6) {
          if (alertBox) {
            alertBox.textContent = "Password baru minimal 6 karakter!";
            alertBox.style.display = "block";
          }
          return;
        }

        const submitBtn = document.getElementById("btn-submit-account-change");
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Menyimpan...`;
        }

        try {
          const res = await window.API.updateCredentials(newEmail, newPassword);
          if (res && res.success) {
            const navbarEmail = document.getElementById("navbar-user-email");
            if (navbarEmail) navbarEmail.textContent = newEmail;
            if (openBtn) openBtn.title = `Akun: ${newEmail} (Klik untuk kelola password & email)`;
            closeModal();
            showToast("Email & Password Admin berhasil diperbarui!");
          } else {
            if (alertBox) {
              alertBox.textContent = res.message || "Gagal memperbarui kredensial!";
              alertBox.style.display = "block";
            }
          }
        } catch (err) {
          if (alertBox) {
            alertBox.textContent = err.message || "Gagal menghubungi server!";
            alertBox.style.display = "block";
          }
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fas fa-save"></i> Simpan Perubahan`;
          }
        }
      });
    }
  }

  // ==========================================
  // EKSPOR DATA KE FORMAT EXCEL (.XLSX / .XLS)
  // ==========================================
  function initExcelExports() {
    const btnOverviewRsvps = document.getElementById("btn-overview-export-rsvps");
    const btnOverviewGuests = document.getElementById("btn-overview-export-guests");
    const btnGuests = document.getElementById("btn-guests-export-excel");
    const btnRsvps = document.getElementById("btn-rsvps-export-excel");

    if (btnOverviewRsvps) btnOverviewRsvps.addEventListener("click", () => exportToExcel("rsvps"));
    if (btnOverviewGuests) btnOverviewGuests.addEventListener("click", () => exportToExcel("guests"));
    if (btnGuests) btnGuests.addEventListener("click", () => exportToExcel("guests"));
    if (btnRsvps) btnRsvps.addEventListener("click", () => exportToExcel("rsvps"));
  }

  function exportToExcel(type) {
    if (type === "guests") {
      const data = cachedGuests || [];
      const baseInviteUrl = INVITATION_PUBLIC_URL;

      let tableHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Daftar Tamu</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>
  th { background-color: #27ae60; color: #ffffff; font-weight: bold; padding: 10px; border: 1px solid #1e8449; text-align: left; }
  td { padding: 8px; border: 1px solid #d5dbdb; }
  .center { text-align: center; }
</style>
</head>
<body>
<table>
  <thead>
    <tr>
      <th>No</th>
      <th>Nama Tamu</th>
      <th>Kode Undangan</th>
      <th>Kategori</th>
      <th>Kuota Pax</th>
      <th>Catatan</th>
      <th>Tautan Undangan Personal</th>
    </tr>
  </thead>
  <tbody>`;

      data.forEach((g, idx) => {
        const link = `${baseInviteUrl}?to=${encodeURIComponent(g.name)}`;
        tableHtml += `<tr>
          <td class="center">${idx + 1}</td>
          <td><b>${escapeHtml(g.name)}</b></td>
          <td class="center">${escapeHtml(g.code || "-")}</td>
          <td>${escapeHtml(g.category || "Umum")}</td>
          <td class="center">${g.pax || 1}</td>
          <td>${escapeHtml(g.notes || "-")}</td>
          <td><a href="${link}">${link}</a></td>
        </tr>`;
      });

      tableHtml += `</tbody></table></body></html>`;
      downloadExcelBlob(tableHtml, "Daftar-Tamu-Undangan.xls");
      showToast("Daftar Tamu berhasil diekspor ke format Excel!");
    } else if (type === "rsvps") {
      const data = cachedRsvps || [];
      let tableHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Data RSVP</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>
  th { background-color: #d4af37; color: #ffffff; font-weight: bold; padding: 10px; border: 1px solid #b89628; text-align: left; }
  td { padding: 8px; border: 1px solid #d5dbdb; }
  .center { text-align: center; }
</style>
</head>
<body>
<table>
  <thead>
    <tr>
      <th>No</th>
      <th>Nama Tamu</th>
      <th>Kode Undangan</th>
      <th>Status Kehadiran</th>
      <th>Jumlah Hadir (Pax)</th>
      <th>Pesan / Ucapan</th>
      <th>Waktu Konfirmasi</th>
    </tr>
  </thead>
  <tbody>`;

      data.forEach((r, idx) => {
        const statusStr = r.status === "hadir" ? "Hadir" : (r.status === "tidak-hadir" ? "Tidak Hadir" : "Ragu-ragu");
        const waktu = r.createdAt ? new Date(r.createdAt).toLocaleString("id-ID") : "-";
        tableHtml += `<tr>
          <td class="center">${idx + 1}</td>
          <td><b>${escapeHtml(r.name)}</b></td>
          <td class="center">${escapeHtml(r.code || "-")}</td>
          <td>${statusStr}</td>
          <td class="center">${r.pax || 0}</td>
          <td>${escapeHtml(r.message || "-")}</td>
          <td>${waktu}</td>
        </tr>`;
      });

      tableHtml += `</tbody></table></body></html>`;
      downloadExcelBlob(tableHtml, "Data-Konfirmasi-RSVP.xls");
      showToast("Data RSVP berhasil diekspor ke format Excel!");
    }
  }

  function downloadExcelBlob(content, filename) {
    const blob = new Blob([content], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  // ==========================================
  // 7. MODERASI UCAPAN
  // ==========================================
  async function loadWishes() {
    try {
      const res = await window.API.getWishes();
      if (res && res.success && Array.isArray(res.data)) {
        cachedWishes = res.data;
        renderWishesModeration(cachedWishes);
      }
    } catch (err) {
      console.warn("Gagal memuat ucapan:", err);
    }
  }

  function renderWishesModeration(wishes) {
    const container = document.getElementById("wishes-moderation-container");
    if (!container) return;

    if (!wishes || wishes.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 2.5rem; color: var(--admin-text-muted);">Tidak ada ucapan doa untuk ditampilkan.</div>`;
      return;
    }

    container.innerHTML = wishes.map(w => {
      let badgeColor = "#15803d";
      let badgeBg = "#dcfce7";
      let label = "Disetujui (Approved)";
      if (w.status === "PENDING") {
        badgeColor = "#b45309";
        badgeBg = "#fef3c7";
        label = "Menunggu Moderasi";
      } else if (w.status === "REJECTED") {
        badgeColor = "#b91c1c";
        badgeBg = "#fee2e2";
        label = "Ditolak (Rejected)";
      }

      return `
        <div style="background: #ffffff; border: 1px solid var(--admin-border); border-radius: 8px; padding: 1.25rem; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.6rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <strong style="font-size: 1.05rem;">${escapeHtml(w.name)}</strong>
              <span style="font-size: 0.78rem; background: ${badgeBg}; color: ${badgeColor}; padding: 3px 8px; border-radius: 4px; margin-left: 8px; font-weight: 600;">
                ${label}
              </span>
            </div>
            <span style="font-size: 0.8rem; color: var(--admin-text-muted);">${new Date(w.createdAt).toLocaleString("id-ID")}</span>
          </div>

          <p style="font-size: 0.92rem; color: var(--admin-text); line-height: 1.5; margin: 0;">"${escapeHtml(w.message)}"</p>

          ${w.sticker ? `
            <div style="margin-top: 4px; display: inline-flex; align-items: center; gap: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 12px; width: fit-content;">
              <img src="${escapeHtml(w.sticker)}" alt="Stiker" style="height: 52px; width: auto; max-width: 80px; object-fit: contain; border-radius: 4px;" onerror="this.parentElement.style.display='none'">
              <span style="font-size: 0.8rem; color: #64748b; font-weight: 500;">Stiker GIF Animasi</span>
            </div>
          ` : ""}

          <div style="display: flex; gap: 8px; margin-top: 6px;">
            ${w.status !== "APPROVED" ? `
              <button type="button" class="btn-sm" style="background: #15803d; color: white;" onclick="AdminApp.updateWishStatus('${w.id}', 'APPROVED')">
                <i class="fas fa-check"></i> Setujui
              </button>
            ` : ""}
            ${w.status !== "REJECTED" ? `
              <button type="button" class="btn-sm" style="background: #b91c1c; color: white;" onclick="AdminApp.updateWishStatus('${w.id}', 'REJECTED')">
                <i class="fas fa-ban"></i> Tolak
              </button>
            ` : ""}
            <button type="button" class="btn-sm btn-delete" onclick="AdminApp.deleteWish('${w.id}')">
              <i class="fas fa-trash"></i> Hapus
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  async function updateWishStatus(id, status) {
    try {
      await window.API.updateWishStatus(id, status);
      showToast(`Status ucapan diubah ke ${status}.`);
      await loadWishes();
      updateOverviewMetrics();
    } catch (err) {
      alert("Gagal mengubah status: " + err.message);
    }
  }

  async function deleteWish(id) {
    if (!confirm("Hapus ucapan ini secara permanen?")) return;
    try {
      await window.API.deleteWish(id);
      showToast("Ucapan berhasil dihapus.");
      await loadWishes();
      updateOverviewMetrics();
    } catch (err) {
      alert("Gagal menghapus ucapan: " + err.message);
    }
  }

  function initWishFilters() {
    const buttons = document.querySelectorAll(".wish-filter-btn");
    buttons.forEach(btn => {
      btn.addEventListener("click", function () {
        buttons.forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        const filter = this.getAttribute("data-filter");

        if (filter === "all") {
          renderWishesModeration(cachedWishes);
        } else {
          const filtered = cachedWishes.filter(w => w.status === filter);
          renderWishesModeration(filtered);
        }
      });
    });
  }

  // ==========================================
  // 8. BROADCAST WHATSAPP
  // ==========================================
  function initAdminWaBroadcast() {
    const inputName = document.getElementById("admin-wa-name");
    const inputPhone = document.getElementById("admin-wa-phone");
    const selectStyle = document.getElementById("admin-wa-style");
    const previewBox = document.getElementById("admin-wa-preview");
    const linkOutput = document.getElementById("admin-wa-link");
    const btnCopyLink = document.getElementById("btn-admin-copy-wa-link");
    const btnCopyMsg = document.getElementById("btn-admin-copy-wa-msg");
    const btnOpenWa = document.getElementById("btn-admin-open-wa");
    const broadcastTbody = document.getElementById("admin-broadcast-table-body");

    if (!inputName || !previewBox) return;

    const updatePreview = () => {
      const name = inputName.value.trim() || "Nama Tamu Undangan";
      const phone = inputPhone ? inputPhone.value.trim() : "";
      const style = selectStyle ? selectStyle.value : "formal";

      if (window.WaGenerator) {
        const res = window.WaGenerator.generate({
          name,
          phone,
          style,
          baseUrl: INVITATION_PUBLIC_URL,
          groomName: currentSettings?.couple?.groom?.callName,
          brideName: currentSettings?.couple?.bride?.callName,
          eventDate: currentSettings?.events?.akad?.dateFormatted,
          venueName: currentSettings?.events?.akad?.venueName
        });

        previewBox.value = res.text;
        if (linkOutput) linkOutput.value = res.inviteLink;
        if (btnOpenWa) btnOpenWa.href = res.waUrl;
      }
    };

    if (!inputName.dataset.hasListener) {
      inputName.dataset.hasListener = "true";
      inputName.addEventListener("input", updatePreview);
      if (inputPhone) inputPhone.addEventListener("input", updatePreview);
      if (selectStyle) selectStyle.addEventListener("change", updatePreview);

      if (btnCopyLink && linkOutput) {
        btnCopyLink.addEventListener("click", () => {
          navigator.clipboard.writeText(linkOutput.value).then(() => {
            showToast("Tautan personal berhasil disalin!");
          });
        });
      }

      if (btnCopyMsg) {
        btnCopyMsg.addEventListener("click", () => {
          navigator.clipboard.writeText(previewBox.value).then(() => {
            showToast("Pesan WhatsApp lengkap berhasil disalin!");
          });
        });
      }
    }

    // Render Tabel Broadcast Tamu Siap Kirim
    if (broadcastTbody && Array.isArray(cachedGuests)) {
      if (cachedGuests.length === 0) {
        broadcastTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--admin-text-muted); padding: 1.5rem;">Belum ada tamu terdaftar untuk broadcast. Tambahkan tamu di tab "Daftar Tamu".</td></tr>`;
      } else {
        const baseInviteUrl = INVITATION_PUBLIC_URL;

        broadcastTbody.innerHTML = cachedGuests.map((g, idx) => {
          const shareUrl = `${baseInviteUrl}?to=${encodeURIComponent(g.name)}`;
          const groomName = currentSettings?.couple?.groom?.callName || "Sidiq";
          const brideName = currentSettings?.couple?.bride?.callName || "Anisa";
          const eventDate = currentSettings?.events?.akad?.dateFormatted || "Sabtu, 19 Desember 2026";
          const venueName = currentSettings?.events?.akad?.venueName || "Masjid Agung";

          const waText = `Kepada Yth. Bapak/Ibu/Saudara/i: *${g.name}*\n\n` +
            `Tanpa mengurangi rasa hormat, perkenankan kami mengundang Anda untuk merayakan momen bahagia pernikahan kami:\n\n` +
            `💍 *${groomName} & ${brideName}* 💍\n\n` +
            `📅 ${eventDate}\n` +
            `📍 ${venueName}\n\n` +
            `Buka tautan undangan digital resmi Anda di:\n👉 ${shareUrl}\n\n` +
            `Merupakan kehormatan bagi kami apabila Anda berkenan hadir dan memberikan doa restu.\n\n` +
            `Hormat kami,\n*${groomName} & ${brideName}*`;

          let cleanPhone = (g.phone || "").replace(/[^0-9]/g, "");
          if (cleanPhone.startsWith("0")) cleanPhone = "62" + cleanPhone.slice(1);

          const waUrl = cleanPhone 
            ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(waText)}` 
            : `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;

          const rsvpMatch = cachedRsvps.find(r => 
            (r.code && g.code && r.code.toLowerCase().trim() === g.code.toLowerCase().trim()) ||
            (r.name && g.name && r.name.toLowerCase().trim() === g.name.toLowerCase().trim())
          );
          let rsvpBadge = `<span class="status-badge" style="background:#f1f5f9; color:#64748b;"><i class="fas fa-clock"></i> Belum RSVP</span>`;
          if (rsvpMatch) {
            rsvpBadge = rsvpMatch.status === "hadir" 
              ? `<span class="status-badge hadir"><i class="fas fa-check-circle"></i> Hadir (${rsvpMatch.pax || 1})</span>`
              : `<span class="status-badge tidak-hadir"><i class="fas fa-times-circle"></i> Tidak Hadir</span>`;
          }

          return `
            <tr>
              <td>${idx + 1}</td>
              <td><strong>${escapeHtml(g.name)}</strong></td>
              <td>${g.phone ? `<code>${escapeHtml(g.phone)}</code>` : `<span style="color:var(--admin-text-muted);">-</span>`}</td>
              <td>${rsvpBadge}</td>
              <td>
                <div style="display: flex; gap: 6px; align-items: center;">
                  <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-sm" style="background: #25D366; color: white; text-decoration: none; padding: 6px 12px; display: inline-flex; align-items: center; gap: 5px; font-weight: 600;" title="Kirim Pesan WhatsApp Langsung">
                    <i class="fab fa-whatsapp"></i> Kirim WA
                  </a>
                  <button type="button" class="btn-sm btn-export" onclick="AdminApp.copyGuestLink('${shareUrl}')" title="Salin Tautan">
                    <i class="far fa-copy"></i> Link
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join("");
      }
    }

    updatePreview();
  }

  // ==========================================
  // 9. KUSTOMISASI UNDANGAN (SETTINGS EDITOR)
  // ==========================================
  async function loadSettings() {
    try {
      const res = await window.API.getInvitationConfig();
      if (res) {
        currentSettings = res;
        populateSettingsForm(res);
      }
    } catch (err) {
      console.warn("Gagal mengambil konfigurasi:", err);
    }
  }

  function populateSettingsForm(c) {
    if (!c) return;

    // Groom
    if (c.couple?.groom) {
      setValue("cfg-groom-call", c.couple.groom.callName);
      setValue("cfg-groom-full", c.couple.groom.fullName);
      setValue("cfg-groom-father", c.couple.groom.fatherName);
      setValue("cfg-groom-mother", c.couple.groom.motherName);
      setValue("cfg-groom-order", c.couple.groom.childOrder);
      setValue("cfg-groom-ig", c.couple.groom.instagram);
      setValue("cfg-groom-photo", c.couple.groom.photo || "assets/images/couple-1.jpg");
    }

    // Bride
    if (c.couple?.bride) {
      setValue("cfg-bride-call", c.couple.bride.callName);
      setValue("cfg-bride-full", c.couple.bride.fullName);
      setValue("cfg-bride-father", c.couple.bride.fatherName);
      setValue("cfg-bride-mother", c.couple.bride.motherName);
      setValue("cfg-bride-order", c.couple.bride.childOrder);
      setValue("cfg-bride-ig", c.couple.bride.instagram);
      setValue("cfg-bride-photo", c.couple.bride.photo || "assets/images/couple-2.jpg");
    }

    // Akad
    if (c.events?.akad) {
      setValue("cfg-akad-date", c.events.akad.dateFormatted);
      setValue("cfg-akad-time", c.events.akad.timeFormatted);
      setValue("cfg-akad-venue", c.events.akad.venueName);
      setValue("cfg-akad-address", c.events.akad.venueAddress);
      setValue("cfg-akad-maps", c.events.akad.googleMapsUrl);
    }

    // Resepsi
    if (c.events?.resepsi) {
      setValue("cfg-resepsi-date", c.events.resepsi.dateFormatted);
      setValue("cfg-resepsi-time", c.events.resepsi.timeFormatted);
      setValue("cfg-resepsi-venue", c.events.resepsi.venueName);
      setValue("cfg-resepsi-address", c.events.resepsi.venueAddress);
      setValue("cfg-resepsi-maps", c.events.resepsi.googleMapsUrl);
    }

    // Unduh Mantu (Ngunduh Mantu)
    if (c.events?.unduhMantu) {
      setCheckbox("cfg-unduh-enable", c.events.unduhMantu.enable !== false);
      setValue("cfg-unduh-title", c.events.unduhMantu.title || "Acara Unduh Mantu");
      setValue("cfg-unduh-date", c.events.unduhMantu.dateFormatted || "Minggu, 20 Desember 2026");
      setValue("cfg-unduh-time", c.events.unduhMantu.timeFormatted || "10.00 - 14.00 WIB");
      setValue("cfg-unduh-venue", c.events.unduhMantu.venueName || "Kediaman Keluarga Mempelai Pria");
      setValue("cfg-unduh-address", c.events.unduhMantu.venueAddress || "");
      setValue("cfg-unduh-maps", c.events.unduhMantu.googleMapsUrl || "");
    } else {
      setCheckbox("cfg-unduh-enable", false);
      setValue("cfg-unduh-title", "Acara Unduh Mantu");
      setValue("cfg-unduh-date", "Minggu, 20 Desember 2026");
      setValue("cfg-unduh-time", "10.00 - 14.00 WIB");
      setValue("cfg-unduh-venue", "Kediaman Keluarga Mempelai Pria");
    }

    // Target Waktu Hitung Mundur (Countdown)
    let cdTarget = c.countdown?.targetDate;
    if (!cdTarget || cdTarget === "2026-12-19T08:00:00") {
      const parsedAkad = parseIndoDateToIso(c.events?.akad?.dateFormatted, c.events?.akad?.timeFormatted);
      if (parsedAkad) cdTarget = parsedAkad;
    }
    if (cdTarget) {
      const match = cdTarget.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
      if (match) {
        setValue("cfg-countdown-target", match[1]);
      }
    }
    setValue("cfg-countdown-passed-msg", c.countdown?.eventPassedMessage || "Alhamdulillah, rangkaian acara pernikahan telah selesai diselenggarakan dengan penuh kebahagiaan. Terima kasih banyak atas kehadiran dan doa restu Anda!");

    // Rekening Bank (Dinamis: 3 Rekening Utama BCA, BRI, BSI + Opsi Tambah Bebas)
    if (Array.isArray(c.gift?.bankAccounts) && c.gift.bankAccounts.length > 0) {
      currentBankAccounts = JSON.parse(JSON.stringify(c.gift.bankAccounts));
    } else {
      currentBankAccounts = JSON.parse(JSON.stringify(DEFAULT_BANK_ACCOUNTS));
    }
    renderAdminBankAccounts();

    // Pengaturan WhatsApp Konfirmasi Kehadiran (RSVP)
    const rsvpData = c.rsvp || {};
    setValue("cfg-rsvp-wa-number", rsvpData.whatsappNumber || "6281234567890");
    setValue("cfg-rsvp-wa-name", rsvpData.contactPersonName || "");
    setCheckbox("cfg-rsvp-auto-wa", rsvpData.autoOpenWhatsApp !== false);
    updateRsvpWaPreview();

    // Musik Pengiring (Multi-Sumber: YouTube, Offline, Online)
    if (c.music) {
      const musicSrcType = c.music.sourceType || (c.music.youtubeUrl ? "youtube" : "local");
      setValue("cfg-music-source-type", musicSrcType);
      setValue("cfg-music-youtube-url", c.music.youtubeUrl || "");
      setValue("cfg-music-url", c.music.filePath || "assets/music/lagu-undangan.mp3");
      setValue("cfg-music-title", c.music.title || "Gending Jawa Instrumental - Lir Ilir Romantis");
      setValue("cfg-music-artist", c.music.artist || "Gamelan Jawa Modern");
      toggleMusicSourceGroup(musicSrcType);
      updateYouTubeBadge(c.music.youtubeUrl || "");
    }

    // Aset Gambar Tema (Halaman Sampul, Kotak Buka Undangan, Dual Gunungan Kayon, Siluet Wayang, Ornamen)
    const ta = c.themeAssets || {};
    setValue("cfg-cover-photo", c.couple?.coverPhoto || "assets/images/cover.jpg");
    setValue("cfg-background-photo", c.couple?.backgroundPhoto || ta.backgroundPhoto || "assets/images/background.jpg");
    setValue("cfg-bg-overlay", ta.backgroundOverlay || "medium");
    setCheckbox("cfg-show-bg-batik", ta.showBackgroundBatik !== false);
    setCheckbox("cfg-show-gunungan-center", ta.showGununganCenter !== false);
    setValue("cfg-gunungan-center-img", ta.gununganCenterImage || ta.gununganLeftImage || ta.gununganImage || "assets/images/gunungan-gold.svg");
    setCheckbox("cfg-show-cover-wayang", ta.showCoverWayang !== false);
    setValue("cfg-cover-wayang-groom-img", ta.coverWayangGroomImage || ta.wayangGroomImage || "assets/images/wayang-arjuna.png");
    setValue("cfg-cover-wayang-bride-img", ta.coverWayangBrideImage || ta.wayangBrideImage || "assets/images/wayang-srikandi.png");

    setValue("cfg-gunungan-left-img", ta.gununganLeftImage || ta.gununganImage || "assets/images/gunungan-gold.svg");
    setValue("cfg-gunungan-right-img", ta.gununganRightImage || "");
    setCheckbox("cfg-gunungan-right-mirror", ta.gununganRightMirror !== false);
    setCheckbox("cfg-show-gunungan", ta.showGunungan !== false);
    setValue("cfg-wayang-groom-img", ta.wayangGroomImage || "assets/images/wayang-arjuna.png");
    setCheckbox("cfg-show-wayang-groom", ta.showWayangGroom !== false);
    setValue("cfg-wayang-bride-img", ta.wayangBrideImage || "assets/images/wayang-srikandi.png");
    setCheckbox("cfg-show-wayang-bride", ta.showWayangBride !== false);
    setValue("cfg-corner-img", ta.cornerOrnamentImage || "assets/images/javanese-corner.svg");
    setCheckbox("cfg-show-corners", ta.showCorners !== false);
    setValue("cfg-favicon-invitation", ta.favicon || "assets/images/favicon.png");
    setValue("cfg-favicon-admin", ta.adminFavicon || "assets/images/favicon-admin.png");
    try {
      if (ta.favicon) localStorage.setItem("wedding_custom_favicon", ta.favicon);
      if (ta.adminFavicon) localStorage.setItem("wedding_admin_favicon", ta.adminFavicon);
    } catch (_) {}

    // Update browser tab favicon for admin page (desktop & mobile)
    updateAdminTabFavicon(ta.adminFavicon || "assets/images/favicon-admin.png");

    // Logo / Gambar Panel Admin di Samping Tulisan PANEL ADMIN
    const adminLogo = ta.adminLogo || c.adminLogo || localStorage.getItem("wedding_admin_logo") || "assets/images/gunungan-gold.svg";
    const adminTitle = ta.adminTitle || c.adminTitle || localStorage.getItem("wedding_admin_title") || "PANEL ADMIN";
    setValue("cfg-admin-logo-img", adminLogo);
    setValue("cfg-admin-brand-title", adminTitle);
    applyAdminLogo(adminLogo, adminTitle);
    try {
      localStorage.setItem("wedding_admin_logo", adminLogo);
      localStorage.setItem("wedding_admin_title", adminTitle);
    } catch (_) {}

    // 6. Perjalanan Cinta (Love Story)
    if (Array.isArray(c.loveStory) && c.loveStory.length > 0) {
      currentLoveStories = JSON.parse(JSON.stringify(c.loveStory));
    } else {
      currentLoveStories = JSON.parse(JSON.stringify(DEFAULT_LOVE_STORIES));
    }
    renderAdminLoveStories();

    // 7. Galeri Foto Pernikahan
    if (Array.isArray(c.gallery) && c.gallery.length > 0) {
      currentGalleryItems = JSON.parse(JSON.stringify(c.gallery));
    } else {
      currentGalleryItems = JSON.parse(JSON.stringify(DEFAULT_GALLERY_ITEMS));
    }
    renderAdminGallery();

    // 8. Footer & Teks Bawah Pol
    const footerData = c.footer || {};
    const groomCallName = c.couple?.groom?.callName || "Sidiq";
    const brideCallName = c.couple?.bride?.callName || "Anisa";
    const defaultCoupleFooter = `${groomCallName} & ${brideCallName}`;
    setValue("cfg-footer-couple-names", footerData.coupleNames || defaultCoupleFooter);
    setValue("cfg-footer-closing-greeting", footerData.closingGreeting || c.quotes?.closingGreeting || "Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu kepada kedua mempelai.");
    setValue("cfg-footer-copyright", footerData.copyright || `© 2026 ${defaultCoupleFooter} Wedding Invitation. Dibuat dengan penuh cinta.`);

    updateThemePreviews();
    updateCouplePreviews();

    // 5b. Animasi Partikel Estetik Latar Belakang (Salju, Sakura, Bintang Emas, Hati, dll)
    const anim = c.animation || {};
    const animEnabled = anim.enabled !== false;
    setCheckbox("cfg-animation-enabled", animEnabled);
    setValue("cfg-animation-effect", anim.effect || "sakura");
    setValue("cfg-animation-intensity", anim.intensity || "medium");
    setValue("cfg-animation-speed", anim.speed || "normal");
    updateAdminAnimationStatusText(animEnabled);
    updateActivePresetAnimButton(anim.effect || "sakura");
    setTimeout(updateAdminAnimationPreview, 120);
  }

  let adminAnimPreviewInstance = null;

  const ANIM_EFFECT_LABELS = {
    sakura: "🌸 Sakura Pink",
    snow: "❄️ Salju Halus",
    sparkles: "✨ Bintang Emas",
    hearts: "💖 Hati Cinta",
    fireflies: "🌟 Kunang-kunang",
    autumn: "🍂 Daun Autumn",
    jasmine: "🌼 Melati Suci"
  };

  function updateAdminAnimationStatusText(enabled) {
    const textEl = document.getElementById("cfg-animation-status-text");
    const wrapperEl = document.getElementById("animation-controls-wrapper");
    if (textEl) {
      textEl.textContent = enabled ? "AKTIF" : "NONAKTIF";
      textEl.style.color = enabled ? "#10b981" : "#94a3b8";
    }
    if (wrapperEl) {
      wrapperEl.style.opacity = enabled ? "1" : "0.55";
    }
  }

  function updateActivePresetAnimButton(effect) {
    const buttons = document.querySelectorAll(".btn-preset-anim");
    buttons.forEach(btn => {
      const match = btn.getAttribute("data-effect") === effect;
      if (match) {
        btn.classList.add("active");
        btn.style.borderColor = "#dfb15b";
        btn.style.background = "#fffdfa";
        btn.style.fontWeight = "700";
      } else {
        btn.classList.remove("active");
        btn.style.borderColor = "var(--admin-border)";
        btn.style.background = "#ffffff";
        btn.style.fontWeight = "400";
      }
    });

    const labelBadge = document.getElementById("preview-anim-name");
    if (labelBadge) {
      labelBadge.textContent = ANIM_EFFECT_LABELS[effect] || effect;
    }
  }

  function updateAdminAnimationPreview() {
    const previewCanvas = document.getElementById("admin-particle-preview-canvas");
    if (!previewCanvas) return;

    if (adminAnimPreviewInstance) {
      adminAnimPreviewInstance.stop();
      adminAnimPreviewInstance = null;
    }

    const enabled = Boolean(document.getElementById("cfg-animation-enabled")?.checked);
    if (!enabled) {
      const pCtx = previewCanvas.getContext("2d");
      if (pCtx) pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      return;
    }

    const effect = document.getElementById("cfg-animation-effect")?.value || "sakura";
    const intensity = document.getElementById("cfg-animation-intensity")?.value || "medium";
    const speed = document.getElementById("cfg-animation-speed")?.value || "normal";

    if (typeof WeddingParticles !== "undefined" && WeddingParticles.createPreview) {
      adminAnimPreviewInstance = WeddingParticles.createPreview(previewCanvas, effect, intensity, speed);
    }
  }

  function setupAnimationControls() {
    const enableCheckbox = document.getElementById("cfg-animation-enabled");
    if (enableCheckbox) {
      enableCheckbox.addEventListener("change", function () {
        updateAdminAnimationStatusText(this.checked);
        updateAdminAnimationPreview();
      });
    }

    const effectSelect = document.getElementById("cfg-animation-effect");
    if (effectSelect) {
      effectSelect.addEventListener("change", function () {
        updateActivePresetAnimButton(this.value);
        updateAdminAnimationPreview();
      });
    }

    const intensitySelect = document.getElementById("cfg-animation-intensity");
    if (intensitySelect) {
      intensitySelect.addEventListener("change", function () {
        updateAdminAnimationPreview();
      });
    }

    const speedSelect = document.getElementById("cfg-animation-speed");
    if (speedSelect) {
      speedSelect.addEventListener("change", function () {
        updateAdminAnimationPreview();
      });
    }

    const presetButtons = document.querySelectorAll(".btn-preset-anim");
    presetButtons.forEach(btn => {
      btn.addEventListener("click", function () {
        const eff = this.getAttribute("data-effect");
        if (eff && effectSelect) {
          effectSelect.value = eff;
          updateActivePresetAnimButton(eff);
          updateAdminAnimationPreview();
        }
      });
    });
  }

  function setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || "";
  }

  function setCheckbox(id, checked) {
    const el = document.getElementById(id);
    if (el) el.checked = Boolean(checked);
  }

  function toggleMusicSourceGroup(type) {
    const groupYt = document.getElementById("group-music-youtube");
    const groupFile = document.getElementById("group-music-file");
    if (groupYt) groupYt.style.display = (type === "youtube") ? "block" : "none";
    if (groupFile) groupFile.style.display = (type === "youtube") ? "none" : "block";
  }

  function updateYouTubeBadge(url) {
    const badge = document.getElementById("cfg-yt-badge");
    if (!badge) return;
    const ytId = extractYouTubeId(url);
    if (ytId) {
      badge.style.display = "inline-block";
      badge.textContent = `✓ Video ID: ${ytId}`;
    } else {
      badge.style.display = "none";
    }
  }

  function updateRsvpWaPreview() {
    const rawNum = document.getElementById("cfg-rsvp-wa-number")?.value || "";
    let clean = rawNum.replace(/[^0-9]/g, "");
    if (clean.startsWith("0")) clean = "62" + clean.slice(1);
    const testBtn = document.getElementById("btn-test-rsvp-wa");
    if (testBtn) {
      testBtn.href = clean ? `https://wa.me/${clean}` : "#";
    }
    const sampleEl = document.getElementById("rsvp-wa-sample-preview");
    if (sampleEl) {
      const groomCall = document.getElementById("cfg-groom-call")?.value || "Sidiq";
      const brideCall = document.getElementById("cfg-bride-call")?.value || "Anisa";
      sampleEl.textContent = `*KONFIRMASI KEHADIRAN UNDANGAN PERNIKAHAN*\nKepada: ${groomCall} & ${brideCall}\n-------------------------------------------\n*Nama:* Budi Santoso\n*Status:* Akan Hadir\n*Jumlah Tamu:* 2 orang\n*Pesan / Doa:* "Selamat menempuh hidup baru!"\n-------------------------------------------\nTersimpan di Sistem Server (ke WA: ${clean || "628..."})`;
    }
  }

  function normalizeMediaUrl(url, type = "image") {
    if (!url || typeof url !== "string") return "";
    url = url.trim();

    // 1. Google Drive direct link converter
    const gDriveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (gDriveMatch && gDriveMatch[1]) {
      const fileId = gDriveMatch[1];
      if (type === "audio") {
        return `https://docs.google.com/uc?export=download&id=${fileId}`;
      }
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }

    // 2. Dropbox share link converter
    if (url.includes("dropbox.com") && url.includes("dl=0")) {
      return url.replace("dl=0", "raw=1");
    }

    // 3. Imgur non-direct link
    if (/https?:\/\/(?:www\.)?imgur\.com\/([a-zA-Z0-9]+)$/.test(url)) {
      const imgurId = url.split("/").pop();
      return `https://i.imgur.com/${imgurId}.jpg`;
    }

    // 4. Pinterest direct image & resolution upscaler
    if (url.includes("i.pinimg.com")) {
      return url.replace(/\/(?:236x|474x|564x)\//, "/736x/");
    }

    return url;
  }

  // Kompresi & optimasi gambar otomatis di sisi browser (kamera HP/laptop)
  function optimizeImage(file, maxDim = 1200, quality = 0.8) {
    return new Promise((resolve) => {
      if (!file) return resolve(null);

      // Batas waktu maksimal 3 detik agar kompresi TIDAK PERNAH menggantung/hang
      let resolved = false;
      let rawResult = null;

      const safeResolve = (val) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(hardTimeout);
          resolve(val || rawResult || null);
        }
      };

      const hardTimeout = setTimeout(() => {
        if (!resolved) {
          console.warn("[optimizeImage] Batas waktu optimasi tercapai (3s), menggunakan fallback DataURL mentah");
          safeResolve(rawResult);
        }
      }, 3000);

      try {
        const r = new FileReader();
        r.onload = (e) => {
          rawResult = e.target.result;

          // Jika format SVG, langsung selesaikan tanpa kompresi canvas
          if (file.type === "image/svg+xml" || (file.name && file.name.toLowerCase().endsWith(".svg"))) {
            return safeResolve(rawResult);
          }

          // Coba kompresi canvas
          try {
            const img = new Image();
            img.onload = () => {
              try {
                let w = img.width;
                let h = img.height;
                if (!w || !h) {
                  return safeResolve(rawResult);
                }
                if (w > maxDim || h > maxDim) {
                  if (w > h) {
                    h = Math.round((h * maxDim) / w);
                    w = maxDim;
                  } else {
                    w = Math.round((w * maxDim) / h);
                    h = maxDim;
                  }
                }
                const canvas = document.createElement("canvas");
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext("2d");
                if (!ctx) return safeResolve(rawResult);

                ctx.drawImage(img, 0, 0, w, h);
                const format = file.type === "image/png" ? "image/png" : "image/jpeg";
                const dataUrl = canvas.toDataURL(format, quality);
                safeResolve(dataUrl || rawResult);
              } catch (canvasErr) {
                console.warn("[optimizeImage] Canvas export failed, fallback to raw data:", canvasErr);
                safeResolve(rawResult);
              }
            };

            img.onerror = (imgErr) => {
              console.warn("[optimizeImage] Image element load error, fallback to raw data:", imgErr);
              safeResolve(rawResult);
            };

            img.src = rawResult;
          } catch (imgErr) {
            console.warn("[optimizeImage] Image creation failed, fallback to raw data:", imgErr);
            safeResolve(rawResult);
          }
        };

        r.onerror = (readErr) => {
          console.warn("[optimizeImage] FileReader error:", readErr);
          safeResolve(null);
        };

        r.readAsDataURL(file);
      } catch (err) {
        console.warn("[optimizeImage] Fatal error in optimizeImage:", err);
        safeResolve(null);
      }
    });
  }

  // Listener real-time input gambar untuk memperbarui preview secara instan & resolusi link Pinterest
  async function handleUrlPasteOrInput(inputEl) {
    if (!inputEl) return;
    const rawVal = inputEl.value.trim();
    if (!rawVal) return;

    // Jika user paste link Pinterest pin.it atau pinterest.com/pin
    if (rawVal.includes("pin.it/") || (rawVal.includes("pinterest.com/pin/") && !rawVal.includes("i.pinimg.com"))) {
      showToast("🔍 Mendeteksi link Pinterest, mengekstrak gambar resolusi tinggi...");
      try {
        if (window.API && window.API.resolveMediaUrl) {
          const res = await window.API.resolveMediaUrl(rawVal);
          if (res && res.success && res.resolvedUrl) {
            inputEl.value = res.resolvedUrl;
            inputEl.dispatchEvent(new Event("input", { bubbles: true }));
            inputEl.dispatchEvent(new Event("change", { bubbles: true }));
            updateThemePreviews();
            updateCouplePreviews();
            if (inputEl.id === "cfg-favicon-admin" || inputEl.id === "cfg-favicon-invitation") {
              updateAdminTabFavicon(res.resolvedUrl);
            }
            showToast("✨ Berhasil mengekstrak gambar Pinterest!");
          }
        }
      } catch (err) {
        console.warn("Gagal resolusi link Pinterest:", err);
      }
    } else if (inputEl.id === "cfg-favicon-admin" || inputEl.id === "cfg-favicon-invitation") {
      updateAdminTabFavicon(rawVal);
    } else if (inputEl.id === "cfg-admin-logo-img") {
      applyAdminLogo(rawVal, document.getElementById("cfg-admin-brand-title")?.value);
    }
  }

  function updateAdminTabFavicon(iconUrl) {
    if (!iconUrl) return;
    const cleanUrl = normalizeMediaUrl(iconUrl, "image");
    if (!cleanUrl) return;

    try {
      localStorage.setItem("wedding_admin_favicon", cleanUrl);
    } catch (_) {}

    const isSvg = cleanUrl.endsWith(".svg") || cleanUrl.startsWith("data:image/svg+xml");
    const isIco = cleanUrl.endsWith(".ico");
    const mimeType = isSvg ? "image/svg+xml" : (isIco ? "image/x-icon" : (cleanUrl.endsWith(".webp") ? "image/webp" : "image/png"));
    const cacheBust = cleanUrl.startsWith("data:") ? cleanUrl : (cleanUrl + (cleanUrl.includes("?") ? "&" : "?") + "v=" + Date.now());

    function setBrowserFavicon(hrefUrl, type = "image/png") {
      document.querySelectorAll("link[rel*='icon'], link[rel='apple-touch-icon']").forEach(el => el.remove());

      const favEl = document.createElement("link");
      favEl.id = "browser-favicon";
      favEl.rel = "icon";
      favEl.type = type;
      favEl.setAttribute("sizes", "64x64");
      favEl.href = hrefUrl;
      document.head.appendChild(favEl);

      const shortcutEl = document.createElement("link");
      shortcutEl.id = "browser-shortcut-icon";
      shortcutEl.rel = "shortcut icon";
      shortcutEl.type = type;
      shortcutEl.href = hrefUrl;
      document.head.appendChild(shortcutEl);

      const appleEl = document.createElement("link");
      appleEl.id = "browser-apple-touch-icon";
      appleEl.rel = "apple-touch-icon";
      appleEl.setAttribute("sizes", "180x180");
      appleEl.href = hrefUrl;
      document.head.appendChild(appleEl);
    }

    // Gunakan rasterisasi HTML5 Canvas untuk menghasilkan Data URL PNG 64x64 instan
    // Google Chrome tab strip memperbarui ikon seketika (0ms) jika diberikan format PNG Data URL
    try {
      const tempImg = new Image();
      tempImg.crossOrigin = "anonymous";
      tempImg.onload = function () {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 64;
          canvas.height = 64;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            // Latar belakang mewah rounded badge agar kontras sempurna di tab Chrome gelap maupun terang
            ctx.clearRect(0, 0, 64, 64);
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(2, 2, 60, 60, 12);
            } else {
              ctx.arc(32, 32, 28, 0, Math.PI * 2);
            }
            ctx.fillStyle = "#1b1713";
            ctx.fill();
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = "#dfb15b";
            ctx.stroke();

            // Gambar ikon di tengah
            const pad = 8;
            ctx.drawImage(tempImg, pad, pad, 64 - pad * 2, 64 - pad * 2);
            const pngDataUrl = canvas.toDataURL("image/png");
            setBrowserFavicon(pngDataUrl, "image/png");
            return;
          }
        } catch (_) {}
        setBrowserFavicon(cacheBust, mimeType);
      };
      tempImg.onerror = function () {
        setBrowserFavicon(cacheBust, mimeType);
      };
      tempImg.src = cacheBust;
    } catch (_) {
      setBrowserFavicon(cacheBust, mimeType);
    }
  }

  function applyAdminLogo(logoUrl, titleText) {
    const finalLogo = (logoUrl && String(logoUrl).trim()) ? String(logoUrl).trim() : "assets/images/gunungan-gold.svg";
    const cleanUrl = normalizeMediaUrl(finalLogo, "image");

    const setLogoSrc = (imgEl) => {
      if (!imgEl) return;
      imgEl.src = cleanUrl;
      imgEl.onerror = function () {
        this.src = "assets/images/gunungan-gold.svg";
      };
    };

    setLogoSrc(document.getElementById("navbar-brand-img"));
    setLogoSrc(document.getElementById("login-brand-img"));
    setLogoSrc(document.getElementById("preview-admin-logo-img"));

    if (titleText !== undefined && titleText !== null && String(titleText).trim()) {
      const finalTitle = String(titleText).trim();
      const brandNameEl = document.getElementById("navbar-brand-name");
      if (brandNameEl) brandNameEl.textContent = finalTitle;
      const mockupTitleEl = document.getElementById("mockup-navbar-brand-name");
      if (mockupTitleEl) mockupTitleEl.textContent = finalTitle;
    }
  }

  function extractYouTubeId(url) {
    if (!url || typeof url !== "string") return "";
    url = url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    return (match && match[1]) ? match[1] : "";
  }

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

  function updateThemePreviews() {
    const setImg = (inputVal, previewId, fallback) => {
      const img = document.getElementById(previewId);
      if (img) {
        let cleanUrl = normalizeMediaUrl((inputVal && inputVal.trim()) ? inputVal.trim() : fallback, "image");
        if (cleanUrl && !cleanUrl.startsWith("data:") && !cleanUrl.includes("?") && cleanUrl.includes("assets/")) {
          cleanUrl += `?v=${Date.now()}`;
        }
        img.src = cleanUrl;
        img.onerror = function() { this.src = fallback; };
      }
    };

    const leftVal = document.getElementById("cfg-gunungan-left-img")?.value;
    const rightVal = document.getElementById("cfg-gunungan-right-img")?.value || leftVal;
    const centerVal = document.getElementById("cfg-gunungan-center-img")?.value || leftVal;
    const coverVal = document.getElementById("cfg-cover-photo")?.value;
    const bgVal = document.getElementById("cfg-background-photo")?.value;
    const coverGroomVal = document.getElementById("cfg-cover-wayang-groom-img")?.value;
    const coverBrideVal = document.getElementById("cfg-cover-wayang-bride-img")?.value;

    setImg(coverVal, "preview-cover-photo", "assets/images/cover.jpg");
    setImg(bgVal, "preview-background-photo", "assets/images/background.jpg");
    setImg(centerVal, "preview-gunungan-center-img", "assets/images/gunungan-gold.svg");
    setImg(coverGroomVal, "preview-cover-wayang-groom-img", "assets/images/wayang-arjuna.png");
    setImg(coverBrideVal, "preview-cover-wayang-bride-img", "assets/images/wayang-srikandi.png");

    setImg(leftVal, "preview-gunungan-left-img", "assets/images/gunungan-gold.svg");
    setImg(rightVal, "preview-gunungan-right-img", "assets/images/gunungan-gold.svg");
    setImg(document.getElementById("cfg-wayang-groom-img")?.value, "preview-wayang-groom-img", "assets/images/wayang-arjuna.png");
    setImg(document.getElementById("cfg-wayang-bride-img")?.value, "preview-wayang-bride-img", "assets/images/wayang-srikandi.png");
    setImg(document.getElementById("cfg-corner-img")?.value, "preview-corner-img", "assets/images/javanese-corner.svg");
    setImg(document.getElementById("cfg-favicon-invitation")?.value, "preview-favicon-invitation", "assets/images/favicon.png");
    setImg(document.getElementById("cfg-favicon-invitation")?.value, "preview-favicon-invitation-mobile", "assets/images/favicon.png");
    setImg(document.getElementById("cfg-favicon-admin")?.value, "preview-favicon-admin", "assets/images/favicon-admin.png");
    setImg(document.getElementById("cfg-favicon-admin")?.value, "preview-favicon-admin-mobile", "assets/images/favicon-admin.png");
    const adminLogoVal = document.getElementById("cfg-admin-logo-img")?.value;
    const adminTitleVal = document.getElementById("cfg-admin-brand-title")?.value;
    setImg(adminLogoVal, "preview-admin-logo-img", "assets/images/gunungan-gold.svg");
    applyAdminLogo(adminLogoVal, adminTitleVal);
    updateCouplePreviews();
  }

  function updateCouplePreviews() {
    const setImg = (inputVal, previewId, fallback) => {
      const img = document.getElementById(previewId);
      if (img) {
        let cleanUrl = normalizeMediaUrl((inputVal && inputVal.trim()) ? inputVal.trim() : fallback, "image");
        if (cleanUrl && !cleanUrl.startsWith("data:") && !cleanUrl.includes("?") && cleanUrl.includes("assets/")) {
          cleanUrl += `?v=${Date.now()}`;
        }
        img.src = cleanUrl;
        img.onerror = function() { this.src = fallback; };
      }
    };
    setImg(document.getElementById("cfg-groom-photo")?.value, "preview-groom-photo", "assets/images/couple-1.jpg");
    setImg(document.getElementById("cfg-bride-photo")?.value, "preview-bride-photo", "assets/images/couple-2.jpg");
  }

  async function saveCurrentSettings(options = {}) {
    if (!currentSettings) currentSettings = {};

    // Salin struktur dan perbarui dengan nilai dari input form
    const updated = JSON.parse(JSON.stringify(currentSettings));

    updated.couple = updated.couple || {};
    updated.couple.groom = updated.couple.groom || {};
    updated.couple.bride = updated.couple.bride || {};
    updated.events = updated.events || {};
    updated.events.akad = updated.events.akad || {};
    updated.events.resepsi = updated.events.resepsi || {};
    updated.gift = updated.gift || {};
    updated.gift.bankAccounts = updated.gift.bankAccounts || [{}, {}];

    const getVal = (id, fallback = "") => {
      const el = document.getElementById(id);
      return el ? el.value.trim() : fallback;
    };

    // Update Groom
    updated.couple.groom.callName = getVal("cfg-groom-call", updated.couple.groom.callName || "Sidiq");
    updated.couple.groom.fullName = getVal("cfg-groom-full", updated.couple.groom.fullName || "");
    updated.couple.groom.fatherName = getVal("cfg-groom-father", updated.couple.groom.fatherName || "");
    updated.couple.groom.motherName = getVal("cfg-groom-mother", updated.couple.groom.motherName || "");
    updated.couple.groom.childOrder = getVal("cfg-groom-order", updated.couple.groom.childOrder || "");
    updated.couple.groom.instagram = getVal("cfg-groom-ig", updated.couple.groom.instagram || "");
    updated.couple.groom.photo = getVal("cfg-groom-photo", updated.couple.groom.photo || "assets/images/couple-1.jpg");

    // Update Bride
    updated.couple.bride.callName = getVal("cfg-bride-call", updated.couple.bride.callName || "Anisa");
    updated.couple.bride.fullName = getVal("cfg-bride-full", updated.couple.bride.fullName || "");
    updated.couple.bride.fatherName = getVal("cfg-bride-father", updated.couple.bride.fatherName || "");
    updated.couple.bride.motherName = getVal("cfg-bride-mother", updated.couple.bride.motherName || "");
    updated.couple.bride.childOrder = getVal("cfg-bride-order", updated.couple.bride.childOrder || "");
    updated.couple.bride.instagram = getVal("cfg-bride-ig", updated.couple.bride.instagram || "");
    updated.couple.bride.photo = getVal("cfg-bride-photo", updated.couple.bride.photo || "assets/images/couple-2.jpg");

    // Update Cover Photo Halaman Pembuka & Background Isi Undangan
    updated.couple.coverPhoto = getVal("cfg-cover-photo", updated.couple.coverPhoto || "assets/images/cover.jpg");
    updated.couple.backgroundPhoto = getVal("cfg-background-photo", updated.couple.backgroundPhoto || "assets/images/background.jpg");

    // Update Akad
    updated.events.akad.dateFormatted = getVal("cfg-akad-date", updated.events.akad.dateFormatted || "");
    updated.events.akad.timeFormatted = getVal("cfg-akad-time", updated.events.akad.timeFormatted || "");
    updated.events.akad.venueName = getVal("cfg-akad-venue", updated.events.akad.venueName || "");
    updated.events.akad.venueAddress = getVal("cfg-akad-address", updated.events.akad.venueAddress || "");
    updated.events.akad.googleMapsUrl = getVal("cfg-akad-maps", updated.events.akad.googleMapsUrl || "");

    // Update Resepsi
    updated.events.resepsi.dateFormatted = getVal("cfg-resepsi-date", updated.events.resepsi.dateFormatted || "");
    updated.events.resepsi.timeFormatted = getVal("cfg-resepsi-time", updated.events.resepsi.timeFormatted || "");
    updated.events.resepsi.venueName = getVal("cfg-resepsi-venue", updated.events.resepsi.venueName || "");
    updated.events.resepsi.venueAddress = getVal("cfg-resepsi-address", updated.events.resepsi.venueAddress || "");
    updated.events.resepsi.googleMapsUrl = getVal("cfg-resepsi-maps", updated.events.resepsi.googleMapsUrl || "");

    // Update Unduh Mantu
    updated.events.unduhMantu = {
      enable: Boolean(document.getElementById("cfg-unduh-enable")?.checked),
      title: getVal("cfg-unduh-title", "Acara Unduh Mantu"),
      dateFormatted: getVal("cfg-unduh-date", ""),
      timeFormatted: getVal("cfg-unduh-time", ""),
      venueName: getVal("cfg-unduh-venue", ""),
      venueAddress: getVal("cfg-unduh-address", ""),
      googleMapsUrl: getVal("cfg-unduh-maps", ""),
      iconClass: "fa-home-user"
    };

    // Update Target Waktu Hitung Mundur (Countdown)
    let targetCountdownIso = getVal("cfg-countdown-target", "");
    if (targetCountdownIso) {
      if (targetCountdownIso.length === 16) {
        targetCountdownIso += ":00";
      }
    } else {
      targetCountdownIso = parseIndoDateToIso(
        document.getElementById("cfg-akad-date")?.value,
        document.getElementById("cfg-akad-time")?.value
      ) || "2026-11-21T08:00:00";
    }

    updated.countdown = {
      targetDate: targetCountdownIso,
      eventPassedMessage: getVal("cfg-countdown-passed-msg", "Alhamdulillah, rangkaian acara pernikahan telah selesai diselenggarakan dengan penuh kebahagiaan. Terima kasih banyak atas kehadiran dan doa restu Anda!")
    };

    // Update Bank Kado Digital Dinamis
    syncBankAccountsFromInputs();
    if (!updated.gift) updated.gift = {};
    updated.gift.bankAccounts = currentBankAccounts;

    // Update RSVP WhatsApp
    let cleanRsvpWa = getVal("cfg-rsvp-wa-number", "6281234567890").replace(/[^0-9]/g, "");
    if (cleanRsvpWa.startsWith("0")) cleanRsvpWa = "62" + cleanRsvpWa.slice(1);
    updated.rsvp = {
      whatsappNumber: cleanRsvpWa || "6281234567890",
      contactPersonName: getVal("cfg-rsvp-wa-name", ""),
      autoOpenWhatsApp: Boolean(document.getElementById("cfg-rsvp-auto-wa")?.checked)
    };

    // Update Musik Pengiring (Multi-Sumber: YouTube, Offline, Online)
    const musicSourceType = getVal("cfg-music-source-type", "local");
    const ytUrl = getVal("cfg-music-youtube-url", "");
    const ytId = extractYouTubeId(ytUrl);
    const localUrl = getVal("cfg-music-url", "assets/music/lagu-undangan.mp3");

    updated.music = {
      sourceType: musicSourceType,
      youtubeUrl: ytUrl,
      youtubeId: ytId,
      filePath: localUrl,
      title: getVal("cfg-music-title", "Romantic Wedding Music"),
      artist: getVal("cfg-music-artist", ""),
      autoplayAfterOpen: true
    };

    // Update Aset Gambar Tema (Dual Kayon Gunungan Kiri/Kanan, Sampul, Wayang, Ornamen)
    const leftGunungan = getVal("cfg-gunungan-left-img", "assets/images/gunungan-gold.svg");
    const rightGunungan = getVal("cfg-gunungan-right-img", "");
    const centerGunungan = getVal("cfg-gunungan-center-img", leftGunungan);

    updated.themeAssets = {
      showGunungan: Boolean(document.getElementById("cfg-show-gunungan")?.checked),
      gununganImage: leftGunungan,
      gununganLeftImage: leftGunungan,
      gununganRightImage: rightGunungan,
      gununganRightMirror: Boolean(document.getElementById("cfg-gunungan-right-mirror")?.checked),
      showGununganCenter: Boolean(document.getElementById("cfg-show-gunungan-center")?.checked),
      gununganCenterImage: centerGunungan,
      showCoverWayang: Boolean(document.getElementById("cfg-show-cover-wayang")?.checked),
      coverWayangGroomImage: getVal("cfg-cover-wayang-groom-img", "assets/images/wayang-arjuna.png"),
      coverWayangBrideImage: getVal("cfg-cover-wayang-bride-img", "assets/images/wayang-srikandi.png"),
      wayangGroomImage: getVal("cfg-wayang-groom-img", "assets/images/wayang-arjuna.png"),
      showWayangGroom: Boolean(document.getElementById("cfg-show-wayang-groom")?.checked),
      wayangBrideImage: getVal("cfg-wayang-bride-img", "assets/images/wayang-srikandi.png"),
      showWayangBride: Boolean(document.getElementById("cfg-show-wayang-bride")?.checked),
      cornerOrnamentImage: getVal("cfg-corner-img", "assets/images/javanese-corner.svg"),
      showCorners: Boolean(document.getElementById("cfg-show-corners")?.checked),
      favicon: getVal("cfg-favicon-invitation", "assets/images/favicon.png"),
      adminFavicon: getVal("cfg-favicon-admin", "assets/images/favicon-admin.png"),
      adminLogo: getVal("cfg-admin-logo-img", "assets/images/gunungan-gold.svg"),
      adminTitle: getVal("cfg-admin-brand-title", "PANEL ADMIN"),
      backgroundPhoto: getVal("cfg-background-photo", "assets/images/background.jpg"),
      backgroundOverlay: getVal("cfg-bg-overlay", "medium"),
      showBackgroundBatik: Boolean(document.getElementById("cfg-show-bg-batik")?.checked)
    };
    updated.adminLogo = updated.themeAssets.adminLogo;
    updated.adminTitle = updated.themeAssets.adminTitle;
    updated.favicon = updated.themeAssets.favicon;
    updated.adminFavicon = updated.themeAssets.adminFavicon;

    try {
      localStorage.setItem("wedding_admin_logo", updated.adminLogo);
      localStorage.setItem("wedding_admin_title", updated.adminTitle);
      localStorage.setItem("wedding_custom_favicon", updated.themeAssets.favicon);
      localStorage.setItem("wedding_admin_favicon", updated.themeAssets.adminFavicon);
    } catch (_) {}
    applyAdminLogo(updated.adminLogo, updated.adminTitle);

    // Update Love Story & Gallery
    syncLoveStoryFromInputs();
    syncGalleryFromInputs();
    updated.loveStory = currentLoveStories;
    updated.gallery = currentGalleryItems;

    // Update Efek Animasi Partikel Latar Belakang (Salju, Sakura, Bintang Emas, Hati, dll)
    updated.animation = {
      enabled: Boolean(document.getElementById("cfg-animation-enabled")?.checked),
      effect: getVal("cfg-animation-effect", "sakura"),
      intensity: getVal("cfg-animation-intensity", "medium"),
      speed: getVal("cfg-animation-speed", "normal")
    };

    // Update Footer (Bawah Pol)
    const groomCallVal = getVal("cfg-groom-call", "Sidiq");
    const brideCallVal = getVal("cfg-bride-call", "Anisa");
    const fallbackCouple = `${groomCallVal} & ${brideCallVal}`;
    updated.weddingTitle = `The Wedding of ${fallbackCouple} - Undangan Pernikahan Digital`;

    updated.footer = {
      coupleNames: getVal("cfg-footer-couple-names", fallbackCouple),
      closingGreeting: getVal("cfg-footer-closing-greeting", "Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu kepada kedua mempelai."),
      copyright: getVal("cfg-footer-copyright", `© 2026 ${fallbackCouple} Wedding Invitation. Dibuat dengan penuh cinta.`)
    };
    if (updated.quotes) {
      updated.quotes.closingGreeting = updated.footer.closingGreeting;
    }

    try {
      const res = await window.API.updateInvitationConfig(updated);
      if (res && res.success) {
        currentSettings = res.data;
        if (Array.isArray(res.data.loveStory)) {
          currentLoveStories = JSON.parse(JSON.stringify(res.data.loveStory));
          renderAdminLoveStories();
        }
        if (Array.isArray(res.data.gallery)) {
          currentGalleryItems = JSON.parse(JSON.stringify(res.data.gallery));
          renderAdminGallery();
        }
        if (Array.isArray(res.data.gift?.bankAccounts)) {
          currentBankAccounts = JSON.parse(JSON.stringify(res.data.gift.bankAccounts));
          renderAdminBankAccounts();
        }
        if (updated.themeAssets?.adminFavicon) {
          updateAdminTabFavicon(updated.themeAssets.adminFavicon);
        } else if (updated.themeAssets?.favicon) {
          updateAdminTabFavicon(updated.themeAssets.favicon);
        }
        if (res.data?.animation) {
          updateAdminAnimationStatusText(res.data.animation.enabled !== false);
          updateActivePresetAnimButton(res.data.animation.effect || "sakura");
          updateAdminAnimationPreview();
        }
        showToast(options.toastMsg || "Data kustomisasi undangan berhasil disimpan ke server!");
        return true;
      } else {
        if (!options.silent) {
          alert("Gagal menyimpan perubahan: " + (res.message || ""));
        }
        return false;
      }
    } catch (err) {
      if (!options.silent) {
        alert("Error server saat menyimpan konfigurasi: " + err.message);
      }
      return false;
    }
  }

  function initSettingsForm() {
    const form = document.getElementById("settings-form");
    const topSaveBtn = document.getElementById("btn-save-settings");

    const handleSave = async (e) => {
      if (e) e.preventDefault();
      await saveCurrentSettings();
    };

    if (form) form.addEventListener("submit", handleSave);
    if (topSaveBtn) topSaveBtn.addEventListener("click", handleSave);

    // Handler Ganti Tipe Sumber Musik (YouTube / Offline / Online)
    const musicSourceSelect = document.getElementById("cfg-music-source-type");
    if (musicSourceSelect) {
      musicSourceSelect.addEventListener("change", function () {
        toggleMusicSourceGroup(this.value);
      });
    }

    // Handler Auto-detect YouTube URL
    const ytInput = document.getElementById("cfg-music-youtube-url");
    if (ytInput) {
      ytInput.addEventListener("input", function () {
        updateYouTubeBadge(this.value);
      });
    }

    // Auto-detect jika user paste YouTube ke kolom file biasa
    const fileInput = document.getElementById("cfg-music-url");
    if (fileInput) {
      fileInput.addEventListener("input", function () {
        const ytId = extractYouTubeId(this.value);
        if (ytId && musicSourceSelect) {
          musicSourceSelect.value = "youtube";
          toggleMusicSourceGroup("youtube");
          if (ytInput) {
            ytInput.value = this.value;
            updateYouTubeBadge(this.value);
          }
          showToast("Link YouTube terdeteksi! Beralih ke mode YouTube.");
        }
      });
    }

    // Handler Preset Musik
    const musicPresetSelect = document.getElementById("cfg-music-preset");
    if (musicPresetSelect) {
      musicPresetSelect.addEventListener("change", function () {
        const selected = this.options[this.selectedIndex];
        if (selected && selected.value && selected.value !== "custom") {
          setValue("cfg-music-url", selected.value);
          setValue("cfg-music-title", selected.getAttribute("data-title") || "");
          setValue("cfg-music-artist", selected.getAttribute("data-artist") || "");
          showToast(`Preset musik dipilih: ${selected.getAttribute("data-title")}`);
        }
      });
    }

    // Handler Preview & Validasi Nomor WhatsApp RSVP
    const rsvpWaInput = document.getElementById("cfg-rsvp-wa-number");
    if (rsvpWaInput) {
      rsvpWaInput.addEventListener("input", updateRsvpWaPreview);
    }
    const rsvpWaNameInput = document.getElementById("cfg-rsvp-wa-name");
    if (rsvpWaNameInput) {
      rsvpWaNameInput.addEventListener("input", updateRsvpWaPreview);
    }

    // Handler Upload File Musik MP3 dari Laptop / HP
    const uploadInput = document.getElementById("cfg-music-upload-input");
    const uploadBtn = document.getElementById("btn-upload-music-file");
    const uploadStatus = document.getElementById("music-upload-status");

    if (uploadBtn && uploadInput) {
      uploadBtn.addEventListener("click", function () {
        const file = uploadInput.files && uploadInput.files[0];
        if (!file) {
          alert("Pilih file audio (.mp3, .m4a, .wav) dari komputer atau HP terlebih dahulu!");
          return;
        }

        if (file.size > 25 * 1024 * 1024) {
          alert("Ukuran file terlalu besar! Maksimal 25MB.");
          return;
        }

        if (uploadStatus) {
          uploadStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sedang mengunggah musik ke server...';
        }
        uploadBtn.disabled = true;

        const reader = new FileReader();
        reader.onload = async function (e) {
          try {
            const res = await API.uploadMusic({
              filename: file.name,
              fileData: e.target.result
            });

            if (res && res.success) {
              setValue("cfg-music-source-type", "local");
              toggleMusicSourceGroup("local");
              setValue("cfg-music-url", res.filePath);

              // Auto-fill title jika masih kosong atau default
              const cleanTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
              const curTitle = document.getElementById("cfg-music-title")?.value || "";
              if (!curTitle || curTitle === "Romantic Wedding Music" || curTitle === "rock" || curTitle === "Gending Jawa Instrumental - Lir Ilir Romantis") {
                setValue("cfg-music-title", cleanTitle);
              }

              if (uploadStatus) {
                uploadStatus.innerHTML = `<span style="color: #2e7d32;"><i class="fas fa-check-circle"></i> Berhasil diunggah: <strong>${res.filename}</strong></span>`;
              }
              showToast(`Lagu "${res.filename}" berhasil diunggah! Klik "Simpan Seluruh Perubahan" di atas.`);
            } else {
              if (uploadStatus) uploadStatus.textContent = `Gagal: ${res?.message || 'Error server'}`;
              alert(`Gagal mengunggah file musik: ${res?.message || 'Terjadi kesalahan'}`);
            }
          } catch (err) {
            if (uploadStatus) uploadStatus.textContent = `Gagal: ${err.message}`;
            alert(`Error koneksi saat mengunggah musik: ${err.message}`);
          } finally {
            uploadBtn.disabled = false;
          }
        };
        reader.readAsDataURL(file);
      });
    }

    // Handler Uji Putar Audio di Admin (Mendukung YouTube & Audio Offline/Online)
    let testAudio = null;
    let isTestPlaying = false;
    const testBtn = document.getElementById("btn-test-music-play");
    const testIcon = document.getElementById("test-music-icon");
    const testText = document.getElementById("test-music-text");
    const ytPreviewContainer = document.getElementById("admin-yt-preview-container");

    if (testBtn) {
      testBtn.addEventListener("click", function () {
        const sourceType = document.getElementById("cfg-music-source-type")?.value || "local";
        const ytUrl = (document.getElementById("cfg-music-youtube-url")?.value || "").trim();
        const ytId = extractYouTubeId(ytUrl);
        const musicUrl = (document.getElementById("cfg-music-url")?.value || "").trim();

        if (isTestPlaying) {
          stopTesting();
          return;
        }

        if (sourceType === "youtube" || ytId) {
          if (!ytId) {
            alert("Masukkan link share YouTube yang valid terlebih dahulu!");
            return;
          }
          // Tampilkan preview YouTube embed
          if (ytPreviewContainer) {
            ytPreviewContainer.style.display = "block";
            ytPreviewContainer.innerHTML = `
              <div style="background: #111; border-radius: 8px; overflow: hidden; padding: 6px; margin-top: 8px; border: 1px solid #333;">
                <iframe width="100%" height="180" src="https://www.youtube.com/embed/${ytId}?autoplay=1&enablejsapi=1" 
                  title="Preview Musik YouTube" frameborder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen
                  style="border-radius: 6px; display: block;">
                </iframe>
                <div style="font-size: 0.75rem; color: #ddd; padding: 8px 6px; line-height: 1.4;">
                  ⚠️ <strong>Info Preview YouTube:</strong> Jika muncul tulisan <em>"Video unavailable"</em> atau <em>"Playback on other websites has been disabled by the video owner"</em>, video tersebut dilarang oleh pemiliknya untuk diputar di situs eksternal. Silakan ganti link YouTube cover/lirik lain atau gunakan <strong>Unggah File MP3 Sendiri</strong>!
                </div>
              </div>`;
          }
          isTestPlaying = true;
          if (testIcon) testIcon.className = "fas fa-stop";
          if (testText) testText.textContent = "Hentikan Preview YouTube";
          testBtn.style.background = "#dc2626";
          showToast("Memutar preview video YouTube...");
        } else {
          if (!musicUrl) {
            alert("Masukkan URL atau file path musik terlebih dahulu!");
            return;
          }

          const cleanAudioUrl = normalizeMediaUrl(musicUrl, "audio");
          if (!testAudio || testAudio.src !== cleanAudioUrl) {
            if (testAudio) testAudio.pause();
            testAudio = new Audio(cleanAudioUrl);
            testAudio.addEventListener("ended", stopTesting);
          }

          testAudio.play().then(() => {
            isTestPlaying = true;
            if (testIcon) testIcon.className = "fas fa-pause";
            if (testText) testText.textContent = "Jeda Musik";
            testBtn.style.background = "#dc2626";
          }).catch(err => {
            alert("Gagal memutar audio preview: " + err.message);
          });
        }

        function stopTesting() {
          if (testAudio) testAudio.pause();
          if (ytPreviewContainer) {
            ytPreviewContainer.innerHTML = "";
            ytPreviewContainer.style.display = "none";
          }
          isTestPlaying = false;
          if (testIcon) testIcon.className = "fas fa-play";
          if (testText) testText.textContent = "Uji Putar Musik";
          testBtn.style.background = "#25D366";
        }
      });
    }

    // Auto-sync Target Countdown saat Hari & Tanggal Akad / Waktu diubah
    const akadDateEl = document.getElementById("cfg-akad-date");
    const akadTimeEl = document.getElementById("cfg-akad-time");
    const cdTargetEl = document.getElementById("cfg-countdown-target");

    function autoSyncCountdownFromAkad() {
      if (!akadDateEl || !cdTargetEl) return;
      const parsed = parseIndoDateToIso(akadDateEl.value, akadTimeEl?.value);
      if (parsed) {
        const match = parsed.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
        if (match) {
          cdTargetEl.value = match[1];
        }
      }
    }

    if (akadDateEl) {
      akadDateEl.addEventListener("input", autoSyncCountdownFromAkad);
      akadDateEl.addEventListener("change", autoSyncCountdownFromAkad);
    }
    if (akadTimeEl) {
      akadTimeEl.addEventListener("input", autoSyncCountdownFromAkad);
      akadTimeEl.addEventListener("change", autoSyncCountdownFromAkad);
    }

    // Handler Preset Tema Visual (Gunungan & Wayang)
    const themePresetSelect = document.getElementById("cfg-theme-preset");
    if (themePresetSelect) {
      themePresetSelect.addEventListener("change", function () {
        const val = this.value;
        if (val === "wayang-gold") {
          setValue("cfg-gunungan-left-img", "assets/images/gunungan-gold.svg");
          setValue("cfg-gunungan-right-img", "");
          setCheckbox("cfg-gunungan-right-mirror", true);
          setValue("cfg-gunungan-center-img", "assets/images/gunungan-gold.svg");
          setCheckbox("cfg-show-gunungan-center", true);
          setCheckbox("cfg-show-gunungan", true);
          setValue("cfg-wayang-groom-img", "assets/images/wayang-arjuna.png");
          setCheckbox("cfg-show-wayang-groom", true);
          setValue("cfg-wayang-bride-img", "assets/images/wayang-srikandi.png");
          setCheckbox("cfg-show-wayang-bride", true);
          setValue("cfg-cover-wayang-groom-img", "assets/images/wayang-arjuna.png");
          setValue("cfg-cover-wayang-bride-img", "assets/images/wayang-srikandi.png");
          setCheckbox("cfg-show-cover-wayang", true);
          setValue("cfg-corner-img", "assets/images/javanese-corner.svg");
          setCheckbox("cfg-show-corners", true);
          updateThemePreviews();
          showToast("Preset 'Adat Jawa Wayang Emas' dipilih!");
        } else if (val === "minimalist") {
          setCheckbox("cfg-show-gunungan", false);
          setCheckbox("cfg-show-gunungan-center", false);
          setCheckbox("cfg-show-wayang-groom", false);
          setCheckbox("cfg-show-wayang-bride", false);
          setCheckbox("cfg-show-cover-wayang", false);
          setCheckbox("cfg-show-corners", false);
          showToast("Preset 'Modern Minimalis' dipilih (Gunungan & Wayang dinonaktifkan).");
        } else if (val === "custom") {
          showToast("Mode kustom aktif: Silakan masukkan URL Pinterest/Web/Lokal Anda sendiri.");
          document.getElementById("cfg-gunungan-left-img")?.focus();
        }
      });
    }

    [
      "cfg-cover-photo",
      "cfg-background-photo",
      "cfg-gunungan-center-img",
      "cfg-cover-wayang-groom-img",
      "cfg-cover-wayang-bride-img",
      "cfg-groom-photo",
      "cfg-bride-photo",
      "cfg-gunungan-left-img",
      "cfg-gunungan-right-img",
      "cfg-wayang-groom-img",
      "cfg-wayang-bride-img",
      "cfg-corner-img",
      "cfg-favicon-invitation",
      "cfg-favicon-admin",
      "cfg-admin-logo-img"
    ].forEach(inputId => {
      const el = document.getElementById(inputId);
      if (el) {
        el.addEventListener("input", () => {
          updateThemePreviews();
          updateCouplePreviews();
          if (inputId === "cfg-favicon-admin" || inputId === "cfg-favicon-invitation") {
            updateAdminTabFavicon(el.value);
            try {
              if (inputId === "cfg-favicon-admin") localStorage.setItem("wedding_admin_favicon", el.value);
              if (inputId === "cfg-favicon-invitation") localStorage.setItem("wedding_custom_favicon", el.value);
            } catch (_) {}
          }
          if (inputId === "cfg-admin-logo-img") applyAdminLogo(el.value, document.getElementById("cfg-admin-brand-title")?.value);
        });
        el.addEventListener("change", () => {
          handleUrlPasteOrInput(el);
          saveCurrentSettings({ toastMsg: "Pengaturan gambar diperbarui & langsung diterapkan!" });
        });
        el.addEventListener("paste", () => setTimeout(() => {
          handleUrlPasteOrInput(el);
          saveCurrentSettings({ toastMsg: "Pengaturan gambar diperbarui & langsung diterapkan!" });
        }, 150));
      }
    });

    document.getElementById("cfg-bg-overlay")?.addEventListener("change", function () {
      updateThemePreviews();
      saveCurrentSettings({ toastMsg: "Lapisan gelap background diperbarui & diterapkan!" });
    });
    document.getElementById("cfg-show-bg-batik")?.addEventListener("change", function () {
      updateThemePreviews();
      saveCurrentSettings({ toastMsg: "Tampilan motif batik latar diperbarui & diterapkan!" });
    });

    // Helper Universal Upload Gambar via API dengan Fallback Otomatis
    function setupFileUpload(btnId, fileInputId, textInputId, defaultPrefix, toastLabel) {
      const btn = document.getElementById(btnId);
      const fileInput = document.getElementById(fileInputId);
      if (btn && fileInput) {
        btn.addEventListener("click", () => {
          fileInput.value = "";
          fileInput.click();
        });
        fileInput.addEventListener("change", async function () {
          try {
            const file = this.files && this.files[0];
            if (!file) return;

            showToast(`Memproses ${toastLabel || "foto"}...`);
            const optimizedData = await optimizeImage(file);
            if (!optimizedData) {
              showToast("Gagal membaca file gambar!");
              return;
            }

            const inputEl = document.getElementById(textInputId);
            if (inputEl) {
              inputEl.value = optimizedData;
              inputEl.dispatchEvent(new Event("input", { bubbles: true }));
              inputEl.dispatchEvent(new Event("change", { bubbles: true }));
            }
            updateThemePreviews();
            updateCouplePreviews();
            if (textInputId === "cfg-favicon-admin" || textInputId === "cfg-favicon-invitation") updateAdminTabFavicon(optimizedData);

            // Coba simpan ke server backend jika backend online (misal localhost)
            try {
              const ext = file.type === "image/png" ? "png" : (file.name.split(".").pop() || "jpg");
              const filename = `${defaultPrefix}-${Date.now()}.${ext}`;
              const res = await window.API.uploadImage({
                filename: filename,
                fileData: optimizedData
              });
              if (res && res.success && res.filePath) {
                if (inputEl) {
                  inputEl.value = res.filePath;
                  inputEl.dispatchEvent(new Event("input", { bubbles: true }));
                  inputEl.dispatchEvent(new Event("change", { bubbles: true }));
                }
                updateThemePreviews();
                updateCouplePreviews();
                if (textInputId === "cfg-favicon-admin" || textInputId === "cfg-favicon-invitation") {
                  updateAdminTabFavicon(res.filePath);
                  try {
                    if (textInputId === "cfg-favicon-admin") localStorage.setItem("wedding_admin_favicon", res.filePath);
                    if (textInputId === "cfg-favicon-invitation") localStorage.setItem("wedding_custom_favicon", res.filePath);
                  } catch (_) {}
                }
                if (textInputId === "cfg-admin-logo-img") applyAdminLogo(res.filePath, document.getElementById("cfg-admin-brand-title")?.value);
                await saveCurrentSettings({ toastMsg: `✅ ${toastLabel || "Foto"} berhasil disimpan & LANGSUNG DITERAPKAN ke website!` });
                return;
              }
            } catch (uploadErr) {
              console.warn("[Upload] Backend offline, menggunakan mode penyimpanan lokal DataURL:", uploadErr.message);
            }

            if (window.location.hostname.includes("github.io")) {
              await saveCurrentSettings({ toastMsg: `✨ ${toastLabel || "Foto"} terpasang di pratinjau. Untuk permanen, taruh berkas di folder assets/images/` });
            } else {
              await saveCurrentSettings({ toastMsg: `✨ ${toastLabel || "Foto"} berhasil dipasang & LANGSUNG DITERAPKAN ke website!` });
            }
          } catch (err) {
            console.error(`[Upload ${toastLabel}] Error:`, err);
            showToast(`Gagal memproses ${toastLabel || "foto"}: ${err.message || err}`);
          }
        });
      }
    }

    // Wiring Tombol Upload Seluruh Gambar Halaman Sampul & Kotak Buka Undangan
    setupFileUpload("btn-upload-cover-photo", "file-cover-photo", "cfg-cover-photo", "cover", "Foto background sampul");
    setupFileUpload("btn-upload-background-photo", "file-background-photo", "cfg-background-photo", "background", "Foto background isi undangan");
    setupFileUpload("btn-upload-gunungan-center", "file-gunungan-center", "cfg-gunungan-center-img", "gunungan-center", "Lambang puncak kotak sampul");
    setupFileUpload("btn-upload-cover-wayang-groom", "file-cover-wayang-groom", "cfg-cover-wayang-groom-img", "cover-groom", "Figur pria kotak sampul");
    setupFileUpload("btn-upload-cover-wayang-bride", "file-cover-wayang-bride", "cfg-cover-wayang-bride-img", "cover-bride", "Figur wanita kotak sampul");

    // Wiring Tombol Upload Tirai Gunungan & Siluet Profil Mempelai
    setupFileUpload("btn-upload-gunungan-left", "file-gunungan-left", "cfg-gunungan-left-img", "gunungan-left", "Kayon gunungan kiri");
    setupFileUpload("btn-upload-gunungan-right", "file-gunungan-right", "cfg-gunungan-right-img", "gunungan-right", "Kayon gunungan kanan");
    setupFileUpload("btn-upload-wayang-groom", "file-wayang-groom", "cfg-wayang-groom-img", "wayang-groom", "Siluet wayang pria");
    setupFileUpload("btn-upload-wayang-bride", "file-wayang-bride", "cfg-wayang-bride-img", "wayang-bride", "Siluet wayang wanita");
    setupFileUpload("btn-upload-corner", "file-corner", "cfg-corner-img", "corner", "Ornamen sudut");

    // Wiring Tombol Upload Foto Mempelai Lingkaran
    setupFileUpload("btn-upload-groom-photo", "file-groom-photo", "cfg-groom-photo", "couple-1", "Foto mempelai pria");
    setupFileUpload("btn-upload-bride-photo", "file-bride-photo", "cfg-bride-photo", "couple-2", "Foto mempelai wanita");

    // Wiring Tombol Upload Favicon Ikon Tab
    setupFileUpload("btn-upload-fav-invitation", "file-fav-invitation", "cfg-favicon-invitation", "favicon", "Ikon tab undangan");
    setupFileUpload("btn-upload-fav-admin", "file-fav-admin", "cfg-favicon-admin", "favicon-admin", "Ikon tab admin");

    // Wiring Tombol Upload Logo Panel Admin (Samping Tulisan PANEL ADMIN)
    setupFileUpload("btn-upload-admin-logo", "file-admin-logo", "cfg-admin-logo-img", "admin-logo", "Logo Panel Admin");

    // Listener Perubahan Teks Judul Dasbor (Real-time)
    document.getElementById("cfg-admin-brand-title")?.addEventListener("input", function () {
      const val = this.value.trim() || "PANEL ADMIN";
      const brandNameEl = document.getElementById("navbar-brand-name");
      if (brandNameEl) brandNameEl.textContent = val;
      const mockupTitleEl = document.getElementById("mockup-navbar-brand-name");
      if (mockupTitleEl) mockupTitleEl.textContent = val;
    });

    // Listener Tombol Preset Cepat Logo Panel Admin (1-Klik)
    document.querySelectorAll(".btn-preset-admin-logo").forEach(btn => {
      btn.addEventListener("click", function () {
        const src = this.getAttribute("data-src");
        if (!src) return;
        const input = document.getElementById("cfg-admin-logo-img");
        if (input) {
          input.value = src;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
        document.querySelectorAll(".btn-preset-admin-logo").forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        showToast("Preset logo admin diterapkan!");
      });
    });

    // Listener Tombol Preset Cepat Background Isi Undangan (1-Klik)
    document.querySelectorAll(".btn-preset-bg-photo").forEach(btn => {
      btn.addEventListener("click", function () {
        const src = this.getAttribute("data-src");
        if (!src) return;
        const input = document.getElementById("cfg-background-photo");
        if (input) {
          input.value = src;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
        saveCurrentSettings({ toastMsg: "✨ Foto background isi undangan berhasil diterapkan!" });
      });
    });

    // Listener Tombol Preset Cepat Favicon Undangan (1-Klik)
    document.querySelectorAll(".btn-preset-fav-inv").forEach(btn => {
      btn.addEventListener("click", function () {
        const src = this.getAttribute("data-src");
        if (!src) return;
        const input = document.getElementById("cfg-favicon-invitation");
        if (input) {
          input.value = src;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
        updateAdminTabFavicon(src);
        saveCurrentSettings({ toastMsg: "✨ Ikon tab undangan berhasil diperbarui!" });
      });
    });

    // Listener Tombol Preset Cepat Favicon Dasbor Admin (1-Klik)
    document.querySelectorAll(".btn-preset-fav-adm").forEach(btn => {
      btn.addEventListener("click", function () {
        const src = this.getAttribute("data-src");
        if (!src) return;
        const input = document.getElementById("cfg-favicon-admin");
        if (input) {
          input.value = src;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
        updateAdminTabFavicon(src);
        saveCurrentSettings({ toastMsg: "✨ Ikon tab dasbor admin berhasil diperbarui!" });
      });
    });

    // Listener tombol tambah & reset cerita / galeri / rekening bank
    document.getElementById("btn-add-bank-account")?.addEventListener("click", addBankAccount);
    document.getElementById("btn-reset-bank-accounts")?.addEventListener("click", resetBankAccountsDefault);
    document.getElementById("btn-add-story-item")?.addEventListener("click", addStoryItem);
    document.getElementById("btn-reset-story-default")?.addEventListener("click", resetStoryDefault);
    document.getElementById("btn-add-gallery-item")?.addEventListener("click", addGalleryItem);
    document.getElementById("btn-reset-gallery-default")?.addEventListener("click", resetGalleryDefault);

    // Wiring Kontrol Animasi Partikel Estetik (Salju, Sakura, Emas, dll)
    setupAnimationControls();
  }

  // ==========================================
  // 10. KELOLA REKENING BANK KADO DIGITAL
  // ==========================================
  function syncBankAccountsFromInputs() {
    const cards = document.querySelectorAll(".admin-bank-card");
    if (!cards || cards.length === 0) return currentBankAccounts;

    const list = [];
    cards.forEach(card => {
      const bankName = card.querySelector(".bank-input-name")?.value.trim() || "";
      const accountNumber = card.querySelector(".bank-input-number")?.value.trim() || "";
      const accountHolder = card.querySelector(".bank-input-holder")?.value.trim() || "";
      const badge = card.querySelector(".bank-input-badge")?.value.trim() || "BANK";

      if (bankName || accountNumber || accountHolder) {
        list.push({
          bankName: bankName || "Bank Lain",
          accountNumber: accountNumber,
          accountHolder: accountHolder,
          badge: badge.toUpperCase() || "BANK"
        });
      }
    });

    if (list.length > 0) {
      currentBankAccounts = list;
    }
    return currentBankAccounts;
  }

  function renderAdminBankAccounts() {
    const container = document.getElementById("admin-bank-accounts-container");
    if (!container) return;

    if (!Array.isArray(currentBankAccounts) || currentBankAccounts.length === 0) {
      currentBankAccounts = JSON.parse(JSON.stringify(DEFAULT_BANK_ACCOUNTS));
    }

    container.innerHTML = currentBankAccounts.map((acc, idx) => {
      const badge = escapeHtml(acc.badge || "BANK").toUpperCase();
      const bankName = escapeHtml(acc.bankName || "");
      const number = escapeHtml(acc.accountNumber || "");
      const holder = escapeHtml(acc.accountHolder || "");

      return `
        <div class="admin-bank-card" data-index="${idx}" style="background: #fffdf9; border: 1.5px solid var(--admin-border); border-radius: 8px; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.85rem; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--admin-border); padding-bottom: 0.6rem;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="bank-card-badge" style="background: #1e293b; color: #f8fafc; font-size: 0.75rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; letter-spacing: 0.5px;">${badge}</span>
              <strong style="font-size: 0.95rem; color: var(--admin-text);">Rekening #${idx + 1}</strong>
            </div>
            <div style="display: flex; gap: 4px;">
              <button type="button" class="btn-sm btn-export" onclick="AdminApp.moveBankAccount(${idx}, -1)" ${idx === 0 ? "disabled" : ""} title="Geser ke Atas" style="padding: 2px 7px;">
                <i class="fas fa-arrow-up"></i>
              </button>
              <button type="button" class="btn-sm btn-export" onclick="AdminApp.moveBankAccount(${idx}, 1)" ${idx === currentBankAccounts.length - 1 ? "disabled" : ""} title="Geser ke Bawah" style="padding: 2px 7px;">
                <i class="fas fa-arrow-down"></i>
              </button>
              <button type="button" class="btn-sm btn-delete" onclick="AdminApp.deleteBankAccount(${idx})" title="Hapus Rekening" style="padding: 2px 7px;">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>

          <!-- Pilihan Cepat Preset Bank -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.78rem; font-weight: 600; color: #475569;">Pilih Bank / Dompet Digital:</label>
            <select class="form-control bank-preset-select" data-index="${idx}" style="font-size: 0.85rem;">
              <option value="" disabled ${!['BCA','BRI','BSI','MANDIRI','BNI','JAGO','SEABANK','CIMB','PERMATA','DANAMON','BTN','DANA','OVO','GOPAY','SHOPEEPAY'].includes(badge) ? 'selected' : ''}>-- Pilih Preset Bank Populer --</option>
              <option value="BCA" data-name="Bank Central Asia (BCA)" ${badge === 'BCA' ? 'selected' : ''}>BCA (Bank Central Asia)</option>
              <option value="BRI" data-name="Bank Rakyat Indonesia (BRI)" ${badge === 'BRI' ? 'selected' : ''}>BRI (Bank Rakyat Indonesia)</option>
              <option value="BSI" data-name="Bank Syariah Indonesia (BSI)" ${badge === 'BSI' ? 'selected' : ''}>BSI (Bank Syariah Indonesia)</option>
              <option value="MANDIRI" data-name="Bank Mandiri" ${badge === 'MANDIRI' ? 'selected' : ''}>Bank Mandiri</option>
              <option value="BNI" data-name="Bank Negara Indonesia (BNI)" ${badge === 'BNI' ? 'selected' : ''}>BNI (Bank Negara Indonesia)</option>
              <option value="JAGO" data-name="Bank Jago" ${badge === 'JAGO' ? 'selected' : ''}>Bank Jago</option>
              <option value="SEABANK" data-name="SeaBank" ${badge === 'SEABANK' ? 'selected' : ''}>SeaBank</option>
              <option value="CIMB" data-name="CIMB Niaga" ${badge === 'CIMB' ? 'selected' : ''}>CIMB Niaga</option>
              <option value="PERMATA" data-name="Permata Bank" ${badge === 'PERMATA' ? 'selected' : ''}>Permata Bank</option>
              <option value="DANAMON" data-name="Bank Danamon" ${badge === 'DANAMON' ? 'selected' : ''}>Bank Danamon</option>
              <option value="BTN" data-name="Bank BTN" ${badge === 'BTN' ? 'selected' : ''}>Bank BTN</option>
              <option value="DANA" data-name="DANA (Dompet Digital)" ${badge === 'DANA' ? 'selected' : ''}>DANA (E-Wallet)</option>
              <option value="OVO" data-name="OVO (Dompet Digital)" ${badge === 'OVO' ? 'selected' : ''}>OVO (E-Wallet)</option>
              <option value="GOPAY" data-name="GoPay (Dompet Digital)" ${badge === 'GOPAY' ? 'selected' : ''}>GoPay (E-Wallet)</option>
              <option value="SHOPEEPAY" data-name="ShopeePay" ${badge === 'SHOPEEPAY' ? 'selected' : ''}>ShopeePay (E-Wallet)</option>
              <option value="CUSTOM" data-name="Bank Lain" ${badge === 'BANK' ? 'selected' : ''}>Lainnya / Kustom</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.78rem; font-weight: 600;">Nama Bank / Layanan</label>
            <input type="text" class="form-control bank-input-name" data-index="${idx}" value="${bankName}" placeholder="Contoh: Bank Central Asia (BCA)">
          </div>

          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 8px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.78rem; font-weight: 600;">Nomor Rekening / No. HP</label>
              <input type="text" class="form-control bank-input-number" data-index="${idx}" value="${number}" placeholder="Contoh: 8830123456">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.78rem; font-weight: 600;">Badge</label>
              <input type="text" class="form-control bank-input-badge" data-index="${idx}" value="${badge}" placeholder="BCA">
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.78rem; font-weight: 600;">Atas Nama (Nama Pemilik Rekening)</label>
            <input type="text" class="form-control bank-input-holder" data-index="${idx}" value="${holder}" placeholder="Contoh: Sidiq Nugroho">
          </div>
        </div>
      `;
    }).join("");

    // Event listener untuk preset select
    container.querySelectorAll(".bank-preset-select").forEach(sel => {
      sel.addEventListener("change", function () {
        const idx = parseInt(this.getAttribute("data-index"), 10);
        const selectedOpt = this.options[this.selectedIndex];
        if (selectedOpt) {
          const val = selectedOpt.value;
          const name = selectedOpt.getAttribute("data-name") || val;
          const card = this.closest(".admin-bank-card");
          if (card) {
            const nameInput = card.querySelector(".bank-input-name");
            const badgeInput = card.querySelector(".bank-input-badge");
            const badgeEl = card.querySelector(".bank-card-badge");
            if (val !== "CUSTOM") {
              if (nameInput) nameInput.value = name;
              if (badgeInput) badgeInput.value = val;
              if (badgeEl) badgeEl.textContent = val;
            }
          }
        }
      });
    });

    // Event listener untuk input badge
    container.querySelectorAll(".bank-input-badge").forEach(input => {
      input.addEventListener("input", function () {
        const card = this.closest(".admin-bank-card");
        const badgeEl = card?.querySelector(".bank-card-badge");
        if (badgeEl) badgeEl.textContent = this.value.toUpperCase() || "BANK";
      });
    });
  }

  function addBankAccount() {
    syncBankAccountsFromInputs();
    currentBankAccounts.push({
      bankName: "Bank Syariah Indonesia (BSI)",
      accountNumber: "",
      accountHolder: document.getElementById("cfg-groom-full")?.value.trim() || document.getElementById("cfg-groom-call")?.value.trim() || "Mempelai",
      badge: "BSI"
    });
    renderAdminBankAccounts();
    const cards = document.querySelectorAll(".admin-bank-card");
    if (cards.length > 0) {
      cards[cards.length - 1].scrollIntoView({ behavior: "smooth", block: "nearest" });
      cards[cards.length - 1].querySelector(".bank-input-number")?.focus();
    }
    showToast("Rekening bank baru ditambahkan! Silakan lengkapi nomor dan namanya.");
  }

  function deleteBankAccount(idx) {
    syncBankAccountsFromInputs();
    if (confirm("Hapus rekening bank ini?")) {
      currentBankAccounts.splice(idx, 1);
      renderAdminBankAccounts();
      showToast("Rekening bank dihapus.");
    }
  }

  function moveBankAccount(idx, direction) {
    syncBankAccountsFromInputs();
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= currentBankAccounts.length) return;
    const temp = currentBankAccounts[idx];
    currentBankAccounts[idx] = currentBankAccounts[newIdx];
    currentBankAccounts[newIdx] = temp;
    renderAdminBankAccounts();
  }

  function resetBankAccountsDefault() {
    if (confirm("Kembalikan daftar rekening ke 3 bank rekomendasi (BCA, BRI, BSI)?")) {
      currentBankAccounts = JSON.parse(JSON.stringify(DEFAULT_BANK_ACCOUNTS));
      renderAdminBankAccounts();
      showToast("Daftar rekening di-reset ke 3 bank utama: BCA, BRI, dan BSI.");
    }
  }

  // ==========================================
  // 11. KELOLA PERJALANAN CINTA (LOVE STORY)
  // ==========================================
  function syncLoveStoryFromInputs() {
    const cards = document.querySelectorAll(".admin-story-card");
    if (!cards || cards.length === 0) return currentLoveStories;

    const updated = [];
    cards.forEach(card => {
      const year = card.querySelector(".story-input-year")?.value.trim() || "";
      const title = card.querySelector(".story-input-title")?.value.trim() || "";
      const description = card.querySelector(".story-input-desc")?.value.trim() || "";
      const image = card.querySelector(".story-input-image")?.value.trim() || "";
      if (year || title || description) {
        updated.push({ year, title, description, image });
      }
    });

    if (updated.length > 0) {
      currentLoveStories = updated;
    }
    return currentLoveStories;
  }

  function renderAdminLoveStories() {
    const container = document.getElementById("admin-story-list");
    if (!container) return;

    if (!currentLoveStories || currentLoveStories.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; background: #faf8f5; border: 1px dashed var(--admin-border); border-radius: 8px; color: var(--admin-text-muted);">
          <i class="fas fa-heart" style="font-size: 2rem; color: #d1c8be; margin-bottom: 0.5rem; display: block;"></i>
          Belum ada momen kisah perjalanan cinta yang ditambahkan.<br>
          <button type="button" class="btn-sm btn-add" style="margin-top: 0.75rem;" onclick="AdminApp.addStoryItem()">
            <i class="fas fa-plus"></i> Tambah Momen Pertama
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = currentLoveStories.map((story, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === currentLoveStories.length - 1;
      const cleanImg = story.image ? normalizeMediaUrl(story.image, "image") : "";

      return `
        <div class="admin-story-card" data-index="${idx}" style="background: #ffffff; border: 1px solid var(--admin-border); border-radius: 10px; padding: 1.25rem; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; border-bottom: 1px solid #f4ede4; padding-bottom: 0.6rem;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: #fdf6e9; color: var(--admin-gold); font-weight: 700; font-size: 0.8rem;">
                ${idx + 1}
              </span>
              <strong style="font-size: 0.95rem; color: var(--admin-text-dark);">Momen #${idx + 1}: ${escapeHtml(story.title || "Kisah Cinta")}</strong>
            </div>
            <div style="display: flex; gap: 6px;">
              <button type="button" class="btn-sm" style="background: #faf8f5; color: #555; padding: 4px 8px;" onclick="AdminApp.moveStoryItem(${idx}, -1)" ${isFirst ? "disabled style='opacity:0.3; cursor:default;'" : ""} title="Pindah ke Atas">
                <i class="fas fa-arrow-up"></i>
              </button>
              <button type="button" class="btn-sm" style="background: #faf8f5; color: #555; padding: 4px 8px;" onclick="AdminApp.moveStoryItem(${idx}, 1)" ${isLast ? "disabled style='opacity:0.3; cursor:default;'" : ""} title="Pindah ke Bawah">
                <i class="fas fa-arrow-down"></i>
              </button>
              <button type="button" class="btn-sm btn-delete" style="padding: 4px 8px;" onclick="AdminApp.deleteStoryItem(${idx})" title="Hapus Momen">
                <i class="fas fa-trash"></i> Hapus
              </button>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 0.85rem;">
            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.82rem;">Tahun / Waktu Momen *</label>
              <input type="text" class="form-control story-input-year" data-index="${idx}" value="${escapeHtml(story.year || '')}" placeholder="Contoh: 2021 atau Desember 2023">
            </div>
            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.82rem;">Judul Momen *</label>
              <input type="text" class="form-control story-input-title" data-index="${idx}" value="${escapeHtml(story.title || '')}" placeholder="Contoh: Pertemuan Pertama">
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 0.85rem;">
            <label class="form-label" style="font-size: 0.82rem;">Cerita / Deskripsi *</label>
            <textarea class="form-control story-input-desc" data-index="${idx}" rows="2" placeholder="Tuliskan kisah indah pada momen ini...">${escapeHtml(story.description || '')}</textarea>
          </div>

          <div style="background: #faf8f5; padding: 0.85rem 1rem; border-radius: 8px; border: 1px dashed var(--admin-border); margin-top: 0.5rem;">
            <label class="form-label" style="font-size: 0.82rem; font-weight: 700; display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span><i class="fas fa-image" style="color: var(--admin-gold);"></i> Foto Momen Cerita (Opsional)</span>
              <span style="font-size: 0.72rem; color: #64748b;">File Manager HP/Laptop atau URL</span>
            </label>
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
              <!-- Thumbnail Pratinjau -->
              <div style="width: 58px; height: 58px; border-radius: 8px; overflow: hidden; background: #1a1511; border: 1px solid rgba(223, 177, 91, 0.35); flex-shrink: 0; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.12);">
                <img src="${cleanImg || 'assets/images/background.jpg'}" alt="Preview" class="story-preview-img-${idx}" style="width: 100%; height: 100%; object-fit: cover; display: ${cleanImg ? 'block' : 'none'};" onerror="this.style.display='none'">
                <i class="far fa-image story-preview-placeholder-${idx}" style="color: #64748b; font-size: 1.25rem; display: ${cleanImg ? 'none' : 'block'};"></i>
              </div>

              <!-- Input URL & Tombol Upload/Impor File -->
              <div style="flex: 1 1 200px; min-width: 0;">
                <div style="display: flex; gap: 6px; align-items: center;">
                  <input type="text" class="form-control story-input-image" data-index="${idx}" value="${escapeHtml(story.image || '')}" placeholder="Pilih dari HP/laptop atau URL gambar" style="font-size: 0.85rem; flex: 1 1 auto; min-width: 0;">
                  <button type="button" class="btn-sm btn-upload-story-item" data-index="${idx}" style="white-space: nowrap; background: #dfb15b; color: #1a1511; font-weight: 600; border: 1px solid #c99e46; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 6px; cursor: pointer;" title="Impor foto dari file manager / galeri HP / laptop">
                    <i class="fas fa-folder-open"></i> Impor Foto
                  </button>
                  <input type="file" class="story-file-input story-file-input-${idx}" data-index="${idx}" accept="image/*" style="display: none;">
                  ${story.image ? `
                  <button type="button" class="btn-sm btn-clear-story-img" data-index="${idx}" style="white-space: nowrap; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-size: 0.8rem; padding: 6px 9px; border-radius: 6px; cursor: pointer;" title="Hapus foto momen ini">
                    <i class="fas fa-times"></i>
                  </button>
                  ` : ''}
                </div>
                <div style="font-size: 0.73rem; color: #64748b; margin-top: 4px;">
                  Klik <strong>"Impor Foto"</strong> untuk memilih file gambar dari file manager HP / Laptop Anda.
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");

    attachStoryListeners();
  }

  function attachStoryListeners() {
    const container = document.getElementById("admin-story-list");
    if (!container) return;

    container.querySelectorAll(".story-input-year, .story-input-title, .story-input-desc").forEach(input => {
      input.addEventListener("input", function () {
        const idx = parseInt(this.getAttribute("data-index"), 10);
        if (currentLoveStories[idx]) {
          if (this.classList.contains("story-input-year")) currentLoveStories[idx].year = this.value;
          if (this.classList.contains("story-input-title")) currentLoveStories[idx].title = this.value;
          if (this.classList.contains("story-input-desc")) currentLoveStories[idx].description = this.value;
        }
      });
    });

    container.querySelectorAll(".story-input-image").forEach(input => {
      input.addEventListener("input", function () {
        const idx = parseInt(this.getAttribute("data-index"), 10);
        const val = this.value.trim();
        if (currentLoveStories[idx]) {
          currentLoveStories[idx].image = val;
        }
        const img = container.querySelector(`.story-preview-img-${idx}`);
        const ph = container.querySelector(`.story-preview-placeholder-${idx}`);
        if (img && ph) {
          if (val) {
            img.src = normalizeMediaUrl(val, "image");
            img.style.display = "block";
            ph.style.display = "none";
          } else {
            img.style.display = "none";
            ph.style.display = "block";
          }
        }
      });
      input.addEventListener("change", () => handleUrlPasteOrInput(input));
      input.addEventListener("paste", () => setTimeout(() => handleUrlPasteOrInput(input), 100));
    });

    // Listener Tombol Buka File Manager (Impor Foto)
    container.querySelectorAll(".btn-upload-story-item").forEach(btn => {
      btn.addEventListener("click", function () {
        const idx = parseInt(this.getAttribute("data-index"), 10);
        const fileInput = container.querySelector(`.story-file-input-${idx}`);
        if (fileInput) {
          fileInput.value = "";
          fileInput.click();
        }
      });
    });

    // Listener File Picker saat file dipilih dari File Manager
    container.querySelectorAll("input[type='file'].story-file-input, input[type='file'][class*='story-file-input-']").forEach(fileInput => {
      fileInput.addEventListener("change", async function () {
        try {
          const idxAttr = this.getAttribute("data-index");
          const idx = idxAttr !== null ? parseInt(idxAttr, 10) : parseInt((this.className.match(/story-file-input-(\d+)/) || [])[1], 10);
          if (isNaN(idx) || !currentLoveStories[idx]) return;

          const file = this.files && this.files[0];
          if (!file) return;

          showToast(`Memproses foto momen #${idx + 1}...`);
          const optimizedData = await optimizeImage(file);
          if (!optimizedData) {
            showToast("Gagal membaca file gambar!");
            return;
          }

          currentLoveStories[idx].image = optimizedData;
          const srcInput = container.querySelector(`.story-input-image[data-index="${idx}"]`);
          if (srcInput) {
            srcInput.value = optimizedData;
            srcInput.dispatchEvent(new Event("input", { bubbles: true }));
            srcInput.dispatchEvent(new Event("change", { bubbles: true }));
          }
          const img = container.querySelector(`.story-preview-img-${idx}`);
          const ph = container.querySelector(`.story-preview-placeholder-${idx}`);
          if (img) {
            img.src = optimizedData;
            img.style.display = "block";
          }
          if (ph) {
            ph.style.display = "none";
          }

          // Coba upload ke server jika backend terhubung & bukan GitHub Pages
          const isStaticHost = window.location.hostname.includes("github.io");
          if (!isStaticHost && window.API && window.API.uploadImage) {
            try {
              const ext = file.type === "image/png" ? "png" : (file.name.split(".").pop() || "jpg");
              const res = await window.API.uploadImage({
                filename: `story-${idx + 1}-${Date.now()}.${ext}`,
                fileData: optimizedData
              });
              if (res && res.success && res.filePath) {
                currentLoveStories[idx].image = res.filePath;
                if (srcInput) {
                  srcInput.value = res.filePath;
                  srcInput.dispatchEvent(new Event("input", { bubbles: true }));
                  srcInput.dispatchEvent(new Event("change", { bubbles: true }));
                }
                if (img) img.src = res.filePath;
                await saveCurrentSettings({ toastMsg: `✅ Foto momen #${idx + 1} berhasil disimpan & LANGSUNG DITERAPKAN ke website!` });
                return;
              }
            } catch (upErr) {
              console.warn(`[Upload Story] Upload ke backend gagal, fallback lokal:`, upErr);
            }
          }

          await saveCurrentSettings({ toastMsg: `✨ Foto momen #${idx + 1} berhasil dipasang & LANGSUNG DITERAPKAN ke website!` });
        } catch (err) {
          console.error("[Upload Story] Error:", err);
          showToast(`Gagal memproses foto: ${err.message || err}`);
        }
      });
    });

    // Listener Tombol Hapus Foto Momen
    container.querySelectorAll(".btn-clear-story-img").forEach(btn => {
      btn.addEventListener("click", function () {
        const idx = parseInt(this.getAttribute("data-index"), 10);
        if (currentLoveStories[idx]) {
          syncLoveStoryFromInputs();
          currentLoveStories[idx].image = "";
          renderAdminLoveStories();
          showToast("Foto momen berhasil dihapus.");
        }
      });
    });
  }

  function addStoryItem() {
    syncLoveStoryFromInputs();
    currentLoveStories.push({
      year: new Date().getFullYear().toString(),
      title: "Momen Spesial",
      description: "Tuliskan cerita perjalanan cinta Anda di sini...",
      image: ""
    });
    renderAdminLoveStories();
    const cards = document.querySelectorAll(".admin-story-card");
    if (cards.length > 0) {
      cards[cards.length - 1].scrollIntoView({ behavior: "smooth", block: "nearest" });
      cards[cards.length - 1].querySelector(".story-input-title")?.focus();
    }
  }

  function deleteStoryItem(idx) {
    syncLoveStoryFromInputs();
    if (confirm("Hapus momen cerita ini?")) {
      currentLoveStories.splice(idx, 1);
      renderAdminLoveStories();
      showToast("Momen cerita dihapus.");
    }
  }

  function moveStoryItem(idx, direction) {
    syncLoveStoryFromInputs();
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= currentLoveStories.length) return;
    const temp = currentLoveStories[idx];
    currentLoveStories[idx] = currentLoveStories[newIdx];
    currentLoveStories[newIdx] = temp;
    renderAdminLoveStories();
  }

  function resetStoryDefault() {
    if (confirm("Kembalikan momen cerita ke 4 kisah contoh bawaan?")) {
      currentLoveStories = JSON.parse(JSON.stringify(DEFAULT_LOVE_STORIES));
      renderAdminLoveStories();
      showToast("Momen cerita di-reset ke contoh bawaan.");
    }
  }

  // ==========================================
  // 11. KELOLA GALERI FOTO (PHOTO GALLERY)
  // ==========================================
  function syncGalleryFromInputs() {
    const cards = document.querySelectorAll(".admin-gallery-card");
    if (!cards || cards.length === 0) return currentGalleryItems;

    const updated = [];
    cards.forEach(card => {
      const src = card.querySelector(".gallery-input-src")?.value.trim() || "";
      const caption = card.querySelector(".gallery-input-caption")?.value.trim() || "";
      if (src) {
        updated.push({ src, caption });
      }
    });

    if (updated.length > 0) {
      currentGalleryItems = updated;
    }
    return currentGalleryItems;
  }

  function renderAdminGallery() {
    const container = document.getElementById("admin-gallery-list");
    if (!container) return;

    if (!currentGalleryItems || currentGalleryItems.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2.5rem; background: #faf8f5; border: 1px dashed var(--admin-border); border-radius: 8px; color: var(--admin-text-muted);">
          <i class="far fa-images" style="font-size: 2.5rem; color: #d1c8be; margin-bottom: 0.5rem; display: block;"></i>
          Belum ada foto galeri yang ditambahkan.<br>
          <button type="button" class="btn-sm btn-add" style="margin-top: 0.75rem;" onclick="AdminApp.addGalleryItem()">
            <i class="fas fa-plus"></i> Tambah Foto Pertama
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = currentGalleryItems.map((item, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === currentGalleryItems.length - 1;
      const cleanImg = normalizeMediaUrl(item.src || "", "image");

      return `
        <div class="admin-gallery-card" data-index="${idx}" style="background: #ffffff; border: 1px solid var(--admin-border); border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04); display: flex; flex-direction: column;">
          <div style="position: relative; width: 100%; height: 170px; background: #1a1511; overflow: hidden; display: flex; align-items: center; justify-content: center;">
            <img src="${cleanImg || 'assets/images/background.jpg'}" alt="Preview Foto ${idx + 1}" class="gallery-preview-img-${idx}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='assets/images/background.jpg'">
            <span style="position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,0.7); color: #fff; font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; font-weight: 600;">
              Foto #${idx + 1}
            </span>
            <div style="position: absolute; top: 8px; right: 8px; display: flex; gap: 4px;">
              <button type="button" class="btn-sm" style="background: rgba(0,0,0,0.7); color: #fff; padding: 4px 7px; font-size: 0.75rem;" onclick="AdminApp.moveGalleryItem(${idx}, -1)" ${isFirst ? "disabled style='opacity:0.3; cursor:default;'" : ""} title="Geser ke Kiri/Sebelumnya">
                <i class="fas fa-chevron-left"></i>
              </button>
              <button type="button" class="btn-sm" style="background: rgba(0,0,0,0.7); color: #fff; padding: 4px 7px; font-size: 0.75rem;" onclick="AdminApp.moveGalleryItem(${idx}, 1)" ${isLast ? "disabled style='opacity:0.3; cursor:default;'" : ""} title="Geser ke Kanan/Selanjutnya">
                <i class="fas fa-chevron-right"></i>
              </button>
              <button type="button" class="btn-sm btn-delete" style="padding: 4px 7px; font-size: 0.75rem;" onclick="AdminApp.deleteGalleryItem(${idx})" title="Hapus Foto">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>

          <div style="padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; flex-grow: 1; justify-content: space-between;">
            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.8rem; margin-bottom: 2px;">URL / File Path Foto *</label>
              <div style="display: flex; gap: 6px; align-items: center;">
                <input type="text" class="form-control gallery-input-src" data-index="${idx}" value="${escapeHtml(item.src || '')}" placeholder="assets/images/gallery-1.jpg atau URL Drive/Pinterest" style="font-size: 0.84rem; flex-grow: 1;">
                <button type="button" class="btn-sm btn-export btn-upload-gallery-item" data-index="${idx}" style="white-space: nowrap; padding: 7px 10px; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 4px;" title="Pilih Foto dari Galeri HP/Laptop">
                  <i class="fas fa-camera"></i> Unggah
                </button>
                <input type="file" class="gallery-file-input gallery-file-input-${idx}" data-index="${idx}" accept="image/*" style="display: none;">
              </div>
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.8rem; margin-bottom: 2px;">Keterangan / Caption Foto</label>
              <input type="text" class="form-control gallery-input-caption" data-index="${idx}" value="${escapeHtml(item.caption || '')}" placeholder="Contoh: Momen prewedding di suasana alam..." style="font-size: 0.84rem;">
            </div>
          </div>
        </div>
      `;
    }).join("");

    attachGalleryListeners();
  }

  function attachGalleryListeners() {
    const container = document.getElementById("admin-gallery-list");
    if (!container) return;

    container.querySelectorAll(".gallery-input-caption").forEach(input => {
      input.addEventListener("input", function () {
        const idx = parseInt(this.getAttribute("data-index"), 10);
        if (currentGalleryItems[idx]) {
          currentGalleryItems[idx].caption = this.value;
        }
      });
    });

    container.querySelectorAll(".btn-upload-gallery-item").forEach(btn => {
      btn.addEventListener("click", function () {
        const idx = parseInt(this.getAttribute("data-index"), 10);
        const fileInput = container.querySelector(`.gallery-file-input-${idx}`);
        if (fileInput) {
          fileInput.value = "";
          fileInput.click();
        }
      });
    });

    container.querySelectorAll("input[type='file'].gallery-file-input, input[type='file'][class*='gallery-file-input-']").forEach(fileInput => {
      fileInput.addEventListener("change", async function () {
        try {
          const idxAttr = this.getAttribute("data-index");
          const idx = idxAttr !== null ? parseInt(idxAttr, 10) : parseInt((this.className.match(/gallery-file-input-(\d+)/) || [])[1], 10);
          if (isNaN(idx) || !currentGalleryItems[idx]) return;

          const file = this.files && this.files[0];
          if (!file) return;

          showToast(`Memproses foto galeri #${idx + 1}...`);
          const optimizedData = await optimizeImage(file);
          if (!optimizedData) {
            showToast("Gagal membaca file gambar!");
            return;
          }

          currentGalleryItems[idx].src = optimizedData;
          const srcInput = container.querySelector(`.gallery-input-src[data-index="${idx}"]`);
          if (srcInput) {
            srcInput.value = optimizedData;
            srcInput.dispatchEvent(new Event("input", { bubbles: true }));
            srcInput.dispatchEvent(new Event("change", { bubbles: true }));
          }
          const img = container.querySelector(`.gallery-preview-img-${idx}`);
          if (img) {
            img.src = optimizedData;
          }

          // Coba upload ke server jika backend terhubung & bukan GitHub Pages
          const isStaticHost = window.location.hostname.includes("github.io");
          if (!isStaticHost && window.API && window.API.uploadImage) {
            try {
              const ext = file.type === "image/png" ? "png" : (file.name.split(".").pop() || "jpg");
              const res = await window.API.uploadImage({
                filename: `gallery-${idx + 1}-${Date.now()}.${ext}`,
                fileData: optimizedData
              });
              if (res && res.success && res.filePath) {
                currentGalleryItems[idx].src = res.filePath;
                if (srcInput) {
                  srcInput.value = res.filePath;
                  srcInput.dispatchEvent(new Event("input", { bubbles: true }));
                  srcInput.dispatchEvent(new Event("change", { bubbles: true }));
                }
                if (img) img.src = res.filePath;
                await saveCurrentSettings({ toastMsg: `✅ Foto galeri #${idx + 1} berhasil disimpan & LANGSUNG DITERAPKAN ke website!` });
                return;
              }
            } catch (upErr) {
              console.warn(`[Upload Gallery] Upload ke backend gagal, fallback lokal:`, upErr);
            }
          }

          await saveCurrentSettings({ toastMsg: `✨ Foto galeri #${idx + 1} berhasil dipasang & LANGSUNG DITERAPKAN ke website!` });
        } catch (err) {
          console.error("[Upload Gallery] Error:", err);
          showToast(`Gagal memproses foto: ${err.message || err}`);
        }
      });
    });

    container.querySelectorAll(".gallery-input-src").forEach(input => {
      input.addEventListener("input", function () {
        const idx = parseInt(this.getAttribute("data-index"), 10);
        const val = this.value.trim();
        if (currentGalleryItems[idx]) {
          currentGalleryItems[idx].src = val;
        }
        const img = container.querySelector(`.gallery-preview-img-${idx}`);
        if (img) {
          const clean = normalizeMediaUrl(val || "assets/images/background.jpg", "image");
          img.src = clean;
        }
      });
      input.addEventListener("change", () => handleUrlPasteOrInput(input));
      input.addEventListener("paste", () => setTimeout(() => handleUrlPasteOrInput(input), 100));
    });
  }

  function addGalleryItem() {
    syncGalleryFromInputs();
    currentGalleryItems.push({
      src: "assets/images/gallery-1.jpg",
      caption: "Momen Bahagia Mempelai"
    });
    renderAdminGallery();
    const cards = document.querySelectorAll(".admin-gallery-card");
    if (cards.length > 0) {
      cards[cards.length - 1].scrollIntoView({ behavior: "smooth", block: "nearest" });
      cards[cards.length - 1].querySelector(".gallery-input-src")?.focus();
    }
  }

  function deleteGalleryItem(idx) {
    syncGalleryFromInputs();
    if (confirm("Hapus foto galeri ini?")) {
      currentGalleryItems.splice(idx, 1);
      renderAdminGallery();
      showToast("Foto galeri dihapus.");
    }
  }

  function moveGalleryItem(idx, direction) {
    syncGalleryFromInputs();
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= currentGalleryItems.length) return;
    const temp = currentGalleryItems[idx];
    currentGalleryItems[idx] = currentGalleryItems[newIdx];
    currentGalleryItems[newIdx] = temp;
    renderAdminGallery();
  }

  function resetGalleryDefault() {
    if (confirm("Kembalikan foto galeri ke 4 foto prewedding bawaan?")) {
      currentGalleryItems = JSON.parse(JSON.stringify(DEFAULT_GALLERY_ITEMS));
      renderAdminGallery();
      showToast("Foto galeri di-reset ke foto bawaan.");
    }
  }

  // ==========================================
  // 12. GENERATOR QR CODE FISIK ADMIN
  // ==========================================
  function initAdminQrGenerator() {
    const generateBtn = document.getElementById("btn-admin-generate-qr");
    const urlInput = document.getElementById("admin-qr-url-input");
    const qrDisplay = document.getElementById("admin-qr-display");
    const qrNote = document.getElementById("admin-qr-note");

    if (!generateBtn || !urlInput || !qrDisplay) return;

    urlInput.placeholder = INVITATION_PUBLIC_URL;

    generateBtn.addEventListener("click", function () {
      let targetUrl = urlInput.value.trim();
      if (!targetUrl) {
        targetUrl = INVITATION_PUBLIC_URL;
      }

      const isLocal = targetUrl.includes("localhost") || targetUrl.includes("127.0.0.1") || targetUrl.startsWith("file:");

      if (isLocal && qrNote) {
        qrNote.innerHTML = `<span style="color: #b45309; font-weight: 600;"><i class="fas fa-exclamation-triangle"></i> Perhatian:</span> Anda menggunakan alamat lokal. Setelah website di-upload ke domain/hosting publik (misal: <em>https://pernikahan-kami.com</em>), masukkan domain tersebut ke kolom di atas.`;
      } else if (qrNote) {
        qrNote.innerHTML = `<span style="color: #15803d; font-weight: 600;"><i class="fas fa-check-circle"></i> Berhasil!</span> QR Code mengarah ke: <strong>${escapeHtml(targetUrl)}</strong>. Siap dicetak di kartu fisik atau disebarkan.`;
      }

      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&color=2c2a29&bgcolor=ffffff&data=${encodeURIComponent(targetUrl)}`;

      qrDisplay.innerHTML = `
        <div style="display: inline-block; padding: 16px; background: #ffffff; border-radius: 8px; border: 1px solid var(--admin-border); box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
          <img src="${qrApiUrl}" alt="QR Code Undangan" style="width: 200px; height: 200px; display: block; margin: 0 auto 10px;" onerror="this.src='assets/images/qrcode.png'">
          <p style="font-size: 0.8rem; color: var(--admin-text-dark); word-break: break-all; max-width: 240px; margin: 0 auto 10px;"><strong>${escapeHtml(targetUrl)}</strong></p>
          <a href="${qrApiUrl}" target="_blank" download="qrcode-undangan.png" class="btn-sm btn-export" style="text-decoration: none; display: inline-flex; justify-content: center;">
            <i class="fas fa-download"></i> Unduh Gambar QR Code
          </a>
        </div>
      `;
    });
  }

  // ==========================================
  // INTI INITIALIZATION
  // ==========================================
  function init() {
    // Terapkan logo & judul admin dari localStorage segera saat DOM siap
    try {
      const cachedLogo = localStorage.getItem("wedding_admin_logo");
      const cachedTitle = localStorage.getItem("wedding_admin_title");
      if (cachedLogo || cachedTitle) {
        applyAdminLogo(cachedLogo, cachedTitle);
      }
    } catch (_) {}

    initAuth();
    initTabs();
    initAccountSecurity();
    initExcelExports();
    initGuestModal();
    initRsvpFilters();
    initWishFilters();
    initAdminWaBroadcast();
    initAdminQrGenerator();
    initSettingsForm();
    initQuickScroll();

    // Pastikan tombol Buka Undangan selalu mengarah ke URL yang sesuai (lokal jika sedang di localhost/LAN)
    const viewSiteBtn = document.querySelector(".btn-view-site") || document.getElementById("btn-view-site");
    if (viewSiteBtn) {
      const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.') || window.location.hostname.startsWith('10.');
      const localTargetUrl = window.location.port ? `${window.location.protocol}//${window.location.hostname}:${window.location.port}/` : '/';
      viewSiteBtn.href = isLocalHost ? localTargetUrl : INVITATION_PUBLIC_URL;
      viewSiteBtn.title = isLocalHost ? "Buka website undangan lokal" : "Buka website undangan resmi (GitHub Pages)";
    }

    // Shortcut Tombol Navigasi Cepat (Scroll Atas & Bawah)
    function initQuickScroll() {
      const btnTop = document.getElementById("btn-scroll-top");
      const btnBottom = document.getElementById("btn-scroll-bottom");

      if (btnTop) {
        btnTop.addEventListener("click", () => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }

      if (btnBottom) {
        btnBottom.addEventListener("click", () => {
          const targetBottom = document.documentElement.scrollHeight || document.body.scrollHeight;
          window.scrollTo({ top: targetBottom, behavior: "smooth" });
        });
      }

      // Keyboard Shortcut: Home (ke paling atas) & End (ke paling bawah) saat tidak sedang mengetik
      window.addEventListener("keydown", (e) => {
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
        if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") {
          return;
        }
        if (e.key === "Home") {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else if (e.key === "End") {
          e.preventDefault();
          const targetBottom = document.documentElement.scrollHeight || document.body.scrollHeight;
          window.scrollTo({ top: targetBottom, behavior: "smooth" });
        }
      });

      // Sesuaikan kontras/transparansi tombol saat berada di puncak atau dasar halaman
      const updateScrollVisibility = () => {
        const scrollY = window.scrollY || window.pageYOffset;
        const maxScroll = (document.documentElement.scrollHeight || document.body.scrollHeight) - window.innerHeight;

        if (btnTop) {
          btnTop.style.opacity = scrollY > 80 ? "1" : "0.45";
        }

        if (btnBottom) {
          btnBottom.style.opacity = (maxScroll - scrollY) > 80 ? "1" : "0.45";
        }
      };

      window.addEventListener("scroll", updateScrollVisibility, { passive: true });
      updateScrollVisibility();
    }

    // Handler Tombol Refresh Data Real-Time di Ringkasan
    const refreshBtn = document.getElementById("btn-refresh-all-data");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", async function () {
        const icon = document.getElementById("refresh-icon");
        if (icon) icon.classList.add("fa-spin");
        refreshBtn.disabled = true;
        try {
          await loadAllData();
          showToast("Data terbaru berhasil disinkronkan dari server!");
        } catch (e) {
          showToast("Gagal memuat data: " + e.message);
        } finally {
          if (icon) icon.classList.remove("fa-spin");
          refreshBtn.disabled = false;
        }
      });
    }
  }

  return {
    init: init,
    exportToExcel: exportToExcel,
    copyGuestLink: copyGuestLink,
    deleteGuest: deleteGuest,
    deleteRsvp: deleteRsvp,
    updateWishStatus: updateWishStatus,
    deleteWish: deleteWish,
    addBankAccount: addBankAccount,
    deleteBankAccount: deleteBankAccount,
    moveBankAccount: moveBankAccount,
    resetBankAccountsDefault: resetBankAccountsDefault,
    addStoryItem: addStoryItem,
    deleteStoryItem: deleteStoryItem,
    moveStoryItem: moveStoryItem,
    resetStoryDefault: resetStoryDefault,
    addGalleryItem: addGalleryItem,
    deleteGalleryItem: deleteGalleryItem,
    moveGalleryItem: moveGalleryItem,
    resetGalleryDefault: resetGalleryDefault
  };
})();

window.AdminApp = AdminApp;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    AdminApp.init();
  });
} else {
  AdminApp.init();
}

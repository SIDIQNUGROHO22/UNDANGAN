/**
 * ==============================================================================
 * MAIN SCRIPT (js/main.js) - TERHUBUNG KE BACKEND SERVER & REAL-TIME API
 * ==============================================================================
 * Mengorkestrasi seluruh alur website undangan digital modern:
 * - Mengambil konfigurasi dinamis dari Backend Server (/api/invitation)
 * - Membuka cover sampul & memulai audio
 * - Lightbox galeri foto
 * - Salin nomor rekening & notifikasi toast
 * - Buku tamu interaktif real-time dengan like/hati
 * - Navigasi halus & scroll-spy
 * ==============================================================================
 */

const MainApp = (function () {
  let activeConfig = null;

  /**
   * Helper sanitasi HTML string
   */
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Helper format hari dan tanggal agar tidak terjadi duplikasi kata hari
   */
  function formatEventDate(dayName, dateFormatted) {
    if (!dateFormatted) return dayName || "";
    const dateTrim = String(dateFormatted).trim();
    if (!dayName) return dateTrim;
    const dayTrim = String(dayName).trim();
    if (dateTrim.toLowerCase().startsWith(dayTrim.toLowerCase())) {
      return dateTrim;
    }
    return `${dayTrim}, ${dateTrim}`;
  }

  /**
   * Helper normalisasi URL media (gambar / audio) dari berbagai sumber:
   * - Pinterest (direct image cdn https://i.pinimg.com/...)
   * - Google Drive (auto-convert sharing link ke direct view/stream)
   * - Dropbox (dl=0 -> raw=1)
   * - Imgur non-direct link
   * - File lokal offline
   */
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

  /**
   * Mengisi seluruh teks dan informasi dari config ke elemen DOM
   */
  function populateContent(c) {
    if (!c) return;
    activeConfig = c;
    window.CURRENT_CONFIG = c;

    // 1. Data Mempelai
    if (c.couple) {
      if (c.couple.groom) {
        setTextAll(".groom-call-name", c.couple.groom.callName);
        setTextAll(".groom-full-name", c.couple.groom.fullName);
        setTextAll(".groom-parents", `${c.couple.groom.childOrder || "Putra dari"} ${c.couple.groom.fatherName || ""} & ${c.couple.groom.motherName || ""}`);
        setTextAll(".groom-bio", c.couple.groom.bio);
        setLink("groom-instagram", c.couple.groom.instagram);
        setImage("groom-photo", c.couple.groom.photo, "Foto " + c.couple.groom.fullName);
      }

      if (c.couple.bride) {
        setTextAll(".bride-call-name", c.couple.bride.callName);
        setTextAll(".bride-full-name", c.couple.bride.fullName);
        setTextAll(".bride-parents", `${c.couple.bride.childOrder || "Putri dari"} ${c.couple.bride.fatherName || ""} & ${c.couple.bride.motherName || ""}`);
        setTextAll(".bride-bio", c.couple.bride.bio);
        setLink("bride-instagram", c.couple.bride.instagram);
        setImage("bride-photo", c.couple.bride.photo, "Foto " + c.couple.bride.fullName);
      }

      if (c.couple.groom && c.couple.bride) {
        setTextAll(".couple-call-names", `${c.couple.groom.callName} & ${c.couple.bride.callName}`);
      }

      setImage("cover-photo-img", c.couple.coverPhoto || "assets/images/cover.jpg", "Foto Sampul");
      setImage("vinyl-label-img", c.couple.coverPhoto || "assets/images/cover.jpg", "Foto Vinyl");
      const mainBgPhoto = c.couple.backgroundPhoto || c.themeAssets?.backgroundPhoto || "assets/images/background.jpg";
      setImage("main-bg-image", mainBgPhoto, "Foto Background Utama");
    }

    // 2. Kutipan Doa
    if (c.quotes) {
      setTextAll(".quote-title", c.quotes.title);
      setTextAll(".quote-verse", c.quotes.verse);
      setTextAll(".closing-greeting", c.quotes.closingGreeting);
    }

    // 3. Detail Acara - Akad Nikah
    if (c.events && c.events.akad) {
      setTextAll(".akad-day-date", formatEventDate(c.events.akad.dayName, c.events.akad.dateFormatted));
      setTextAll(".akad-time", c.events.akad.timeFormatted);
      setTextAll(".akad-venue-name", c.events.akad.venueName);
      setTextAll(".akad-venue-address", c.events.akad.venueAddress);
      setLink("akad-maps-btn", c.events.akad.googleMapsUrl);
    }

    // 4. Detail Acara - Resepsi
    if (c.events && c.events.resepsi) {
      setTextAll(".resepsi-day-date", formatEventDate(c.events.resepsi.dayName, c.events.resepsi.dateFormatted));
      setTextAll(".resepsi-time", c.events.resepsi.timeFormatted);
      setTextAll(".resepsi-venue-name", c.events.resepsi.venueName);
      setTextAll(".resepsi-venue-address", c.events.resepsi.venueAddress);
      setLink("resepsi-maps-btn", c.events.resepsi.googleMapsUrl);
    }

    // 4b. Detail Acara - Unduh Mantu (Dapat diaktifkan/dinonaktifkan di Admin)
    const unduhWrapper = document.getElementById("unduh-mantu-wrapper");
    if (c.events && c.events.unduhMantu) {
      const um = c.events.unduhMantu;
      const isEnabled = um.enable !== false;
      if (unduhWrapper) {
        unduhWrapper.style.display = isEnabled ? "block" : "none";
      }
      if (isEnabled) {
        const titleEl = document.getElementById("unduh-mantu-title");
        if (titleEl) titleEl.textContent = um.title || "Acara Unduh Mantu";
        const dateStr = formatEventDate(um.dayName, um.dateFormatted);
        setTextAll(".unduh-mantu-day-date", dateStr);
        setTextAll(".unduh-mantu-time", um.timeFormatted);
        setTextAll(".unduh-mantu-venue-name", um.venueName);
        setTextAll(".unduh-mantu-venue-address", um.venueAddress);
        setLink("unduh-mantu-maps-btn", um.googleMapsUrl);
      }
    } else if (unduhWrapper) {
      unduhWrapper.style.display = "none";
    }

    // 5. Render Timeline Perjalanan Cinta (Love Story)
    const storiesToRender = (c.loveStory && Array.isArray(c.loveStory) && c.loveStory.length > 0)
      ? c.loveStory
      : (typeof WEDDING_CONFIG !== "undefined" ? WEDDING_CONFIG.loveStory : []);
    renderLoveStory(storiesToRender);

    // 6. Render Rekening Kado Digital
    if (c.gift) {
      if (c.gift.bankAccounts) {
        renderBankAccounts(c.gift.bankAccounts);
      }
      if (c.gift.qris) {
        setImage("qris-image", c.gift.qris.imagePath, c.gift.qris.title);
        setTextAll(".qris-note", c.gift.qris.note);
      }
      if (c.gift.physicalGift && c.gift.physicalGift.enable) {
        setTextAll(".gift-recipient-name", c.gift.physicalGift.recipientName);
        setTextAll(".gift-recipient-phone", c.gift.physicalGift.phoneNumber);
        setTextAll(".gift-recipient-address", c.gift.physicalGift.fullAddress);
      }
    }

    // 7. Render Galeri Foto
    const galleryToRender = (c.gallery && Array.isArray(c.gallery) && c.gallery.length > 0)
      ? c.gallery
      : (typeof WEDDING_CONFIG !== "undefined" ? WEDDING_CONFIG.gallery : []);
    renderGallery(galleryToRender);

    // 8. Sinkronisasi Musik Pengiring
    if (c.music && typeof MusicHandler !== "undefined" && MusicHandler.setTrack) {
      const isYt = c.music.sourceType === "youtube";
      const musicSrc = isYt ? (c.music.youtubeUrl || c.music.filePath) : (c.music.filePath || c.music.youtubeUrl);
      MusicHandler.setTrack(musicSrc, c.music.title, c.music.artist, c.music.sourceType, c.music.filePath);
    }

    // 9. Sinkronisasi Aset Visual Tema (Gunungan, Wayang, Ornamen Sudut - Kustom Admin)
    if (c.themeAssets) {
      applyThemeAssets(c.themeAssets);
    }

    // 10. Bagian Penutup & Footer (Bawah Pol)
    const groomCall = c.couple?.groom?.callName || "Sidiq";
    const brideCall = c.couple?.bride?.callName || "Anisa";
    const defaultCoupleText = `${groomCall} & ${brideCall}`;
    
    const footerNamesEl = document.getElementById("footer-couple-names");
    if (footerNamesEl) {
      footerNamesEl.textContent = c.footer?.coupleNames || defaultCoupleText;
    }

    const footerClosingEl = document.getElementById("footer-closing-greeting");
    if (footerClosingEl) {
      footerClosingEl.textContent = c.footer?.closingGreeting || c.quotes?.closingGreeting || "Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu kepada kedua mempelai.";
    }

    const footerCopyrightEl = document.getElementById("footer-copyright-text");
    if (footerCopyrightEl) {
      const defaultCopyright = `© 2026 ${defaultCoupleText} Wedding Invitation. Dibuat dengan penuh cinta.`;
      footerCopyrightEl.textContent = c.footer?.copyright || defaultCopyright;
    }

    // Re-inisialisasi countdown jika tanggal target ada
    if (c.countdown && typeof CountdownHandler !== "undefined") {
      CountdownHandler.init();
    }

    // Update efek animasi partikel latar belakang (Salju, Sakura, Bintang Emas, dll)
    if (typeof WeddingParticles !== "undefined") {
      WeddingParticles.updateFromConfig(c.animation);
    }
  }

  /**
   * Menerapkan aset visual tema (Gunungan, Siluet Wayang, & Ornamen) dari konfigurasi
   */
  function applyThemeAssets(assets) {
    if (!assets) return;

    // 1. Gambar & Visibilitas Tirai Gunungan Wayang (Kayon) - Mendukung 2 Kayon Kiri & Kanan Berbeda
    const gununganLeft = document.getElementById("gunungan-left-container");
    const gununganRight = document.getElementById("gunungan-right-container");
    const gununganCenter = document.getElementById("cover-gunungan-center");
    const gununganLeftImg = document.getElementById("gunungan-left-img");
    const gununganRightImg = document.getElementById("gunungan-right-img");
    const gununganCenterImg = document.getElementById("gunungan-center-img");

    const showGunungan = assets.showGunungan !== false;
    const showGununganCenter = assets.showGununganCenter !== false;
    const defaultGunungan = "assets/images/gunungan-gold.svg";

    const leftSrcRaw = normalizeMediaUrl(assets.gununganLeftImage || assets.gununganImage || defaultGunungan, "image");
    const rightSrcRaw = normalizeMediaUrl(assets.gununganRightImage || assets.gununganLeftImage || assets.gununganImage || defaultGunungan, "image");
    const centerSrcRaw = normalizeMediaUrl(assets.gununganCenterImage || assets.gununganLeftImage || assets.gununganImage || defaultGunungan, "image");
    const bust = (u) => (u && !u.startsWith("data:") && !u.includes("?") && u.includes("assets/")) ? `${u}?v=${Date.now()}` : u;
    const leftSrc = bust(leftSrcRaw);
    const rightSrc = bust(rightSrcRaw);
    const centerSrc = bust(centerSrcRaw);
    const isMirrorRight = assets.gununganRightMirror !== false;

    if (gununganLeft) gununganLeft.style.display = showGunungan ? "block" : "none";
    if (gununganRight) {
      gununganRight.style.display = showGunungan ? "block" : "none";
      if (isMirrorRight) {
        gununganRight.classList.remove("unmirrored");
      } else {
        gununganRight.classList.add("unmirrored");
      }
    }
    if (gununganCenter) gununganCenter.style.display = (showGunungan && showGununganCenter) ? "block" : "none";

    if (gununganLeftImg && leftSrc) {
      gununganLeftImg.src = leftSrc;
      gununganLeftImg.onerror = function () { this.onerror = null; this.src = defaultGunungan; };
    }
    if (gununganRightImg && rightSrc) {
      gununganRightImg.src = rightSrc;
      gununganRightImg.onerror = function () { this.onerror = null; this.src = defaultGunungan; };
    }
    if (gununganCenterImg && centerSrc) {
      gununganCenterImg.src = centerSrc;
      gununganCenterImg.onerror = function () { this.onerror = null; this.src = defaultGunungan; };
    }

    // 2. Ornamen Sudut Keraton
    const corners = document.querySelectorAll(".javanese-corner-ornament");
    const showCorners = assets.showCorners !== false;
    const defaultCorner = "assets/images/javanese-corner.svg";
    const cornerSrc = normalizeMediaUrl(assets.cornerOrnamentImage || defaultCorner, "image");

    corners.forEach(corner => {
      corner.style.display = showCorners ? "block" : "none";
      const img = corner.querySelector("img");
      if (img && cornerSrc) {
        img.src = cornerSrc;
        img.onerror = function () { this.onerror = null; this.src = defaultCorner; };
      }
    });

    // 3. Siluet Wayang Mempelai Pria (Groom)
    const defaultGroom = "assets/images/wayang-arjuna.png";
    const groomWatermark = document.getElementById("wayang-groom-watermark");
    const showGroomWayang = assets.showWayangGroom !== false;
    let groomWayangSrc = normalizeMediaUrl(assets.wayangGroomImage || defaultGroom, "image");
    if (groomWayangSrc && !groomWayangSrc.startsWith("data:") && !groomWayangSrc.includes("?") && groomWayangSrc.includes("assets/")) {
      groomWayangSrc += `?v=${Date.now()}`;
    }

    if (groomWatermark) {
      groomWatermark.style.display = showGroomWayang ? "block" : "none";
      if (groomWayangSrc) {
        groomWatermark.src = groomWayangSrc;
        groomWatermark.onerror = function () { this.onerror = null; this.src = defaultGroom; };
      }
    }

    // 4. Siluet Wayang Mempelai Wanita (Bride)
    const defaultBride = "assets/images/wayang-srikandi.png";
    const brideWatermark = document.getElementById("wayang-bride-watermark");
    const showBrideWayang = assets.showWayangBride !== false;
    let brideWayangSrc = normalizeMediaUrl(assets.wayangBrideImage || defaultBride, "image");
    if (brideWayangSrc && !brideWayangSrc.startsWith("data:") && !brideWayangSrc.includes("?") && brideWayangSrc.includes("assets/")) {
      brideWayangSrc += `?v=${Date.now()}`;
    }

    if (brideWatermark) {
      brideWatermark.style.display = showBrideWayang ? "block" : "none";
      if (brideWayangSrc) {
        brideWatermark.src = brideWayangSrc;
        brideWatermark.onerror = function () { this.onerror = null; this.src = defaultBride; };
      }
    }

    // 5. Mini Wayang Dekorasi di Sampul Depan
    const coverWayangDecor = document.getElementById("cover-wayang-decor");
    const showCoverWayang = assets.showCoverWayang !== false;
    if (coverWayangDecor) {
      coverWayangDecor.style.display = showCoverWayang ? "flex" : "none";
    }

    const coverWayangGroom = document.getElementById("cover-wayang-groom-mini");
    const coverWayangBride = document.getElementById("cover-wayang-bride-mini");
    const defaultCoverGroom = "assets/images/wayang-arjuna.png";
    const defaultCoverBride = "assets/images/wayang-srikandi.png";
    const coverGroomSrc = normalizeMediaUrl(assets.coverWayangGroomImage || assets.wayangGroomImage || defaultCoverGroom, "image");
    const coverBrideSrc = normalizeMediaUrl(assets.coverWayangBrideImage || assets.wayangBrideImage || defaultCoverBride, "image");

    if (coverWayangGroom && coverGroomSrc) {
      coverWayangGroom.src = coverGroomSrc;
      coverWayangGroom.onerror = function () { this.onerror = null; this.src = defaultCoverGroom; };
    }
    if (coverWayangBride && coverBrideSrc) {
      coverWayangBride.src = coverBrideSrc;
      coverWayangBride.onerror = function () { this.onerror = null; this.src = defaultCoverBride; };
    }

    // 5b. Foto Background Utama Isi Undangan (Layar Setelah Buka Undangan)
    const mainBgImg = document.getElementById("main-bg-image");
    const bgPhotoSrc = assets.backgroundPhoto || activeConfig?.couple?.backgroundPhoto;
    if (mainBgImg && bgPhotoSrc) {
      const bgSrc = normalizeMediaUrl(bgPhotoSrc, "image");
      mainBgImg.src = bgSrc;
      mainBgImg.onerror = function () { this.onerror = null; this.src = "assets/images/background.jpg"; };
    }
    const mainBgOverlay = document.getElementById("main-bg-overlay");
    if (mainBgOverlay) {
      const overlayLevel = assets.backgroundOverlay || "medium";
      mainBgOverlay.className = `main-bg-overlay overlay-${overlayLevel}`;
    }
    const mainBgBatik = document.getElementById("main-bg-batik");
    if (mainBgBatik) {
      mainBgBatik.style.display = assets.showBackgroundBatik !== false ? "block" : "none";
    }

    // 6. Favicon / Ikon Tab Browser Kustom (Desktop & Mobile)
    updateBrowserFavicon(assets.favicon || "assets/images/favicon.png");
  }

  function updateBrowserFavicon(iconUrl) {
    if (!iconUrl) return;
    const cleanUrl = normalizeMediaUrl(iconUrl, "image");
    if (!cleanUrl) return;

    try {
      localStorage.setItem("wedding_custom_favicon", cleanUrl);
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

  function setTextAll(selector, text) {
    if (!text) return;
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      el.textContent = text;
    });
  }

  function setLink(elementId, url) {
    const el = document.getElementById(elementId);
    if (el) {
      if (url && url.trim().length > 0) {
        el.href = url;
        el.style.display = "inline-flex";
      } else {
        el.style.display = "none";
      }
    }
  }

  function setImage(elementId, src, altText) {
    const el = document.getElementById(elementId);
    if (el) {
      if (src) {
        let clean = normalizeMediaUrl(src, "image");
        if (clean && !clean.startsWith("data:") && !clean.includes("?") && clean.includes("assets/")) {
          clean += `?v=${Date.now()}`;
        }
        el.src = clean;
      }
      if (altText) el.alt = altText;
      el.onerror = function () {
        this.onerror = null;
        this.src = "assets/images/background.jpg";
      };
    }
  }

  function renderLoveStory(stories) {
    const container = document.getElementById("love-story-timeline");
    if (!container) return;

    if (!Array.isArray(stories) || stories.length === 0) {
      stories = (typeof WEDDING_CONFIG !== "undefined" && Array.isArray(WEDDING_CONFIG.loveStory))
        ? WEDDING_CONFIG.loveStory
        : [];
    }

    container.innerHTML = "";

    stories.forEach((item, index) => {
      const isEven = index % 2 === 0;
      const itemEl = document.createElement("div");
      itemEl.className = `timeline-item ${isEven ? "left" : "right"} animate-on-scroll`;

      const imgSrc = item.image || item.photo || item.src;
      let cleanImg = imgSrc ? normalizeMediaUrl(imgSrc, "image") : "";
      if (cleanImg && !cleanImg.startsWith("data:") && !cleanImg.includes("?") && cleanImg.includes("assets/")) {
        cleanImg += `?v=${Date.now()}`;
      }

      itemEl.innerHTML = `
        <div class="timeline-dot" title="${escapeHtml(item.year || '')}">
          <i class="fas fa-heart"></i>
        </div>
        <div class="timeline-content">
          ${cleanImg ? `
            <div class="timeline-img-box">
              <img src="${cleanImg}" alt="${escapeHtml(item.title || 'Momen Kisah')}" loading="lazy" onerror="this.parentElement.style.display='none'">
            </div>
          ` : ""}
          <span class="timeline-year"><i class="far fa-calendar-alt" style="margin-right: 4px;"></i>${escapeHtml(item.year || '')}</span>
          <h4 class="timeline-title">${escapeHtml(item.title || '')}</h4>
          <p class="timeline-desc">${escapeHtml(item.description || '')}</p>
        </div>
      `;

      container.appendChild(itemEl);
    });

    setupScrollAnimations();
  }

  function renderBankAccounts(accounts) {
    const container = document.getElementById("bank-accounts-container");
    if (!container || !Array.isArray(accounts)) return;

    container.innerHTML = "";

    accounts.forEach(acc => {
      const card = document.createElement("div");
      card.className = "bank-card animate-on-scroll";

      card.innerHTML = `
        <div class="bank-card-header">
          <span class="bank-badge">${escapeHtml(acc.badge || "BANK")}</span>
          <span class="bank-name">${escapeHtml(acc.bankName)}</span>
        </div>
        <div class="bank-card-body">
          <div class="account-number-box">
            <span class="account-number" id="acc-${escapeHtml(acc.accountNumber)}">${escapeHtml(acc.accountNumber)}</span>
            <button type="button" class="btn-copy" data-account="${escapeHtml(acc.accountNumber)}" aria-label="Salin Nomor Rekening">
              <i class="far fa-copy"></i> Salin
            </button>
          </div>
          <p class="account-holder">a.n. <strong>${escapeHtml(acc.accountHolder)}</strong></p>
        </div>
      `;

      container.appendChild(card);
    });

    container.querySelectorAll(".btn-copy").forEach(btn => {
      btn.addEventListener("click", function () {
        const textToCopy = this.getAttribute("data-account");
        copyToClipboard(textToCopy, "Nomor rekening berhasil disalin ke clipboard!");
      });
    });
  }

  function renderGallery(galleryItems) {
    const container = document.getElementById("gallery-grid");
    if (!container) return;

    if (!Array.isArray(galleryItems) || galleryItems.length === 0) {
      galleryItems = (typeof WEDDING_CONFIG !== "undefined" && Array.isArray(WEDDING_CONFIG.gallery))
        ? WEDDING_CONFIG.gallery
        : [];
    }

    container.innerHTML = "";

    galleryItems.forEach((item, index) => {
      const col = document.createElement("div");
      col.className = "gallery-item animate-on-scroll animated";

      const imgWrapper = document.createElement("div");
      imgWrapper.className = "gallery-img-wrapper";

      const rawSrc = typeof item === "string" ? item : (item.src || item.url || item.image || "");
      const captionText = typeof item === "string" ? "" : (item.caption || item.title || "");

      let cleanSrc = normalizeMediaUrl(rawSrc || "", "image");
      if (cleanSrc && !cleanSrc.startsWith("data:") && !cleanSrc.includes("?") && cleanSrc.includes("assets/")) {
        cleanSrc += `?v=${Date.now()}`;
      }
      const img = document.createElement("img");
      img.src = cleanSrc || "assets/images/background.jpg";
      img.alt = captionText || `Foto Galeri ${index + 1}`;
      img.className = "photo-reveal revealed";
      img.loading = "lazy";
      img.onerror = function () {
        this.onerror = null;
        this.src = "assets/images/background.jpg";
        this.classList.add("revealed");
      };
      img.onload = function () {
        this.classList.add("revealed");
      };

      const overlay = document.createElement("div");
      overlay.className = "gallery-overlay";
      overlay.innerHTML = `
        <div class="gallery-overlay-inner">
          <i class="fas fa-search-plus"></i>
          <span class="gallery-zoom-text">Perbesar</span>
          ${captionText ? `<p class="gallery-hover-caption">${escapeHtml(captionText)}</p>` : ""}
        </div>
      `;

      imgWrapper.appendChild(img);
      imgWrapper.appendChild(overlay);
      col.appendChild(imgWrapper);

      col.addEventListener("click", function () {
        openLightbox(index);
      });

      container.appendChild(col);
    });

    setupScrollAnimations();
  }

  function setupCoverUnlock() {
    const openBtn = document.getElementById("btn-open-invitation");
    const coverSection = document.getElementById("cover-section");

    if (!openBtn || !coverSection) return;

    if (openBtn.dataset.listenerAttached) return;
    openBtn.dataset.listenerAttached = "true";

    openBtn.addEventListener("click", function () {
      try {
        if (typeof MusicHandler !== "undefined" && MusicHandler.play) {
          MusicHandler.play();
        }
      } catch (audioErr) {
        console.warn("Audio play prevented:", audioErr);
      }

      coverSection.classList.add("opened");
      document.body.classList.remove("scroll-locked");

      setTimeout(() => {
        const homeSection = document.getElementById("home");
        if (homeSection) {
          homeSection.scrollIntoView({ behavior: "smooth" });
        }
        // Pastikan tab Home langsung terpilih aktif saat cover dibuka
        document.querySelectorAll(".nav-link").forEach(link => {
          if (link.getAttribute("href") === "#home") {
            link.classList.add("active");
          } else {
            link.classList.remove("active");
          }
        });
        setupScrollAnimations();
      }, 400);

      setTimeout(() => {
        coverSection.style.display = "none";
        setupScrollAnimations();
      }, 1400);
    });
  }

  let currentLightboxIndex = 0;

  function initLightbox() {
    const modal = document.getElementById("lightbox-modal");
    const closeBtn = document.getElementById("lightbox-close");
    const prevBtn = document.getElementById("lightbox-prev");
    const nextBtn = document.getElementById("lightbox-next");

    if (!modal) return;

    if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
    if (prevBtn) {
      prevBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        navigateLightbox(-1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        navigateLightbox(1);
      });
    }

    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeLightbox();
    });

    document.addEventListener("keydown", function (e) {
      if (!modal.classList.contains("active")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") navigateLightbox(-1);
      if (e.key === "ArrowRight") navigateLightbox(1);
    });

    // Event click untuk item galeri awal yang sudah ada di HTML
    document.querySelectorAll("#gallery-grid .gallery-item").forEach((el, idx) => {
      el.addEventListener("click", () => openLightbox(idx));
    });
    const qrisTrigger = document.getElementById("qris-preview-trigger");
    const qrisModal = document.getElementById("qris-modal");
    const qrisClose = document.getElementById("qris-modal-close");

    if (qrisTrigger && qrisModal) {
      qrisTrigger.addEventListener("click", () => {
        qrisModal.classList.add("active");
        document.body.classList.add("modal-open");
      });
      if (qrisClose) {
        qrisClose.addEventListener("click", () => {
          qrisModal.classList.remove("active");
          document.body.classList.remove("modal-open");
        });
      }
      qrisModal.addEventListener("click", (e) => {
        if (e.target === qrisModal) {
          qrisModal.classList.remove("active");
          document.body.classList.remove("modal-open");
        }
      });
    }
  }

  function openLightbox(index) {
    const items = activeConfig?.gallery || (typeof WEDDING_CONFIG !== "undefined" ? WEDDING_CONFIG.gallery : []);
    if (!items || items.length === 0) return;

    currentLightboxIndex = index;
    updateLightboxContent();

    const modal = document.getElementById("lightbox-modal");
    if (modal) {
      modal.classList.add("active");
      document.body.classList.add("modal-open");
    }
  }

  function closeLightbox() {
    const modal = document.getElementById("lightbox-modal");
    if (modal) {
      modal.classList.remove("active");
      document.body.classList.remove("modal-open");
    }
  }

  function navigateLightbox(direction) {
    const items = activeConfig?.gallery || (typeof WEDDING_CONFIG !== "undefined" ? WEDDING_CONFIG.gallery : []);
    if (!items || items.length === 0) return;

    currentLightboxIndex = (currentLightboxIndex + direction + items.length) % items.length;
    updateLightboxContent();
  }

  function updateLightboxContent() {
    const items = activeConfig?.gallery || (typeof WEDDING_CONFIG !== "undefined" ? WEDDING_CONFIG.gallery : []);
    const item = items[currentLightboxIndex];
    if (!item) return;

    const img = document.getElementById("lightbox-img");
    const caption = document.getElementById("lightbox-caption");
    const counter = document.getElementById("lightbox-counter");

    const rawSrc = typeof item === "string" ? item : (item.src || item.url || item.image || "");
    const captionText = typeof item === "string" ? "" : (item.caption || item.title || "");

    if (img) {
      img.src = normalizeMediaUrl(rawSrc, "image") || "assets/images/background.jpg";
      img.alt = captionText || "Foto Galeri";
    }
    if (caption) {
      caption.textContent = captionText || "";
    }
    if (counter) {
      counter.textContent = `${currentLightboxIndex + 1} / ${items.length}`;
    }
  }

  function copyToClipboard(text, successMessage) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(successMessage || "Berhasil disalin!");
      }).catch(() => {
        fallbackCopy(text, successMessage);
      });
    } else {
      fallbackCopy(text, successMessage);
    }
  }

  function fallbackCopy(text, successMessage) {
    const tempInput = document.createElement("textarea");
    tempInput.value = text;
    tempInput.style.position = "fixed";
    tempInput.style.opacity = "0";
    document.body.appendChild(tempInput);
    tempInput.focus();
    tempInput.select();
    try {
      document.execCommand("copy");
      showToast(successMessage || "Berhasil disalin!");
    } catch (err) {
      showToast("Gagal menyalin otomatis, silakan salin manual.");
    }
    document.body.removeChild(tempInput);
  }

  function showToast(message) {
    let toast = document.getElementById("global-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "global-toast";
      toast.className = "global-toast";
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
      toast.classList.remove("show");
    }, 3200);
  }

  /**
   * Format waktu yang ramah ("Baru saja", "5 menit lalu", dsb)
   */
  function formatTimeAgo(isoString) {
    if (!isoString) return "Baru saja";
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return "Baru saja";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} menit yang lalu`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} jam yang lalu`;
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  }

  /**
   * Kumpulan Data Stiker GIF Bergerak Animasi (Offline Local Assets)
   */
  const STICKERS_DATA = [
    { id: "cat-wink", category: "cat", name: "Kucing Kedip", emoji: "😉", url: "assets/stickers/cat-wink.gif" },
    { id: "cat-heart", category: "cat", name: "Kucing Hati", emoji: "💖", url: "assets/stickers/cat-heart.gif" },
    { id: "cat-dance", category: "cat", name: "Kucing Joget", emoji: "💃", url: "assets/stickers/cat-dance.gif" },
    { id: "cat-hug", category: "cat", name: "Kucing Pelukan", emoji: "🫂", url: "assets/stickers/cat-hug.gif" },
    { id: "cat-flowers", category: "cat", name: "Kucing Bunga", emoji: "💐", url: "assets/stickers/cat-flowers.gif" },
    { id: "cat-cute", category: "cat", name: "Kucing Gemas", emoji: "🐾", url: "assets/stickers/cat-cute.gif" },
    { id: "cat-love", category: "cat", name: "Kucing Cinta", emoji: "😻", url: "assets/stickers/cat-love.gif" },
    { id: "cat-popcorn", category: "cat", name: "Kucing Hore", emoji: "🍿", url: "assets/stickers/cat-popcorn.gif" },
    { id: "love-hearts", category: "love", name: "Hati Bertebaran", emoji: "💕", url: "assets/stickers/love-hearts.gif" },
    { id: "wedding-flowers", category: "love", name: "Bunga Cinta", emoji: "🌸", url: "assets/stickers/wedding-flowers.gif" },
    { id: "cheers", category: "party", name: "Bersulang Gelas", emoji: "🥂", url: "assets/stickers/cheers.gif" },
    { id: "party-celebrate", category: "party", name: "Pesta Meriah", emoji: "🎉", url: "assets/stickers/party-celebrate.gif" },
    { id: "applause", category: "party", name: "Tepuk Tangan", emoji: "👏", url: "assets/stickers/applause.gif" },
    { id: "happy-dance", category: "party", name: "Joget Bahagia", emoji: "🥳", url: "assets/stickers/happy-dance.gif" },
    { id: "congrats-jump", category: "party", name: "Lompat Selamat", emoji: "✨", url: "assets/stickers/congrats-jump.gif" },
    { id: "bear-hug", category: "animals", name: "Beruang Peluk", emoji: "🐻", url: "assets/stickers/bear-hug.gif" },
    { id: "bear-kiss", category: "animals", name: "Beruang Cium", emoji: "😘", url: "assets/stickers/bear-kiss.gif" },
    { id: "panda-love", category: "animals", name: "Panda Sayang", emoji: "🐼", url: "assets/stickers/panda-love.gif" },
    { id: "bunny-love", category: "animals", name: "Kelinci Manis", emoji: "🐰", url: "assets/stickers/bunny-love.gif" },
    { id: "shiba-happy", category: "animals", name: "Shiba Senyum", emoji: "🐶", url: "assets/stickers/shiba-happy.gif" },
    { id: "cat-roll", category: "cat", name: "Kucing Guling", emoji: "😸", url: "assets/stickers/cat-roll.gif" },
    { id: "cat-sleepy", category: "cat", name: "Kucing Bobo", emoji: "😴", url: "assets/stickers/cat-sleepy.gif" },
    { id: "cat-nyan", category: "cat", name: "Kucing Pelangi", emoji: "🌈", url: "assets/stickers/cat-nyan.gif" },
    { id: "cat-hug2", category: "cat", name: "Kucing Peluk Hangat", emoji: "🫂", url: "assets/stickers/cat-hug2.gif" },
    { id: "cat-purr", category: "cat", name: "Kucing Manja", emoji: "😻", url: "assets/stickers/cat-purr.gif" },
    { id: "cat-vibe", category: "cat", name: "Kucing Asyik", emoji: "🎧", url: "assets/stickers/cat-vibe.gif" },
    { id: "cat-hi", category: "cat", name: "Kucing Halo", emoji: "🐾", url: "assets/stickers/cat-hi.gif" },
    { id: "love-kiss", category: "love", name: "Kecup Mesra", emoji: "💋", url: "assets/stickers/love-kiss.gif" },
    { id: "love-sparkle", category: "love", name: "Hati Berbinar", emoji: "💖", url: "assets/stickers/love-sparkle.gif" },
    { id: "love-couple", category: "love", name: "Pasangan Bahagia", emoji: "👫", url: "assets/stickers/love-couple.gif" },
    { id: "love-dove", category: "love", name: "Merpati Cinta", emoji: "🕊️", url: "assets/stickers/love-dove.gif" },
    { id: "love-letter", category: "love", name: "Surat Cinta", emoji: "💌", url: "assets/stickers/love-letter.gif" },
    { id: "love-forever", category: "love", name: "Cinta Abadi", emoji: "♾️", url: "assets/stickers/love-forever.gif" },
    { id: "love-hands", category: "love", name: "Genggam Tangan", emoji: "🤝", url: "assets/stickers/love-hands.gif" },
    { id: "love-champagne", category: "love", name: "Tuang Sampanye", emoji: "🍾", url: "assets/stickers/love-champagne.gif" },
    { id: "party-confetti", category: "party", name: "Hujan Konfeti", emoji: "🎊", url: "assets/stickers/party-confetti.gif" },
    { id: "party-fireworks", category: "party", name: "Kembang Api", emoji: "🎆", url: "assets/stickers/party-fireworks.gif" },
    { id: "party-toast", category: "party", name: "Toast Bersulang", emoji: "🥂", url: "assets/stickers/party-toast.gif" },
    { id: "party-thumbsup", category: "party", name: "Jempol Mantap", emoji: "👍", url: "assets/stickers/party-thumbsup.gif" },
    { id: "party-hat", category: "party", name: "Topi Pesta", emoji: "🥳", url: "assets/stickers/party-hat.gif" },
    { id: "party-streamers", category: "party", name: "Pita Meriah", emoji: "🎗️", url: "assets/stickers/party-streamers.gif" },
    { id: "party-cheerleader", category: "party", name: "Sorak Semangat", emoji: "📣", url: "assets/stickers/party-cheerleader.gif" },
    { id: "duck-dance", category: "animals", name: "Bebek Goyang", emoji: "🦆", url: "assets/stickers/duck-dance.gif" },
    { id: "hamster-cute", category: "animals", name: "Hamster Gemas", emoji: "🐹", url: "assets/stickers/hamster-cute.gif" },
    { id: "bunny-hop", category: "animals", name: "Kelinci Lompat", emoji: "🐇", url: "assets/stickers/bunny-hop.gif" },
    { id: "otter-cute", category: "animals", name: "Berang-berang Lucu", emoji: "🦦", url: "assets/stickers/otter-cute.gif" },
    { id: "bird-sing", category: "animals", name: "Burung Kicau", emoji: "🐦", url: "assets/stickers/bird-sing.gif" },
    { id: "seal-spin", category: "animals", name: "Anjing Laut Putar", emoji: "🦭", url: "assets/stickers/seal-spin.gif" },
    { id: "animals-deer", category: "animals", name: "Rusa Manis", emoji: "🦌", url: "assets/stickers/animals-deer.gif" },
    { id: "animals-puppy", category: "animals", name: "Anak Anjing Ceria", emoji: "🐶", url: "assets/stickers/animals-puppy.gif" }
  ];
  window.STICKERS_DATA = STICKERS_DATA;

  function insertTextAtCursor(inputEl, text) {
    if (!inputEl) return;
    const start = inputEl.selectionStart || 0;
    const end = inputEl.selectionEnd || 0;
    const val = inputEl.value;
    inputEl.value = val.substring(0, start) + text + val.substring(end);
    inputEl.selectionStart = inputEl.selectionEnd = start + text.length;
    inputEl.focus();
  }

  function initQuickEmojis() {
    // 1. Emotikon cepat di Buku Tamu
    document.querySelectorAll("#guestbook-quick-emojis .quick-emoji-btn").forEach(btn => {
      btn.addEventListener("click", function () {
        const emoji = this.getAttribute("data-emoji");
        const msgInput = document.getElementById("guestbook-message");
        if (msgInput && emoji) {
          insertTextAtCursor(msgInput, emoji + " ");
        }
      });
    });

    // 2. Emotikon cepat di RSVP
    document.querySelectorAll("#rsvp-quick-emojis .quick-emoji-btn").forEach(btn => {
      btn.addEventListener("click", function () {
        const emoji = this.getAttribute("data-emoji");
        const msgInput = document.getElementById("rsvp-message");
        if (msgInput && emoji) {
          insertTextAtCursor(msgInput, emoji + " ");
        }
      });
    });
  }

  function initStickerPicker() {
    const toggleBtn = document.getElementById("btn-toggle-stickers");
    const rsvpToggleBtn = document.getElementById("btn-toggle-rsvp-stickers");
    const closeBtn = document.getElementById("btn-close-sticker-drawer");
    const drawer = document.getElementById("sticker-drawer");
    const grid = document.getElementById("sticker-grid");
    const hiddenInput = document.getElementById("guestbook-selected-sticker");
    const previewBox = document.getElementById("sticker-selected-preview");
    const previewImg = document.getElementById("preview-sticker-img");
    const previewName = document.getElementById("preview-sticker-name");
    const removeBtn = document.getElementById("btn-remove-sticker");

    const rsvpHiddenInput = document.getElementById("rsvp-selected-sticker");
    const rsvpPreviewBox = document.getElementById("rsvp-sticker-preview");
    const rsvpPreviewImg = document.getElementById("rsvp-preview-sticker-img");
    const rsvpPreviewName = document.getElementById("rsvp-preview-sticker-name");
    const rsvpRemoveBtn = document.getElementById("btn-remove-rsvp-sticker");

    let currentStickerTarget = "guestbook";

    if (!drawer || !grid) return;

    // Toggle drawer dari Form Buku Tamu
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        currentStickerTarget = "guestbook";
        const isVisible = drawer.style.display === "block";
        drawer.style.display = isVisible ? "none" : "block";
        if (toggleBtn.closest(".sticker-picker-section")) {
          toggleBtn.closest(".sticker-picker-section").appendChild(drawer);
        }
        if (!isVisible && grid.children.length === 0) {
          renderStickerGrid("all");
        }
      });
    }

    // Toggle drawer dari Form RSVP
    if (rsvpToggleBtn) {
      rsvpToggleBtn.addEventListener("click", () => {
        currentStickerTarget = "rsvp";
        const isVisible = drawer.style.display === "block";
        drawer.style.display = isVisible ? "none" : "block";
        if (rsvpToggleBtn.closest(".sticker-picker-section")) {
          rsvpToggleBtn.closest(".sticker-picker-section").appendChild(drawer);
        }
        if (!isVisible && grid.children.length === 0) {
          renderStickerGrid("all");
        }
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        drawer.style.display = "none";
      });
    }

    // Category filtering
    const catButtons = document.querySelectorAll(".sticker-cat-btn");
    catButtons.forEach(btn => {
      btn.addEventListener("click", function () {
        catButtons.forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        const cat = this.getAttribute("data-cat");
        renderStickerGrid(cat);
      });
    });

    // Remove selected sticker - Guestbook
    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        if (hiddenInput) hiddenInput.value = "";
        if (previewBox) previewBox.style.display = "none";
        document.querySelectorAll(".sticker-grid-item").forEach(item => item.classList.remove("selected"));
        showToast("Stiker ucapan dihapus.");
      });
    }

    // Remove selected sticker - RSVP
    if (rsvpRemoveBtn) {
      rsvpRemoveBtn.addEventListener("click", () => {
        if (rsvpHiddenInput) rsvpHiddenInput.value = "";
        if (rsvpPreviewBox) rsvpPreviewBox.style.display = "none";
        showToast("Stiker RSVP dihapus.");
      });
    }

    function renderStickerGrid(category) {
      grid.innerHTML = "";
      const filtered = category === "all"
        ? STICKERS_DATA
        : STICKERS_DATA.filter(s => s.category === category);

      const activeVal = currentStickerTarget === "rsvp" 
        ? (rsvpHiddenInput ? rsvpHiddenInput.value : "") 
        : (hiddenInput ? hiddenInput.value : "");

      filtered.forEach(stk => {
        const item = document.createElement("div");
        item.className = "sticker-grid-item";
        if (activeVal === stk.url) {
          item.classList.add("selected");
        }

        item.innerHTML = `
          <img src="${stk.url}" alt="${stk.name}" loading="lazy">
          <span title="${stk.name}">${stk.name}</span>
        `;

        item.addEventListener("click", () => {
          if (currentStickerTarget === "rsvp") {
            if (rsvpHiddenInput) rsvpHiddenInput.value = stk.url;
            if (rsvpPreviewImg) rsvpPreviewImg.src = stk.url;
            if (rsvpPreviewName) rsvpPreviewName.textContent = `${stk.emoji || '✨'} ${stk.name}`;
            if (rsvpPreviewBox) rsvpPreviewBox.style.display = "flex";
          } else {
            if (hiddenInput) hiddenInput.value = stk.url;
            if (previewImg) previewImg.src = stk.url;
            if (previewName) previewName.textContent = `${stk.emoji || '✨'} ${stk.name}`;
            if (previewBox) previewBox.style.display = "flex";
          }

          document.querySelectorAll(".sticker-grid-item").forEach(el => el.classList.remove("selected"));
          item.classList.add("selected");

          drawer.style.display = "none";
          showToast(`Stiker "${stk.name}" berhasil dipilih!`);
        });

        grid.appendChild(item);
      });
    }

    // Initial render
    renderStickerGrid("all");
  }

  /**
   * Inisialisasi Buku Tamu Real-time dengan Server API
   */
  function initGuestbook() {
    initQuickEmojis();
    initStickerPicker();

    const form = document.getElementById("guestbook-form");
    if (form) {
      form.addEventListener("submit", async function (e) {
        e.preventDefault();
        const nameInput = document.getElementById("guestbook-name");
        const msgInput = document.getElementById("guestbook-message");
        const stickerInput = document.getElementById("guestbook-selected-sticker");
        const previewBox = document.getElementById("sticker-selected-preview");

        const name = nameInput ? nameInput.value.trim() : "";
        const msg = msgInput ? msgInput.value.trim() : "";
        const sticker = stickerInput ? stickerInput.value.trim() : "";

        if (!name || !msg) {
          showToast("Harap isi nama dan ucapan Anda.");
          return;
        }

        const submitBtn = form.querySelector("button[type='submit']");
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Mengirim...`;
        }

        try {
          if (window.API && window.API.submitWish) {
            await window.API.submitWish({ name, message: msg, sticker });
            showToast("Alhamdulillah, doa & ucapan Anda berhasil terkirim!");
          } else {
            showToast("Ucapan tersimpan secara lokal.");
          }
        } catch (err) {
          console.error("Gagal mengirim ucapan:", err);
          showToast("Ucapan disimpan secara lokal.");
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="far fa-paper-plane"></i> <span>Kirim Ucapan</span>`;
          }
          if (msgInput) msgInput.value = "";
          if (stickerInput) stickerInput.value = "";
          if (previewBox) previewBox.style.display = "none";
          document.querySelectorAll(".sticker-grid-item").forEach(item => item.classList.remove("selected"));
          renderGuestbookEntries();
        }
      });
    }

    renderGuestbookEntries();
  }

  async function renderGuestbookEntries() {
    const container = document.getElementById("guestbook-list");
    const countEl = document.getElementById("guestbook-count");
    if (!container) return;

    let entries = [];

    // 1. Coba ambil dari Backend API server
    try {
      if (window.API && window.API.getWishes) {
        const res = await window.API.getWishes();
        if (res && res.success && Array.isArray(res.data)) {
          entries = res.data;
        }
      }
    } catch (e) {
      console.warn("API server wishes offline, fallback lokal:", e);
    }

    // 2. Gabungkan dengan ucapan tersimpan di local cache (Mode Mandiri / Offline)
    try {
      const localCached = JSON.parse(localStorage.getItem("wedding_cached_wishes") || "[]");
      if (Array.isArray(localCached) && localCached.length > 0) {
        const existingIds = new Set(entries.map(w => w.id));
        localCached.forEach(w => {
          if (!existingIds.has(w.id)) {
            entries.unshift(w);
            existingIds.add(w.id);
          }
        });
      }
    } catch (_) {}

    // 3. Fallback jika masih kosong sama sekali
    if (!entries || entries.length === 0) {
      entries = [
        {
          id: "def-1",
          name: "Budi & Keluarga",
          message: "Selamat menempuh hidup baru untuk kedua mempelai! Semoga menjadi keluarga yang sakinah, mawaddah, warahmah.",
          likes: 5,
          createdAt: new Date().toISOString()
        },
        {
          id: "def-2",
          name: "Siti Rahmawati & Rekan Kantor",
          message: "Barakallahu lakum wa baraka alaikum wa jama'a bainakuma fii khoir. Turut berbahagia untuk sahabat kami tercinta!",
          likes: 8,
          createdAt: new Date().toISOString()
        }
      ];
    }

    if (countEl) countEl.textContent = "";

    container.innerHTML = "";

    // Ambil daftar ucapan yang telah disukai tamu ini dari localStorage
    let userLikedMap = {};
    try {
      userLikedMap = JSON.parse(localStorage.getItem("wedding_user_liked_wishes") || "{}");
    } catch (_) {}

    // Ambil peta likes tersimpan agar tidak pernah hilang saat refresh/kirim ucapan
    let localLikesMap = {};
    try {
      localLikesMap = JSON.parse(localStorage.getItem("wedding_wishes_likes_map") || "{}");
    } catch (_) {}

    entries.forEach(item => {
      const card = document.createElement("div");
      card.className = "wish-card";

      const initial = item.name ? item.name.charAt(0).toUpperCase() : "U";

      const avatar = document.createElement("div");
      avatar.className = "wish-avatar";
      avatar.textContent = initial;

      const body = document.createElement("div");
      body.className = "wish-body";

      const header = document.createElement("div");
      header.className = "wish-header";

      const nameEl = document.createElement("span");
      nameEl.className = "wish-name";
      nameEl.textContent = item.name;

      const dateEl = document.createElement("span");
      dateEl.className = "wish-date";
      dateEl.textContent = formatTimeAgo(item.createdAt || item.date);

      header.appendChild(nameEl);
      header.appendChild(dateEl);

      const messageEl = document.createElement("p");
      messageEl.className = "wish-text";
      messageEl.textContent = item.message;

      // Render Stiker GIF jika ada
      let stickerEl = null;
      if (item.sticker) {
        stickerEl = document.createElement("div");
        stickerEl.className = "wish-sticker-wrapper";
        const stickerImg = document.createElement("img");
        stickerImg.src = item.sticker;
        stickerImg.alt = "Stiker Ucapan";
        stickerImg.className = "wish-sticker-img";
        stickerImg.loading = "lazy";
        stickerImg.onerror = function () { this.parentElement.style.display = "none"; };
        stickerEl.appendChild(stickerImg);
      }

      // Fitur Like & Unlike Hati Interaktif & Persisten
      const footerEl = document.createElement("div");
      footerEl.className = "wish-footer";
      footerEl.style.cssText = "display: flex; align-items: center; gap: 6px; margin-top: 8px;";

      const initialLikes = typeof localLikesMap[item.id] === "number"
        ? localLikesMap[item.id]
        : (item.likes || 0);

      const isLikedByMe = Boolean(userLikedMap[item.id]);

      const likeBtn = document.createElement("button");
      likeBtn.type = "button";
      likeBtn.className = isLikedByMe ? "btn-like-wish liked" : "btn-like-wish";
      likeBtn.style.cssText = isLikedByMe
        ? "background: rgba(239, 68, 68, 0.16); border: 1px solid rgba(239, 68, 68, 0.45); border-radius: 20px; padding: 4px 10px; cursor: pointer; color: #ef4444; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 5px; font-weight: 600; transition: transform 0.15s ease, background 0.2s ease;"
        : "background: rgba(239, 68, 68, 0.06); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 20px; padding: 4px 10px; cursor: pointer; color: #ef4444; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 5px; transition: transform 0.15s ease, background 0.2s ease;";
      likeBtn.innerHTML = isLikedByMe
        ? `<i class="fas fa-heart"></i> <span class="like-count">${initialLikes}</span>`
        : `<i class="far fa-heart"></i> <span class="like-count">${initialLikes}</span>`;
      likeBtn.title = isLikedByMe ? "Batalkan Suka (Unlike)" : "Sukai Ucapan (Like)";

      likeBtn.addEventListener("click", async function (e) {
        e.preventDefault();

        // Cek status like saat ini
        let myLikedState = false;
        try {
          const currentMap = JSON.parse(localStorage.getItem("wedding_user_liked_wishes") || "{}");
          myLikedState = Boolean(currentMap[item.id]);
        } catch (_) {}

        const countSpan = likeBtn.querySelector(".like-count");
        let currentLikes = parseInt(countSpan.textContent, 10) || 0;

        if (myLikedState) {
          // --- AKSI UNLIKE: Kurang 1 ---
          currentLikes = Math.max(0, currentLikes - 1);
          countSpan.textContent = currentLikes;
          item.likes = currentLikes;

          likeBtn.className = "btn-like-wish";
          likeBtn.style.background = "rgba(239, 68, 68, 0.06)";
          likeBtn.style.borderColor = "rgba(239, 68, 68, 0.2)";
          likeBtn.innerHTML = `<i class="far fa-heart"></i> <span class="like-count">${currentLikes}</span>`;
          likeBtn.title = "Sukai Ucapan (Like)";

          // Perbarui status user liked di localStorage
          try {
            const currentMap = JSON.parse(localStorage.getItem("wedding_user_liked_wishes") || "{}");
            delete currentMap[item.id];
            localStorage.setItem("wedding_user_liked_wishes", JSON.stringify(currentMap));
          } catch (_) {}

          // Simpan hitungan di likes map
          try {
            const map = JSON.parse(localStorage.getItem("wedding_wishes_likes_map") || "{}");
            map[item.id] = currentLikes;
            localStorage.setItem("wedding_wishes_likes_map", JSON.stringify(map));
          } catch (_) {}

          // Update cached wishes jika ada
          try {
            const cached = JSON.parse(localStorage.getItem("wedding_cached_wishes") || "[]");
            const target = cached.find(w => w.id === item.id);
            if (target) {
              target.likes = currentLikes;
              localStorage.setItem("wedding_cached_wishes", JSON.stringify(cached));
            }
          } catch (_) {}

          // Sinkron ke API unlike
          try {
            if (window.API && window.API.unlikeWish && item.id) {
              const res = await window.API.unlikeWish(item.id);
              if (res && typeof res.likes === "number") {
                countSpan.textContent = res.likes;
                item.likes = res.likes;
                const map = JSON.parse(localStorage.getItem("wedding_wishes_likes_map") || "{}");
                map[item.id] = res.likes;
                localStorage.setItem("wedding_wishes_likes_map", JSON.stringify(map));
              }
            }
          } catch (_) {}
        } else {
          // --- AKSI LIKE: Tambah 1 ---
          currentLikes++;
          countSpan.textContent = currentLikes;
          item.likes = currentLikes;

          // Animasi detak hati (bounce)
          likeBtn.style.transform = "scale(1.25)";
          likeBtn.style.background = "rgba(239, 68, 68, 0.22)";
          setTimeout(() => {
            likeBtn.style.transform = "scale(1)";
            likeBtn.style.background = "rgba(239, 68, 68, 0.16)";
          }, 200);

          likeBtn.className = "btn-like-wish liked";
          likeBtn.style.borderColor = "rgba(239, 68, 68, 0.45)";
          likeBtn.innerHTML = `<i class="fas fa-heart"></i> <span class="like-count">${currentLikes}</span>`;
          likeBtn.title = "Batalkan Suka (Unlike)";

          // Perbarui status user liked di localStorage
          try {
            const currentMap = JSON.parse(localStorage.getItem("wedding_user_liked_wishes") || "{}");
            currentMap[item.id] = true;
            localStorage.setItem("wedding_user_liked_wishes", JSON.stringify(currentMap));
          } catch (_) {}

          // Simpan hitungan di likes map
          try {
            const map = JSON.parse(localStorage.getItem("wedding_wishes_likes_map") || "{}");
            map[item.id] = currentLikes;
            localStorage.setItem("wedding_wishes_likes_map", JSON.stringify(map));
          } catch (_) {}

          // Update cached wishes jika ada
          try {
            const cached = JSON.parse(localStorage.getItem("wedding_cached_wishes") || "[]");
            const target = cached.find(w => w.id === item.id);
            if (target) {
              target.likes = currentLikes;
              localStorage.setItem("wedding_cached_wishes", JSON.stringify(cached));
            }
          } catch (_) {}

          // Sinkron ke API like
          try {
            if (window.API && window.API.likeWish && item.id) {
              const res = await window.API.likeWish(item.id);
              if (res && typeof res.likes === "number") {
                countSpan.textContent = res.likes;
                item.likes = res.likes;
                const map = JSON.parse(localStorage.getItem("wedding_wishes_likes_map") || "{}");
                map[item.id] = res.likes;
                localStorage.setItem("wedding_wishes_likes_map", JSON.stringify(map));
              }
            }
          } catch (_) {}
        }
      });

      footerEl.appendChild(likeBtn);

      body.appendChild(header);
      body.appendChild(messageEl);
      if (stickerEl) {
        body.appendChild(stickerEl);
      }
      body.appendChild(footerEl);

      card.appendChild(avatar);
      card.appendChild(body);
      container.appendChild(card);
    });
  }

  function setupNavigation() {
    const navLinks = document.querySelectorAll(".nav-link");
    const sections = document.querySelectorAll("header[id], section[id]");

    const setActiveLink = (targetId) => {
      navLinks.forEach(link => {
        const href = link.getAttribute("href");
        if (href === `#${targetId}`) {
          link.classList.add("active");
          try {
            link.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
          } catch (_) {}
        } else {
          link.classList.remove("active");
        }
      });
    };

    navLinks.forEach(link => {
      link.addEventListener("click", function (e) {
        const targetHref = this.getAttribute("href");
        if (targetHref && targetHref.startsWith("#")) {
          e.preventDefault();
          const cleanId = targetHref.substring(1);
          setActiveLink(cleanId);
          const targetSection = document.getElementById(cleanId);
          if (targetSection) {
            targetSection.scrollIntoView({ behavior: "smooth" });
          }
        }
      });
    });

    // Pastikan #home tetap aktif saat berada di bagian puncak layar (scrollY < 250)
    window.addEventListener("scroll", () => {
      if (window.scrollY < 250) {
        setActiveLink("home");
      }
    }, { passive: true });

    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver((entries) => {
      // Jika masih di area atas/home, jangan pindahkan ke section bawah
      if (window.scrollY < 250) {
        setActiveLink("home");
        return;
      }

      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("id");
          if (id) {
            setActiveLink(id);
          }
        }
      });
    }, { threshold: 0.15, rootMargin: "-70px 0px -40% 0px" });

    sections.forEach(sec => observer.observe(sec));
  }

  let scrollObserver = null;

  function setupScrollAnimations() {
    const animatedElements = document.querySelectorAll(".animate-on-scroll:not(.animated), .photo-reveal:not(.revealed)");

    if (!("IntersectionObserver" in window)) {
      animatedElements.forEach(el => {
        el.classList.add("animated");
        el.classList.add("revealed");
      });
      return;
    }

    if (!scrollObserver) {
      scrollObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animated");
            entry.target.classList.add("revealed");
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.05, rootMargin: "0px 0px 100px 0px" });
    }

    animatedElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight + 150 && rect.bottom > -50) {
        el.classList.add("animated");
        el.classList.add("revealed");
      } else {
        scrollObserver.observe(el);
      }
    });
  }

  function setupBackToTop() {
    const btn = document.getElementById("back-to-top-btn");
    if (!btn) return;

    window.addEventListener("scroll", () => {
      if (window.scrollY > 400) {
        btn.classList.add("visible");
      } else {
        btn.classList.remove("visible");
      }
    });

    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  async function init() {
    // 0. Bersihkan data mock/stale lama di localStorage jika mengandung nama pengujian
    try {
      const localCustom = localStorage.getItem("wedding_custom_settings");
      if (localCustom && /Prabowo|Teddy|Dimas|Anindya|agus|agis/i.test(localCustom)) {
        localStorage.removeItem("wedding_custom_settings");
      }
    } catch (_) {}

    // 1. Setup fitur pembuka cover LANGSUNG secara sinkron agar tombol selalu siap diklik
    setupCoverUnlock();

    // 2. Isi konten awal dari WEDDING_CONFIG lokal segera agar tidak menunggu jaringan
    if (typeof WEDDING_CONFIG !== "undefined") {
      populateContent(WEDDING_CONFIG);
    }

    // 3. Setup fitur interaktif
    initLightbox();
    initGuestbook();
    setupNavigation();
    setupScrollAnimations();
    setupBackToTop();

    // 4. Ambil data konfigurasi terbaru dari backend secara asynchronous
    try {
      if (window.API && window.API.getInvitationConfig) {
        const configData = await window.API.getInvitationConfig();
        if (configData) {
          populateContent(configData);
          setupScrollAnimations();
        }
      }
    } catch (err) {
      console.warn("Menggunakan konfigurasi lokal:", err);
    }
  }

  return {
    init: init,
    populateContent: populateContent,
    refreshWishes: renderGuestbookEntries,
    showToast: showToast,
    copyToClipboard: copyToClipboard
  };
})();

window.MainApp = MainApp;

// Jalankan saat DOM telah siap (Mendukung async, interactive, & complete state)
function runMainInit() {
  if (typeof GuestHandler !== "undefined") GuestHandler.init();
  if (typeof MusicHandler !== "undefined") MusicHandler.init();
  if (typeof CountdownHandler !== "undefined") CountdownHandler.init();
  if (typeof RsvpHandler !== "undefined") RsvpHandler.init();
  if (typeof QrCodeHandler !== "undefined") QrCodeHandler.init();
  if (typeof WeddingParticles !== "undefined") {
    const animCfg = (typeof WEDDING_CONFIG !== "undefined" && WEDDING_CONFIG.animation)
      ? WEDDING_CONFIG.animation
      : null;
    WeddingParticles.init(animCfg);
  }
  if (typeof MainApp !== "undefined") MainApp.init();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runMainInit);
} else {
  runMainInit();
}

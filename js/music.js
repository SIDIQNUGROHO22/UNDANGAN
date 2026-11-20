/**
 * ==============================================================================
 * AESTHETIC MUSIC HANDLER (js/music.js) - MULTI-SOURCE & FLOATING VINYL DISC
 * ==============================================================================
 * Mengendalikan pemutaran musik latar pengiring pernikahan dari berbagai sumber:
 * 1. YouTube (Link Share / Video YouTube via YouTube IFrame API).
 * 2. File Lokal Offline (.mp3 di folder assets/music/).
 * 3. URL Audio Online (Direct MP3, CDN, Cloud, Google Drive, Dropbox).
 *
 * Fitur:
 * - Piringan hitam berputar halus (spinning disc) saat lagu berputar.
 * - Mini equalizer gelombang suara (soundwaves) yang hidup selaras irama.
 * - Tooltip melayang menampilkan judul lagu tanpa menutupi konten undangan.
 * - Tombol play/pause 1-klik yang responsif di smartphone maupun desktop.
 * - Otomatis mulai berputar saat tombol 'Buka Undangan' ditekan.
 * ==============================================================================
 */

const MusicHandler = (function () {
  let audioElement = null;
  let ytPlayer = null;
  let isYtReady = false;
  let isYtLoading = false;
  let activeEngine = "html5"; // "html5" atau "youtube"
  let isPlaying = false;
  let shouldPlayAfterReady = false;
  let tooltipTimeout = null;

  /**
   * Mengekstrak YouTube Video ID dari berbagai variasi URL:
   * - https://youtu.be/VIDEO_ID
   * - https://www.youtube.com/watch?v=VIDEO_ID
   * - https://youtube.com/shorts/VIDEO_ID
   * - https://m.youtube.com/watch?v=VIDEO_ID
   */
  function extractYouTubeId(url) {
    if (!url || typeof url !== "string") return "";
    url = url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    return (match && match[1]) ? match[1] : "";
  }

  /**
   * Menormalisasi URL audio dari Google Drive atau Dropbox
   */
  function normalizeAudioUrl(url) {
    if (!url || typeof url !== "string") return "";
    url = url.trim();

    // Google Drive share link -> direct stream link
    const gDriveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (gDriveMatch && gDriveMatch[1]) {
      return `https://docs.google.com/uc?export=download&id=${gDriveMatch[1]}`;
    }

    // Dropbox link -> direct download link
    if (url.includes("dropbox.com") && url.includes("dl=0")) {
      return url.replace("dl=0", "raw=1");
    }

    return url;
  }

  /**
   * Memuat skrip YouTube IFrame API secara dinamis
   */
  function loadYouTubeIframeApi(callback) {
    if (window.YT && window.YT.Player) {
      if (callback) callback();
      return;
    }

    if (isYtLoading) {
      const checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkInterval);
          if (callback) callback();
        }
      }, 100);
      return;
    }

    isYtLoading = true;
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    if (firstScriptTag && firstScriptTag.parentNode) {
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    } else {
      document.head.appendChild(tag);
    }

    const previousOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof previousOnReady === "function") previousOnReady();
      isYtLoading = false;
      if (callback) callback();
    };
  }

  /**
   * Menginisialisasi player YouTube
   */
  function initYouTubePlayer(videoId) {
    if (!videoId) return;

    loadYouTubeIframeApi(() => {
      const container = document.getElementById("youtube-audio-frame");
      if (!container) return;

      if (ytPlayer && typeof ytPlayer.loadVideoById === "function") {
        ytPlayer.loadVideoById({
          videoId: videoId,
          startSeconds: 0
        });
        if (shouldPlayAfterReady) {
          ytPlayer.playVideo();
        }
        return;
      }

      try {
        ytPlayer = new YT.Player("youtube-audio-frame", {
          height: "180",
          width: "320",
          videoId: videoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            loop: 1,
            playlist: videoId,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin
          },
          events: {
            onReady: function (event) {
              isYtReady = true;
              event.target.setVolume(100);
              if (shouldPlayAfterReady) {
                event.target.playVideo();
                shouldPlayAfterReady = false;
              }
            },
            onStateChange: function (event) {
              if (event.data === YT.PlayerState.PLAYING) {
                isPlaying = true;
                updateMusicUI(true);
                showTooltipTemporarily();
              } else if (event.data === YT.PlayerState.PAUSED) {
                isPlaying = false;
                updateMusicUI(false);
                showTooltipTemporarily("Musik Dijeda");
              } else if (event.data === YT.PlayerState.ENDED) {
                // Loop video
                event.target.playVideo();
              }
            },
            onError: function (err) {
              handleYouTubeError(err);
            }
          }
        });
      } catch (err) {
        console.warn("Gagal inisialisasi YouTube Player:", err);
        handleYouTubeError(err);
      }
    });
  }

  function handleYouTubeError(err) {
    const errorCode = (err && typeof err.data !== "undefined") ? err.data : (typeof err === "number" ? err : 0);
    console.warn("YouTube Player error code:", errorCode, err);

    let errorMsg = "Video YouTube dibatasi";
    if (errorCode === 150 || errorCode === 101) {
      errorMsg = "Video YouTube ini dibatasi hak cipta (Error 150 - Tidak boleh di-embed). Silakan ganti link YouTube lain atau unggah file MP3 di Admin!";
    } else if (errorCode === 100) {
      errorMsg = "Video YouTube tidak ditemukan (Error 100)";
    } else if (errorCode === 2) {
      errorMsg = "Format link YouTube tidak valid";
    }

    const musicCfg = (window.CURRENT_CONFIG?.music)
      || (typeof WEDDING_CONFIG !== "undefined" ? WEDDING_CONFIG.music : null);

    // Cek apakah ada file cadangan kustom yang BUKAN default instrumental
    const customFallback = (musicCfg?.filePath && musicCfg.filePath !== "assets/music/lagu-undangan.mp3")
      ? musicCfg.filePath
      : null;

    if (customFallback) {
      console.info("Beralih ke file audio cadangan kustom:", customFallback);
      activeEngine = "html5";
      if (audioElement) {
        audioElement.src = normalizeAudioUrl(customFallback);
        if (shouldPlayAfterReady || isPlaying) playMusic();
      }
      showTooltipTemporarily(`Beralih: ${musicCfg?.title || 'Musik Kustom'}`);
    } else {
      // PENTING: Jangan paksa putar instrumental default jika user memilih YouTube tapi diblokir oleh pemilik video
      isPlaying = false;
      updateMusicUI(false, true);
      showTooltipTemporarily(errorMsg);
      console.warn(`[MusicHandler] ${errorMsg}. Default instrumental tidak diputar paksa agar tidak menimbulkan kebingungan.`);
    }
  }

  function fallbackToHtml5() {
    activeEngine = "html5";
    const musicCfg = (window.CURRENT_CONFIG?.music)
      || (typeof WEDDING_CONFIG !== "undefined" ? WEDDING_CONFIG.music : null);
    const targetSrc = (musicCfg?.filePath && musicCfg.filePath !== "assets/music/lagu-undangan.mp3")
      ? musicCfg.filePath
      : null;

    if (audioElement && targetSrc) {
      audioElement.src = normalizeAudioUrl(targetSrc);
      if (shouldPlayAfterReady) {
        playMusic();
      }
    }
  }

  /**
   * Menginisialisasi audio player
   */
  function initAudio() {
    const musicCfg = (window.CURRENT_CONFIG?.music)
      || (typeof WEDDING_CONFIG !== "undefined" ? WEDDING_CONFIG.music : null);

    const isYtConfig = (musicCfg?.sourceType === "youtube");
    const ytUrl = musicCfg?.youtubeUrl || "";
    const ytId = isYtConfig ? (musicCfg?.youtubeId || extractYouTubeId(ytUrl)) : "";
    const rawPath = musicCfg?.filePath || "assets/music/lagu-undangan.mp3";
    const isYouTube = isYtConfig && Boolean(ytId);

    // Setup HTML5 Audio element
    if (!audioElement) {
      audioElement = new Audio();
      audioElement.loop = true;
      audioElement.preload = "auto";

      audioElement.addEventListener("play", function () {
        if (activeEngine === "html5") {
          isPlaying = true;
          updateMusicUI(true);
          showTooltipTemporarily();
        }
      });

      audioElement.addEventListener("pause", function () {
        if (activeEngine === "html5") {
          isPlaying = false;
          updateMusicUI(false);
          showTooltipTemporarily("Musik Dijeda");
        }
      });

      audioElement.addEventListener("error", function () {
        if (activeEngine === "html5") {
          console.warn("File audio HTML5 tidak dapat diputar:", audioElement.src);
          updateMusicUI(false, true);
        }
      });
    }

    if (isYouTube && ytId) {
      activeEngine = "youtube";
      initYouTubePlayer(ytId);
    } else {
      activeEngine = "html5";
      audioElement.src = normalizeAudioUrl(rawPath);
    }

    // Set judul lagu pada tooltip
    const trackTitle = musicCfg?.title || "Romantic Gending Jawa";
    const titleEl = document.getElementById("vinyl-track-title");
    if (titleEl) {
      titleEl.textContent = trackTitle;
    }

    // Set foto cover pada tengah piringan hitam
    const coverArt = (window.CURRENT_CONFIG?.couple?.coverPhoto)
      || (typeof WEDDING_CONFIG !== "undefined" && WEDDING_CONFIG.couple?.coverPhoto)
      || "assets/images/cover.jpg";

    const artImg = document.getElementById("vinyl-label-img");
    if (artImg) {
      artImg.src = coverArt;
      artImg.onerror = function () {
        this.onerror = null;
        this.src = "assets/images/background.jpg";
      };
    }

    // Pasang listener pada Widget Piringan Hitam Vinyl
    const vinylWidget = document.getElementById("aesthetic-music-widget");
    if (vinylWidget && !vinylWidget.dataset.bound) {
      vinylWidget.dataset.bound = "true";
      vinylWidget.addEventListener("click", function (e) {
        e.preventDefault();
        togglePlay();
      });

      vinylWidget.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          togglePlay();
        }
      });
    }

    // Pasang fallback tombol musik legacy jika ada
    const legacyBtn = document.getElementById("music-toggle-btn");
    if (legacyBtn && !legacyBtn.dataset.bound) {
      legacyBtn.dataset.bound = "true";
      legacyBtn.addEventListener("click", togglePlay);
    }
  }

  /**
   * Menampilkan tooltip judul lagu sejenak lalu memudar
   */
  function showTooltipTemporarily(customText) {
    const tooltip = document.getElementById("vinyl-tooltip-pill");
    const titleEl = document.getElementById("vinyl-track-title");
    if (!tooltip) return;

    if (customText && titleEl) {
      titleEl.textContent = customText;
    } else if (titleEl) {
      const musicCfg = (window.CURRENT_CONFIG?.music)
        || (typeof WEDDING_CONFIG !== "undefined" ? WEDDING_CONFIG.music : null);
      titleEl.textContent = musicCfg?.title || "Romantic Wedding Music";
    }

    tooltip.classList.add("visible");

    if (tooltipTimeout) clearTimeout(tooltipTimeout);
    tooltipTimeout = setTimeout(() => {
      tooltip.classList.remove("visible");
    }, 3200);
  }

  /**
   * Memperbarui tampilan antarmuka widget musik piringan hitam
   */
  function updateMusicUI(active, hasError = false) {
    const widget = document.getElementById("aesthetic-music-widget");
    const stateIcon = document.getElementById("vinyl-icon-state");
    const waves = document.getElementById("vinyl-soundwaves");
    const legacyBtn = document.getElementById("music-toggle-btn");

    if (hasError) {
      if (widget) {
        widget.classList.remove("playing");
        widget.classList.add("error");
        widget.title = "Musik pengiring tidak tersedia";
      }
      if (stateIcon) stateIcon.className = "fas fa-volume-mute";
      if (waves) waves.style.display = "none";
      return;
    }

    if (active) {
      if (widget) {
        widget.classList.add("playing");
        widget.classList.remove("error");
        widget.title = "Klik untuk Jeda Musik";
        widget.setAttribute("aria-label", "Jeda Musik");
      }
      if (stateIcon) stateIcon.className = "fas fa-pause";
      if (waves) waves.style.display = "flex";
      if (legacyBtn) legacyBtn.classList.add("playing");
    } else {
      if (widget) {
        widget.classList.remove("playing");
        widget.classList.remove("error");
        widget.title = "Klik untuk Putar Musik";
        widget.setAttribute("aria-label", "Putar Musik");
      }
      if (stateIcon) stateIcon.className = "fas fa-play";
      if (waves) waves.style.display = "none";
      if (legacyBtn) legacyBtn.classList.remove("playing");
    }
  }

  /**
   * Memutar musik latar
   */
  function playMusic() {
    if (activeEngine === "youtube") {
      if (ytPlayer && typeof ytPlayer.playVideo === "function" && isYtReady) {
        try {
          ytPlayer.playVideo();
        } catch (e) {
          console.warn("YT play error:", e);
        }
      } else {
        shouldPlayAfterReady = true;
      }
    } else {
      if (audioElement) {
        audioElement.play().then(() => {
          isPlaying = true;
          updateMusicUI(true);
        }).catch(err => {
          console.warn("Autoplay audio dicegah browser:", err);
          isPlaying = false;
          updateMusicUI(false);
        });
      }
    }
  }

  /**
   * Menjeda musik
   */
  function pauseMusic() {
    if (activeEngine === "youtube") {
      if (ytPlayer && typeof ytPlayer.pauseVideo === "function") {
        try {
          ytPlayer.pauseVideo();
        } catch (e) {}
      }
      isPlaying = false;
      updateMusicUI(false);
    } else {
      if (audioElement) {
        audioElement.pause();
        isPlaying = false;
        updateMusicUI(false);
      }
    }
  }

  /**
   * Beralih antara putar dan jeda (Play/Pause)
   */
  function togglePlay() {
    if (isPlaying) {
      pauseMusic();
    } else {
      playMusic();
    }
  }

  /**
   * Mengatur lagu baru secara dinamis dari API / Admin
   */
  function setTrack(newSrc, newTitle, newArtist, newSourceType, customFilePath) {
    if (!newSrc && !newTitle && !customFilePath) return;

    const isYt = (newSourceType === "youtube");
    const ytId = isYt ? extractYouTubeId(newSrc) : "";

    if (newTitle) {
      const titleEl = document.getElementById("vinyl-track-title");
      if (titleEl) titleEl.textContent = newTitle;
    }

    if (isYt && ytId) {
      if (audioElement) audioElement.pause();
      activeEngine = "youtube";
      initYouTubePlayer(ytId);
      if (isPlaying) playMusic();
    } else {
      if (ytPlayer && typeof ytPlayer.pauseVideo === "function") {
        try { ytPlayer.pauseVideo(); } catch (_) {}
      }
      activeEngine = "html5";
      const chosenSrc = (!isYt && newSrc) ? newSrc : customFilePath;
      if (audioElement && chosenSrc) {
        const cleanUrl = normalizeAudioUrl(chosenSrc);
        if (audioElement.src !== cleanUrl) {
          audioElement.src = cleanUrl;
          if (isPlaying) playMusic();
        }
      }
    }
  }

  return {
    init: initAudio,
    play: playMusic,
    pause: pauseMusic,
    toggle: togglePlay,
    setTrack: setTrack,
    extractYouTubeId: extractYouTubeId,
    normalizeAudioUrl: normalizeAudioUrl,
    isPlaying: function () {
      return isPlaying;
    },
    getActiveEngine: function () {
      return activeEngine;
    }
  };
})();

window.MusicHandler = MusicHandler;

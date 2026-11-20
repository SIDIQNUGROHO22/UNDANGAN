/**
 * ==============================================================================
 * DYNAMIC ISLAND COMPONENT (dynamic-island.js)
 * ==============================================================================
 * Komponen Capsule Pill mengambang di bagian atas layar terinspirasi dari iPhone
 * Dynamic Island, disesuaikan dengan estetika elegan pernikahan.
 * 
 * Fitur:
 * - Status ringkas (Collapsed Pill) dengan audio visualizer equalizer saat lagu berputar.
 * - Tampilan luas (Expanded View) saat ditekan: kontrol audio, progres, & pintasan cepat.
 * - Animasi buka/tutup yang halus dan transisi CSS cubic-bezier.
 * - Sinkronisasi dua arah dengan MusicHandler.
 * - Responsif untuk smartphone, tablet, dan desktop tanpa menutupi konten penting.
 * ==============================================================================
 */

const DynamicIsland = (function () {
  let islandEl = null;
  let isExpanded = false;

  function init() {
    islandEl = document.getElementById("dynamic-island");
    if (!islandEl) return;

    const compactTrigger = document.getElementById("di-compact-trigger");
    const collapseBtn = document.getElementById("di-btn-collapse");
    const miniPlayBtn = document.getElementById("di-mini-play-btn");
    const mainPlayBtn = document.getElementById("di-main-play-btn");
    const muteBtn = document.getElementById("di-toggle-mute");
    const prevBtn = document.getElementById("di-prev-track");

    // Klik kapsul ringkas -> Perbesar
    if (compactTrigger) {
      compactTrigger.addEventListener("click", function (e) {
        // Jangan buka jika yang diklik tombol play mini
        if (e.target.closest("#di-mini-play-btn")) return;
        toggleExpand();
      });
    }

    // Tombol tutup
    if (collapseBtn) {
      collapseBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        collapse();
      });
    }

    // Tutup saat klik di luar kapsul
    document.addEventListener("click", function (e) {
      if (isExpanded && islandEl && !islandEl.contains(e.target)) {
        collapse();
      }
    });

    // Kontrol Play/Pause Mini & Utama
    if (miniPlayBtn) {
      miniPlayBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (typeof MusicHandler !== "undefined") {
          MusicHandler.toggle();
        }
      });
    }

    if (mainPlayBtn) {
      mainPlayBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (typeof MusicHandler !== "undefined") {
          MusicHandler.toggle();
        }
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        if (typeof MusicHandler !== "undefined") {
          MusicHandler.restart();
        }
      });
    }

    if (muteBtn) {
      muteBtn.addEventListener("click", function () {
        if (typeof MusicHandler !== "undefined") {
          MusicHandler.toggleMute();
        }
      });
    }

    // Klik tautan cepat di dalam Dynamic Island otomatis collapse
    const quickLinks = islandEl.querySelectorAll(".di-quick-chip");
    quickLinks.forEach(link => {
      link.addEventListener("click", () => {
        setTimeout(collapse, 250);
      });
    });

    // Setup pembaruan status audio secara berkala
    setupAudioListeners();
  }

  function expand() {
    if (!islandEl) return;
    isExpanded = true;
    islandEl.classList.add("expanded");
  }

  function collapse() {
    if (!islandEl) return;
    isExpanded = false;
    islandEl.classList.remove("expanded");
  }

  function toggleExpand() {
    if (isExpanded) {
      collapse();
    } else {
      expand();
    }
  }

  /**
   * Mengupdate status visualizer dan ikon tombol saat audio diputar/dijeda
   * @param {boolean} isPlaying 
   */
  function updatePlayState(isPlaying) {
    if (!islandEl) return;

    const waves = document.getElementById("di-audio-waves");
    const miniIcon = document.getElementById("di-mini-play-icon");
    const mainIcon = document.getElementById("di-main-play-icon");
    const statusText = document.getElementById("di-compact-status");

    if (isPlaying) {
      islandEl.classList.add("playing");
      if (waves) waves.classList.add("active");
      if (miniIcon) miniIcon.className = "fas fa-pause";
      if (mainIcon) mainIcon.className = "fas fa-pause";
      if (statusText) statusText.textContent = "Memutar";
    } else {
      islandEl.classList.remove("playing");
      if (waves) waves.classList.remove("active");
      if (miniIcon) miniIcon.className = "fas fa-play";
      if (mainIcon) mainIcon.className = "fas fa-play";
      if (statusText) statusText.textContent = "Dijeda";
    }
  }

  function updateMuteState(isMuted) {
    const volIcon = document.getElementById("di-volume-icon");
    if (!volIcon) return;
    volIcon.className = isMuted ? "fas fa-volume-mute" : "fas fa-volume-up";
  }

  function updateProgress(currentTime, duration) {
    const curEl = document.getElementById("di-current-time");
    const durEl = document.getElementById("di-duration-time");
    const barEl = document.getElementById("di-progress-bar");

    if (curEl) curEl.textContent = formatTime(currentTime);
    if (durEl && duration && !isNaN(duration)) durEl.textContent = formatTime(duration);

    if (barEl && duration && !isNaN(duration) && duration > 0) {
      const pct = (currentTime / duration) * 100;
      barEl.style.width = `${pct}%`;
    }
  }

  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }

  function setupAudioListeners() {
    // Sinkronisasi dengan elemen audio jika tersedia
    const checkAudio = setInterval(() => {
      if (typeof MusicHandler !== "undefined" && MusicHandler.getAudioElement) {
        const audio = MusicHandler.getAudioElement();
        if (audio) {
          clearInterval(checkAudio);

          audio.addEventListener("play", () => updatePlayState(true));
          audio.addEventListener("pause", () => updatePlayState(false));
          audio.addEventListener("volumechange", () => updateMuteState(audio.muted));
          audio.addEventListener("timeupdate", () => {
            updateProgress(audio.currentTime, audio.duration);
          });
          audio.addEventListener("loadedmetadata", () => {
            updateProgress(audio.currentTime, audio.duration);
          });

          // Set nama lagu dari config jika ada
          const trackTitle = document.getElementById("di-track-title");
          if (trackTitle && typeof WEDDING_CONFIG !== "undefined" && WEDDING_CONFIG.music) {
            trackTitle.textContent = WEDDING_CONFIG.music.title || "Lagu Pernikahan";
          }
        }
      }
    }, 400);
  }

  return {
    init: init,
    updatePlayState: updatePlayState,
    updateMuteState: updateMuteState,
    expand: expand,
    collapse: collapse
  };
})();

document.addEventListener("DOMContentLoaded", function () {
  DynamicIsland.init();
});

/**
 * ==============================================================================
 * THEME CONTROLLER (theme.js)
 * ==============================================================================
 * Mengelola peralihan Mode Terang (Light Mode) dan Mode Gelap (Dark Mode).
 * 
 * Karakteristik:
 * - Transisi warna yang halus (smooth transition) tanpa kedipan.
 * - Mode gelap berkonsep Luxury Dark Charcoal & Warm Champagne Gold.
 * - Pilihan pengguna tersimpan secara permanen di localStorage.
 * - Ikon dinamis: Matahari (fa-sun) pada mode gelap, Bulan (fa-moon) pada mode terang.
 * - Dapat disinkronkan dengan preferensi default dari Dasbor Admin.
 * ==============================================================================
 */

const ThemeController = (function () {
  const THEME_STORAGE_KEY = "wedding_user_theme";
  let currentTheme = "light";

  function init() {
    // 1. Cek penyimpanan lokal atau preferensi sistem
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "dark" || savedTheme === "light") {
      currentTheme = savedTheme;
    } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      currentTheme = "dark";
    } else {
      currentTheme = "light";
    }

    applyTheme(currentTheme, false);

    // 2. Pasang event listener tombol tema
    const toggleBtn = document.getElementById("theme-toggle-btn");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", toggleTheme);
    }
  }

  function applyTheme(theme, animate = true) {
    currentTheme = theme;
    const root = document.documentElement;

    if (!animate) {
      root.classList.add("no-transition");
    }

    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }

    if (!animate) {
      // Force repaint
      window.getComputedStyle(root).opacity;
      root.classList.remove("no-transition");
    }

    updateThemeButtonUI(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  function toggleTheme() {
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(nextTheme, true);
  }

  function updateThemeButtonUI(theme) {
    const toggleBtn = document.getElementById("theme-toggle-btn");
    const icon = document.getElementById("theme-icon");
    if (!toggleBtn || !icon) return;

    if (theme === "dark") {
      icon.className = "fas fa-sun";
      toggleBtn.setAttribute("aria-label", "Beralih ke Mode Terang");
      toggleBtn.title = "Beralih ke Mode Terang";
    } else {
      icon.className = "fas fa-moon";
      toggleBtn.setAttribute("aria-label", "Beralih ke Mode Gelap");
      toggleBtn.title = "Beralih ke Mode Gelap";
    }
  }

  return {
    init: init,
    toggle: toggleTheme,
    setTheme: applyTheme,
    getTheme: function () {
      return currentTheme;
    }
  };
})();

// Inisialisasi tema seawal mungkin
ThemeController.init();

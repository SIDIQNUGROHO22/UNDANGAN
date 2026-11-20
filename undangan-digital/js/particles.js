/**
 * ==============================================================================
 * PARTICLE CANVAS SYSTEM (particles.js)
 * ==============================================================================
 * Efek partikel ringan untuk mempercantik undangan pernikahan:
 * - Mode 'snow': Butiran salju halus melayang perlahan dengan gerakan alami.
 * - Mode 'petals': Kelopak bunga mawar/sakura lembut melayang dan berputar pelan.
 * - Mode 'none': Nonaktif (kanvas dikosongkan dan loop dihentikan).
 * 
 * Karakteristik Performa:
 * - Partikel sedikit (15 - 25 partikel) agar tidak membebani HP maupun baterai.
 * - Ukuran kecil dan tidak menghalangi keterbacaan teks undangan.
 * - Otomatis menyesuaikan ukuran saat resize window.
 * - Menghormati pengaturan aksesibilitas prefers-reduced-motion.
 * - Dapat diatur intensitas, kecepatan, dan modenya dari Dashboard Admin.
 * ==============================================================================
 */

const ParticleCanvas = (function () {
  let canvas = null;
  let ctx = null;
  let animationFrameId = null;
  let particles = [];
  let width = 0;
  let height = 0;

  // Konfigurasi default
  let config = {
    mode: "petals", // 'petals' | 'snow' | 'none'
    count: 20,
    speedMultiplier: 1.0,
    opacity: 0.75
  };

  /**
   * Menginisialisasi kanvas partikel
   */
  function init(customConfig) {
    canvas = document.getElementById("particle-canvas");
    if (!canvas) return;

    ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (customConfig) {
      updateConfig(customConfig);
    }

    // Periksa prefers-reduced-motion
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      config.mode = "none";
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    createParticles();
    if (config.mode !== "none") {
      startLoop();
    }
  }

  function handleResize() {
    if (!canvas) return;
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function createParticles() {
    particles = [];
    if (config.mode === "none") return;

    const count = config.count || 20;
    for (let i = 0; i < count; i++) {
      particles.push(spawnParticle(true));
    }
  }

  function spawnParticle(randomY = false) {
    const isPetal = config.mode === "petals";
    return {
      x: Math.random() * width,
      y: randomY ? Math.random() * height : -20,
      size: isPetal ? 8 + Math.random() * 8 : 2 + Math.random() * 3.5,
      speedY: (isPetal ? 0.7 + Math.random() * 0.9 : 0.5 + Math.random() * 0.8) * config.speedMultiplier,
      speedX: (Math.random() - 0.5) * 0.8 * config.speedMultiplier,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.02 + Math.random() * 0.03,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.03,
      opacity: 0.4 + Math.random() * 0.45,
      // Warna kelopak bunga romantis (soft rose / champagne gold / ivory)
      petalColor: Math.random() > 0.5 ? "rgba(224, 185, 175, " : "rgba(212, 175, 135, "
    };
  }

  function startLoop() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    loop();
  }

  function stopLoop() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    if (ctx && canvas) {
      ctx.clearRect(0, 0, width, height);
    }
  }

  function loop() {
    if (config.mode === "none") {
      stopLoop();
      return;
    }

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      p.wobble += p.wobbleSpeed;
      p.y += p.speedY;
      p.x += Math.sin(p.wobble) * 0.6 + p.speedX;
      p.rotation += p.rotationSpeed;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (config.mode === "petals") {
        // Gambar kelopak bunga romantis (bentuk kurva melengkung lembut)
        ctx.fillStyle = p.petalColor + (p.opacity * config.opacity) + ")";
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.5, p.size, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (config.mode === "snow") {
        // Gambar butiran salju halus berpendar
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity * config.opacity})`;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Reset posisi jika partikel keluar dari batas layar
      if (p.y > height + 25 || p.x < -30 || p.x > width + 30) {
        particles[i] = spawnParticle(false);
      }
    }

    animationFrameId = requestAnimationFrame(loop);
  }

  function updateConfig(newConfig) {
    if (!newConfig) return;
    if (newConfig.mode !== undefined) config.mode = newConfig.mode;
    if (newConfig.count !== undefined) config.count = Math.min(Math.max(newConfig.count, 5), 40);
    if (newConfig.speedMultiplier !== undefined) config.speedMultiplier = newConfig.speedMultiplier;
    if (newConfig.opacity !== undefined) config.opacity = newConfig.opacity;

    if (config.mode === "none") {
      stopLoop();
    } else {
      createParticles();
      startLoop();
    }
  }

  return {
    init: init,
    updateConfig: updateConfig,
    setMode: function (mode) {
      updateConfig({ mode: mode });
    },
    getConfig: function () {
      return { ...config };
    }
  };
})();

// Inisialisasi otomatis jika DOM telah siap
document.addEventListener("DOMContentLoaded", function () {
  ParticleCanvas.init();
});

/**
 * ==============================================================================
 * PARTICLE CANVAS SYSTEM (particles.js) - KERLIPAN PRADA EMAS WAYANG
 * ==============================================================================
 * Efek partikel ringan mewah:
 * - Mode 'gold_sparks' (Default): Debu prada emas & kunang-kunang berpendar lembut.
 * - Mode 'petals': Kelopak bunga melati/mawar perlahan melayang.
 * - Mode 'snow': Butiran salju halus.
 * ==============================================================================
 */

const ParticleCanvas = (function () {
  let canvas = null;
  let ctx = null;
  let animationFrameId = null;
  let particles = [];
  let width = 0;
  let height = 0;

  let config = {
    mode: "gold_sparks",
    count: 24,
    speedMultiplier: 0.8,
    opacity: 0.85
  };

  function init(customConfig) {
    canvas = document.getElementById("particle-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "particle-canvas";
      canvas.style.cssText = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 1;";
      document.body.prepend(canvas);
    }

    ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (customConfig) {
      updateConfig(customConfig);
    }

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

    const count = config.count || 24;
    for (let i = 0; i < count; i++) {
      particles.push(spawnParticle(true));
    }
  }

  function spawnParticle(randomY = false) {
    const isGold = config.mode === "gold_sparks";
    const isPetal = config.mode === "petals";

    return {
      x: Math.random() * width,
      y: randomY ? Math.random() * height : height + 10,
      size: isGold ? (1.5 + Math.random() * 2.8) : (isPetal ? 7 + Math.random() * 7 : 2 + Math.random() * 3),
      speedY: isGold ? (-0.35 - Math.random() * 0.7) * config.speedMultiplier : (0.6 + Math.random() * 0.8) * config.speedMultiplier,
      speedX: (Math.random() - 0.5) * 0.6 * config.speedMultiplier,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.02 + Math.random() * 0.03,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      opacity: 0.3 + Math.random() * 0.7,
      pulseSpeed: 0.03 + Math.random() * 0.04,
      pulse: Math.random() * Math.PI
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
      p.pulse += p.pulseSpeed;
      p.y += p.speedY;
      p.x += Math.sin(p.wobble) * 0.5 + p.speedX;
      p.rotation += p.rotationSpeed;

      const currentOpacity = (0.3 + Math.sin(p.pulse) * 0.5) * p.opacity * config.opacity;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (config.mode === "gold_sparks") {
        // Kerlipan debu prada emas dengan aura bercahaya
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 2.2);
        glow.addColorStop(0, `rgba(255, 245, 210, ${Math.min(currentOpacity + 0.2, 1)})`);
        glow.addColorStop(0.4, `rgba(223, 177, 91, ${currentOpacity * 0.7})`);
        glow.addColorStop(1, 'rgba(197, 146, 57, 0)');

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 255, 240, ${currentOpacity})`;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (config.mode === "petals") {
        ctx.fillStyle = `rgba(220, 180, 160, ${currentOpacity})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.5, p.size, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Reset partikel jika keluar layar
      if (config.mode === "gold_sparks") {
        if (p.y < -30 || p.x < -30 || p.x > width + 30) {
          particles[i] = spawnParticle(false);
        }
      } else {
        if (p.y > height + 30 || p.x < -30 || p.x > width + 30) {
          particles[i] = spawnParticle(false);
        }
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
    }
  };
})();

document.addEventListener("DOMContentLoaded", function () {
  ParticleCanvas.init();
});

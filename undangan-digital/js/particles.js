/**
 * ==============================================================================
 * WEDDING PARTICLES ANIMATION ENGINE (particles.js)
 * ==============================================================================
 * Engine animasi partikel berbasis HTML5 Canvas berperforma tinggi dan ringan (60 FPS):
 * - Pilihan Efek Estetik:
 *   1. 'sakura'    : Kelopak Bunga Sakura / Mawar Pink (Romantic Blossom)
 *   2. 'snow'      : Salju Musim Dingin Lembut (Soft Snowfall)
 *   3. 'sparkles'  : Kilau Bintang & Emas Mewah (Luxury Gold Stardust)
 *   4. 'hearts'    : Butiran Hati Romantis Melayang (Floating Hearts)
 *   5. 'fireflies' : Kunang-kunang Malam / Cahaya Magis (Enchanted Glow)
 *   6. 'autumn'    : Dedaunan Emas & Rontok (Rustic Autumn Leaves)
 *   7. 'jasmine'   : Kelopak Bunga Melati Suci (White Jasmine Petals)
 * - Fitur:
 *   - Auto mobile optimization (menyesuaikan jumlah partikel agar bebas lag di HP)
 *   - Auto pause saat tab browser tidak aktif (hemat baterai & CPU)
 *   - Dukungan live preview terisolasi di panel admin
 *   - Responsive terhadap orientasi & perubahan ukuran layar (resize)
 * ==============================================================================
 */

(function (window) {
  "use strict";

  const WeddingParticles = (function () {
    let canvas = null;
    let ctx = null;
    let animFrameId = null;
    let isRunning = false;
    let particles = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let resizeTimer = null;

    // Konfigurasi aktif
    let currentConfig = {
      enabled: true,
      effect: "sakura",     // sakura, snow, sparkles, hearts, fireflies, autumn, jasmine
      intensity: "medium",  // low, medium, high
      speed: "normal"       // slow, normal, fast
    };

    // Kecepatan & Kepadatan
    const SPEED_FACTORS = {
      slow: 0.65,
      normal: 1.0,
      fast: 1.55
    };

    const INTENSITY_COUNTS = {
      low: { mobile: 18, desktop: 30 },
      medium: { mobile: 32, desktop: 55 },
      high: { mobile: 50, desktop: 90 }
    };

    function isMobile() {
      return window.innerWidth <= 768;
    }

    function getTargetCount() {
      const mode = isMobile() ? "mobile" : "desktop";
      const lvl = currentConfig.intensity || "medium";
      return (INTENSITY_COUNTS[lvl] && INTENSITY_COUNTS[lvl][mode]) || (isMobile() ? 32 : 55);
    }

    function getSpeedMultiplier() {
      const spd = currentConfig.speed || "normal";
      return SPEED_FACTORS[spd] || 1.0;
    }

    // Helper random angka
    function randomRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    /**
     * Factory pembuat partikel individual berdasarkan efek yang dipilih
     */
    function createParticle(effect, initRandomY = true) {
      const speedMult = getSpeedMultiplier();
      const p = {
        x: randomRange(0, width),
        y: initRandomY ? randomRange(0, height) : randomRange(-60, -10),
        size: 0,
        speedX: 0,
        speedY: 0,
        alpha: 1,
        maxAlpha: 1,
        angle: randomRange(0, Math.PI * 2),
        angularSpeed: randomRange(-0.025, 0.025) * speedMult,
        flip: randomRange(0, Math.PI * 2),
        flipSpeed: randomRange(0.015, 0.04) * speedMult,
        swayPhase: randomRange(0, Math.PI * 2),
        swaySpeed: randomRange(0.01, 0.03) * speedMult,
        swayRadius: randomRange(10, 30),
        color: null,
        extra: {}
      };

      switch (effect) {
        case "snow":
          p.size = randomRange(2.5, 7.5);
          p.speedY = randomRange(0.7, 2.2) * speedMult;
          p.speedX = randomRange(-0.3, 0.5) * speedMult;
          p.maxAlpha = randomRange(0.4, 0.88);
          p.alpha = p.maxAlpha;
          p.color = Math.random() > 0.4 ? "rgba(255, 255, 255," : "rgba(240, 248, 255,";
          break;

        case "sparkles":
          p.size = randomRange(3, 8);
          p.speedY = randomRange(0.4, 1.4) * speedMult;
          p.speedX = randomRange(-0.4, 0.4) * speedMult;
          p.maxAlpha = randomRange(0.6, 0.95);
          p.alpha = randomRange(0.2, p.maxAlpha);
          p.twinkleSpeed = randomRange(0.03, 0.08);
          p.goldHue = Math.random() > 0.3 ? "#dfb15b" : (Math.random() > 0.5 ? "#fde047" : "#ffffff");
          break;

        case "hearts":
          p.size = randomRange(9, 18);
          p.speedY = -randomRange(0.8, 1.8) * speedMult;
          if (initRandomY) {
            p.y = randomRange(0, height);
          } else {
            p.y = height + randomRange(10, 40);
          }
          p.speedX = randomRange(-0.4, 0.4) * speedMult;
          p.maxAlpha = randomRange(0.45, 0.85);
          p.alpha = p.maxAlpha;
          p.color = Math.random() > 0.4 ? "rgba(244, 114, 182," : (Math.random() > 0.5 ? "rgba(239, 68, 68," : "rgba(223, 177, 91,");
          break;

        case "fireflies":
          p.size = randomRange(3, 6.5);
          p.y = randomRange(0, height);
          p.speedX = randomRange(-0.5, 0.5) * speedMult;
          p.speedY = randomRange(-0.5, 0.5) * speedMult;
          p.maxAlpha = randomRange(0.5, 0.95);
          p.alpha = randomRange(0.1, 0.5);
          p.pulseSpeed = randomRange(0.02, 0.05);
          p.pulsePhase = randomRange(0, Math.PI * 2);
          p.glowColor = Math.random() > 0.3 ? "250, 204, 21" : "217, 249, 157";
          break;

        case "autumn":
          p.size = randomRange(12, 22);
          p.speedY = randomRange(1.0, 2.4) * speedMult;
          p.speedX = randomRange(0.3, 1.3) * speedMult;
          p.maxAlpha = randomRange(0.65, 0.95);
          p.alpha = p.maxAlpha;
          const autumnColors = ["#d97706", "#b45309", "#ea580c", "#c2410c", "#eab308"];
          p.color = autumnColors[Math.floor(Math.random() * autumnColors.length)];
          break;

        case "jasmine":
          p.size = randomRange(9, 16);
          p.speedY = randomRange(0.8, 1.9) * speedMult;
          p.speedX = randomRange(-0.5, 0.6) * speedMult;
          p.maxAlpha = randomRange(0.7, 0.95);
          p.alpha = p.maxAlpha;
          p.color = "#ffffff";
          break;

        case "sakura":
        default:
          p.size = randomRange(10, 19);
          p.speedY = randomRange(0.9, 2.1) * speedMult;
          p.speedX = randomRange(0.4, 1.2) * speedMult;
          p.maxAlpha = randomRange(0.6, 0.9);
          p.alpha = p.maxAlpha;
          const sakuraColors = ["#fbcfe8", "#f472b6", "#fda4af", "#ffe4e6"];
          p.color = sakuraColors[Math.floor(Math.random() * sakuraColors.length)];
          break;
      }

      return p;
    }

    /**
     * Gambar partikel di canvas sesuai jenis efeknya
     */
    function drawParticle(p, context) {
      const c = context || ctx;
      if (!c) return;

      c.save();
      c.translate(p.x, p.y);

      switch (currentConfig.effect) {
        case "snow": {
          c.globalAlpha = p.alpha;
          c.beginPath();
          c.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          c.fillStyle = `${p.color} ${p.alpha})`;
          c.fill();
          if (p.size > 5) {
            c.shadowColor = "rgba(255, 255, 255, 0.8)";
            c.shadowBlur = 4;
            c.fill();
          }
          break;
        }

        case "sparkles": {
          c.rotate(p.angle);
          c.globalAlpha = p.alpha;
          c.fillStyle = p.goldHue;
          c.shadowColor = p.goldHue;
          c.shadowBlur = 8;

          const s = p.size;
          c.beginPath();
          c.moveTo(0, -s);
          c.quadraticCurveTo(0, 0, s, 0);
          c.quadraticCurveTo(0, 0, 0, s);
          c.quadraticCurveTo(0, 0, -s, 0);
          c.quadraticCurveTo(0, 0, 0, -s);
          c.closePath();
          c.fill();

          c.beginPath();
          c.arc(0, 0, s * 0.25, 0, Math.PI * 2);
          c.fillStyle = "#ffffff";
          c.fill();
          break;
        }

        case "hearts": {
          c.rotate(p.angle * 0.4);
          c.scale(Math.cos(p.flip) * 0.3 + 0.7, 1);
          c.globalAlpha = p.alpha;

          const s = p.size;
          c.beginPath();
          c.moveTo(0, s * 0.3);
          c.bezierCurveTo(-s * 0.5, -s * 0.3, -s, s * 0.2, 0, s);
          c.bezierCurveTo(s, s * 0.2, s * 0.5, -s * 0.3, 0, s * 0.3);
          c.closePath();

          c.fillStyle = `${p.color} ${p.alpha})`;
          c.shadowColor = "rgba(244, 114, 182, 0.5)";
          c.shadowBlur = 6;
          c.fill();
          break;
        }

        case "fireflies": {
          c.globalAlpha = p.alpha;

          const rad = p.size;
          const grad = c.createRadialGradient(0, 0, 0, 0, 0, rad * 2.8);
          grad.addColorStop(0, `rgba(${p.glowColor}, ${p.alpha})`);
          grad.addColorStop(0.35, `rgba(${p.glowColor}, ${p.alpha * 0.6})`);
          grad.addColorStop(1, `rgba(${p.glowColor}, 0)`);

          c.fillStyle = grad;
          c.beginPath();
          c.arc(0, 0, rad * 2.8, 0, Math.PI * 2);
          c.fill();

          c.beginPath();
          c.arc(0, 0, rad * 0.5, 0, Math.PI * 2);
          c.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
          c.fill();
          break;
        }

        case "autumn": {
          c.rotate(p.angle);
          c.scale(Math.cos(p.flip), 1);
          c.globalAlpha = p.alpha;

          const s = p.size;
          c.fillStyle = p.color;
          c.beginPath();
          c.moveTo(0, -s);
          c.quadraticCurveTo(s * 0.7, -s * 0.3, s * 0.5, s * 0.6);
          c.lineTo(0, s);
          c.lineTo(0, s + 3);
          c.lineTo(0, s);
          c.quadraticCurveTo(-s * 0.5, s * 0.6, -s * 0.7, -s * 0.3);
          c.closePath();
          c.fill();

          c.strokeStyle = "rgba(0, 0, 0, 0.15)";
          c.lineWidth = 1;
          c.beginPath();
          c.moveTo(0, -s * 0.8);
          c.lineTo(0, s);
          c.stroke();
          break;
        }

        case "jasmine": {
          c.rotate(p.angle);
          c.scale(Math.cos(p.flip), 1);
          c.globalAlpha = p.alpha;

          const s = p.size;
          c.fillStyle = "rgba(255, 255, 255, 0.95)";
          c.shadowColor = "rgba(251, 191, 36, 0.3)";
          c.shadowBlur = 4;

          c.beginPath();
          c.ellipse(0, 0, s * 0.45, s, 0, 0, Math.PI * 2);
          c.fill();

          c.fillStyle = "rgba(245, 158, 11, 0.4)";
          c.beginPath();
          c.arc(0, s * 0.6, s * 0.2, 0, Math.PI * 2);
          c.fill();
          break;
        }

        case "sakura":
        default: {
          c.rotate(p.angle);
          c.scale(Math.cos(p.flip), 1);
          c.globalAlpha = p.alpha;

          const s = p.size;
          c.fillStyle = p.color;
          c.shadowColor = "rgba(244, 114, 182, 0.35)";
          c.shadowBlur = 4;

          c.beginPath();
          c.moveTo(0, -s);
          c.bezierCurveTo(s * 0.7, -s * 0.7, s * 0.8, s * 0.4, 0, s);
          c.bezierCurveTo(-s * 0.8, s * 0.4, -s * 0.7, -s * 0.7, 0, -s);
          c.closePath();
          c.fill();

          c.strokeStyle = "rgba(255, 255, 255, 0.4)";
          c.lineWidth = 0.8;
          c.beginPath();
          c.moveTo(0, -s * 0.7);
          c.lineTo(0, s * 0.4);
          c.stroke();
          break;
        }
      }

      c.restore();
    }

    /**
     * Update posisi dan fisika partikel per frame
     */
    function updateParticle(p) {
      p.angle += p.angularSpeed;
      p.flip += p.flipSpeed;
      p.swayPhase += p.swaySpeed;

      switch (currentConfig.effect) {
        case "hearts":
          p.y += p.speedY;
          p.x += Math.sin(p.swayPhase) * 0.6;
          if (p.y < -30) {
            p.y = height + randomRange(10, 30);
            p.x = randomRange(0, width);
          }
          break;

        case "fireflies":
          p.x += p.speedX + Math.sin(p.swayPhase) * 0.5;
          p.y += p.speedY + Math.cos(p.swayPhase * 0.8) * 0.5;

          p.pulsePhase += p.pulseSpeed;
          p.alpha = (Math.sin(p.pulsePhase) + 1) * 0.5 * p.maxAlpha;
          if (p.alpha < 0.05) p.alpha = 0.05;

          if (p.x < -20) p.x = width + 10;
          if (p.x > width + 20) p.x = -10;
          if (p.y < -20) p.y = height + 10;
          if (p.y > height + 20) p.y = -10;
          break;

        case "sparkles":
          p.y += p.speedY;
          p.x += Math.sin(p.swayPhase) * 0.4;
          p.angle += p.twinkleSpeed;
          p.alpha = Math.abs(Math.sin(p.angle * 2)) * p.maxAlpha;
          if (p.alpha < 0.1) p.alpha = 0.1;

          if (p.y > height + 20) {
            p.y = randomRange(-30, -5);
            p.x = randomRange(0, width);
          }
          break;

        default:
          p.y += p.speedY;
          p.x += p.speedX + Math.sin(p.swayPhase) * 0.7;

          if (p.y > height + 35) {
            p.y = randomRange(-40, -10);
            p.x = randomRange(-30, width + 30);
          }
          if (p.x > width + 40) p.x = -30;
          if (p.x < -40) p.x = width + 30;
          break;
      }
    }

    /**
     * Render loop utama
     */
    function renderLoop() {
      if (!isRunning || !ctx || !canvas) return;

      ctx.clearRect(0, 0, width, height);

      const targetCount = getTargetCount();
      while (particles.length < targetCount) {
        particles.push(createParticle(currentConfig.effect, false));
      }
      if (particles.length > targetCount) {
        particles.length = targetCount;
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        updateParticle(p);
        drawParticle(p);
      }

      animFrameId = window.requestAnimationFrame(renderLoop);
    }

    /**
     * Sesuaikan ukuran canvas terhadap jendela layar
     */
    function handleResize() {
      if (!canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";

      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
      }
    }

    /**
     * Inisialisasi sekumpulan partikel baru
     */
    function initParticles() {
      particles = [];
      const count = getTargetCount();
      for (let i = 0; i < count; i++) {
        particles.push(createParticle(currentConfig.effect, true));
      }
    }

    /**
     * Mulai loop animasi
     */
    function start() {
      if (isRunning) return;
      if (!currentConfig.enabled) {
        if (canvas) canvas.style.display = "none";
        return;
      }
      if (canvas) {
        canvas.style.display = "block";
        canvas.classList.remove("hidden");
      }
      isRunning = true;
      initParticles();
      renderLoop();
    }

    /**
     * Berhenti dan bersihkan loop
     */
    function stop() {
      isRunning = false;
      if (animFrameId) {
        window.cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      if (ctx && canvas) {
        ctx.clearRect(0, 0, width, height);
      }
      if (canvas) {
        canvas.style.display = "none";
      }
    }

    /**
     * Inisialisasi awal modul partikel untuk halaman undangan utama
     */
    function init(config, canvasSelector = "#wedding-particles-canvas") {
      canvas = document.querySelector(canvasSelector);
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = "wedding-particles-canvas";
        canvas.className = "wedding-particles-canvas";
        canvas.setAttribute("aria-hidden", "true");
        document.body.prepend(canvas);
      }

      ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) return;

      handleResize();
      window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(handleResize, 150);
      }, { passive: true });

      document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
          if (isRunning) {
            window.cancelAnimationFrame(animFrameId);
            animFrameId = null;
          }
        } else if (isRunning && currentConfig.enabled) {
          animFrameId = window.requestAnimationFrame(renderLoop);
        }
      });

      if (config) {
        updateFromConfig(config);
      } else {
        start();
      }
    }

    /**
     * Memperbarui parameter efek dari konfigurasi (server / admin)
     */
    function updateFromConfig(cfg) {
      if (!cfg) return;

      const prevEffect = currentConfig.effect;
      const prevIntensity = currentConfig.intensity;
      const prevSpeed = currentConfig.speed;

      currentConfig.enabled = cfg.enabled !== false;
      currentConfig.effect = cfg.effect || "sakura";
      currentConfig.intensity = cfg.intensity || "medium";
      currentConfig.speed = cfg.speed || "normal";

      if (!currentConfig.enabled) {
        stop();
        return;
      }

      if (canvas) {
        canvas.style.display = "block";
      }

      if (!isRunning) {
        start();
      } else if (prevEffect !== currentConfig.effect || prevIntensity !== currentConfig.intensity || prevSpeed !== currentConfig.speed) {
        initParticles();
      }
    }

    /**
     * Khusus Live Preview di Panel Admin:
     * Menjalankan animasi terisolasi di dalam elemen canvas mini (kotak preview admin)
     */
    function createPreview(previewCanvas, effectName = "sakura", intensity = "medium", speed = "normal") {
      if (!previewCanvas) return null;

      const pCtx = previewCanvas.getContext("2d");
      if (!pCtx) return null;

      const rect = previewCanvas.getBoundingClientRect();
      const pWidth = rect.width || previewCanvas.width || 320;
      const pHeight = rect.height || previewCanvas.height || 160;

      previewCanvas.width = pWidth;
      previewCanvas.height = pHeight;

      let pActive = true;
      let pAnimId = null;
      let pParticles = [];

      const count = intensity === "high" ? 36 : (intensity === "low" ? 14 : 22);
      const speedMult = SPEED_FACTORS[speed] || 1.0;

      for (let i = 0; i < count; i++) {
        const p = {
          x: Math.random() * pWidth,
          y: Math.random() * pHeight,
          size: Math.random() * 9 + 5,
          speedY: (Math.random() * 1.2 + 0.8) * speedMult,
          speedX: (Math.random() * 0.8 - 0.2) * speedMult,
          alpha: Math.random() * 0.5 + 0.45,
          maxAlpha: 0.9,
          angle: Math.random() * Math.PI * 2,
          angularSpeed: (Math.random() * 0.03 - 0.015) * speedMult,
          flip: Math.random() * Math.PI * 2,
          flipSpeed: (Math.random() * 0.03 + 0.01) * speedMult,
          swayPhase: Math.random() * Math.PI * 2,
          swaySpeed: 0.02 * speedMult,
          color: null
        };

        if (effectName === "hearts") {
          p.speedY = -(Math.random() * 1.2 + 0.6) * speedMult;
          p.color = "rgba(244, 114, 182,";
        } else if (effectName === "snow") {
          p.color = "rgba(255, 255, 255,";
          p.size = Math.random() * 4 + 2;
        } else if (effectName === "sparkles") {
          p.goldHue = Math.random() > 0.4 ? "#dfb15b" : "#ffffff";
          p.twinkleSpeed = 0.05;
        } else if (effectName === "fireflies") {
          p.glowColor = "250, 204, 21";
          p.pulsePhase = Math.random() * Math.PI * 2;
          p.pulseSpeed = 0.04;
        } else if (effectName === "autumn") {
          p.color = "#d97706";
        } else if (effectName === "jasmine") {
          p.color = "#ffffff";
        } else {
          p.color = "#f472b6";
        }

        pParticles.push(p);
      }

      function loop() {
        if (!pActive) return;
        pCtx.clearRect(0, 0, pWidth, pHeight);

        pParticles.forEach(p => {
          p.angle += p.angularSpeed;
          p.flip += p.flipSpeed;
          p.swayPhase += p.swaySpeed;

          if (effectName === "hearts") {
            p.y += p.speedY;
            p.x += Math.sin(p.swayPhase) * 0.5;
            if (p.y < -20) {
              p.y = pHeight + 10;
              p.x = Math.random() * pWidth;
            }
          } else if (effectName === "fireflies") {
            p.x += p.speedX + Math.sin(p.swayPhase) * 0.4;
            p.y += p.speedY + Math.cos(p.swayPhase) * 0.4;
            p.pulsePhase += p.pulseSpeed;
            p.alpha = (Math.sin(p.pulsePhase) + 1) * 0.5 * 0.8 + 0.1;
            if (p.x < -10) p.x = pWidth + 5;
            if (p.x > pWidth + 10) p.x = -5;
            if (p.y < -10) p.y = pHeight + 5;
            if (p.y > pHeight + 10) p.y = -5;
          } else {
            p.y += p.speedY;
            p.x += p.speedX + Math.sin(p.swayPhase) * 0.5;
            if (p.y > pHeight + 20) {
              p.y = -15;
              p.x = Math.random() * pWidth;
            }
          }

          pCtx.save();
          pCtx.translate(p.x, p.y);

          if (effectName === "snow") {
            pCtx.globalAlpha = p.alpha;
            pCtx.beginPath();
            pCtx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            pCtx.fillStyle = "#ffffff";
            pCtx.fill();
          } else if (effectName === "sparkles") {
            pCtx.rotate(p.angle);
            pCtx.globalAlpha = p.alpha;
            pCtx.fillStyle = p.goldHue || "#dfb15b";
            const s = p.size;
            pCtx.beginPath();
            pCtx.moveTo(0, -s);
            pCtx.quadraticCurveTo(0, 0, s, 0);
            pCtx.quadraticCurveTo(0, 0, 0, s);
            pCtx.quadraticCurveTo(0, 0, -s, 0);
            pCtx.quadraticCurveTo(0, 0, 0, -s);
            pCtx.fill();
          } else if (effectName === "hearts") {
            pCtx.rotate(p.angle * 0.3);
            pCtx.globalAlpha = p.alpha;
            const s = p.size;
            pCtx.beginPath();
            pCtx.moveTo(0, s * 0.3);
            pCtx.bezierCurveTo(-s * 0.5, -s * 0.3, -s, s * 0.2, 0, s);
            pCtx.bezierCurveTo(s, s * 0.2, s * 0.5, -s * 0.3, 0, s * 0.3);
            pCtx.fillStyle = "rgba(244, 114, 182, 0.9)";
            pCtx.fill();
          } else if (effectName === "fireflies") {
            pCtx.globalAlpha = p.alpha;
            const rad = p.size;
            const grad = pCtx.createRadialGradient(0, 0, 0, 0, 0, rad * 2);
            grad.addColorStop(0, "rgba(250, 204, 21, 1)");
            grad.addColorStop(1, "rgba(250, 204, 21, 0)");
            pCtx.fillStyle = grad;
            pCtx.beginPath();
            pCtx.arc(0, 0, rad * 2, 0, Math.PI * 2);
            pCtx.fill();
          } else if (effectName === "autumn") {
            pCtx.rotate(p.angle);
            pCtx.globalAlpha = p.alpha;
            const s = p.size;
            pCtx.fillStyle = "#d97706";
            pCtx.beginPath();
            pCtx.ellipse(0, 0, s * 0.45, s, 0, 0, Math.PI * 2);
            pCtx.fill();
          } else if (effectName === "jasmine") {
            pCtx.rotate(p.angle);
            pCtx.globalAlpha = p.alpha;
            const s = p.size;
            pCtx.fillStyle = "#ffffff";
            pCtx.beginPath();
            pCtx.ellipse(0, 0, s * 0.45, s, 0, 0, Math.PI * 2);
            pCtx.fill();
          } else {
            pCtx.rotate(p.angle);
            pCtx.scale(Math.cos(p.flip), 1);
            pCtx.globalAlpha = p.alpha;
            const s = p.size;
            pCtx.fillStyle = "#f472b6";
            pCtx.beginPath();
            pCtx.moveTo(0, -s);
            pCtx.bezierCurveTo(s * 0.7, -s * 0.7, s * 0.8, s * 0.4, 0, s);
            pCtx.bezierCurveTo(-s * 0.8, s * 0.4, -s * 0.7, -s * 0.7, 0, -s);
            pCtx.fill();
          }

          pCtx.restore();
        });

        pAnimId = window.requestAnimationFrame(loop);
      }

      loop();

      return {
        stop: function () {
          pActive = false;
          if (pAnimId) window.cancelAnimationFrame(pAnimId);
          pCtx.clearRect(0, 0, pWidth, pHeight);
        }
      };
    }

    return {
      init: init,
      start: start,
      stop: stop,
      updateFromConfig: updateFromConfig,
      createPreview: createPreview,
      getConfig: function () {
        return Object.assign({}, currentConfig);
      }
    };
  })();

  window.WeddingParticles = WeddingParticles;
  window.ParticleCanvas = WeddingParticles;
})(window);

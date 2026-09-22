/**
 * UNMEI FANSUB - EASTER EGG: FLAPPY UÇ
 * 1. Footer logosuna art arda tıklandıkça zıplama şiddetini artırır.
 * 2. 10. tıklamada Flappy Uç mini oyun modalını açar.
 * 3. Masaüstünde şık Landscape (720x440), mobilde dikey Portrait (360x520).
 * 4. Saf HTML5 Canvas ve Web Audio API ile kusursuz 60fps arcade oyunu.
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. FOOTER LOGO HOPPING INTERACTION
  // =========================================================================
  let consecutiveClicks = 0;
  let resetTimer = null;
  let animTimer = null;
  const footerLogo = document.querySelector('.footer-logo');
  const footerSection = document.querySelector('.footer-brand-section') || footerLogo;
  const easterModal = document.getElementById('easter-modal');

  if (!footerLogo || !footerSection) return;

  // Web Audio Context for sound effects
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playTone(freq, type, duration, endFreq) {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (endFreq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), ctx.currentTime + duration);
      }
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio might be blocked on some browsers
    }
  }

  function spawnClickParticles(x, y, count) {
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'easter-particle';
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const dist = 25 + Math.random() * 40;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist - 20;

      particle.style.setProperty('--tx', `${tx}px`);
      particle.style.setProperty('--ty', `${ty}px`);
      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;

      document.body.appendChild(particle);
      setTimeout(() => particle.remove(), 700);
    }
  }

  footerSection.addEventListener('click', (e) => {
    consecutiveClicks++;
    clearTimeout(resetTimer);
    clearTimeout(animTimer);

    // Click sound pitches up with combos
    playTone(280 + consecutiveClicks * 45, 'triangle', 0.1, 400 + consecutiveClicks * 60);

    // Calculate jump height (1st click: 16px, 10th click: 140px)
    const jumpDistance = Math.min(140, 14 + consecutiveClicks * 13);
    const tilt = (consecutiveClicks % 2 === 0 ? 1 : -1) * Math.min(16, consecutiveClicks * 1.8);
    const scale = 1 + Math.min(0.28, consecutiveClicks * 0.03);

    // Animate logo hop
    footerLogo.style.transition = 'transform 0.12s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
    footerLogo.style.transform = `translateY(-${jumpDistance}px) scale(${scale}) rotate(${tilt}deg)`;

    // Spawn glow particles
    const rect = footerSection.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2 + window.scrollX;
    const centerY = rect.top + rect.height / 2 + window.scrollY;
    spawnClickParticles(centerX, centerY, Math.min(16, 4 + consecutiveClicks * 2));

    // Smooth return to ground
    animTimer = setTimeout(() => {
      footerLogo.style.transition = 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)';
      footerLogo.style.transform = 'translateY(0) scale(1) rotate(0deg)';
    }, 140);

    // 10th click triggers Easter Egg!
    if (consecutiveClicks >= 10) {
      consecutiveClicks = 0;
      clearTimeout(resetTimer);
      clearTimeout(animTimer);

      footerLogo.style.transition = 'transform 0.2s ease';
      footerLogo.style.transform = 'translateY(0) scale(1) rotate(0deg)';

      // Flash effect
      const flash = document.createElement('div');
      flash.className = 'easter-screen-flash';
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 600);

      playTone(520, 'sine', 0.35, 1040);

      setTimeout(() => {
        openEasterGame();
      }, 250);
      return;
    }

    // Reset combo after 1200ms of inactivity
    resetTimer = setTimeout(() => {
      consecutiveClicks = 0;
      footerLogo.style.transition = 'transform 0.3s ease';
      footerLogo.style.transform = 'translateY(0) scale(1) rotate(0deg)';
    }, 1200);
  });

  // =========================================================================
  // 2. MODAL CONTROLS
  // =========================================================================
  function openEasterGame() {
    if (!easterModal) return;
    easterModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    initFlappyGame();
  }

  function closeEasterGame() {
    if (!easterModal) return;
    easterModal.style.display = 'none';
    document.body.style.overflow = '';
    stopFlappyGame();
  }

  easterModal.addEventListener('click', (e) => {
    if (e.target === easterModal || e.target.classList.contains('easter-modal-backdrop')) {
      closeEasterGame();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && easterModal.style.display === 'flex') {
      closeEasterGame();
    }
  });

  // =========================================================================
  // 3. FLAPPY UÇ GAME CORE
  // =========================================================================
  const canvas = document.getElementById('flappy-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Load Bird Image (our logo)
  const birdImg = new Image();
  birdImg.src = 'assets/logo.png';

  // Responsive Dimensions (Landscape on Desktop, Portrait on Mobile)
  let isMobile = window.innerWidth <= 600;
  let W = isMobile ? 360 : 720;
  let H = isMobile ? 520 : 440;
  let pipeWidth = isMobile ? 54 : 60;
  let pipeGap = isMobile ? 148 : 138;
  let baseSpeed = isMobile ? 2.3 : 2.7;
  let pipeSpeed = baseSpeed;
  let pipeDistance = isMobile ? 230 : 255;
  let framesSinceLastPipe = 0;

  let animationId = null;
  let gameState = 'START'; // 'START' | 'PLAYING' | 'GAMEOVER'
  let score = 0;
  let highScore = parseInt(localStorage.getItem('unmei_flappy_highscore') || '0', 10);
  let frames = 0;

  // Bird Entity
  const bird = {
    x: isMobile ? 80 : 120,
    y: H / 2 - 15,
    w: 44,
    h: 31,
    radius: 14,
    velocity: 0,
    gravity: 0.28,
    jump: -6.2,
    rotation: 0,
    trail: []
  };

  // Pipes & Stars
  let pipes = [];
  const stars = [];

  function updateDimensions() {
    isMobile = window.innerWidth <= 600;
    W = isMobile ? 360 : 720;
    H = isMobile ? 520 : 440;
    pipeWidth = isMobile ? 54 : 60;
    pipeGap = isMobile ? 148 : 138;
    baseSpeed = isMobile ? 2.3 : 2.7;
    pipeSpeed = baseSpeed;
    pipeDistance = isMobile ? 230 : 255;

    canvas.width = W;
    canvas.height = H;

    stars.length = 0;
    const starCount = isMobile ? 35 : 65;
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * (H - 60),
        size: Math.random() * 1.8 + 0.6,
        alpha: Math.random() * 0.7 + 0.2,
        speed: Math.random() * 0.35 + 0.1
      });
    }
  }

  function resetGame() {
    updateDimensions();
    bird.x = isMobile ? 80 : 120;
    bird.y = H / 2 - 15;
    bird.velocity = 0;
    bird.rotation = 0;
    bird.trail = [];
    pipes = [];
    score = 0;
    frames = 0;
    framesSinceLastPipe = 0;
    baseSpeed = isMobile ? 2.3 : 2.7;
    pipeSpeed = baseSpeed;
    gameState = 'START';
  }

  function flap() {
    if (gameState === 'START') {
      gameState = 'PLAYING';
      bird.velocity = bird.jump;
      playTone(480, 'sine', 0.1, 780);
    } else if (gameState === 'PLAYING') {
      bird.velocity = bird.jump;
      playTone(480, 'sine', 0.1, 780);
    } else if (gameState === 'GAMEOVER') {
      resetGame();
      gameState = 'PLAYING';
      bird.velocity = bird.jump;
      playTone(480, 'sine', 0.1, 780);
    }
  }

  // Input Listeners
  function handleInput(e) {
    if (easterModal.style.display !== 'flex') return;

    if (e.type === 'keydown') {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        flap();
      }
    } else if (e.type === 'pointerdown' || e.type === 'touchstart') {
      if (e.target === canvas || e.target.closest('.game-wrapper')) {
        e.preventDefault();
        flap();
      }
    }
  }

  window.addEventListener('keydown', handleInput);
  canvas.addEventListener('pointerdown', handleInput);

  window.addEventListener('resize', () => {
    if (easterModal.style.display === 'flex' && gameState !== 'PLAYING') {
      updateDimensions();
    }
  });

  function spawnPipe() {
    const groundH = 50;
    const minTop = 50;
    const maxTop = H - groundH - pipeGap - 50;
    const topHeight = Math.floor(Math.random() * (maxTop - minTop + 1)) + minTop;

    pipes.push({
      x: W + 20,
      topH: topHeight,
      bottomY: topHeight + pipeGap,
      bottomH: H - groundH - (topHeight + pipeGap),
      passed: false
    });
  }

  function update() {
    frames++;

    // Move background stars (speeds up subtly with game speed)
    const starMultiplier = pipeSpeed / baseSpeed;
    stars.forEach((s) => {
      s.x -= s.speed * starMultiplier;
      if (s.x < 0) s.x = W;
    });

    if (gameState === 'START') {
      // Gentle floating bob
      bird.y = H / 2 - 15 + Math.sin(frames * 0.08) * 6;
      bird.rotation = 0;
    } else if (gameState === 'PLAYING') {
      // Dynamic Speed Acceleration:
      // Gradually increases with both score (+0.085 per point) and elapsed frames
      const speedScoreBonus = Math.min(2.4, score * 0.085);
      const speedTimeBonus = Math.min(0.8, frames * 0.0003);
      pipeSpeed = baseSpeed + speedScoreBonus + speedTimeBonus;

      // Physics
      bird.velocity += bird.gravity;
      bird.y += bird.velocity;

      // Rotation based on velocity
      if (bird.velocity < 0) {
        bird.rotation = Math.max(-0.45, bird.velocity * 0.07);
      } else {
        bird.rotation = Math.min(1.1, bird.velocity * 0.09);
      }

      // Trail
      if (frames % 2 === 0) {
        bird.trail.push({ x: bird.x, y: bird.y, alpha: 0.6, r: 7 });
      }

      // Ceiling & Ground collision
      const groundY = H - 50;
      if (bird.y - bird.radius <= 0) {
        bird.y = bird.radius;
        bird.velocity = 0;
      }

      if (bird.y + bird.radius >= groundY) {
        bird.y = groundY - bird.radius;
        triggerGameOver();
      }

      // Pipe generation with consistent distance between pipes
      framesSinceLastPipe++;
      const currentInterval = Math.max(45, Math.round(pipeDistance / pipeSpeed));
      if (framesSinceLastPipe >= currentInterval) {
        spawnPipe();
        framesSinceLastPipe = 0;
      }

      // Update pipes
      for (let i = pipes.length - 1; i >= 0; i--) {
        const p = pipes[i];
        p.x -= pipeSpeed;

        // Collision Check (Circle vs Box with padding)
        const bx = bird.x;
        const by = bird.y;
        const br = bird.radius - 2;

        // Top pipe collision
        if (
          bx + br > p.x &&
          bx - br < p.x + pipeWidth &&
          by - br < p.topH
        ) {
          triggerGameOver();
        }

        // Bottom pipe collision
        if (
          bx + br > p.x &&
          bx - br < p.x + pipeWidth &&
          by + br > p.bottomY
        ) {
          triggerGameOver();
        }

        // Score update
        if (!p.passed && p.x + pipeWidth < bird.x) {
          p.passed = true;
          score++;
          playTone(880, 'triangle', 0.12, 1175);

          if (score > highScore) {
            highScore = score;
            localStorage.setItem('unmei_flappy_highscore', highScore.toString());
          }
        }

        // Remove offscreen pipes
        if (p.x + pipeWidth < -20) {
          pipes.splice(i, 1);
        }
      }
    } else if (gameState === 'GAMEOVER') {
      // Fall to ground if in air
      const groundY = H - 50;
      if (bird.y + bird.radius < groundY) {
        bird.velocity += bird.gravity * 1.5;
        bird.y += bird.velocity;
        bird.rotation = 1.2;
      }
    }

    // Decay trail
    for (let i = bird.trail.length - 1; i >= 0; i--) {
      bird.trail[i].alpha -= 0.04;
      bird.trail[i].r *= 0.94;
      if (bird.trail[i].alpha <= 0) {
        bird.trail.splice(i, 1);
      }
    }
  }

  function triggerGameOver() {
    if (gameState === 'GAMEOVER') return;
    gameState = 'GAMEOVER';
    playTone(180, 'sawtooth', 0.28, 60);

    // Screen shake
    canvas.classList.add('canvas-shake');
    setTimeout(() => canvas.classList.remove('canvas-shake'), 400);
  }

  // =========================================================================
  // 4. DRAWING
  // =========================================================================
  function draw() {
    // 1. Sky Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#090a0c');
    bgGrad.addColorStop(0.7, '#0e1014');
    bgGrad.addColorStop(1, '#14181f');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. Stars
    stars.forEach((s) => {
      ctx.fillStyle = `rgba(188, 25, 154, ${s.alpha * 0.7})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // 3. Subtle background silhouettes (Mountains/Horizon for landscape feel)
    drawBackgroundSilhouette();

    // 4. Pipes
    pipes.forEach((p) => {
      drawPipe(p.x, 0, pipeWidth, p.topH, true);
      drawPipe(p.x, p.bottomY, pipeWidth, p.bottomH, false);
    });

    // 5. Ground
    const groundH = 50;
    const groundY = H - groundH;

    ctx.fillStyle = '#101216';
    ctx.fillRect(0, groundY, W, groundH);

    // Ground top border (Unmei Magenta Glow Line)
    ctx.strokeStyle = '#bc199a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(W, groundY);
    ctx.stroke();

    // Ground grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = (frames * -pipeSpeed) % 24; x < W; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    // 6. Bird Trail
    bird.trail.forEach((t) => {
      ctx.fillStyle = `rgba(188, 25, 154, ${t.alpha * 0.4})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // 7. Bird (Our "uç" logo)
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);

    if (birdImg.complete && birdImg.naturalWidth > 0) {
      ctx.shadowColor = 'rgba(188, 25, 154, 0.6)';
      ctx.shadowBlur = 12;
      ctx.drawImage(birdImg, -bird.w / 2, -bird.h / 2, bird.w, bird.h);
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = '#bc199a';
      ctx.beginPath();
      ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 8. UI Overlays based on Game State
    if (gameState === 'PLAYING') {
      // Live Score
      ctx.font = '800 42px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 8;
      ctx.fillText(score, W / 2, 70);
      ctx.shadowBlur = 0;
    } else if (gameState === 'START') {
      // Start Screen (Clean & minimal without title)
      drawGlassCard(W / 2 - 145, H / 2 - 75, 290, 150);

      ctx.textAlign = 'center';
      ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#edf0f5';
      ctx.fillText('Başlamak için Tıkla veya', W / 2, H / 2 - 24);

      ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#bc199a';
      ctx.fillText('[ Space ] Tuşuna Bas', W / 2, H / 2 + 3);

      ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#848b98';
      ctx.fillText(`En Yüksek Skor: ${highScore}`, W / 2, H / 2 + 45);
    } else if (gameState === 'GAMEOVER') {
      // Game Over Screen
      drawGlassCard(W / 2 - 150, H / 2 - 125, 300, 220);

      ctx.textAlign = 'center';
      ctx.font = '800 26px "Outfit", sans-serif';
      ctx.fillStyle = '#ef4444';
      ctx.fillText('OYUN BİTTİ', W / 2, H / 2 - 80);

      // Current Score
      ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#848b98';
      ctx.fillText('SKOR', W / 2, H / 2 - 45);

      ctx.font = '800 36px "Outfit", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(score, W / 2, H / 2 - 10);

      // High Score
      ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = score >= highScore && score > 0 ? '#10b981' : '#848b98';
      const recordText = score >= highScore && score > 0 ? `YENİ REKOR: ${highScore}` : `En İyi: ${highScore}`;
      ctx.fillText(recordText, W / 2, H / 2 + 26);

      // Restart hint
      ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#bc199a';
      ctx.fillText('Tekrar oynamak için Tıkla / [Space]', W / 2, H / 2 + 64);
    }
  }

  function drawBackgroundSilhouette() {
    const groundY = H - 50;
    ctx.save();
    ctx.fillStyle = 'rgba(21, 24, 31, 0.4)';
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(0, groundY - 45);
    ctx.lineTo(W * 0.2, groundY - 70);
    ctx.lineTo(W * 0.4, groundY - 35);
    ctx.lineTo(W * 0.65, groundY - 80);
    ctx.lineTo(W * 0.85, groundY - 40);
    ctx.lineTo(W, groundY - 60);
    ctx.lineTo(W, groundY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawPipe(x, y, w, h, isTop) {
    if (h <= 0) return;

    // Body Gradient
    const pipeGrad = ctx.createLinearGradient(x, 0, x + w, 0);
    pipeGrad.addColorStop(0, '#15181f');
    pipeGrad.addColorStop(0.3, '#1c202a');
    pipeGrad.addColorStop(0.7, '#181b24');
    pipeGrad.addColorStop(1, '#0e1014');

    ctx.fillStyle = pipeGrad;
    ctx.fillRect(x, y, w, h);

    // Border
    ctx.strokeStyle = '#282d38';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);

    // Lip (Cap) of Pipe
    const lipH = 22;
    const lipExtend = 5;
    const lipX = x - lipExtend;
    const lipW = w + lipExtend * 2;
    const lipY = isTop ? y + h - lipH : y;

    const lipGrad = ctx.createLinearGradient(lipX, 0, lipX + lipW, 0);
    lipGrad.addColorStop(0, '#1c202a');
    lipGrad.addColorStop(0.5, '#242936');
    lipGrad.addColorStop(1, '#15181f');

    ctx.fillStyle = lipGrad;
    ctx.fillRect(lipX, lipY, lipW, lipH);

    ctx.strokeStyle = '#323947';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(lipX, lipY, lipW, lipH);

    // Magenta Neon Stripe on Pipe Lip
    ctx.strokeStyle = '#bc199a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const stripeY = isTop ? lipY + lipH - 2 : lipY + 2;
    ctx.moveTo(lipX + 2, stripeY);
    ctx.lineTo(lipX + lipW - 2, stripeY);
    ctx.stroke();
  }

  function drawGlassCard(x, y, w, h) {
    ctx.save();
    ctx.fillStyle = 'rgba(16, 18, 22, 0.94)';
    ctx.strokeStyle = 'rgba(188, 25, 154, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 24;

    const r = 12;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function loop() {
    update();
    draw();
    animationId = requestAnimationFrame(loop);
  }

  function initFlappyGame() {
    resetGame();
    if (animationId) cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(loop);
  }

  function stopFlappyGame() {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }
})();

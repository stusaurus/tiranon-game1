"use strict";

(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const wrap = document.getElementById("game-wrap");
  const distanceEl = document.getElementById("distance");
  const bestEl = document.getElementById("best");
  const lettersEl = document.getElementById("letters");
  const startScreen = document.getElementById("start-screen");
  const gameOverScreen = document.getElementById("game-over");
  const startButton = document.getElementById("start-button");
  const restartButton = document.getElementById("restart-button");
  const finalDistanceEl = document.getElementById("final-distance");
  const newBestEl = document.getElementById("new-best");
  const feverEl = document.getElementById("fever");
  const feverBarEl = document.getElementById("fever-bar");
  const tapHintEl = document.getElementById("tap-hint");

  const WORD = "TIRANON";
  const BEST_KEY = "tirakuri-best-v1";
  const RUN_IMG = "IMG_1792.png?v=20260913-1";
  const JUMP_IMG = "assets/tiranon-jump-right.png?v=20260913-1";
  const FEVER_SECONDS = 8;

  const runImage = new Image();
  const jumpImage = new Image();
  runImage.src = RUN_IMG;
  jumpImage.src = JUMP_IMG;

  let dpr = 1;
  let W = 0;
  let H = 0;
  let groundY = 0;
  let playing = false;
  let raf = 0;
  let lastT = 0;
  let elapsed = 0;
  let distance = 0;
  let best = Number(localStorage.getItem(BEST_KEY) || 0);
  let speed = 290;
  let obstacleTimer = 0;
  let letterTimer = 0;
  let stairTimer = 0;
  let collected = 0;
  let feverRemaining = 0;
  let flash = 0;
  let nextObstacleDelay = 1.35;
  let nextLetterDelay = 6.5;
  let nextStairDelay = 8.5;
  let obstacles = [];
  let pickups = [];
  let platforms = [];
  let particles = [];

  const player = {
    x: 0,
    y: 0,
    w: 84,
    h: 84,
    vy: 0,
    jumps: 0,
    grounded: true,
    squash: 0
  };

  function buildLetterHud() {
    lettersEl.innerHTML = "";
    [...WORD].forEach((ch, i) => {
      const span = document.createElement("span");
      span.className = "letter-slot";
      span.textContent = ch;
      span.dataset.index = String(i);
      lettersEl.appendChild(span);
    });
    updateLetterHud();
  }

  function updateLetterHud() {
    lettersEl.querySelectorAll(".letter-slot").forEach((el, i) => {
      el.classList.toggle("collected", i < collected);
    });
  }

  function resize() {
    const rect = wrap.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(320, rect.width);
    H = Math.max(300, rect.height);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    groundY = H * 0.79;
    player.w = Math.max(70, Math.min(92, W * 0.19));
    player.h = player.w;
    player.x = W * 0.16;
    if (!playing || player.grounded) player.y = groundY - player.h;
    render();
  }

  function resetGame() {
    distance = 0;
    elapsed = 0;
    speed = 290;
    obstacleTimer = 0;
    letterTimer = 0;
    stairTimer = 0;
    nextObstacleDelay = 1.15;
    nextLetterDelay = 5.7;
    nextStairDelay = 7.5;
    collected = 0;
    feverRemaining = 0;
    flash = 0;
    obstacles = [];
    pickups = [];
    platforms = [];
    particles = [];
    player.vy = 0;
    player.jumps = 0;
    player.grounded = true;
    player.squash = 0;
    player.y = groundY - player.h;
    updateLetterHud();
    updateHud();
    feverEl.hidden = true;
    tapHintEl.hidden = false;
  }

  function startGame() {
    cancelAnimationFrame(raf);
    resetGame();
    startScreen.hidden = true;
    gameOverScreen.hidden = true;
    playing = true;
    lastT = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function endGame() {
    if (!playing) return;
    playing = false;
    cancelAnimationFrame(raf);
    const score = Math.floor(distance);
    const isBest = score > best;
    if (isBest) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
    }
    bestEl.textContent = `${best}m`;
    finalDistanceEl.textContent = `${score}m`;
    newBestEl.hidden = !isBest;
    gameOverScreen.hidden = false;
  }

  function jump() {
    if (!playing || player.jumps >= 2) return;
    player.vy = player.jumps === 0 ? -720 : -660;
    player.jumps += 1;
    player.grounded = false;
    player.squash = 0.08;
    tapHintEl.hidden = true;
    burst(player.x + player.w * 0.45, player.y + player.h, 4, "#c8ae7b");
  }

  function burst(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x,
        y,
        vx: -30 - Math.random() * 90,
        vy: -20 - Math.random() * 100,
        life: 0.35 + Math.random() * 0.25,
        max: 0.55,
        size: 3 + Math.random() * 5,
        color
      });
    }
  }

  function spawnObstacle() {
    const size = 34 + Math.random() * 20;
    const y = groundY - size;
    obstacles.push({ x: W + 30, y, w: size, h: size, wobble: Math.random() * Math.PI * 2 });
    const difficulty = Math.min(1, distance / 1400);
    nextObstacleDelay = 1.1 - difficulty * 0.28 + Math.random() * (0.58 - difficulty * 0.12);
    if (Math.random() < 0.18 + difficulty * 0.16) {
      obstacles.push({
        x: W + 30 + size + 48 + Math.random() * 18,
        y: groundY - size * 0.92,
        w: size * 0.92,
        h: size * 0.92,
        wobble: Math.random() * 6
      });
    }
  }

  function spawnLetter() {
    if (feverRemaining > 0) return;
    const index = collected;
    const ch = WORD[index];
    if (!ch) return;
    const heights = [groundY - 110, groundY - 175, groundY - 235];
    const y = heights[Math.floor(Math.random() * heights.length)];
    pickups.push({ type: "letter", ch, index, x: W + 40, y, r: 22, spin: 0 });
    nextLetterDelay = 5.8 + Math.random() * 4;
  }

  function spawnStairs() {
    const stepW = Math.max(64, Math.min(88, W * 0.18));
    const heights = [28, 56, 84];
    heights.forEach((height, i) => {
      platforms.push({
        x: W + 70 + i * stepW,
        y: groundY - height,
        w: stepW + 2,
        h: height,
        top: groundY - height
      });
    });
    if (Math.random() < 0.5) {
      platforms.push({
        x: W + 70 + 3 * stepW,
        y: groundY - 84,
        w: stepW * 1.4,
        h: 84,
        top: groundY - 84
      });
    }
    nextStairDelay = 8 + Math.random() * 5;
  }

  function triggerFever() {
    feverRemaining = FEVER_SECONDS;
    feverEl.hidden = false;
    flash = 0.35;
    burst(player.x + player.w / 2, player.y + player.h / 2, 26, "#ffd34d");
  }

  function collectLetter(item) {
    if (item.index !== collected) return;
    collected += 1;
    updateLetterHud();
    burst(item.x, item.y, 14, "#ffd34d");
    if (collected >= WORD.length) triggerFever();
  }

  function finishFever() {
    feverRemaining = 0;
    feverEl.hidden = true;
    collected = 0;
    updateLetterHud();
    letterTimer = 0;
    nextLetterDelay = 5.2 + Math.random() * 2.5;
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function playerHitbox() {
    return {
      x: player.x + player.w * 0.22,
      y: player.y + player.h * 0.18,
      w: player.w * 0.58,
      h: player.h * 0.72
    };
  }

  function pickupHit(item) {
    const p = playerHitbox();
    const b = { x: item.x - item.r, y: item.y - item.r, w: item.r * 2, h: item.r * 2 };
    return rectsOverlap(p, b);
  }

  function update(dt) {
    elapsed += dt;
    const baseSpeed = 290 + Math.min(165, distance * 0.085);
    const worldSpeed = feverRemaining > 0 ? baseSpeed * 1.28 : baseSpeed;
    speed = worldSpeed;
    distance += worldSpeed * dt / 23 * (feverRemaining > 0 ? 1.7 : 1);

    obstacleTimer += dt;
    letterTimer += dt;
    stairTimer += dt;
    if (obstacleTimer >= nextObstacleDelay) {
      obstacleTimer = 0;
      spawnObstacle();
    }
    if (letterTimer >= nextLetterDelay) {
      letterTimer = 0;
      spawnLetter();
    }
    if (stairTimer >= nextStairDelay) {
      stairTimer = 0;
      spawnStairs();
    }

    platforms.forEach(p => p.x -= worldSpeed * dt);
    platforms = platforms.filter(p => p.x + p.w > -30);
    obstacles.forEach(o => {
      o.x -= worldSpeed * dt;
      o.wobble += dt * 4;
    });
    pickups.forEach(p => {
      p.x -= worldSpeed * dt;
      p.spin += dt * 4;
    });

    const prevBottom = player.y + player.h;
    player.vy += 1900 * dt;
    player.y += player.vy * dt;
    let landingY = groundY;
    for (const p of platforms) {
      const overlapsX = player.x + player.w * 0.72 > p.x && player.x + player.w * 0.24 < p.x + p.w;
      if (!overlapsX) continue;
      const nowBottom = player.y + player.h;
      if (player.vy >= 0 && prevBottom <= p.top + 12 && nowBottom >= p.top) {
        landingY = Math.min(landingY, p.top);
      }
    }

    if (player.y + player.h >= landingY && player.vy >= 0) {
      player.y = landingY - player.h;
      if (!player.grounded) {
        burst(player.x + player.w * 0.45, landingY, 5, "#c8ae7b");
        player.squash = 0.1;
      }
      player.vy = 0;
      player.jumps = 0;
      player.grounded = true;
    } else {
      player.grounded = false;
    }

    if (player.squash > 0) player.squash = Math.max(0, player.squash - dt);

    const hitbox = playerHitbox();
    for (const o of obstacles) {
      const b = { x: o.x + o.w * 0.16, y: o.y + o.h * 0.12, w: o.w * 0.68, h: o.h * 0.82 };
      if (rectsOverlap(hitbox, b)) {
        if (feverRemaining > 0) {
          burst(o.x + o.w / 2, o.y + o.h / 2, 12, "#8b542e");
          o.dead = true;
        } else {
          endGame();
          return;
        }
      }
    }
    obstacles = obstacles.filter(o => !o.dead && o.x + o.w > -40);

    for (const item of pickups) {
      if (pickupHit(item)) {
        collectLetter(item);
        item.dead = true;
      }
    }
    pickups = pickups.filter(p => !p.dead && p.x + p.r > -30);

    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 260 * dt;
      p.life -= dt;
    }
    particles = particles.filter(p => p.life > 0);

    if (feverRemaining > 0) {
      feverRemaining -= dt;
      feverBarEl.style.transform = `scaleX(${Math.max(0, feverRemaining / FEVER_SECONDS)})`;
      if (feverRemaining <= 0) finishFever();
    }
    flash = Math.max(0, flash - dt);
    updateHud();
  }

  function updateHud() {
    distanceEl.textContent = `${Math.floor(distance)}m`;
    bestEl.textContent = `${Math.floor(best)}m`;
  }

  function backgroundPalette() {
    const phase = Math.floor(distance / 450) % 4;
    if (phase === 1) return { sky1: "#ffe7b5", sky2: "#f7b98e", hill: "#8ebc83", ground: "#87b56d", label: "ゆうがた" };
    if (phase === 2) return { sky1: "#91b8dd", sky2: "#526c9a", hill: "#536b68", ground: "#66845e", label: "よる" };
    if (phase === 3) return { sky1: "#caecff", sky2: "#94d7f0", hill: "#74b79b", ground: "#78aa62", label: "あさ" };
    return { sky1: "#dff7ef", sky2: "#a9e1d0", hill: "#87c39a", ground: "#7fb268", label: "ひる" };
  }

  function drawBackground() {
    const pal = backgroundPalette();
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, pal.sky1);
    grad.addColorStop(0.72, pal.sky2);
    grad.addColorStop(1, pal.ground);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const scroll = (elapsed * speed * 0.08) % (W + 180);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = pal.hill;
    for (let i = -1; i < 5; i++) {
      const x = i * 190 - scroll;
      ctx.beginPath();
      ctx.arc(x, groundY + 40, 150, Math.PI, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = pal.ground;
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = "rgba(255,255,255,.45)";
    ctx.fillRect(0, groundY, W, 4);

    ctx.fillStyle = "rgba(36,55,47,.32)";
    ctx.font = "800 11px -apple-system, sans-serif";
    ctx.fillText(pal.label, 10, 18);
  }

  function drawPlatform(p) {
    ctx.fillStyle = "#b68b54";
    roundRect(p.x, p.y, p.w, p.h + 20, 10);
    ctx.fill();
    ctx.fillStyle = "#7fb268";
    roundRect(p.x, p.y, p.w, 11, 7);
    ctx.fill();
  }

  function drawChestnut(o) {
    ctx.save();
    ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
    ctx.rotate(Math.sin(o.wobble) * 0.08);
    ctx.font = `${Math.floor(o.w * 0.92)}px Apple Color Emoji, "Noto Color Emoji", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🌰", 0, 2);
    ctx.restore();
  }

  function drawLetter(item) {
    ctx.save();
    ctx.translate(item.x, item.y + Math.sin(item.spin) * 5);
    ctx.fillStyle = "#ffe07b";
    ctx.strokeStyle = "#d89b12";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, item.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#704400";
    ctx.font = "1000 23px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(item.ch, 0, 1);
    ctx.restore();
  }

  function drawPlayer() {
    const img = player.grounded ? runImage : jumpImage;
    const loaded = img.complete && img.naturalWidth > 0;
    const squash = player.squash > 0 ? 0.94 : 1;
    const stretch = player.squash > 0 ? 1.06 : 1;
    ctx.save();
    ctx.translate(player.x + player.w / 2, player.y + player.h);
    ctx.scale(stretch, squash);
    if (feverRemaining > 0) {
      ctx.shadowColor = "#ffd43b";
      ctx.shadowBlur = 24;
    }
    if (loaded) {
      ctx.drawImage(img, -player.w / 2, -player.h, player.w, player.h);
    } else {
      ctx.fillStyle = "#83d2ba";
      ctx.beginPath();
      ctx.arc(0, -player.h / 2, player.w * 0.36, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFeverOverlay() {
    if (feverRemaining <= 0 && flash <= 0) return;
    ctx.save();
    ctx.globalAlpha = feverRemaining > 0 ? 0.06 + Math.sin(elapsed * 10) * 0.025 : flash * 0.25;
    ctx.fillStyle = "#ffd63d";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function render() {
    if (!ctx || !W || !H) return;
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    platforms.forEach(drawPlatform);
    pickups.forEach(drawLetter);
    obstacles.forEach(drawChestnut);
    drawPlayer();
    drawParticles();
    drawFeverOverlay();
  }

  function loop(t) {
    if (!playing) return;
    const dt = Math.min(0.033, Math.max(0, (t - lastT) / 1000));
    lastT = t;
    update(dt);
    render();
    if (playing) raf = requestAnimationFrame(loop);
  }

  function handleTap(e) {
    if (!playing) return;
    if (e) e.preventDefault();
    jump();
  }

  canvas.addEventListener("pointerdown", handleTap, { passive: false });
  wrap.addEventListener("pointerdown", e => {
    if (e.target === canvas || e.target.closest("button")) return;
    handleTap(e);
  }, { passive: false });

  window.addEventListener("keydown", e => {
    if (["Space", "ArrowUp", "KeyW"].includes(e.code)) {
      e.preventDefault();
      jump();
    }
  });

  startButton.addEventListener("click", startGame);
  restartButton.addEventListener("click", startGame);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && playing) lastT = performance.now();
  });

  buildLetterHud();
  bestEl.textContent = `${best}m`;
  resize();
  render();
})();
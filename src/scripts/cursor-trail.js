export default function initCursorTrail() {
  const canHoverFine = window.matchMedia(
    "(hover: hover) and (pointer: fine)"
  ).matches;
  const allowMotion = window.matchMedia(
    "(prefers-reduced-motion: no-preference)"
  ).matches;

  if (!canHoverFine || !allowMotion) {
    return;
  }

  const smokeCanvas = document.querySelector("#bg-smoke-canvas");
  const trailCanvas = document.querySelector("#cursor-trail-canvas");
  const orb = document.querySelector("#cursor-glass-orb");

  // Pre-render soft multi-lobe organic smoke puff sprites for 60fps fluid blending
  const createSmokeSprite = (primaryRgb, secondaryRgb, size = 256) => {
    const offscreen = document.createElement("canvas");
    offscreen.width = size;
    offscreen.height = size;
    const sctx = offscreen.getContext("2d");
    if (!sctx) return offscreen;

    const c = size / 2;
    const lobes = [
      { ox: 0, oy: 0, r: c * 0.92, rgb: primaryRgb, a: 0.42 },
      { ox: -c * 0.18, oy: -c * 0.12, r: c * 0.68, rgb: secondaryRgb, a: 0.3 },
      { ox: c * 0.2, oy: c * 0.14, r: c * 0.64, rgb: primaryRgb, a: 0.26 },
      { ox: c * 0.08, oy: -c * 0.2, r: c * 0.56, rgb: secondaryRgb, a: 0.22 },
    ];

    lobes.forEach(({ ox, oy, r, rgb, a }) => {
      const grad = sctx.createRadialGradient(
        c + ox,
        c + oy,
        0,
        c + ox,
        c + oy,
        r
      );
      grad.addColorStop(0, `rgba(${rgb}, ${a})`);
      grad.addColorStop(0.42, `rgba(${rgb}, ${(a * 0.48).toFixed(3)})`);
      grad.addColorStop(0.75, `rgba(${rgb}, ${(a * 0.12).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${rgb}, 0)`);
      sctx.fillStyle = grad;
      sctx.beginPath();
      sctx.arc(c + ox, c + oy, r, 0, Math.PI * 2);
      sctx.fill();
    });

    return offscreen;
  };

  // 1. Background Rose-Pink Smoke Plumes + Foreground Glass Ribbon + Frosted Orb
  const smokeCtx = smokeCanvas?.getContext("2d") || null;
  const trailCtx = trailCanvas?.getContext("2d") || null;

  if (smokeCtx || (trailCtx && orb)) {
    const smokeSprites = smokeCtx
      ? [
          createSmokeSprite("255, 107, 157", "255, 154, 194"), // Rose pink & soft blush
          createSmokeSprite("244, 88, 148", "192, 60, 132"), // Deep rose & plum mist
          createSmokeSprite("255, 126, 174", "45, 212, 191"), // Blush rose with whisper of teal
        ]
      : [];

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const SMOKE_SCALE = 0.5; // Half-res canvas creates naturally silkier smoke & keeps GPU ultra-light

    const resizeCanvases = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (trailCanvas && trailCtx) {
        trailCanvas.width = Math.floor(width * dpr);
        trailCanvas.height = Math.floor(height * dpr);
        trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      if (smokeCanvas && smokeCtx) {
        smokeCanvas.width = Math.max(1, Math.floor(width * SMOKE_SCALE));
        smokeCanvas.height = Math.max(1, Math.floor(height * SMOKE_SCALE));
        smokeCtx.setTransform(SMOKE_SCALE, 0, 0, SMOKE_SCALE, 0, 0);
      }
    };

    resizeCanvases();
    window.addEventListener("resize", resizeCanvases, { passive: true });

    const MAX_TRAIL_AGE_MS = 360;
    const MAX_TRAIL_POINTS = 28;
    const MAX_SMOKE_PUFFS = 68;

    const trailPoints = [];
    const smokePuffs = [];

    let targetX = -100;
    let targetY = -100;
    let prevPointerX = null;
    let prevPointerY = null;
    let orbX = -100;
    let orbY = -100;
    let isVisible = false;
    let isHovering = false;
    let isPressed = false;
    let rafId = null;
    let lastFrameTime = performance.now();

    const spawnSmokePuff = (x, y, vx, vy, now) => {
      if (!smokeCtx || smokeSprites.length === 0) return;

      const speed = Math.min(28, Math.hypot(vx, vy));
      const spriteIdx =
        Math.random() < 0.14 ? 2 : Math.random() < 0.55 ? 0 : 1;

      smokePuffs.push({
        x: x + (Math.random() - 0.5) * 18,
        y: y + (Math.random() - 0.5) * 18,
        vx: vx * 0.055 + (Math.random() - 0.5) * 0.45,
        vy: vy * 0.055 - 0.28 + (Math.random() - 0.5) * 0.35,
        startRadius: 54 + speed * 1.4 + Math.random() * 26,
        endRadius: 195 + speed * 3.8 + Math.random() * 75,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.014,
        phase: Math.random() * Math.PI * 2,
        peakAlpha: 0.19 + Math.min(0.11, speed * 0.004),
        birth: now,
        lifeMs: 1350 + Math.random() * 750,
        sprite: smokeSprites[spriteIdx],
      });

      if (smokePuffs.length > MAX_SMOKE_PUFFS) {
        smokePuffs.shift();
      }
    };

    const updateOrbTransform = () => {
      if (!orb) return;
      const scale = isPressed ? 0.86 : isHovering ? 1.42 : 1;
      orb.style.transform = `translate3d(${orbX}px, ${orbY}px, 0) translate(-50%, -50%) scale(${scale})`;
    };

    const render = (now) => {
      const dt = Math.min(32, Math.max(8, now - lastFrameTime)) / 16.667;
      lastFrameTime = now;

      // Render background pink smoke clouds
      if (smokeCtx) {
        smokeCtx.clearRect(0, 0, width, height);
        smokeCtx.save();
        smokeCtx.globalCompositeOperation = "screen";

        for (let i = smokePuffs.length - 1; i >= 0; i -= 1) {
          const p = smokePuffs[i];
          const progress = (now - p.birth) / p.lifeMs;
          if (progress >= 1) {
            smokePuffs.splice(i, 1);
            continue;
          }

          // Gentle organic swirl & upward smoke dissipation
          const swirl = Math.sin(progress * 4.5 + p.phase) * 0.22;
          p.vx = p.vx * Math.pow(0.975, dt) + swirl * 0.08 * dt;
          p.vy = p.vy * Math.pow(0.978, dt) - 0.012 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.angle += p.spin * dt;

          // Smooth ease-out expansion & soft bell fade
          const eased = 1 - Math.pow(1 - progress, 2.2);
          const radius = p.startRadius + (p.endRadius - p.startRadius) * eased;
          const fadeIn = Math.min(1, progress / 0.14);
          const fadeOut = Math.pow(1 - progress, 1.55);
          const alpha = p.peakAlpha * fadeIn * fadeOut;

          if (alpha <= 0.004) continue;

          smokeCtx.save();
          smokeCtx.globalAlpha = alpha;
          smokeCtx.translate(p.x, p.y);
          smokeCtx.rotate(p.angle);
          smokeCtx.drawImage(p.sprite, -radius, -radius, radius * 2, radius * 2);
          smokeCtx.restore();
        }

        smokeCtx.restore();
      }

      // Render foreground silky pink glass ribbon
      if (trailCtx) {
        while (
          trailPoints.length > 0 &&
          now - trailPoints[0].time > MAX_TRAIL_AGE_MS
        ) {
          trailPoints.shift();
        }

        trailCtx.clearRect(0, 0, width, height);

        if (trailPoints.length >= 2) {
          trailCtx.lineCap = "round";
          trailCtx.lineJoin = "round";

          for (let i = 1; i < trailPoints.length; i += 1) {
            const prev = trailPoints[i - 1];
            const curr = trailPoints[i];
            const next = trailPoints[i + 1] || curr;

            const ageRatio = 1 - (now - curr.time) / MAX_TRAIL_AGE_MS;
            const indexRatio = i / (trailPoints.length - 1);
            const alpha = Math.max(0, Math.min(1, ageRatio * indexRatio));
            if (alpha <= 0.01) continue;

            const midX = (curr.x + next.x) * 0.5;
            const midY = (curr.y + next.y) * 0.5;
            const startX = i === 1 ? prev.x : (prev.x + curr.x) * 0.5;
            const startY = i === 1 ? prev.y : (prev.y + curr.y) * 0.5;

            // Pass 1: Soft frosted pink glass bloom
            trailCtx.beginPath();
            trailCtx.moveTo(startX, startY);
            trailCtx.quadraticCurveTo(curr.x, curr.y, midX, midY);
            trailCtx.strokeStyle = `rgba(255, 107, 157, ${(alpha * 0.16).toFixed(3)})`;
            trailCtx.lineWidth = Math.max(1.5, 15 * alpha);
            trailCtx.stroke();

            // Pass 2: Core rose-pink translucent ribbon
            trailCtx.beginPath();
            trailCtx.moveTo(startX, startY);
            trailCtx.quadraticCurveTo(curr.x, curr.y, midX, midY);
            trailCtx.strokeStyle = `rgba(255, 118, 166, ${(alpha * 0.7).toFixed(3)})`;
            trailCtx.lineWidth = Math.max(1, 4.8 * alpha);
            trailCtx.stroke();

            // Pass 3: Crisp glass specular highlight along center
            trailCtx.beginPath();
            trailCtx.moveTo(startX, startY);
            trailCtx.quadraticCurveTo(curr.x, curr.y, midX, midY);
            trailCtx.strokeStyle = `rgba(255, 255, 255, ${(alpha * 0.48).toFixed(3)})`;
            trailCtx.lineWidth = Math.max(0.6, 1.4 * alpha);
            trailCtx.stroke();
          }
        }
      }

      // Smoothly lerp frosted glass orb
      const dx = targetX - orbX;
      const dy = targetY - orbY;
      orbX += dx * 0.22;
      orbY += dy * 0.22;
      updateOrbTransform();

      const settled = Math.hypot(dx, dy) < 0.25;
      if (trailPoints.length > 0 || smokePuffs.length > 0 || !settled) {
        rafId = window.requestAnimationFrame(render);
      } else {
        rafId = null;
      }
    };

    const startLoop = () => {
      if (rafId === null) {
        lastFrameTime = performance.now();
        rafId = window.requestAnimationFrame(render);
      }
    };

    let lastSmokeSpawn = 0;

    window.addEventListener(
      "pointermove",
      (event) => {
        if (event.pointerType === "touch") return;

        const now = performance.now();
        const x = event.clientX;
        const y = event.clientY;
        const vx = prevPointerX === null ? 0 : x - prevPointerX;
        const vy = prevPointerY === null ? 0 : y - prevPointerY;
        const dist = Math.hypot(vx, vy);

        prevPointerX = x;
        prevPointerY = y;
        targetX = x;
        targetY = y;

        if (!isVisible) {
          orbX = x;
          orbY = y;
          isVisible = true;
          orb?.classList.add("is-visible");
        }

        const last = trailPoints[trailPoints.length - 1];
        if (!last || Math.hypot(x - last.x, y - last.y) >= 2) {
          trailPoints.push({ x, y, time: now });
          if (trailPoints.length > MAX_TRAIL_POINTS) {
            trailPoints.shift();
          }
        }

        // Emit velvety pink smoke puffs proportional to pointer travel
        if (dist >= 4 && now - lastSmokeSpawn >= 22) {
          lastSmokeSpawn = now;
          spawnSmokePuff(x, y, vx, vy, now);
          if (dist > 28) {
            spawnSmokePuff(x - vx * 0.5, y - vy * 0.5, vx * 0.7, vy * 0.7, now);
          }
        }

        startLoop();
      },
      { passive: true }
    );

    document.documentElement.addEventListener("pointerleave", () => {
      isVisible = false;
      isHovering = false;
      isPressed = false;
      prevPointerX = null;
      prevPointerY = null;
      orb?.classList.remove("is-visible", "is-hovering");
    });

    document.addEventListener(
      "pointerover",
      (event) => {
        const interactive = event.target?.closest?.(
          "a, button, [role='button']"
        );
        if (interactive && !isHovering) {
          isHovering = true;
          orb?.classList.add("is-hovering");
          startLoop();
        }
      },
      { passive: true }
    );

    document.addEventListener(
      "pointerout",
      (event) => {
        if (!isHovering) return;
        const toInteractive = event.relatedTarget?.closest?.(
          "a, button, [role='button']"
        );
        if (!toInteractive) {
          isHovering = false;
          orb?.classList.remove("is-hovering");
          startLoop();
        }
      },
      { passive: true }
    );

    window.addEventListener(
      "pointerdown",
      (event) => {
        if (event.pointerType === "touch") return;
        isPressed = true;
        spawnSmokePuff(event.clientX, event.clientY, 0, -4, performance.now());
        startLoop();
      },
      { passive: true }
    );

    window.addEventListener(
      "pointerup",
      () => {
        if (!isPressed) return;
        isPressed = false;
        startLoop();
      },
      { passive: true }
    );
  }

  // 2. Interactive Rose-Pink Glass Spotlight on .glass-card & .glass-panel surfaces
  const glassSurfaces = document.querySelectorAll(".glass-card, .glass-panel");
  glassSurfaces.forEach((surface) => {
    let rect = surface.getBoundingClientRect();

    const resizeObserver = new ResizeObserver(() => {
      rect = surface.getBoundingClientRect();
    });
    resizeObserver.observe(surface);

    surface.addEventListener(
      "pointerenter",
      () => {
        rect = surface.getBoundingClientRect();
      },
      { passive: true }
    );

    surface.addEventListener(
      "pointermove",
      (event) => {
        if (event.pointerType === "touch") return;
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        surface.style.setProperty("--mouse-x", `${x}px`);
        surface.style.setProperty("--mouse-y", `${y}px`);
      },
      { passive: true }
    );
  });
}

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

  const canvas = document.querySelector("#cursor-trail-canvas");
  const orb = document.querySelector("#cursor-glass-orb");

  // 1. Rose-Pink Glass Ribbon Trail + Floating Frosted Glass Orb
  if (canvas && orb) {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      let width = window.innerWidth;
      let height = window.innerHeight;
      let dpr = Math.min(window.devicePixelRatio || 1, 2);

      const resizeCanvas = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };

      resizeCanvas();
      window.addEventListener("resize", resizeCanvas, { passive: true });

      const MAX_AGE_MS = 360;
      const MAX_POINTS = 28;
      const points = [];

      let targetX = -100;
      let targetY = -100;
      let orbX = -100;
      let orbY = -100;
      let isVisible = false;
      let isHovering = false;
      let isPressed = false;
      let rafId = null;

      const updateOrbTransform = () => {
        const scale = isPressed ? 0.86 : isHovering ? 1.42 : 1;
        orb.style.transform = `translate3d(${orbX}px, ${orbY}px, 0) translate(-50%, -50%) scale(${scale})`;
      };

      const render = (now) => {
        // Prune expired points
        while (points.length > 0 && now - points[0].time > MAX_AGE_MS) {
          points.shift();
        }

        ctx.clearRect(0, 0, width, height);

        if (points.length >= 2) {
          ctx.lineCap = "round";
          ctx.lineJoin = "round";

          for (let i = 1; i < points.length; i += 1) {
            const prev = points[i - 1];
            const curr = points[i];
            const next = points[i + 1] || curr;

            const ageRatio = 1 - (now - curr.time) / MAX_AGE_MS;
            const indexRatio = i / (points.length - 1);
            const alpha = Math.max(0, Math.min(1, ageRatio * indexRatio));
            if (alpha <= 0.01) continue;

            const midX = (curr.x + next.x) * 0.5;
            const midY = (curr.y + next.y) * 0.5;
            const startX = i === 1 ? prev.x : (prev.x + curr.x) * 0.5;
            const startY = i === 1 ? prev.y : (prev.y + curr.y) * 0.5;

            // Pass 1: Soft frosted pink glass bloom
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
            ctx.strokeStyle = `rgba(255, 107, 157, ${(alpha * 0.17).toFixed(3)})`;
            ctx.lineWidth = Math.max(1.5, 16 * alpha);
            ctx.stroke();

            // Pass 2: Core rose-pink translucent ribbon
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
            ctx.strokeStyle = `rgba(255, 118, 166, ${(alpha * 0.72).toFixed(3)})`;
            ctx.lineWidth = Math.max(1, 5.2 * alpha);
            ctx.stroke();

            // Pass 3: Crisp glass specular highlight along center
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
            ctx.strokeStyle = `rgba(255, 255, 255, ${(alpha * 0.48).toFixed(3)})`;
            ctx.lineWidth = Math.max(0.6, 1.5 * alpha);
            ctx.stroke();
          }
        }

        // Smoothly lerp the frosted glass lens toward the pointer
        const dx = targetX - orbX;
        const dy = targetY - orbY;
        orbX += dx * 0.22;
        orbY += dy * 0.22;
        updateOrbTransform();

        const settled = Math.hypot(dx, dy) < 0.25;
        if (points.length > 0 || !settled) {
          rafId = window.requestAnimationFrame(render);
        } else {
          rafId = null;
        }
      };

      const startLoop = () => {
        if (rafId === null) {
          rafId = window.requestAnimationFrame(render);
        }
      };

      window.addEventListener(
        "pointermove",
        (event) => {
          if (event.pointerType === "touch") return;

          const x = event.clientX;
          const y = event.clientY;
          targetX = x;
          targetY = y;

          if (!isVisible) {
            orbX = x;
            orbY = y;
            isVisible = true;
            orb.classList.add("is-visible");
          }

          const last = points[points.length - 1];
          if (!last || Math.hypot(x - last.x, y - last.y) >= 2) {
            points.push({ x, y, time: performance.now() });
            if (points.length > MAX_POINTS) {
              points.shift();
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
        orb.classList.remove("is-visible", "is-hovering");
      });

      document.addEventListener(
        "pointerover",
        (event) => {
          const interactive = event.target?.closest?.(
            "a, button, [role='button']"
          );
          if (interactive && !isHovering) {
            isHovering = true;
            orb.classList.add("is-hovering");
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
            orb.classList.remove("is-hovering");
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

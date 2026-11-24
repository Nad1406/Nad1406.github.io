import "../css/style.css";
import initScrollReveal from "./scroll-reveal";
import initCursorTrail from "./cursor-trail";

initScrollReveal();
initCursorTrail();

// Fallback for Scroll-Driven Progress Bar when CSS animation-timeline is unsupported
const progressBar = document.querySelector("#scroll-progress");
if (
  progressBar &&
  !CSS.supports("animation-timeline", "scroll()") &&
  window.matchMedia("(prefers-reduced-motion: no-preference)").matches
) {
  const updateScrollProgress = () => {
    const scrollable =
      document.documentElement.scrollHeight - window.innerHeight;
    const ratio =
      scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
    progressBar.style.transform = `scaleX(${ratio})`;
  };

  window.addEventListener("scroll", updateScrollProgress, { passive: true });
  window.addEventListener("resize", updateScrollProgress, { passive: true });
  updateScrollProgress();
}

// Scroll-spy for floating glass navbar links
const navLinks = Array.from(document.querySelectorAll("a[data-nav-link]"));
const trackedSections = Array.from(document.querySelectorAll("main section[id]"));

if (navLinks.length > 0 && trackedSections.length > 0) {
  const setActiveNav = (activeId) => {
    navLinks.forEach((link) => {
      const targetId = link.getAttribute("href")?.slice(1);
      if (targetId === activeId) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  const spyObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (visible.length > 0) {
        setActiveNav(visible[0].target.id);
      }
    },
    {
      rootMargin: "-30% 0px -55% 0px",
      threshold: [0.1, 0.35, 0.6],
    }
  );

  trackedSections.forEach((section) => spyObserver.observe(section));
}

// Copy email action with accessible live-region feedback
const copyEmailBtn = document.querySelector("#copy-email-btn");
const copyEmailLabel = document.querySelector("#copy-email-label");
const copyEmailStatus = document.querySelector("#copy-email-status");

if (copyEmailBtn && copyEmailLabel && copyEmailStatus) {
  const emailAddress = "oneone2683@gmail.com";
  let resetTimer = null;

  const fallbackCopy = (text) => {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    document.execCommand("copy");
    document.body.removeChild(helper);
  };

  copyEmailBtn.addEventListener("click", async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(emailAddress);
      } else {
        fallbackCopy(emailAddress);
      }

      copyEmailLabel.textContent = "Email Copied";
      copyEmailStatus.textContent = "Copied to clipboard";

      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        copyEmailLabel.textContent = "Copy Email";
        copyEmailStatus.textContent = "";
      }, 2500);
    } catch {
      copyEmailLabel.textContent = emailAddress;
      copyEmailStatus.textContent = emailAddress;
    }
  });
}

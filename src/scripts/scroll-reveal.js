import ScrollReveal from "scrollreveal";

export default function initScrollReveal(defaultProps = null) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const baseDefaults = {
    reset: false,
    distance: "24px",
    duration: 750,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    viewFactor: 0.12,
  };

  const mergedDefaults = Object.assign({}, baseDefaults, defaultProps);
  const isDesktop = window.innerWidth > 768;

  const targetElements = [
    {
      element: ".banner-badge",
      animation: {
        delay: 120,
        distance: "14px",
        origin: "bottom",
      },
    },
    {
      element: ".banner-text",
      animation: {
        delay: 260,
        interval: 120,
        origin: isDesktop ? "left" : "bottom",
      },
    },
    {
      element: ".banner-cta",
      animation: {
        delay: 560,
        origin: isDesktop ? "left" : "bottom",
      },
    },
    {
      element: ".section-title",
      animation: {
        delay: 140,
        distance: "18px",
        origin: "bottom",
      },
    },
    {
      element: ".section-content",
      animation: {
        delay: 260,
        distance: "22px",
        origin: "bottom",
      },
    },
    {
      element: ".reveal-card",
      animation: {
        delay: 180,
        interval: 100,
        distance: "24px",
        origin: "bottom",
      },
    },
  ];

  const sr = ScrollReveal(mergedDefaults);

  targetElements.forEach(({ element, animation }) => {
    sr.reveal(element, Object.assign({}, mergedDefaults, animation));
  });
}

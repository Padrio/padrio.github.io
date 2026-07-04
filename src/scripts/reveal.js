// Staggered scroll-reveal for [data-reveal] elements.
// Pairs with the `html.js [data-reveal]` rules in global.css: without JS the
// class never lands on <html> and content stays visible.
const elements = Array.from(document.querySelectorAll('[data-reveal]'));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (elements.length > 0) {
  if (reduceMotion || !('IntersectionObserver' in window)) {
    elements.forEach((el) => el.classList.add('is-revealed'));
  } else {
    // Stagger siblings that share a parent (70ms apart, capped at 420ms)
    const groups = new Map();
    elements.forEach((el) => {
      const parent = el.parentElement;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push(el);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          observer.unobserve(el);
          const siblings = groups.get(el.parentElement) || [];
          const index = Math.max(0, siblings.indexOf(el));
          el.style.transitionDelay = `${Math.min(index * 70, 420)}ms`;
          el.classList.add('is-revealed');
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0 }
    );

    elements.forEach((el) => observer.observe(el));
  }
}

/*
 * Stats Block
 * Animated counter bar with numbers that count up on scroll
 * Each row: col 1 = number value (e.g. "85%"), col 2 = label text
 */
function animateValue(el, target, prefix, suffix, duration) {
  const startTime = performance.now();

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - (1 - progress) ** 3;
    const current = Math.round(eased * target);
    el.textContent = prefix + current.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

export default function decorate(block) {
  const rows = [...block.children];

  block.setAttribute('role', 'list');
  block.setAttribute('aria-label', 'Key statistics');

  rows.forEach((row) => {
    row.classList.add('stats-item');
    row.setAttribute('role', 'listitem');
    const cols = [...row.children];

    if (cols[0]) {
      cols[0].classList.add('stats-value');
      const text = cols[0].textContent.trim();
      const numStr = text.match(/(\d+(?:\.\d+)?)/)?.[0] ?? '';
      const num = numStr ? parseFloat(numStr) : 0;
      const numIdx = numStr ? text.indexOf(numStr) : -1;
      const prefix = numIdx > 0 ? text.slice(0, numIdx) : '';
      const suffix = numIdx >= 0 ? text.slice(numIdx + numStr.length) : text;
      cols[0].dataset.target = num;
      cols[0].dataset.prefix = prefix;
      cols[0].dataset.suffix = suffix;
      cols[0].setAttribute('aria-label', text);
      cols[0].textContent = `${prefix}0${suffix}`;
    }

    if (cols[1]) cols[1].classList.add('stats-label');
  });

  // Animate when scrolled into view
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        block.classList.add('visible');
        rows.forEach((row, i) => {
          const valueEl = row.querySelector('.stats-value');
          if (valueEl) {
            const target = parseFloat(valueEl.dataset.target) || 0;
            const { prefix = '', suffix } = valueEl.dataset;
            setTimeout(() => animateValue(valueEl, target, prefix, suffix, 1800), i * 200);
          }
        });
      }
    },
    { threshold: 0.3 },
  );

  observer.observe(block);
}

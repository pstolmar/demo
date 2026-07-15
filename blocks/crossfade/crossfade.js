/*
 * Crossfade Block
 * Scroll-triggered crossfade carousel with sticky panels
 * Each row becomes a panel: col 1 = image, col 2 = text content
 */
export default function decorate(block) {
  const rows = [...block.children];
  const panelCount = rows.length;
  if (panelCount === 0) return;

  // Carousel ARIA semantics
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'carousel');
  block.setAttribute('aria-label', 'Featured content');

  // Transform rows into crossfade panels
  rows.forEach((row, i) => {
    row.classList.add('crossfade-panel');
    if (i === 0) row.classList.add('active');
    row.setAttribute('role', 'group');
    row.setAttribute('aria-roledescription', 'slide');
    row.setAttribute('aria-label', `Slide ${i + 1} of ${panelCount}`);
    const cols = [...row.children];
    if (cols[0]) cols[0].classList.add('crossfade-panel-media');
    if (cols[1]) cols[1].classList.add('crossfade-panel-content');
  });

  // Panel counter label (live region for screen readers)
  const counter = document.createElement('div');
  counter.className = 'crossfade-counter';
  counter.setAttribute('aria-live', 'polite');
  counter.setAttribute('aria-atomic', 'true');
  counter.textContent = `1 / ${panelCount}`;
  block.append(counter);

  // Navigation dots
  const nav = document.createElement('div');
  nav.className = 'crossfade-nav';
  nav.setAttribute('role', 'tablist');
  nav.setAttribute('aria-label', 'Slide controls');
  rows.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = `crossfade-dot${i === 0 ? ' active' : ''}`;
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Slide ${i + 1} of ${panelCount}`);
    dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    nav.append(dot);
  });
  block.append(nav);

  // Wrap the section in a scroll container for sticky behavior
  const section = block.closest('.section');
  if (!section) return;

  const scrollContainer = document.createElement('div');
  scrollContainer.className = 'crossfade-scroll-container';
  scrollContainer.style.height = `${(panelCount + 0.5) * 100}vh`;

  section.parentElement.insertBefore(scrollContainer, section);
  scrollContainer.appendChild(section);

  // Force section dimensions for sticky scroll (override EDS defaults)
  section.style.cssText = 'position:sticky;top:0;height:100vh;overflow:hidden;padding:0;display:flex;align-items:center;justify-content:center;';

  // Force block to fill section
  const wrapper = block.closest('.crossfade-wrapper');
  if (wrapper) {
    wrapper.style.cssText = 'max-width:unset;width:100%;height:100%;';
  }

  // Scroll handler
  const update = () => {
    const rect = scrollContainer.getBoundingClientRect();
    const range = scrollContainer.offsetHeight - window.innerHeight;
    if (range <= 0) return;

    const progress = Math.max(0, Math.min(0.999, -rect.top / range));
    const idx = Math.min(panelCount - 1, Math.floor(progress * panelCount));

    rows.forEach((panel, i) => panel.classList.toggle('active', i === idx));
    nav.querySelectorAll('.crossfade-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === idx);
      dot.setAttribute('aria-selected', i === idx ? 'true' : 'false');
    });
    counter.textContent = `${idx + 1} / ${panelCount}`;
  };

  window.addEventListener('scroll', update, { passive: true });
  update();
}

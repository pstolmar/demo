function parseConfig(block) {
  const cfg = {};
  block.querySelectorAll(':scope > div').forEach((row) => {
    const cells = [...row.querySelectorAll(':scope > div')];
    if (cells.length < 2) return;
    const key = cells[0].textContent.trim().toLowerCase().replace(/\s+/g, '-');
    cfg[key] = cells[1].textContent.trim();
  });
  return cfg;
}

function appendDmParams(url, fit) {
  const base = new URL(url);
  // Strip any existing dimension/format params before appending ours
  ['wid', 'hei', 'fmt', 'fit', 'qlt'].forEach((p) => base.searchParams.delete(p));
  base.searchParams.set('wid', '1920');
  base.searchParams.set('hei', '1080');
  base.searchParams.set('qlt', '75');
  base.searchParams.set('fit', fit);
  base.searchParams.set('fmt', 'webp');
  return base.toString();
}

export default function decorate(block) {
  const cfg = parseConfig(block);
  const src = cfg.src || '';
  const fit = cfg.fit || 'crop';

  if (!src) return;

  const isScene7 = src.includes('scene7.com');
  const imgSrc = isScene7 ? appendDmParams(src, fit) : src;

  const img = document.createElement('img');
  img.src = imgSrc;
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');

  block.replaceChildren(img);
  document.body.classList.add('has-dm-background');
}

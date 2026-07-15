function setBackgroundFocus(img) {
  const { title } = img.dataset;
  if (!title?.includes('data-focal')) return;
  delete img.dataset.title;
  const [x, y] = title.split(':')[1].split(',');
  img.style.objectPosition = `${x}% ${y}%`;
}

function decorateBackground(bg) {
  const bgPic = bg.querySelector('picture');
  if (!bgPic) return;

  const img = bgPic.querySelector('img');
  setBackgroundFocus(img);

  const vidLink = bgPic.closest('a[href*=".mp4"]');
  if (!vidLink) return;
  const video = document.createElement('video');
  video.src = vidLink.href;
  video.loop = true;
  video.muted = true;
  video.inert = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('preload', 'none');
  video.load();
  video.addEventListener('canplay', () => {
    video.play();
    bgPic.remove();
  });
  vidLink.parentElement.append(video, bgPic);
  vidLink.remove();
}

function decorateForeground(fg) {
  const { children } = fg;
  for (const [idx, child] of [...children].entries()) {
    const heading = child.querySelector('h1, h2, h3, h4, h5, h6');
    const text = heading || child.querySelector('p, a, ul');
    if (heading) {
      heading.classList.add('hero-heading');
      const detail = heading.previousElementSibling;
      if (detail) {
        detail.classList.add('hero-detail');
      }
    }
    // Determine foreground column types
    if (text) {
      child.classList.add('fg-text');
      if (idx === 0) {
        child.closest('.hero').classList.add('hero-text-start');
      } else {
        child.closest('.hero').classList.add('hero-text-end');
      }
    }
  }
}

export default async function init(el) {
  const rows = [...el.querySelectorAll(':scope > div')];
  const fg = rows.pop();
  fg.classList.add('hero-foreground');
  decorateForeground(fg);
  if (rows.length) {
    const bg = rows.pop();
    bg.classList.add('hero-background');
    decorateBackground(bg);
  }

  // Color-blend: animated gradient + mouse parallax + click fireworks
  if (!el.classList.contains('color-blend')) return;

  // Gradient mesh via CSS custom properties updated on mousemove
  let rafId = null;
  let targetX = 50;
  let targetY = 50;
  let currentX = 50;
  let currentY = 50;

  function lerp(a, b, t) { return a + (b - a) * t; }

  function updateGradient() {
    currentX = lerp(currentX, targetX, 0.08);
    currentY = lerp(currentY, targetY, 0.08);
    el.style.setProperty('--blend-x', `${currentX}%`);
    el.style.setProperty('--blend-y', `${currentY}%`);
    rafId = requestAnimationFrame(updateGradient);
  }
  rafId = requestAnimationFrame(updateGradient);

  el.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;
    // Cap offset at ±15% from center (50%)
    targetX = Math.min(65, Math.max(35, rawX));
    targetY = Math.min(65, Math.max(35, rawY));
  });

  el.addEventListener('mouseleave', () => {
    targetX = 50;
    targetY = 50;
  });

  // Firework canvas (created once, reused)
  let fCanvas = null;
  let fCtx = null;
  const BURST_COLORS = ['#FF6EB4', '#FFD23F', '#FF6B35'];

  function ensureCanvas() {
    if (fCanvas) return;
    fCanvas = document.createElement('canvas');
    fCanvas.className = 'hero-firework-canvas';
    fCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3;';
    el.append(fCanvas);
    fCtx = fCanvas.getContext('2d');
    fCanvas.width = el.offsetWidth;
    fCanvas.height = el.offsetHeight;
  }

  el.addEventListener('click', (e) => {
    ensureCanvas();
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    spawnBurst(x, y);
  });

  function spawnBurst(cx, cy) {
    const particles = Array.from({ length: 18 }, (_, i) => ({
      x: cx,
      y: cy,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8 - 3,
      alpha: 1,
      color: BURST_COLORS[i % BURST_COLORS.length],
      r: 3 + Math.random() * 3,
    }));

    let start = null;
    function animateBurst(ts) {
      if (!start) start = ts;
      const elapsed = ts - start;
      fCtx.clearRect(0, 0, fCanvas.width, fCanvas.height);
      let alive = false;
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3; // gravity
        p.alpha = Math.max(0, 1 - elapsed / 600);
        if (p.alpha > 0) {
          alive = true;
          fCtx.globalAlpha = p.alpha;
          fCtx.fillStyle = p.color;
          fCtx.beginPath();
          fCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          fCtx.fill();
        }
      });
      if (alive) requestAnimationFrame(animateBurst);
      else fCtx.clearRect(0, 0, fCanvas.width, fCanvas.height);
    }
    requestAnimationFrame(animateBurst);
  }

  // Cleanup on disconnect
  const mo = new MutationObserver(() => {
    if (!document.body.contains(el)) {
      cancelAnimationFrame(rafId);
      mo.disconnect();
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
}

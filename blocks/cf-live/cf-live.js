const AEM_PUBLISH = 'https://publish-p138879-e1741192.adobeaemcloud.com';

async function fetchFresh(queryPath) {
  const url = `${AEM_PUBLISH}${queryPath}?gql_ck=${Date.now()}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function hash(obj) {
  return JSON.stringify(obj);
}

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

function extractData(json) {
  const data = json?.data;
  if (!data) return null;
  for (const val of Object.values(data)) {
    if (val?.item) return { type: 'single', item: val.item };
    if (Array.isArray(val?.items)) return { type: 'list', items: val.items };
    if (Array.isArray(val)) return { type: 'list', items: val };
  }
  return null;
}

function makeBadge(mode) {
  const icons = { fingerprint: '●', reactive: '↺', compare: '⚡', manual: '↓', adaptive: '⏱' };
  const labels = { fingerprint: 'Polling', reactive: 'Reactive', compare: 'Compare', manual: 'Manual', adaptive: 'Adaptive' };
  const badge = document.createElement('div');
  badge.className = `cf-live-badge cf-live-badge-${mode}`;
  badge.innerHTML = `${icons[mode]} ${labels[mode]} <span class="cf-live-status-text"></span>`;
  if (mode === 'manual') {
    const btn = document.createElement('button');
    btn.className = 'cf-live-check-btn';
    btn.textContent = 'Check for updates';
    badge.append(btn);
  }
  return badge;
}

function renderSingle(item, mode) {
  const wrap = document.createElement('div');
  wrap.className = 'cf-live-content cf-live-promo';
  wrap.append(makeBadge(mode));
  if (item.eyebrow) {
    const ey = document.createElement('div');
    ey.className = 'cf-live-eyebrow';
    ey.textContent = item.eyebrow;
    wrap.append(ey);
  }
  const title = document.createElement('h2');
  title.className = 'cf-live-title';
  title.textContent = item.title || '';
  wrap.append(title);
  if (item.description?.html) {
    const body = document.createElement('div');
    body.className = 'cf-live-body';
    body.innerHTML = item.description.html;
    wrap.append(body);
  }
  if (item.ctaLabel) {
    const cta = document.createElement('a');
    cta.className = 'cf-live-cta button';
    cta.href = item.ctaUrl || '#';
    cta.textContent = item.ctaLabel;
    wrap.append(cta);
  }
  return wrap;
}

function renderList(items, mode) {
  const isReactive = mode === 'reactive';
  const wrap = document.createElement('div');
  wrap.className = `cf-live-content ${isReactive ? 'cf-live-press' : 'cf-live-features'}`;
  wrap.append(makeBadge(mode));
  if (mode === 'compare') {
    const banner = document.createElement('div');
    banner.className = 'cf-live-update-banner';
    banner.hidden = true;
    banner.innerHTML = '⚡ CF content updated — <button>apply now</button>';
    wrap.append(banner);
  }
  const ul = document.createElement('ul');
  ul.className = isReactive ? 'cf-live-pr-list' : 'cf-live-feature-list';
  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = isReactive ? 'cf-live-pr-item' : 'cf-live-feature-card';
    // eslint-disable-next-line no-underscore-dangle
    if (item._path) {
      // eslint-disable-next-line no-underscore-dangle
      li.dataset.aueResource = `urn:aemconnection:${item._path}`;
      li.dataset.aueType = 'reference';
    }
    if (item.eyebrow) {
      const ey = document.createElement('span');
      ey.className = 'cf-live-eyebrow';
      ey.textContent = item.eyebrow;
      li.append(ey);
    }
    const h3 = document.createElement('h3');
    h3.className = isReactive ? 'cf-live-pr-title' : 'cf-live-feature-title';
    h3.textContent = item.title || '';
    li.append(h3);
    const bodyText = item.description?.plaintext || item.description?.html?.replace(/<[^>]*>/g, '') || '';
    if (bodyText) {
      const p = document.createElement('p');
      p.className = isReactive ? 'cf-live-pr-lede' : 'cf-live-feature-body';
      p.textContent = bodyText;
      li.append(p);
    }
    ul.append(li);
  });
  wrap.append(ul);
  return wrap;
}

function renderContent(extracted, mode) {
  if (!extracted) return null;
  return extracted.type === 'list' ? renderList(extracted.items, mode) : renderSingle(extracted.item, mode);
}

function updateStatus(block, text) {
  const el = block.querySelector('.cf-live-status-text');
  if (el) el.textContent = ` · ${text}`;
}

function flashUpdate(block) {
  block.classList.remove('cf-live-updated');
  block.getBoundingClientRect();
  block.classList.add('cf-live-updated');
  setTimeout(() => block.classList.remove('cf-live-updated'), 1200);
}

const POLL_DEFAULTS = { fingerprint: 60, reactive: 300, compare: 120, manual: 0, adaptive: 30 };
const MODES = new Set(['fingerprint', 'reactive', 'compare', 'manual', 'adaptive']);

export default async function decorate(block) {
  const mode = [...block.classList].find((c) => MODES.has(c)) || 'fingerprint';
  const cfg = parseConfig(block);
  const queryPath = cfg.query;

  if (!queryPath) {
    block.innerHTML = '<p class="cf-live-error">cf-live: no query configured.</p>';
    return;
  }

  const pollSecs = parseInt(cfg.poll, 10) || POLL_DEFAULTS[mode];
  const maxPollSecs = parseInt(cfg.maxpoll, 10) || 600;

  if (cfg['cf-path']) {
    block.dataset.aueResource = `urn:aemconnection:${cfg['cf-path']}`;
    block.dataset.aueType = 'reference';
    block.dataset.aueLabel = 'Content Fragment';
  }

  block.innerHTML = '<div class="cf-live-loading" aria-busy="true" aria-label="Loading content"></div>';

  let lastHash = null;
  let pendingData = null;

  async function refresh(trigger) {
    try {
      const json = await fetchFresh(queryPath);
      const extracted = extractData(json);
      const h = hash(extracted);

      if (mode === 'compare' && trigger !== 'init') {
        if (h !== lastHash) {
          pendingData = extracted;
          const banner = block.querySelector('.cf-live-update-banner');
          if (banner) banner.hidden = false;
          updateStatus(block, 'Update available');
        } else {
          updateStatus(block, 'Last checked: just now');
        }
        return;
      }

      if (trigger === 'init' || mode === 'reactive' || h !== lastHash) {
        const newContent = renderContent(extracted, mode);
        if (newContent) {
          block.replaceChildren(newContent);
          if (trigger !== 'init') flashUpdate(block);
        }
        lastHash = h;
      }
      const triggerLabel = trigger !== 'init' && mode === 'reactive' ? ` · ${trigger}` : '';
      updateStatus(block, `Last checked: just now${triggerLabel}`);
    } catch (err) {
      if (!block.querySelector('.cf-live-content')) {
        block.innerHTML = `<p class="cf-live-error">Error loading CF: ${err.message}</p>`;
      }
    }
  }

  await refresh('init');

  if (mode === 'fingerprint') {
    let lastCheckedAt = Date.now();
    setInterval(async () => {
      await refresh('interval');
      lastCheckedAt = Date.now();
    }, pollSecs * 1000);
    setInterval(() => {
      const ago = Math.floor((Date.now() - lastCheckedAt) / 1000);
      const next = Math.max(0, pollSecs - ago);
      updateStatus(block, `Last checked: ${ago}s ago · Next in ${next}s`);
    }, 1000);
  }

  if (mode === 'reactive') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refresh('tab focus');
    });
    setInterval(() => refresh('interval'), pollSecs * 1000);
  }

  if (mode === 'compare') {
    setInterval(() => refresh('interval'), pollSecs * 1000);
    block.addEventListener('click', (e) => {
      if (!e.target.closest('.cf-live-update-banner button')) return;
      if (!pendingData) return;
      const snapshot = pendingData;
      pendingData = null;
      const newContent = renderContent(snapshot, mode);
      if (newContent) block.replaceChildren(newContent);
      lastHash = hash(snapshot);
      flashUpdate(block);
    });
  }

  if (mode === 'manual') {
    block.addEventListener('click', (e) => {
      if (e.target.closest('.cf-live-check-btn')) refresh('manual');
    });
  }

  if (mode === 'adaptive') {
    let currentInterval = pollSecs * 1000;
    const scheduleNext = () => {
      setTimeout(async () => {
        const prevHash = lastHash;
        await refresh('interval');
        currentInterval = lastHash !== prevHash
          ? pollSecs * 1000
          : Math.min(currentInterval * 2, maxPollSecs * 1000);
        updateStatus(block, `interval: ${currentInterval / 1000}s`);
        scheduleNext();
      }, currentInterval);
    };
    scheduleNext();
  }
}

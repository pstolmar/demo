# CF Live Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement three new EDS demo pages (`/promo`, `/pr`, `/feature`) with a `cf-live` block (5 freshness modes), a `dm-offer` block (DM parameterized template configurator), and a `dm-background` block (full-bleed DM image), all authored in DA Live.

**Architecture:** Three standalone EDS blocks authored in `blocks/`. Each block is vanilla JS/CSS, no build step, no external dependencies. `cf-live` fetches from AEM publish-tier GraphQL with `?gql_ck=${Date.now()}` on every call to bypass CDN caching. `dm-offer` and `dm-background` talk to Scene7 image serving directly from the browser. DA pages and fragments authored via DA MCP (`org=pstolmar`, `repo=demo`).

**Tech Stack:** Vanilla EDS JS (ESM), CSS custom properties, `@esm-bundle/chai` + `@web/test-runner` for unit tests, DA MCP for content authoring.

## Global Constraints

- AEM publish host: `https://publish-p138879-e1741192.adobeaemcloud.com` — no auth, no token
- CF Delivery OpenAPI NOT available — use GraphQL persisted queries only
- Cache-bust every GQL fetch: `?gql_ck=${Date.now()}` appended to query path
- Available queries: `/graphql/execute.json/global/hero` (single item), `/graphql/execute.json/global/featurelist` (array)
- EDS block convention: `export default async function decorate(block)`, no build step
- Block config parsed via `block > div(row) > div(cell)` — NOT `block > div > div > div`
- DA content org: `pstolmar`, repo: `demo` — use `da_create_source` / `da_update_source` MCP tools
- Fragment links in DA pages: `<p><a href="/fragments/name">…</a></p>` — ak.js auto-detects `/fragments/` hrefs
- DM base URL: `https://s7d1.scene7.com/is/image/PeterStolmarNA001/`
- DM template: `DiscountOffer` with params `$hidebackground`, `$percent`, `$image`, `$category`, `$enddate`
- Tests live in `test/blocks/` — run with `npm test`

---

## File Map

| File | Created/Modified | Purpose |
|---|---|---|
| `blocks/cf-live/cf-live.js` | Create | All 5 cf-live modes |
| `blocks/cf-live/cf-live.css` | Create | Badges, content templates, flash animation |
| `blocks/dm-offer/dm-offer.js` | Create | DM parameterized template configurator |
| `blocks/dm-offer/dm-offer.css` | Create | Side-by-side preview + controls layout |
| `blocks/dm-background/dm-background.js` | Create | Fixed full-bleed DM/AEM background |
| `blocks/dm-background/dm-background.css` | Create | Fixed positioning, overlay |
| `test/blocks/cf-live.test.js` | Create | Tests for config parsing, data extraction, initial render per mode |
| `test/blocks/dm-offer.test.js` | Create | Tests for URL construction, date formatting, form controls |
| `test/blocks/dm-background.test.js` | Create | Tests for param appending, DOM structure |

---

## Task 1: `cf-live` block

Implements all five freshness modes in a single block. Each mode is triggered by a CSS class modifier on the block element. All modes share `fetchFresh()` + `extractData()` utilities defined at module scope.

**Files:**
- Create: `blocks/cf-live/cf-live.js`
- Create: `blocks/cf-live/cf-live.css`
- Create: `test/blocks/cf-live.test.js`

**Interfaces:**
- Consumes: `fetchFresh(queryPath)` → Promise\<JSON\> (defined locally)
- Consumes: `extractData(json)` → `{ type: 'single', item: {} } | { type: 'list', items: [] } | null`
- Produces: `export default async function decorate(block)` — the EDS block entry point

- [ ] **Step 1: Write failing tests**

Create `test/blocks/cf-live.test.js`:

```js
import { expect } from '@esm-bundle/chai';

// --- helpers ---

function makeBlock(mode, rows = []) {
  const block = document.createElement('div');
  block.className = `cf-live ${mode}`;
  rows.forEach(([key, val]) => {
    const row = document.createElement('div');
    const k = document.createElement('div'); k.textContent = key;
    const v = document.createElement('div'); v.textContent = val;
    row.append(k, v);
    block.append(row);
  });
  document.body.append(block);
  return block;
}

function heroJson(eyebrow = 'Sale', title = 'Big Deal', html = '<p>Body</p>', ctaLabel = 'Shop') {
  return {
    data: {
      heroList: {
        items: [{ eyebrow, title, description: { html }, ctaLabel, ctaUrl: '/shop' }]
      }
    }
  };
}

function featureJson(n = 2) {
  return {
    data: {
      featureList: {
        items: Array.from({ length: n }, (_, i) => ({
          eyebrow: `Cat ${i}`,
          title: `Feature ${i}`,
          description: { plaintext: `Body ${i}` },
          _path: `/content/dam/feat/${i}`,
        }))
      }
    }
  };
}

// --- tests ---

describe('cf-live', () => {
  let origFetch;
  beforeEach(() => { origFetch = globalThis.fetch; });
  afterEach(() => { globalThis.fetch = origFetch; document.body.innerHTML = ''; });

  it('fingerprint mode renders promo content with badge', async () => {
    globalThis.fetch = async () => ({ ok: true, json: async () => heroJson() });
    const block = makeBlock('fingerprint', [
      ['query', '/graphql/execute.json/global/hero'],
    ]);
    const { default: decorate } = await import('../../blocks/cf-live/cf-live.js');
    await decorate(block);
    expect(block.querySelector('.cf-live-badge-fingerprint')).to.not.be.null;
    expect(block.querySelector('.cf-live-title').textContent).to.equal('Big Deal');
    expect(block.querySelector('.cf-live-eyebrow').textContent).to.equal('Sale');
  });

  it('reactive mode renders list content with reactive badge', async () => {
    globalThis.fetch = async () => ({ ok: true, json: async () => featureJson(3) });
    const block = makeBlock('reactive', [
      ['query', '/graphql/execute.json/global/featurelist'],
    ]);
    const { default: decorate } = await import('../../blocks/cf-live/cf-live.js');
    await decorate(block);
    expect(block.querySelector('.cf-live-badge-reactive')).to.not.be.null;
    expect(block.querySelectorAll('.cf-live-pr-item').length).to.equal(3);
  });

  it('compare mode renders list with hidden update banner', async () => {
    globalThis.fetch = async () => ({ ok: true, json: async () => featureJson(2) });
    const block = makeBlock('compare', [
      ['query', '/graphql/execute.json/global/featurelist'],
    ]);
    const { default: decorate } = await import('../../blocks/cf-live/cf-live.js');
    await decorate(block);
    const banner = block.querySelector('.cf-live-update-banner');
    expect(banner).to.not.be.null;
    expect(banner.hidden).to.be.true;
  });

  it('manual mode renders check-for-updates button', async () => {
    globalThis.fetch = async () => ({ ok: true, json: async () => heroJson() });
    const block = makeBlock('manual', [
      ['query', '/graphql/execute.json/global/hero'],
    ]);
    const { default: decorate } = await import('../../blocks/cf-live/cf-live.js');
    await decorate(block);
    expect(block.querySelector('.cf-live-check-btn')).to.not.be.null;
  });

  it('adaptive mode renders adaptive badge', async () => {
    globalThis.fetch = async () => ({ ok: true, json: async () => featureJson(2) });
    const block = makeBlock('adaptive', [
      ['query', '/graphql/execute.json/global/featurelist'],
    ]);
    const { default: decorate } = await import('../../blocks/cf-live/cf-live.js');
    await decorate(block);
    expect(block.querySelector('.cf-live-badge-adaptive')).to.not.be.null;
  });

  it('shows error when fetch fails', async () => {
    globalThis.fetch = async () => ({ ok: false, status: 500 });
    const block = makeBlock('fingerprint', [
      ['query', '/graphql/execute.json/global/hero'],
    ]);
    const { default: decorate } = await import('../../blocks/cf-live/cf-live.js');
    await decorate(block);
    expect(block.querySelector('.cf-live-error')).to.not.be.null;
  });

  it('shows error when no query configured', async () => {
    const block = makeBlock('fingerprint', []);
    const { default: decorate } = await import('../../blocks/cf-live/cf-live.js');
    await decorate(block);
    expect(block.querySelector('.cf-live-error')).to.not.be.null;
  });
});
```

- [ ] **Step 2: Run tests — verify they all fail**

```bash
cd /Users/pstolmar/dev/eds/demo
npm run test:file -- test/blocks/cf-live.test.js
```

Expected: Tests fail with import errors (file doesn't exist yet).

- [ ] **Step 3: Create `blocks/cf-live/cf-live.js`**

```js
const AEM_PUBLISH = 'https://publish-p138879-e1741192.adobeaemcloud.com';

async function fetchFresh(queryPath) {
  const url = `${AEM_PUBLISH}${queryPath}?gql_ck=${Date.now()}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function hash(obj) {
  const s = JSON.stringify(obj);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return h >>> 0;
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
    if (Array.isArray(val?.items)) return { type: 'list', items: val.items };
    if (val?.item) return { type: 'single', item: val.item };
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
  wrap.className = `cf-live-content cf-live-promo`;
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
    if (item._path) {
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
  void block.offsetWidth;
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
          updateStatus(block, `Last checked: just now`);
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
```

- [ ] **Step 4: Create `blocks/cf-live/cf-live.css`**

```css
/* ── cf-live shared ── */
.cf-live-loading {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-dim, #888);
  font-style: italic;
}

.cf-live-error {
  padding: 1rem;
  color: #dc2626;
  background: #fef2f2;
  border-left: 3px solid #dc2626;
  border-radius: 4px;
  font-size: 0.875rem;
}

/* ── Badge strip ── */
.cf-live-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-family: ui-monospace, monospace;
  padding: 0.4rem 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  background: rgb(0 0 0 / 4%);
  border: 1px solid rgb(0 0 0 / 8%);
  flex-wrap: wrap;
}

.cf-live-badge-fingerprint { color: #0369a1; border-color: #bae6fd; background: #f0f9ff; }
.cf-live-badge-reactive    { color: #0f766e; border-color: #99f6e4; background: #f0fdfa; }
.cf-live-badge-compare     { color: #b45309; border-color: #fde68a; background: #fffbeb; }
.cf-live-badge-manual      { color: #6d28d9; border-color: #ddd6fe; background: #faf5ff; }
.cf-live-badge-adaptive    { color: #0e7490; border-color: #a5f3fc; background: #ecfeff; }

.cf-live-status-text {
  opacity: 0.7;
}

.cf-live-check-btn {
  margin-left: auto;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  border: 1px solid currentcolor;
  border-radius: 4px;
  background: none;
  color: inherit;
  cursor: pointer;
  transition: background-color 0.15s;
}

.cf-live-check-btn:hover {
  background: rgb(0 0 0 / 6%);
}

/* ── Update banner (compare mode) ── */
.cf-live-update-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #fffbeb;
  border: 1px solid #f59e0b;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: #92400e;
}

.cf-live-update-banner button {
  margin-left: auto;
  padding: 0.25rem 0.75rem;
  background: #f59e0b;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  transition: background-color 0.15s;
}

.cf-live-update-banner button:hover { background: #d97706; }

/* ── Green flash on re-render ── */
@keyframes cf-live-flash {
  0%   { box-shadow: 0 0 0 2px #22c55e, 0 0 12px rgb(34 197 94 / 30%); }
  100% { box-shadow: none; }
}

.cf-live-updated { animation: cf-live-flash 1.2s ease-out forwards; }

/* ── Promo / single-item template ── */
.cf-live-promo {
  padding: 1.5rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
}

.cf-live-eyebrow {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-accent, #6b00f5);
  margin-bottom: 0.5rem;
}

.cf-live-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.75rem;
  line-height: 1.25;
}

.cf-live-body {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--color-text, #374151);
  margin-bottom: 1.25rem;
}

.cf-live-cta {
  display: inline-block;
  padding: 0.6rem 1.4rem;
  background: var(--color-accent, #6b00f5);
  color: #fff;
  border-radius: 6px;
  font-weight: 600;
  text-decoration: none;
  font-size: 0.9rem;
  transition: opacity 0.15s;
}

.cf-live-cta:hover { opacity: 0.85; }

/* ── Press release list (reactive mode) ── */
.cf-live-pr-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cf-live-pr-item {
  padding: 1rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
}

.cf-live-pr-title {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0.25rem 0 0.5rem;
}

.cf-live-pr-lede {
  font-size: 0.9rem;
  color: var(--color-text-dim, #6b7280);
  margin: 0;
  line-height: 1.5;
}

/* ── Feature cards (compare / adaptive mode) ── */
.cf-live-feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}

.cf-live-feature-card {
  padding: 1.25rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
  background: var(--color-surface, #fff);
}

.cf-live-feature-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0.25rem 0 0.5rem;
}

.cf-live-feature-body {
  font-size: 0.875rem;
  color: var(--color-text-dim, #6b7280);
  margin: 0;
  line-height: 1.5;
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
cd /Users/pstolmar/dev/eds/demo
npm run test:file -- test/blocks/cf-live.test.js
```

Expected: All 7 tests pass. Output shows `7 passed, 0 failed`.

- [ ] **Step 6: Run linter**

```bash
cd /Users/pstolmar/dev/eds/demo
npx eslint blocks/cf-live/cf-live.js
npx stylelint blocks/cf-live/cf-live.css
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add blocks/cf-live/cf-live.js blocks/cf-live/cf-live.css test/blocks/cf-live.test.js
git commit -m "feat: add cf-live block with 5 freshness modes"
```

---

## Task 2: `dm-offer` block

Renders an interactive DM parameterized template configurator. Controls update the DM image URL in real time with no server round-trip.

**Files:**
- Create: `blocks/dm-offer/dm-offer.js`
- Create: `blocks/dm-offer/dm-offer.css`
- Create: `test/blocks/dm-offer.test.js`

**Interfaces:**
- Produces: `export default function decorate(block)`
- Key internal function: `buildDmUrl(cfg)` → URL string — testable via block config

- [ ] **Step 1: Write failing tests**

Create `test/blocks/dm-offer.test.js`:

```js
import { expect } from '@esm-bundle/chai';

function makeBlock(rows = []) {
  const block = document.createElement('div');
  block.className = 'dm-offer';
  rows.forEach(([key, val]) => {
    const row = document.createElement('div');
    const k = document.createElement('div'); k.textContent = key;
    const v = document.createElement('div'); v.textContent = val;
    row.append(k, v);
    block.append(row);
  });
  document.body.append(block);
  return block;
}

describe('dm-offer', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('renders preview image and controls form', async () => {
    const block = makeBlock([
      ['template', 'https://s7d1.scene7.com/is/image/PeterStolmarNA001/DiscountOffer'],
      ['percent', '30'],
      ['category', 'phones'],
      ['enddate', '2026-07-29'],
      ['hidebackground', 'false'],
      ['image', 'PeterStolmarNA001/approved-phone-app'],
    ]);
    const { default: decorate } = await import('../../blocks/dm-offer/dm-offer.js');
    decorate(block);
    expect(block.querySelector('.dm-offer-img')).to.not.be.null;
    expect(block.querySelector('.dm-offer-controls')).to.not.be.null;
  });

  it('renders all five control inputs', async () => {
    const block = makeBlock([
      ['template', 'https://s7d1.scene7.com/is/image/PeterStolmarNA001/DiscountOffer'],
    ]);
    const { default: decorate } = await import('../../blocks/dm-offer/dm-offer.js');
    decorate(block);
    const form = block.querySelector('.dm-offer-controls');
    expect(form.querySelector('[name="percent"]')).to.not.be.null;
    expect(form.querySelector('[name="category"]')).to.not.be.null;
    expect(form.querySelector('[name="enddate"]')).to.not.be.null;
    expect(form.querySelector('[name="hidebackground"]')).to.not.be.null;
    expect(form.querySelector('[name="image"]')).to.not.be.null;
  });

  it('image src contains all DM params', async () => {
    const block = makeBlock([
      ['template', 'https://s7d1.scene7.com/is/image/PeterStolmarNA001/DiscountOffer'],
      ['percent', '25'],
      ['category', 'tablets'],
      ['enddate', '2026-08-01'],
      ['hidebackground', 'false'],
      ['image', 'PeterStolmarNA001/approved-phone-app'],
    ]);
    const { default: decorate } = await import('../../blocks/dm-offer/dm-offer.js');
    decorate(block);
    const src = block.querySelector('.dm-offer-img').src;
    expect(src).to.include('%24percent=25');
    expect(src).to.include('%24category=tablets');
    expect(src).to.include('%24hidebackground=0');
    expect(src).to.include('wid=2000');
    expect(src).to.include('fmt=png-alpha');
  });

  it('formats enddate as "Month D, Year"', async () => {
    const block = makeBlock([
      ['template', 'https://s7d1.scene7.com/is/image/PeterStolmarNA001/DiscountOffer'],
      ['enddate', '2026-07-29'],
    ]);
    const { default: decorate } = await import('../../blocks/dm-offer/dm-offer.js');
    decorate(block);
    const src = decodeURIComponent(block.querySelector('.dm-offer-img').src);
    expect(src).to.include('$enddate=July 29, 2026');
  });

  it('updates image src when percent input changes', async () => {
    const block = makeBlock([
      ['template', 'https://s7d1.scene7.com/is/image/PeterStolmarNA001/DiscountOffer'],
      ['percent', '30'],
    ]);
    const { default: decorate } = await import('../../blocks/dm-offer/dm-offer.js');
    decorate(block);
    const input = block.querySelector('[name="percent"]');
    const img = block.querySelector('.dm-offer-img');
    const before = img.src;
    input.value = '50';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(img.src).to.not.equal(before);
    expect(img.src).to.include('%24percent=50');
  });

  it('copy URL button exists', async () => {
    const block = makeBlock([
      ['template', 'https://s7d1.scene7.com/is/image/PeterStolmarNA001/DiscountOffer'],
    ]);
    const { default: decorate } = await import('../../blocks/dm-offer/dm-offer.js');
    decorate(block);
    expect(block.querySelector('.dm-offer-copy')).to.not.be.null;
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm run test:file -- test/blocks/dm-offer.test.js
```

Expected: All 6 tests fail (file doesn't exist yet).

- [ ] **Step 3: Create `blocks/dm-offer/dm-offer.js`**

```js
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

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d)
    .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function buildDmUrl(template, values) {
  const params = new URLSearchParams();
  params.set('$hidebackground', values.hidebackground ? '1' : '0');
  params.set('$percent', String(values.percent));
  params.set('$image', values.image);
  params.set('$category', values.category);
  params.set('$enddate', formatDate(values.enddate));
  params.set('wid', '2000');
  params.set('hei', '2000');
  params.set('qlt', '80');
  params.set('fit', 'constrain');
  params.set('fmt', 'png-alpha');
  return `${template}?${params}`;
}

function readValues(form) {
  return {
    percent: parseInt(form.elements.percent.value, 10) || 30,
    category: form.elements.category.value || 'phones',
    enddate: form.elements.enddate.value || '2026-07-29',
    hidebackground: form.elements.hidebackground.checked,
    image: form.elements.image.value || 'PeterStolmarNA001/approved-phone-app',
  };
}

export default function decorate(block) {
  const cfg = parseConfig(block);
  const template = cfg.template;
  if (!template) {
    block.innerHTML = '<p class="dm-offer-error">dm-offer: no template configured.</p>';
    return;
  }

  const defaults = {
    percent: parseInt(cfg.percent, 10) || 30,
    category: cfg.category || 'phones',
    enddate: cfg.enddate || '2026-07-29',
    hidebackground: cfg.hidebackground === 'true',
    image: cfg.image || 'PeterStolmarNA001/approved-phone-app',
  };

  const img = document.createElement('img');
  img.className = 'dm-offer-img';
  img.alt = 'Promotional offer preview';
  img.loading = 'lazy';
  img.src = buildDmUrl(template, defaults);

  const urlDisplay = document.createElement('code');
  urlDisplay.className = 'dm-offer-url-display';
  urlDisplay.textContent = img.src;

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'dm-offer-copy';
  copyBtn.textContent = 'Copy URL';
  copyBtn.addEventListener('click', () => {
    navigator.clipboard?.writeText(img.src);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = 'Copy URL'; }, 1500);
  });

  const form = document.createElement('form');
  form.className = 'dm-offer-controls';
  form.innerHTML = `
    <label>Discount %
      <input type="number" name="percent" min="1" max="99" value="${defaults.percent}" />
    </label>
    <label>Category
      <input type="text" name="category" value="${defaults.category}" />
    </label>
    <label>End Date
      <input type="date" name="enddate" value="${defaults.enddate}" />
    </label>
    <label class="dm-offer-toggle">Hide Background
      <input type="checkbox" name="hidebackground" ${defaults.hidebackground ? 'checked' : ''} />
    </label>
    <label>Image Path
      <input type="text" name="image" value="${defaults.image}" />
    </label>
  `;

  const urlRow = document.createElement('div');
  urlRow.className = 'dm-offer-url-row';
  urlRow.append(urlDisplay, copyBtn);
  form.append(urlRow);

  function update() {
    const values = readValues(form);
    const newUrl = buildDmUrl(template, values);
    img.src = newUrl;
    urlDisplay.textContent = newUrl;
  }

  form.addEventListener('input', update);
  form.addEventListener('change', update);

  const preview = document.createElement('div');
  preview.className = 'dm-offer-preview';
  preview.append(img);

  const wrap = document.createElement('div');
  wrap.className = 'dm-offer-wrap';
  wrap.append(preview, form);

  block.replaceChildren(wrap);
}
```

- [ ] **Step 4: Create `blocks/dm-offer/dm-offer.css`**

```css
.dm-offer-wrap {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: start;
}

.dm-offer-preview {
  position: sticky;
  top: 1rem;
}

.dm-offer-img {
  width: 100%;
  height: auto;
  border-radius: 8px;
  display: block;
  background: #f3f4f6;
  min-height: 200px;
}

.dm-offer-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dm-offer-controls label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text, #374151);
}

.dm-offer-toggle {
  flex-direction: row !important;
  align-items: center;
  gap: 0.5rem !important;
}

.dm-offer-controls input[type="number"],
.dm-offer-controls input[type="text"],
.dm-offer-controls input[type="date"] {
  padding: 0.4rem 0.6rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
}

.dm-offer-controls input:focus {
  outline: none;
  border-color: var(--color-accent, #6b00f5);
  box-shadow: 0 0 0 2px rgb(107 0 245 / 15%);
}

.dm-offer-url-row {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e5e7eb;
}

.dm-offer-url-display {
  flex: 1;
  font-size: 0.7rem;
  word-break: break-all;
  color: #6b7280;
  background: #f9fafb;
  padding: 0.4rem 0.5rem;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
}

.dm-offer-copy {
  flex-shrink: 0;
  padding: 0.4rem 0.75rem;
  background: var(--color-accent, #6b00f5);
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.dm-offer-copy:hover { opacity: 0.85; }

.dm-offer-error {
  color: #dc2626;
  font-size: 0.875rem;
}

@media (width <= 768px) {
  .dm-offer-wrap {
    grid-template-columns: 1fr;
  }

  .dm-offer-preview {
    position: static;
  }
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npm run test:file -- test/blocks/dm-offer.test.js
```

Expected: All 6 tests pass.

- [ ] **Step 6: Run linter**

```bash
npx eslint blocks/dm-offer/dm-offer.js
npx stylelint blocks/dm-offer/dm-offer.css
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add blocks/dm-offer/dm-offer.js blocks/dm-offer/dm-offer.css test/blocks/dm-offer.test.js
git commit -m "feat: add dm-offer block for DM parameterized template configurator"
```

---

## Task 3: `dm-background` block

Sets a fixed, full-bleed background image behind page content. Accepts a Scene7 URL (appends responsive params) or an AEM Assets path (passes through unchanged). Adds `has-dm-background` to `document.body` for downstream CSS targeting.

**Files:**
- Create: `blocks/dm-background/dm-background.js`
- Create: `blocks/dm-background/dm-background.css`
- Create: `test/blocks/dm-background.test.js`

**Interfaces:**
- Produces: `export default function decorate(block)`

- [ ] **Step 1: Write failing tests**

Create `test/blocks/dm-background.test.js`:

```js
import { expect } from '@esm-bundle/chai';

function makeBlock(src, fit = '') {
  const block = document.createElement('div');
  block.className = 'dm-background';
  const srcRow = document.createElement('div');
  const k = document.createElement('div'); k.textContent = 'src';
  const v = document.createElement('div'); v.textContent = src;
  srcRow.append(k, v);
  block.append(srcRow);
  if (fit) {
    const fitRow = document.createElement('div');
    const fk = document.createElement('div'); fk.textContent = 'fit';
    const fv = document.createElement('div'); fv.textContent = fit;
    fitRow.append(fk, fv);
    block.append(fitRow);
  }
  document.body.append(block);
  return block;
}

describe('dm-background', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.body.classList.remove('has-dm-background');
  });

  it('renders an img element inside the block', async () => {
    const block = makeBlock('https://s7d1.scene7.com/is/image/Co/img');
    const { default: decorate } = await import('../../blocks/dm-background/dm-background.js');
    decorate(block);
    expect(block.querySelector('img')).to.not.be.null;
  });

  it('appends DM responsive params to scene7 URLs', async () => {
    const block = makeBlock('https://s7d1.scene7.com/is/image/Co/img');
    const { default: decorate } = await import('../../blocks/dm-background/dm-background.js');
    decorate(block);
    const src = block.querySelector('img').src;
    expect(src).to.include('wid=1920');
    expect(src).to.include('fmt=webp');
    expect(src).to.include('fit=crop');
  });

  it('respects custom fit param', async () => {
    const block = makeBlock('https://s7d1.scene7.com/is/image/Co/img', 'constrain');
    const { default: decorate } = await import('../../blocks/dm-background/dm-background.js');
    decorate(block);
    const src = block.querySelector('img').src;
    expect(src).to.include('fit=constrain');
  });

  it('passes AEM assets path through unchanged', async () => {
    const block = makeBlock('/content/dam/images/bg.jpg');
    const { default: decorate } = await import('../../blocks/dm-background/dm-background.js');
    decorate(block);
    const src = block.querySelector('img').getAttribute('src');
    expect(src).to.equal('/content/dam/images/bg.jpg');
  });

  it('adds has-dm-background class to document.body', async () => {
    const block = makeBlock('https://s7d1.scene7.com/is/image/Co/img');
    const { default: decorate } = await import('../../blocks/dm-background/dm-background.js');
    decorate(block);
    expect(document.body.classList.contains('has-dm-background')).to.be.true;
  });

  it('img has aria-hidden="true"', async () => {
    const block = makeBlock('https://s7d1.scene7.com/is/image/Co/img');
    const { default: decorate } = await import('../../blocks/dm-background/dm-background.js');
    decorate(block);
    expect(block.querySelector('img').getAttribute('aria-hidden')).to.equal('true');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm run test:file -- test/blocks/dm-background.test.js
```

Expected: All 6 tests fail.

- [ ] **Step 3: Create `blocks/dm-background/dm-background.js`**

```js
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
```

- [ ] **Step 4: Create `blocks/dm-background/dm-background.css`**

```css
.dm-background {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}

.dm-background img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Darkening overlay so page text remains legible over the image */
.dm-background::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgb(0 0 0 / 45%);
}

/* When dm-background is active, help page text/nav stay readable */
.has-dm-background .nav-wrapper,
.has-dm-background header {
  background: rgb(0 0 0 / 40%);
  backdrop-filter: blur(8px);
  color: #fff;
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npm run test:file -- test/blocks/dm-background.test.js
```

Expected: All 6 tests pass.

- [ ] **Step 6: Run linter**

```bash
npx eslint blocks/dm-background/dm-background.js
npx stylelint blocks/dm-background/dm-background.css
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add blocks/dm-background/dm-background.js blocks/dm-background/dm-background.css test/blocks/dm-background.test.js
git commit -m "feat: add dm-background block for full-bleed DM/AEM image backgrounds"
```

---

## Task 4: DA fragments

Create three DA fragments that will be included in pages via `<a href="/fragments/…">` links. Each fragment contains a brief editorial callout explaining why DA Live content refreshes automatically (contrasting with the CF polling blocks).

**Files:** DA content created via DA MCP (`org=pstolmar`, `repo=demo`)

**Interfaces:**
- Consumes: nothing (standalone fragments)
- Produces: fragments at `/pstolmar/demo/fragments/promo-context`, `/pr-context`, `/feature-context`

- [ ] **Step 1: Create `/fragments/promo-context` via DA MCP**

Call `da_create_source` with:
- `org`: `pstolmar`
- `repo`: `demo`
- `path`: `fragments/promo-context.html`
- `contentType`: `text/html`
- `content`:

```html
<body>
  <header></header>
  <main>
    <div>
      <h2>About This Demo</h2>
      <p>The offer content above is fetched live from an AEM Content Fragment using a client-side polling strategy with a <code>?gql_ck</code> cache-bust parameter — no page republish required.</p>
      <p>This section, however, is authored in <strong>DA Live</strong>. When published in DA, the EDS CDN cache for this fragment path is automatically invalidated — no polling, no stale cache. It updates instantly for every visitor.</p>
      <p><em>Terms apply. Offer valid while supplies last.</em></p>
    </div>
  </main>
  <footer></footer>
</body>
```

- [ ] **Step 2: Create `/fragments/pr-context` via DA MCP**

Call `da_create_source` with:
- `org`: `pstolmar`
- `repo`: `demo`
- `path`: `fragments/pr-context.html`
- `contentType`: `text/html`
- `content`:

```html
<body>
  <header></header>
  <main>
    <div>
      <h2>Media Contact</h2>
      <p><strong>Press enquiries:</strong> press@example.com</p>
      <p><strong>Analyst relations:</strong> ar@example.com</p>
      <p>This contact block is authored in <strong>DA Live</strong>. Publishing this fragment in DA immediately invalidates its CDN cache — no code deploy, no polling loop. Compare that with the press release list above, which uses a <em>visibility-reactive</em> CF poll: it refreshes every time you return to this tab.</p>
    </div>
  </main>
  <footer></footer>
</body>
```

- [ ] **Step 3: Create `/fragments/feature-context` via DA MCP**

Call `da_create_source` with:
- `org`: `pstolmar`
- `repo`: `demo`
- `path`: `fragments/feature-context.html`
- `contentType`: `text/html`
- `content`:

```html
<body>
  <header></header>
  <main>
    <div>
      <h2>Release Notes</h2>
      <p><strong>v2.4.0 — July 2026:</strong> Introduced adaptive polling and compare-mode CF blocks. Zero-latency DA fragment updates.</p>
      <p><strong>v2.3.0 — June 2026:</strong> Added Dynamic Media background support and parameterized offer template block.</p>
      <p>This changelog is authored in <strong>DA Live</strong> — update it here and publish; the EDS CDN cache is purged automatically and every visitor sees the change immediately. No polling. No wait.</p>
    </div>
  </main>
  <footer></footer>
</body>
```

- [ ] **Step 4: Verify fragments exist**

Call `da_list_sources` with `org=pstolmar`, `repo=demo`, `path=fragments` and confirm `promo-context.html`, `pr-context.html`, and `feature-context.html` appear in the results.

- [ ] **Step 5: Commit note**

DA content is cloud-stored; no git commit needed for this task. Note the three fragment paths in the progress ledger.

---

## Task 5: DA page `/promo`

Authors the `/promo` page in DA. The page uses `dm-offer` (DM parameterized template configurator), `cf-live fingerprint` (auto-polling hero CF), `cf-live manual` (user-triggered hero CF), a `pull-quote`, and the `promo-context` fragment.

**Files:** DA content at `pstolmar/demo/promo.html`

- [ ] **Step 1: Create `/promo` page via DA MCP**

Call `da_create_source` with:
- `org`: `pstolmar`
- `repo`: `demo`
- `path`: `promo.html`
- `contentType`: `text/html`
- `content`:

```html
<body>
  <header></header>
  <main>
    <div>
      <h1>Current Offers</h1>
      <p>Exclusive promotions, updated live from our content team — no page reload required.</p>
      <div class="stats">
        <div><div>40% Off</div><div>Select electronics this week</div></div>
        <div><div>2-Day Delivery</div><div>Free on orders over $50</div></div>
        <div><div>10K+ Reviews</div><div>Average 4.8 stars</div></div>
      </div>
    </div>
    <div>
      <h2>Build Your Offer</h2>
      <p>This offer image is composed live from a Dynamic Media parameterized template. Change any field and the image updates instantly — no upload, no render farm.</p>
      <div class="dm-offer">
        <div><div>template</div><div>https://s7d1.scene7.com/is/image/PeterStolmarNA001/DiscountOffer</div></div>
        <div><div>percent</div><div>30</div></div>
        <div><div>category</div><div>phones</div></div>
        <div><div>enddate</div><div>2026-07-29</div></div>
        <div><div>hidebackground</div><div>false</div></div>
        <div><div>image</div><div>PeterStolmarNA001/approved-phone-app</div></div>
      </div>
    </div>
    <div>
      <h2>Live CF Content — Fingerprint Mode</h2>
      <p>This block polls the AEM publish GraphQL endpoint every 60 seconds. It uses a <code>?gql_ck</code> parameter to bypass CDN caching, then fingerprints the response. Content only re-renders when the hash changes — silent, zero-flash updates.</p>
      <div class="cf-live fingerprint">
        <div><div>query</div><div>/graphql/execute.json/global/hero</div></div>
        <div><div>poll</div><div>60</div></div>
      </div>
    </div>
    <div>
      <h2>Live CF Content — Manual Mode</h2>
      <p>Same CF, same <code>?gql_ck</code> cache-bust — but zero background traffic. The block only checks for updates when you click the button. Ideal for low-change content where polling is wasteful.</p>
      <div class="cf-live manual">
        <div><div>query</div><div>/graphql/execute.json/global/hero</div></div>
      </div>
    </div>
    <div>
      <div class="pull-quote">
        <div><div><p>The update showed up on our live site in under a minute — and we didn't touch the page template.</p></div></div>
        <div><div><p>— Alex M., Digital Experience Lead</p></div></div>
      </div>
    </div>
    <div>
      <p><a href="/fragments/promo-context">/fragments/promo-context</a></p>
    </div>
  </main>
  <footer></footer>
</body>
```

- [ ] **Step 2: Push branch and trigger DA preview**

```bash
git push origin livecf
```

Then open `https://livecf--demo--pstolmar.aem.page/promo` in Sidekick and click **Preview** to make the DA content available on the CDN.

- [ ] **Step 3: Verify page**

Open `https://livecf--demo--pstolmar.aem.page/promo` in a browser. Confirm:
- Page loads without JS errors in the console
- `dm-offer` block shows the DM template image and 5 form controls (percent, category, enddate, hidebackground, image)
- Changing the percent input updates the image URL and the live preview image
- Two `cf-live` blocks appear: one with `● Polling` badge, one with `↓ Manual` badge and a "Check for updates" button
- `pull-quote` block renders the testimonial text
- `promo-context` fragment text loads at the bottom of the page

---

## Task 6: DA page `/pr`

Authors the `/pr` page. The page uses `dm-background` (full-bleed DM image), `cf-live reactive` (tab-focus CF refresh), `columns`, and the `pr-context` fragment.

**Files:** DA content at `pstolmar/demo/pr.html`

- [ ] **Step 1: Create `/pr` page via DA MCP**

Call `da_create_source` with:
- `org`: `pstolmar`
- `repo`: `demo`
- `path`: `pr.html`
- `contentType`: `text/html`
- `content`:

```html
<body>
  <header></header>
  <main>
    <div>
      <div class="dm-background">
        <div><div>src</div><div>https://s7d1.scene7.com/is/image/PeterStolmarNA001/approved-phone-app</div></div>
      </div>
      <h1>Newsroom</h1>
      <p>Latest announcements and press releases — refreshed automatically every time you return to this tab.</p>
      <div class="stats">
        <div><div>Founded 1982</div><div>Over 40 years of innovation</div></div>
        <div><div>180+ Countries</div><div>Global reach</div></div>
        <div><div>$5B Revenue</div><div>FY 2025</div></div>
      </div>
    </div>
    <div>
      <h2>Press Releases — Reactive Mode</h2>
      <p>This block fetches from AEM GraphQL every time you return to this tab (<code>visibilitychange</code> event), plus a 300-second background interval. Every fetch uses <code>?gql_ck=Date.now()</code> to bypass CDN — you always see the latest published content.</p>
      <div class="cf-live reactive">
        <div><div>query</div><div>/graphql/execute.json/global/featurelist</div></div>
        <div><div>poll</div><div>300</div></div>
      </div>
    </div>
    <div>
      <div class="columns">
        <div>
          <div>
            <h3>Press Kit</h3>
            <p>Download logos, executive bios, and product screenshots for editorial use.</p>
            <p><a href="#">Download press kit</a></p>
          </div>
          <div>
            <h3>Media Accreditation</h3>
            <p>Apply for press credentials for upcoming product announcements and events.</p>
            <p><a href="#">Apply for accreditation</a></p>
          </div>
        </div>
      </div>
    </div>
    <div>
      <p><a href="/fragments/pr-context">/fragments/pr-context</a></p>
    </div>
  </main>
  <footer></footer>
</body>
```

- [ ] **Step 2: Preview the page**

Preview `https://livecf--demo--pstolmar.aem.page/pr` via Sidekick.

- [ ] **Step 3: Verify page**

Open `https://livecf--demo--pstolmar.aem.page/pr`. Confirm:
- Full-bleed background image fills the viewport (DM Scene7 phone image behind content)
- `has-dm-background` class is present on `<body>` (check DevTools)
- Header/nav text is readable over the background
- `cf-live reactive` block renders the feature list with `↺ Reactive` badge
- Switch to another tab then return — CF content re-fetches (badge shows "on tab focus")
- `columns` block renders 2-column layout
- `pr-context` fragment loads at the bottom

---

## Task 7: DA page `/feature`

Authors the `/feature` page. The page uses two `cf-live` modes side-by-side (`compare` and `adaptive`), a `stats` block, and the `feature-context` fragment.

**Files:** DA content at `pstolmar/demo/feature.html`

- [ ] **Step 1: Create `/feature` page via DA MCP**

Call `da_create_source` with:
- `org`: `pstolmar`
- `repo`: `demo`
- `path`: `feature.html`
- `contentType`: `text/html`
- `content`:

```html
<body>
  <header></header>
  <main>
    <div>
      <h1>Platform Capabilities</h1>
      <p>Two approaches to keeping CF content fresh — side by side. Both use <code>?gql_ck</code> to bypass CDN; they differ in how they surface changes to the visitor.</p>
    </div>
    <div>
      <h2>Compare Mode</h2>
      <p>Polls every 120 seconds in the background. When the CF changes, a banner appears — <em>you</em> decide when to apply the update. Nothing jumps unexpectedly.</p>
      <div class="cf-live compare">
        <div><div>query</div><div>/graphql/execute.json/global/featurelist</div></div>
        <div><div>poll</div><div>120</div></div>
      </div>
    </div>
    <div>
      <h2>Adaptive Mode</h2>
      <p>Starts polling every 30 seconds. Each time there's no change, the interval doubles (up to 10 minutes). When content changes, the interval resets to 30 seconds. Efficient and self-tuning.</p>
      <div class="cf-live adaptive">
        <div><div>query</div><div>/graphql/execute.json/global/featurelist</div></div>
        <div><div>poll</div><div>30</div></div>
        <div><div>maxpoll</div><div>600</div></div>
      </div>
    </div>
    <div>
      <div class="stats">
        <div><div>99.9% Uptime</div><div>SLA guarantee</div></div>
        <div><div>50ms TTFB</div><div>Global CDN P95</div></div>
        <div><div>0 Build Steps</div><div>Deploy straight from GitHub</div></div>
      </div>
    </div>
    <div>
      <p><a href="/fragments/feature-context">/fragments/feature-context</a></p>
    </div>
    <div>
      <div class="callout-panel">
        <div><div>Ready to see it live?</div></div>
        <div><div>Publish a Content Fragment in AEM and watch the blocks update — no page republish, no cache wait.</div></div>
        <div><div>Try it now</div><div>/tools/blocks</div></div>
      </div>
    </div>
  </main>
  <footer></footer>
</body>
```

- [ ] **Step 2: Preview the page**

Preview `https://livecf--demo--pstolmar.aem.page/feature` via Sidekick.

- [ ] **Step 3: Verify page**

Open `https://livecf--demo--pstolmar.aem.page/feature`. Confirm:
- `compare` block shows feature cards with `⚡ Compare` badge; update banner starts hidden
- `adaptive` block shows feature cards with `⏱ Adaptive` badge; badge shows current interval (starts at 30s)
- Wait 30s — adaptive badge updates interval text
- `stats` block shows three KPIs with counter animation on scroll into view
- `feature-context` fragment loads
- `callout-panel` CTA renders at the bottom

- [ ] **Step 3: Run full test suite**

```bash
cd /Users/pstolmar/dev/eds/demo
npm test
```

Expected: All existing tests plus the three new block test files pass. Zero failures.

- [ ] **Step 4: Final commit note**

DA pages are cloud-stored. The only local commits are the three block files from Tasks 1–3. Run `git log --oneline -5` to confirm they are on the `livecf` branch.

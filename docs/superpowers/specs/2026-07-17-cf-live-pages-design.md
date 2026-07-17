# CF Live Pages — Implementation Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Three new EDS demo pages (`/promo`, `/pr`, `/feature`) that look like real business pages and each showcase one or more techniques for keeping AEM Content Fragment data fresh on an EDS page without requiring a page republish. Two pages also demonstrate Dynamic Media capabilities: a parameterized offer template on `/promo` and a configurable full-bleed DM background on `/pr`.

**Architecture:** One new block (`cf-live`) with five modes controlled by a CSS-class modifier. Two additional blocks: `dm-offer` (DM parameterized template with live controls) and `dm-background` (full-bleed DM or AEM Assets image). All CF modes share `?gql_ck=${Date.now()}` cache-bust on every fetch, bypassing `s-maxage=7200`. Pages are authored in DA. CFs fetched from AEM publish GraphQL, no auth.

**Tech Stack:** Vanilla EDS JS/CSS, AEM GraphQL persisted queries on `publish-p138879-e1741192.adobeaemcloud.com`, Dynamic Media Scene7 image serving (`s7d1.scene7.com`), DA MCP for page authoring, existing EDS blocks (stats, quote, columns, callout-panel, fragment).

---

## Global Constraints

- AEM host: `https://publish-p138879-e1741192.adobeaemcloud.com` — no auth required on publish tier
- CF Delivery OpenAPI is NOT available (returns 404) — do not use it
- Available persisted queries: `global/hero` (single item) and `global/featurelist` (array)
- Cache-bust param: `?gql_ck=${Date.now()}` appended to every CF fetch → forces CDN MISS
- No ETag / Last-Modified from server → use JSON content fingerprint (simple string hash)
- Block follows EDS conventions: `export default function decorate(block)`, imports from `../../scripts/ak.js`
- DA content at `content.da.live/pstolmar/demo` — use DA MCP to create all pages and fragments
- Each page includes one DA-authored fragment (via `fragment` block) to contrast with the polled CF block
- UE instrumentation: `data-aue-resource` + `data-aue-type="reference"` on the CF block container
- No build step — raw JS/CSS served from GitHub via EDS CDN

---

## CF Data Mapping

Existing CFs remixed for each page context:

| Page | Persisted query | CF fields | Rendered as |
|---|---|---|---|
| `/promo` | `global/hero` | eyebrow → promo type, title → offer headline, description.html → offer body, ctaLabel → CTA button | Promotion banner card |
| `/pr` | `global/featurelist` | eyebrow → category, title → headline, description.plaintext → lede, _path → CF ref | Press release list |
| `/feature` | `global/featurelist` | eyebrow → label, title → feature name, description.plaintext → summary, _path → CF ref | Feature status cards |

---

## The `cf-live` Block

**Location:** `blocks/cf-live/cf-live.js` + `blocks/cf-live/cf-live.css`

### Block table configuration (DA authoring)

```
cf-live [fingerprint | reactive | compare | manual | adaptive]
query   | /graphql/execute.json/global/hero
poll    | 60
cf-path | /content/dam/ue-demo/fragments/home-hero
```

All rows except `query` are optional. Default `poll` values: 60s (`fingerprint`), 300s (`reactive`), 120s (`compare`), 30s starting interval (`adaptive`). `manual` ignores `poll`.

### Shared utilities (inside cf-live.js, not exported)

```js
const AEM = 'https://publish-p138879-e1741192.adobeaemcloud.com';

// Always bypasses CDN cache — forces origin fetch
async function fetchFresh(queryPath) {
  const url = `${AEM}${queryPath}?gql_ck=${Date.now()}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Stable string hash for content fingerprinting (replaces ETag)
function fingerprint(obj) {
  const s = JSON.stringify(obj);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return h >>> 0;
}

// Parse block config rows (EDS structure: block > div(row) > div(cell))
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
```

### Mode 1 — `fingerprint` (silent polling + hash compare)

**Used on:** `/promo` page.

**Why not "ETag":** The GQL endpoint does not return `ETag` or `Last-Modified` headers. `fingerprint` is the client-side equivalent — we compute a hash of the JSON body and skip re-render if it hasn't changed. The `?gql_ck` param ensures we always reach origin (bypasses CDN), so the comparison is always against the live AEM value.

**Behaviour:**
1. Initial fetch with `?gql_ck=Date.now()` → render content → store hash H1
2. `setInterval` every `poll` seconds:
   - Fetch fresh (new `gql_ck`)
   - Compute H2
   - If H2 !== H1 → replace rendered content, brief green flash, store H2
   - If H2 === H1 → do nothing
3. Status badge: `● Polling · Last checked: Xs ago · Next in Ys`

**Template rendered (promo):**
```html
<div class="cf-live-content cf-live-promo">
  <div class="cf-live-badge cf-live-badge-fingerprint">● Polling <span class="cf-live-status-text">…</span></div>
  <div class="cf-live-eyebrow">{eyebrow}</div>
  <h2 class="cf-live-title">{title}</h2>
  <div class="cf-live-body">{description.html}</div>
  <a class="cf-live-cta button">{ctaLabel}</a>
</div>
```

### Mode 2 — `reactive` (visibility-triggered cache-bust)

**Used on:** `/pr` page.

**Behaviour:**
1. Initial fetch → render press release list → no fingerprint stored
2. `document.addEventListener('visibilitychange')`: when tab becomes visible → immediately fetch fresh + re-render
3. Fallback `setInterval` for `poll` seconds in case tab stays visible
4. Every fetch always uses `?gql_ck=Date.now()` → unconditional re-render
5. Status badge: `↺ Reactive · Last refreshed: Xs ago · {trigger}`
   where `{trigger}` is "on tab focus" or "on interval"

**Template rendered (press release list):**
```html
<div class="cf-live-content cf-live-press">
  <div class="cf-live-badge cf-live-badge-reactive">↺ Reactive <span class="cf-live-status-text">…</span></div>
  <ul class="cf-live-pr-list">
    {items.map(item =>
      <li class="cf-live-pr-item" data-aue-resource="urn:aemconnection:{item._path}">
        <span class="cf-live-eyebrow">{item.eyebrow}</span>
        <h3 class="cf-live-pr-title">{item.title}</h3>
        <p class="cf-live-pr-lede">{item.description.plaintext}</p>
      </li>
    )}
  </ul>
</div>
```

### Mode 3 — `compare` (silent check + user-initiated update)

**Used on:** `/feature` page.

**Behaviour:**
1. Initial fetch → render feature cards → store fingerprint F1
2. `setInterval` every `poll` seconds:
   - Fetch fresh with `gql_ck`
   - Compute F2
   - If F2 === F1 → do nothing, update "Last checked" in status
   - If F2 !== F1 → show update-available banner; store pending data
3. Banner: `"⚡ CF content updated — click to apply"` (sticky top of block, accent color)
4. User clicks banner → replace rendered content with pending data, hide banner, store F2 as new fingerprint
5. Status badge: `⚡ Compare · Watching for changes · Last checked: Xs`

**Template rendered (feature cards):**
```html
<div class="cf-live-content cf-live-features">
  <div class="cf-live-badge cf-live-badge-compare">⚡ Compare <span class="cf-live-status-text">…</span></div>
  <div class="cf-live-update-banner" hidden>⚡ CF content updated — <button>apply now</button></div>
  <ul class="cf-live-feature-list">
    {items.map(item =>
      <li class="cf-live-feature-card" data-aue-resource="urn:aemconnection:{item._path}" data-aue-type="reference">
        <span class="cf-live-eyebrow">{item.eyebrow}</span>
        <h3 class="cf-live-feature-title">{item.title}</h3>
        <p class="cf-live-feature-body">{item.description.plaintext}</p>
      </li>
    )}
  </ul>
</div>
```

### Mode 4 — `manual` (explicit user-triggered refresh)

**Used on:** `/promo` page (alongside `fingerprint`, for contrast).

**Behaviour:**
1. Initial fetch → render content. No interval, no background activity.
2. "Check for updates" button always visible in status area.
3. User clicks → fetch fresh with `?gql_ck=Date.now()` → compare fingerprint → re-render if changed, show "Up to date" toast if unchanged.
4. Status badge: `↓ Manual · Last checked: Xs ago`

This demonstrates the lightest possible approach: zero background traffic, completely user-driven. Useful for pages where content changes rarely or bandwidth is a concern.

**Template rendered:**
```html
<div class="cf-live-content cf-live-manual-content">
  <div class="cf-live-badge cf-live-badge-manual">
    ↓ Manual <span class="cf-live-status-text">…</span>
    <button class="cf-live-check-btn">Check for updates</button>
  </div>
  <!-- same content structure as fingerprint mode -->
</div>
```

---

### Mode 5 — `adaptive` (exponential-backoff polling)

**Used on:** `/feature` page (alongside `compare`).

**Behaviour:**
1. Initial fetch → render content → store fingerprint. Set interval to `poll` seconds (default 30).
2. On each tick:
   - Fetch fresh (new `gql_ck`)
   - If changed → re-render, reset interval to `poll` seconds
   - If unchanged → double the interval (cap at `maxpoll` seconds, default 600)
3. Status badge: `⏱ Adaptive · interval: Xs · Last checked: Ys ago`

This demonstrates an efficiency-aware approach: polls aggressively right after page load (when a recent publish is most likely) and backs off once content is stable. Optional `maxpoll` config row (default 600s).

```
cf-live adaptive
query   | /graphql/execute.json/global/featurelist
poll    | 30
maxpoll | 600
```

---

### UE instrumentation

The outer block container gets:
```js
block.dataset.aueResource = `urn:aemconnection:${cfg['cf-path']}`;
block.dataset.aueType = 'reference';
block.dataset.aueLabel = 'Content Fragment';
```

`cf-path` must be the AEM DAM path to the fragment (e.g. `/content/dam/ue-demo/fragments/home-hero`). If `cf-path` is absent, skip UE instrumentation — the GQL query path is not a valid `urn:aemconnection` value. No field-level editing markup needed for this demo.

---

## The `dm-offer` Block

**Location:** `blocks/dm-offer/dm-offer.js` + `blocks/dm-offer/dm-offer.css`

**Purpose:** Renders an interactive configurator for a Dynamic Media parameterized template. Controls update the DM URL in real time and the image refreshes live. Demonstrates DM's parameterized template capability without any server-side code.

**Reference DM template URL:**
```
https://s7d1.scene7.com/is/image/PeterStolmarNA001/DiscountOffer
?$hidebackground=0&$percent=30&$image=PeterStolmarNA001/approved-phone-app
&$category=phones&$enddate=July%2029,%202026
&wid=2000&hei=2000&qlt=80&fit=constrain&fmt=png-alpha
```

### DA block config

```
dm-offer
template    | https://s7d1.scene7.com/is/image/PeterStolmarNA001/DiscountOffer
percent     | 30
category    | phones
enddate     | 2026-07-29
hidebackground | false
image       | PeterStolmarNA001/approved-phone-app
```

`template` is the only required row. All others supply default values for the controls. `enddate` is stored as ISO `YYYY-MM-DD` in DA (date picker input) and formatted as `"MMMM D, YYYY"` (e.g. `"July 29, 2026"`) when constructing the DM URL.

### URL construction

```js
function buildDmUrl(cfg) {
  const base = cfg.template;
  const params = new URLSearchParams();
  params.set('$hidebackground', cfg.hidebackground ? '1' : '0');
  params.set('$percent', String(cfg.percent));
  params.set('$image', cfg.image);
  params.set('$category', cfg.category);
  // Format date: "2026-07-29" → "July 29, 2026"
  const [y, m, d] = cfg.enddate.split('-').map(Number);
  const dateStr = new Date(y, m - 1, d)
    .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  params.set('$enddate', dateStr);
  // Fixed output params
  params.set('wid', '2000');
  params.set('hei', '2000');
  params.set('qlt', '80');
  params.set('fit', 'constrain');
  params.set('fmt', 'png-alpha');
  return `${base}?${params}`;
}
```

### Controls rendered

```html
<div class="dm-offer-wrap">
  <div class="dm-offer-preview">
    <img class="dm-offer-img" src="{initial url}" alt="Offer preview" loading="lazy" />
  </div>
  <form class="dm-offer-controls">
    <label>Discount %
      <input type="number" name="percent" min="1" max="99" value="30" />
    </label>
    <label>Category
      <input type="text" name="category" value="phones" />
    </label>
    <label>End Date
      <input type="date" name="enddate" value="2026-07-29" />
    </label>
    <label>Hide Background
      <input type="checkbox" name="hidebackground" />
    </label>
    <label>Image Path
      <input type="text" name="image" value="PeterStolmarNA001/approved-phone-app" />
      <!-- "Browse DM" button rendered here if DM asset browsing is wired up -->
    </label>
    <div class="dm-offer-url-row">
      <code class="dm-offer-url-display">{constructed url}</code>
      <button type="button" class="dm-offer-copy">Copy URL</button>
    </div>
  </form>
</div>
```

Each `input` and `change` event on any control calls `buildDmUrl(currentValues)`, sets `img.src` to the new URL, and updates the URL display. The image element itself handles loading — no explicit fetch needed; the browser's `<img>` will show the previous frame until the new one loads.

**DM asset browsing (optional extension):** If `da_lookup_media` (DA MCP) or an AEM Assets search API is available at implementation time, add a "Browse DM" button next to the image path field that opens a modal asset picker. If not available, the text input suffices.

---

## The `dm-background` Block

**Location:** `blocks/dm-background/dm-background.js` + `blocks/dm-background/dm-background.css`

**Purpose:** Sets a full-bleed, fixed-position background image for the page (or the nearest positioned ancestor section) using a Dynamic Media delivery URL or an AEM Assets path. Demonstrates using DM's image serving for responsive, format-optimized backgrounds without any authored `<img>` tags.

### DA block config

```
dm-background
src  | https://s7d1.scene7.com/is/image/PeterStolmarNA001/some-background
fit  | crop
```

`src` is required. `fit` is optional (default `crop`). `src` accepts:
- A full Scene7 URL (`https://s7d1.scene7.com/is/image/...`) — used directly, responsive params appended
- An AEM Assets path (`/content/dam/...`) — passed through as-is (EDS CDN handles delivery)

### Responsive URL construction (Scene7 URLs only)

Strip any existing `wid`/`hei`/`fmt`/`fit` params from the authored URL, then append:
```
?wid=1920&hei=1080&qlt=75&fit=crop&fmt=webp
```
The browser's `srcset` / `sizes` pattern is not needed here because the image fills 100vw × 100vh and DM serves the exact pixel dimensions requested.

### DOM and CSS

```js
// decorate():
const src = cfg.src || '';
const isScene7 = src.includes('scene7.com');
const imgSrc = isScene7 ? appendDmParams(src, cfg.fit || 'crop') : src;

const img = document.createElement('img');
img.src = imgSrc;
img.alt = '';
img.setAttribute('aria-hidden', 'true');
block.replaceChildren(img);
// block itself is position:fixed, z-index:-1, inset:0
```

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
}

/* Darkening overlay so text above remains legible */
.dm-background::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgb(0 0 0 / 45%);
}
```

The block's `decorate()` also adds `class="has-dm-background"` to `document.body` so page text/header styles can opt into higher-contrast variants when a background is present.

---

## Page Content (DA authored)

### `/promo` — Promotion page (modes: `fingerprint` + `manual`)

Demonstrates the contrast between automatic silent polling and fully user-driven refresh.

Blocks in order:
1. Default content: `# Current Offers` heading + short intro paragraph
2. `stats` block: 3 KPIs (e.g., "40% Off", "2-Day Delivery", "10K+ Reviews")
3. **`dm-offer`** block: template=`PeterStolmarNA001/DiscountOffer`, default percent=30, category=phones, enddate=2026-07-29
4. **`cf-live fingerprint`** block: query=`/graphql/execute.json/global/hero`, poll=60
5. **`cf-live manual`** block: query=`/graphql/execute.json/global/hero` (same query — side-by-side contrast)
6. `quote` block: customer testimonial (static authored)
7. `fragment` block pointing to `/fragments/promo-context` (DA-authored terms/editorial note)

### `/pr` — Press Releases page (mode: `reactive`, DM background)

The full-bleed DM background is the visual centrepiece. The reactive CF mode refreshes press releases on tab focus.

Blocks in order:
1. **`dm-background`** block: src=`https://s7d1.scene7.com/is/image/PeterStolmarNA001/approved-phone-app`
2. Default content: `# Newsroom` heading
3. `stats` block: 3 KPIs (e.g., "Founded 1982", "180+ Countries", "$5B Revenue")
4. **`cf-live reactive`** block: query=`/graphql/execute.json/global/featurelist`, poll=300
5. `columns` block: 2-col "Media Resources" section
6. `fragment` block pointing to `/fragments/pr-context` (DA-authored media contact info)

Note: `dm-background` must be the first block in the section so it renders before other content. The `has-dm-background` class on `body` ensures text and header have sufficient contrast.

### `/feature` — Product Features page (modes: `compare` + `adaptive`)

Shows the two "smart" approaches side by side: user-confirmed updates vs self-regulating poll interval.

Blocks in order:
1. Default content: `# Platform Capabilities` heading + intro
2. **`cf-live compare`** block: query=`/graphql/execute.json/global/featurelist`, poll=120
3. **`cf-live adaptive`** block: query=`/graphql/execute.json/global/featurelist`, poll=30, maxpoll=600
4. `stats` block: 3 KPIs (e.g., "99.9% Uptime", "50ms TTFB", "0 Build Steps")
5. `fragment` block pointing to `/fragments/feature-context` (DA-authored changelog/release notes)
6. `callout-panel` block

### DA fragments (authored in DA, included via `fragment` block)

- `content.da.live/pstolmar/demo/fragments/promo-context` — Terms, legal copy, editorial note about CF freshness demo
- `content.da.live/pstolmar/demo/fragments/pr-context` — Media contact info, press kit note
- `content.da.live/pstolmar/demo/fragments/feature-context` — Changelog / what's new note

Each fragment includes a visible callout: _"This section is authored in DA Live. It refreshes automatically when published — no polling required — because DA publish invalidates the EDS CDN cache for this fragment path."_

---

## File Changes Summary

**New blocks:**
- `blocks/cf-live/cf-live.js` — five modes: `fingerprint`, `reactive`, `compare`, `manual`, `adaptive`
- `blocks/cf-live/cf-live.css`
- `blocks/dm-offer/dm-offer.js` — DM parameterized template configurator
- `blocks/dm-offer/dm-offer.css`
- `blocks/dm-background/dm-background.js` — full-bleed DM/AEM Assets background
- `blocks/dm-background/dm-background.css`

**DA content (via DA MCP):**
- `content.da.live/pstolmar/demo/promo` (new page)
- `content.da.live/pstolmar/demo/pr` (new page)
- `content.da.live/pstolmar/demo/feature` (new page)
- `content.da.live/pstolmar/demo/fragments/promo-context` (new fragment)
- `content.da.live/pstolmar/demo/fragments/pr-context` (new fragment)
- `content.da.live/pstolmar/demo/fragments/feature-context` (new fragment)

**No changes to existing blocks.** (stats, quote, columns, callout-panel, fragment all reused as-is)

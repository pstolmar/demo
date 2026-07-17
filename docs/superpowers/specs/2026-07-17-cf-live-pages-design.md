# CF Live Pages — Implementation Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Three new EDS demo pages (`/promo`, `/pr`, `/feature`) that look like real business pages and each showcase one technique for keeping AEM Content Fragment data fresh on an EDS page without requiring a page republish.

**Architecture:** One new block (`cf-live`) with three modes controlled by a CSS-class modifier. All modes share a single `?gql_ck=${Date.now()}` cache-bust parameter that forces CDN misses on every fetch, bypassing `s-maxage=7200`. Pages are authored in DA. CFs are fetched from the AEM publish GraphQL endpoint without auth (publish tier is public).

**Tech Stack:** Vanilla EDS JS/CSS, AEM GraphQL persisted queries on `publish-p138879-e1741192.adobeaemcloud.com`, DA MCP for page authoring, existing EDS blocks (hero, stats, quote, columns, callout-panel, fragment).

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
cf-live [etag | reactive | compare]
query   | /graphql/execute.json/global/hero
poll    | 60
cf-path | /content/dam/ue-demo/fragments/home-hero
```

All rows except `query` are optional. Defaults: poll=60 for `etag`, poll=300 for `reactive`, poll=120 for `compare`.

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

### Mode 1 — `etag` (fingerprint polling)

**Used on:** `/promo` page.

**Behaviour:**
1. Initial fetch with `?gql_ck=Date.now()` → render content → store fingerprint
2. `setInterval` every `poll` seconds:
   - Fetch fresh with new `gql_ck`
   - Compute new fingerprint
   - If fingerprint differs → replace rendered content (silent, no flash)
   - If same → do nothing (the "304" equivalent)
3. Status badge always visible: `● Polling · Last checked: Xs ago · Next in Ys`
4. Content re-render shows a brief green flash animation

**Template rendered (promo):**
```html
<div class="cf-live-content cf-live-promo">
  <div class="cf-live-badge cf-live-badge-etag">● Polling <span class="cf-live-status-text">…</span></div>
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

### UE instrumentation

The outer block container gets:
```js
block.dataset.aueResource = `urn:aemconnection:${cfg['cf-path']}`;
block.dataset.aueType = 'reference';
block.dataset.aueLabel = 'Content Fragment';
```

`cf-path` must be the AEM DAM path to the fragment (e.g. `/content/dam/ue-demo/fragments/home-hero`). If `cf-path` is absent, skip UE instrumentation — the GQL query path is not a valid `urn:aemconnection` value. No field-level editing markup needed for this demo.

---

## Page Content (DA authored)

### `/promo` — Promotion page

Blocks in order:
1. `section-metadata` with dark theme
2. Default content: `# Current Offers` heading + short intro paragraph
3. `stats` block: 3 KPIs (e.g., "40% Off", "2-Day Delivery", "10K+ Reviews")
4. **`cf-live etag`** block: query=`/graphql/execute.json/global/hero`, poll=60
5. `quote` block: customer testimonial (static authored)
6. `columns` block: 2-col "How it works" section
7. `fragment` block pointing to `/fragments/promo-context` (DA-authored terms/editorial note)
8. `callout-panel` block: CTA

### `/pr` — Press Releases page

Blocks in order:
1. Default content: `# Newsroom` heading
2. `stats` block: 3 KPIs (e.g., "Founded 1982", "180+ Countries", "$5B Revenue")
3. **`cf-live reactive`** block: query=`/graphql/execute.json/global/featurelist`, poll=300
4. `columns` block: 2-col "Media Resources" section
5. `fragment` block pointing to `/fragments/pr-context` (DA-authored media contact info)

### `/feature` — Product Features page

Blocks in order:
1. Default content: `# Platform Capabilities` heading + intro
2. **`cf-live compare`** block: query=`/graphql/execute.json/global/featurelist`, poll=120
3. `stats` block: 3 KPIs (e.g., "99.9% Uptime", "50ms TTFB", "0 Build Steps")
4. `fragment` block pointing to `/fragments/feature-context` (DA-authored changelog/release notes)
5. `callout-panel` block

### DA fragments (authored in DA, included via `fragment` block)

- `content.da.live/pstolmar/demo/fragments/promo-context` — Terms, legal copy, editorial note about CF freshness demo
- `content.da.live/pstolmar/demo/fragments/pr-context` — Media contact info, press kit note
- `content.da.live/pstolmar/demo/fragments/feature-context` — Changelog / what's new note

Each fragment includes a visible callout: _"This section is authored in DA Live. It refreshes automatically when published — no polling required — because DA publish invalidates the EDS CDN cache for this fragment path."_

---

## File Changes Summary

**New files:**
- `blocks/cf-live/cf-live.js`
- `blocks/cf-live/cf-live.css`

**DA content (via DA MCP):**
- `content.da.live/pstolmar/demo/promo` (new page)
- `content.da.live/pstolmar/demo/pr` (new page)
- `content.da.live/pstolmar/demo/feature` (new page)
- `content.da.live/pstolmar/demo/fragments/promo-context` (new fragment)
- `content.da.live/pstolmar/demo/fragments/pr-context` (new fragment)
- `content.da.live/pstolmar/demo/fragments/feature-context` (new fragment)

**No changes to existing blocks.** (stats, quote, columns, callout-panel, fragment, section-metadata all reused as-is)

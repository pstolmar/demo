# EDS Demo Grand Build — Design Spec
*2026-07-15 · eds branch · pstolmar/demo*

---

## Context

AuthorKit-based EDS site at `eds--demo--pstolmar.aem.live`. DA Live content at `pstolmar/demo`.
Single `eds` branch, one initial commit. Live URL: `https://eds--demo--pstolmar.aem.live/`.

---

## Workstreams

### A · Track A — Unblocking Fixes

#### A1 · 404 Page
**Problem:** `404.html` in the repo has a hardcoded fragment href pointing to
`https://main--author-kit--aemsites.aem.page/fragments/404` — wrong org/repo entirely.
**Fix:** Change the `<a href>` to `https://main--demo--pstolmar.aem.live/fragments/404` so the
fragment block resolves to the correct DA content. The DA fragment at `fragments/404.html`
already has correct content ("404 - Not found").

#### A2 · Schedule/Offers
**Status:** User reports this is already fixed for the main offer. Verify `schedules/main-promo.json`
and `schedules/header-promo.json` fragment URLs point to `main--demo--pstolmar.aem.live`.
**If still broken:** Update both JSONs in DA via MCP, change origin from
`http://main--adv--aemsites.aem.page` → `https://main--demo--pstolmar.aem.live`.

#### A3 · Block Library Sidekick Plugin
**Problem:** No `tools/sidekick/config.json` exists; sidekick has no library button.
**Fix:** Create `tools/sidekick/config.json` with:
- `library` plugin pointing at `https://main--demo--pstolmar.aem.live/docs/library`
  (passConfig + passReferrer so it picks up blocks.json/icons.json/templates.json)
- `scheduler` plugin (already handled in sidekick.js, just needs the config entry)
- `quick-edit` plugin (same)
- `ue-editor` plugin for `tools/ue-spa-demo/` paths

#### A4 · /de/ Locale
**Problem:** `/de/` returns a raw 404 because (a) no content exists and (b) the 404 page itself
is broken (A1).
**Fix:**
1. Fix A1 first so 404 renders correctly.
2. Create `/de/index.html` in DA: German translation of the home page hero + intro section.
3. Create `/de/nav` folder in DA with translated nav fragment.
4. Publish via admin API: `POST https://admin.hlx.page/preview/pstolmar/demo/eds/de/`
   then `POST https://admin.hlx.page/live/pstolmar/demo/eds/de/`.
5. Repeat for fr, es, ja, zh, hi as minimal stubs (one heading + paragraph).

---

### B · Block Library Additions

All blocks copied from `~/dev/eds/diagram-editor/blocks/` or `~/dev/eds/eds-agents-demo/blocks/`
unless noted. The AuthorKit uses `ak.js` not `aem.js` — any `import { loadScript } from '../../scripts/aem.js'`
is replaced with the existing `scripts/utils/script.js` loadScript util (already present).
UE `moveInstrumentation` imports (from xwalk stack) are stripped — that function is a no-op in
the DA Live context.

#### Blocks to copy

| Block | Source repo | Notes |
|---|---|---|
| `callout-panel` | diagram-editor | No aem.js deps |
| `metrics-grid` | diagram-editor | No deps |
| `popin-carousel` | diagram-editor | Self-contained |
| `scroll-narrative` | diagram-editor | Self-contained |
| `testimonials-mosaic` | diagram-editor | No deps |
| `corkboard` | diagram-editor | No deps |
| `wave-terrain` | diagram-editor | No deps |
| `miser-3d-scatter` | diagram-editor | loadScript → utils/script.js |
| `miser-3d-bars` | diagram-editor | loadScript → utils/script.js |
| `miser-threejs-scene` | diagram-editor | loadScript → utils/script.js |
| `viz-quake-feed` | diagram-editor | Globe upgrade (see B2) |
| `crossfade` | eds-agents-demo | No aem.js deps |
| `pull-quote` | eds-agents-demo | No deps |
| `accordion` | eds-agents-demo | No deps |
| `carousel` | eds-agents-demo | No deps |
| `embed` | eds-agents-demo | No deps |
| `stats` | eds-agents-demo | No deps |
| `cfrenderer` | eds-mermaid-demo | Fetches CF GraphQL → renders HTML |

#### B1 · Tabs Enhancement (tabbed-feature → `feature-tabs`)
Base: `tabbed-feature` from diagram-editor.
Strip `moveInstrumentation` import.
Enhancements:
- Replace confetti with: **highlight sweep** (CSS clip-path animation that wipes a highlight
  colour across the active tab label on switch) + **lock-in indicator** (a small padlock SVG
  that animates from open → closed and snaps into the tab label area when a tab becomes active
  — symbolises "this content is locked in / confirmed").
- Transition: panel slides in with a subtle scale(0.97→1) + opacity(0→1), 220ms ease-out.
- Color palette: deep purple `#3B1F5E`, forest green `#1A3D2B`, burgundy `#5C1A2A` for tab
  accent backgrounds; white text; highlight sweep uses a 30% lighter tint of the active color.
- Auto-advance progress bar retained from original.
- Modifier classes: `feature-tabs highlight` / `feature-tabs lock` to toggle the effect style.
  Default is highlight. Lock reserved for security/compliance industry demos.

#### B2 · Globe Upgrade for viz-quake-feed
The procedural m3d-globe texture is replaced with the **R3F globe approach** from
`tools/ue-spa-demo/r3f.html`: load Three.js via esm.sh importmap, use a real
`earth_texture.jpg` (or the NASA blue marble CDN URL). When the texture fails to load, fall
back gracefully to the procedural canvas texture already in the block.

Additional quake-feed fixes and improvements:

**Snap-to bug (confirmed):** `spinToQuake` computes `rawY = Math.PI / 2 - theta` but the
correct formula is `rawY = theta - Math.PI / 2`. Camera is at `(0,0,2.5)`; world-Z of a point
is maximised when `sin(θ − R) = 1`, i.e. `R = θ − π/2`. The current sign is negated → always
lands 180° opposite (directly across the globe). One-line fix:
```js
const rawY = theta - Math.PI / 2; // was: Math.PI / 2 - theta
```

**Globe marker click → sidebar (missing accordion):** `setHighlight` is called correctly but
only toggles an `.is-active` CSS class; the sidebar item doesn't visually expand. Users miss it.
Fix: add accordion expand — `is-active` item gets `max-height` animated from `48px` → `auto`
(use `max-height` transition + a `.quake-item-detail` inner div hidden by default). Also call
`scrollIntoView({ block: 'center' })` instead of `'nearest'` so the active item centres in the
panel, not just barely scrolls into view.

**Globe texture:** swap procedural canvas texture for the NASA Blue Marble URL from r3f.html
(`https://raw.githubusercontent.com/mrdoob/three.js/r160/examples/textures/land_ocean_ice_cloud_2048.jpg`).
Load pattern: render procedural immediately, upgrade texture once image loads (same lazy-upgrade
pattern already in r3f.html).

- Sidebar virtualised (IntersectionObserver lazy rows) for 1000+ events.

#### B3 · Block Library JSON updates
`docs/library/blocks.json` in DA updated with all new block entries + preview paths.

---

### C · SPAs + CF Blocks (Modernised)

#### C1 · SPA files
Copy `~/dev/eds/diagram-editor/tools/ue-spa-demo/` → `tools/ue-spa-demo/` in demo repo.
Files: `react-enterprise.html`, `svelte.html`, `nextjs.html`, `vue.html`, `angular.html`,
`r3f.html`, `cf-spa.html`, `config.js`, `app.js`, `styles.css`.

Update `config.js` to correct AEM GraphQL endpoint. AEM instance
`author-p138879-e1741192.adobeaemcloud.com` is already correct; update GraphQL queries to
use persisted-query paths (see C2).

Sidekick plugin in `config.json` enables "Edit in Universal Editor" for `/tools/ue-spa-demo/` paths.

#### C2 · Modern CF fetch pattern (replaces cfrenderer approach)

The old `cfrenderer` block fetches `data.textBlockCfByPath.item.body.html` — a hardcoded single
model/schema. All new CF-powered blocks use **modern AEM persisted queries** instead:

```
GET https://author-p138879-e1741192.adobeaemcloud.com/graphql/execute.json/{config}/{query-name}
```

Standard response envelope: `{ data: { contentFragmentByPath: { item: { ...fields } } } }` or
`{ data: { contentFragmentList: { items: [ ... ] } } }`.

**New CF EDS blocks** (each a thin wrapper that fetches a CF and renders it, no framework needed):

| Block | What it fetches | Renders as |
|---|---|---|
| `cf-hero` | single CF (title, body, image) | hero section |
| `cf-cards` | CF list query | card grid |
| `cf-quote` | single CF (quote, author, role) | pull-quote |
| `cf-stats` | CF list (label, value, trend) | metrics-grid row |

Each block takes one authored cell: either a persisted query URL or a CF path. Generic field
mapping via block modifier classes (e.g. `cf-cards compact`). Falls back to `cfrenderer` HTML
rendering if the response contains an `html` field.

All four SPAs (`react-enterprise`, `svelte`, `vue`, `angular`) updated to use persisted queries
with these same query paths for consistency.

---

### D · Hero Enhancement

**Target block:** `blocks/hero/hero.js` + `hero.css`.

Keep the existing gradient/video/focal-point logic. Add a new `color-blend` modifier class.
When `hero color-blend` is authored, the JS layer activates:

1. **Gradient mesh animation** — CSS `@property`-animated gradient with three color stops:
   dark purple `#1E0A2E`, forest green `#0D2318`, burgundy `#2A0A12`. The stops animate
   offset positions on a 12s loop (offset-distance keyframes), creating a living gradient.

2. **Mouse parallax tint** — `mousemove` listener on the hero element shifts the gradient
   center toward the cursor (max 15% offset). Uses `requestAnimationFrame` + lerp for smooth
   tracking. No jank on scroll.

3. **Click firework** — on `click`, spawns ~18 canvas particles at the click point.
   Particle colors: bright pink `#FF6EB4`, yellow `#FFD23F`, coral `#FF6B35`. These are the
   only bright pop colors; they fade (alpha) over ~600ms. Canvas is position:absolute,
   pointer-events:none, removed from DOM after animation completes.

Performance contract: the mousemove handler is debounced to rAF (no direct event → style
writes). Canvas is only created on first click and reused. Everything runs off the main thread
paint cycle.

---

### E · Stagecraft Mode (`?stagecraft=1`)

A small script (`scripts/utils/stagecraft.js`, ~150 lines) activates when `?stagecraft=1` is in
the query string. It intercepts the theme toggle button.

**Interaction flow:**

1. User clicks theme toggle → instead of normal dark mode:
   - Page fades to near-black (1s transition).
   - Theme button gets a **Cherenkov glow** (radial blue-white pulse, `box-shadow` keyframes).
   - A **hanging lightbulb** SVG element drops in from `top:-200px` → final position
     (center top, ~120px from top). The bulb has a dangling pull chain.

2. **User pulls chain** (clicks bulb/chain area):
   - Total darkness — only the theme button Cherenkov glow remains visible.
   - After 1.5s: a **flashlight SVG** animates in from `top:-80px`, comes to rest on a small
     table/shelf element (inline SVG bookend) centered mid-hero.
   - CSS spotlight: a `radial-gradient` mask on a `::before` pseudo-element creates a circular
     "lit" area centered on the flashlight's beam tip. Everything outside is `brightness(0.04)`.

3. **User clicks flashlight** — enters "carrying" mode:
   - The spotlight follows `mousemove` (same rAF/lerp approach as hero parallax).
   - Battery meter: CSS custom property `--battery` starts at 1.0, decrements at 0.002/frame.
   - When `--battery < 0.3`: spotlight radius shrinks + flicker (random `opacity` jitter in rAF).
   - **Shake to revive**: `mousemove` delta accumulates; if total delta > 800px in < 600ms,
     battery resets to 0.8 and flicker stops (one satisfying "click-on" flash).

4. **Battery dies** (reaches 0):
   - One final bright flicker → total dark for 1.5s.
   - A **little robot helper** SVG character walks across the bottom of the screen (CSS
     `translate` animation, 2.5s ease-in-out). It carries a tiny flashlight.
   - The robot pauses at screen-right, where an **oversized power switch** SVG is partially
     visible just off-screen. The switch arc animates (rotates from down → up position, ~90°).
   - Lights come back on: page fades from black, final light-theme state, theme button returns
     to normal.

**?stagecraft general contract:** when this param is present, any component with a
`data-stagecraft` attribute may substitute its normal behaviour for theatrical alternate
content (confetti, over-the-top transitions, sizzle banners). This is the hook for future
one-off sizzle moments without polluting prod paths.

**Implementation:** `scripts/utils/stagecraft.js` — pure DOM + CSS, no external dependencies.
All SVGs inlined as template literals. ~150 LOC + SVG markup. Imported lazily from `lazy.js`
only when `?stagecraft` is present.

---

### F · Demo Pages

Three industry-showcase pages created in DA, all published to the `eds` branch.

#### F1 · `/demo` — Grand Demo (pan-industry)
Sections in order:
1. Hero `color-blend full` — m3d-photo-globe embedded as background video alternative
2. `feature-tabs lock` — 4 tabs: Financial Services, Healthcare, Retail, Manufacturing
3. `crossfade` — scroll-driven narrative: "The Platform Story" (3 panels)
4. `metrics-grid` — 4 KPIs: 99 Lighthouse · 0ms cold-start · 6 languages · 1000 locations
5. `callout-panel` — 3 callouts: Personalization / Experimentation / Analytics
6. `miser-3d-scatter` — data viz: sample KPI scatter (authorable via JSON)
7. `testimonials-mosaic` — 4 quotes (industries: bank, hospital, retailer, OEM)
8. `embed` — iframe → `tools/ue-spa-demo/react-enterprise.html` (CF-powered)
9. Scheduled promo section (links to `schedules/main-promo.json`)

#### F2 · `/demo/financial` — Financial Services deep-dive
Hero + feature-tabs (lock effect) + crossfade + cfrenderer (GraphQL CF) + scroll-narrative.

#### F3 · `/demo/global` — Multilingual showcase
Hero + stats (showing 6 locales) + viz-quake-feed (reframed as "Global Events Monitor")
+ language switcher links to /de/demo, /fr/demo, etc.

---

### G · Localization Content (DA via MCP)

Minimal translated stubs for each locale, enough to prove the routing works:
- `/de/index.html` — German hero + 2 sections
- `/de/nav` — German nav fragment  
- `/fr/index.html`, `/es/index.html`, `/ja/index.html` — same pattern
- `/zh/index.html`, `/hi/index.html` — same pattern
- All published via hlx admin API after creation.

---

## Out of Scope (this build)

- MSM (DA Live Multi-Site Manager) — tracked separately, requires early-access flag
- Rubik cube block — save for next sprint
- 1000-location CF globe — separate spec (Track C)
- Adobe I/O integration — deferred
- Forms — deferred to eds-agents-demo form block once validated

---

## Files Changed (summary)

```
404.html                              ← fix fragment href
tools/sidekick/config.json            ← new
tools/ue-spa-demo/                    ← copied from diagram-editor
scripts/utils/stagecraft.js           ← new (~150 LOC)
blocks/hero/hero.js                   ← color-blend + mouse + firework
blocks/hero/hero.css                  ← color-blend styles + firework canvas
blocks/feature-tabs/                  ← new (from tabbed-feature, adapted)
blocks/callout-panel/                 ← copied
blocks/metrics-grid/                  ← copied
blocks/popin-carousel/                ← copied
blocks/scroll-narrative/              ← copied
blocks/testimonials-mosaic/           ← copied
blocks/corkboard/                     ← copied
blocks/wave-terrain/                  ← copied
blocks/miser-3d-scatter/              ← copied + aem.js → ak.js
blocks/miser-3d-bars/                 ← copied + aem.js → ak.js
blocks/miser-threejs-scene/           ← copied + aem.js → ak.js
blocks/viz-quake-feed/                ← copied + globe upgrade + bidirectional snap
blocks/crossfade/                     ← copied from eds-agents-demo
blocks/pull-quote/                    ← copied
blocks/accordion/                     ← copied
blocks/carousel/                      ← copied
blocks/embed/                         ← copied
blocks/stats/                         ← copied
blocks/cfrenderer/                    ← copied from eds-mermaid-demo
```

DA changes (via MCP):
```
schedules/main-promo.json             ← verify/fix fragment URLs
schedules/header-promo.json          ← verify/fix fragment URLs
docs/library/blocks.json             ← add all new block entries
de/index.html                        ← new
de/nav/                              ← new
fr/index.html, es/, ja/, zh/, hi/   ← new stubs
demo/index.html                      ← grand demo page
demo/financial.html                  ← financial page
demo/global.html                     ← global page
```

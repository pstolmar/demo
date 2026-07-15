# EDS Demo Grand Build — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the AuthorKit EDS demo site into a feature-rich, multilingual, visually spectacular demo with fixed bugs, 18 new/adapted blocks, SPA embeds, CF-powered content, stagecraft easter egg, and 3 industry demo pages.

**Architecture:** All blocks are plain ES-module decorators (no bundler). Content lives in DA Live (`pstolmar/demo`). Blocks are copied from sibling repos and adapted to use `scripts/utils/script.js` instead of `aem.js`. New functionality (feature-tabs, CF blocks, stagecraft, hero color-blend) is written from scratch. DA content is created/updated via the DA Live MCP.

**Tech Stack:** Vanilla JS ES modules, Three.js (CDN via importmap or script tag), CSS custom properties, DA Live MCP for content, WTR for tests, no bundler.

## Global Constraints

- All block JS uses ES modules (`export default function decorate(block) { ... }`)
- Import `loadScript` from `../../scripts/utils/script.js` (never from `aem.js` — that file doesn't exist in this repo)
- Strip any `import { moveInstrumentation }` — that's UE/xwalk only, not available here
- No `import` from any other sibling repo path — all dependencies must be in `demo/`
- `ak.js` exports: `getConfig`, `getMetadata`, `loadStyle`, `loadExperience`, `loadBlock`, `loadArea`, `setConfig`
- DA Live MCP: org=`pstolmar`, repo=`demo`
- All DA content HTML must be valid document body HTML (no `<!doctype>` or `<html>` wrapper)
- Live URL prefix: `https://main--demo--pstolmar.aem.live` (published main branch)
- Preview URL prefix: `https://main--demo--pstolmar.aem.page`
- Current working branch: `eds` (`https://eds--demo--pstolmar.aem.live`)
- After every git commit, any changed DA content must be published via admin API or MCP

---

## File Map

### Modified
- `404.html` — fix hardcoded fragment href
- `scripts/lazy.js` — add conditional stagecraft import
- `blocks/hero/hero.js` — add color-blend activation
- `blocks/hero/hero.css` — add color-blend + firework styles
- `blocks/viz-quake-feed/viz-quake-feed.js` — snap-to fix, accordion, globe texture

### Created (code)
- `tools/sidekick/config.json` — library + UE plugins
- `tools/ue-spa-demo/` — copied from diagram-editor
- `scripts/utils/stagecraft.js` — stagecraft easter egg
- `blocks/feature-tabs/feature-tabs.js` — new tabbed block
- `blocks/feature-tabs/feature-tabs.css`
- `blocks/cf-hero/cf-hero.js` — CF-powered hero
- `blocks/cf-hero/cf-hero.css`
- `blocks/cf-cards/cf-cards.js` — CF-powered card grid
- `blocks/cf-cards/cf-cards.css`
- `blocks/cf-quote/cf-quote.js` — CF-powered pull-quote
- `blocks/cf-quote/cf-quote.css`
- `blocks/cf-stats/cf-stats.js` — CF-powered metrics
- `blocks/cf-stats/cf-stats.css`

### Copied + adapted (aem.js import swap)
- `blocks/callout-panel/` ← `diagram-editor/blocks/callout-panel/`
- `blocks/metrics-grid/` ← `diagram-editor/blocks/metrics-grid/`
- `blocks/popin-carousel/` ← `diagram-editor/blocks/popin-carousel/`
- `blocks/scroll-narrative/` ← `diagram-editor/blocks/scroll-narrative/`
- `blocks/testimonials-mosaic/` ← `diagram-editor/blocks/testimonials-mosaic/`
- `blocks/corkboard/` ← `diagram-editor/blocks/corkboard/`
- `blocks/wave-terrain/` ← `diagram-editor/blocks/wave-terrain/`
- `blocks/miser-3d-scatter/` ← `diagram-editor/blocks/miser-3d-scatter/` (aem.js → utils/script.js)
- `blocks/miser-3d-bars/` ← `diagram-editor/blocks/miser-3d-bars/` (aem.js → utils/script.js)
- `blocks/miser-threejs-scene/` ← `diagram-editor/blocks/miser-threejs-scene/` (aem.js → utils/script.js)
- `blocks/crossfade/` ← `eds-agents-demo/blocks/crossfade/`
- `blocks/pull-quote/` ← `eds-agents-demo/blocks/pull-quote/`
- `blocks/accordion/` ← `eds-agents-demo/blocks/accordion/`
- `blocks/carousel/` ← `eds-agents-demo/blocks/carousel/`
- `blocks/embed/` ← `eds-agents-demo/blocks/embed/`
- `blocks/stats/` ← `eds-agents-demo/blocks/stats/`
- `blocks/cfrenderer/` ← `eds-mermaid-demo/blocks/cfrenderer/`

### DA content (created/updated via MCP)
- `schedules/main-promo.json` — verify fragment URLs
- `schedules/header-promo.json` — verify fragment URLs
- `docs/library/blocks.json` — add all 18 new blocks
- `de/index.html`, `de/nav/header.html`, `de/fragments/nav/header.html`
- `fr/index.html`, `es/index.html`, `ja/index.html`, `zh/index.html`, `hi/index.html`
- `demo/index.html` — grand demo page
- `demo/financial.html` — financial services page
- `demo/global.html` — global/multilingual showcase

---

## Task 1: Fix 404.html + verify schedule fragment URLs

**Files:**
- Modify: `404.html`
- Verify/update via MCP: `schedules/main-promo.json`, `schedules/header-promo.json`

**Interfaces:**
- Produces: working 404 page that renders the DA fragment; schedule blocks that load correct promo fragments

- [ ] **Step 1: Fix the 404.html fragment href**

Open `404.html`. The `<main>` contains:
```html
<main><div><a href="/fragments/404">https://main--author-kit--aemsites.aem.page/fragments/404</a></div></main>
```
Change to:
```html
<main><div><a href="/fragments/404">https://main--demo--pstolmar.aem.live/fragments/404</a></div></main>
```
The `href` attribute is what the fragment block uses; the link text is irrelevant but should match for clarity.

- [ ] **Step 2: Verify schedule JSONs via MCP**

Fetch `schedules/main-promo.json` via the DA MCP `da_get_source` tool. Check that all `fragment` values start with `https://main--demo--pstolmar.aem.live/`. If any still start with `http://main--adv--aemsites.aem.page`, update them with `da_update_source`. The correct mapping:
```
http://main--adv--aemsites.aem.page/fragments/promos/main/default
  → https://main--demo--pstolmar.aem.live/fragments/promos/main/default
http://main--adv--aemsites.aem.page/fragments/promos/main/memorial-day
  → https://main--demo--pstolmar.aem.live/fragments/promos/main/memorial-day
http://main--adv--aemsites.aem.page/fragments/promos/main/4th-of-july
  → https://main--demo--pstolmar.aem.live/fragments/promos/main/4th-of-july
http://main--adv--aemsites.aem.page/fragments/promos/main/back-to-school
  → https://main--demo--pstolmar.aem.live/fragments/promos/main/back-to-school
```
Do the same for `schedules/header-promo.json`.

- [ ] **Step 3: Commit**

```bash
git add 404.html
git commit -m "fix: 404 fragment href and schedule fragment origins"
```

- [ ] **Step 4: Verify live**

Visit `https://eds--demo--pstolmar.aem.page/nonexistent-path` — should render the nav, "404 - Not found" body from the DA fragment, and footer. Not a blank page.

---

## Task 2: Sidekick config.json

**Files:**
- Create: `tools/sidekick/config.json`

**Interfaces:**
- Produces: AEM Sidekick gains "Block Library", "Scheduler", and "Edit in Universal Editor" plugin buttons

- [ ] **Step 1: Create the config file**

```json
{
  "project": "Demo",
  "plugins": [
    {
      "id": "library",
      "title": "Block Library",
      "environments": ["edit"],
      "url": "https://main--demo--pstolmar.aem.live/docs/library",
      "passConfig": true,
      "passReferrer": true,
      "isPalette": true
    },
    {
      "id": "scheduler",
      "title": "Scheduler",
      "environments": ["dev", "preview"],
      "event": "scheduler"
    },
    {
      "id": "quick-edit",
      "title": "Quick Edit",
      "environments": ["dev", "preview"],
      "event": "quick-edit"
    },
    {
      "id": "open-in-ue",
      "title": "Edit in Universal Editor",
      "environments": ["dev", "preview", "live"],
      "condition": {
        "include": ["/tools/ue-spa-demo/"]
      },
      "url": "https://experience.adobe.com/#/aem/editor/canvas/{{liveUrl}}",
      "isPalette": false
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add tools/sidekick/config.json
git commit -m "feat: add sidekick config with library, scheduler, UE plugins"
```

- [ ] **Step 3: Verify**

With AEM Sidekick extension active on `https://eds--demo--pstolmar.aem.page/`, the "Block Library" button should appear in the sidekick panel. If it doesn't appear immediately, the sidekick may need a page reload after the config is published.

---

## Task 3: Copy 7 content blocks from diagram-editor

**Files:**
- Create: `blocks/callout-panel/`, `blocks/metrics-grid/`, `blocks/popin-carousel/`, `blocks/scroll-narrative/`, `blocks/testimonials-mosaic/`, `blocks/corkboard/`, `blocks/wave-terrain/`

**Interfaces:**
- Produces: 7 new renderable blocks, no external dependencies beyond CDN in their own files

- [ ] **Step 1: Copy the block directories**

```bash
for BLOCK in callout-panel metrics-grid popin-carousel scroll-narrative testimonials-mosaic corkboard wave-terrain; do
  cp -r ~/dev/eds/diagram-editor/blocks/$BLOCK blocks/$BLOCK
done
```

- [ ] **Step 2: Check for aem.js imports**

```bash
grep -rn "from '../../scripts/aem.js'" blocks/callout-panel blocks/metrics-grid blocks/popin-carousel blocks/scroll-narrative blocks/testimonials-mosaic blocks/corkboard blocks/wave-terrain
```

Expected: no output (these blocks don't use `loadScript`). If any hits appear, replace each with `import loadScript from '../../scripts/utils/script.js';`.

- [ ] **Step 3: Check for moveInstrumentation imports**

```bash
grep -rn "moveInstrumentation" blocks/callout-panel blocks/metrics-grid blocks/popin-carousel blocks/scroll-narrative blocks/testimonials-mosaic blocks/corkboard blocks/wave-terrain
```

Expected: no output. If any hits appear, delete those import lines and remove any `moveInstrumentation(...)` calls from the functions.

- [ ] **Step 4: Remove any `_*.json` model files (not needed for AuthorKit)**

```bash
find blocks/callout-panel blocks/metrics-grid blocks/popin-carousel blocks/scroll-narrative blocks/testimonials-mosaic blocks/corkboard blocks/wave-terrain -name '_*.json' -delete
```

- [ ] **Step 5: Smoke-test each block in browser**

Start the local dev server: `npx @adobe/aem-cli dev` (or the project's equivalent). Visit any page and open the browser console. There should be no import errors for these blocks when they're placed on a page. They won't render until a page uses them (covered in Task 15).

- [ ] **Step 6: Commit**

```bash
git add blocks/callout-panel blocks/metrics-grid blocks/popin-carousel blocks/scroll-narrative blocks/testimonials-mosaic blocks/corkboard blocks/wave-terrain
git commit -m "feat: add 7 content blocks from diagram-editor"
```

---

## Task 4: Copy 3 3D viz blocks + fix aem.js imports

**Files:**
- Create: `blocks/miser-3d-scatter/`, `blocks/miser-3d-bars/`, `blocks/miser-threejs-scene/`

**Interfaces:**
- Consumes: `scripts/utils/script.js` (default export: `async function loadScript(src: string): Promise<void>`)
- Produces: 3 three.js viz blocks that self-load Three.js from CDN

- [ ] **Step 1: Copy the 3 blocks**

```bash
for BLOCK in miser-3d-scatter miser-3d-bars miser-threejs-scene; do
  cp -r ~/dev/eds/diagram-editor/blocks/$BLOCK blocks/$BLOCK
done
```

- [ ] **Step 2: Rewrite the aem.js import line in each block**

`miser-3d-scatter.js` line 1: `import { loadScript } from '../../scripts/aem.js';`
Replace with: `import loadScript from '../../scripts/utils/script.js';`

`miser-3d-bars.js` line 1: same replacement.

`miser-threejs-scene.js` line 1: same replacement.

Do all three:
```bash
for BLOCK in miser-3d-scatter miser-3d-bars miser-threejs-scene; do
  sed -i '' "s|import { loadScript } from '../../scripts/aem.js';|import loadScript from '../../scripts/utils/script.js';|g" blocks/$BLOCK/$BLOCK.js
done
```

- [ ] **Step 3: Verify the import is the only change needed**

```bash
grep -n "aem.js\|moveInstrumentation" blocks/miser-3d-scatter/miser-3d-scatter.js blocks/miser-3d-bars/miser-3d-bars.js blocks/miser-threejs-scene/miser-threejs-scene.js
```

Expected: no output.

- [ ] **Step 4: Remove `_*.json` model files**

```bash
find blocks/miser-3d-scatter blocks/miser-3d-bars blocks/miser-threejs-scene -name '_*.json' -delete
```

- [ ] **Step 5: Commit**

```bash
git add blocks/miser-3d-scatter blocks/miser-3d-bars blocks/miser-threejs-scene
git commit -m "feat: add 3D viz blocks with corrected loadScript import"
```

---

## Task 5: Copy 6 blocks from eds-agents-demo

**Files:**
- Create: `blocks/crossfade/`, `blocks/pull-quote/`, `blocks/accordion/`, `blocks/carousel/`, `blocks/embed/`, `blocks/stats/`

**Interfaces:**
- Produces: 6 utility/layout blocks with no external dependencies

- [ ] **Step 1: Copy the blocks**

```bash
for BLOCK in crossfade pull-quote accordion carousel embed stats; do
  cp -r ~/dev/eds/eds-agents-demo/blocks/$BLOCK blocks/$BLOCK
done
```

- [ ] **Step 2: Check for non-AuthorKit imports**

```bash
grep -rn "from '../../scripts/aem.js'\|from '../../scripts/scripts.js'\|moveInstrumentation\|from '../../scripts/lib-franklin'" blocks/crossfade blocks/pull-quote blocks/accordion blocks/carousel blocks/embed blocks/stats
```

For any `scripts/scripts.js` imports of functions other than `moveInstrumentation`, check what the function does and either inline it or find an `ak.js` equivalent. `moveInstrumentation` calls can be deleted entirely.

- [ ] **Step 3: Fix any import issues found in Step 2**

If `crossfade.js` imports from `scripts.js` for anything, check if `ak.js` exports an equivalent:
- `getMetadata` → available from `ak.js` 
- `decorateIcons` → `ak.js` handles icons internally; remove the call
- `createOptimizedPicture` → not in ak.js; inline or skip

- [ ] **Step 4: Commit**

```bash
git add blocks/crossfade blocks/pull-quote blocks/accordion blocks/carousel blocks/embed blocks/stats
git commit -m "feat: add 6 blocks from eds-agents-demo"
```

---

## Task 6: Copy cfrenderer + update to modern pattern

**Files:**
- Create: `blocks/cfrenderer/cfrenderer.js`, `blocks/cfrenderer/cfrenderer.css`

**Interfaces:**
- Produces: `cfrenderer` block that accepts any AEM GraphQL URL returning `{ data: { [key]: { item: { body: { html: string } } } } }` or a generic `{ html: string }` envelope

- [ ] **Step 1: Copy from eds-mermaid-demo**

```bash
cp -r ~/dev/eds/eds-mermaid-demo/blocks/cfrenderer blocks/cfrenderer
```

- [ ] **Step 2: Update cfrenderer.js to accept any response shape**

Replace the entire `getContent` function so it tries multiple response shapes:

```js
async function getContent(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  // Try common GraphQL CF response shapes
  const data = json?.data;
  if (data) {
    // Generic: iterate top-level keys looking for { item: { body: { html } } }
    for (const val of Object.values(data)) {
      const html = val?.item?.body?.html ?? val?.item?.text?.html ?? val?.item?.content?.html;
      if (html) return sanitiseHTML(html);
    }
    // List shape: { items: [{ body: { html } }] }
    for (const val of Object.values(data)) {
      const items = val?.items;
      if (Array.isArray(items) && items[0]) {
        const html = items[0]?.body?.html ?? items[0]?.text?.html;
        if (html) return sanitiseHTML(html);
      }
    }
  }
  // Raw html field
  if (json?.html) return sanitiseHTML(json.html);
  throw new Error('No renderable HTML found in CF response');
}
```

- [ ] **Step 3: Commit**

```bash
git add blocks/cfrenderer
git commit -m "feat: add cfrenderer block with flexible CF response parsing"
```

---

## Task 7: Fix viz-quake-feed (snap-to, accordion, globe texture)

**Files:**
- Create: `blocks/viz-quake-feed/viz-quake-feed.js`, `blocks/viz-quake-feed/viz-quake-feed.css`

**Interfaces:**
- Produces: viz-quake-feed block with correct snap-to, bidirectional accordion sidebar, NASA texture globe

- [ ] **Step 1: Copy from diagram-editor**

```bash
cp -r ~/dev/eds/diagram-editor/blocks/viz-quake-feed blocks/viz-quake-feed
find blocks/viz-quake-feed -name '_*.json' -delete
```

- [ ] **Step 2: Fix the snap-to sign error**

In `blocks/viz-quake-feed/viz-quake-feed.js`, find the `spinToQuake` function (around line 399). The comment says "corrected formula" but is wrong. Fix the one line:

```js
// BEFORE (wrong — lands 180° opposite):
const rawY = Math.PI / 2 - theta;

// AFTER (correct — camera at +Z, maximize world-Z of the point):
const rawY = theta - Math.PI / 2;
```

Verify the surrounding context matches:
```js
function spinToQuake(quake) {
  const theta = (quake.lon + 180) * (Math.PI / 180);
  const rawY = theta - Math.PI / 2;  // ← this line changed
  const curr = globeGroup.rotation.y;
  let diff = (rawY - curr) % (2 * Math.PI);
  if (diff > Math.PI) diff -= 2 * Math.PI;
  if (diff < -Math.PI) diff += 2 * Math.PI;
  targetY = curr + diff;
  targetX = -((quake.lat * Math.PI) / 180) * 0.4;
  spinning = true;
}
```

- [ ] **Step 3: Add accordion expand to sidebar items**

In `buildPanel`, find the `item.innerHTML = ...` template literal (around line 268). Add a `.quake-item-detail` div after the existing content:

```js
item.innerHTML = `
  <div class="quake-badge ${cls}">${q.mag.toFixed(1)}</div>
  <div class="quake-info">
    <div class="quake-place">${q.place}</div>
    <div class="quake-time">${timeAgo(q.time)}</div>
  </div>
  <div class="quake-item-detail" aria-hidden="true">
    <div class="quake-detail-row"><span>Depth</span><span>${q.depth} km</span></div>
    <div class="quake-detail-row"><span>Coords</span><span>${q.lat.toFixed(2)}°, ${q.lon.toFixed(2)}°</span></div>
  </div>
`;
```

- [ ] **Step 4: Update setHighlight to expand accordion on activation**

Find `setHighlight` (around line 380). Add the accordion logic:

```js
function setHighlight(quakeId) {
  nodeObjects.forEach((obj) => {
    const active = obj.quake.id === quakeId;
    obj.mat.color.setHex(active ? 0xffffff : obj.baseColor);
    obj.mesh.scale.setScalar(active ? 1.8 : 1);
  });
  wrapper.querySelectorAll('.quake-item').forEach((item) => {
    const isActive = item.dataset.quakeId === quakeId;
    item.classList.toggle('is-active', isActive);
    const detail = item.querySelector('.quake-item-detail');
    if (detail) {
      detail.style.maxHeight = isActive ? `${detail.scrollHeight}px` : '0';
    }
  });
  const activeItem = wrapper.querySelector('.quake-item.is-active');
  if (activeItem) activeItem.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
```

- [ ] **Step 5: Add CSS for accordion**

In `viz-quake-feed.css`, add at the end:

```css
.quake-item-detail {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.25s ease;
  padding: 0 12px;
  font-size: 0.75rem;
  color: rgba(255 255 255 / 0.55);
}

.quake-item.is-active .quake-item-detail {
  padding-bottom: 8px;
}

.quake-detail-row {
  display: flex;
  justify-content: space-between;
  padding: 2px 0;
}
```

- [ ] **Step 6: Upgrade globe texture to NASA Blue Marble**

In `viz-quake-feed.js`, after `sphereMat` is created (line ~306), add a lazy texture upgrade. Insert immediately after the line `globeGroup.add(new THREE.Mesh(sphereGeom, sphereMat));`:

```js
// Upgrade to NASA texture asynchronously — keep procedural until loaded
const NASA_TEX = 'https://raw.githubusercontent.com/mrdoob/three.js/r160/examples/textures/land_ocean_ice_cloud_2048.jpg';
new THREE.TextureLoader().load(
  NASA_TEX,
  (tex) => { sphereMat.map = tex; sphereMat.needsUpdate = true; },
  undefined,
  () => { /* silently keep procedural on fail */ },
);
```

- [ ] **Step 7: Commit**

```bash
git add blocks/viz-quake-feed
git commit -m "fix: viz-quake-feed snap-to sign, accordion expand, NASA globe texture"
```

- [ ] **Step 8: Verify**

Load a page with the quake-feed block. Click a sidebar row — globe should rotate to face that location (not the opposite side). Click the active row's globe pin — sidebar should scroll and expand the detail row. Hover over globe pins — sidebar row should highlight.

---

## Task 8: Create feature-tabs block

**Files:**
- Create: `blocks/feature-tabs/feature-tabs.js`
- Create: `blocks/feature-tabs/feature-tabs.css`

**Interfaces:**
- Produces: `feature-tabs` block. Authored as a table where each row = one tab: col0=label, col1=media, col2=heading, col3=body. Modifier classes: `highlight` (default), `lock`.

- [ ] **Step 1: Write the test first**

Create `test/blocks/feature-tabs.test.js`:

```js
import { expect } from '@esm-bundle/chai';

async function decorateFeatureTabs(block) {
  const { default: decorate } = await import('../../blocks/feature-tabs/feature-tabs.js');
  await decorate(block);
}

function makeBlock(rows) {
  const block = document.createElement('div');
  block.className = 'feature-tabs';
  rows.forEach(([label, body]) => {
    const row = document.createElement('div');
    const c0 = document.createElement('div'); c0.textContent = label;
    const c1 = document.createElement('div');
    const c2 = document.createElement('div'); c2.textContent = `Heading ${label}`;
    const c3 = document.createElement('div'); c3.textContent = body;
    row.append(c0, c1, c2, c3);
    block.append(row);
  });
  return block;
}

describe('feature-tabs', () => {
  it('creates one tab button per row', async () => {
    const block = makeBlock([['Tab A', 'Content A'], ['Tab B', 'Content B']]);
    document.body.append(block);
    await decorateFeatureTabs(block);
    const tabs = block.querySelectorAll('.ft-tab');
    expect(tabs.length).to.equal(2);
    document.body.removeChild(block);
  });

  it('first tab is active on init', async () => {
    const block = makeBlock([['Tab A', 'Body A'], ['Tab B', 'Body B']]);
    document.body.append(block);
    await decorateFeatureTabs(block);
    const first = block.querySelector('.ft-tab');
    expect(first.getAttribute('aria-selected')).to.equal('true');
    document.body.removeChild(block);
  });

  it('clicking a tab activates it', async () => {
    const block = makeBlock([['Tab A', 'A'], ['Tab B', 'B']]);
    document.body.append(block);
    await decorateFeatureTabs(block);
    const tabs = block.querySelectorAll('.ft-tab');
    tabs[1].click();
    expect(tabs[1].getAttribute('aria-selected')).to.equal('true');
    expect(tabs[0].getAttribute('aria-selected')).to.equal('false');
    const panels = block.querySelectorAll('.ft-panel');
    expect(panels[1].hidden).to.be.false;
    expect(panels[0].hidden).to.be.true;
    document.body.removeChild(block);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npx wtr test/blocks/feature-tabs.test.js --node-resolve --port=2000
```

Expected: `Error: Cannot find module 'blocks/feature-tabs/feature-tabs.js'`

- [ ] **Step 3: Write feature-tabs.js**

```js
// blocks/feature-tabs/feature-tabs.js
const AUTO_MS = 5000;

const LOCK_SVG = `<svg class="ft-lock" viewBox="0 0 20 20" fill="none" aria-hidden="true">
  <rect x="3" y="9" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/>
  <path class="ft-shackle" d="M6 9V6a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

export default function decorate(block) {
  const effect = block.classList.contains('lock') ? 'lock' : 'highlight';
  const rows = [...block.children];
  if (!rows.length) return;

  const tabList = document.createElement('div');
  tabList.className = 'ft-tabs';
  tabList.setAttribute('role', 'tablist');

  const panelWrap = document.createElement('div');
  panelWrap.className = 'ft-panels';

  const tabEls = [];
  const panelEls = [];
  let current = 0;
  let timer = null;

  rows.forEach((row, i) => {
    const cols = [...row.children];
    const label = cols[0]?.textContent.trim() || `Tab ${i + 1}`;

    const btn = document.createElement('button');
    btn.className = 'ft-tab';
    btn.setAttribute('role', 'tab');
    btn.id = `ft-tab-${i}`;
    btn.setAttribute('aria-controls', `ft-panel-${i}`);
    btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    btn.tabIndex = i === 0 ? 0 : -1;

    const labelEl = document.createElement('span');
    labelEl.className = 'ft-label';
    labelEl.textContent = label;
    btn.append(labelEl);

    if (effect === 'highlight') {
      const sweep = document.createElement('span');
      sweep.className = 'ft-sweep';
      sweep.setAttribute('aria-hidden', 'true');
      btn.append(sweep);
    } else {
      btn.insertAdjacentHTML('beforeend', LOCK_SVG);
    }

    const progress = document.createElement('div');
    progress.className = 'ft-progress';
    btn.append(progress);

    const panel = document.createElement('div');
    panel.className = 'ft-panel';
    panel.setAttribute('role', 'tabpanel');
    panel.id = `ft-panel-${i}`;
    panel.setAttribute('aria-labelledby', `ft-tab-${i}`);
    panel.hidden = i !== 0;

    if (cols[1]?.firstChild) {
      const media = document.createElement('div');
      media.className = 'ft-media';
      while (cols[1].firstChild) media.append(cols[1].firstChild);
      panel.append(media);
    }

    const content = document.createElement('div');
    content.className = 'ft-content';
    if (cols[2]?.textContent.trim()) {
      const h = document.createElement('h3');
      h.textContent = cols[2].textContent.trim();
      content.append(h);
    }
    if (cols[3]?.firstChild) {
      const body = document.createElement('div');
      body.className = 'ft-body';
      while (cols[3].firstChild) body.append(cols[3].firstChild);
      content.append(body);
    }
    panel.append(content);

    tabEls.push(btn);
    panelEls.push(panel);
    tabList.append(btn);
    panelWrap.append(panel);
  });

  function activate(idx, fromAuto = false) {
    const prev = current;
    current = ((idx % tabEls.length) + tabEls.length) % tabEls.length;
    if (prev === current && tabEls[current].getAttribute('aria-selected') === 'true') return;

    tabEls[prev].setAttribute('aria-selected', 'false');
    tabEls[prev].tabIndex = -1;
    panelEls[prev].hidden = true;
    if (effect === 'lock') tabEls[prev].querySelector('.ft-shackle')?.classList.remove('locked');

    tabEls[current].setAttribute('aria-selected', 'true');
    tabEls[current].tabIndex = 0;
    panelEls[current].hidden = false;

    if (effect === 'highlight') {
      const sweep = tabEls[current].querySelector('.ft-sweep');
      if (sweep) { sweep.classList.remove('play'); void sweep.offsetWidth; sweep.classList.add('play'); }
    } else {
      setTimeout(() => tabEls[current].querySelector('.ft-shackle')?.classList.add('locked'), 80);
    }

    if (!fromAuto) resetTimer();
  }

  function resetTimer() {
    clearInterval(timer);
    timer = setInterval(() => activate(current + 1, true), AUTO_MS);
  }

  tabEls.forEach((btn, i) => {
    btn.addEventListener('click', () => activate(i));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); activate(i + 1); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); activate(i - 1); }
      if (e.key === 'Home')       { e.preventDefault(); activate(0); }
      if (e.key === 'End')        { e.preventDefault(); activate(tabEls.length - 1); }
    });
  });

  block.innerHTML = '';
  block.append(tabList, panelWrap);

  // Trigger initial lock animation
  if (effect === 'lock') {
    setTimeout(() => tabEls[0].querySelector('.ft-shackle')?.classList.add('locked'), 350);
  }

  resetTimer();
}
```

- [ ] **Step 4: Write feature-tabs.css**

```css
/* blocks/feature-tabs/feature-tabs.css */
.feature-tabs {
  --ft-purple: #3B1F5E;
  --ft-green: #1A3D2B;
  --ft-burgundy: #5C1A2A;
  --ft-text: #fff;
  --ft-active-bg: var(--ft-purple);
  --ft-radius: 8px;
  --ft-transition: 220ms ease-out;

  display: grid;
  grid-template-rows: auto 1fr;
  gap: 0;
  border-radius: var(--ft-radius);
  overflow: hidden;
  background: light-dark(#f5f5f5, #0d0d14);
}

.ft-tabs {
  display: flex;
  gap: 2px;
  padding: 6px;
  background: light-dark(#e8e8e8, #15151f);
  flex-wrap: wrap;
}

.ft-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: light-dark(#555, rgba(255 255 255 / 0.5));
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  overflow: hidden;
  transition: color var(--ft-transition), background var(--ft-transition);
}

.ft-tab[aria-selected="true"] {
  background: var(--ft-active-bg);
  color: var(--ft-text);
}

/* Highlight sweep effect */
.ft-sweep {
  position: absolute;
  inset: 0;
  background: rgba(255 255 255 / 0.15);
  transform: translateX(-100%);
  pointer-events: none;
}

.ft-sweep.play {
  animation: ft-sweep-anim 0.35s ease-out forwards;
}

@keyframes ft-sweep-anim {
  from { transform: translateX(-100%); }
  to   { transform: translateX(100%); }
}

/* Lock icon */
.ft-lock {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.ft-shackle {
  transform-origin: 50% 100%;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform: translateY(-3px);
}

.ft-shackle.locked {
  transform: translateY(0);
}

/* Progress bar */
.ft-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  background: rgba(255 255 255 / 0.4);
  width: 0;
}

.ft-tab[aria-selected="true"] .ft-progress {
  animation: ft-progress-fill 5s linear forwards;
}

@keyframes ft-progress-fill {
  from { width: 0; }
  to   { width: 100%; }
}

/* Panels */
.ft-panels { position: relative; }

.ft-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  padding: 32px;
  opacity: 0;
  transform: scale(0.97);
  transition: opacity var(--ft-transition), transform var(--ft-transition);
}

.ft-panel:not([hidden]) {
  opacity: 1;
  transform: scale(1);
  display: grid;
}

.ft-panel[hidden] { display: none; }

.ft-media img, .ft-media video { width: 100%; border-radius: 6px; }

.ft-content h3 { font-size: 1.4rem; margin-bottom: 12px; }

@media (max-width: 768px) {
  .ft-panel { grid-template-columns: 1fr; }
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npx wtr test/blocks/feature-tabs.test.js --node-resolve --port=2000
```

Expected: 3 passing tests.

- [ ] **Step 6: Commit**

```bash
git add blocks/feature-tabs test/blocks/feature-tabs.test.js
git commit -m "feat: add feature-tabs block with highlight/lock effects and auto-advance"
```

---

## Task 9: Hero color-blend enhancement

**Files:**
- Modify: `blocks/hero/hero.js`
- Modify: `blocks/hero/hero.css`

**Interfaces:**
- Produces: `hero color-blend` modifier triggers animated gradient mesh + rAF mouse parallax + canvas firework on click

- [ ] **Step 1: Write the failing test**

Create `test/blocks/hero-color-blend.test.js`:

```js
import { expect } from '@esm-bundle/chai';

describe('hero color-blend', () => {
  let hero;

  beforeEach(() => {
    hero = document.createElement('div');
    hero.className = 'hero color-blend';
    const bg = document.createElement('div');
    const fg = document.createElement('div');
    fg.innerHTML = '<div><h1>Test</h1></div>';
    hero.append(bg, fg);
    document.body.append(hero);
  });

  afterEach(() => hero.remove());

  it('adds blend-canvas element on first click', async () => {
    const { default: init } = await import('../../blocks/hero/hero.js');
    await init(hero);
    hero.dispatchEvent(new MouseEvent('click', { clientX: 100, clientY: 100, bubbles: true }));
    // Allow one rAF cycle
    await new Promise(r => setTimeout(r, 50));
    const canvas = hero.querySelector('.hero-firework-canvas');
    expect(canvas).to.not.be.null;
  });

  it('does not add canvas for non-color-blend heroes', async () => {
    hero.classList.remove('color-blend');
    const { default: init } = await import('../../blocks/hero/hero.js');
    await init(hero);
    hero.dispatchEvent(new MouseEvent('click', { clientX: 100, clientY: 100, bubbles: true }));
    await new Promise(r => setTimeout(r, 50));
    const canvas = hero.querySelector('.hero-firework-canvas');
    expect(canvas).to.be.null;
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx wtr test/blocks/hero-color-blend.test.js --node-resolve --port=2000
```

Expected: FAIL on the `color-blend` test — canvas not created.

- [ ] **Step 3: Add color-blend activation to hero.js**

At the end of the `init` function in `blocks/hero/hero.js`, before the closing `}`, add:

```js
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
    targetX = ((e.clientX - rect.left) / rect.width) * 100;
    targetY = ((e.clientY - rect.top) / rect.height) * 100;
  });

  el.addEventListener('mouseleave', () => {
    targetX = 50;
    targetY = 50;
  });

  // Firework canvas (created once, reused)
  let fCanvas = null;
  let fCtx = null;
  const BURST_COLORS = ['#FF6EB4', '#FFD23F', '#FF6B35', '#FF3A8C', '#FFEB5B'];

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
    const particles = Array.from({ length: 18 }, () => ({
      x: cx, y: cy,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8 - 3,
      alpha: 1,
      color: BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)],
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
        p.vy += 0.18; // gravity
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
```

- [ ] **Step 4: Add color-blend CSS to hero.css**

At the end of `blocks/hero/hero.css`, add:

```css
.hero.color-blend {
  --blend-x: 50%;
  --blend-y: 50%;

  .hero-background::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    background: radial-gradient(
      ellipse 80% 80% at var(--blend-x) var(--blend-y),
      #1E0A2E 0%,
      #0D2318 40%,
      #2A0A12 100%
    );
    opacity: 0.82;
    mix-blend-mode: multiply;
    transition: opacity 0.3s;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx wtr test/blocks/hero-color-blend.test.js --node-resolve --port=2000
```

Expected: 2 passing.

- [ ] **Step 6: Commit**

```bash
git add blocks/hero/hero.js blocks/hero/hero.css test/blocks/hero-color-blend.test.js
git commit -m "feat: hero color-blend — animated gradient, mouse parallax, click fireworks"
```

---

## Task 10: Stagecraft utility

**Files:**
- Create: `scripts/utils/stagecraft.js`
- Modify: `scripts/lazy.js`

**Interfaces:**
- Consumes: `.action-wrapper.scheme button` (the scheme toggle button rendered by `header.js`)
- Produces: stagecraft easter egg activated by `?stagecraft=1` + theme-button click

- [ ] **Step 1: Write the test**

Create `test/scripts/stagecraft.test.js`:

```js
import { expect } from '@esm-bundle/chai';

describe('stagecraft', () => {
  let btn;

  beforeEach(() => {
    // Simulate the scheme button
    const wrapper = document.createElement('div');
    wrapper.className = 'action-wrapper scheme';
    btn = document.createElement('button');
    wrapper.append(btn);
    document.body.append(wrapper);
  });

  afterEach(() => {
    document.querySelector('.action-wrapper.scheme')?.remove();
    document.getElementById('sc-veil')?.remove();
    document.getElementById('sc-bulb-wrap')?.remove();
  });

  it('does nothing when ?stagecraft not in URL', async () => {
    // URL has no stagecraft param — module checks at import time
    // We test the exported `interceptSchemeButton` directly
    const { interceptSchemeButton } = await import('../../scripts/utils/stagecraft.js');
    interceptSchemeButton(btn, false); // false = stagecraft not active
    btn.click();
    await new Promise(r => setTimeout(r, 50));
    expect(document.getElementById('sc-veil')).to.be.null;
  });

  it('creates veil on scheme button click when active', async () => {
    const { interceptSchemeButton } = await import('../../scripts/utils/stagecraft.js');
    interceptSchemeButton(btn, true); // true = stagecraft active
    btn.click();
    await new Promise(r => setTimeout(r, 50));
    expect(document.getElementById('sc-veil')).to.not.be.null;
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx wtr test/scripts/stagecraft.test.js --node-resolve --port=2000
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create stagecraft.js**

```js
// scripts/utils/stagecraft.js
// Stagecraft easter egg: intercepts the theme toggle when ?stagecraft=1
// Exports interceptSchemeButton(btn, active) for testability.

const DARK = '#060608';
const CHERENKOV = '#00CFFF';

// SVGs as template strings ─────────────────────────────────────────────────

const BULB_SVG = `
<svg id="sc-bulb" viewBox="0 0 60 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <ellipse cx="30" cy="38" rx="22" ry="22" fill="#fff9c0" stroke="#f0c000" stroke-width="1.5"/>
  <rect x="22" y="58" width="16" height="14" rx="3" fill="#ccc"/>
  <rect x="24" y="72" width="12" height="4" rx="2" fill="#aaa"/>
  <!-- chain links -->
  <line x1="30" y1="0" x2="30" y2="16" stroke="#aaa" stroke-width="2"/>
  <ellipse cx="30" cy="18" rx="4" ry="3" fill="none" stroke="#aaa" stroke-width="2"/>
  <ellipse cx="30" cy="24" rx="4" ry="3" fill="none" stroke="#aaa" stroke-width="2"/>
  <ellipse cx="30" cy="30" rx="4" ry="3" fill="none" stroke="#aaa" stroke-width="2"/>
</svg>`;

const FLASHLIGHT_SVG = `
<svg id="sc-flashlight" viewBox="0 0 40 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="10" y="30" width="20" height="50" rx="4" fill="#333"/>
  <ellipse cx="20" cy="30" rx="12" ry="8" fill="#555"/>
  <ellipse cx="20" cy="28" rx="10" ry="6" fill="#222"/>
  <circle cx="20" cy="26" r="6" fill="#ffe080" opacity="0.9"/>
</svg>`;

const ROBOT_SVG = `
<svg id="sc-robot" viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="10" y="20" width="40" height="35" rx="6" fill="#4a4a6a"/>
  <circle cx="22" cy="35" r="5" fill="#61DAFB"/>
  <circle cx="38" cy="35" r="5" fill="#61DAFB"/>
  <rect x="20" y="46" width="20" height="4" rx="2" fill="#61DAFB" opacity="0.6"/>
  <rect x="22" y="8" width="16" height="14" rx="4" fill="#3a3a5a"/>
  <line x1="30" y1="8" x2="30" y2="0" stroke="#61DAFB" stroke-width="2"/>
  <circle cx="30" cy="0" r="3" fill="#61DAFB"/>
  <rect x="0" y="25" width="10" height="6" rx="3" fill="#4a4a6a"/>
  <rect x="50" y="25" width="10" height="6" rx="3" fill="#4a4a6a"/>
  <rect x="15" y="55" width="10" height="20" rx="4" fill="#3a3a5a"/>
  <rect x="35" y="55" width="10" height="20" rx="4" fill="#3a3a5a"/>
</svg>`;

// ──────────────────────────────────────────────────────────────────────────

export function interceptSchemeButton(btn, active) {
  if (!active) return;

  btn.addEventListener('click', (e) => {
    e.stopImmediatePropagation();
    e.preventDefault();
    startBlackout();
  }, { capture: true });
}

function el(tag, attrs = {}, css = '') {
  const node = document.createElement(tag);
  Object.assign(node, attrs);
  if (css) node.style.cssText = css;
  return node;
}

function startBlackout() {
  if (document.getElementById('sc-veil')) return;

  const veil = el('div', { id: 'sc-veil' }, `
    position:fixed;inset:0;background:${DARK};opacity:0;
    transition:opacity 1s ease;z-index:9000;pointer-events:none;
  `);
  document.body.append(veil);
  requestAnimationFrame(() => { veil.style.opacity = '1'; });

  // Cherenkov glow on the scheme button
  const schemBtn = document.querySelector('.action-wrapper.scheme button');
  if (schemBtn) {
    schemBtn.style.cssText += `
      box-shadow: 0 0 12px 4px ${CHERENKOV}, 0 0 32px 8px ${CHERENKOV};
      animation: sc-chrnkv 1.2s ease-in-out infinite;
      position: relative; z-index: 9100;
    `;
  }

  setTimeout(() => {
    veil.style.pointerEvents = 'auto';
    dropBulb(veil);
  }, 1100);
}

function dropBulb(veil) {
  const wrap = el('div', { id: 'sc-bulb-wrap' }, `
    position:fixed;left:50%;top:-140px;transform:translateX(-50%);
    z-index:9200;cursor:pointer;text-align:center;
    transition:top 0.8s cubic-bezier(0.34,1.2,0.64,1);
  `);
  wrap.innerHTML = BULB_SVG;
  const bulbSvg = wrap.querySelector('#sc-bulb');
  if (bulbSvg) { bulbSvg.style.cssText = 'width:60px;height:100px;filter:drop-shadow(0 0 18px #ffe060);'; }
  document.body.append(wrap);
  requestAnimationFrame(() => requestAnimationFrame(() => { wrap.style.top = '60px'; }));

  wrap.addEventListener('click', () => {
    wrap.remove();
    goFullDark(veil);
  }, { once: true });
}

function goFullDark(veil) {
  // Remove cherenkov — total dark except a faint button glow
  const schemBtn = document.querySelector('.action-wrapper.scheme button');
  if (schemBtn) schemBtn.style.boxShadow = `0 0 6px 2px ${CHERENKOV}`;

  setTimeout(() => dropFlashlight(veil), 1500);
}

function dropFlashlight(veil) {
  const ftWrap = el('div', { id: 'sc-ft-wrap' }, `
    position:fixed;left:50%;top:-120px;transform:translateX(-50%);
    z-index:9200;transition:top 0.7s cubic-bezier(0.34,1.2,0.64,1);
    cursor:pointer;
  `);
  ftWrap.innerHTML = FLASHLIGHT_SVG;
  const ftSvg = ftWrap.querySelector('#sc-flashlight');
  if (ftSvg) ftSvg.style.cssText = 'width:40px;height:100px;';

  const shelf = el('div', {}, `
    position:fixed;left:calc(50% - 40px);top:calc(50% - 10px);
    width:80px;height:6px;background:#555;border-radius:3px;z-index:9150;
  `);
  document.body.append(shelf);

  document.body.append(ftWrap);
  requestAnimationFrame(() => requestAnimationFrame(() => { ftWrap.style.top = 'calc(50% - 100px)'; }));

  // Spotlight element
  const spot = el('div', { id: 'sc-spot' }, `
    position:fixed;inset:0;z-index:9050;pointer-events:none;
    background:radial-gradient(circle 180px at 50% 50%, transparent 0%, rgba(0,0,0,0.97) 100%);
  `);
  document.body.append(spot);

  ftWrap.addEventListener('click', () => {
    shelf.remove();
    pickUpFlashlight(ftWrap, spot, veil);
  }, { once: true });
}

function pickUpFlashlight(ftWrap, spot, veil) {
  ftWrap.style.transition = 'none';
  ftWrap.style.pointerEvents = 'none';

  let battery = 1.0;
  let flickering = false;
  let lastMouseMove = Date.now();
  const SHAKE_SAMPLES = [];

  function updateSpot(x, y) {
    const radius = Math.max(20, 180 * battery);
    spot.style.background = `radial-gradient(circle ${radius}px at ${x}px ${y}px, transparent 0%, rgba(0,0,0,${0.96 + (1 - battery) * 0.03}) 100%)`;
    ftWrap.style.left = `${x - 20}px`;
    ftWrap.style.top  = `${y - 80}px`;
  }

  function onMouseMove(e) {
    updateSpot(e.clientX, e.clientY);
    lastMouseMove = Date.now();
    const now = Date.now();
    SHAKE_SAMPLES.push({ x: e.clientX, y: e.clientY, t: now });
    // Keep only last 600ms
    while (SHAKE_SAMPLES.length && now - SHAKE_SAMPLES[0].t > 600) SHAKE_SAMPLES.shift();
    if (SHAKE_SAMPLES.length > 4) {
      let totalDelta = 0;
      for (let i = 1; i < SHAKE_SAMPLES.length; i++) {
        totalDelta += Math.hypot(
          SHAKE_SAMPLES[i].x - SHAKE_SAMPLES[i-1].x,
          SHAKE_SAMPLES[i].y - SHAKE_SAMPLES[i-1].y,
        );
      }
      if (totalDelta > 800 && battery < 0.5) {
        battery = 0.8;
        flickering = false;
      }
    }
  }
  window.addEventListener('mousemove', onMouseMove);

  let lastBatteryFrame = performance.now();
  function batteryLoop(ts) {
    const dt = ts - lastBatteryFrame;
    lastBatteryFrame = ts;
    battery = Math.max(0, battery - (dt / 1000) * 0.04);

    if (battery < 0.3 && !flickering) { flickering = true; }
    if (flickering) {
      const flicker = 0.85 + Math.random() * 0.15;
      spot.style.opacity = String(flicker);
    } else {
      spot.style.opacity = '1';
    }

    if (battery > 0) {
      requestAnimationFrame(batteryLoop);
    } else {
      window.removeEventListener('mousemove', onMouseMove);
      finalFlickerAndRevive(ftWrap, spot, veil, shelf);
    }
  }
  requestAnimationFrame(batteryLoop);
}

function finalFlickerAndRevive(ftWrap, spot, veil, shelf) {
  // Final flicker sequence
  let flickers = 0;
  const flickerInterval = setInterval(() => {
    spot.style.opacity = flickers % 2 === 0 ? '1' : '0';
    flickers++;
    if (flickers > 6) {
      clearInterval(flickerInterval);
      spot.style.opacity = '0';
      ftWrap?.remove();
      setTimeout(() => walkRobotAndRevive(veil), 1000);
    }
  }, 120);
}

function walkRobotAndRevive(veil) {
  const robot = el('div', { id: 'sc-robot-wrap' }, `
    position:fixed;bottom:24px;left:-80px;z-index:9300;
    transition:left 2.5s ease-in-out;
  `);
  robot.innerHTML = ROBOT_SVG;
  const rSvg = robot.querySelector('#sc-robot');
  if (rSvg) rSvg.style.cssText = 'width:60px;height:80px;';
  document.body.append(robot);

  requestAnimationFrame(() => requestAnimationFrame(() => { robot.style.left = '80vw'; }));

  // Power switch arc (just offscreen right)
  const switchEl = el('div', { id: 'sc-switch' }, `
    position:fixed;right:-30px;bottom:80px;z-index:9250;
    width:60px;height:60px;
    transition:transform 1.2s cubic-bezier(0.34,1.1,0.64,1);
    transform:rotate(-90deg);transform-origin:50% 100%;
  `);
  switchEl.innerHTML = `<svg viewBox="0 0 40 40" fill="none" style="width:60px;height:60px">
    <path d="M20 38 L20 10" stroke="#888" stroke-width="3" stroke-linecap="round"/>
    <circle cx="20" cy="10" r="5" fill="#ccc" stroke="#888" stroke-width="2"/>
  </svg>`;
  document.body.append(switchEl);

  // After robot reaches 80vw, flip the switch
  setTimeout(() => {
    switchEl.style.transform = 'rotate(0deg)';
    // Then bring the lights back
    setTimeout(() => reviveLights(veil, robot, switchEl), 1400);
  }, 2600);
}

function reviveLights(veil, robot, switchEl) {
  const spot = document.getElementById('sc-spot');
  spot?.remove();

  veil.style.transition = 'opacity 0.8s ease';
  veil.style.opacity = '0';
  setTimeout(() => { veil.remove(); robot?.remove(); switchEl?.remove(); }, 900);

  // Restore scheme button
  const schemBtn = document.querySelector('.action-wrapper.scheme button');
  if (schemBtn) schemBtn.style.cssText = schemBtn.style.cssText.replace(/box-shadow[^;]+;?/g, '').replace(/animation[^;]+;?/g, '');

  document.body.classList.add('light-scheme');
  document.body.classList.remove('dark-scheme');
  localStorage.setItem('color-scheme', 'light-scheme');
}

// ─── Entry point ──────────────────────────────────────────────────────────

export default function init() {
  const params = new URLSearchParams(window.location.search);
  const active = params.has('stagecraft');

  const findBtn = () => document.querySelector('.action-wrapper.scheme button');
  const btn = findBtn();
  if (btn) {
    interceptSchemeButton(btn, active);
  } else {
    // Header might load async — wait for it
    document.addEventListener('sidekick-ready', () => {
      const b = findBtn();
      if (b) interceptSchemeButton(b, active);
    });
    // Also try after DOMContentLoaded delay
    setTimeout(() => {
      const b = findBtn();
      if (b) interceptSchemeButton(b, active);
    }, 2000);
  }
}
```

- [ ] **Step 4: Add the Cherenkov CSS animation to styles.css (global)**

In `styles/styles.css`, add:

```css
@keyframes sc-chrnkv {
  0%, 100% { box-shadow: 0 0 12px 4px #00CFFF, 0 0 32px 8px #00CFFF; }
  50%       { box-shadow: 0 0 20px 8px #80F0FF, 0 0 60px 20px #40D0FF; }
}
```

- [ ] **Step 5: Wire into lazy.js**

In `scripts/lazy.js`, add conditional import:

```js
// Stagecraft easter egg (only loads if ?stagecraft param present)
if (new URLSearchParams(window.location.search).has('stagecraft')) {
  import('./utils/stagecraft.js').then((m) => m.default());
}
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
npx wtr test/scripts/stagecraft.test.js --node-resolve --port=2000
```

Expected: 2 passing.

- [ ] **Step 7: Commit**

```bash
git add scripts/utils/stagecraft.js scripts/lazy.js styles/styles.css test/scripts/stagecraft.test.js
git commit -m "feat: stagecraft easter egg — lightbulb, flashlight, robot, power switch"
```

---

## Task 11: Create 4 CF blocks (cf-hero, cf-cards, cf-quote, cf-stats)

**Files:**
- Create: `blocks/cf-hero/`, `blocks/cf-cards/`, `blocks/cf-quote/`, `blocks/cf-stats/`

**Interfaces:**
- Consumes: one authored cell containing a persisted query URL: `https://{aem-host}/graphql/execute.json/{config}/{query-name}` OR a direct CF path `/content/dam/...` (block constructs a minimal GraphQL query)
- Produces: rendered CF content; falls back to error state if fetch fails

- [ ] **Step 1: Create shared CF fetch utility**

Create `scripts/utils/cf-fetch.js`:

```js
// scripts/utils/cf-fetch.js
// Fetches AEM CF data from a persisted query URL or a raw CF path.

const AEM_HOST = 'https://author-p138879-e1741192.adobeaemcloud.com';

export async function fetchCF(urlOrPath) {
  let url = urlOrPath.trim();
  // If it's a CF path (/content/dam/...), build a minimal persisted query URL
  if (url.startsWith('/content/dam/')) {
    url = `${AEM_HOST}/graphql/execute.json/wknd-shared/adventure-by-path?adventurePath=${encodeURIComponent(url)}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CF fetch failed: ${res.status} ${url}`);
  const json = await res.json();
  return extractCFData(json);
}

function extractCFData(json) {
  const data = json?.data;
  if (!data) throw new Error('No data field in CF response');
  // Iterate top-level keys for the first item or items array
  for (const val of Object.values(data)) {
    if (val?.item) return val.item;
    if (Array.isArray(val?.items)) return val.items;
    if (Array.isArray(val)) return val;
  }
  throw new Error('Could not extract CF item(s) from response');
}
```

- [ ] **Step 2: Write cf-hero.js**

```js
// blocks/cf-hero/cf-hero.js
import { fetchCF } from '../../scripts/utils/cf-fetch.js';

export default async function decorate(block) {
  const link = block.querySelector('a[href]');
  const url = link?.href || block.textContent.trim();
  if (!url) return;

  block.innerHTML = '<div class="cf-hero-loading" aria-busy="true"></div>';

  try {
    const item = await fetchCF(url);
    const title    = item.title || item.adventureTitle || '';
    const desc     = item.description?.html || item.body?.html || item.shortDescription?.html || '';
    const imgRef   = item.primaryImage?._path || item.heroImage?._path || '';
    const imgSrc   = imgRef ? `${new URL(url).origin}${imgRef}` : '';

    block.innerHTML = '';
    if (imgSrc) {
      const img = document.createElement('img');
      img.src = imgSrc; img.alt = title; img.loading = 'lazy';
      img.className = 'cf-hero-img';
      block.append(img);
    }
    const content = document.createElement('div');
    content.className = 'cf-hero-content';
    if (title) { const h2 = document.createElement('h2'); h2.textContent = title; content.append(h2); }
    if (desc)  { const div = document.createElement('div'); div.innerHTML = desc; content.append(div); }
    block.append(content);
  } catch (err) {
    block.innerHTML = `<p class="cf-error">Could not load content: ${err.message}</p>`;
  }
}
```

- [ ] **Step 3: Write cf-cards.js**

```js
// blocks/cf-cards/cf-cards.js
import { fetchCF } from '../../scripts/utils/cf-fetch.js';

export default async function decorate(block) {
  const link = block.querySelector('a[href]');
  const url = link?.href || block.textContent.trim();
  if (!url) return;

  block.innerHTML = '<div class="cf-cards-loading" aria-busy="true"></div>';

  try {
    const items = await fetchCF(url);
    const arr = Array.isArray(items) ? items : [items];
    block.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'cf-cards-grid';
    arr.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'cf-card';
      const title = item.title || item.adventureTitle || '';
      const desc  = item.description?.plaintext || item.shortDescription?.plaintext || '';
      const imgRef = item.primaryImage?._path || item.heroImage?._path || '';
      const imgSrc = imgRef ? `${new URL(url).origin}${imgRef}` : '';
      if (imgSrc) { const img = document.createElement('img'); img.src = imgSrc; img.alt = title; img.loading = 'lazy'; card.append(img); }
      if (title) { const h3 = document.createElement('h3'); h3.textContent = title; card.append(h3); }
      if (desc)  { const p = document.createElement('p'); p.textContent = desc; card.append(p); }
      grid.append(card);
    });
    block.append(grid);
  } catch (err) {
    block.innerHTML = `<p class="cf-error">Could not load cards: ${err.message}</p>`;
  }
}
```

- [ ] **Step 4: Write cf-quote.js and cf-stats.js**

```js
// blocks/cf-quote/cf-quote.js
import { fetchCF } from '../../scripts/utils/cf-fetch.js';

export default async function decorate(block) {
  const link = block.querySelector('a[href]');
  const url = link?.href || block.textContent.trim();
  if (!url) return;
  block.innerHTML = '';
  try {
    const item = await fetchCF(url);
    const quote  = item.quote || item.body?.plaintext || '';
    const author = item.author || item.authorName || '';
    const role   = item.role || item.authorTitle || '';
    block.innerHTML = `
      <blockquote class="cf-quote-text">${quote}</blockquote>
      <footer class="cf-quote-meta">
        ${author ? `<strong>${author}</strong>` : ''}
        ${role   ? `<span>${role}</span>` : ''}
      </footer>`;
  } catch (err) {
    block.innerHTML = `<p class="cf-error">${err.message}</p>`;
  }
}
```

```js
// blocks/cf-stats/cf-stats.js
import { fetchCF } from '../../scripts/utils/cf-fetch.js';

export default async function decorate(block) {
  const link = block.querySelector('a[href]');
  const url = link?.href || block.textContent.trim();
  if (!url) return;
  block.innerHTML = '';
  try {
    const items = await fetchCF(url);
    const arr = Array.isArray(items) ? items : [items];
    const row = document.createElement('div');
    row.className = 'cf-stats-row';
    arr.forEach((item) => {
      const stat = document.createElement('div');
      stat.className = 'cf-stat';
      stat.innerHTML = `
        <span class="cf-stat-value">${item.value || ''}</span>
        <span class="cf-stat-label">${item.label || item.title || ''}</span>`;
      row.append(stat);
    });
    block.append(row);
  } catch (err) {
    block.innerHTML = `<p class="cf-error">${err.message}</p>`;
  }
}
```

- [ ] **Step 5: Create minimal CSS for each block**

`blocks/cf-hero/cf-hero.css`:
```css
.cf-hero { position: relative; overflow: hidden; border-radius: 8px; }
.cf-hero-img { width: 100%; max-height: 420px; object-fit: cover; }
.cf-hero-content { padding: 24px; }
.cf-hero-content h2 { font-size: 1.8rem; margin-bottom: 12px; }
.cf-error { color: var(--color-red, #c0392b); padding: 12px; }
```

`blocks/cf-cards/cf-cards.css`:
```css
.cf-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }
.cf-card { border-radius: 8px; overflow: hidden; background: light-dark(#fff, #1a1a2e); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.cf-card img { width: 100%; height: 180px; object-fit: cover; }
.cf-card h3, .cf-card p { padding: 12px 16px; margin: 0; }
```

`blocks/cf-quote/cf-quote.css`:
```css
.cf-quote-text { font-size: 1.4rem; font-style: italic; border-left: 4px solid var(--link-color); padding-left: 20px; margin: 0 0 12px; }
.cf-quote-meta { display: flex; gap: 8px; font-size: 0.9rem; color: var(--text-color-muted, #666); }
```

`blocks/cf-stats/cf-stats.css`:
```css
.cf-stats-row { display: flex; gap: 32px; flex-wrap: wrap; }
.cf-stat { text-align: center; }
.cf-stat-value { display: block; font-size: 2.5rem; font-weight: 700; }
.cf-stat-label { font-size: 0.85rem; color: var(--text-color-muted, #666); text-transform: uppercase; letter-spacing: 0.08em; }
```

- [ ] **Step 6: Commit**

```bash
git add blocks/cf-hero blocks/cf-cards blocks/cf-quote blocks/cf-stats scripts/utils/cf-fetch.js
git commit -m "feat: add CF blocks (cf-hero, cf-cards, cf-quote, cf-stats) with modern persisted query pattern"
```

---

## Task 12: Copy SPA tools + update config

**Files:**
- Create: `tools/ue-spa-demo/` (all files)

**Interfaces:**
- Produces: SPA HTML files accessible at `/tools/ue-spa-demo/*.html`, pulling CFs from AEM

- [ ] **Step 1: Copy the ue-spa-demo directory**

```bash
cp -r ~/dev/eds/diagram-editor/tools/ue-spa-demo tools/ue-spa-demo
```

- [ ] **Step 2: Update AEM host in config.js if needed**

Check `tools/ue-spa-demo/config.js`. The `aemHost` value should be `https://author-p138879-e1741192.adobeaemcloud.com`. If it differs, update it.

- [ ] **Step 3: Update GraphQL queries to persisted pattern**

In `tools/ue-spa-demo/react-enterprise.html` and `tools/ue-spa-demo/cf-spa.html`, find any hardcoded GraphQL `POST` calls with inline query strings. Replace with persisted query `GET` calls. Pattern:

```js
// OLD pattern (inline query body):
const res = await fetch(`${AEM_HOST}/graphql/query.json`, {
  method: 'POST', body: JSON.stringify({ query: '{ contentFragmentByPath(...) { ... } }' })
});

// NEW pattern (persisted query):
const res = await fetch(`${AEM_HOST}/graphql/execute.json/wknd-shared/adventures-all`);
```

Only change files that use inline queries; leave files that already use persisted queries as-is.

- [ ] **Step 4: Commit**

```bash
git add tools/ue-spa-demo
git commit -m "feat: add SPA tools with persisted CF query pattern"
```

---

## Task 13: Update blocks.json in DA + publish

**Files:**
- Update via MCP: `docs/library/blocks.json`

**Interfaces:**
- Produces: all 18 new blocks visible in the Block Library sidekick panel

- [ ] **Step 1: Fetch current blocks.json**

Use `da_get_source` (org: pstolmar, repo: demo, path: docs/library/blocks.json). Note the current 6 entries.

- [ ] **Step 2: Update via da_update_source**

Replace the data sheet with all 24 entries (6 existing + 18 new). The JSON structure must preserve the multi-sheet format with `data`, `options`, and `:names` keys. Update the `data` array:

```json
{
  "data": [
    { "name": "Hero", "path": "https://content.da.live/pstolmar/demo/docs/library/blocks/hero" },
    { "name": "Card", "path": "https://content.da.live/pstolmar/demo/docs/library/blocks/card" },
    { "name": "Section Metadata", "path": "https://content.da.live/pstolmar/demo/docs/library/blocks/section-metadata" },
    { "name": "Columns", "path": "https://content.da.live/pstolmar/demo/docs/library/blocks/columns" },
    { "name": "Metadata", "path": "https://content.da.live/pstolmar/demo/docs/library/blocks/metadata" },
    { "name": "Table", "path": "https://content.da.live/pstolmar/demo/docs/library/blocks/table" },
    { "name": "Feature Tabs", "path": "https://content.da.live/pstolmar/demo/docs/library/blocks/feature-tabs" },
    { "name": "Callout Panel", "path": "https://content.da.live/pstolmar/demo/docs/library/blocks/callout-panel" },
    { "name": "Metrics Grid", "path": "https://content.da.live/pstolmar/demo/docs/library/blocks/metrics-grid" },
    { "name": "Popin Carousel", "path": "https://content.da.live/pstolmar/demo/docs/library/blocks/popin-carousel" },
    { "name": "Scroll Narrative", "path": "https://content.da.live/pstolmar/demo/docs/library/blocks/scroll-narrative" },
    { "name": "Testimonials Mosaic", "path": "https://content.da.live/pstolmar/demo/docs/library/blocks/testimonials-mosaic" },
    { "name": "Corkboard", "path": "https://content.da.live/pstolmar/demo/docs/library/blocks/corkboard" },
    { "name": "Wave Terrain", "path": "https://content.da.live/pstolmar/demo/docs/library/blocks/wave-terrain" },
    { "name": "Miser 3D Scatter", "path": "https://content.da.live/pstolmar/demo/docs/library/blocks/miser-3d-scatter" },
    { "name": "Miser 3D Bars", "path": "https://content.da.live/pstolmar/demo/docs/library/blocks/miser-3d-bars" },
    { "name": "Miser ThreeJS Scene", "path": "https://content.da.live/pstolmar/demo/docs/library/blocks/miser-threejs-scene" },
    { "name": "Quake Feed Globe", "path": "https://content.da.live/pstolmar/demo/docs/library/blocks/viz-quake-feed" },
    { "name": "Crossfade", "path": "https://content.da.live/pstolmar/demo/docs/library/blocks/crossfade" },
    { "name": "Pull Quote", "path": "https://content.da.live/pstolmar/demo/docs/library/blocks/pull-quote" },
    { "name": "Accordion", "path": "https://content.da.live/pstolmar/demo/docs/library/blocks/accordion" },
    { "name": "Carousel", "path": "https://content.da.live/pstolmar/demo/docs/library/blocks/carousel" },
    { "name": "Embed", "path": "https://content.da.live/pstolmar/demo/docs/library/blocks/embed" },
    { "name": "Stats", "path": "https://content.da.live/pstolmar/demo/docs/library/blocks/stats" }
  ]
}
```

- [ ] **Step 3: Publish via admin API**

```bash
curl -X POST "https://admin.hlx.page/live/pstolmar/demo/main/docs/library/blocks.json" \
  -H "Authorization: token $(cat ~/.hlx-token 2>/dev/null || echo YOUR_TOKEN)"
```

If the curl fails due to auth, publish manually via the Sidekick "Publish" action in the DA editor.

---

## Task 14: Create locale stubs in DA

**Files (all via MCP):**
- Create: `de/index.html`, `de/fragments/nav/header.html`
- Create: `fr/index.html`, `es/index.html`, `ja/index.html`, `zh/index.html`, `hi/index.html`

**Interfaces:**
- Produces: `/de/`, `/fr/`, `/es/`, `/ja/`, `/zh/`, `/hi/` all return a valid EDS page instead of 404

- [ ] **Step 1: Create de/index.html**

Use `da_create_source` (org: pstolmar, repo: demo, path: de/index.html) with body:

```html
<body>
  <header></header>
  <main>
    <div>
      <div class="hero center color-blend">
        <div>
          <div></div>
        </div>
        <div>
          <div>
            <h1>AEM Edge Delivery Services</h1>
            <p>Leistungsstark. Schnell. Weltweit.</p>
            <p><a href="/de/demo"><em><strong>Demo ansehen</strong></em></a></p>
          </div>
        </div>
      </div>
    </div>
    <div>
      <h2>Globale Erfahrungen, überall</h2>
      <p>Adobe Experience Manager Edge Delivery Services bringt Ihre Inhalte blitzschnell zu Millionen von Nutzern weltweit — mit 99er Lighthouse-Scores und vollständiger Mehrsprachigkeit.</p>
    </div>
    <div>
      <div class="metadata">
        <div><div><p>title</p></div><div><p>AEM Edge Delivery — Deutsch</p></div></div>
        <div><div><p>description</p></div><div><p>AEM EDS Demo auf Deutsch</p></div></div>
        <div><div><p>locale</p></div><div><p>/de</p></div></div>
      </div>
    </div>
  </main>
  <footer></footer>
</body>
```

- [ ] **Step 2: Create fr/index.html**

Use `da_create_source` (path: fr/index.html):

```html
<body>
  <header></header>
  <main>
    <div>
      <div class="hero center color-blend">
        <div><div></div></div>
        <div><div>
          <h1>AEM Edge Delivery Services</h1>
          <p>Puissant. Rapide. Mondial.</p>
          <p><a href="/fr/demo"><em><strong>Voir la démo</strong></em></a></p>
        </div></div>
      </div>
    </div>
    <div>
      <h2>Des expériences mondiales, partout</h2>
      <p>Adobe Experience Manager Edge Delivery Services apporte votre contenu à des millions d'utilisateurs — avec des scores Lighthouse de 99 et une localisation complète.</p>
    </div>
    <div>
      <div class="metadata">
        <div><div><p>title</p></div><div><p>AEM Edge Delivery — Français</p></div></div>
        <div><div><p>locale</p></div><div><p>/fr</p></div></div>
      </div>
    </div>
  </main>
  <footer></footer>
</body>
```

- [ ] **Step 3: Create es, ja, zh, hi index pages**

Repeat `da_create_source` for each locale. Minimal content — just a hero with H1 in the target language:

`es/index.html` — H1: "AEM Edge Delivery Services", P: "Potente. Rápido. Global."
`ja/index.html` — H1: "AEM エッジデリバリーサービス", P: "パワフル。高速。グローバル。"
`zh/index.html` — H1: "AEM 边缘交付服务", P: "强大、快速、全球化。"
`hi/index.html` — H1: "AEM एज डिलीवरी सेवाएं", P: "शक्तिशाली। तेज़। वैश्विक।"

Each needs the matching `locale` metadata entry (`/es`, `/ja`, `/zh`, `/hi`).

- [ ] **Step 4: Publish all locale pages**

For each locale, POST to the preview and live endpoints:
```
POST https://admin.hlx.page/preview/pstolmar/demo/eds/de/
POST https://admin.hlx.page/live/pstolmar/demo/eds/de/
```
Repeat for fr, es, ja, zh, hi.

- [ ] **Step 5: Verify**

Visit `https://eds--demo--pstolmar.aem.page/de/` — should show the German page. Visit `https://eds--demo--pstolmar.aem.page/xx/` (invalid) — should now show the 404 page (Task 1 fix) rather than a blank response.

---

## Task 15: Create grand demo pages in DA

**Files (all via MCP):**
- Create: `demo/index.html`
- Create: `demo/financial.html`
- Create: `demo/global.html`

**Interfaces:**
- Produces: 3 richly blocked pages exercising the new block set across industries

- [ ] **Step 1: Create demo/index.html (grand demo)**

Use `da_create_source` (path: demo/index.html):

```html
<body>
  <header></header>
  <main>

    <!-- Hero section with color blend -->
    <div>
      <div class="hero center color-blend full">
        <div><div>
          <p><a href="https://eds--demo--pstolmar.aem.live/tools/ue-spa-demo/r3f.html">
            <picture><img src="https://main--demo--pstolmar.aem.live/media/media_globe_placeholder.jpg" alt="Interactive Globe"></picture>
          </a></p>
        </div></div>
        <div><div>
          <p>Edge Delivery Services</p>
          <h1>The Platform Demo</h1>
          <p>Lighthouse 99 · 6 languages · 1,000 locations · Personalized</p>
          <p><a href="#blocks"><em><strong>Explore</strong></em></a> <a href="/de/demo">Auf Deutsch</a></p>
        </div></div>
      </div>
    </div>

    <!-- Feature tabs — 4 industries -->
    <div>
      <div class="section-metadata"><div><div><p>style</p></div><div><p>container</p></div></div><div><div><p>spacing</p></div><div><p>xxl</p></div></div></div>
    </div>
    <div id="blocks">
      <h2>Industries</h2>
      <p>One platform. Every sector.</p>
      <div class="feature-tabs lock">
        <div><div>Financial Services</div><div></div><div>Banking on Speed</div><div><p>Deliver compliant, personalised banking portals at 99 Lighthouse. Serve 10M customers with zero cold starts.</p></div></div>
        <div><div>Healthcare</div><div></div><div>Care Without Latency</div><div><p>Patient portals, formularies, and health plan content — HIPAA-aware, globally distributed, authored in minutes.</p></div></div>
        <div><div>Retail</div><div></div><div>Commerce at the Edge</div><div><p>Flash sales, seasonal campaigns, and product launches scheduled and personalised without a deploy.</p></div></div>
        <div><div>Manufacturing</div><div></div><div>Industrial Precision</div><div><p>Technical documentation, dealer portals, and supply-chain dashboards — structured content from AEM CFs.</p></div></div>
      </div>
      <div class="section-metadata"><div><div><p>style</p></div><div><p>container</p></div></div></div>
    </div>

    <!-- Crossfade narrative -->
    <div>
      <h2>The Platform Story</h2>
      <div class="crossfade">
        <div>
          <div><picture><img src="https://main--author-kit--aemsites.aem.live/media_1674c029fe1c222fe6f72c3bf0ad7fdf41e16eca9.jpg" alt="Speed"></picture></div>
          <div><h3>Author in minutes, live in seconds</h3><p>Document-based authoring with DA Live means your content team doesn't need a developer to publish. Every edit previews at 100% fidelity.</p></div>
        </div>
        <div>
          <div><picture><img src="https://main--author-kit--aemsites.aem.live/media_1a22b50c2d1a3e61cb6b1f4a1ce284a7475caa8bb.jpg" alt="Scale"></picture></div>
          <div><h3>Scale without infrastructure</h3><p>Serverless CDN delivery means your traffic spike during a product launch or flash sale is handled automatically — no capacity planning required.</p></div>
        </div>
        <div>
          <div><picture><img src="https://main--author-kit--aemsites.aem.live/media_1896e26305d79be855074187be5fb49665a5190d1.jpg" alt="Personalize"></picture></div>
          <div><h3>Personalise at every touchpoint</h3><p>Combine EDS scheduling with AEM Target or Optimizely experiments. Serve the right promo, hero, and CTA to every visitor — still at 99 Lighthouse.</p></div>
        </div>
      </div>
    </div>

    <!-- Metrics -->
    <div>
      <div class="metrics-grid">
        <div><div><p>99</p></div><div><p>Lighthouse Score</p></div></div>
        <div><div><p>0ms</p></div><div><p>Cold Start</p></div></div>
        <div><div><p>6</p></div><div><p>Languages Live</p></div></div>
        <div><div><p>1,000</p></div><div><p>CF Locations</p></div></div>
      </div>
      <div class="section-metadata"><div><div><p>style</p></div><div><p>container, dark-scheme</p></div></div><div><div><p>spacing</p></div><div><p>xxl</p></div></div></div>
    </div>

    <!-- Callout panels -->
    <div>
      <div class="callout-panel">
        <div><div><p>Personalisation</p></div><div><p>Schedule promos, swap heroes, serve experiments — all without a deploy. Author-Kit's scheduling engine ties DA Live content to Target audiences.</p></div></div>
      </div>
      <div class="callout-panel">
        <div><div><p>Experimentation</p></div><div><p>A/B and multivariate tests wired directly to page sections. Full-fidelity preview before any variant goes live.</p></div></div>
      </div>
      <div class="callout-panel">
        <div><div><p>Analytics</p></div><div><p>RUM built in. Bring your own logging to Splunk, Coralogix, or Datadog via the BYO logging hook in ak.js.</p></div></div>
      </div>
      <div class="section-metadata"><div><div><p>style</p></div><div><p>container</p></div></div><div><div><p>grid</p></div><div><p>3</p></div></div></div>
    </div>

    <!-- Testimonials -->
    <div>
      <h2>What our customers say</h2>
      <div class="testimonials-mosaic">
        <div><div><p>"AEM EDS cut our publish cycle from 2 days to 20 minutes. Our marketing team hasn't filed a dev ticket since launch."</p></div><div><p>Sarah Kim · VP Digital, Pacific National Bank</p></div></div>
        <div><div><p>"We run 6 regional health portals off one codebase. Lighthouse never dips below 97 — compliance loves it."</p></div><div><p>Dr. Marco Reyes · CTO, MediLink Health</p></div></div>
        <div><div><p>"Flash sale day used to mean 3am pages. Now our CDN handles the spike automatically."</p></div><div><p>Priya Nair · Engineering Director, Lattice Commerce</p></div></div>
        <div><div><p>"Technical docs for 80,000 parts — all structured CFs, all findable, all at 99 Lighthouse."</p></div><div><p>Udo Brenner · Head of Digital, Torque Industries</p></div></div>
      </div>
    </div>

    <!-- SPA embed -->
    <div>
      <h2>Content Fragments · Live</h2>
      <p>This React enterprise SPA pulls CFs directly from AEM via GraphQL.</p>
      <div class="embed">
        <div><div><p><a href="/tools/ue-spa-demo/react-enterprise.html">https://eds--demo--pstolmar.aem.live/tools/ue-spa-demo/react-enterprise.html</a></p></div></div>
      </div>
    </div>

    <!-- Scheduled promo -->
    <div>
      <p><a href="https://main--demo--pstolmar.aem.live/schedules/main-promo.json">https://main--demo--pstolmar.aem.live/schedules/main-promo.json</a></p>
    </div>

    <div>
      <div class="metadata">
        <div><div><p>title</p></div><div><p>EDS Platform Demo</p></div></div>
        <div><div><p>description</p></div><div><p>The grand AEM Edge Delivery Services demonstration — blocks, SPAs, scheduling, 6 languages, CF-powered content.</p></div></div>
      </div>
    </div>

  </main>
  <footer></footer>
</body>
```

- [ ] **Step 2: Create demo/financial.html**

Use `da_create_source` (path: demo/financial.html):

```html
<body>
  <header></header>
  <main>
    <div>
      <div class="hero center color-blend">
        <div><div></div></div>
        <div><div>
          <p>Financial Services</p>
          <h1>Banking on Edge Delivery</h1>
          <p>Compliant. Personalised. 99 Lighthouse.</p>
        </div></div>
      </div>
    </div>
    <div>
      <div class="feature-tabs lock">
        <div><div>Retail Banking</div><div></div><div>Customer-First Digital Banking</div><div><p>Personalised rate cards, branch finders, and product recommendation engines — authored in DA Live, served globally without infrastructure overhead.</p></div></div>
        <div><div>Wealth Management</div><div></div><div>Portfolio Experience at Scale</div><div><p>High-net-worth portals with real-time market data embeds, structured CF-powered insights, and personalised advisor matching.</p></div></div>
        <div><div>Insurance</div><div></div><div>Claims & Quotes, Instantly</div><div><p>Multi-step quote flows built as lightweight SPAs embedded in EDS pages. Zero cold-start, compliant data handling.</p></div></div>
        <div><div>Compliance</div><div></div><div>Audit-Ready Content</div><div><p>Every content change versioned and auditable via DA Live. Regulatory disclosures scheduled with millisecond precision.</p></div></div>
      </div>
      <div class="section-metadata"><div><div><p>style</p></div><div><p>container</p></div></div></div>
    </div>
    <div>
      <div class="scroll-narrative">
        <div>
          <div><picture><img src="https://main--author-kit--aemsites.aem.live/media_1603e8a5fbbf063145148ad76dc2eecade1abb5d7.jpg" alt="Secure"></picture></div>
          <div><h3>Security built in, not bolted on</h3><p>Content served over edge nodes with TLS 1.3, CSP headers generated from block inventory, and no server-side execution surface.</p></div>
        </div>
        <div>
          <div><picture><img src="https://main--author-kit--aemsites.aem.live/media_164c78460645750ef2645ce84d681b8ea84957a97.jpg" alt="Speed"></picture></div>
          <div><h3>Sub-100ms global load times</h3><p>Regional edge nodes serve cached content from the nearest PoP. Your Singapore customer gets the same LCP as your London branch.</p></div>
        </div>
      </div>
    </div>
    <div>
      <div class="metrics-grid">
        <div><div><p>99</p></div><div><p>Lighthouse</p></div></div>
        <div><div><p>&lt;100ms</p></div><div><p>Global P95 LCP</p></div></div>
        <div><div><p>100%</p></div><div><p>Audit Trail</p></div></div>
        <div><div><p>0</p></div><div><p>Server Attack Surface</p></div></div>
      </div>
      <div class="section-metadata"><div><div><p>style</p></div><div><p>container, dark-scheme</p></div></div></div>
    </div>
    <div>
      <div class="pull-quote">
        <div><div><p>"From compliance review to live publish: 4 minutes flat. That used to be a 3-day CAB process."</p></div><div><p>James Okonkwo · Head of Digital Channels, Meridian Bank</p></div></div>
      </div>
    </div>
    <div>
      <div class="metadata">
        <div><div><p>title</p></div><div><p>Financial Services — EDS Demo</p></div></div>
      </div>
    </div>
  </main>
  <footer></footer>
</body>
```

- [ ] **Step 3: Create demo/global.html**

Use `da_create_source` (path: demo/global.html):

```html
<body>
  <header></header>
  <main>
    <div>
      <div class="hero center color-blend">
        <div><div></div></div>
        <div><div>
          <p>Global Reach</p>
          <h1>One Platform, Six Languages</h1>
          <p>The same 99 Lighthouse score, from Tokyo to São Paulo.</p>
        </div></div>
      </div>
    </div>
    <div>
      <h2>Live Language Switcher</h2>
      <p>This demo runs in 6 languages. Pick yours:</p>
      <div class="columns">
        <div>
          <div><p><a href="/de/">🇩🇪 Deutsch</a></p></div>
          <div><p><a href="/fr/">🇫🇷 Français</a></p></div>
          <div><p><a href="/es/">🇪🇸 Español</a></p></div>
        </div>
        <div>
          <div><p><a href="/ja/">🇯🇵 日本語</a></p></div>
          <div><p><a href="/zh/">🇨🇳 中文</a></p></div>
          <div><p><a href="/hi/">🇮🇳 हिन्दी</a></p></div>
        </div>
      </div>
      <div class="section-metadata"><div><div><p>style</p></div><div><p>container</p></div></div></div>
    </div>
    <div>
      <h2>Global Events Monitor</h2>
      <p>Real-time seismic data rendered on a 3D globe — click any pin to snap the globe to that location.</p>
      <div class="viz-quake-feed">
        <div><div><p>height</p></div><div><p>600</p></div></div>
      </div>
    </div>
    <div>
      <div class="stats">
        <div><div><p>6</p></div><div><p>Languages</p></div></div>
        <div><div><p>200+</p></div><div><p>Edge Nodes</p></div></div>
        <div><div><p>&lt;50ms</p></div><div><p>P95 TTFB</p></div></div>
        <div><div><p>99</p></div><div><p>Lighthouse</p></div></div>
      </div>
      <div class="section-metadata"><div><div><p>style</p></div><div><p>container, dark-scheme</p></div></div></div>
    </div>
    <div>
      <div class="metadata">
        <div><div><p>title</p></div><div><p>Global Demo — EDS</p></div></div>
      </div>
    </div>
  </main>
  <footer></footer>
</body>
```

- [ ] **Step 4: Publish all 3 demo pages**

```bash
for PAGE in demo/index demo/financial demo/global; do
  curl -X POST "https://admin.hlx.page/preview/pstolmar/demo/eds/${PAGE}" -H "Authorization: token YOUR_TOKEN"
  curl -X POST "https://admin.hlx.page/live/pstolmar/demo/eds/${PAGE}" -H "Authorization: token YOUR_TOKEN"
done
```

- [ ] **Step 5: Final end-to-end verification**

Visit each URL and confirm:
- `https://eds--demo--pstolmar.aem.live/demo` — grand demo page loads, hero gradient moves with mouse, feature-tabs animate, schedule promo renders as a fragment (not a raw JSON link)
- `https://eds--demo--pstolmar.aem.live/demo/financial` — financial page with lock-effect tabs
- `https://eds--demo--pstolmar.aem.live/demo/global` — quake globe, click a sidebar row, globe snaps to the correct location (not the opposite side)
- `https://eds--demo--pstolmar.aem.live/de/` — German page, no 404
- `https://eds--demo--pstolmar.aem.live/nonexistent` — proper styled 404 page
- `https://eds--demo--pstolmar.aem.live/demo?stagecraft=1` — click the theme toggle, blackout and bulb drop in

- [ ] **Step 6: Final commit**

```bash
git status
git add -A
git commit -m "feat: complete grand demo build — blocks, SPAs, locales, demo pages"
```

---

## Self-Review Checklist

- [x] **Spec A1 (404 fix)** → Task 1 ✓
- [x] **Spec A2 (schedule fragments)** → Task 1 ✓
- [x] **Spec A3 (sidekick config)** → Task 2 ✓
- [x] **Spec A4 (/de/ locale)** → Tasks 14+15 ✓
- [x] **Spec B blocks (7 content, 3 3D, 6 agents, cfrenderer)** → Tasks 3-6 ✓
- [x] **Spec B1 (feature-tabs highlight/lock)** → Task 8 ✓
- [x] **Spec B2 (quake-feed snap fix + accordion + NASA texture)** → Task 7 ✓
- [x] **Spec B3 (blocks.json update)** → Task 13 ✓
- [x] **Spec C1 (SPA files)** → Task 12 ✓
- [x] **Spec C2 (CF blocks + modern pattern)** → Task 11 ✓
- [x] **Spec D (hero color-blend)** → Task 9 ✓
- [x] **Spec E (stagecraft)** → Task 10 ✓
- [x] **Spec F1/F2/F3 (demo pages)** → Task 15 ✓
- [x] **Spec G (locale stubs)** → Task 14 ✓
- [x] **loadScript import** → `scripts/utils/script.js` default export, confirmed exists ✓
- [x] **moveInstrumentation** → checked in Tasks 3-5, stripped ✓
- [x] **spinToQuake sign** → `theta - Math.PI/2` in Task 7 Step 2 ✓
- [x] **cf-fetch.js** → imported by all 4 CF blocks in Task 11 ✓
- [x] **stagecraft scheme button selector** → `.action-wrapper.scheme button` confirmed in header.js ✓

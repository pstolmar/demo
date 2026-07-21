/**
 * viz-quake-feed — Live USGS earthquake globe
 *
 * Fetches real USGS GeoJSON every 60s. Add ?demo or ?demo=usgs to the page URL
 * to use the fallback dataset with a cinematic "surprise quake" intro.
 *
 * Features:
 *  - Drag to rotate globe
 *  - Click globe marker → spin globe + highlight sidebar + floating tooltip
 *  - Click sidebar entry → spin globe to marker + floating tooltip
 *  - Tooltip tracks marker in 3D space during spin animation
 *  - Demo mode: 5s after load a surprise M8.2 quake appears, globe spins to it
 *  - Live mode: auto-cycles top→bottom of list, loops, picks up new quakes
 *  - Hover over globe or sidebar pauses the auto-cycle
 *  - Pause/resume button in panel header
 *  - Ripples only for the focused quake (mag ≥ 3)
 *  - Shows "● Live USGS" or "◈ Demo" in panel header
 */

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.min.js';
const USGS_API = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
const GLOBE_RADIUS = 1;
const POLL_INTERVAL = 60000;
const RIPPLE_DURATION = 3000;
const RIPPLE_COUNT = 3;
const CYCLE_DELAY_MS = 5000;
const CYCLE_PAUSE_MS = 4000;
const RIPPLE_MIN_MAG = 3;

// ─── Magnitude helpers ───────────────────────────────────────────────────
function getMagnitudeColor(mag) {
  if (mag < 2) return 0x808080;
  if (mag < 4) return 0x22c55e;
  if (mag < 6) return 0xf59e0b;
  return 0xef4444;
}
function getMagnitudeScale(mag) {
  return Math.max(0.025, Math.min(0.18, (mag - 1) * 0.025));
}

// ─── Three.js loader (deduped) ───────────────────────────────────────────
let threeReady = null;
function loadThreeJS() {
  if (!threeReady) {
    threeReady = new Promise((resolve, reject) => {
      if (window.THREE) { resolve(window.THREE); return; }
      const script = document.createElement('script');
      script.src = THREE_URL;
      script.onload = () => (window.THREE ? resolve(window.THREE) : reject(new Error('THREE not found')));
      script.onerror = reject;
      document.head.append(script);
    });
  }
  return threeReady;
}

// ─── Terrain texture (procedural) ───────────────────────────────────────
function hash2(x, y) {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return v - Math.floor(v);
}
function smooth(x, y) {
  const ix = Math.floor(x); const iy = Math.floor(y);
  const fx = x - ix; const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  return hash2(ix, iy) * (1 - u) * (1 - v)
    + hash2(ix + 1, iy) * u * (1 - v)
    + hash2(ix, iy + 1) * (1 - u) * v
    + hash2(ix + 1, iy + 1) * u * v;
}
function fbm(x, y) {
  let val = 0; let amp = 0.5; let freq = 1;
  for (let i = 0; i < 5; i += 1) {
    val += smooth(x * freq, y * freq) * amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return val / 0.96875;
}
function createTerrainTexture(THREE) {
  const W = 1024; const H = 512;
  const cvs = document.createElement('canvas');
  cvs.width = W; cvs.height = H;
  const ctx = cvs.getContext('2d');
  const img = ctx.createImageData(W, H);
  const d = img.data;
  for (let py = 0; py < H; py += 1) {
    const lat = 90 - (py / H) * 180;
    const absLat = Math.abs(lat);
    for (let px = 0; px < W; px += 1) {
      const lon = (px / W) * 360 - 180;
      const n = fbm(lon / 60 + 3.7, lat / 40 + 1.2);
      let r; let g; let b;
      if (absLat > 75) {
        const t = Math.min(1, (absLat - 75) / 12);
        r = Math.round(195 + t * 50);
        g = Math.round(210 + t * 40);
        b = Math.round(230 + t * 25);
      } else if (n > 0.52) {
        if (absLat > 50) {
          r = 85 + Math.round(n * 25); g = 115 + Math.round(n * 30); b = 75;
        } else if (absLat > 30) {
          r = 55 + Math.round(n * 35); g = 145 + Math.round(n * 25); b = 55;
        } else {
          r = 35 + Math.round(n * 30); g = 150 + Math.round(n * 22); b = 45;
        }
      } else {
        const depth = 0.55 + n * 0.45;
        const latN = absLat / 90;
        r = Math.round((8 + (1 - latN) * 18) * depth);
        g = Math.round((25 + (1 - latN) * 65) * depth);
        b = Math.round((95 + (1 - latN) * 85) * depth);
      }
      const idx = (py * W + px) * 4;
      d[idx] = r; d[idx + 1] = g; d[idx + 2] = b; d[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cvs);
  tex.needsUpdate = true;
  return tex;
}

// ─── Parse block config ──────────────────────────────────────────────────
// Works with both DA Live (block > row > cell) and UE (block > wrapper > row > cell)
// by processing both selector depths; rows without exactly 2 cell children are skipped.
function parseBlock(block) {
  const cfg = {};
  const applyRow = (row) => {
    const cells = [...row.querySelectorAll(':scope > div')];
    if (cells.length < 2) return;
    const key = cells[0].textContent.trim().toLowerCase().replace(/[\s\-_]+/g, '');
    const val = cells[1].textContent.trim();
    if (!val) return;
    if (key === 'height') { cfg.height = val; return; }
    if (key === 'minmag') {
      const parsed = parseFloat(val);
      if (!Number.isNaN(parsed)) cfg.minMag = parsed;
      return;
    }
    if (val.startsWith('{')) {
      try { Object.assign(cfg, JSON.parse(val)); } catch { /* skip */ }
    }
  };
  // Try both depths — safe because non-matching rows (wrong cell count) are skipped
  block.querySelectorAll(':scope > div > div').forEach(applyRow);
  block.querySelectorAll(':scope > div').forEach(applyRow);
  return cfg;
}

// ─── Demo mode check ─────────────────────────────────────────────────────
function isDemoMode() {
  const p = new URLSearchParams(window.location.search);
  return p.has('demo') || p.get('demo') === 'usgs';
}

// ─── Fetch USGS data ─────────────────────────────────────────────────────
async function fetchEarthquakes(signal, minMag = 1.0) {
  const res = await fetch(USGS_API, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.features || [])
    .map((f) => {
      const [lon, lat, depth] = f.geometry.coordinates;
      return {
        id: f.id,
        lon,
        lat,
        depth,
        mag: f.properties.mag ?? 1,
        place: f.properties.place ?? 'Unknown',
        time: f.properties.time,
        timestamp: new Date(f.properties.time),
      };
    })
    .filter((q) => q.mag >= minMag);
}

// ─── Demo fallback quakes ────────────────────────────────────────────────
function getDemoQuakes() {
  const raw = [
    {
      id: 'd1', lon: 139.8, lat: 35.7, depth: 40, mag: 4.2, place: '8km NE of Tokyo, Japan',
    },
    {
      id: 'd2', lon: -118.2, lat: 34.1, depth: 10, mag: 3.1, place: '12km SE of Los Angeles, CA',
    },
    {
      id: 'd3', lon: -122.4, lat: 37.8, depth: 15, mag: 2.8, place: '5km NW of San Francisco, CA',
    },
    {
      id: 'd4', lon: -77.0, lat: -12.1, depth: 60, mag: 5.3, place: '18km S of Lima, Peru',
    },
    {
      id: 'd5', lon: 28.9, lat: 41.0, depth: 8, mag: 3.6, place: '6km E of Istanbul, Turkey',
    },
    {
      id: 'd6', lon: 145.8, lat: -8.5, depth: 90, mag: 6.1, place: '45km NW of Lae, Papua New Guinea',
    },
    {
      id: 'd7', lon: -64.6, lat: 17.7, depth: 20, mag: 2.4, place: '3km NE of Charlotte Amalie, USVI',
    },
    {
      id: 'd8', lon: 14.5, lat: 40.8, depth: 5, mag: 3.8, place: '10km W of Naples, Italy',
    },
    {
      id: 'd9', lon: -150.5, lat: 61.2, depth: 35, mag: 2.9, place: '22km SW of Anchorage, Alaska',
    },
    {
      id: 'd10', lon: 103.8, lat: 1.4, depth: 12, mag: 3.4, place: '8km N of Singapore',
    },
  ];
  return raw.map((q) => ({
    ...q,
    time: Date.now() - (parseInt(q.id.slice(1), 10) * 300000),
    timestamp: new Date(),
  }));
}

// ─── Surprise quake for demo intro ───────────────────────────────────────
function makeSurpriseQuake() {
  return {
    id: 'surprise-8.2',
    lon: -121.5,
    lat: 36.6,
    depth: 18,
    mag: 8.2,
    place: '42km SW of Monterey, CA — MAJOR EVENT',
    time: Date.now(),
    timestamp: new Date(),
  };
}

// ─── Time ago ────────────────────────────────────────────────────────────
function timeAgo(time) {
  const diff = Date.now() - time;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

// ─── Render states ───────────────────────────────────────────────────────
function renderEmpty(block, message) {
  block.replaceChildren();
  const el = document.createElement('div');
  el.className = 'quake-empty-state';
  el.innerHTML = `
    <div class="quake-empty-icon">🌍</div>
    <div class="quake-empty-title">Data Unavailable</div>
    <div class="quake-empty-hint">${message}</div>
  `;
  block.append(el);
}
function renderLoadingSpinner() {
  const el = document.createElement('div');
  el.className = 'quake-spinner';
  el.innerHTML = '<div class="spinner-ring"></div><div class="spinner-text">Fetching earthquakes…</div>';
  return el;
}

// ─── Side panel ──────────────────────────────────────────────────────────
function buildPanel(quakes, demo, newQuakeId = null) {
  const panel = document.createElement('div');
  panel.className = 'quake-panel';
  panel.innerHTML = `
    <div class="quake-panel-header">
      <div class="quake-panel-title">Recent Earthquakes</div>
      <div class="quake-panel-controls">
        <div class="quake-status ${demo ? 'demo' : 'live'}">${demo ? '◈ Demo' : '● Live USGS'}</div>
        <button class="quake-cycle-btn" aria-label="Pause auto-cycle" title="Pause/resume auto-cycle">⏸</button>
      </div>
    </div>
    <div class="quake-list"></div>
  `;
  const list = panel.querySelector('.quake-list');
  const sorted = quakes.slice(0, 10).sort((a, b) => b.mag - a.mag);
  sorted.forEach((q) => {
    const item = document.createElement('div');
    item.className = 'quake-item';
    if (q.id === newQuakeId) item.classList.add('quake-item-new');
    item.dataset.quakeId = q.id;
    let cls = 'badge-grey';
    if (q.mag >= 6) cls = 'badge-red';
    else if (q.mag >= 4) cls = 'badge-amber';
    else if (q.mag >= 2) cls = 'badge-green';
    const latStr = `${Math.abs(q.lat).toFixed(2)}°${q.lat >= 0 ? 'N' : 'S'}`;
    const lonStr = `${Math.abs(q.lon).toFixed(2)}°${q.lon >= 0 ? 'E' : 'W'}`;
    const localTime = new Date(q.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    item.innerHTML = `
      <div class="quake-item-main">
        <div class="quake-badge ${cls}">${q.mag.toFixed(1)}</div>
        <div class="quake-info">
          <div class="quake-place">${q.place}</div>
          <div class="quake-time">${timeAgo(q.time)}</div>
        </div>
      </div>
      <div class="quake-item-detail" aria-hidden="true">
        <div class="quake-detail-row"><span>Depth</span><span>${q.depth} km</span></div>
        <div class="quake-detail-row"><span>Location</span><span>${latStr}, ${lonStr}</span></div>
        <div class="quake-detail-row"><span>Time</span><span>${localTime}</span></div>
      </div>
    `;
    list.append(item);
  });
  return panel;
}

// ─── Main scene ──────────────────────────────────────────────────────────
async function initScene(globeArea, wrapper, quakes, config) {
  const THREE = await loadThreeJS();

  const canvas = document.createElement('canvas');
  canvas.className = 'quake-canvas';
  globeArea.append(canvas);

  const w = globeArea.clientWidth || (wrapper.clientWidth - 320) || 700;
  const h = config.height ? parseInt(config.height, 10) : 600;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
  camera.position.set(0, 0, 2.1);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x07080d, 1);

  // Starfield
  const starCount = 4000;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i += 1) {
    const r = 50;
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = 2 * Math.PI * Math.random();
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi);
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xffffff, size: 0.25, sizeAttenuation: true, transparent: true, opacity: 0.82,
  })));

  // Globe group (rotated by drag and spin-to)
  const globeGroup = new THREE.Group();
  scene.add(globeGroup);

  // Globe sphere
  const sphereGeom = new THREE.IcosahedronGeometry(GLOBE_RADIUS, 32);
  const sphereMat = new THREE.MeshPhongMaterial({
    map: createTerrainTexture(THREE),
    emissive: 0x0a0b14,
    specular: 0x1a1a2e,
    shininess: 5,
  });
  globeGroup.add(new THREE.Mesh(sphereGeom, sphereMat));

  // Upgrade to NASA texture asynchronously — keep procedural until loaded
  const NASA_TEX = 'https://raw.githubusercontent.com/mrdoob/three.js/r160/examples/textures/land_ocean_ice_cloud_2048.jpg';
  new THREE.TextureLoader().load(
    NASA_TEX,
    (tex) => { sphereMat.map = tex; sphereMat.needsUpdate = true; },
    undefined,
    () => { /* silently keep procedural on fail */ },
  );

  // Wireframe overlay — very faint to avoid distracting triangle shapes
  globeGroup.add(new THREE.Mesh(
    new THREE.IcosahedronGeometry(GLOBE_RADIUS + 0.002, 32),
    new THREE.MeshBasicMaterial({
      color: 0xffffff, wireframe: true, opacity: 0.012, transparent: true,
    }),
  ));

  // Inner atmosphere haze
  globeGroup.add(new THREE.Mesh(
    new THREE.IcosahedronGeometry(GLOBE_RADIUS + 0.04, 32),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8, opacity: 0.06, transparent: true, depthWrite: false,
    }),
  ));

  // Outer atmosphere glow
  globeGroup.add(new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE_RADIUS + 0.15, 64, 32),
    new THREE.MeshBasicMaterial({
      color: 0x1855ee,
      opacity: 0.13,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  ));

  const pl = new THREE.PointLight(0xffffff, 0.8, 100);
  pl.position.set(2, 2, 2);
  scene.add(pl);
  scene.add(new THREE.AmbientLight(0x4a4a5e, 0.6));

  // ─── lat/lon → 3D point ───
  // Matches Three.js IcosahedronGeometry UV: u = 0.5 + atan2(z, x)/(2π)
  // so Prime Meridian (lon=0°) sits at +x, 90°E at +z, 90°W at -z.
  function latLonToPoint(lat, lon, r = GLOBE_RADIUS) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      -r * Math.sin(phi) * Math.sin(theta),
    );
  }

  // ─── Node + ripple state ───
  const nodeObjects = []; // { mesh, mat, quake, pos, baseColor }
  const activeRipples = [];

  function clearRipples() {
    activeRipples.forEach((item) => {
      globeGroup.remove(item.ring);
      item.ring.geometry.dispose();
      item.rMat.dispose();
    });
    activeRipples.length = 0;
  }

  function spawnRipples(pos, color) {
    clearRipples();
    const now = Date.now();
    for (let i = 0; i < RIPPLE_COUNT; i += 1) {
      const delay = (i * RIPPLE_DURATION) / RIPPLE_COUNT;
      const rGeom = new THREE.RingGeometry(0, 0.001, 32);
      const rMat = new THREE.MeshBasicMaterial({
        color, side: THREE.DoubleSide, opacity: 0.8, transparent: true,
      });
      const ring = new THREE.Mesh(rGeom, rMat);
      ring.position.copy(pos);
      ring.lookAt(new THREE.Vector3(0, 0, 0));
      globeGroup.add(ring);
      activeRipples.push({
        ring, rMat, startTime: now + delay, duration: RIPPLE_DURATION,
      });
    }
  }

  function createNode(quake) {
    const pos = latLonToPoint(quake.lat, quake.lon, GLOBE_RADIUS + 0.005);
    const color = getMagnitudeColor(quake.mag);
    const geo = new THREE.SphereGeometry(getMagnitudeScale(quake.mag), 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    globeGroup.add(mesh);
    nodeObjects.push({
      mesh, mat, quake, pos, baseColor: color,
    });
  }

  quakes.slice(0, 20).forEach(createNode);

  // ─── Highlight by quake ID ───
  // scroll=true only on direct user clicks — never during auto-cycle or hover
  function setHighlight(quakeId, scroll = false) {
    let activeQuake = null;
    nodeObjects.forEach((obj) => {
      const active = obj.quake.id === quakeId;
      obj.mat.color.setHex(active ? 0xffffff : obj.baseColor);
      obj.mesh.scale.setScalar(active ? 2.0 : 1);
      if (active) activeQuake = obj.quake;
    });
    // Spawn ripples only for the focused quake and only if mag is significant
    if (activeQuake && activeQuake.mag >= RIPPLE_MIN_MAG) {
      const ripplePos = latLonToPoint(activeQuake.lat, activeQuake.lon, GLOBE_RADIUS + 0.001);
      spawnRipples(ripplePos, getMagnitudeColor(activeQuake.mag));
    } else if (!quakeId) {
      clearRipples();
    }
    wrapper.querySelectorAll('.quake-item').forEach((item) => {
      const isActive = item.dataset.quakeId === quakeId;
      item.classList.toggle('is-active', isActive);
      const detail = item.querySelector('.quake-item-detail');
      if (detail) {
        if (isActive) {
          // Read scrollHeight while visible to get real content height
          detail.style.maxHeight = `${detail.scrollHeight}px`;
          detail.removeAttribute('aria-hidden');
        } else {
          detail.style.maxHeight = '0';
          detail.setAttribute('aria-hidden', 'true');
        }
      }
    });
    if (scroll && !config.noScroll) {
      const activeItem = wrapper.querySelector('.quake-item.is-active');
      const list = wrapper.querySelector('.quake-list');
      if (activeItem && list) {
        const targetTop = activeItem.offsetTop - (list.clientHeight - activeItem.offsetHeight) / 2;
        list.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
      }
    }
  }

  // ─── Spin to quake ───
  let targetY = 0; let targetX = 0; let spinning = false;

  function spinToQuake(quake) {
    const theta = (quake.lon + 180) * (Math.PI / 180);
    // rawY = theta + π/2 derived from z-flipped latLonToPoint: sin(rotY - theta) = 1
    const rawY = theta + Math.PI / 2;
    const curr = globeGroup.rotation.y;
    let diff = (rawY - curr) % (2 * Math.PI);
    if (diff > Math.PI) diff -= 2 * Math.PI;
    if (diff < -Math.PI) diff += 2 * Math.PI;
    targetY = curr + diff;
    // Cap tilt so the marker stays clearly in frame at high latitudes
    targetX = Math.max(-0.55, Math.min(0.55, -((quake.lat * Math.PI) / 180) * 0.6));
    spinning = true;
  }

  // ─── Floating tooltip ───
  let tooltip = null;
  let tooltipQuakeId = null;

  function hideTooltip() {
    if (tooltip) { tooltip.remove(); tooltip = null; tooltipQuakeId = null; }
  }

  function getMarkerScreenPos(nodeObj) {
    const worldPos = nodeObj.pos.clone().applyMatrix4(globeGroup.matrixWorld);
    if (worldPos.z < 0) return null;
    worldPos.project(camera);
    const canvasW = canvas.clientWidth;
    const canvasH = canvas.clientHeight;
    return {
      x: (worldPos.x * 0.5 + 0.5) * canvasW,
      y: (-worldPos.y * 0.5 + 0.5) * canvasH,
    };
  }

  function updateTooltipPosition() {
    if (!tooltip || !tooltipQuakeId) return;
    const obj = nodeObjects.find((o) => o.quake.id === tooltipQuakeId);
    if (!obj) return;
    const pos = getMarkerScreenPos(obj);
    if (!pos) {
      tooltip.style.visibility = 'hidden';
      return;
    }
    tooltip.style.visibility = '';
    tooltip.style.left = `${pos.x}px`;
    // Clamp Y so tooltip doesn't clip above the canvas top
    const minY = (tooltip.offsetHeight || 120) + 24;
    tooltip.style.top = `${Math.max(minY, pos.y)}px`;
  }

  function showTooltip(quake) {
    hideTooltip();
    const magFloor = Math.min(9, Math.floor(quake.mag));
    const latStr = `${Math.abs(quake.lat).toFixed(2)}°${quake.lat >= 0 ? 'N' : 'S'}`;
    const lonStr = `${Math.abs(quake.lon).toFixed(2)}°${quake.lon >= 0 ? 'E' : 'W'}`;
    tooltip = document.createElement('div');
    tooltip.className = 'quake-tooltip';
    tooltip.innerHTML = `
      <div class="quake-tooltip-header">
        <span class="quake-tooltip-mag m${magFloor}">M${quake.mag.toFixed(1)}</span>
        <button class="quake-tooltip-close" aria-label="Close">✕</button>
      </div>
      <div class="quake-tooltip-place">${quake.place}</div>
      <div class="quake-tooltip-meta">
        <span>⬇ ${quake.depth} km depth</span>
        <span>${timeAgo(quake.time)}</span>
      </div>
      <div class="quake-tooltip-coords">${latStr} ${lonStr}</div>
    `;
    tooltipQuakeId = quake.id;
    tooltip.querySelector('.quake-tooltip-close').addEventListener('click', (e) => {
      e.stopPropagation();
      hideTooltip();
    });
    globeArea.append(tooltip);
    requestAnimationFrame(() => {
      updateTooltipPosition();
      tooltip?.classList.add('is-visible');
    });
  }

  // ─── Hover state ───
  let globeHovering = false;
  let sidebarHovering = false;

  canvas.addEventListener('mouseenter', () => { globeHovering = true; });
  canvas.addEventListener('mouseleave', () => { globeHovering = false; });

  const panelArea = wrapper.querySelector('.quake-panel-area');
  if (panelArea) {
    panelArea.addEventListener('mouseenter', () => { sidebarHovering = true; });
    panelArea.addEventListener('mouseleave', () => { sidebarHovering = false; });
  }

  // ─── Drag to rotate ───
  let dragging = false;
  let lastX = 0; let lastY = 0;
  let autoSpin = true;
  let autoSpinTimer = null;

  function resumeAutoSpin() {
    clearTimeout(autoSpinTimer);
    autoSpinTimer = setTimeout(() => { autoSpin = true; }, 3000);
  }

  canvas.addEventListener('mousedown', (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    autoSpin = false; spinning = false;
    hideTooltip();
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX; const dy = e.clientY - lastY;
    globeGroup.rotation.y += dx * 0.005;
    globeGroup.rotation.x = Math.max(-0.8, Math.min(0.8, globeGroup.rotation.x + dy * 0.005));
    lastX = e.clientX; lastY = e.clientY;
  });
  window.addEventListener('mouseup', () => { if (dragging) { dragging = false; resumeAutoSpin(); } });

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      dragging = true; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
      autoSpin = false; spinning = false;
      hideTooltip();
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (!dragging || e.touches.length !== 1) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - lastX; const dy = e.touches[0].clientY - lastY;
    globeGroup.rotation.y += dx * 0.005;
    globeGroup.rotation.x = Math.max(-0.8, Math.min(0.8, globeGroup.rotation.x + dy * 0.005));
    lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
  }, { passive: false });
  canvas.addEventListener('touchend', () => { dragging = false; resumeAutoSpin(); }, { passive: true });

  // ─── Raycaster for hover/click ───
  const raycaster = new THREE.Raycaster();
  raycaster.params.Points = { threshold: 0.05 };
  const mouse = new THREE.Vector2();

  function getHoveredQuakeId(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const meshes = nodeObjects.map((o) => o.mesh);
    const hits = raycaster.intersectObjects(meshes);
    if (hits.length > 0) {
      const idx = meshes.indexOf(hits[0].object);
      return nodeObjects[idx]?.quake.id ?? null;
    }
    return null;
  }

  canvas.addEventListener('mousemove', (e) => {
    if (dragging) return;
    const quakeId = getHoveredQuakeId(e);
    if (quakeId) setHighlight(quakeId);
    canvas.style.cursor = quakeId ? 'pointer' : 'grab';
  });

  canvas.addEventListener('click', (e) => {
    const quakeId = getHoveredQuakeId(e);
    if (quakeId) {
      const q = nodeObjects.find((n) => n.quake.id === quakeId)?.quake;
      setHighlight(quakeId, true);
      if (q) {
        spinToQuake(q);
        showTooltip(q);
        autoSpin = false;
        resumeAutoSpin();
      }
    } else {
      hideTooltip();
    }
  });
  canvas.style.cursor = 'grab';

  // Panel hover / click
  function attachPanelListeners(onItemClick) {
    wrapper.querySelectorAll('.quake-item').forEach((item) => {
      const { quakeId } = item.dataset;
      const q = nodeObjects.find((n) => n.quake.id === quakeId)?.quake;
      item.addEventListener('click', () => {
        if (q) {
          setHighlight(quakeId, true);
          spinToQuake(q);
          showTooltip(q);
          autoSpin = false;
          resumeAutoSpin();
          onItemClick?.();
        }
      });
    });
  }

  // ─── Animation loop ───
  function animate() {
    requestAnimationFrame(animate);
    const now = Date.now();

    if (autoSpin && !dragging && !spinning && !globeHovering) globeGroup.rotation.y += 0.0003;

    if (spinning) {
      globeGroup.rotation.y += (targetY - globeGroup.rotation.y) * 0.05;
      globeGroup.rotation.x += (targetX - globeGroup.rotation.x) * 0.05;
      const doneY = Math.abs(targetY - globeGroup.rotation.y) < 0.001;
      const doneX = Math.abs(targetX - globeGroup.rotation.x) < 0.001;
      if (doneY && doneX) spinning = false;
    }

    updateTooltipPosition();

    activeRipples.forEach((item) => {
      const elapsed = now - item.startTime;
      const cycle = item.duration + 500;
      const loopElapsed = ((elapsed % cycle) + cycle) % cycle;
      if (loopElapsed < item.duration) {
        const t = loopElapsed / item.duration;
        const radius = t * 0.38;
        const inner = Math.max(0, radius - 0.05);
        item.ring.geometry.dispose();
        item.ring.geometry = new THREE.RingGeometry(inner, radius, 32);
        item.rMat.opacity = Math.max(0, 0.75 * (1 - t));
        item.ring.visible = true;
      } else {
        item.ring.visible = false;
      }
    });

    renderer.render(scene, camera);
  }

  new ResizeObserver(() => {
    const nw = globeArea.clientWidth;
    const nh = globeArea.clientHeight;
    if (nw && nh) {
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    }
  }).observe(globeArea);

  animate();

  return {
    addQuake: (q) => { createNode(q); },
    spinToQuake: (q) => spinToQuake(q),
    setHighlight: (quakeId, scroll) => setHighlight(quakeId, scroll),
    setAutoSpin: (val) => { autoSpin = val; },
    refreshPanel: (onItemClick) => attachPanelListeners(onItemClick),
    showTooltip: (q) => showTooltip(q),
    hideTooltip: () => hideTooltip(),
    isHovering: () => globeHovering || sidebarHovering,
    dispose: () => renderer.dispose(),
  };
}

// ─── Main decorate ───────────────────────────────────────────────────────
export default async function decorate(block) {
  try {
    const blockConfig = parseBlock(block);
    const demo = isDemoMode();
    const config = {
      height: blockConfig.height || '600',
      minMag: blockConfig.minMag ?? 1.0,
      noScroll: block.classList.contains('no-scroll'),
      ...blockConfig,
    };

    block.replaceChildren();
    block.style.position = 'relative';
    block.style.minHeight = `${config.height}px`;
    block.append(renderLoadingSpinner());

    let quakes;
    if (demo) {
      quakes = getDemoQuakes().filter((q) => q.mag >= config.minMag);
    } else {
      const ac = new AbortController();
      const tid = setTimeout(() => ac.abort(), 8000);
      try {
        quakes = await fetchEarthquakes(ac.signal, config.minMag);
      } finally {
        clearTimeout(tid);
      }
    }

    if (!quakes?.length) {
      const msg = demo ? 'Demo data unavailable' : 'No earthquakes found in the last 24 hours';
      renderEmpty(block, msg);
      return;
    }

    block.replaceChildren();
    const wrapper = document.createElement('div');
    wrapper.className = 'quake-wrapper';
    block.append(wrapper);

    const globeArea = document.createElement('div');
    globeArea.className = 'quake-globe-area';
    wrapper.append(globeArea);

    const panelArea = document.createElement('div');
    panelArea.className = 'quake-panel-area';
    wrapper.append(panelArea);

    // eslint-disable-next-line no-unused-expressions
    globeArea.offsetWidth;

    const ctrl = await initScene(globeArea, wrapper, quakes, config);

    // ── Cycle management ──────────────────────────────────────────────────
    let cycleIdx = 0;
    let cycleHandle = null;
    let cycleUserPauseTimer = null;
    let cyclePaused = false;

    const getSorted = () => quakes.slice(0, 10).sort((a, b) => b.mag - a.mag);

    const doCycle = () => {
      if (ctrl.isHovering() || cyclePaused) return;
      const sorted = getSorted();
      if (!sorted.length) return;
      const q = sorted[cycleIdx % sorted.length];
      ctrl.spinToQuake(q);
      ctrl.setHighlight(q.id);
      ctrl.showTooltip(q);
      cycleIdx += 1;
    };

    function scheduleCycle() {
      clearTimeout(cycleHandle);
      cycleHandle = setTimeout(() => {
        doCycle();
        cycleHandle = setTimeout(function loop() {
          doCycle();
          cycleHandle = setTimeout(loop, CYCLE_PAUSE_MS);
        }, CYCLE_PAUSE_MS);
      }, CYCLE_DELAY_MS);
    }

    // Called when user directly interacts — pauses cycle for 10s then resumes
    function interruptCycle() {
      clearTimeout(cycleHandle);
      clearTimeout(cycleUserPauseTimer);
      if (!cyclePaused) {
        cycleUserPauseTimer = setTimeout(() => {
          if (!cyclePaused) scheduleCycle();
        }, 10000);
      }
    }

    const replacePanel = (list, isDemo, newId = null) => {
      const old = panelArea.querySelector('.quake-panel');
      const next = buildPanel(list, isDemo, newId);
      if (old) old.replaceWith(next); else panelArea.append(next);

      // Wire up pause/resume button
      const cycleBtn = panelArea.querySelector('.quake-cycle-btn');
      if (cycleBtn) {
        cycleBtn.addEventListener('click', () => {
          cyclePaused = !cyclePaused;
          cycleBtn.textContent = cyclePaused ? '▶' : '⏸';
          cycleBtn.setAttribute('title', cyclePaused ? 'Resume auto-cycle' : 'Pause auto-cycle');
          cycleBtn.setAttribute('aria-label', cyclePaused ? 'Resume auto-cycle' : 'Pause auto-cycle');
          if (cyclePaused) {
            clearTimeout(cycleHandle);
            clearTimeout(cycleUserPauseTimer);
          } else {
            scheduleCycle();
          }
        });
      }

      ctrl.refreshPanel(interruptCycle);
    };

    replacePanel(quakes, demo);

    // ── Demo mode ──────────────────────────────────────────────────────────
    if (demo) {
      setTimeout(() => {
        const surprise = makeSurpriseQuake();
        quakes = [surprise, ...quakes];
        ctrl.addQuake(surprise);
        replacePanel(quakes, true, surprise.id);
        ctrl.spinToQuake(surprise);
        ctrl.setHighlight(surprise.id);
        ctrl.showTooltip(surprise);
        setTimeout(() => {
          ctrl.setHighlight(null);
          ctrl.hideTooltip();
          ctrl.setAutoSpin(true);
        }, CYCLE_PAUSE_MS);
      }, CYCLE_DELAY_MS);
      return;
    }

    // ── Live mode ──────────────────────────────────────────────────────────
    scheduleCycle();

    // ── Live polling ──────────────────────────────────────────────────────
    setInterval(async () => {
      try {
        const ac = new AbortController();
        const t = setTimeout(() => ac.abort(), 5000);
        const fresh = await fetchEarthquakes(ac.signal, config.minMag);
        clearTimeout(t);
        if (!fresh?.length) return;

        const prevIds = new Set(quakes.map((q) => q.id));
        fresh.filter((q) => !prevIds.has(q.id)).forEach((q) => ctrl.addQuake(q));

        replacePanel(fresh, false);
        quakes = fresh;
      } catch { /* ignore poll errors */ }
    }, POLL_INTERVAL);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        clearTimeout(cycleHandle);
      } else {
        if (!cyclePaused) scheduleCycle();
      }
    }, { once: false });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('viz-quake-feed initialization failed:', err);
    renderEmpty(block, `Error: ${err.message}`);
  }
}

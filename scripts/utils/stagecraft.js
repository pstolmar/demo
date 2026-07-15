// scripts/utils/stagecraft.js
// Stagecraft easter egg: intercepts the theme toggle when ?stagecraft=1
// Exports interceptSchemeButton(btn, active) for testability.

const DARK = '#060608';
const CHERENKOV = '#00CFFF';

let safetyTimer = null;

// Escape hatch — cleans up all stagecraft DOM regardless of sequence state
function forceRevive() {
  clearTimeout(safetyTimer);
  ['sc-veil', 'sc-bulb-wrap', 'sc-ft-wrap', 'sc-spot', 'sc-robot-wrap', 'sc-switch'].forEach((id) => {
    document.getElementById(id)?.remove();
  });
  const schemBtn = document.querySelector('.action-wrapper.toggle button');
  if (schemBtn) schemBtn.style.cssText = '';
}

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

function injectKeyframes() {
  if (document.getElementById('sc-keyframes')) return;
  const s = document.createElement('style');
  s.id = 'sc-keyframes';
  s.textContent = `@keyframes sc-chrnkv {
    0%,100%{box-shadow:0 0 12px 4px #00CFFF,0 0 32px 8px #00CFFF}
    50%{box-shadow:0 0 20px 8px #80F0FF,0 0 60px 20px #40D0FF}
  }`;
  document.head.append(s);
}

function startBlackout() {
  if (document.getElementById('sc-veil')) return;
  injectKeyframes();
  safetyTimer = setTimeout(forceRevive, 35000);

  const veil = el('div', { id: 'sc-veil' }, `
    position:fixed;inset:0;background:${DARK};opacity:0;
    transition:opacity 1s ease;z-index:9000;pointer-events:none;
  `);
  document.body.append(veil);
  requestAnimationFrame(() => { veil.style.opacity = '1'; });

  // Cherenkov glow on the scheme button
  const schemBtn = document.querySelector('.action-wrapper.toggle button');
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

  const autoBulb = setTimeout(() => { if (document.getElementById('sc-bulb-wrap')) wrap.click(); }, 3500);
  wrap.addEventListener('click', () => {
    clearTimeout(autoBulb);
    wrap.remove();
    goFullDark(veil);
  }, { once: true });
}

function goFullDark(veil) {
  // Remove cherenkov — total dark except a faint button glow
  const schemBtn = document.querySelector('.action-wrapper.toggle button');
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

  // Fade veil out so the spot's transparent hole shows actual page content
  veil.style.transition = 'opacity 0.5s ease';
  veil.style.opacity = '0';

  const autoFt = setTimeout(() => { if (document.getElementById('sc-ft-wrap')) ftWrap.click(); }, 3000);
  ftWrap.addEventListener('click', () => {
    clearTimeout(autoFt);
    shelf.remove();
    pickUpFlashlight(ftWrap, spot, veil);
  }, { once: true });
}

function pickUpFlashlight(ftWrap, spot, veil) {
  ftWrap.style.transition = 'none';
  ftWrap.style.pointerEvents = 'none';

  let battery = 1.0;
  let flickering = false;
  const SHAKE_SAMPLES = [];

  function updateSpot(x, y) {
    const radius = Math.max(20, 180 * battery);
    spot.style.background = `radial-gradient(circle ${radius}px at ${x}px ${y}px, transparent 0%, rgba(0,0,0,${0.96 + (1 - battery) * 0.03}) 100%)`;
    ftWrap.style.left = `${x - 20}px`;
    ftWrap.style.top  = `${y - 80}px`;
  }

  function onMouseMove(e) {
    updateSpot(e.clientX, e.clientY);
    const now = Date.now();
    SHAKE_SAMPLES.push({ x: e.clientX, y: e.clientY, t: now });
    // Keep only last 600ms
    while (SHAKE_SAMPLES.length && now - SHAKE_SAMPLES[0].t > 600) SHAKE_SAMPLES.shift();
    if (SHAKE_SAMPLES.length > 4) {
      let totalDelta = 0;
      for (let i = 1; i < SHAKE_SAMPLES.length; i++) {
        totalDelta += Math.hypot(
          SHAKE_SAMPLES[i].x - SHAKE_SAMPLES[i - 1].x,
          SHAKE_SAMPLES[i].y - SHAKE_SAMPLES[i - 1].y,
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
    battery = Math.max(0, battery - (dt / 1000) * 0.12);

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
      finalFlickerAndRevive(ftWrap, spot, veil);
    }
  }
  requestAnimationFrame(batteryLoop);
}

function finalFlickerAndRevive(ftWrap, spot, veil) {
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
  clearTimeout(safetyTimer);
  const spot = document.getElementById('sc-spot');
  spot?.remove();

  veil.style.transition = 'opacity 0.8s ease';
  veil.style.opacity = '0';
  setTimeout(() => { veil.remove(); robot?.remove(); switchEl?.remove(); }, 900);

  // Restore scheme button
  const schemBtn = document.querySelector('.action-wrapper.toggle button');
  if (schemBtn) schemBtn.style.cssText = schemBtn.style.cssText.replace(/box-shadow[^;]+;?/g, '').replace(/animation[^;]+;?/g, '');

  document.body.classList.add('light-scheme');
  document.body.classList.remove('dark-scheme');
  localStorage.setItem('color-scheme', 'light-scheme');
}

// ─── Entry point ──────────────────────────────────────────────────────────

export default function init() {
  const params = new URLSearchParams(window.location.search);
  const active = params.has('stagecraft');

  const findBtn = () => document.querySelector('.action-wrapper.toggle button');
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

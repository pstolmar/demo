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

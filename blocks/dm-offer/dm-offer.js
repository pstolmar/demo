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
  const [year, month, day] = iso.split('-').map(Number);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${months[month - 1]} ${day}, ${year}`;
}

function buildDmUrl(template, values) {
  const clampedPercent = Math.min(99, Math.max(1, parseInt(values.percent, 10) || 30));
  const pairs = [
    ['$hidebackground', values.hidebackground ? '1' : '0'],
    ['$percent', String(clampedPercent)],
    ['$image', values.image],
    ['$category', values.category],
    ['$enddate', formatDate(values.enddate)],
    ['wid', '2000'],
    ['hei', '2000'],
    ['qlt', '80'],
    ['fit', 'constrain'],
    ['fmt', 'png-alpha'],
  ];
  const qs = pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  const base = template.split('?')[0];
  return `${base}?${qs}`;
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
  const { template } = cfg;
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
      <input type="number" name="percent" min="1" max="99" value="" />
    </label>
    <label>Category
      <input type="text" name="category" value="" />
    </label>
    <label>End Date
      <input type="date" name="enddate" value="" />
    </label>
    <label class="dm-offer-toggle">Hide Background
      <input type="checkbox" name="hidebackground" />
    </label>
    <label>Image Path
      <input type="text" name="image" value="" />
    </label>
  `;
  form.querySelector('[name="percent"]').value = defaults.percent;
  form.querySelector('[name="category"]').value = defaults.category;
  form.querySelector('[name="enddate"]').value = defaults.enddate;
  form.querySelector('[name="hidebackground"]').checked = defaults.hidebackground;
  form.querySelector('[name="image"]').value = defaults.image;

  const urlRow = document.createElement('div');
  urlRow.className = 'dm-offer-url-row';
  urlRow.append(urlDisplay, copyBtn);
  form.append(urlRow);

  const update = () => {
    const values = readValues(form);
    const newUrl = buildDmUrl(template, values);
    img.src = newUrl;
    urlDisplay.textContent = newUrl;
  };

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

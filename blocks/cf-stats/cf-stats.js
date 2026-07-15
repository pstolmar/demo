// blocks/cf-stats/cf-stats.js
import { fetchCF } from '../../scripts/utils/cf-fetch.js';

export default async function decorate(block) {
  const link = block.querySelector('a[href]');
  const url = link?.href || block.textContent.trim();
  if (!url) return;

  block.innerHTML = '';

  try {
    const result = await fetchCF(url);
    const items = Array.isArray(result) ? result : [result];

    const dl = document.createElement('dl');
    dl.className = 'cf-stats-list';

    items.forEach((item) => {
      const dt = document.createElement('dt');
      dt.textContent = item.label || item.name || '';

      const dd = document.createElement('dd');
      dd.textContent = item.value != null ? String(item.value) : '';

      if (item.trend != null) {
        const trend = document.createElement('span');
        trend.className = 'cf-stats-trend';
        const isPositive = Number(item.trend) >= 0;
        trend.textContent = `${isPositive ? '↑' : '↓'}${item.trend}`;
        if (!isPositive) trend.dataset.negative = 'true';
        dd.append(trend);
      }

      dl.append(dt, dd);
    });

    block.append(dl);
  } catch (err) {
    block.innerHTML = `<p class="cf-error">${err.message}</p>`;
  }
}

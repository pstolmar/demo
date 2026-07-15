// blocks/cf-cards/cf-cards.js
import { fetchCF } from '../../scripts/utils/cf-fetch.js';

export default async function decorate(block) {
  const link = block.querySelector('a[href]');
  const url = link?.href || block.textContent.trim();
  if (!url) return;

  block.innerHTML = '<div class="cf-cards-loading" aria-busy="true"></div>';

  try {
    const result = await fetchCF(url);
    const items = Array.isArray(result) ? result : [result];

    block.innerHTML = '';
    const ul = document.createElement('ul');
    ul.className = 'cf-cards-grid';

    items.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'cf-card';

      const title = item.title || item.name || '';
      const bodyContent = item.description?.plaintext || item.body?.html || '';
      const imgSrc = item.image?.src || '';

      if (imgSrc) {
        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = title;
        img.loading = 'lazy';
        li.append(img);
      }

      if (title) {
        const h3 = document.createElement('h3');
        h3.textContent = title;
        li.append(h3);
      }

      if (bodyContent) {
        const p = document.createElement('p');
        p.textContent = bodyContent;
        li.append(p);
      }

      ul.append(li);
    });

    block.append(ul);
  } catch (err) {
    block.innerHTML = `<p class="cf-error">Could not load cards: ${err.message}</p>`;
  }
}

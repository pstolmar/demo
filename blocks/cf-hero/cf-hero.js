// blocks/cf-hero/cf-hero.js
import { fetchCF } from '../../scripts/utils/cf-fetch.js';

export default async function decorate(block) {
  const link = block.querySelector('a[href]');
  const url = link?.href || block.textContent.trim();
  if (!url) return;

  block.innerHTML = '<div class="cf-hero-loading" aria-busy="true"></div>';

  try {
    const item = await fetchCF(url);

    const title = item.title || item.headline || '';
    const bodyHtml = item.body?.html || item.content?.html || item.richText?.html || '';
    const imgSrc = item.image?.src || item._path || '';

    block.innerHTML = '';

    if (imgSrc) {
      const img = document.createElement('img');
      img.src = imgSrc;
      img.alt = title;
      img.loading = 'lazy';
      img.className = 'cf-hero-img';
      block.append(img);
    }

    const content = document.createElement('div');
    content.className = 'cf-hero-content';

    if (title) {
      const h1 = document.createElement('h1');
      h1.textContent = title;
      content.append(h1);
    }

    if (bodyHtml) {
      const div = document.createElement('div');
      div.innerHTML = bodyHtml;
      content.append(div);
    }

    block.append(content);
  } catch (err) {
    block.innerHTML = `<p class="cf-error">Could not load content: ${err.message}</p>`;
  }
}

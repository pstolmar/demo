// blocks/cf-quote/cf-quote.js
import { fetchCF } from '../../scripts/utils/cf-fetch.js';

export default async function decorate(block) {
  const link = block.querySelector('a[href]');
  const url = link?.href || block.textContent.trim();
  if (!url) return;

  block.innerHTML = '';

  try {
    const item = await fetchCF(url);

    const quoteText = item.quote || item.text?.html || item.body?.html || '';
    const author = item.author || item.name || '';
    const role = item.role || '';

    const blockquote = document.createElement('blockquote');
    blockquote.className = 'cf-quote-text';
    blockquote.innerHTML = quoteText;

    const footer = document.createElement('footer');
    footer.className = 'cf-quote-meta';

    if (author) {
      const cite = document.createElement('cite');
      cite.textContent = author;
      footer.append(cite);
    }

    if (role) {
      const span = document.createElement('span');
      span.className = 'cf-quote-role';
      span.textContent = role;
      footer.append(span);
    }

    block.append(blockquote);
    if (author || role) block.append(footer);
  } catch (err) {
    block.innerHTML = `<p class="cf-error">${err.message}</p>`;
  }
}

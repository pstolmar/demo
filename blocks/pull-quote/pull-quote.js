/*
 * Pull Quote Block
 * Decorative blockquote with large quotation mark, accent border,
 * and fade-in-on-scroll reveal animation.
 * Row 1 = quote text, Row 2 = attribution (optional)
 */
export default function decorate(block) {
  const rows = [...block.children];
  if (rows.length === 0) return;

  // Build semantic blockquote structure
  const quoteRow = rows[0];
  const attrRow = rows[1];

  const figure = document.createElement('figure');
  figure.className = 'pull-quote-figure';

  // Decorative opening quotation mark
  const mark = document.createElement('div');
  mark.className = 'pull-quote-mark';
  mark.setAttribute('aria-hidden', 'true');
  mark.textContent = '\u201C';
  figure.append(mark);

  const blockquote = document.createElement('blockquote');
  blockquote.className = 'pull-quote-text';
  // Move quote content into the blockquote
  while (quoteRow.firstChild) {
    const child = quoteRow.firstChild.firstChild || quoteRow.firstChild;
    if (child.nodeType === 1 && child.tagName === 'DIV') {
      while (child.firstChild) blockquote.append(child.firstChild);
      child.remove();
    } else {
      blockquote.append(child);
    }
  }
  figure.append(blockquote);

  if (attrRow) {
    const figcaption = document.createElement('figcaption');
    figcaption.className = 'pull-quote-attribution';
    while (attrRow.firstChild) {
      const child = attrRow.firstChild.firstChild || attrRow.firstChild;
      if (child.nodeType === 1 && child.tagName === 'DIV') {
        while (child.firstChild) figcaption.append(child.firstChild);
        child.remove();
      } else {
        figcaption.append(child);
      }
    }
    figure.append(figcaption);
  }

  // Replace block content with semantic structure
  block.textContent = '';
  block.append(figure);

  // Fade in on scroll
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        block.classList.add('visible');
        observer.disconnect();
      }
    },
    { threshold: 0.15 },
  );

  observer.observe(block);
}

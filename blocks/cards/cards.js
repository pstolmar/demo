import init from '../card/card.js';

// card.js expects el > div(inner) > div(content) but block rows have
// el > div(cell) > <p> tags directly. Wrap cell children so card.js finds them.
function decorateCardRow(row) {
  const cell = row.querySelector(':scope > div');
  if (!cell) return;

  const wrapper = document.createElement('div');
  [...cell.childNodes].forEach((node) => wrapper.append(node));
  cell.append(wrapper);

  row.classList.add('card');
  row.setAttribute('draggable', 'true');
  init(row);
}

function addDragReorder(block) {
  let dragging = null;

  block.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    dragging = card;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    requestAnimationFrame(() => card.classList.add('is-dragging'));
  });

  block.addEventListener('dragend', () => {
    block.querySelectorAll('.card').forEach((c) => {
      c.classList.remove('is-dragging', 'drop-before', 'drop-after');
    });
    dragging = null;
  });

  block.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!dragging) return;
    const card = e.target.closest('.card');
    if (!card || card === dragging) return;
    e.dataTransfer.dropEffect = 'move';
    block.querySelectorAll('.card').forEach((c) => c.classList.remove('drop-before', 'drop-after'));
    const { left, width } = card.getBoundingClientRect();
    card.classList.add(e.clientX < left + width / 2 ? 'drop-before' : 'drop-after');
  });

  block.addEventListener('dragleave', (e) => {
    if (!block.contains(e.relatedTarget)) {
      block.querySelectorAll('.card').forEach((c) => c.classList.remove('drop-before', 'drop-after'));
    }
  });

  block.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!dragging) return;
    const card = e.target.closest('.card');
    if (!card || card === dragging) return;
    const { left, width } = card.getBoundingClientRect();
    if (e.clientX < left + width / 2) {
      block.insertBefore(dragging, card);
    } else {
      card.after(dragging);
    }
    block.querySelectorAll('.card').forEach((c) => c.classList.remove('drop-before', 'drop-after'));
  });
}

export default function decorate(block) {
  [...block.querySelectorAll(':scope > div')].forEach(decorateCardRow);
  addDragReorder(block);
}

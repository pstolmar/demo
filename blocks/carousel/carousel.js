function updateActiveSlide(block, slideIndex) {
  const slides = block.querySelectorAll('.carousel-slide');
  const total = slides.length;
  let idx = slideIndex;

  if (idx < 0) idx = total - 1;
  else if (idx >= total) idx = 0;

  block.dataset.activeSlide = idx;

  slides.forEach((slide, i) => {
    const isActive = i === idx;
    slide.setAttribute('aria-hidden', !isActive);
    slide.querySelectorAll('a').forEach((link) => {
      if (!isActive) link.setAttribute('tabindex', '-1');
      else link.removeAttribute('tabindex');
    });
  });

  /* Update fraction pagination */
  const fraction = block.querySelector('.carousel-fraction');
  if (fraction) fraction.textContent = `${idx + 1} / ${total}`;

  /* Update scrollbar progress */
  const drag = block.querySelector('.carousel-scrollbar-drag');
  if (drag) drag.style.width = `${((idx + 1) / total) * 100}%`;
}

function bindEvents(block) {
  block.querySelector('.slide-prev')?.addEventListener('click', () => {
    const current = parseInt(block.dataset.activeSlide, 10);
    updateActiveSlide(block, current - 1);
  });

  block.querySelector('.slide-next')?.addEventListener('click', () => {
    const current = parseInt(block.dataset.activeSlide, 10);
    updateActiveSlide(block, current + 1);
  });
}

function createSlide(row, slideIndex, carouselId) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.setAttribute('id', `carousel-${carouselId}-slide-${slideIndex}`);
  slide.classList.add('carousel-slide');

  row.querySelectorAll(':scope > div').forEach((column, colIdx) => {
    column.classList.add(`carousel-slide-${colIdx === 0 ? 'image' : 'content'}`);
    slide.append(column);
  });

  const labeledBy = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (labeledBy) {
    slide.setAttribute('aria-labelledby', labeledBy.getAttribute('id'));
  }

  return slide;
}

let carouselId = 0;

export default async function decorate(block) {
  carouselId += 1;
  block.setAttribute('id', `carousel-${carouselId}`);
  const rows = block.querySelectorAll(':scope > div');
  const isSingleSlide = rows.length < 2;

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'Carousel');

  const container = document.createElement('div');
  container.classList.add('carousel-slides-container');

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carousel-slides');

  rows.forEach((row, idx) => {
    const slide = createSlide(row, idx, carouselId);
    slidesWrapper.append(slide);
    row.remove();
  });

  container.append(slidesWrapper);
  block.prepend(container);

  if (!isSingleSlide) {
    /* Build modern controls bar: scrollbar + prev/next + fraction */
    const controls = document.createElement('div');
    controls.classList.add('carousel-controls');

    const scrollbar = document.createElement('div');
    scrollbar.classList.add('carousel-scrollbar');
    const drag = document.createElement('div');
    drag.classList.add('carousel-scrollbar-drag');
    scrollbar.append(drag);

    const chevron = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 16L7 10L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.classList.add('slide-prev');
    prevBtn.setAttribute('aria-label', 'Previous');
    prevBtn.innerHTML = chevron;

    const fraction = document.createElement('span');
    fraction.classList.add('carousel-fraction');

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.classList.add('slide-next');
    nextBtn.setAttribute('aria-label', 'Next');
    nextBtn.innerHTML = chevron;

    controls.append(scrollbar, prevBtn, fraction, nextBtn);
    block.append(controls);

    bindEvents(block);
  }

  /* Set first slide as active */
  updateActiveSlide(block, 0);
}

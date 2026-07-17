import { expect } from '@esm-bundle/chai';

function makeBlock(rows = []) {
  const block = document.createElement('div');
  block.className = 'dm-offer';
  rows.forEach(([key, val]) => {
    const row = document.createElement('div');
    const k = document.createElement('div'); k.textContent = key;
    const v = document.createElement('div'); v.textContent = val;
    row.append(k, v);
    block.append(row);
  });
  document.body.append(block);
  return block;
}

describe('dm-offer', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('renders preview image and controls form', async () => {
    const block = makeBlock([
      ['template', 'https://s7d1.scene7.com/is/image/PeterStolmarNA001/DiscountOffer'],
      ['percent', '30'],
      ['category', 'phones'],
      ['enddate', '2026-07-29'],
      ['hidebackground', 'false'],
      ['image', 'PeterStolmarNA001/approved-phone-app'],
    ]);
    const { default: decorate } = await import('../../blocks/dm-offer/dm-offer.js');
    decorate(block);
    expect(block.querySelector('.dm-offer-img')).to.not.be.null;
    expect(block.querySelector('.dm-offer-controls')).to.not.be.null;
  });

  it('renders all five control inputs', async () => {
    const block = makeBlock([
      ['template', 'https://s7d1.scene7.com/is/image/PeterStolmarNA001/DiscountOffer'],
    ]);
    const { default: decorate } = await import('../../blocks/dm-offer/dm-offer.js');
    decorate(block);
    const form = block.querySelector('.dm-offer-controls');
    expect(form.querySelector('[name="percent"]')).to.not.be.null;
    expect(form.querySelector('[name="category"]')).to.not.be.null;
    expect(form.querySelector('[name="enddate"]')).to.not.be.null;
    expect(form.querySelector('[name="hidebackground"]')).to.not.be.null;
    expect(form.querySelector('[name="image"]')).to.not.be.null;
  });

  it('image src contains all DM params', async () => {
    const block = makeBlock([
      ['template', 'https://s7d1.scene7.com/is/image/PeterStolmarNA001/DiscountOffer'],
      ['percent', '25'],
      ['category', 'tablets'],
      ['enddate', '2026-08-01'],
      ['hidebackground', 'false'],
      ['image', 'PeterStolmarNA001/approved-phone-app'],
    ]);
    const { default: decorate } = await import('../../blocks/dm-offer/dm-offer.js');
    decorate(block);
    const { src } = block.querySelector('.dm-offer-img');
    expect(src).to.include('%24percent=25');
    expect(src).to.include('%24category=tablets');
    expect(src).to.include('%24hidebackground=0');
    expect(src).to.include('wid=2000');
    expect(src).to.include('fmt=png-alpha');
  });

  it('formats enddate as "Month D, Year"', async () => {
    const block = makeBlock([
      ['template', 'https://s7d1.scene7.com/is/image/PeterStolmarNA001/DiscountOffer'],
      ['enddate', '2026-07-29'],
    ]);
    const { default: decorate } = await import('../../blocks/dm-offer/dm-offer.js');
    decorate(block);
    const src = decodeURIComponent(block.querySelector('.dm-offer-img').src);
    expect(src).to.include('$enddate=July 29, 2026');
  });

  it('updates image src when percent input changes', async () => {
    const block = makeBlock([
      ['template', 'https://s7d1.scene7.com/is/image/PeterStolmarNA001/DiscountOffer'],
      ['percent', '30'],
    ]);
    const { default: decorate } = await import('../../blocks/dm-offer/dm-offer.js');
    decorate(block);
    const input = block.querySelector('[name="percent"]');
    const img = block.querySelector('.dm-offer-img');
    const before = img.src;
    input.value = '50';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(img.src).to.not.equal(before);
    expect(img.src).to.include('%24percent=50');
  });

  it('copy URL button exists', async () => {
    const block = makeBlock([
      ['template', 'https://s7d1.scene7.com/is/image/PeterStolmarNA001/DiscountOffer'],
    ]);
    const { default: decorate } = await import('../../blocks/dm-offer/dm-offer.js');
    decorate(block);
    expect(block.querySelector('.dm-offer-copy')).to.not.be.null;
  });
});

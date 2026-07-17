import { expect } from '@esm-bundle/chai';

function makeBlock(src, fit = '') {
  const block = document.createElement('div');
  block.className = 'dm-background';
  const srcRow = document.createElement('div');
  const k = document.createElement('div'); k.textContent = 'src';
  const v = document.createElement('div'); v.textContent = src;
  srcRow.append(k, v);
  block.append(srcRow);
  if (fit) {
    const fitRow = document.createElement('div');
    const fk = document.createElement('div'); fk.textContent = 'fit';
    const fv = document.createElement('div'); fv.textContent = fit;
    fitRow.append(fk, fv);
    block.append(fitRow);
  }
  document.body.append(block);
  return block;
}

describe('dm-background', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.body.classList.remove('has-dm-background');
  });

  it('renders an img element inside the block', async () => {
    const block = makeBlock('https://s7d1.scene7.com/is/image/Co/img');
    const { default: decorate } = await import('../../blocks/dm-background/dm-background.js');
    decorate(block);
    expect(block.querySelector('img')).to.not.be.null;
  });

  it('appends DM responsive params to scene7 URLs', async () => {
    const block = makeBlock('https://s7d1.scene7.com/is/image/Co/img');
    const { default: decorate } = await import('../../blocks/dm-background/dm-background.js');
    decorate(block);
    const { src } = block.querySelector('img');
    expect(src).to.include('wid=1920');
    expect(src).to.include('hei=1080');
    expect(src).to.include('fmt=webp');
    expect(src).to.include('fit=crop');
    expect(src).to.include('qlt=75');
  });

  it('respects custom fit param', async () => {
    const block = makeBlock('https://s7d1.scene7.com/is/image/Co/img', 'constrain');
    const { default: decorate } = await import('../../blocks/dm-background/dm-background.js');
    decorate(block);
    const { src } = block.querySelector('img');
    expect(src).to.include('fit=constrain');
  });

  it('passes AEM assets path through unchanged', async () => {
    const block = makeBlock('/content/dam/images/bg.jpg');
    const { default: decorate } = await import('../../blocks/dm-background/dm-background.js');
    decorate(block);
    const src = block.querySelector('img').getAttribute('src');
    expect(src).to.equal('/content/dam/images/bg.jpg');
  });

  it('adds has-dm-background class to document.body', async () => {
    const block = makeBlock('https://s7d1.scene7.com/is/image/Co/img');
    const { default: decorate } = await import('../../blocks/dm-background/dm-background.js');
    decorate(block);
    expect(document.body.classList.contains('has-dm-background')).to.be.true;
  });

  it('img has aria-hidden="true"', async () => {
    const block = makeBlock('https://s7d1.scene7.com/is/image/Co/img');
    const { default: decorate } = await import('../../blocks/dm-background/dm-background.js');
    decorate(block);
    expect(block.querySelector('img').getAttribute('aria-hidden')).to.equal('true');
  });

  it('does not throw and renders nothing when src is empty', async () => {
    const block = makeBlock('');
    const { default: decorate } = await import('../../blocks/dm-background/dm-background.js');
    expect(() => decorate(block)).to.not.throw();
    expect(block.querySelector('img')).to.be.null;
  });
});

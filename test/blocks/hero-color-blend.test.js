import { expect } from '@esm-bundle/chai';

describe('hero color-blend', () => {
  let hero;

  beforeEach(() => {
    hero = document.createElement('div');
    hero.className = 'hero color-blend';
    const bg = document.createElement('div');
    const fg = document.createElement('div');
    fg.innerHTML = '<div><h1>Test</h1></div>';
    hero.append(bg, fg);
    document.body.append(hero);
  });

  afterEach(() => hero.remove());

  it('adds blend-canvas element on first click', async () => {
    const { default: init } = await import('../../blocks/hero/hero.js');
    await init(hero);
    hero.dispatchEvent(new MouseEvent('click', { clientX: 100, clientY: 100, bubbles: true }));
    // Allow one rAF cycle
    await new Promise(r => setTimeout(r, 50));
    const canvas = hero.querySelector('.hero-firework-canvas');
    expect(canvas).to.not.be.null;
  });

  it('does not add canvas for non-color-blend heroes', async () => {
    hero.classList.remove('color-blend');
    const { default: init } = await import('../../blocks/hero/hero.js');
    await init(hero);
    hero.dispatchEvent(new MouseEvent('click', { clientX: 100, clientY: 100, bubbles: true }));
    await new Promise(r => setTimeout(r, 50));
    const canvas = hero.querySelector('.hero-firework-canvas');
    expect(canvas).to.be.null;
  });
});

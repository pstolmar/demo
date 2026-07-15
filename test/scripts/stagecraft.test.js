import { expect } from '@esm-bundle/chai';

describe('stagecraft', () => {
  let btn;

  beforeEach(() => {
    // Simulate the scheme button
    const wrapper = document.createElement('div');
    wrapper.className = 'action-wrapper scheme';
    btn = document.createElement('button');
    wrapper.append(btn);
    document.body.append(wrapper);
  });

  afterEach(() => {
    document.querySelector('.action-wrapper.scheme')?.remove();
    document.getElementById('sc-veil')?.remove();
    document.getElementById('sc-bulb-wrap')?.remove();
  });

  it('does nothing when ?stagecraft not in URL', async () => {
    // URL has no stagecraft param — module checks at import time
    // We test the exported `interceptSchemeButton` directly
    const { interceptSchemeButton } = await import('../../scripts/utils/stagecraft.js');
    interceptSchemeButton(btn, false); // false = stagecraft not active
    btn.click();
    await new Promise(r => setTimeout(r, 50));
    expect(document.getElementById('sc-veil')).to.be.null;
  });

  it('creates veil on scheme button click when active', async () => {
    const { interceptSchemeButton } = await import('../../scripts/utils/stagecraft.js');
    interceptSchemeButton(btn, true); // true = stagecraft active
    btn.click();
    await new Promise(r => setTimeout(r, 50));
    expect(document.getElementById('sc-veil')).to.not.be.null;
  });
});

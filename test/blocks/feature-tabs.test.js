import { expect } from '@esm-bundle/chai';

async function decorateFeatureTabs(block) {
  const { default: decorate } = await import('../../blocks/feature-tabs/feature-tabs.js');
  await decorate(block);
}

function makeBlock(rows) {
  const block = document.createElement('div');
  block.className = 'feature-tabs';
  rows.forEach(([label, body]) => {
    const row = document.createElement('div');
    const c0 = document.createElement('div'); c0.textContent = label;
    const c1 = document.createElement('div');
    const c2 = document.createElement('div'); c2.textContent = `Heading ${label}`;
    const c3 = document.createElement('div'); c3.textContent = body;
    row.append(c0, c1, c2, c3);
    block.append(row);
  });
  return block;
}

describe('feature-tabs', () => {
  it('creates one tab button per row', async () => {
    const block = makeBlock([['Tab A', 'Content A'], ['Tab B', 'Content B']]);
    document.body.append(block);
    await decorateFeatureTabs(block);
    const tabs = block.querySelectorAll('.ft-tab');
    expect(tabs.length).to.equal(2);
    document.body.removeChild(block);
  });

  it('first tab is active on init', async () => {
    const block = makeBlock([['Tab A', 'Body A'], ['Tab B', 'Body B']]);
    document.body.append(block);
    await decorateFeatureTabs(block);
    const first = block.querySelector('.ft-tab');
    expect(first.getAttribute('aria-selected')).to.equal('true');
    document.body.removeChild(block);
  });

  it('clicking a tab activates it', async () => {
    const block = makeBlock([['Tab A', 'A'], ['Tab B', 'B']]);
    document.body.append(block);
    await decorateFeatureTabs(block);
    const tabs = block.querySelectorAll('.ft-tab');
    tabs[1].click();
    expect(tabs[1].getAttribute('aria-selected')).to.equal('true');
    expect(tabs[0].getAttribute('aria-selected')).to.equal('false');
    const panels = block.querySelectorAll('.ft-panel');
    expect(panels[1].hidden).to.be.false;
    expect(panels[0].hidden).to.be.true;
    document.body.removeChild(block);
  });
});

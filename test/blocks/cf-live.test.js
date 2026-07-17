import { expect } from '@esm-bundle/chai';

// --- helpers ---

function makeBlock(mode, rows = []) {
  const block = document.createElement('div');
  block.className = `cf-live ${mode}`;
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

function heroJson(eyebrow = 'Sale', title = 'Big Deal', html = '<p>Body</p>', ctaLabel = 'Shop') {
  return {
    data: {
      heroList: {
        items: [{ eyebrow, title, description: { html }, ctaLabel, ctaUrl: '/shop' }]
      }
    }
  };
}

function featureJson(n = 2) {
  return {
    data: {
      featureList: {
        items: Array.from({ length: n }, (_, i) => ({
          eyebrow: `Cat ${i}`,
          title: `Feature ${i}`,
          description: { plaintext: `Body ${i}` },
          _path: `/content/dam/feat/${i}`,
        }))
      }
    }
  };
}

// --- tests ---

describe('cf-live', () => {
  let origFetch;
  beforeEach(() => { origFetch = globalThis.fetch; });
  afterEach(() => { globalThis.fetch = origFetch; document.body.innerHTML = ''; });

  it('fingerprint mode renders promo content with badge', async () => {
    globalThis.fetch = async () => ({ ok: true, json: async () => heroJson() });
    const block = makeBlock('fingerprint', [
      ['query', '/graphql/execute.json/global/hero'],
    ]);
    const { default: decorate } = await import('../../blocks/cf-live/cf-live.js');
    await decorate(block);
    expect(block.querySelector('.cf-live-badge-fingerprint')).to.not.be.null;
    expect(block.querySelector('.cf-live-title').textContent).to.equal('Big Deal');
    expect(block.querySelector('.cf-live-eyebrow').textContent).to.equal('Sale');
  });

  it('reactive mode renders list content with reactive badge', async () => {
    globalThis.fetch = async () => ({ ok: true, json: async () => featureJson(3) });
    const block = makeBlock('reactive', [
      ['query', '/graphql/execute.json/global/featurelist'],
    ]);
    const { default: decorate } = await import('../../blocks/cf-live/cf-live.js');
    await decorate(block);
    expect(block.querySelector('.cf-live-badge-reactive')).to.not.be.null;
    expect(block.querySelectorAll('.cf-live-pr-item').length).to.equal(3);
  });

  it('compare mode renders list with hidden update banner', async () => {
    globalThis.fetch = async () => ({ ok: true, json: async () => featureJson(2) });
    const block = makeBlock('compare', [
      ['query', '/graphql/execute.json/global/featurelist'],
    ]);
    const { default: decorate } = await import('../../blocks/cf-live/cf-live.js');
    await decorate(block);
    const banner = block.querySelector('.cf-live-update-banner');
    expect(banner).to.not.be.null;
    expect(banner.hidden).to.be.true;
  });

  it('manual mode renders check-for-updates button', async () => {
    globalThis.fetch = async () => ({ ok: true, json: async () => heroJson() });
    const block = makeBlock('manual', [
      ['query', '/graphql/execute.json/global/hero'],
    ]);
    const { default: decorate } = await import('../../blocks/cf-live/cf-live.js');
    await decorate(block);
    expect(block.querySelector('.cf-live-check-btn')).to.not.be.null;
  });

  it('adaptive mode renders adaptive badge', async () => {
    globalThis.fetch = async () => ({ ok: true, json: async () => featureJson(2) });
    const block = makeBlock('adaptive', [
      ['query', '/graphql/execute.json/global/featurelist'],
    ]);
    const { default: decorate } = await import('../../blocks/cf-live/cf-live.js');
    await decorate(block);
    expect(block.querySelector('.cf-live-badge-adaptive')).to.not.be.null;
  });

  it('shows error when fetch fails', async () => {
    globalThis.fetch = async () => ({ ok: false, status: 500 });
    const block = makeBlock('fingerprint', [
      ['query', '/graphql/execute.json/global/hero'],
    ]);
    const { default: decorate } = await import('../../blocks/cf-live/cf-live.js');
    await decorate(block);
    expect(block.querySelector('.cf-live-error')).to.not.be.null;
  });

  it('shows error when no query configured', async () => {
    const block = makeBlock('fingerprint', []);
    const { default: decorate } = await import('../../blocks/cf-live/cf-live.js');
    await decorate(block);
    expect(block.querySelector('.cf-live-error')).to.not.be.null;
  });
});

function sanitiseHTML(htmlString) {
  if (!htmlString) return null;
  const doc = new DOMParser().parseFromString(htmlString, 'text/html');
  doc.querySelectorAll('script,iframe,object,embed').forEach((el) => el.remove());
  doc.querySelectorAll('*').forEach((el) => {
    [...el.attributes].forEach((attr) => {
      if (/^on/i.test(attr.name) || /^javascript:/i.test(attr.value)) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return doc.body.childNodes;
}
async function getContent(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  // Try common GraphQL CF response shapes
  const data = json?.data;
  if (data) {
    // Generic: iterate top-level keys looking for { item: { body: { html } } }
    for (const val of Object.values(data)) {
      const html = val?.item?.body?.html ?? val?.item?.content?.html ?? val?.item?.richText?.html;
      if (html) return sanitiseHTML(html);
    }
    // List shape: { items: [{ body: { html } }] }
    for (const val of Object.values(data)) {
      const items = val?.items;
      if (Array.isArray(items) && items[0]) {
        const html = items[0]?.body?.html ?? items[0]?.content?.html ?? items[0]?.richText?.html;
        if (html) return sanitiseHTML(html);
      }
    }
  }
  // Raw html field
  if (json?.html) return sanitiseHTML(json.html);
  throw new Error('No renderable HTML found in CF response');
}
export default async function decorate(block) {
  try {
    const queryElement = block.querySelector('a[href]');
    if (queryElement) {
      const queryURL = queryElement.href;
      const parentDiv = document.createElement('div');
      parentDiv.classList.add('cfrenderer-block');
      const nodeList = await getContent(queryURL);

      if (nodeList) {
        nodeList.forEach((node) => {
          parentDiv.appendChild(node.cloneNode(true));
        });

        queryElement.replaceWith(parentDiv);
      } else {
        throw new Error('No content retrieved.');
      }
    }
  } catch (error) {
    const errorDiv = document.createElement('div');
    errorDiv.classList.add('cfrenderer-error-block');
    errorDiv.append(document.createTextNode(`Error occurred! ${error.message}`));
    block.replaceWith(errorDiv);
  }
}

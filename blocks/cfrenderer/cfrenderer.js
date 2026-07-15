function sanitiseHTML(htmlString) {
  if (!htmlString) return null;

  // Initialize a new DOMParser instance
  const parser = new DOMParser();

  // Parse the HTML string
  const doc = parser.parseFromString(htmlString, 'text/html');

  // Remove any <script> tags to mitigate potential XSS attacks
  Array.from(doc.getElementsByTagName('script')).forEach((script) => script.remove());

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

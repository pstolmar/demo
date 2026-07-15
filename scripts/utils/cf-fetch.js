// scripts/utils/cf-fetch.js
// Fetches AEM CF data from a persisted query URL or a raw CF path.

const AEM_HOST = 'https://author-p138879-e1741192.adobeaemcloud.com';

export async function fetchCF(urlOrPath) {
  let url = urlOrPath.trim();

  if (url.startsWith('/content/dam/')) {
    // Build a minimal persisted query URL for a direct CF path
    url = `${AEM_HOST}/graphql/execute.json/wknd-shared/adventure-by-path?adventurePath=${encodeURIComponent(url)}`;
  } else if (url.startsWith('/graphql')) {
    // Relative persisted query path — prepend host
    url = `${AEM_HOST}${url}`;
  }
  // Otherwise treat as a full URL and fetch directly

  const res = await fetch(url);
  if (!res.ok) throw new Error(`CF fetch failed: ${res.status} ${url}`);
  const json = await res.json();
  return extractCFData(json);
}

function extractCFData(json) {
  const data = json?.data;
  if (!data) throw new Error('No data field in CF response');

  // Check well-known GraphQL query shapes first
  if (data.contentFragmentByPath?.item) return data.contentFragmentByPath.item;
  if (Array.isArray(data.contentFragmentList?.items) && data.contentFragmentList.items.length) {
    return data.contentFragmentList.items[0];
  }

  // Fallback: iterate top-level keys for the first item or items array
  for (const val of Object.values(data)) {
    if (val?.item) return val.item;
    if (Array.isArray(val?.items) && val.items.length) return val.items;
    if (Array.isArray(val) && val.length) return val;
  }

  throw new Error('Could not extract CF item(s) from response');
}

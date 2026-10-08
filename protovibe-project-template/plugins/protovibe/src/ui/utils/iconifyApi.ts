// plugins/protovibe/src/ui/utils/iconifyApi.ts
//
// Client for the public Iconify API used by the inspector's icon picker.
// Loading every thumbnail as its own `<prefix>/<name>.svg` request fired ~30
// requests per keystroke-search, which trips the API's rate limiting; failed
// `<img>`s were never retried, so thumbs went missing. Instead we:
//  - batch thumbnail data into one `<prefix>.json?icons=a,b,c` request per collection,
//  - cache search results and icon data for the session (failures are not cached),
//  - fall back to Iconify's mirror hosts and back off on 429 / 5xx / network errors.

const API_HOSTS = ['https://api.iconify.design', 'https://api.simplesvg.com', 'https://api.unisvg.com'];
const RETRY_DELAYS_MS = [1000, 3000];
const MAX_ICONS_PARAM_LENGTH = 400;
const MAX_SEARCH_CACHE_ENTRIES = 200;
const THUMB_COLOR = 'white';

class NotFoundError extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** GET a JSON endpoint, trying each API host in turn and retrying with backoff. Throws NotFoundError on 404. */
async function fetchApiJson(pathAndQuery: string): Promise<any> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    let retryAfterMs = 0;
    for (const host of API_HOSTS) {
      try {
        const res = await fetch(host + pathAndQuery);
        if (res.ok) return await res.json();
        if (res.status === 404) throw new NotFoundError(pathAndQuery);
        const retryAfter = Number(res.headers.get('retry-after'));
        if (retryAfter > 0) retryAfterMs = Math.max(retryAfterMs, retryAfter * 1000);
        lastError = new Error(`Iconify API ${res.status} for ${pathAndQuery}`);
      } catch (err) {
        if (err instanceof NotFoundError) throw err;
        lastError = err;
      }
    }
    if (attempt < RETRY_DELAYS_MS.length) await sleep(Math.max(RETRY_DELAYS_MS[attempt], Math.min(retryAfterMs, 10000)));
  }
  throw lastError;
}

// ─── Search ──────────────────────────────────────────────────────────────────

const searchResults = new Map<string, string[]>();
const searchRequests = new Map<string, Promise<string[]>>();

const searchKey = (query: string) => query.trim().toLowerCase();

/** Synchronously returns cached results for a query, or undefined if it hasn't been searched yet. */
export function getCachedIconSearch(query: string): string[] | undefined {
  return searchResults.get(searchKey(query));
}

/** Searches Iconify for icons, returning ids like "mdi:home". Concurrent and repeated queries share one request. */
export function searchIconify(query: string): Promise<string[]> {
  const key = searchKey(query);
  const cached = searchResults.get(key);
  if (cached) return Promise.resolve(cached);
  let request = searchRequests.get(key);
  if (!request) {
    request = fetchApiJson(`/search?query=${encodeURIComponent(key)}&limit=30`)
      .catch((err) => {
        if (err instanceof NotFoundError) return { icons: [] };
        throw err;
      })
      .then((data) => {
        const icons: string[] = Array.isArray(data?.icons) ? data.icons : [];
        if (searchResults.size >= MAX_SEARCH_CACHE_ENTRIES) {
          searchResults.delete(searchResults.keys().next().value!);
        }
        searchResults.set(key, icons);
        return icons;
      })
      .finally(() => searchRequests.delete(key));
    searchRequests.set(key, request);
  }
  return request;
}

// ─── Thumbnails ──────────────────────────────────────────────────────────────

interface IconifyIconData {
  body?: string;
  parent?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  rotate?: number;
  hFlip?: boolean;
  vFlip?: boolean;
}

interface IconifyCollectionResponse {
  icons?: Record<string, IconifyIconData>;
  aliases?: Record<string, IconifyIconData>;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
}

/** Resolves an icon (following aliases) and renders it to an SVG data URI, mirroring Iconify's iconToSVG transforms. */
function buildThumbDataUri(data: IconifyCollectionResponse, name: string): string | null {
  let body: string | undefined;
  let left: number | undefined, top: number | undefined, width: number | undefined, height: number | undefined;
  let rotate = 0;
  let hFlip = false;
  let vFlip = false;

  // Walk from the requested name up through its alias parents; the closest definition of each box value wins.
  let current: string | undefined = name;
  for (let depth = 0; current && depth < 8; depth++) {
    const item: IconifyIconData | undefined = data.icons?.[current] ?? data.aliases?.[current];
    if (!item) return null;
    left ??= item.left;
    top ??= item.top;
    width ??= item.width;
    height ??= item.height;
    rotate += item.rotate ?? 0;
    hFlip = hFlip !== !!item.hFlip;
    vFlip = vFlip !== !!item.vFlip;
    if (item.body !== undefined) {
      body = item.body;
      break;
    }
    current = item.parent;
  }
  if (body === undefined) return null;

  const box = {
    left: left ?? data.left ?? 0,
    top: top ?? data.top ?? 0,
    width: width ?? data.width ?? 16,
    height: height ?? data.height ?? 16,
  };
  const transforms: string[] = [];
  if (hFlip) {
    if (vFlip) {
      rotate += 2;
    } else {
      transforms.push(`translate(${box.width + box.left} ${-box.top})`, 'scale(-1 1)');
      box.top = box.left = 0;
    }
  } else if (vFlip) {
    transforms.push(`translate(${-box.left} ${box.height + box.top})`, 'scale(1 -1)');
    box.top = box.left = 0;
  }
  rotate = ((rotate % 4) + 4) % 4;
  if (rotate === 1) {
    const c = box.height / 2 + box.top;
    transforms.unshift(`rotate(90 ${c} ${c})`);
  } else if (rotate === 2) {
    transforms.unshift(`rotate(180 ${box.width / 2 + box.left} ${box.height / 2 + box.top})`);
  } else if (rotate === 3) {
    const c = box.width / 2 + box.left;
    transforms.unshift(`rotate(-90 ${c} ${c})`);
  }
  if (rotate % 2 === 1) {
    [box.left, box.top] = [box.top, box.left];
    [box.width, box.height] = [box.height, box.width];
  }
  if (transforms.length) body = `<g transform="${transforms.join(' ')}">${body}</g>`;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${box.width}" height="${box.height}" viewBox="${box.left} ${box.top} ${box.width} ${box.height}">` +
    `${body.replace(/currentColor/g, THUMB_COLOR)}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

type Deferred = { resolve: (uri: string | null) => void; reject: (err: unknown) => void };

/** iconId → data URI, or null when the icon doesn't exist. */
const thumbs = new Map<string, string | null>();
const thumbRequests = new Map<string, Promise<string | null>>();
const queuedByPrefix = new Map<string, Map<string, Deferred>>();
let flushScheduled = false;

function splitIconId(iconId: string): [string, string] {
  const colon = iconId.indexOf(':');
  return [iconId.slice(0, colon), iconId.slice(colon + 1)];
}

async function fetchThumbChunk(prefix: string, chunk: Map<string, Deferred>) {
  try {
    let data: IconifyCollectionResponse = {};
    try {
      data = await fetchApiJson(`/${encodeURIComponent(prefix)}.json?icons=${[...chunk.keys()].join(',')}`);
    } catch (err) {
      if (!(err instanceof NotFoundError)) throw err;
    }
    for (const [name, deferred] of chunk) {
      const uri = buildThumbDataUri(data, name);
      thumbs.set(`${prefix}:${name}`, uri);
      deferred.resolve(uri);
    }
  } catch (err) {
    for (const deferred of chunk.values()) deferred.reject(err);
  }
}

function flushThumbQueue() {
  flushScheduled = false;
  for (const [prefix, queued] of queuedByPrefix) {
    let chunk = new Map<string, Deferred>();
    let length = 0;
    for (const [name, deferred] of queued) {
      if (chunk.size > 0 && length + name.length + 1 > MAX_ICONS_PARAM_LENGTH) {
        fetchThumbChunk(prefix, chunk);
        chunk = new Map();
        length = 0;
      }
      chunk.set(name, deferred);
      length += name.length + 1;
    }
    if (chunk.size > 0) fetchThumbChunk(prefix, chunk);
  }
  queuedByPrefix.clear();
}

/** Synchronously returns a loaded thumbnail: a data URI, null if the icon doesn't exist, or undefined if not loaded yet. */
export function getCachedIconThumb(iconId: string): string | null | undefined {
  return thumbs.get(iconId);
}

/** Loads a white SVG thumbnail for "prefix:name" as a data URI. Requests made in the same tick are batched per collection. */
export function loadIconThumb(iconId: string): Promise<string | null> {
  if (thumbs.has(iconId)) return Promise.resolve(thumbs.get(iconId)!);
  let request = thumbRequests.get(iconId);
  if (request) return request;

  const [prefix, name] = splitIconId(iconId);
  if (!prefix || !name) return Promise.resolve(null);
  request = new Promise<string | null>((resolve, reject) => {
    if (!queuedByPrefix.has(prefix)) queuedByPrefix.set(prefix, new Map());
    queuedByPrefix.get(prefix)!.set(name, { resolve, reject });
  }).finally(() => thumbRequests.delete(iconId));
  thumbRequests.set(iconId, request);

  if (!flushScheduled) {
    flushScheduled = true;
    setTimeout(flushThumbQueue, 0);
  }
  return request;
}

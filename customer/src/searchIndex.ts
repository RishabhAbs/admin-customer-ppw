// Client-side search index.
//
// Goal: instant, per-keystroke search suggestions with (essentially) zero
// backend load. We fetch a *light* projection of the whole active catalog
// exactly ONCE per session, cache it in memory + localStorage (stale-while-
// revalidate, 12h TTL), and run all ranking in the browser. Typing never hits
// the network — only the first cold load (or a background refresh once the
// cache goes stale) does.
//
// If the catalog ever grows past a few tens of thousands of SKUs this should be
// swapped for a lean debounced /suggest endpoint — see the note in the PR/plan.

import { fetchProducts, transformStockItemToProduct } from './api';
import type { IndexItem } from './searchRanking';

// Re-export so existing importers can keep pulling both from './searchIndex'.
export { searchIndexQuery, suggestCorrection } from './searchRanking';
export type { IndexItem } from './searchRanking';

// Bump the version suffix whenever the shape of IndexItem changes so old caches
// are ignored rather than mis-parsed. Also bumped to force a rebuild when a stale
// cache (e.g. one built before newly-synced catalog rows existed) would otherwise
// linger for the full TTL.
const CACHE_KEY = 'ppw_search_index_v2';
const TTL_MS = 12 * 60 * 60 * 1000; // 12h

let memIndex: IndexItem[] | null = null;
let inflight: Promise<IndexItem[]> | null = null;

interface CacheShape {
  ts: number;
  items: IndexItem[];
}

function persist(items: IndexItem[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), items } as CacheShape));
  } catch {
    // localStorage quota exceeded / private mode — the in-memory cache still
    // works for this session, so this is non-fatal.
  }
}

function readCache(): CacheShape | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheShape;
    if (!parsed || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function build(): Promise<IndexItem[]> {
  // One request. limit is capped at 10000 server-side (see getStockItems); that
  // covers the whole active catalog for a store this size.
  const res = await fetchProducts({ page: 1, limit: 10000, search: '' });
  const items: IndexItem[] = res.data.map((raw) => {
    const p = transformStockItemToProduct(raw);
    return {
      id: p.id,
      masterid: p.masterid,
      name: p.name,
      brand: p.brand || '',
      category: p.category || '',
      price: p.price,
      mrp: p.mrp,
      nameLower: (p.name || '').toLowerCase(),
    };
  });
  memIndex = items;
  persist(items);
  return items;
}

// Stale-while-revalidate: return whatever we have instantly, refresh in the
// background when stale. Callers can await this on every keystroke — after the
// first resolve it's synchronous-fast (returns the in-memory array).
export function loadSearchIndex(): Promise<IndexItem[]> {
  if (memIndex) return Promise.resolve(memIndex);

  const cached = readCache();
  if (cached) {
    memIndex = cached.items;
    if (Date.now() - cached.ts > TTL_MS && !inflight) {
      inflight = build().finally(() => {
        inflight = null;
      });
    }
    return Promise.resolve(cached.items);
  }

  if (!inflight) {
    inflight = build().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

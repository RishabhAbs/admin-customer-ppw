// Pure, dependency-free search ranking. Kept separate from searchIndex.ts (which
// pulls in axios/Capacitor via ./api) so this logic can be unit-tested in plain
// Node and reused anywhere without side effects.

export interface IndexItem {
  id: number;
  masterid: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  mrp: number;
  nameLower: string;
  // The customer-facing "PPW Item Code" (ats_barcode). Enables item-code search
  // in the dropdown; empty string when the product has no code.
  itemCode: string;
}

// Currency / filler words that shouldn't constrain the match ("10 rupee pens"
// should find pens, not require the literal word "rupee").
const STOPWORDS = new Set([
  'rs', 'rs.', 'inr', 'rp', 'rupee', 'rupees', 'rupee.', 'rupees.',
  // Price-intent fillers: "5 MRP pen" / "pen under 20" describe a price, not a
  // word to match — drop them so the numeric part is treated as a price hint.
  'mrp', 'price', 'priced', 'cost', 'costs', 'costing',
  'under', 'below', 'upto', 'around', 'about', 'approx', 'near', '@',
  'the', 'a', 'an', 'of', 'for', 'and', '&', '/', '-',
]);

// Container / accessory head-nouns. In this catalog a product word usually acts
// as a *modifier* of one of these ("Pencil Box" = a box for pencils, "Pen Stand"
// = a stand for pens). When the user searches the bare product word ("pencil")
// they almost always want the item itself, not its accessories — so an item
// whose name contains one of these words that the user did NOT type is demoted
// below plain matches. Stored in singular form; item words are singularized
// before lookup. Only triggers when the accessory word is absent from the query,
// so searching "pencil box" still ranks boxes normally.
const ACCESSORY_WORDS = new Set([
  'box', 'pouch', 'case', 'cover', 'sharpener', 'battery', 'cell',
  'stand', 'holder', 'clip', 'sleeve', 'bag',
]);
const ACCESSORY_PENALTY = 8;

interface ParsedQuery {
  tokens: string[];      // meaningful text tokens
  priceTokens: number[]; // numeric tokens, treated as approximate price hints
  raw: string;           // full normalized query (for whole-string prefix boost)
}

function normalize(q: string): ParsedQuery {
  const raw = q.trim().toLowerCase().replace(/[₹]/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = raw.split(' ').filter(Boolean);
  const tokens: string[] = [];
  const priceTokens: number[] = [];
  for (const p of parts) {
    if (STOPWORDS.has(p)) continue;
    if (/^\d+(\.\d+)?$/.test(p)) {
      priceTokens.push(parseFloat(p));
      continue;
    }
    tokens.push(p);
  }
  return { tokens, priceTokens, raw };
}

// Numeric price hints in a query ("5 MRP pen" → [5]). Shared with the full
// results page so its "Relevance" ordering can float the closest-priced items
// to the top, matching the dropdown's price-aware behaviour.
export function extractPriceHints(query: string): number[] {
  return normalize(query).priceTokens;
}

// Cheap English singularization so "pens" matches "PEN", "boxes" matches "BOX".
function singular(t: string): string {
  if (t.length > 3 && t.endsWith('es')) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith('s')) return t.slice(0, -1);
  return t;
}

// Bounded Levenshtein edit distance. Returns the true distance when it is <=
// `max`, otherwise returns `max + 1` (and bails out early). Capping keeps the
// per-keystroke fuzzy pass cheap even over the whole catalog.
function levenshtein(a: string, b: string, max: number): number {
  const al = a.length;
  const bl = b.length;
  if (Math.abs(al - bl) > max) return max + 1;
  const prev = new Array<number>(bl + 1);
  const cur = new Array<number>(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;
  for (let i = 1; i <= al; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    const ai = a.charCodeAt(i - 1);
    for (let j = 1; j <= bl; j++) {
      const cost = ai === b.charCodeAt(j - 1) ? 0 : 1;
      let v = prev[j - 1] + cost;
      if (prev[j] + 1 < v) v = prev[j] + 1;
      if (cur[j - 1] + 1 < v) v = cur[j - 1] + 1;
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1; // whole row already past the cap
    for (let j = 0; j <= bl; j++) prev[j] = cur[j];
  }
  return prev[bl];
}

// Edit budget between a candidate catalog word and a typed token. Short tokens
// get no slack (too easy to match the wrong word). Long tokens (>=8) always
// allow 2 edits. For mid-length tokens (4-7) we allow 1 edit by default, but a
// 2nd edit when the two share a 2-char prefix — typos almost always preserve the
// start of a word ("flear" → "flair"), so the shared prefix keeps precision high
// while still catching double-typos.
function typoBudget(candidate: string, token: string): number {
  const len = token.length;
  if (len < 4) return 0;
  if (len >= 8) return 2;
  const sharePrefix =
    candidate.length >= 2 && token.length >= 2 && candidate.slice(0, 2) === token.slice(0, 2);
  return sharePrefix ? 2 : 1;
}

// Is `token` a typo of `candidate` within the allowed edit budget?
function typoMatch(candidate: string, token: string): boolean {
  const budget = typoBudget(candidate, token);
  if (budget === 0) return false;
  if (Math.abs(candidate.length - token.length) > budget) return false;
  return levenshtein(candidate, token, budget) <= budget;
}

// Does `token` fuzzily match any word in `words`?
function fuzzyWordMatch(words: string[], token: string): boolean {
  if (token.length < 4) return false;
  for (const w of words) {
    if (w.length < 3) continue;
    if (typoMatch(w, token)) return true;
  }
  return false;
}

// Strength of a single token's match against an item. 0 = no match.
function fieldMatch(item: IndexItem, token: string): number {
  const s = singular(token);
  const name = item.nameLower;
  const words = name.split(/\s+/);
  for (const w of words) {
    if (w === token || w === s) return 12;                // exact word
    if (w.startsWith(token) || w.startsWith(s)) return 9; // word-prefix
  }
  if (name.includes(token) || name.includes(s)) return 6; // substring in name
  const brand = item.brand.toLowerCase();
  if (brand.includes(token) || brand.includes(s)) return 4;
  const cat = item.category.toLowerCase();
  if (cat.includes(token) || cat.includes(s)) return 3;
  // Typo tolerance ("calcolator" → "calculator"). Ranked below every exact /
  // substring signal so a real match always wins, but above nothing so a
  // misspelled query still returns the intended product.
  if (fuzzyWordMatch(words, token)) return 5;
  return 0;
}

// Item codes / barcodes are matched on a stripped, case-folded form so that a
// query like "ppw-12 34" still hits the stored code "PPW1234".
function normCode(s: string): string {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Score an item's code against the (already normalized) query code. 0 = no
// match. Exact matches dominate everything else so the coded item floats to the
// very top; prefix/substring hits need a few chars to avoid noise.
function codeMatchScore(codeLower: string, codeQuery: string): number {
  if (!codeLower || !codeQuery) return 0;
  if (codeLower === codeQuery) return 1000;                            // exact item code
  if (codeQuery.length >= 3 && codeLower.startsWith(codeQuery)) return 200;
  if (codeQuery.length >= 4 && codeLower.includes(codeQuery)) return 60;
  return 0;
}

// Item codes/barcodes practically always contain a digit. Gating the code pass
// on a digit keeps ordinary word searches ("pen", "art") from accidentally
// matching alphabetic prefixes of some SKU.
function codeQueryOf(query: string): string {
  const c = normCode(query);
  return /\d/.test(c) ? c : '';
}

// Does the query exactly name a known item code? Used by the search box to skip
// spell-correction on a code (which would otherwise mangle it into a word).
export function isKnownItemCode(items: IndexItem[], query: string): boolean {
  const c = codeQueryOf(query);
  if (!c) return false;
  for (const it of items) {
    if (normCode(it.itemCode) === c) return true;
  }
  return false;
}

export function searchIndexQuery(items: IndexItem[], query: string, limit = 8): IndexItem[] {
  const { tokens, priceTokens, raw } = normalize(query);
  const codeQuery = codeQueryOf(query);
  if (!tokens.length && !priceTokens.length && !codeQuery) return [];

  const scored: { item: IndexItem; score: number }[] = [];

  // Singularized query tokens — used to tell whether an accessory word the item
  // carries was actually asked for (in which case we don't demote it).
  const querySingulars = new Set(tokens.map(singular));

  // The whole-query prefix boost is only meaningful for multi-term queries
  // ("blue gel" → "Blue Gel Pen"). For a single word, name.startsWith(word) just
  // rewards modifier-first names ("pencil" → "Pencil Box"), burying the actual
  // product, so we gate it to queries with 2+ text tokens.
  const multiTerm = tokens.length >= 2;

  for (const item of items) {
    let score = 0;
    let allTextMatched = true;

    // Item-code match is independent of the text tokens (the code rarely appears
    // in the product name), so score it up front and keep code hits even when the
    // text/price passes below reject the item.
    const codeScore = codeMatchScore(normCode(item.itemCode), codeQuery);

    if (multiTerm && raw && item.nameLower.startsWith(raw)) score += 30;

    for (const t of tokens) {
      const m = fieldMatch(item, t);
      if (m === 0) {
        allTextMatched = false;
        break;
      }
      score += m;
    }
    if (!allTextMatched) {
      if (codeScore > 0) scored.push({ item, score: codeScore });
      continue;
    }

    // Demote accessories the user didn't ask for so "pencil" surfaces pencils
    // above "pencil box" / "pencil pouch" / "pencil battery".
    for (const w of item.nameLower.split(/\s+/)) {
      const sw = singular(w);
      if (ACCESSORY_WORDS.has(sw) && !querySingulars.has(sw)) {
        score -= ACCESSORY_PENALTY;
        break;
      }
    }

    // Price hints. When the query has text tokens, price is only a *booster* (so
    // "10 rupee pens" still returns ₹12 pens). When the query is purely numeric,
    // require a price match so a bare "10" doesn't dump the whole catalog.
    let priceMatched = false;
    for (const pt of priceTokens) {
      if (item.mrp && Math.abs(item.mrp - pt) < 0.5) {
        score += 10;
        priceMatched = true;
      } else if (item.mrp && pt > 0 && Math.abs(item.mrp - pt) <= pt * 0.2) {
        score += 4; // within 20%
        priceMatched = true;
      }
    }
    if (tokens.length === 0 && !priceMatched && codeScore === 0) continue;

    // An exact/partial item-code hit outranks a coincidental name/price match.
    score += codeScore;

    // Tie-break: shorter (more specific) names edge ahead.
    score += Math.max(0, 5 - item.name.length / 20);

    scored.push({ item, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.item);
}

// ── Spell correction ─────────────────────────────────────────────────────────
// The dropdown ranking above already tolerates typos, but the full results page
// sends the raw term to the backend (plain LIKE match), so a misspelling there
// returns 0 products. `suggestCorrection` rewrites each typo'd token to the
// closest real word in the catalog vocabulary so the corrected term can be sent
// instead. Returns null when nothing needed fixing (every token is a real word),
// so callers can cheaply tell "leave it alone" from "did you mean …".

// Vocabulary (all name/brand/category words) cached per index array. The index
// is a stable session-lived array, so this builds at most once.
const vocabCache = new WeakMap<IndexItem[], Set<string>>();

function vocabOf(items: IndexItem[]): Set<string> {
  const cached = vocabCache.get(items);
  if (cached) return cached;
  const vocab = new Set<string>();
  const add = (field: string) => {
    for (const w of field.toLowerCase().split(/\s+/)) {
      if (w.length >= 3) vocab.add(w);
    }
  };
  for (const it of items) {
    add(it.nameLower);
    if (it.brand) add(it.brand);
    if (it.category) add(it.category);
  }
  vocabCache.set(items, vocab);
  return vocab;
}

export function suggestCorrection(items: IndexItem[], query: string): string | null {
  const { tokens } = normalize(query);
  if (!tokens.length) return null;
  const vocab = vocabOf(items);
  let changed = false;

  const out = tokens.map((tok) => {
    // Already a real word (or its singular is) — nothing to fix.
    if (vocab.has(tok) || vocab.has(singular(tok))) return tok;
    if (tok.length < 4) return tok; // too short to correct safely

    // Nearest vocabulary word within its per-candidate typo budget.
    let best: string | null = null;
    let bestDist = Infinity;
    for (const w of vocab) {
      const budget = typoBudget(w, tok);
      if (budget === 0) continue;
      if (Math.abs(w.length - tok.length) > budget) continue;
      const d = levenshtein(w, tok, budget);
      if (d <= budget && d < bestDist) {
        bestDist = d;
        best = w;
        if (d === 1) break; // can't get closer without an exact match
      }
    }
    if (best) {
      changed = true;
      return best;
    }
    return tok;
  });

  return changed ? out.join(' ') : null;
}

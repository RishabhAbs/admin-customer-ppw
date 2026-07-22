import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import { loadSearchIndex, searchIndexQuery, suggestCorrection, isKnownItemCode, type IndexItem } from '../searchIndex';

// Search input + instant suggestion dropdown. All matching happens client-side
// against the cached catalog index (see searchIndex.ts), so typing never hits
// the backend. Enter / the Search button navigates to the full results page;
// picking a suggestion jumps straight to that product.
export default function SearchAutocomplete({ variant = 'desktop' }: { variant?: 'desktop' | 'mobile' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState(() => new URLSearchParams(location.search).get('search') ?? '');
  const [results, setResults] = useState<IndexItem[]>([]);
  const [open, setOpen] = useState(false);
  // `active` = keyboard selection (ArrowUp/Down). Drives what Enter does.
  // `hover`  = pointer highlight only; must NOT influence Enter, otherwise the
  // dropdown opening under the cursor would make Enter jump to a single product
  // instead of searching all matches.
  const [active, setActive] = useState(-1);
  const [hover, setHover] = useState(-1);
  const boxRef = useRef<HTMLFormElement>(null);
  // Latest resolved index, so submit() can spell-correct synchronously without
  // awaiting (by submit time the index is already warm from the mount effect).
  const idxRef = useRef<IndexItem[]>([]);

  // Keep the box in sync with the URL (back/forward, navigating Home clears it).
  useEffect(() => {
    setSearch(new URLSearchParams(location.search).get('search') ?? '');
  }, [location.search]);

  // Warm the index on mount so the first keystroke is instant.
  useEffect(() => {
    loadSearchIndex().then((idx) => { idxRef.current = idx; }).catch(() => {});
  }, []);

  // Per-keystroke suggestions — client-side only. The 90ms timer just smooths
  // rendering while typing fast; it is NOT a network debounce.
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const idx = await loadSearchIndex().catch(() => [] as IndexItem[]);
      if (cancelled) return;
      idxRef.current = idx;
      setResults(searchIndexQuery(idx, q, 8));
      setActive(-1);
      setHover(-1);
    }, 90);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [search]);

  // Close the dropdown on any outside click.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const submit = (term = search) => {
    const q = term.trim();
    if (!q) return;
    setOpen(false);
    // Autocorrect typos before hitting the backend (which only does a plain
    // substring match). suggestCorrection returns null when the term is already
    // spelled fine, so correctly-typed queries pass through untouched. Skip
    // correction for an item code, otherwise a code like "PPW1234" would be
    // "corrected" into the nearest catalog word.
    const isCode = idxRef.current.length ? isKnownItemCode(idxRef.current, q) : false;
    const corrected = !isCode && idxRef.current.length ? suggestCorrection(idxRef.current, q) : null;
    navigate(`/products?search=${encodeURIComponent(corrected || q)}`);
  };

  const pick = (item: IndexItem) => {
    setOpen(false);
    setSearch('');
    navigate(`/products/${item.id}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const hasList = open && results.length > 0;
    if (e.key === 'Enter') {
      e.preventDefault();
      hasList && active >= 0 ? pick(results[active]) : submit();
      return;
    }
    if (!hasList) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
      setHover(-1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
      setHover(-1);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const money = (n: number) => `₹${Number.isInteger(n) ? n : n.toFixed(2)}`;
  const showDrop = open && search.trim().length >= 2;

  // ── Dropdown (shared between variants) ──
  const dropdown = showDrop && (
    <div
      className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl overflow-hidden z-50 animate-fade-in"
      style={{ border: '1px solid #E8E8E8', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
    >
      {results.length > 0 ? (
        <>
          <ul className="max-h-[60vh] overflow-y-auto py-1">
            {results.map((item, i) => (
              <li key={item.id}>
                <button
                  type="button"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover((h) => (h === i ? -1 : h))}
                  onMouseDown={(e) => e.preventDefault()} // keep input focus; fire before blur
                  onClick={() => pick(item)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors"
                  style={{ background: active === i || hover === i ? '#F3FAF4' : 'transparent' }}
                >
                  <Search size={14} className="flex-shrink-0" style={{ color: '#B7B7B7' }} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-gray-800 truncate">{item.name}</span>
                    {(item.brand || item.category) && (
                      <span className="block text-[11px] truncate" style={{ color: '#9E9E9E' }}>
                        {[item.brand, item.category].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </span>
                  {item.price > 0 && (
                    <span className="flex-shrink-0 text-sm font-bold" style={{ color: '#0C831F' }}>
                      {money(item.price)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => submit()}
            className="w-full px-3.5 py-2.5 text-left text-xs font-bold transition-colors hover:bg-gray-50"
            style={{ color: '#0C831F', borderTop: '1px solid #F2F2F2' }}
          >
            See all results for “{search.trim()}”
          </button>
        </>
      ) : (
        <div className="px-3.5 py-4 text-center text-xs font-medium" style={{ color: '#9E9E9E' }}>
          No matches — press Enter to search anyway
        </div>
      )}
    </div>
  );

  if (variant === 'mobile') {
    return (
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} ref={boxRef} className="relative">
        <div className="flex items-center rounded-lg overflow-hidden" style={{ background: '#F2F2F2', border: '1.5px solid #E8E8E8' }}>
          <Search size={14} className="ml-3 flex-shrink-0" style={{ color: '#9E9E9E' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Search stationery, notebooks, pens…"
            className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none placeholder:text-gray-400 text-gray-800"
          />
        </div>
        {dropdown}
      </form>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} ref={boxRef} className="flex-1 hidden md:block relative">
      <div className="flex items-center w-full rounded-lg overflow-hidden" style={{ background: '#F2F2F2', border: '1.5px solid #E8E8E8' }}>
        <Search size={16} className="ml-3.5 flex-shrink-0" style={{ color: '#9E9E9E' }} />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search for pens, notebooks, art supplies…"
          className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none text-gray-800 placeholder:text-gray-400 font-medium"
        />
        <button
          type="submit"
          className="px-4 h-full text-sm font-bold flex-shrink-0 transition-colors"
          style={{ background: '#0C831F', color: 'white', minHeight: 40 }}
        >
          Search
        </button>
      </div>
      {dropdown}
    </form>
  );
}

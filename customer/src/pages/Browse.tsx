import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { fetchBrands, fetchCategories, fetchBrandThumbnails, fetchCategoryThumbnails } from '../api';

const CATEGORY_EMOJIS: Record<string, string> = {
  'Writing Instruments': '✏️',
  'Notebooks & Diaries': '📒',
  'Art & Craft':         '🎨',
  'Office Supplies':     '📎',
  'Paper Products':      '📄',
  'Geometry & Math':     '📐',
  'Files & Folders':     '📁',
  'Bags & Pouches':      '🎒',
};

const CATEGORY_BGS = ['#FFF9E6', '#FFF3E0', '#FCE4EC', '#E8F5E9', '#E3F2FD', '#EDE7F6', '#FFF8E1', '#F3E5F5'];

function getCategoryEmoji(name: string) {
  return CATEGORY_EMOJIS[name] || '📦';
}

function getBrandEmoji(name: string) {
  const n = name.toLowerCase();
  if (n.includes('paper') || n.includes('notebook')) return '📓';
  if (n.includes('pen') || n.includes('pencil') || n.includes('writing')) return '✒️';
  if (n.includes('art') || n.includes('paint') || n.includes('color')) return '🎨';
  if (n.includes('office') || n.includes('file')) return '📁';
  if (n.includes('bag') || n.includes('case')) return '🎒';
  return '🏷️';
}

function getColor(index: number) {
  return CATEGORY_BGS[index % CATEGORY_BGS.length];
}

export default function Browse({ mode }: { mode: 'brand' | 'category' }) {
  const [searchParams] = useSearchParams();
  const brand = mode === 'category' ? (searchParams.get('brand') || '') : '';
  const [items, setItems] = useState<string[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const load = mode === 'brand' ? fetchBrands() : fetchCategories('', brand);
    const loadThumbs = mode === 'brand' ? fetchBrandThumbnails() : fetchCategoryThumbnails();
    load.then(list => { setItems(list); setLoading(false); });
    loadThumbs.then(setThumbs);
  }, [mode, brand]);

  const title = mode === 'brand'
    ? 'All Brands'
    : brand ? `${brand} · Categories` : 'All Categories';
  const emojiFor = mode === 'brand' ? getBrandEmoji : getCategoryEmoji;
  const linkFor = (item: string) =>
    mode === 'brand'
      ? `/categories?brand=${encodeURIComponent(item)}`
      : `/products?category=${encodeURIComponent(item)}${brand ? `&brand=${encodeURIComponent(brand)}` : ''}`;

  return (
    <div className="px-3 sm:px-4 pt-3 pb-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl p-4 md:p-5" style={{ border: '1px solid #E8E8E8' }}>

        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Link to="/"
            className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-all hover:bg-gray-100"
            style={{ color: '#0C831F' }}>
            <ChevronLeft size={18} strokeWidth={2.5} />
          </Link>
          <span className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: '#0C831F' }} />
          <h1 className="text-base md:text-lg font-extrabold text-gray-900">{title}</h1>
          {!loading && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md"
              style={{ background: '#EFF7EF', color: '#0C831F' }}>
              {items.length}
            </span>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 sm:gap-3">
            {[...Array(16)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl bg-gray-100" style={{ height: 96 }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No {mode === 'brand' ? 'brands' : 'categories'} found.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 sm:gap-3">
            {items.map((item, i) => (
              <Link
                key={item}
                to={linkFor(item)}
                className="flex flex-col items-center gap-1.5 py-3 px-1.5 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-sm group"
                style={{ background: getColor(i), minHeight: 96 }}>
                {thumbs[item] ? (
                  <img src={thumbs[item]} alt="" className="w-12 h-12 object-contain group-hover:scale-110 transition-transform duration-200 flex-shrink-0" />
                ) : (
                  <span className="text-2xl group-hover:scale-110 transition-transform duration-200 leading-none flex-shrink-0">{emojiFor(item)}</span>
                )}
                <span className="text-[10px] font-bold text-center leading-tight text-gray-800 w-full"
                  style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {item}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

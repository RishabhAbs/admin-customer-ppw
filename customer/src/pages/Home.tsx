import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard, { type Product } from '../components/ProductCard';
import PostLoginSheet from '../components/PostLoginSheet';

import { fetchProducts, transformStockItemToProduct, fetchBrands, fetchCategories, fetchThumbnails, fetchBrandThumbnails, fetchCategoryThumbnails } from '../api';

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

/* ── COMPONENT ── */

export default function Home() {
  const [showSheet, setShowSheet] = useState(false);
  const [shopTab, setShopTab]       = useState<'brand' | 'category'>('brand');
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [bsPage, setBsPage] = useState(1);
  const [bsTotalPages, setBsTotalPages] = useState(1);
  const [bsLoading, setBsLoading] = useState(true);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [naPage, setNaPage] = useState(1);
  const [naTotalPages, setNaTotalPages] = useState(1);
  const [naLoading, setNaLoading] = useState(true);
  const [dynamicBrands, setDynamicBrands] = useState<string[]>([]);
  const [dynamicCategories, setDynamicCategories] = useState<string[]>([]);
  const [brandThumbs, setBrandThumbs] = useState<Record<string, string>>({});
  const [categoryThumbs, setCategoryThumbs] = useState<Record<string, string>>({});
  const [drillBrand, setDrillBrand] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    if ((location.state as any)?.justLoggedIn) {
      setShowSheet(true);
      window.history.replaceState({}, '');
    }
  }, []);


  // Loading Home Data (brands/categories)
  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const bList = await fetchBrands();
        setDynamicBrands(bList.slice(0, 16));

        fetchBrandThumbnails().then(setBrandThumbs);
        fetchCategoryThumbnails().then(setCategoryThumbs);
      } catch (error) {
        console.error('Failed to load home data:', error);
      }
    };
    loadHomeData();
  }, []);

  // Best Sellers — paginated, 8 per page
  useEffect(() => {
    setBsLoading(true);
    fetchProducts({ page: bsPage, limit: 8 })
      .then(res => {
        const transformed = res.data.map(transformStockItemToProduct);
        setBestSellers(transformed);
        setBsTotalPages(res.pagination.totalPages);

        const masterids = res.data.map(i => i.masterid).filter(Boolean) as string[];
        fetchThumbnails(masterids).then(thumbs => {
          setBestSellers(prev => prev.map(p => (p.masterid && thumbs[p.masterid] ? { ...p, image: thumbs[p.masterid] } : p)));
        });
      })
      .catch(error => console.error('Failed to load best sellers:', error))
      .finally(() => setBsLoading(false));
  }, [bsPage]);

  const handleBsPageChange = (p: number) => {
    if (p < 1 || p > bsTotalPages || p === bsPage) return;
    setBsPage(p);
  };

  // New Arrivals — paginated, 8 per page. Offset by one API page so it shows
  // items *after* the Best Sellers first page (preserves the old "after best
  // sellers" ordering) instead of duplicating them.
  useEffect(() => {
    setNaLoading(true);
    fetchProducts({ page: naPage + 1, limit: 8 })
      .then(res => {
        const transformed = res.data.map(transformStockItemToProduct);
        setNewArrivals(transformed);
        setNaTotalPages(Math.max(1, res.pagination.totalPages - 1));

        const masterids = res.data.map(i => i.masterid).filter(Boolean) as string[];
        fetchThumbnails(masterids).then(thumbs => {
          setNewArrivals(prev => prev.map(p => (p.masterid && thumbs[p.masterid] ? { ...p, image: thumbs[p.masterid] } : p)));
        });
      })
      .catch(error => console.error('Failed to load new arrivals:', error))
      .finally(() => setNaLoading(false));
  }, [naPage]);

  const handleNaPageChange = (p: number) => {
    if (p < 1 || p > naTotalPages || p === naPage) return;
    setNaPage(p);
  };

  // Drill-down logic for categories
  useEffect(() => {
    fetchCategories('', drillBrand ?? '').then(res => {
      setDynamicCategories(res.slice(0, 16));
    });
  }, [drillBrand]);

  return (
    <div className="pb-1 md:pb-2">

      {/* ═══════════ 3. SHOP BY BRAND / CATEGORY ═══════════ */}
      <div className="px-3 sm:px-4 pt-3 max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #E8E8E8' }}>

          {/* Header */}
          <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
            {/* Tab switcher */}
            <div className="flex p-0.5 rounded-xl gap-0.5" style={{ background: '#F2F2F2' }}>
              <button
                onClick={() => setShopTab('brand')}
                className="px-3 py-1.5 rounded-[10px] text-[11px] font-bold transition-all"
                style={shopTab === 'brand' ? { background: '#0C831F', color: 'white' } : { background: 'transparent', color: '#666' }}>
                By Brand
              </button>
              <button
                onClick={() => setShopTab('category')}
                className="px-3 py-1.5 rounded-[10px] text-[11px] font-bold transition-all relative"
                style={shopTab === 'category' ? { background: '#0C831F', color: 'white' } : { background: 'transparent', color: '#666' }}>
                By Category {drillBrand && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 border border-white" />}
              </button>
            </div>
            {drillBrand ? (
              <button
                onClick={() => setDrillBrand(null)}
                className="flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1.5 rounded-lg active:scale-95 transition-all truncate max-w-[120px]"
                style={{ background: '#EFF7EF', color: '#0C831F' }}>
                <ChevronLeft size={10} strokeWidth={3} /> {drillBrand}
              </button>
            ) : (
              <Link
                to={shopTab === 'brand' ? '/brands' : '/categories'}
                className="flex items-center gap-1 text-[11px] font-bold hover:gap-1.5 transition-all flex-shrink-0"
                style={{ color: '#0C831F' }}>
                See all <ArrowRight size={11} />
              </Link>
            )}
          </div>

          {/* 2-row horizontal scroll grid */}
          <div
            className="scrollbar-hide px-4 pb-4"
            style={{ display: 'grid', gridTemplateRows: 'repeat(2, auto)', gridAutoFlow: 'column', overflowX: 'auto', gap: 10 }}>

            {shopTab === 'brand'
              /* Brand grid: clicking a brand filters the category tab */
              ? dynamicBrands.map((b, i) => (
                  <Link
                    key={b}
                    to={`/categories?brand=${encodeURIComponent(b)}`}
                    className="flex flex-col items-center gap-1.5 py-2.5 px-1.5 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-sm group"
                    style={{ width: 80, background: getColor(i), minHeight: 80 }}>
                    {brandThumbs[b] ? (
                      <img src={brandThumbs[b]} alt="" className="w-11 h-11 object-contain group-hover:scale-110 transition-transform duration-200 flex-shrink-0" />
                    ) : (
                      <span className="text-2xl group-hover:scale-110 transition-transform duration-200 leading-none flex-shrink-0">{getBrandEmoji(b)}</span>
                    )}
                    <span className="text-[9px] font-bold text-center leading-tight text-gray-800 w-full" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{b}</span>
                  </Link>
                ))
              /* Category grid: clicking a category navigates to products */
              : dynamicCategories.map((cat, i) => (
                  <Link
                    key={cat}
                    to={`/products?category=${encodeURIComponent(cat)}${drillBrand ? `&brand=${encodeURIComponent(drillBrand)}` : ''}`}
                    className="flex flex-col items-center gap-1.5 py-2.5 px-1.5 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-sm group"
                    style={{ width: 80, background: getColor(i), minHeight: 80 }}>
                    {categoryThumbs[cat] ? (
                      <img src={categoryThumbs[cat]} alt="" className="w-11 h-11 object-contain group-hover:scale-110 transition-transform duration-200 flex-shrink-0" />
                    ) : (
                      <span className="text-2xl group-hover:scale-110 transition-transform duration-200 leading-none flex-shrink-0">{getCategoryEmoji(cat)}</span>
                    )}
                    <span className="text-[9px] font-bold text-center leading-tight text-gray-800 w-full" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{cat}</span>
                  </Link>
                ))
            }
          </div>
        </div>
      </div>

      {/* ═══════════ 4. BEST SELLERS ═══════════ */}
      <div className="px-3 sm:px-4 pt-3 max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl p-4" style={{ border: '1px solid #E8E8E8' }}>
          <SectionHeader title="Best Sellers" badge="🔥 HOT" link="/products" />
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 snap-x md:grid md:grid-cols-4 md:overflow-visible md:gap-4">
            {bsLoading ? (
              [...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl bg-gray-100 flex-shrink-0 w-[44vw] sm:w-[38vw] md:w-auto" style={{ height: 260 }}></div>
              ))
            ) : (
              bestSellers.map(p => (
                <div key={p.id} className="snap-start flex-shrink-0 w-[44vw] sm:w-[38vw] md:w-auto">
                  <ProductCard product={p} />
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {!bsLoading && bsTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button disabled={bsPage === 1} onClick={() => handleBsPageChange(bsPage - 1)}
                className="p-2 rounded-lg bg-white border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-1">
                {[...Array(Math.min(5, bsTotalPages))].map((_, i) => {
                  let pageNum = bsPage;
                  if (bsPage <= 3)                    pageNum = i + 1;
                  else if (bsPage >= bsTotalPages - 2) pageNum = bsTotalPages - 4 + i;
                  else                                 pageNum = bsPage - 2 + i;
                  if (pageNum <= 0 || pageNum > bsTotalPages) return null;
                  return (
                    <button key={pageNum} onClick={() => handleBsPageChange(pageNum)}
                      className={`w-9 h-9 rounded-lg font-bold text-sm transition-all ${
                        bsPage === pageNum
                          ? 'bg-green-700 text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}>
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button disabled={bsPage === bsTotalPages} onClick={() => handleBsPageChange(bsPage + 1)}
                className="p-2 rounded-lg bg-white border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ 6. NEW ARRIVALS ═══════════ */}
      <div className="px-3 sm:px-4 pt-3 max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl p-4" style={{ border: '1px solid #E8E8E8' }}>
          <SectionHeader title="New Arrivals" badge="✨ NEW" link="/products" />
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 snap-x md:grid md:grid-cols-4 md:overflow-visible md:gap-4">
            {naLoading ? (
              [...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl bg-gray-100 flex-shrink-0 w-[44vw] sm:w-[38vw] md:w-auto" style={{ height: 260 }}></div>
              ))
            ) : (
              newArrivals.map(p => (
                <div key={p.id} className="snap-start flex-shrink-0 w-[44vw] sm:w-[38vw] md:w-auto">
                  <ProductCard product={p} />
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {!naLoading && naTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button disabled={naPage === 1} onClick={() => handleNaPageChange(naPage - 1)}
                className="p-2 rounded-lg bg-white border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-1">
                {[...Array(Math.min(5, naTotalPages))].map((_, i) => {
                  let pageNum = naPage;
                  if (naPage <= 3)                    pageNum = i + 1;
                  else if (naPage >= naTotalPages - 2) pageNum = naTotalPages - 4 + i;
                  else                                 pageNum = naPage - 2 + i;
                  if (pageNum <= 0 || pageNum > naTotalPages) return null;
                  return (
                    <button key={pageNum} onClick={() => handleNaPageChange(pageNum)}
                      className={`w-9 h-9 rounded-lg font-bold text-sm transition-all ${
                        naPage === pageNum
                          ? 'bg-green-700 text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}>
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button disabled={naPage === naTotalPages} onClick={() => handleNaPageChange(naPage + 1)}
                className="p-2 rounded-lg bg-white border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {showSheet && <PostLoginSheet onClose={() => setShowSheet(false)} />}

    </div>
  );
}

/* ── Section Header ── */
function SectionHeader({ title, badge, link }: { title: string; badge?: string; link: string }) {
  return (
    <div className="flex items-center justify-between mb-3 gap-2">
      <div className="flex items-center gap-2">
        <span className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: '#0C831F' }} />
        <h2 className="text-sm md:text-base font-extrabold text-gray-900">{title}</h2>
        {badge && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
            style={{ background: '#EFF7EF', color: '#0C831F' }}>
            {badge}
          </span>
        )}
      </div>
      <Link to={link}
        className="flex items-center gap-1 text-[11px] font-bold transition-all hover:gap-1.5 flex-shrink-0"
        style={{ color: '#0C831F' }}>
        See all <ArrowRight size={11} />
      </Link>
    </div>
  );
}

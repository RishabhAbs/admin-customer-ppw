import { useState, useEffect } from 'react';
import ProductCard, { type Product } from './ProductCard';
import {
  fetchProducts,
  fetchThumbnails,
  transformStockItemToProduct,
} from '../api';

interface RelatedItemsProps {
  /** Heading shown above the strip. */
  title?: string;
  /** Category to find related items in (preferred matching key). */
  category?: string;
  /** Fallback search term when no category is available (e.g. an item name). */
  seedName?: string;
  /** Product ids to exclude (already shown / already in cart). */
  excludeIds?: number[];
  /** Max number of related items to display. */
  limit?: number;
}

/**
 * "Quick Add" strip of related products. Given a seed category (or a fallback
 * search term) it fetches other products of the same kind and renders them in a
 * horizontally scrollable row of ProductCards, so the shopper can add similar
 * items (e.g. search "pencil" -> other pencils) without leaving the page.
 */
export default function RelatedItems({
  title = 'Quick Add — Similar Items',
  category,
  seedName,
  excludeIds = [],
  limit = 12,
}: RelatedItemsProps) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // Nothing to match on — skip the network call entirely.
      if (!category && !seedName) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetchProducts(
          category
            ? { category, limit: limit + excludeIds.length + 4 }
            : { search: seedName, limit: limit + excludeIds.length + 4 },
        );
        const exclude = new Set(excludeIds);
        const mapped: Product[] = res.data
          .map(transformStockItemToProduct)
          .filter((p: Product) => !exclude.has(p.id))
          .slice(0, limit);

        if (!cancelled) setItems(mapped);

        // Hydrate thumbnails the same way the listing page does.
        const masterids = res.data
          .map(i => i.masterid)
          .filter(Boolean) as string[];
        if (masterids.length) {
          const thumbs = await fetchThumbnails(masterids);
          if (!cancelled) {
            setItems(prev =>
              prev.map(p =>
                p.masterid && thumbs[p.masterid]
                  ? { ...p, image: thumbs[p.masterid] }
                  : p,
              ),
            );
          }
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // excludeIds compared by content (join) to avoid re-fetching when only the
    // array identity changes between renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, seedName, limit, excludeIds.join(',')]);

  if (loading) {
    return (
      <section className="mt-6">
        <h2 className="text-sm font-extrabold text-gray-900 mb-3">{title}</h2>
        <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl bg-gray-100 flex-shrink-0"
              style={{ width: 160, height: 280 }}
            />
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="text-sm font-extrabold text-gray-900 mb-3">{title}</h2>
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
        {items.map(p => (
          <div key={p.id} className="flex-shrink-0" style={{ width: 160 }}>
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}

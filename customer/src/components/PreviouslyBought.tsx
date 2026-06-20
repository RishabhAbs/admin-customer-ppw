import { useState, useEffect } from 'react';
import ProductCard, { type Product } from './ProductCard';
import { useOrders } from '../context/OrderContext';
import {
  fetchProducts,
  fetchThumbnails,
  transformStockItemToProduct,
} from '../api';

interface PreviouslyBoughtProps {
  /** Heading shown above the strip. */
  title?: string;
  /** Product ids to exclude (e.g. already in cart). */
  excludeIds?: number[];
  /** How many items to show in the collapsed strip (before "View More"). */
  limit?: number;
}

/**
 * "Previously Bought" strip on the cart page. Reads the signed-in customer's
 * order history, takes the most recent DISTINCT item names (capped), resolves
 * each name to a real product (order rows only store name + price, not a
 * product id), and renders them as ProductCards so they can be re-added.
 */
export default function PreviouslyBought({
  title = 'Previously Bought',
  excludeIds = [],
  limit = 12,
}: PreviouslyBoughtProps) {
  const { orders } = useOrders();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  // Most-recent-first distinct item names across all past orders.
  // `orders` is already sorted newest-first by OrderContext.
  const names: string[] = [];
  const seen = new Set<string>();
  for (const order of orders) {
    for (const it of order.items) {
      const key = (it.name || '').trim();
      if (key && !seen.has(key.toLowerCase())) {
        seen.add(key.toLowerCase());
        names.push(key);
      }
    }
  }
  // Resolve ALL distinct past items; "View More" reveals the full list.
  const wanted = names;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (wanted.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const exclude = new Set(excludeIds);
        const settled = await Promise.all(
          wanted.map(async name => {
            try {
              const res = await fetchProducts({ search: name, limit: 1 });
              const row = res.data[0];
              return row ? (transformStockItemToProduct(row) as Product) : null;
            } catch {
              return null;
            }
          }),
        );

        // Drop misses, items already in cart, and any duplicate product ids.
        const byId = new Map<number, Product>();
        for (const p of settled) {
          if (p && !exclude.has(p.id) && !byId.has(p.id)) byId.set(p.id, p);
        }
        const resolved = [...byId.values()];

        if (!cancelled) setItems(resolved);

        // Hydrate thumbnails (same pattern as the listing page).
        const masterids = resolved
          .map(p => p.masterid)
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
    // Compare list contents by value to avoid refetching on identity churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted.join('|'), limit, excludeIds.join(',')]);

  // Nothing to show (no history, or none resolved) — render nothing.
  if (!loading && items.length === 0) return null;

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

  const hasMore = items.length > limit;
  const visible = expanded ? items : items.slice(0, limit);

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-extrabold text-gray-900">{title}</h2>
        {hasMore && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs font-bold transition-colors hover:opacity-80"
            style={{ color: '#a96f46' }}
          >
            {expanded ? 'Show Less' : `View More (${items.length})`}
          </button>
        )}
      </div>

      {expanded ? (
        // Full list as a wrapping grid so every purchased item is browsable.
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
          {visible.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        // Collapsed: horizontal scroll strip.
        <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
          {visible.map(p => (
            <div key={p.id} className="flex-shrink-0" style={{ width: 160 }}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

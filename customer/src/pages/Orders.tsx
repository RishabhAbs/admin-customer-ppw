import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Truck, CheckCircle, Clock, XCircle, Package, MapPin, CalendarClock } from 'lucide-react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';

const STATUSES: Record<string, { label: string; bg: string; color: string; icon: React.ReactElement }> = {
  placed:    { label: 'Order Placed', bg: 'rgba(59,130,246,0.08)',  color: '#2563eb', icon: <Clock size={13} /> },
  pending:   { label: 'Order Placed', bg: 'rgba(59,130,246,0.08)',  color: '#2563eb', icon: <Clock size={13} /> },
  shipped:   { label: 'Shipped',      bg: 'rgba(249,115,22,0.08)', color: '#ea580c', icon: <Truck size={13} /> },
  delivered: { label: 'Delivered',    bg: 'rgba(34,197,94,0.08)',  color: '#16a34a', icon: <CheckCircle size={13} /> },
  completed: { label: 'Pending',      bg: 'rgba(59,130,246,0.08)',  color: '#2563eb', icon: <Clock size={13} /> },
  fetched:   { label: 'Order Completed', bg: 'rgba(34,197,94,0.08)',  color: '#16a34a', icon: <CheckCircle size={13} /> },
  cancelled: { label: 'Cancelled',    bg: 'rgba(239,68,68,0.08)',  color: '#dc2626', icon: <XCircle size={13} /> },
};

// Format an ISO timestamp into "19 Jun 2026, 05:20 AM" (date + time).
function formatPlacedAt(iso?: string, fallback?: string): string {
  if (!iso) return fallback ?? '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return fallback ?? '';
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export default function Orders() {
  const navigate = useNavigate();
  const { orders } = useOrders();
  const { isLoggedIn } = useAuth();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const Header = () => (
    <div className="bg-white px-4 py-4 sticky top-0 z-10 flex items-center gap-3 border-b border-gray-100 shadow-sm">
      <button onClick={() => navigate(-1)} className="p-1.5 -ml-1 rounded-full hover:bg-gray-50 transition-colors pointer-events-auto">
        <ChevronRight size={22} className="rotate-180" style={{ color: '#292524' }} />
      </button>
      <h1 className="text-lg font-extrabold" style={{ color: '#292524' }}>My Orders</h1>
    </div>
  );

  if (!isLoggedIn) {
    return (
      <div className="bg-[#faf7f4] min-h-screen pb-16">
        <Header />
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <span className="text-6xl block mb-4">🔐</span>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#1C1C1C' }}>Sign in to view orders</h2>
          <p className="text-sm mb-6" style={{ color: '#666' }}>Your order history will appear here.</p>
          <button onClick={() => navigate('/login')}
            className="px-8 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
            style={{ background: '#0C831F', color: 'white' }}>
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (orders.length === 0) return (
    <div className="bg-[#faf7f4] min-h-screen pb-16">
      <Header />
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <span className="text-7xl block mb-5">📦</span>
        <h2 className="text-xl font-bold mb-2" style={{ color: '#1C1C1C' }}>No orders yet</h2>
        <p className="text-sm mb-6" style={{ color: '#666' }}>Your stationery orders will appear here.</p>
        <button onClick={() => navigate('/products')}
          className="px-8 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
          style={{ background: '#0C831F', color: 'white' }}>
          Start Shopping
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-[#faf7f4] min-h-screen pb-16">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2.5 mb-5">
          <Package size={20} style={{ color: '#0C831F' }} />
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#1C1C1C' }}>My Orders</h1>
            <p className="text-sm" style={{ color: '#666' }}>{orders.length} order{orders.length !== 1 ? 's' : ''} placed</p>
          </div>
        </div>

        <div className="space-y-4">
          {orders.map(order => {
            const s = STATUSES[order.status] ?? STATUSES.placed;
            const isOpen = expandedId === order.id;
            const a = order.address;
            const fullAddress = [a.address, a.city, a.state, a.pincode].filter(Boolean).join(', ');
            return (
              <div key={order.id}
                className="rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md bg-white"
                style={{ border: '1px solid #E8E8E8' }}
                onClick={() => setExpandedId(isOpen ? null : order.id)}>

                {/* Header (always visible) */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#1C1C1C' }}>Order #{order.id}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#999' }}>
                      {formatPlacedAt(order.placedAt, String(order.date))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[11px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wide"
                      style={{ background: s.bg, color: s.color }}>
                      {s.icon} {s.label}
                    </span>
                    <ChevronRight size={16}
                      className="transition-transform"
                      style={{ color: '#CCC', transform: isOpen ? 'rotate(90deg)' : 'none' }} />
                  </div>
                </div>

                {/* Details (revealed on click) */}
                {isOpen && (
                  <div className="mt-4">

                    {/* Placed date + time */}
                    <div className="flex items-start gap-2 mb-3 pb-3" style={{ borderBottom: '1px solid #F2F2F2' }}>
                      <CalendarClock size={15} style={{ color: '#0C831F', marginTop: 1 }} />
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#999' }}>Ordered On</p>
                        <p className="text-sm font-semibold" style={{ color: '#1C1C1C' }}>
                          {formatPlacedAt(order.placedAt, String(order.date))}
                        </p>
                      </div>
                    </div>

                    {/* Delivery address */}
                    {(a.name || fullAddress || a.phone) && (
                      <div className="flex items-start gap-2 mb-4 pb-4" style={{ borderBottom: '1px solid #F2F2F2' }}>
                        <MapPin size={15} style={{ color: '#0C831F', marginTop: 1 }} />
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#999' }}>Delivery Address</p>
                          {a.name && <p className="text-sm font-semibold" style={{ color: '#1C1C1C' }}>{a.name}</p>}
                          {fullAddress && <p className="text-sm" style={{ color: '#555' }}>{fullAddress}</p>}
                          {a.phone && <p className="text-xs mt-0.5" style={{ color: '#999' }}>Phone: {a.phone}</p>}
                        </div>
                      </div>
                    )}

                    {/* Items */}
                    <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: '#999' }}>
                      Items ({order.items.length})
                    </p>
                    <div className="space-y-3 mb-4">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                            style={{ background: '#F2F2F2' }}>
                            {item.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate" style={{ color: '#1C1C1C' }}>{item.name}</p>
                            <p className="text-xs mt-0.5" style={{ color: '#999' }}>Qty: {item.qty} × ₹{item.price}</p>
                          </div>
                          <span className="text-sm font-bold flex-shrink-0" style={{ color: '#1C1C1C' }}>
                            ₹{(item.qty * item.price).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="flex items-center justify-between pt-4" style={{ borderTop: '1.5px solid #E8E8E8' }}>
                      <span className="text-sm font-semibold" style={{ color: '#666' }}>Total Amount</span>
                      <span className="text-base font-extrabold" style={{ color: '#1C1C1C' }}>₹{order.total.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

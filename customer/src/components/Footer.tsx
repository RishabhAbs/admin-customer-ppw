import { Link } from 'react-router-dom';
import { Star, MapPin, Phone, Truck } from 'lucide-react';

// Social / contact links shown in the footer. Brand glyphs are inline SVGs
// because lucide dropped its brand icons; the review link uses a gold star.
const SOCIALS: { label: string; href: string; color: string; icon: React.ReactNode }[] = [
  {
    label: 'WhatsApp — 9864114007',
    href: 'https://wa.me/9864114007',
    color: '#25D366',
    icon: (
      <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/purbanchalpapersandworks?igsh=MXVvYWJzbmR1dnlvaA==',
    color: '#E4405F',
    icon: (
      <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    label: 'Find us on Google',
    href: 'https://www.google.com/search?q=Purbanchal%20Papers%20%26%20Works%20(Stationery%20Wholesaler)&stick=H4sIAAAAAAAAAONgU1I1qDA2N000TTQ2NDe2NEo0MzS3MqgwSzVNSrNMSjEACpqbpCYvYjUMKC1KSsxLzkjMUQhILEgtKlZQUwjPL8ouVtAILkksyczPSy2qVAjPyM9JLU7MSS3SBADm-RgPXQAAAA',
    color: '#4285F4',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
  },
  {
    label: 'Rate us 5★ on Google',
    href: 'https://g.page/r/Cex0cwG9-VtuEBE/review',
    color: '#FBBC05',
    icon: <Star size={16} fill="currentColor" strokeWidth={0} />,
  },
];

const LINKS = {
  'Quick Links': [
    { label: 'All Products',       to: '/products' },
    { label: 'Writing Instruments', to: '/products?category=Writing+Instruments' },
    { label: 'Notebooks',           to: '/products?category=Notebooks+%26+Diaries' },
    { label: 'Art & Craft',         to: '/products?category=Art+%26+Craft' },
  ],
  'Customer': [
    { label: 'My Account',   to: '/profile' },
    { label: 'My Orders',    to: '/orders' },
    { label: 'Track Order',  to: '/orders' },
    { label: 'Returns',      to: '/' },
  ],
  'Help': [
    { label: 'FAQ',          to: '/' },
    { label: 'Shipping Info', to: '/' },
    { label: 'Bulk Orders',  to: '/' },
    { label: 'Contact Us',   to: '/' },
  ],
};

export default function Footer() {
  return (
    <footer style={{ background: '#1C1C1C', color: '#999', marginTop: '2rem' }}>
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex flex-col items-start gap-1.5 mb-4">
              <img src="/ppw-logo.png" alt="PPW Logo" className="h-12 object-contain filter brightness-[0.8] contrast-125" />
              <span className="text-[11px] font-extrabold tracking-widest uppercase text-white/90">Purbanchal Papers & Works</span>
              <span className="text-[11px] font-extrabold tracking-widest uppercase text-white/90">Since 1992</span>
            </div>
            <p className="text-xs leading-relaxed mb-4" style={{ color: '#666' }}>
              Your one-stop destination for quality stationery — for students, artists and offices across India.
            </p>
            <div className="flex gap-2">
              {SOCIALS.map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                  aria-label={s.label} title={s.label}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: s.color }}>
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(LINKS).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-3 text-white">{heading}</h4>
              <ul className="space-y-2">
                {links.map(l => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-sm transition-colors hover:text-white" style={{ color: '#666' }}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Delivery coverage */}
        <div className="flex items-start gap-2.5 py-6"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <Truck size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#c1885b' }} />
          <p className="text-xs leading-relaxed" style={{ color: '#888' }}>
            <span className="font-bold text-white/90">Delivering across the Northeast</span> — Guwahati, Shillong, Agartala,
            Kohima, Dimapur, Nalbari, Tinsukia, Barpeta Road, and all major towns across Assam, Meghalaya, Tripura,
            Nagaland, Manipur, Mizoram, Arunachal Pradesh &amp; Sikkim.
          </p>
        </div>

        {/* Branches & contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-8"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-start gap-2.5">
            <MapPin size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#c1885b' }} />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/90 mb-1">Branch 1</p>
              <p className="text-xs leading-relaxed" style={{ color: '#888' }}>24, Dharamshala Market, S.R.C.B. Road, Fancy Bazar</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <MapPin size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#c1885b' }} />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/90 mb-1">Branch 2</p>
              <p className="text-xs leading-relaxed" style={{ color: '#888' }}>Beside Asha Tower, S.C. Goswami Road, Pan Bazar</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Phone size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#c1885b' }} />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/90 mb-1">Office</p>
              <a href="tel:9395252537" className="text-xs transition-colors hover:text-white" style={{ color: '#888' }}>9395252537</a>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Phone size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#c1885b' }} />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/90 mb-1">Customer Care</p>
              <a href="tel:9181918189" className="text-xs transition-colors hover:text-white" style={{ color: '#888' }}>9181918189</a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-xs" style={{ color: '#444' }}>
            © {new Date().getFullYear()} PPWStore — ABS Technologies. All rights reserved.
          </p>
          <p className="text-xs" style={{ color: '#444' }}>
            Designed & developed by{' '}
            <a href="https://abstechnologies.co.in" target="_blank" rel="noopener noreferrer"
              className="font-semibold transition-colors hover:text-white" style={{ color: '#0C831F' }}>
              ABS Technologies
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

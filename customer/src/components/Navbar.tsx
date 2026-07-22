import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, ChevronDown, Package, LogOut } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import SearchAutocomplete from './SearchAutocomplete';
import ShareMenu from './ShareMenu';

export default function Navbar() {
  const { totalItems } = useCart();
  const { user, logout, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userDrop, setUserDrop] = useState(false);

  // Share the page the user is currently on. Reading location keeps this fresh
  // as they navigate (the layout-level Navbar stays mounted across routes).
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${location.pathname}${location.search}`
    : '';

  return (
    <header className="sticky top-0 z-50 bg-white" style={{ boxShadow: '0 1px 0 #E8E8E8, 0 2px 8px rgba(0,0,0,0.06)' }}>

      {/* ── Main bar ── */}
      <div className="px-4 md:px-6 lg:px-8 flex items-center gap-3 md:gap-4" style={{ height: 64 }}>

        {/* Logo */}
        <Link to="/" className="flex flex-row items-center gap-2 hover:opacity-90 transition-opacity min-w-0">
          <img src="/ppw-logo.png" alt="PPW Store" className="h-[48px] md:h-[54px] w-auto object-contain flex-shrink-0" />
          <span className="flex flex-col leading-tight min-w-0">
            <span className="text-[11px] md:text-[13px] font-extrabold tracking-widest uppercase truncate" style={{ color: '#b8804a' }}>Purbanchal Papers &amp; Works</span>
            <span className="text-[11px] md:text-[13px] font-extrabold tracking-widest uppercase truncate" style={{ color: '#b8804a' }}>Since 1992</span>
          </span>
        </Link>



        {/* Search — desktop */}
        <SearchAutocomplete variant="desktop" />

        {/* Right actions */}
        <div className="flex items-center gap-1.5 md:gap-2 ml-auto md:ml-0 flex-shrink-0">

          {/* Share current page */}
          <ShareMenu
            title="Purbanchal Papers & Works"
            text="Check out Purbanchal Papers & Works — quality stationery online"
            url={shareUrl}
            label="Share"
          />

          {/* Login / User */}
          {isLoggedIn ? (
            <div className="relative">
              <button onClick={() => setUserDrop(!userDrop)}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: '#0C831F' }}>
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <span className="hidden md:inline text-sm font-semibold text-gray-800 max-w-[80px] truncate">
                  {user?.name?.split(' ')[0]}
                </span>
                <ChevronDown size={12} className="text-gray-400 hidden md:block" />
              </button>

              {userDrop && (
                <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-xl py-1 z-50 animate-fade-in"
                  style={{ border: '1px solid #E8E8E8' }}>
                  <Link to="/profile" onClick={() => setUserDrop(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <User size={15} style={{ color: '#0C831F' }} /> My Profile
                  </Link>
                  <Link to="/orders" onClick={() => setUserDrop(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <Package size={15} style={{ color: '#0C831F' }} /> My Orders
                  </Link>
                  <div className="my-1 border-t border-gray-100" />
                  <button onClick={() => { logout(); setUserDrop(false); navigate('/'); }}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 w-full text-left">
                    <LogOut size={15} /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login"
              className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90 flex-shrink-0"
              style={{ background: '#F8C420', color: '#1C1C1C' }}>
              Login
            </Link>
          )}

          {/* Cart */}
          <Link to="/cart"
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <span className="relative">
              <ShoppingCart size={22} style={{ color: '#1C1C1C' }} />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white"
                  style={{ background: '#0C831F', width: 18, height: 18, lineHeight: 1 }}>
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </span>
            <span className="hidden md:inline text-sm font-semibold text-gray-800">Cart</span>
          </Link>
        </div>
      </div>

      {/* ── Mobile: search ── */}
      <div className="md:hidden px-4 pb-2.5 flex flex-col gap-2">
        <SearchAutocomplete variant="mobile" />
      </div>
    </header>
  );
}

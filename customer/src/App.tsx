import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { AuthProvider, useAuth } from './context/AuthContext';
import { enableContentProtection } from './utils/contentProtection';
import { CartProvider } from './context/CartContext';
import { OrderProvider } from './context/OrderContext';
import Navbar from './components/Navbar';
import ScrollToTop from './components/ScrollToTop';
import Footer from './components/Footer';
import Home from './pages/Home';
import Browse from './pages/Browse';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import Login from './pages/Login';
import Profile from './pages/Profile';
import ProfileEdit from './pages/ProfileEdit';
import Addresses from './pages/Addresses';

// On Android, the hardware back button / edge swipe defaults to closing the app.
// Wire it to the SPA history instead: go back a page when we can, and only send
// the app to the background (not exit) when we're already at a root screen.
// No-op on web, where the browser/OS handles back natively.
function AndroidBackButton() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let remove: (() => void) | undefined;
    let lastAt = 0;
    CapacitorApp.addListener('backButton', () => {
      // Android can deliver the back button / edge-swipe as a rapid double event;
      // popping history for both jumps two pages back (so every screen appears to
      // go straight Home). Debounce so a single gesture pops exactly one entry.
      const now = Date.now();
      if (now - lastAt < 500) return;
      lastAt = now;
      const path = window.location.pathname;
      if (path === '/' || path === '/login') {
        // At a root screen: background the app instead of exiting or looping.
        CapacitorApp.minimizeApp();
      } else {
        // Everywhere else: go to the actual previous page.
        navigate(-1);
      }
    }).then(h => { remove = () => h.remove(); });
    return () => { remove?.(); };
  }, [navigate]);
  return null;
}

function MainLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

// Public pages (browse the catalogue, view a shared product link, build a cart)
// — no login needed. Login is only enforced at checkout (see ProtectedRoute).
function PublicLayout() {
  return <MainLayout />;
}

function ProtectedRoute() {
  const { isLoggedIn, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  // Remember where the user was headed so login can send them back there.
  if (!isLoggedIn) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <MainLayout />;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  // Preserve any redirect target carried in from ProtectedRoute.
  if (isLoggedIn) return <Navigate to={(location.state as any)?.from || '/'} replace />;
  return <>{children}</>;
}

export default function App() {
  // Block image-saving gestures (web) + screenshots (Android via FLAG_SECURE).
  useEffect(() => {
    const cleanup = enableContentProtection();
    return cleanup;
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <OrderProvider>
          <ScrollToTop />
          <AndroidBackButton />
          <Routes>
            {/* Public: browse freely, including shared product links. No login. */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/brands" element={<Browse mode="brand" />} />
              <Route path="/categories" element={<Browse mode="category" />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
            </Route>

            {/* Protected: login required — checkout and account pages. */}
            <Route element={<ProtectedRoute />}>
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/edit" element={<ProfileEdit />} />
              <Route path="/addresses" element={<Addresses />} />
            </Route>

            {/* Guest only: redirects to home if already logged in */}
            <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          </Routes>
          </OrderProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

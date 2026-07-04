import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

const NAV_ITEMS = [
  { path: '/', label: 'Tổng quan', icon: '📊' },
  { path: '/menu', label: 'Thực đơn', icon: '🍽️' },
  { path: '/customers', label: 'Khách hàng', icon: '👥' },
  { path: '/orders', label: 'Đơn hàng', icon: '📋' },
  { path: '/subscriptions', label: 'Gói đăng ký', icon: '📦' },
  { path: '/deliveries', label: 'Giao hàng', icon: '🚚' },
  { path: '/prep-list', label: 'Prep List', icon: '👨‍🍳' },
];

export default function Layout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Top nav bar */}
      <header className="bg-brand-500 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo + name */}
          <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight no-underline text-white">
            <span className="text-xl">🏋️‍♂️</span>
            <span>Fortify Kitchen</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium no-underline transition-smooth
                  ${location.pathname === item.path
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
              >
                <span className="mr-1">{item.icon}</span>
                {item.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="ml-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white/80 hover:bg-red-500/30 hover:text-white transition-smooth cursor-pointer border-0 bg-transparent"
            >
              Đăng xuất
            </button>
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-smooth text-white cursor-pointer border-0 bg-transparent text-xl"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile nav drawer */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-white/20 animate-fade-in">
            <div className="px-4 py-2 space-y-1">
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium no-underline transition-smooth
                    ${location.pathname === item.path
                      ? 'bg-white/20 text-white'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:bg-red-500/30 hover:text-white transition-smooth cursor-pointer border-0 bg-transparent"
              >
                🚪 Đăng xuất
              </button>
            </div>
          </nav>
        )}
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6 animate-fade-in">
        {children}
      </main>
    </div>
  );
}

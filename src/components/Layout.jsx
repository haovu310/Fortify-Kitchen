import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

import { LayoutDashboard, UtensilsCrossed, Users, ClipboardList, Package, Truck, ChefHat } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Tổng quan', icon: LayoutDashboard },
  { path: '/menu', label: 'Thực đơn', icon: UtensilsCrossed },
  { path: '/customers', label: 'Khách hàng', icon: Users },
  { path: '/orders', label: 'Đơn hàng', icon: ClipboardList },
  { path: '/subscriptions', label: 'Gói đăng ký', icon: Package },
  { path: '/deliveries', label: 'Giao hàng', icon: Truck },
  { path: '/prep-list', label: 'Prep List', icon: ChefHat },
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
      <header className="bg-brand-500 text-white shadow-warm-lg sticky top-0 z-50 rounded-b-3xl">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo + Breadcrumb */}
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight no-underline text-white">
              <img src="/logo.png" alt="Fortify Kitchen Logo" className="w-8 h-8 rounded-full object-cover" />
              <span className="hidden sm:inline">Fortify Kitchen</span>
            </Link>
            {location.pathname !== '/' && (
              <>
                <span className="text-white/50">/</span>
                <span className="text-white font-medium">{NAV_ITEMS.find(item => item.path === location.pathname)?.label || 'Chi tiết'}</span>
              </>
            )}
          </div>

          {/* Hamburger menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-white/10 transition-smooth text-white cursor-pointer border-0 bg-transparent text-xl ml-auto"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Nav drawer */}
        {mobileMenuOpen && (
          <nav className="border-t border-white/20 animate-fade-in bg-brand-500 rounded-b-3xl">
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
                  <item.icon className="w-4 h-4 mr-2 inline-block" />
                  {item.label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:bg-red-500/30 hover:text-white transition-smooth cursor-pointer border-0 bg-transparent"
              >
                Đăng xuất
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

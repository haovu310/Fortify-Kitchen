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
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const location = useLocation();

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col md:flex-row">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-brand-700 focus:rounded-xl focus:shadow-warm-lg focus:text-sm focus:font-medium"
      >
        Bỏ qua đến nội dung chính
      </a>
      {/* Sidebar (Desktop only) */}
      {desktopSidebarOpen && (
        <aside className="hidden md:flex flex-col w-64 bg-brand-600 text-white min-h-screen sticky top-0 shrink-0 shadow-warm-lg border-r border-black/20 z-50">
          <div className="p-4 flex items-center h-14 border-b border-white/10">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight no-underline text-white">
            <img src="/logo.png" alt="Fortify Kitchen Logo" className="w-8 h-8 rounded-full object-cover" />
            <span>Fortify Kitchen</span>
          </Link>
        </div>
        <nav aria-label="Điều hướng chính" className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.path}
              to={item.path}
              aria-current={location.pathname === item.path ? 'page' : undefined}
              className={`relative flex items-center px-3 py-2.5 rounded-lg text-sm font-medium no-underline transition-smooth
                ${location.pathname === item.path
                  ? 'bg-white text-brand-700 shadow-warm'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:bg-red-500/30 hover:text-white transition-smooth cursor-pointer border-0 bg-transparent"
          >
            Đăng xuất
          </button>
        </div>
      </aside>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-brand-500 text-white shadow-warm-lg sticky top-0 z-40 rounded-b-3xl md:rounded-none h-14 flex items-center px-4 border-b border-black/20">
          
          {/* Mobile Header (Logo + Hamburger) */}
          <div className="flex md:hidden items-center justify-between w-full">
            <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight no-underline text-white">
              <img src="/logo.png" alt="Fortify Kitchen Logo" className="w-8 h-8 rounded-full object-cover" />
              <span>Fortify Kitchen</span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-white/10 transition-smooth text-white cursor-pointer border-0 bg-transparent text-xl -mr-2"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>

          {/* Desktop Breadcrumb */}
          <div className="hidden md:flex items-center gap-2 font-medium">
            <button
              onClick={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
              className="p-1 -ml-1 mr-2 rounded hover:bg-white/10 transition-smooth text-white cursor-pointer border-0 bg-transparent text-xl leading-none"
              aria-label="Toggle desktop sidebar"
            >
              ☰
            </button>
            <Link to="/" className="flex items-center gap-2 no-underline text-white/90 hover:text-white transition-smooth">
              <img src="/logo.png" alt="Fortify Kitchen Logo" className="w-6 h-6 rounded-full object-cover" />
              <span className="font-bold">Fortify Kitchen</span>
            </Link>
            <span className="text-white/50">/</span>
            <span className="text-white">{NAV_ITEMS.find(item => item.path === location.pathname)?.label || 'Chi tiết'}</span>
          </div>
        </header>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-white/20 animate-fade-in bg-brand-500 rounded-b-3xl absolute top-14 left-0 right-0 z-40 shadow-warm-lg">
            <div className="px-4 py-2 space-y-1">
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={location.pathname === item.path ? 'page' : undefined}
                  className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium no-underline transition-smooth
                    ${location.pathname === item.path
                      ? 'bg-white text-brand-700 shadow-warm'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:bg-red-500/30 hover:text-white transition-smooth cursor-pointer border-0 bg-transparent"
              >
                Đăng xuất
              </button>
            </div>
          </nav>
        )}

        {/* Page Content */}
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 md:p-6 animate-fade-in w-full max-w-7xl mx-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}

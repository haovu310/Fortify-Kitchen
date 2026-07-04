import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, Suspense, lazy } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import Layout from './components/Layout';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmDialog';
import ErrorBoundary from './components/ErrorBoundary';

// Route-level code splitting: each page ships as its own chunk instead of one
// monolithic bundle, so the initial load only pays for Login + the shell.
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const MenuPage = lazy(() => import('./pages/MenuPage'));
const TestPricingPage = lazy(() => import('./pages/TestPricingPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const CustomerDetailPage = lazy(() => import('./pages/CustomerDetailPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const SubscriptionsPage = lazy(() => import('./pages/SubscriptionsPage'));
const SubscriptionDetailPage = lazy(() => import('./pages/SubscriptionDetailPage'));
const DeliveriesPage = lazy(() => import('./pages/DeliveriesPage'));
const PrepListPage = lazy(() => import('./pages/PrepListPage'));

function PageFallback() {
  return (
    <div className="flex justify-center py-24">
      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-sm text-stone-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                <Route path="/menu" element={<ProtectedRoute><MenuPage /></ProtectedRoute>} />
                <Route path="/test-pricing" element={<ProtectedRoute><TestPricingPage /></ProtectedRoute>} />
                <Route path="/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
                <Route path="/customers/:id" element={<ProtectedRoute><CustomerDetailPage /></ProtectedRoute>} />
                <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
                <Route path="/subscriptions" element={<ProtectedRoute><SubscriptionsPage /></ProtectedRoute>} />
                <Route path="/subscriptions/:id" element={<ProtectedRoute><SubscriptionDetailPage /></ProtectedRoute>} />
                <Route path="/deliveries" element={<ProtectedRoute><DeliveriesPage /></ProtectedRoute>} />
                <Route path="/prep-list" element={<ProtectedRoute><PrepListPage /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ConfirmProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatVND } from '../lib/pricing';
import { PROTEIN_LABELS } from '../lib/menuData';
import { Package, Truck, ChefHat, Wallet, TrendingUp, AlertTriangle, CalendarRange } from 'lucide-react';
import { SkeletonKpiGrid, SkeletonList } from '../components/ui/Skeleton';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function DashboardPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [delivSnap, subSnap, orderSnap] = await Promise.all([
        getDocs(collection(db, 'deliveries')),
        getDocs(collection(db, 'subscriptions')),
        getDocs(collection(db, 'orders')),
      ]);
      setDeliveries(delivSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setSubscriptions(subSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setOrders(orderSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    fetchAll();
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const next7 = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7); // YYYY-MM

  // Today's deliveries
  const todayDeliveries = deliveries.filter(d =>
    d.scheduledDate === today && ['Scheduled', 'Prepping'].includes(d.status)
  );

  // Next 7 days
  const next7Deliveries = deliveries.filter(d =>
    d.scheduledDate > today && d.scheduledDate <= next7 && ['Scheduled', 'Prepping'].includes(d.status)
  ).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

  // Reorder alerts: subscriptions with <=1 remaining, not completed
  const deliveryCounts = {};
  for (const sub of subscriptions) {
    const subDeliveries = deliveries.filter(d => d.subscriptionId === sub.id);
    deliveryCounts[sub.id] = subDeliveries.filter(d =>
      !['Delivered', 'Skipped', 'Cancelled'].includes(d.status)
    ).length;
  }
  const reorderAlerts = subscriptions.filter(sub =>
    (deliveryCounts[sub.id] ?? 0) <= 1 && sub.status !== 'Completed'
  );

  // Unpaid orders
  const unpaidOrders = orders.filter(o => o.paymentStatus !== 'Đã thanh toán');

  // KPIs
  const activeSubs = subscriptions.filter(s => s.status === 'Active').length;
  const deliveriesThisWeek = deliveries.filter(d =>
    d.scheduledDate >= today && d.scheduledDate <= next7
  ).length;
  const portionsThisWeek = deliveries
    .filter(d => d.scheduledDate >= today && d.scheduledDate <= next7)
    .reduce((sum, d) => sum + (d.lineItems || []).reduce((s, l) => s + (l.qty || 0), 0), 0);
  const unpaidCount = unpaidOrders.length;

  // Revenue this month
  const orderRevenue = orders
    .filter(o => (o.createdAt || '').startsWith(thisMonth) || (o.deliveryDate || '').startsWith(thisMonth))
    .reduce((sum, o) => sum + (o.total || 0), 0);
  const subRevenue = subscriptions
    .filter(s => (s.startDate || '').startsWith(thisMonth))
    .reduce((sum, s) => sum + (s.totalPrice || 0), 0);
  const totalRevenue = orderRevenue + subRevenue;

  // Last 14 days revenue trend (orders' deliveryDate used as the revenue-day proxy)
  const last14Days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400000);
    return d.toISOString().split('T')[0];
  });
  const revenueTrend = last14Days.map(date => ({
    date: date.slice(5).replace('-', '/'), // MM/DD short label
    fullDate: date,
    revenue: orders.filter(o => o.deliveryDate === date).reduce((s, o) => s + (o.total || 0), 0),
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-7 w-40 bg-stone-200/70 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-64 bg-stone-200/50 rounded-lg animate-pulse" />
        </div>
        <SkeletonKpiGrid />
        <SkeletonList rows={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-800 font-display">Tổng quan</h1>
        <p className="text-sm text-stone-500 mt-1">Hôm nay: {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Gói hoạt động', value: activeSubs, icon: <Package className="w-5 h-5" />, badge: 'bg-brand-50 text-brand-600' },
          { label: 'Giao hàng tuần này', value: deliveriesThisWeek, icon: <Truck className="w-5 h-5" />, badge: 'bg-accent-50 text-accent-600' },
          { label: 'Phần ăn tuần này', value: portionsThisWeek, icon: <ChefHat className="w-5 h-5" />, badge: 'bg-amber-50 text-amber-600' },
          { label: 'Đơn chưa TT', value: unpaidCount, icon: <Wallet className="w-5 h-5" />, badge: unpaidCount > 0 ? 'bg-red-50 text-red-600' : 'bg-stone-100 text-stone-500' },
          { label: 'Doanh thu tháng', value: formatVND(totalRevenue), icon: <TrendingUp className="w-5 h-5" />, badge: 'bg-brand-50 text-brand-600' },
        ].map((kpi, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl p-4 border border-stone-100 shadow-warm hover:shadow-warm-lg transition-smooth animate-fade-in"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${kpi.badge}`}>
              {kpi.icon}
            </div>
            <div className="text-2xl font-bold font-display text-stone-800 tabular-nums leading-tight">{kpi.value}</div>
            <div className="text-xs text-stone-500 mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Revenue trend (last 14 days) */}
      <section className="bg-white rounded-3xl border border-stone-100 shadow-warm p-4">
        <h2 className="text-sm font-semibold text-stone-700 font-display flex items-center gap-1.5 mb-3">
          <TrendingUp className="w-4 h-4" /> Doanh thu 14 ngày qua
        </h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueTrend} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7EEE7" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#78716c' }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}tr` : v >= 1000 ? `${Math.round(v / 1000)}k` : v}
              />
              <Tooltip
                formatter={(value) => [formatVND(value), 'Doanh thu']}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                contentStyle={{ borderRadius: 12, border: '1px solid #E7EEE7', fontSize: 13 }}
              />
              <Bar dataKey="revenue" fill="#283828" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Today's deliveries */}
      <section className="bg-white rounded-3xl border border-stone-100 shadow-warm overflow-hidden">
        <div className="px-4 py-3 bg-brand-50 border-b border-brand-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-brand-800 font-display flex items-center gap-1.5"><Truck className="w-4 h-4"/> Giao hàng hôm nay</h2>
          <span className="text-xs text-brand-600 font-medium">{todayDeliveries.length} lần</span>
        </div>
        {todayDeliveries.length === 0 ? (
          <p className="px-4 py-6 text-sm text-stone-400 text-center">Không có giao hàng hôm nay</p>
        ) : (
          <div className="divide-y divide-stone-50">
            {todayDeliveries.map(d => (
              <div key={d.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="font-medium text-stone-800">{d.customerName}</span>
                  <span className="text-stone-400 text-sm ml-2">{d.packageName}</span>
                  {d.lineItems && (
                    <div className="text-xs text-stone-400 mt-0.5">
                      {d.lineItems.map((l, i) => <span key={i}>{i > 0 && ', '}{PROTEIN_LABELS[l.protein] || l.protein} {l.flavor} ×{l.qty}</span>)}
                    </div>
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  d.status === 'Prepping' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                }`}>{d.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Next 7 days */}
      <section className="bg-white rounded-3xl border border-stone-100 shadow-warm overflow-hidden">
        <div className="px-4 py-3 bg-stone-50 border-b border-stone-100">
          <h2 className="text-sm font-semibold text-stone-700 font-display flex items-center gap-1.5"><CalendarRange className="w-4 h-4"/> 7 ngày tới</h2>
        </div>
        {next7Deliveries.length === 0 ? (
          <p className="px-4 py-6 text-sm text-stone-400 text-center">Không có lịch giao</p>
        ) : (
          <div className="divide-y divide-stone-50">
            {next7Deliveries.map(d => (
              <div key={d.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <div>
                  <span className="text-stone-500">{d.scheduledDate}</span>
                  <span className="font-medium text-stone-700 ml-2">{d.customerName}</span>
                  <span className="text-stone-400 ml-1">({d.packageName})</span>
                </div>
                <span className="text-xs text-stone-400">{d.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reorder alerts */}
      {reorderAlerts.length > 0 && (
        <section className="bg-amber-50 rounded-3xl border border-amber-200 shadow-warm overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-200">
            <h2 className="text-sm font-semibold text-amber-800 font-display flex items-center gap-1.5"><AlertTriangle className="w-4 h-4"/> Cần gia hạn gói</h2>
          </div>
          <div className="divide-y divide-amber-100">
            {reorderAlerts.map(sub => (
              <div key={sub.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="font-medium text-amber-900">{sub.customerName}</span>
                  <span className="text-amber-700 text-sm ml-2">{sub.packageName}</span>
                  <div className="text-xs text-amber-600 mt-0.5">
                    📞 {subscriptions.find(s => s.id === sub.id)?.customerName || ''} — Còn {deliveryCounts[sub.id]} lần giao
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Unpaid orders */}
      {unpaidOrders.length > 0 && (
        <section className="bg-white rounded-3xl border border-stone-100 shadow-warm overflow-hidden">
          <div className="px-4 py-3 bg-accent-50 border-b border-accent-100">
            <h2 className="text-sm font-semibold text-accent-800 font-display flex items-center gap-1.5"><Wallet className="w-4 h-4"/> Đơn chưa thanh toán</h2>
          </div>
          <div className="divide-y divide-stone-50">
            {unpaidOrders.map(order => (
              <div key={order.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-stone-700">{order.customerName}</span>
                  <span className="text-stone-400 ml-2">{order.deliveryDate}</span>
                </div>
                <div className="text-right">
                  <span className="font-medium text-stone-700">{formatVND(order.total)}</span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                    order.paymentStatus === 'Đã cọc' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  }`}>{order.paymentStatus}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

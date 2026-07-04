import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatVND } from '../lib/pricing';
import { PROTEIN_LABELS } from '../lib/menuData';

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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">📊 Tổng quan</h1>
        <p className="text-sm text-slate-500 mt-1">Hôm nay: {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Gói hoạt động', value: activeSubs, icon: '📦', color: 'bg-brand-50 text-brand-700' },
          { label: 'Giao hàng tuần này', value: deliveriesThisWeek, icon: '🚚', color: 'bg-blue-50 text-blue-700' },
          { label: 'Phần ăn tuần này', value: portionsThisWeek, icon: '🍽️', color: 'bg-purple-50 text-purple-700' },
          { label: 'Đơn chưa TT', value: unpaidCount, icon: '💰', color: unpaidCount > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700' },
          { label: 'Doanh thu tháng', value: formatVND(totalRevenue), icon: '📈', color: 'bg-amber-50 text-amber-700' },
        ].map(kpi => (
          <div key={kpi.label} className={`${kpi.color} rounded-2xl p-4 border border-current/10 animate-fade-in`}>
            <div className="text-2xl mb-1">{kpi.icon}</div>
            <div className="text-2xl font-bold">{kpi.value}</div>
            <div className="text-xs opacity-75 mt-0.5">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Today's deliveries */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-brand-50 border-b border-brand-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-brand-800">🚚 Giao hàng hôm nay</h2>
          <span className="text-xs text-brand-600 font-medium">{todayDeliveries.length} lần</span>
        </div>
        {todayDeliveries.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-400 text-center">Không có giao hàng hôm nay</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {todayDeliveries.map(d => (
              <div key={d.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-800">{d.customerName}</span>
                  <span className="text-slate-400 text-sm ml-2">{d.packageName}</span>
                  {d.lineItems && (
                    <div className="text-xs text-slate-400 mt-0.5">
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
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">📅 7 ngày tới</h2>
        </div>
        {next7Deliveries.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-400 text-center">Không có lịch giao</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {next7Deliveries.map(d => (
              <div key={d.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <div>
                  <span className="text-slate-500">{d.scheduledDate}</span>
                  <span className="font-medium text-slate-700 ml-2">{d.customerName}</span>
                  <span className="text-slate-400 ml-1">({d.packageName})</span>
                </div>
                <span className="text-xs text-slate-400">{d.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reorder alerts */}
      {reorderAlerts.length > 0 && (
        <section className="bg-amber-50 rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-200">
            <h2 className="text-sm font-semibold text-amber-800">⚠️ Cần gia hạn gói</h2>
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
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-red-50 border-b border-red-100">
            <h2 className="text-sm font-semibold text-red-800">💰 Đơn chưa thanh toán</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {unpaidOrders.map(order => (
              <div key={order.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-slate-700">{order.customerName}</span>
                  <span className="text-slate-400 ml-2">{order.deliveryDate}</span>
                </div>
                <div className="text-right">
                  <span className="font-medium text-slate-700">{formatVND(order.total)}</span>
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

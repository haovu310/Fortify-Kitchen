import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PAYMENT_STATUSES, getMenuItemLabel } from '../lib/menuData';
import { formatVND } from '../lib/pricing';
import { useToast } from '../components/Toast';
import { Package } from 'lucide-react';

export default function SubscriptionsPage() {
  const toast = useToast();
  const [subscriptions, setSubscriptions] = useState([]);
  const [deliveryCounts, setDeliveryCounts] = useState({}); // subId -> remaining count
  const [customers, setCustomers] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [packageName, setPackageName] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [deliveriesPlanned, setDeliveriesPlanned] = useState(4);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [frequency, setFrequency] = useState('weekly');
  const [paymentStatus, setPaymentStatus] = useState('Chưa thanh toán');
  const [lineItemsPerDelivery, setLineItemsPerDelivery] = useState([]);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState('');
  const [addQty, setAddQty] = useState(1);

  const fetchAll = async () => {
    setLoading(true);
    const [subsSnap, customersSnap, menuSnap, delivSnap] = await Promise.all([
      getDocs(collection(db, 'subscriptions')),
      getDocs(collection(db, 'customers')),
      getDocs(collection(db, 'menuItems')),
      getDocs(collection(db, 'deliveries')),
    ]);

    const customerData = customersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const menuData = menuSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => d.active !== false);
    const subData = subsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const delivData = delivSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Compute remaining deliveries per subscription
    const counts = {};
    for (const sub of subData) {
      const subDeliveries = delivData.filter(d => d.subscriptionId === sub.id);
      const remaining = subDeliveries.filter(d =>
        !['Delivered', 'Skipped', 'Cancelled'].includes(d.status)
      ).length;
      counts[sub.id] = remaining;
    }

    setCustomers(customerData);
    setMenuItems(menuData.sort((a, b) => {
      const po = { chicken: 0, beef: 1, shrimp: 2 };
      return (po[a.protein] ?? 3) - (po[b.protein] ?? 3) || a.flavor.localeCompare(b.flavor) || a.sizeGrams - b.sizeGrams;
    }));
    setSubscriptions(subData.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || '')));
    setDeliveryCounts(counts);
    if (menuData.length > 0) setSelectedMenuItemId(menuData[0].id);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const addDeliveryLineItem = () => {
    const menuItem = menuItems.find(m => m.id === selectedMenuItemId);
    if (!menuItem || addQty <= 0) return;
    const existing = lineItemsPerDelivery.find(l => l.menuItemId === selectedMenuItemId);
    if (existing) {
      setLineItemsPerDelivery(prev => prev.map(l =>
        l.menuItemId === selectedMenuItemId ? { ...l, qty: l.qty + addQty } : l
      ));
    } else {
      setLineItemsPerDelivery(prev => [...prev, {
        menuItemId: selectedMenuItemId,
        protein: menuItem.protein,
        flavor: menuItem.flavor,
        sizeGrams: menuItem.sizeGrams,
        unitPrice: menuItem.price,
        qty: addQty,
      }]);
    }
    setAddQty(1);
  };

  const handleCreate = async () => {
    if (!selectedCustomerId) { toast.error('Vui lòng chọn khách hàng'); return; }
    if (!packageName.trim()) { toast.error('Vui lòng nhập tên gói'); return; }
    if (lineItemsPerDelivery.length === 0) { toast.error('Vui lòng thêm ít nhất 1 món cho mỗi lần giao'); return; }

    const customer = customers.find(c => c.id === selectedCustomerId);

    // Create subscription doc
    const subDoc = {
      customerId: selectedCustomerId,
      customerName: customer?.name || '',
      packageName: packageName.trim(),
      lineItemsPerDelivery: lineItemsPerDelivery.map(l => ({
        menuItemId: l.menuItemId, protein: l.protein, flavor: l.flavor,
        sizeGrams: l.sizeGrams, unitPrice: l.unitPrice, qty: l.qty,
      })),
      deliveriesPlanned: parseInt(deliveriesPlanned),
      startDate,
      frequency,
      totalPrice: parseInt(totalPrice) || 0,
      paymentStatus,
      status: 'Active',
      createdAt: new Date().toISOString(),
    };

    try {
      const subRef = await addDoc(collection(db, 'subscriptions'), subDoc);

      // Generate delivery schedule
      const intervalDays = frequency === 'weekly' ? 7 : frequency === 'biweekly' ? 14 : frequency === 'monthly' ? 30 : 7;
      const start = new Date(startDate);

      for (let i = 0; i < parseInt(deliveriesPlanned); i++) {
        const deliveryDate = new Date(start);
        deliveryDate.setDate(deliveryDate.getDate() + (i * intervalDays));

        await addDoc(collection(db, 'deliveries'), {
          subscriptionId: subRef.id,
          customerId: selectedCustomerId,
          customerName: customer?.name || '',
          packageName: packageName.trim(),
          scheduledDate: deliveryDate.toISOString().split('T')[0],
          status: 'Scheduled',
          lineItems: lineItemsPerDelivery.map(l => ({
            menuItemId: l.menuItemId, protein: l.protein, flavor: l.flavor,
            sizeGrams: l.sizeGrams, unitPrice: l.unitPrice, qty: l.qty,
          })),
          notes: '',
        });
      }

      setShowCreate(false);
      setPackageName('');
      setTotalPrice('');
      setLineItemsPerDelivery([]);
      setSelectedCustomerId('');
      setCustomerSearch('');
      await fetchAll();
      toast.success('Đã tạo gói đăng ký và lịch giao hàng');
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    }
  };

  const getCustomerName = (id) => customers.find(c => c.id === id)?.name || 'N/A';

  const filteredCustomers = customers.filter(c =>
    (c.name || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone || '').includes(customerSearch)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 font-display flex items-center gap-2">
            <Package className="w-6 h-6 text-brand-600" />
            Gói đăng ký
          </h1>
          <p className="text-sm text-stone-500 mt-1">{subscriptions.length} gói</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-medium rounded-xl transition-smooth cursor-pointer border-0">
          + Tạo gói mới
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="bg-white rounded-3xl shadow-warm-lg w-full max-w-lg p-6 animate-fade-in mb-8">
            <h2 className="text-lg font-bold text-stone-800 mb-4 font-display flex items-center gap-2">
              <Package className="w-5 h-5 text-brand-600" /> Tạo gói đăng ký
            </h2>

            {/* Customer */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-stone-700 mb-1">Khách hàng *</label>
              <input type="text" placeholder="Tìm khách hàng..." value={customerSearch}
                onChange={(e) => { setCustomerSearch(e.target.value); setSelectedCustomerId(''); }}
                className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
              {customerSearch && !selectedCustomerId && (
                <div className="mt-1 border border-stone-200 rounded-xl max-h-32 overflow-y-auto bg-white shadow-warm-lg">
                  {filteredCustomers.map(c => (
                    <button key={c.id} onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(c.name); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-brand-50 cursor-pointer border-0 bg-transparent">{c.name}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-stone-700 mb-1">Tên gói *</label>
              <input type="text" value={packageName} onChange={(e) => setPackageName(e.target.value)} placeholder="VD: Gói tuần 4 bữa"
                className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Tổng giá gói (VND)</label>
                <input type="number" value={totalPrice} onChange={(e) => setTotalPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Thanh toán</label>
                <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/40">
                  {PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Số lần giao</label>
                <input type="number" min="1" value={deliveriesPlanned} onChange={(e) => setDeliveriesPlanned(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Tần suất</label>
                <select value={frequency} onChange={(e) => setFrequency(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/40">
                  <option value="weekly">Hàng tuần</option>
                  <option value="biweekly">2 tuần/lần</option>
                  <option value="monthly">Hàng tháng</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Ngày bắt đầu</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
              </div>
            </div>

            {/* Line items per delivery */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-stone-700 mb-1">Món mỗi lần giao</label>
              <div className="flex gap-2">
                <select value={selectedMenuItemId} onChange={(e) => setSelectedMenuItemId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-stone-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/40">
                  {menuItems.map(item => <option key={item.id} value={item.id}>{getMenuItemLabel(item)}</option>)}
                </select>
                <input type="number" min="1" value={addQty} onChange={(e) => setAddQty(parseInt(e.target.value) || 1)}
                  className="w-14 px-2 py-2 border border-stone-200 rounded-xl text-sm text-center" />
                <button onClick={addDeliveryLineItem} className="px-3 py-2 bg-brand-500 text-white rounded-xl cursor-pointer border-0 text-sm">+</button>
              </div>
              {lineItemsPerDelivery.length > 0 && (
                <div className="mt-2 space-y-1">
                  {lineItemsPerDelivery.map((l, i) => (
                    <div key={i} className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-1.5 text-sm">
                      <span>{getMenuItemLabel(l)} × {l.qty}</span>
                      <button onClick={() => setLineItemsPerDelivery(prev => prev.filter((_, j) => j !== i))}
                        className="text-red-400 hover:text-red-600 cursor-pointer bg-transparent border-0">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={handleCreate}
                className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-400 text-white font-medium rounded-xl cursor-pointer border-0 text-sm">
                ✓ Tạo gói + lịch giao
              </button>
              <button onClick={() => setShowCreate(false)}
                className="px-4 py-2.5 bg-stone-100 text-stone-600 rounded-xl cursor-pointer border-0 text-sm">Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="relative overflow-hidden text-center py-16 bg-white rounded-3xl border border-stone-100 shadow-warm">
          <svg className="absolute w-[300px] h-[300px] opacity-5 text-accent-400 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,81.3,-46.3C90.8,-33.5,96.8,-18,95.5,-2.9C94.2,12.2,85.6,26.9,76.5,41.2C67.4,55.5,57.8,69.4,44.7,78.5C31.6,87.6,15.8,91.9,0.3,91.4C-15.2,90.9,-30.4,85.6,-43.3,76.3C-56.2,67,-66.8,53.7,-75.6,39.2C-84.4,24.7,-91.4,9,-90.4,-6.2C-89.4,-21.4,-80.4,-36.1,-70.3,-49C-60.2,-61.9,-49,-73,-35.6,-79.8C-22.2,-86.6,-6.6,-89.1,7.8,-87.3C22.2,-85.5,44.4,-79.4,44.7,-76.4Z" transform="translate(100 100)" />
          </svg>
          <div className="relative z-10">
            <p className="text-stone-500 font-display">Chưa có gói đăng ký</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {subscriptions.map(sub => {
            const remaining = deliveryCounts[sub.id] ?? 0;
            const isLow = remaining <= 1 && sub.status !== 'Completed';
            return (
              <div key={sub.id} className={`bg-white rounded-xl border shadow-warm p-4 hover:shadow-md transition-smooth animate-fade-in
                ${isLow ? 'border-amber-300 bg-amber-50' : 'border-stone-100'}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-stone-800">{sub.packageName}</h3>
                    <p className="text-sm text-stone-500">{sub.customerName || getCustomerName(sub.customerId)}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-stone-500">
                      <span>📅 {sub.startDate}</span>
                      <span>{sub.frequency === 'weekly' ? 'Hàng tuần' : sub.frequency === 'biweekly' ? '2 tuần/lần' : 'Hàng tháng'}</span>
                      {sub.totalPrice > 0 && <span className="font-medium text-brand-600">{formatVND(sub.totalPrice)}</span>}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                      remaining <= 1 ? 'bg-amber-200 text-amber-800' : 'bg-brand-100 text-brand-700'
                    }`}>
                      Còn {remaining}/{sub.deliveriesPlanned} lần giao
                    </div>
                    <div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        sub.paymentStatus === 'Đã thanh toán' ? 'bg-green-100 text-green-700' :
                        sub.paymentStatus === 'Đã cọc' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>{sub.paymentStatus}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

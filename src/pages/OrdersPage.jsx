import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { calculateOrderTotal, formatVND } from '../lib/pricing';
import { PROTEIN_LABELS, PAYMENT_STATUSES, getMenuItemLabel } from '../lib/menuData';
import { useToast } from '../components/Toast';

export default function OrdersPage() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  // Create form state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentStatus, setPaymentStatus] = useState('Chưa thanh toán');
  const [lineItems, setLineItems] = useState([]);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState('');
  const [addQty, setAddQty] = useState(1);

  const fetchAll = async () => {
    setLoading(true);
    const [ordersSnap, customersSnap, menuSnap] = await Promise.all([
      getDocs(collection(db, 'orders')),
      getDocs(collection(db, 'customers')),
      getDocs(collection(db, 'menuItems')),
    ]);

    const customerData = customersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const menuData = menuSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => d.active !== false);
    const orderData = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    orderData.sort((a, b) => (b.deliveryDate || '').localeCompare(a.deliveryDate || ''));

    setCustomers(customerData);
    setMenuItems(menuData.sort((a, b) => {
      const po = { chicken: 0, beef: 1, shrimp: 2 };
      return (po[a.protein] ?? 3) - (po[b.protein] ?? 3) || a.flavor.localeCompare(b.flavor) || a.sizeGrams - b.sizeGrams;
    }));
    setOrders(orderData);
    if (menuData.length > 0) setSelectedMenuItemId(menuData[0].id);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const addLineItem = () => {
    const menuItem = menuItems.find(m => m.id === selectedMenuItemId);
    if (!menuItem || addQty <= 0) return;
    const existing = lineItems.find(l => l.menuItemId === selectedMenuItemId);
    if (existing) {
      setLineItems(prev => prev.map(l =>
        l.menuItemId === selectedMenuItemId ? { ...l, qty: l.qty + addQty } : l
      ));
    } else {
      setLineItems(prev => [...prev, {
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

  const removeLineItem = (index) => {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateLineQty = (index, newQty) => {
    if (newQty <= 0) { removeLineItem(index); return; }
    setLineItems(prev => prev.map((l, i) => i === index ? { ...l, qty: newQty } : l));
  };

  const pricingResult = lineItems.length > 0 ? calculateOrderTotal(lineItems) : null;

  const handleCreateOrder = async () => {
    if (!selectedCustomerId) { toast.error('Vui lòng chọn khách hàng'); return; }
    if (lineItems.length === 0) { toast.error('Vui lòng thêm ít nhất 1 món'); return; }

    const result = calculateOrderTotal(lineItems);
    const customer = customers.find(c => c.id === selectedCustomerId);

    const orderDoc = {
      customerId: selectedCustomerId,
      customerName: customer?.name || '',
      deliveryDate,
      paymentStatus,
      deliveryStatus: 'Scheduled',
      lineItems: lineItems.map(l => ({
        menuItemId: l.menuItemId,
        protein: l.protein,
        flavor: l.flavor,
        sizeGrams: l.sizeGrams,
        unitPrice: l.unitPrice,
        qty: l.qty,
      })),
      subtotal: result.lineSubtotal,
      discountAmount: result.orderDiscountAmount,
      total: result.finalTotal,
      createdAt: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, 'orders'), orderDoc);
      setShowCreate(false);
      setLineItems([]);
      setSelectedCustomerId('');
      setPaymentStatus('Chưa thanh toán');
      await fetchAll();
      toast.success('Đã tạo đơn hàng mới');
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    }
  };

  const filteredOrders = filterStatus === 'all'
    ? orders
    : orders.filter(o => o.paymentStatus === filterStatus);

  const getCustomerName = (id) => customers.find(c => c.id === id)?.name || 'N/A';

  const filteredCustomers = customers.filter(c =>
    (c.name || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone || '').includes(customerSearch)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">📋 Đơn hàng</h1>
          <p className="text-sm text-slate-500 mt-1">{orders.length} đơn hàng</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-smooth cursor-pointer border-0"
        >
          + Tạo đơn hàng
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer border-0 transition-smooth ${filterStatus === 'all' ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
          Tất cả
        </button>
        {PAYMENT_STATUSES.map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer border-0 transition-smooth ${filterStatus === s ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Create order modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in mb-8">
            <h2 className="text-lg font-bold text-slate-800 mb-4">🛒 Tạo đơn hàng mới</h2>

            {/* Customer picker */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Khách hàng *</label>
              <input
                type="text"
                placeholder="Tìm khách hàng..."
                value={customerSearch}
                onChange={(e) => { setCustomerSearch(e.target.value); setSelectedCustomerId(''); }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
              />
              {customerSearch && !selectedCustomerId && (
                <div className="mt-1 border border-slate-200 rounded-xl max-h-32 overflow-y-auto bg-white shadow-lg">
                  {filteredCustomers.map(c => (
                    <button key={c.id} onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(c.name); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-brand-50 cursor-pointer border-0 bg-transparent transition-smooth">
                      <span className="font-medium">{c.name}</span>
                      {c.phone && <span className="text-slate-400 ml-2">{c.phone}</span>}
                    </button>
                  ))}
                  {filteredCustomers.length === 0 && <p className="px-3 py-2 text-sm text-slate-400">Không tìm thấy</p>}
                </div>
              )}
              {selectedCustomerId && (
                <p className="text-xs text-green-600 mt-1">✓ Đã chọn: {customers.find(c => c.id === selectedCustomerId)?.name}</p>
              )}
            </div>

            {/* Date + payment */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ngày giao</label>
                <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Thanh toán</label>
                <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 bg-white">
                  {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Add items */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Thêm món</label>
              <div className="flex gap-2">
                <select value={selectedMenuItemId} onChange={(e) => setSelectedMenuItemId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 bg-white">
                  {menuItems.map(item => (
                    <option key={item.id} value={item.id}>{getMenuItemLabel(item)} — {formatVND(item.price)}</option>
                  ))}
                </select>
                <input type="number" min="1" value={addQty} onChange={(e) => setAddQty(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-2 border border-slate-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500" />
                <button onClick={addLineItem} className="px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl cursor-pointer border-0 transition-smooth">+</button>
              </div>
            </div>

            {/* Line items */}
            {lineItems.length > 0 && (
              <div className="mb-4 space-y-1">
                {lineItems.map((l, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
                    <span className="flex-1">{PROTEIN_LABELS[l.protein]} {l.flavor} ({l.sizeGrams}g)</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateLineQty(i, l.qty - 1)} className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 border-0 cursor-pointer text-xs">−</button>
                      <span className="w-6 text-center font-medium">{l.qty}</span>
                      <button onClick={() => updateLineQty(i, l.qty + 1)} className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 border-0 cursor-pointer text-xs">+</button>
                      <span className="w-24 text-right text-slate-600">{formatVND(l.unitPrice * l.qty)}</span>
                      <button onClick={() => removeLineItem(i)} className="text-red-400 hover:text-red-600 cursor-pointer bg-transparent border-0">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pricing summary */}
            {pricingResult && (
              <div className="bg-brand-50 border border-brand-200 rounded-xl p-3 mb-4 text-sm space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Tạm tính:</span>
                  <span>{formatVND(pricingResult.lineSubtotal)}</span>
                </div>
                {pricingResult.orderDiscountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Giảm giá ({pricingResult.orderDiscountTier}):</span>
                    <span>-{formatVND(pricingResult.orderDiscountAmount)}</span>
                  </div>
                )}
                {Object.entries(pricingResult.proteinDiscounts).filter(([, v]) => v).map(([protein]) => (
                  <div key={protein} className="text-green-600 text-xs">✓ {PROTEIN_LABELS[protein]} ≥1kg → giảm 10%</div>
                ))}
                <div className="flex justify-between font-bold text-lg border-t border-brand-200 pt-1">
                  <span>Tổng:</span>
                  <span className="text-brand-700">{formatVND(pricingResult.finalTotal)}</span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={handleCreateOrder}
                className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl transition-smooth cursor-pointer border-0 text-sm">
                ✓ Tạo đơn hàng
              </button>
              <button onClick={() => setShowCreate(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-xl transition-smooth cursor-pointer border-0 text-sm">
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-500">Chưa có đơn hàng</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map(order => (
            <div key={order.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-smooth animate-fade-in">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="font-semibold text-slate-800">{order.customerName || getCustomerName(order.customerId)}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                    <span>📅 {order.deliveryDate}</span>
                    <span className="font-medium text-brand-600">{formatVND(order.total)}</span>
                    {order.lineItems && (
                      <span className="text-slate-400">{order.lineItems.reduce((s, l) => s + l.qty, 0)} phần</span>
                    )}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  order.paymentStatus === 'Đã thanh toán' ? 'bg-green-100 text-green-700' :
                  order.paymentStatus === 'Đã cọc' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {order.paymentStatus}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

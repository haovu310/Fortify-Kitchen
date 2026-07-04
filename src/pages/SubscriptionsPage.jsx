import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  PAYMENT_STATUSES, PROTEIN_LABELS, getMenuItemLabel,
  PLAN_DURATION_PRESETS, DELIVERY_FREQUENCY_PRESETS,
  formatIntervalLabel, formatDurationLabel, computeDeliveryCount,
} from '../lib/menuData';
import { calculateOrderTotal, formatVND } from '../lib/pricing';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { Package, Pencil, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import { SkeletonList } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

const SUBSCRIPTION_STATUSES = ['Active', 'Paused', 'Completed', 'Cancelled'];
const paymentTone = (status) => status === 'Đã thanh toán' ? 'green' : status === 'Đã cọc' ? 'amber' : 'red';

export default function SubscriptionsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [subscriptions, setSubscriptions] = useState([]);
  const [deliveryCounts, setDeliveryCounts] = useState({}); // subId -> remaining count
  const [customers, setCustomers] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  // Lightweight edit modal (package name / price / payment / status only —
  // editing the delivery schedule itself is out of scope here)
  const [editingSub, setEditingSub] = useState(null);
  const [editForm, setEditForm] = useState({ packageName: '', totalPrice: '', paymentStatus: '', status: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [packageName, setPackageName] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentStatus, setPaymentStatus] = useState('Chưa thanh toán');
  const [lineItemsPerDelivery, setLineItemsPerDelivery] = useState([]);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState('');
  const [addQty, setAddQty] = useState(1);
  const [priceOverridden, setPriceOverridden] = useState(false);

  // Plan duration (how long the package runs) + delivery frequency (how
  // often within that span a delivery happens). The delivery count is
  // derived from these two, not typed in directly.
  const [planDurationDays, setPlanDurationDays] = useState(30);
  const [planDurationCustom, setPlanDurationCustom] = useState(false);
  const [deliveryIntervalDays, setDeliveryIntervalDays] = useState(7);
  const [deliveryIntervalCustom, setDeliveryIntervalCustom] = useState(false);

  const deliveriesPlanned = computeDeliveryCount(planDurationDays, deliveryIntervalDays);
  const scheduleEndDate = (() => {
    if (deliveriesPlanned <= 0) return null;
    const d = new Date(startDate);
    d.setDate(d.getDate() + (deliveriesPlanned - 1) * deliveryIntervalDays);
    return d.toISOString().split('T')[0];
  })();

  // Price estimate: run the same discount policy used for one-off orders
  // (per-protein ≥1kg → 10% off, order subtotal ≥1.5tr → 5% off, ≥3tr → 10%
  // off) across the WHOLE package — i.e. every line item's qty is
  // multiplied by the number of deliveries planned, so a monthly package
  // delivered daily is priced as one big bulk order, not priced delivery by
  // delivery (which would rarely hit the weight/spend thresholds).
  const pricingResult = lineItemsPerDelivery.length > 0 && deliveriesPlanned > 0
    ? calculateOrderTotal(lineItemsPerDelivery.map(l => ({ ...l, qty: l.qty * deliveriesPlanned })))
    : null;
  const suggestedPrice = pricingResult ? Math.round(pricingResult.finalTotal) : 0;

  // Keep the price field in sync with the suggestion as items/schedule
  // change, unless the user has typed their own number into the field.
  useEffect(() => {
    if (!priceOverridden && pricingResult) {
      setTotalPrice(String(suggestedPrice));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedPrice, priceOverridden]);

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

  const resetCreateForm = () => {
    setShowCreate(false);
    setPackageName('');
    setTotalPrice('');
    setLineItemsPerDelivery([]);
    setSelectedCustomerId('');
    setCustomerSearch('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setPlanDurationDays(30);
    setPlanDurationCustom(false);
    setDeliveryIntervalDays(7);
    setDeliveryIntervalCustom(false);
    setPriceOverridden(false);
  };

  const handleCreate = async () => {
    if (!selectedCustomerId) { toast.error('Vui lòng chọn khách hàng'); return; }
    if (!packageName.trim()) { toast.error('Vui lòng nhập tên gói'); return; }
    if (lineItemsPerDelivery.length === 0) { toast.error('Vui lòng thêm ít nhất 1 món cho mỗi lần giao'); return; }
    if (deliveriesPlanned <= 0) { toast.error('Thời hạn gói và tần suất giao không hợp lệ'); return; }

    setCreating(true);
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
      planDurationDays,
      deliveryIntervalDays,
      deliveriesPlanned,
      startDate,
      totalPrice: parseInt(totalPrice) || 0,
      paymentStatus,
      status: 'Active',
      createdAt: new Date().toISOString(),
    };

    try {
      const subRef = await addDoc(collection(db, 'subscriptions'), subDoc);

      // Generate delivery schedule: one delivery every `deliveryIntervalDays`,
      // for `deliveriesPlanned` occurrences starting at `startDate`.
      const start = new Date(startDate);

      for (let i = 0; i < deliveriesPlanned; i++) {
        const deliveryDate = new Date(start);
        deliveryDate.setDate(deliveryDate.getDate() + (i * deliveryIntervalDays));

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

      resetCreateForm();
      await fetchAll();
      toast.success(`Đã tạo gói đăng ký và ${deliveriesPlanned} lần giao hàng`);
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const openEditSub = (sub) => {
    setEditingSub(sub);
    setEditForm({
      packageName: sub.packageName || '',
      totalPrice: String(sub.totalPrice || ''),
      paymentStatus: sub.paymentStatus || 'Chưa thanh toán',
      status: sub.status || 'Active',
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.packageName.trim()) { toast.error('Vui lòng nhập tên gói'); return; }

    setSavingEdit(true);
    try {
      const updates = {
        packageName: editForm.packageName.trim(),
        totalPrice: parseInt(editForm.totalPrice) || 0,
        paymentStatus: editForm.paymentStatus,
        status: editForm.status,
      };
      await updateDoc(doc(db, 'subscriptions', editingSub.id), updates);
      setSubscriptions(prev => prev.map(s => s.id === editingSub.id ? { ...s, ...updates } : s));
      toast.success('Đã cập nhật gói đăng ký');
      setEditingSub(null);
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteSub = async (sub) => {
    const remaining = deliveryCounts[sub.id] ?? 0;
    const ok = await confirm({
      title: 'Xóa gói đăng ký',
      message: remaining > 0
        ? `"${sub.packageName}" còn ${remaining} lần giao chưa thực hiện. Xóa gói sẽ xóa luôn các lần giao đó. Vẫn xóa?`
        : `Bạn có chắc muốn xóa "${sub.packageName}"? Hành động này không thể hoàn tác.`,
      confirmLabel: 'Xóa',
      danger: true,
    });
    if (!ok) return;

    setDeletingId(sub.id);
    try {
      const delivSnap = await getDocs(query(collection(db, 'deliveries'), where('subscriptionId', '==', sub.id)));
      await Promise.all(delivSnap.docs.map(d => deleteDoc(doc(db, 'deliveries', d.id))));
      await deleteDoc(doc(db, 'subscriptions', sub.id));
      setSubscriptions(prev => prev.filter(s => s.id !== sub.id));
      toast.success('Đã xóa gói đăng ký và lịch giao liên quan');
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const getCustomerName = (id) => customers.find(c => c.id === id)?.name || 'N/A';

  // Subscriptions created before the plan-duration/delivery-frequency model
  // only have a single `frequency` string ('weekly' | 'biweekly' | 'monthly').
  // Fall back to that for display so old records still read sensibly.
  const scheduleLabel = (sub) => {
    if (sub.deliveryIntervalDays) {
      const durationPart = sub.planDurationDays ? `${formatDurationLabel(sub.planDurationDays)} · ` : '';
      return `${durationPart}Giao ${formatIntervalLabel(sub.deliveryIntervalDays).toLowerCase()}`;
    }
    if (sub.frequency === 'weekly') return 'Hàng tuần';
    if (sub.frequency === 'biweekly') return '2 tuần/lần';
    if (sub.frequency === 'monthly') return 'Hàng tháng';
    return null;
  };

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
        <Button onClick={() => setShowCreate(true)}>+ Tạo gói mới</Button>
      </div>

      {/* Create modal */}
      <Modal open={showCreate} onClose={resetCreateForm} title="Tạo gói đăng ký" maxWidth="max-w-lg" align="top">
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

            <div className="grid grid-cols-2 gap-3 mb-1">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Thời hạn gói</label>
                <select
                  value={planDurationCustom ? 'custom' : String(planDurationDays)}
                  onChange={(e) => {
                    if (e.target.value === 'custom') { setPlanDurationCustom(true); return; }
                    setPlanDurationCustom(false);
                    setPlanDurationDays(Number(e.target.value));
                  }}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                >
                  {PLAN_DURATION_PRESETS.map(p => <option key={p.days} value={p.days}>{p.label}</option>)}
                  <option value="custom">Tùy chỉnh (nhập số ngày)</option>
                </select>
                {planDurationCustom && (
                  <input type="number" min="1" value={planDurationDays}
                    onChange={(e) => setPlanDurationDays(parseInt(e.target.value) || 1)}
                    placeholder="Số ngày"
                    className="w-full mt-1.5 px-3 py-2 border border-brand-300 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Tần suất giao hàng</label>
                <select
                  value={deliveryIntervalCustom ? 'custom' : String(deliveryIntervalDays)}
                  onChange={(e) => {
                    if (e.target.value === 'custom') { setDeliveryIntervalCustom(true); return; }
                    setDeliveryIntervalCustom(false);
                    setDeliveryIntervalDays(Number(e.target.value));
                  }}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                >
                  {DELIVERY_FREQUENCY_PRESETS.map(p => <option key={p.days} value={p.days}>{p.label}</option>)}
                  <option value="custom">Tùy chỉnh (nhập số ngày)</option>
                </select>
                {deliveryIntervalCustom && (
                  <input type="number" min="1" value={deliveryIntervalDays}
                    onChange={(e) => setDeliveryIntervalDays(parseInt(e.target.value) || 1)}
                    placeholder="Số ngày"
                    className="w-full mt-1.5 px-3 py-2 border border-brand-300 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
                )}
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-stone-700 mb-1">Ngày bắt đầu</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
            </div>

            {/* Live-computed schedule preview */}
            <div className="bg-brand-50 border border-brand-200 rounded-xl px-3 py-2 mb-3 text-sm text-brand-800">
              {deliveriesPlanned > 0 ? (
                <>→ Sẽ tạo <strong>{deliveriesPlanned}</strong> lần giao, cách nhau {formatIntervalLabel(deliveryIntervalDays).toLowerCase()}, từ {startDate} đến {scheduleEndDate}</>
              ) : (
                <>Thời hạn gói và tần suất giao chưa hợp lệ.</>
              )}
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

            {/* Price estimate — same discount policy as one-off orders, applied
                across the whole package (qty × số lần giao) */}
            {pricingResult && (
              <div className="bg-brand-50 border border-brand-200 rounded-xl p-3 mb-3 text-sm space-y-1">
                <div className="flex justify-between text-stone-600">
                  <span>Tạm tính ({deliveriesPlanned} lần giao):</span>
                  <span>{formatVND(pricingResult.lineSubtotal)}</span>
                </div>
                {Object.entries(pricingResult.proteinDiscounts).filter(([, v]) => v).map(([protein]) => (
                  <div key={protein} className="text-green-600 text-xs">✓ {PROTEIN_LABELS[protein] || protein} ≥1kg (cả gói) → giảm 10%</div>
                ))}
                {pricingResult.orderDiscountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Giảm giá theo tổng đơn ({pricingResult.orderDiscountTier}):</span>
                    <span>-{formatVND(pricingResult.orderDiscountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t border-brand-200 pt-1">
                  <span>Giá gợi ý:</span>
                  <span className="text-brand-700">{formatVND(suggestedPrice)}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Giá gói (VND)</label>
                <input type="number" value={totalPrice}
                  onChange={(e) => { setTotalPrice(e.target.value); setPriceOverridden(true); }}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
                {priceOverridden && pricingResult && Number(totalPrice) !== suggestedPrice && (
                  <button type="button" onClick={() => setPriceOverridden(false)}
                    className="text-xs text-brand-600 hover:text-brand-800 cursor-pointer bg-transparent border-0 p-0 mt-1 underline">
                    Dùng giá gợi ý ({formatVND(suggestedPrice)})
                  </button>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Thanh toán</label>
                <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/40">
                  {PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreate} loading={creating} fullWidth size="lg">✓ Tạo gói + lịch giao</Button>
              <Button variant="secondary" onClick={resetCreateForm}>Hủy</Button>
            </div>
      </Modal>

      {/* Subscription list */}
      {loading ? (
        <SkeletonList rows={4} />
      ) : subscriptions.length === 0 ? (
        <EmptyState icon={Package} title="Chưa có gói đăng ký" subtitle='Nhấn "Tạo gói mới" để bắt đầu' />
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
                    <h3 className="font-semibold">
                      <Link to={`/subscriptions/${sub.id}`} className="text-stone-800 hover:text-brand-600 no-underline transition-smooth">
                        {sub.packageName}
                      </Link>
                    </h3>
                    {sub.customerId ? (
                      <Link to={`/customers/${sub.customerId}`} className="text-sm text-stone-500 hover:text-brand-600 no-underline transition-smooth">
                        {sub.customerName || getCustomerName(sub.customerId)}
                      </Link>
                    ) : (
                      <p className="text-sm text-stone-500">{sub.customerName || 'N/A'}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-stone-500">
                      <span>📅 {sub.startDate}</span>
                      {scheduleLabel(sub) && <span>{scheduleLabel(sub)}</span>}
                      {sub.totalPrice > 0 && <span className="font-medium text-brand-600">{formatVND(sub.totalPrice)}</span>}
                    </div>
                  </div>
                  <div className="text-right space-y-1.5">
                    <Badge tone={remaining <= 1 ? 'amber' : 'brand'}>Còn {remaining}/{sub.deliveriesPlanned} lần giao</Badge>
                    <div className="flex items-center justify-end gap-2">
                      <Badge tone={paymentTone(sub.paymentStatus)}>{sub.paymentStatus}</Badge>
                      {sub.status !== 'Active' && <Badge tone="stone">{sub.status}</Badge>}
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-0.5">
                      <button
                        onClick={() => openEditSub(sub)}
                        className="text-stone-400 hover:text-brand-600 cursor-pointer bg-transparent border-0 transition-smooth"
                        aria-label="Sửa gói đăng ký"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSub(sub)}
                        disabled={deletingId === sub.id}
                        className="text-stone-300 hover:text-red-500 cursor-pointer bg-transparent border-0 transition-smooth disabled:opacity-50"
                        aria-label="Xóa gói đăng ký"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit modal (basic fields only) */}
      <Modal open={!!editingSub} onClose={() => setEditingSub(null)} title="Sửa gói đăng ký" maxWidth="max-w-sm">
        <form onSubmit={handleSaveEdit} className="space-y-3">
          <Input
            label="Tên gói"
            required
            value={editForm.packageName}
            onChange={(e) => setEditForm(f => ({ ...f, packageName: e.target.value }))}
          />
          <Input
            label="Tổng giá gói (VND)"
            type="number"
            value={editForm.totalPrice}
            onChange={(e) => setEditForm(f => ({ ...f, totalPrice: e.target.value }))}
          />
          <Select
            label="Thanh toán"
            value={editForm.paymentStatus}
            onChange={(e) => setEditForm(f => ({ ...f, paymentStatus: e.target.value }))}
          >
            {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select
            label="Trạng thái gói"
            value={editForm.status}
            onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value }))}
          >
            {SUBSCRIPTION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <p className="text-xs text-stone-400">Lưu ý: sửa ở đây không thay đổi lịch giao hàng đã tạo — vào trang Giao hàng để chỉnh từng lần giao.</p>
          <div className="flex gap-2 pt-2">
            <Button type="submit" fullWidth loading={savingEdit}>Cập nhật</Button>
            <Button type="button" variant="secondary" onClick={() => setEditingSub(null)}>Hủy</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

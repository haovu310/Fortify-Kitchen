import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { calculateOrderTotal, formatVND } from '../lib/pricing';
import { PROTEIN_LABELS, PAYMENT_STATUSES, getMenuItemLabel } from '../lib/menuData';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { ClipboardList, Search, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import { SkeletonTable } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

const PAGE_SIZE = 10;
const paymentTone = (status) => status === 'Đã thanh toán' ? 'green' : status === 'Đã cọc' ? 'amber' : 'red';

export default function OrdersPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null); // null = create mode, order object = edit mode

  // Filter/sort/pagination state lives in the URL so refreshing or sharing a
  // link preserves the exact view (e.g. ?status=Đã cọc&q=Lan&sort=total&page=2).
  const [searchParams, setSearchParams] = useSearchParams();
  const filterStatus = searchParams.get('status') || 'all';
  const search = searchParams.get('q') || '';
  const sortKey = searchParams.get('sort') || 'deliveryDate';
  const sortDir = searchParams.get('dir') || 'desc';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const updateParams = (updates) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, value]) => {
        const isDefault = value === null || value === undefined || value === '' ||
          (key === 'status' && value === 'all') || (key === 'page' && value === 1);
        if (isDefault) next.delete(key);
        else next.set(key, value);
      });
      return next;
    }, { replace: true });
  };
  const setFilterStatus = (v) => updateParams({ status: v, page: 1 });
  const setSearch = (v) => updateParams({ q: v, page: 1 });
  const setPage = (v) => updateParams({ page: v });

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

  const closeCreate = () => {
    setShowCreate(false);
    setEditingOrder(null);
    setLineItems([]);
    setSelectedCustomerId('');
    setCustomerSearch('');
    setDeliveryDate(new Date().toISOString().split('T')[0]);
    setPaymentStatus('Chưa thanh toán');
  };

  const openCreate = () => {
    setEditingOrder(null);
    setLineItems([]);
    setSelectedCustomerId('');
    setCustomerSearch('');
    setDeliveryDate(new Date().toISOString().split('T')[0]);
    setPaymentStatus('Chưa thanh toán');
    setShowCreate(true);
  };

  const openEdit = (order) => {
    setEditingOrder(order);
    setSelectedCustomerId(order.customerId || '');
    setCustomerSearch(order.customerName || getCustomerName(order.customerId));
    setDeliveryDate(order.deliveryDate || new Date().toISOString().split('T')[0]);
    setPaymentStatus(order.paymentStatus || 'Chưa thanh toán');
    setLineItems((order.lineItems || []).map(l => ({ ...l })));
    setShowCreate(true);
  };

  const handleCreateOrder = async () => {
    if (!selectedCustomerId) { toast.error('Vui lòng chọn khách hàng'); return; }
    if (lineItems.length === 0) { toast.error('Vui lòng thêm ít nhất 1 món'); return; }

    setCreating(true);
    const result = calculateOrderTotal(lineItems);
    const customer = customers.find(c => c.id === selectedCustomerId);

    const orderDoc = {
      customerId: selectedCustomerId,
      customerName: customer?.name || '',
      deliveryDate,
      paymentStatus,
      deliveryStatus: editingOrder?.deliveryStatus || 'Scheduled',
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
    };

    try {
      if (editingOrder) {
        await updateDoc(doc(db, 'orders', editingOrder.id), orderDoc);
        toast.success('Đã cập nhật đơn hàng');
      } else {
        await addDoc(collection(db, 'orders'), { ...orderDoc, createdAt: new Date().toISOString() });
        toast.success('Đã tạo đơn hàng mới');
      }
      closeCreate();
      await fetchAll();
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteOrder = async (order) => {
    const ok = await confirm({
      title: 'Xóa đơn hàng',
      message: `Xóa đơn hàng của "${order.customerName || getCustomerName(order.customerId)}" ngày ${order.deliveryDate}? Doanh thu và prep list sẽ được tính lại mà không có đơn này.`,
      confirmLabel: 'Xóa',
      danger: true,
    });
    if (!ok) return;

    setDeletingId(order.id);
    try {
      await deleteDoc(doc(db, 'orders', order.id));
      setOrders(prev => prev.filter(o => o.id !== order.id));
      toast.success('Đã xóa đơn hàng');
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const getCustomerName = (id) => customers.find(c => c.id === id)?.name || 'N/A';

  const filteredCustomers = customers.filter(c =>
    (c.name || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone || '').includes(customerSearch)
  );

  // Filter -> search -> sort -> paginate
  const processed = useMemo(() => {
    let list = filterStatus === 'all' ? orders : orders.filter(o => o.paymentStatus === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o => {
        const name = o.customerName || customers.find(c => c.id === o.customerId)?.name || 'N/A';
        return name.toLowerCase().includes(q);
      });
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      if (sortKey === 'total') return dir * ((a.total || 0) - (b.total || 0));
      if (sortKey === 'customerName') return dir * (a.customerName || '').localeCompare(b.customerName || '');
      return dir * (a.deliveryDate || '').localeCompare(b.deliveryDate || '');
    });
    return list;
  }, [orders, filterStatus, search, sortKey, sortDir, customers]);

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const pageItems = processed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key) => {
    if (sortKey === key) {
      updateParams({ dir: sortDir === 'asc' ? 'desc' : 'asc', page: 1 });
    } else {
      updateParams({ sort: key, dir: 'desc', page: 1 });
    }
  };

  const SortHeader = ({ label, sortKeyName, align = 'left' }) => (
    <th
      className={`px-4 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wide cursor-pointer select-none hover:text-brand-600 transition-smooth text-${align}`}
      onClick={() => toggleSort(sortKeyName)}
    >
      <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        {label}
        {sortKey === sortKeyName && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
      </span>
    </th>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 font-display flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-brand-600" />
            Đơn hàng
          </h1>
          <p className="text-sm text-stone-500 mt-1">{processed.length} / {orders.length} đơn hàng</p>
        </div>
        <Button onClick={openCreate}>+ Tạo đơn hàng</Button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Tìm theo tên khách hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 bg-white"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer border-0 transition-smooth ${filterStatus === 'all' ? 'bg-brand-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
            Tất cả
          </button>
          {PAYMENT_STATUSES.map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer border-0 transition-smooth ${filterStatus === s ? 'bg-brand-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Create order modal */}
      <Modal open={showCreate} onClose={closeCreate} title={editingOrder ? 'Sửa đơn hàng' : 'Tạo đơn hàng mới'} maxWidth="max-w-lg" align="top">
        {/* Customer picker */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-stone-700 mb-1">Khách hàng *</label>
          <input
            type="text"
            placeholder="Tìm khách hàng..."
            value={customerSearch}
            onChange={(e) => { setCustomerSearch(e.target.value); setSelectedCustomerId(''); }}
            className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
          />
          {customerSearch && !selectedCustomerId && (
            <div className="mt-1 border border-stone-200 rounded-xl max-h-32 overflow-y-auto bg-white shadow-warm-lg">
              {filteredCustomers.map(c => (
                <button key={c.id} onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(c.name); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-brand-50 cursor-pointer border-0 bg-transparent transition-smooth">
                  <span className="font-medium">{c.name}</span>
                  {c.phone && <span className="text-stone-400 ml-2">{c.phone}</span>}
                </button>
              ))}
              {filteredCustomers.length === 0 && <p className="px-3 py-2 text-sm text-stone-400">Không tìm thấy</p>}
            </div>
          )}
          {selectedCustomerId && (
            <p className="text-xs text-green-600 mt-1">✓ Đã chọn: {customers.find(c => c.id === selectedCustomerId)?.name}</p>
          )}
        </div>

        {/* Date + payment */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Ngày giao</label>
            <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Thanh toán</label>
            <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 bg-white">
              {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Add items */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-stone-700 mb-1">Thêm món</label>
          <div className="flex gap-2">
            <select value={selectedMenuItemId} onChange={(e) => setSelectedMenuItemId(e.target.value)}
              className="flex-1 px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 bg-white">
              {menuItems.map(item => (
                <option key={item.id} value={item.id}>{getMenuItemLabel(item)} — {formatVND(item.price)}</option>
              ))}
            </select>
            <input type="number" min="1" value={addQty} onChange={(e) => setAddQty(parseInt(e.target.value) || 1)}
              className="w-16 px-2 py-2 border border-stone-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500" />
            <Button onClick={addLineItem}>+</Button>
          </div>
        </div>

        {/* Line items */}
        {lineItems.length > 0 && (
          <div className="mb-4 space-y-1">
            {lineItems.map((l, i) => (
              <div key={i} className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2 text-sm">
                <span className="flex-1">{PROTEIN_LABELS[l.protein]} {l.flavor} ({l.sizeGrams}g)</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateLineQty(i, l.qty - 1)} className="w-6 h-6 rounded bg-stone-200 hover:bg-stone-300 border-0 cursor-pointer text-xs">−</button>
                  <span className="w-6 text-center font-medium">{l.qty}</span>
                  <button onClick={() => updateLineQty(i, l.qty + 1)} className="w-6 h-6 rounded bg-stone-200 hover:bg-stone-300 border-0 cursor-pointer text-xs">+</button>
                  <span className="w-24 text-right text-stone-600">{formatVND(l.unitPrice * l.qty)}</span>
                  <button onClick={() => removeLineItem(i)} className="text-red-400 hover:text-red-600 cursor-pointer bg-transparent border-0">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pricing summary */}
        {pricingResult && (
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-3 mb-4 text-sm space-y-1">
            <div className="flex justify-between text-stone-600">
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
          <Button onClick={handleCreateOrder} loading={creating} fullWidth size="lg">
            {editingOrder ? '✓ Cập nhật đơn hàng' : '✓ Tạo đơn hàng'}
          </Button>
          <Button variant="secondary" onClick={closeCreate}>Hủy</Button>
        </div>
      </Modal>

      {/* Order table */}
      {loading ? (
        <SkeletonTable rows={6} cols={4} />
      ) : processed.length === 0 ? (
        <EmptyState icon={ClipboardList} title={search ? 'Không tìm thấy đơn hàng' : 'Chưa có đơn hàng'} />
      ) : (
        <>
          <div className="bg-white rounded-3xl border border-stone-100 shadow-warm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50 text-left">
                    <SortHeader label="Ngày giao" sortKeyName="deliveryDate" />
                    <SortHeader label="Khách hàng" sortKeyName="customerName" />
                    <th className="px-4 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wide text-left">Số phần</th>
                    <SortHeader label="Tổng tiền" sortKeyName="total" align="right" />
                    <th className="px-4 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wide text-center">Thanh toán</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((order, idx) => (
                    <tr key={order.id} className={`border-b border-stone-50 last:border-0 hover:bg-brand-50/40 transition-smooth ${idx % 2 === 1 ? 'bg-stone-50/50' : ''}`}>
                      <td className="px-4 py-3 text-stone-500 tabular-nums">{order.deliveryDate}</td>
                      <td className="px-4 py-3 font-medium text-stone-700">
                        {order.customerId ? (
                          <Link to={`/customers/${order.customerId}`} className="text-stone-700 hover:text-brand-600 no-underline transition-smooth">
                            {order.customerName || getCustomerName(order.customerId)}
                          </Link>
                        ) : (order.customerName || 'N/A')}
                      </td>
                      <td className="px-4 py-3 text-stone-500 tabular-nums">
                        {order.lineItems ? order.lineItems.reduce((s, l) => s + l.qty, 0) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-brand-700 tabular-nums">{formatVND(order.total)}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge tone={paymentTone(order.paymentStatus)}>{order.paymentStatus}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEdit(order)}
                            className="text-stone-400 hover:text-brand-600 cursor-pointer bg-transparent border-0 transition-smooth"
                            aria-label="Sửa đơn hàng"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order)}
                            disabled={deletingId === order.id}
                            className="text-stone-300 hover:text-red-500 cursor-pointer bg-transparent border-0 transition-smooth disabled:opacity-50"
                            aria-label="Xóa đơn hàng"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-stone-500">
              <span>Trang {page} / {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="w-4 h-4" /> Trước
                </Button>
                <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  Sau <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

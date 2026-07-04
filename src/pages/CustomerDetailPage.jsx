import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatVND } from '../lib/pricing';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { ArrowLeft, Phone, MessageCircle, MapPin, StickyNote, ClipboardList, Package, Pencil, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import { SkeletonList } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

const paymentTone = (status) => status === 'Đã thanh toán' ? 'green' : status === 'Đã cọc' ? 'amber' : 'red';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', zalo: '', address: '', notes: '' });
  const [errors, setErrors] = useState({});

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [customersSnap, ordersSnap, subsSnap] = await Promise.all([
      getDocs(collection(db, 'customers')),
      getDocs(query(collection(db, 'orders'), where('customerId', '==', id))),
      getDocs(query(collection(db, 'subscriptions'), where('customerId', '==', id))),
    ]);
    const c = customersSnap.docs.find(d => d.id === id);
    setCustomer(c ? { id: c.id, ...c.data() } : null);
    setOrders(ordersSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.deliveryDate || '').localeCompare(a.deliveryDate || '')));
    setSubscriptions(subsSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.startDate || '').localeCompare(a.startDate || '')));
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openEdit = () => {
    if (!customer) return;
    setForm({
      name: customer.name || '',
      phone: customer.phone || '',
      zalo: customer.zalo || '',
      address: customer.address || '',
      notes: customer.notes || '',
    });
    setErrors({});
    setShowEdit(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setErrors({ name: 'Vui lòng nhập tên khách hàng' }); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'customers', id), { ...form });
      setCustomer(prev => ({ ...prev, ...form }));
      toast.success('Đã cập nhật khách hàng');
      setShowEdit(false);
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const linkedCount = orders.length + subscriptions.length;
    const ok = await confirm({
      title: 'Xóa khách hàng',
      message: linkedCount > 0
        ? `"${customer.name}" có ${orders.length} đơn hàng và ${subscriptions.length} gói đăng ký đã lưu. Xóa khách hàng sẽ không xóa các bản ghi đó. Vẫn xóa?`
        : `Bạn có chắc muốn xóa "${customer.name}"? Hành động này không thể hoàn tác.`,
      confirmLabel: 'Xóa',
      danger: true,
    });
    if (!ok) return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'customers', id));
      toast.success('Đã xóa khách hàng');
      navigate('/customers');
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
      setDeleting(false);
    }
  };

  const totalSpent = orders.reduce((s, o) => s + (o.total || 0), 0)
    + subscriptions.reduce((s, sub) => s + (sub.totalPrice || 0), 0);

  if (loading) {
    return <SkeletonList rows={4} />;
  }

  if (!customer) {
    return (
      <EmptyState
        title="Không tìm thấy khách hàng"
        subtitle="Khách hàng này có thể đã bị xóa."
        action={<Link to="/customers" className="text-brand-600 text-sm font-medium no-underline">← Quay lại danh sách khách hàng</Link>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/customers" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-brand-600 no-underline transition-smooth">
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách khách hàng
      </Link>

      {/* Profile card */}
      <div className="bg-white rounded-3xl border border-stone-100 shadow-warm p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-stone-800 font-display">{customer.name}</h1>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-2 text-sm text-stone-600">
              {customer.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-stone-400" /> {customer.phone}</span>}
              {customer.zalo && <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5 text-stone-400" /> {customer.zalo}</span>}
              {customer.address && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-stone-400" /> {customer.address}</span>}
            </div>
            {customer.notes && (
              <p className="flex items-center gap-1 text-xs text-stone-400 mt-2"><StickyNote className="w-3.5 h-3.5" /> {customer.notes}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={openEdit}><Pencil className="w-3.5 h-3.5" /> Sửa</Button>
            <Button variant="danger" size="sm" loading={deleting} onClick={handleDelete}><Trash2 className="w-3.5 h-3.5" /> Xóa</Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-stone-100">
          <div>
            <div className="text-xl font-bold text-brand-700 font-display">{orders.length}</div>
            <div className="text-xs text-stone-500 mt-0.5">Đơn hàng lẻ</div>
          </div>
          <div>
            <div className="text-xl font-bold text-brand-700 font-display">{subscriptions.length}</div>
            <div className="text-xs text-stone-500 mt-0.5">Gói đăng ký</div>
          </div>
          <div>
            <div className="text-xl font-bold text-brand-700 font-display">{formatVND(totalSpent)}</div>
            <div className="text-xs text-stone-500 mt-0.5">Tổng chi tiêu</div>
          </div>
        </div>
      </div>

      {/* Order history */}
      <section className="bg-white rounded-3xl border border-stone-100 shadow-warm overflow-hidden">
        <div className="px-4 py-3 bg-stone-50 border-b border-stone-100">
          <h2 className="text-sm font-semibold text-stone-700 font-display flex items-center gap-1.5"><ClipboardList className="w-4 h-4" /> Lịch sử đơn hàng</h2>
        </div>
        {orders.length === 0 ? (
          <p className="px-4 py-6 text-sm text-stone-400 text-center">Chưa có đơn hàng nào</p>
        ) : (
          <div className="divide-y divide-stone-50">
            {orders.map(order => (
              <div key={order.id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="text-stone-500">{order.deliveryDate}</span>
                  <span className="font-medium text-stone-700 ml-3">{formatVND(order.total)}</span>
                  {order.lineItems && <span className="text-stone-400 ml-2">{order.lineItems.reduce((s, l) => s + l.qty, 0)} phần</span>}
                </div>
                <Badge tone={paymentTone(order.paymentStatus)}>{order.paymentStatus}</Badge>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Subscription history */}
      <section className="bg-white rounded-3xl border border-stone-100 shadow-warm overflow-hidden">
        <div className="px-4 py-3 bg-stone-50 border-b border-stone-100">
          <h2 className="text-sm font-semibold text-stone-700 font-display flex items-center gap-1.5"><Package className="w-4 h-4" /> Lịch sử gói đăng ký</h2>
        </div>
        {subscriptions.length === 0 ? (
          <p className="px-4 py-6 text-sm text-stone-400 text-center">Chưa có gói đăng ký nào</p>
        ) : (
          <div className="divide-y divide-stone-50">
            {subscriptions.map(sub => (
              <div key={sub.id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-stone-700">{sub.packageName}</span>
                  <span className="text-stone-400 ml-2">{sub.startDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  {sub.totalPrice > 0 && <span className="text-stone-600">{formatVND(sub.totalPrice)}</span>}
                  <Badge tone={sub.status === 'Active' ? 'brand' : 'stone'}>{sub.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Edit modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Sửa khách hàng">
        <form onSubmit={handleSave} className="space-y-3">
          <Input label="Tên" required value={form.name} error={errors.name}
            onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="SĐT" type="tel" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
            <Input label="Zalo" value={form.zalo} onChange={(e) => setForm(f => ({ ...f, zalo: e.target.value }))} />
          </div>
          <Input label="Địa chỉ" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
          <Textarea label="Ghi chú" rows={2} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex gap-2 pt-2">
            <Button type="submit" fullWidth loading={saving}>Cập nhật</Button>
            <Button type="button" variant="secondary" onClick={() => setShowEdit(false)}>Hủy</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

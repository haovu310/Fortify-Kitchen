import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { Users, Search, ChevronRight, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Modal from '../components/ui/Modal';
import { SkeletonList } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

export default function CustomersPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', zalo: '', address: '', notes: '' });
  const [errors, setErrors] = useState({});

  const fetchCustomers = async () => {
    setLoading(true);
    const snapshot = await getDocs(collection(db, 'customers'));
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    setCustomers(data);
    setLoading(false);
  };

  useEffect(() => { fetchCustomers(); }, []);

  const resetForm = () => {
    setForm({ name: '', phone: '', zalo: '', address: '', notes: '' });
    setErrors({});
    setEditingId(null);
    setShowForm(false);
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Vui lòng nhập tên khách hàng';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'customers', editingId), { ...form });
        setCustomers(prev => prev.map(c => c.id === editingId ? { ...c, ...form } : c));
        toast.success('Đã cập nhật khách hàng');
      } else {
        const docRef = await addDoc(collection(db, 'customers'), {
          ...form,
          createdAt: serverTimestamp(),
        });
        setCustomers(prev => [...prev, { id: docRef.id, ...form }].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success('Đã thêm khách hàng mới');
      }
      resetForm();
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (customer) => {
    setForm({
      name: customer.name || '',
      phone: customer.phone || '',
      zalo: customer.zalo || '',
      address: customer.address || '',
      notes: customer.notes || '',
    });
    setErrors({});
    setEditingId(customer.id);
    setShowForm(true);
  };

  const handleDelete = async (customer) => {
    setDeletingId(customer.id);
    try {
      const [ordersSnap, subsSnap] = await Promise.all([
        getDocs(query(collection(db, 'orders'), where('customerId', '==', customer.id))),
        getDocs(query(collection(db, 'subscriptions'), where('customerId', '==', customer.id))),
      ]);
      const linkedCount = ordersSnap.size + subsSnap.size;
      const ok = await confirm({
        title: 'Xóa khách hàng',
        message: linkedCount > 0
          ? `"${customer.name}" có ${ordersSnap.size} đơn hàng và ${subsSnap.size} gói đăng ký đã lưu. Xóa khách hàng sẽ không xóa các bản ghi đó, nhưng bạn sẽ không thể xem lại thông tin khách hàng này từ chúng. Vẫn xóa?`
          : `Bạn có chắc muốn xóa "${customer.name}"? Hành động này không thể hoàn tác.`,
        confirmLabel: 'Xóa',
        danger: true,
      });
      if (!ok) { setDeletingId(null); return; }

      await deleteDoc(doc(db, 'customers', customer.id));
      setCustomers(prev => prev.filter(c => c.id !== customer.id));
      toast.success('Đã xóa khách hàng');
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    return (c.name || '').toLowerCase().includes(q) ||
           (c.phone || '').includes(q) ||
           (c.address || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 font-display flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-600" />
            Khách hàng
          </h1>
          <p className="text-sm text-stone-500 mt-1">{customers.length} khách hàng</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>+ Thêm khách hàng</Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          placeholder="Tìm theo tên, SĐT, địa chỉ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 bg-white"
        />
      </div>

      {/* Form modal */}
      <Modal open={showForm} onClose={resetForm} title={editingId ? 'Sửa khách hàng' : 'Thêm khách hàng'}>
        <form onSubmit={handleSave} className="space-y-3">
          <Input
            label="Tên"
            required
            value={form.name}
            error={errors.name}
            onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="SĐT"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
            />
            <Input
              label="Zalo"
              value={form.zalo}
              onChange={(e) => setForm(f => ({ ...f, zalo: e.target.value }))}
            />
          </div>
          <Input
            label="Địa chỉ"
            value={form.address}
            onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
          />
          <Textarea
            label="Ghi chú"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
          />
          <div className="flex gap-2 pt-2">
            <Button type="submit" fullWidth loading={saving}>
              {editingId ? 'Cập nhật' : 'Thêm'}
            </Button>
            <Button type="button" variant="secondary" onClick={resetForm}>Hủy</Button>
          </div>
        </form>
      </Modal>

      {/* Customer list */}
      {loading ? (
        <SkeletonList rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? 'Không tìm thấy khách hàng' : 'Chưa có khách hàng'}
          subtitle={search ? undefined : 'Nhấn "Thêm khách hàng" để bắt đầu'}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(customer => (
            <div key={customer.id} className="bg-white rounded-xl border border-stone-100 shadow-warm p-4 hover:shadow-warm-lg transition-smooth animate-fade-in">
              <div className="flex items-start justify-between gap-3">
                <Link to={`/customers/${customer.id}`} className="flex-1 min-w-0 no-underline group">
                  <h3 className="font-semibold text-stone-800 group-hover:text-brand-600 transition-smooth flex items-center gap-1">
                    {customer.name}
                    <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-brand-500 transition-smooth" />
                  </h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-stone-500">
                    {customer.phone && <span>📞 {customer.phone}</span>}
                    {customer.zalo && <span>💬 {customer.zalo}</span>}
                    {customer.address && <span className="text-stone-400">📍 {customer.address}</span>}
                  </div>
                  {customer.notes && <p className="text-xs text-stone-400 mt-1">📝 {customer.notes}</p>}
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="secondary" size="sm" onClick={() => startEdit(customer)}>Sửa</Button>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={deletingId === customer.id}
                    onClick={() => handleDelete(customer)}
                    aria-label={`Xóa ${customer.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useToast } from '../components/Toast';

export default function CustomersPage() {
  const toast = useToast();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', zalo: '', address: '', notes: '' });

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
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Vui lòng nhập tên khách hàng'); return; }

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
    setEditingId(customer.id);
    setShowForm(true);
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
          <h1 className="text-2xl font-bold text-slate-800">👥 Khách hàng</h1>
          <p className="text-sm text-slate-500 mt-1">{customers.length} khách hàng</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-smooth cursor-pointer border-0"
        >
          + Thêm khách hàng
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input
          type="text"
          placeholder="Tìm theo tên, SĐT, địa chỉ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 bg-white"
        />
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              {editingId ? '✏️ Sửa khách hàng' : '➕ Thêm khách hàng'}
            </h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên *</label>
                <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">SĐT</label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Zalo</label>
                  <input type="text" value={form.zalo} onChange={(e) => setForm(f => ({ ...f, zalo: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Địa chỉ</label>
                <input type="text" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label>
                <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-2 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl transition-smooth cursor-pointer border-0 text-sm">
                  {editingId ? 'Cập nhật' : 'Thêm'}
                </button>
                <button type="button" onClick={resetForm} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-xl transition-smooth cursor-pointer border-0 text-sm">
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-500">{search ? 'Không tìm thấy khách hàng' : 'Chưa có khách hàng'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(customer => (
            <div key={customer.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-smooth animate-fade-in">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800">{customer.name}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                    {customer.phone && <span>📞 {customer.phone}</span>}
                    {customer.zalo && <span>💬 {customer.zalo}</span>}
                    {customer.address && <span className="text-slate-400">📍 {customer.address}</span>}
                  </div>
                  {customer.notes && <p className="text-xs text-slate-400 mt-1">📝 {customer.notes}</p>}
                </div>
                <button
                  onClick={() => startEdit(customer)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-brand-50 text-slate-600 hover:text-brand-600 text-sm rounded-lg transition-smooth cursor-pointer border-0"
                >
                  ✏️ Sửa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useToast } from '../components/Toast';
import { Users } from 'lucide-react';

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
          <h1 className="text-2xl font-bold text-stone-800 font-display flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-600" />
            Khách hàng
          </h1>
          <p className="text-sm text-stone-500 mt-1">{customers.length} khách hàng</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-medium rounded-xl transition-smooth cursor-pointer border-0"
        >
          + Thêm khách hàng
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -transtone-y-1/2 text-stone-400">🔍</span>
        <input
          type="text"
          placeholder="Tìm theo tên, SĐT, địa chỉ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 bg-white"
        />
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}>
          <div className="bg-white rounded-2xl shadow-warm-lg w-full max-w-md p-6 animate-fade-in">
            <h2 className="text-lg font-bold text-stone-800 mb-4">
              {editingId ? '✏️ Sửa khách hàng' : '➕ Thêm khách hàng'}
            </h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Tên *</label>
                <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">SĐT</label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Zalo</label>
                  <input type="text" value={form.zalo} onChange={(e) => setForm(f => ({ ...f, zalo: e.target.value }))}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Địa chỉ</label>
                <input type="text" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Ghi chú</label>
                <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-2 bg-brand-500 hover:bg-brand-400 text-white font-medium rounded-xl transition-smooth cursor-pointer border-0 text-sm">
                  {editingId ? 'Cập nhật' : 'Thêm'}
                </button>
                <button type="button" onClick={resetForm} className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium rounded-xl transition-smooth cursor-pointer border-0 text-sm">
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
        <div className="relative overflow-hidden text-center py-16 bg-white rounded-3xl border border-stone-100 shadow-warm">
          <svg className="absolute w-[300px] h-[300px] opacity-5 text-accent-400 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,81.3,-46.3C90.8,-33.5,96.8,-18,95.5,-2.9C94.2,12.2,85.6,26.9,76.5,41.2C67.4,55.5,57.8,69.4,44.7,78.5C31.6,87.6,15.8,91.9,0.3,91.4C-15.2,90.9,-30.4,85.6,-43.3,76.3C-56.2,67,-66.8,53.7,-75.6,39.2C-84.4,24.7,-91.4,9,-90.4,-6.2C-89.4,-21.4,-80.4,-36.1,-70.3,-49C-60.2,-61.9,-49,-73,-35.6,-79.8C-22.2,-86.6,-6.6,-89.1,7.8,-87.3C22.2,-85.5,44.4,-79.4,44.7,-76.4Z" transform="translate(100 100)" />
          </svg>
          <div className="relative z-10">
            <p className="text-stone-500 font-display">{search ? 'Không tìm thấy khách hàng' : 'Chưa có khách hàng'}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(customer => (
            <div key={customer.id} className="bg-white rounded-xl border border-stone-100 shadow-warm p-4 hover:shadow-md transition-smooth animate-fade-in">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-stone-800">{customer.name}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-stone-500">
                    {customer.phone && <span>📞 {customer.phone}</span>}
                    {customer.zalo && <span>💬 {customer.zalo}</span>}
                    {customer.address && <span className="text-stone-400">📍 {customer.address}</span>}
                  </div>
                  {customer.notes && <p className="text-xs text-stone-400 mt-1">📝 {customer.notes}</p>}
                </div>
                <button
                  onClick={() => startEdit(customer)}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-accent-50 text-stone-600 hover:text-accent-500 text-sm rounded-lg transition-smooth cursor-pointer border-0"
                >
                  Sửa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

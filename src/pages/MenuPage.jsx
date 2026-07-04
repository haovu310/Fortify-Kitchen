import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DEFAULT_MENU_ITEMS, PROTEIN_LABELS } from '../lib/menuData';
import { formatVND } from '../lib/pricing';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

export default function MenuPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState('');

  const fetchItems = async () => {
    setLoading(true);
    const snapshot = await getDocs(collection(db, 'menuItems'));
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort: chicken first, then beef, then shrimp; within protein sort by flavor then size
    data.sort((a, b) => {
      const proteinOrder = { chicken: 0, beef: 1, shrimp: 2 };
      const pa = proteinOrder[a.protein] ?? 3;
      const pb = proteinOrder[b.protein] ?? 3;
      if (pa !== pb) return pa - pb;
      if (a.flavor !== b.flavor) return a.flavor.localeCompare(b.flavor);
      return a.sizeGrams - b.sizeGrams;
    });
    setItems(data);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSeed = async () => {
    if (items.length > 0) {
      const ok = await confirm({
        title: 'Thêm dữ liệu mẫu',
        message: 'Thực đơn đã có dữ liệu. Bạn có muốn thêm lại từ đầu?',
        confirmLabel: 'Thêm lại',
      });
      if (!ok) return;
    }
    setSeeding(true);
    try {
      for (const item of DEFAULT_MENU_ITEMS) {
        await addDoc(collection(db, 'menuItems'), item);
      }
      await fetchItems();
      toast.success('Đã tạo dữ liệu mẫu thành công');
    } catch (err) {
      console.error('Seed error:', err);
      toast.error('Lỗi khi tạo dữ liệu mẫu: ' + err.message);
    }
    setSeeding(false);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditPrice(String(item.price));
  };

  const savePrice = async (itemId) => {
    const newPrice = parseInt(editPrice, 10);
    if (isNaN(newPrice) || newPrice <= 0) {
      toast.error('Giá không hợp lệ');
      return;
    }
    try {
      await updateDoc(doc(db, 'menuItems', itemId), { price: newPrice });
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, price: newPrice } : i));
      setEditingId(null);
      toast.success('Đã cập nhật giá');
    } catch (err) {
      toast.error('Lỗi khi cập nhật: ' + err.message);
    }
  };

  const toggleActive = async (item) => {
    try {
      await updateDoc(doc(db, 'menuItems', item.id), { active: !item.active });
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, active: !i.active } : i));
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    }
  };

  // Group by protein
  const grouped = items.reduce((acc, item) => {
    if (!acc[item.protein]) acc[item.protein] = [];
    acc[item.protein].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">🍽️ Thực đơn</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý giá và món ăn</p>
        </div>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-smooth cursor-pointer border-0 disabled:opacity-50"
        >
          {seeding ? 'Đang tạo...' : '🌱 Tạo dữ liệu mẫu'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-lg mb-2">Chưa có món nào</p>
          <p className="text-slate-400 text-sm">Nhấn "Tạo dữ liệu mẫu" để bắt đầu</p>
        </div>
      ) : (
        Object.entries(grouped).map(([protein, proteinItems]) => (
          <div key={protein} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
            <div className="px-4 py-3 bg-brand-50 border-b border-brand-100">
              <h2 className="text-lg font-semibold text-brand-800">
                {PROTEIN_LABELS[protein] || protein}
                <span className="text-sm font-normal text-brand-600 ml-2">({proteinItems.length} món)</span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="px-4 py-2.5 font-medium text-slate-500">Hương vị</th>
                    <th className="px-4 py-2.5 font-medium text-slate-500 text-center">Khối lượng</th>
                    <th className="px-4 py-2.5 font-medium text-slate-500 text-right">Giá</th>
                    <th className="px-4 py-2.5 font-medium text-slate-500 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {proteinItems.map(item => (
                    <tr key={item.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-smooth ${!item.active ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-2.5 font-medium text-slate-700 capitalize">{item.flavor}</td>
                      <td className="px-4 py-2.5 text-center text-slate-600">{item.sizeGrams}g</td>
                      <td className="px-4 py-2.5 text-right">
                        {editingId === item.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') savePrice(item.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              className="w-24 px-2 py-1 text-right border border-brand-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                              autoFocus
                            />
                            <button onClick={() => savePrice(item.id)} className="text-brand-500 hover:text-brand-700 cursor-pointer bg-transparent border-0 text-sm">✓</button>
                            <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-0 text-sm">✕</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(item)}
                            className="text-slate-700 hover:text-brand-600 cursor-pointer bg-transparent border-0 font-medium transition-smooth text-sm"
                            title="Nhấn để sửa giá"
                          >
                            {formatVND(item.price)}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => toggleActive(item)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer border-0 transition-smooth
                            ${item.active
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                        >
                          {item.active ? 'Đang bán' : 'Tạm ngưng'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DEFAULT_MENU_ITEMS, PROTEIN_LABELS } from '../lib/menuData';
import { formatVND } from '../lib/pricing';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { UtensilsCrossed } from 'lucide-react';

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
          <h1 className="text-2xl font-bold text-stone-800 font-display flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-brand-600" />
            Thực đơn
          </h1>
          <p className="text-sm text-stone-500 mt-1">Quản lý giá và món ăn</p>
        </div>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-medium rounded-xl transition-smooth cursor-pointer border-0 disabled:opacity-50"
        >
          {seeding ? 'Đang tạo...' : '🌱 Tạo dữ liệu mẫu'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="relative overflow-hidden text-center py-16 bg-white rounded-3xl border border-stone-100 shadow-warm">
          <svg className="absolute w-[300px] h-[300px] opacity-5 text-accent-400 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,81.3,-46.3C90.8,-33.5,96.8,-18,95.5,-2.9C94.2,12.2,85.6,26.9,76.5,41.2C67.4,55.5,57.8,69.4,44.7,78.5C31.6,87.6,15.8,91.9,0.3,91.4C-15.2,90.9,-30.4,85.6,-43.3,76.3C-56.2,67,-66.8,53.7,-75.6,39.2C-84.4,24.7,-91.4,9,-90.4,-6.2C-89.4,-21.4,-80.4,-36.1,-70.3,-49C-60.2,-61.9,-49,-73,-35.6,-79.8C-22.2,-86.6,-6.6,-89.1,7.8,-87.3C22.2,-85.5,44.4,-79.4,44.7,-76.4Z" transform="translate(100 100)" />
          </svg>
          <div className="relative z-10">
            <p className="text-stone-500 text-lg mb-2 font-display">Chưa có món nào — hãy tạo dữ liệu mẫu nhé!</p>
            <p className="text-stone-400 text-sm">Nhấn "Tạo dữ liệu mẫu" để bắt đầu</p>
          </div>
        </div>
      ) : (
        Object.entries(grouped).map(([protein, proteinItems]) => (
          <div key={protein} className="bg-white rounded-3xl border border-stone-100 shadow-warm overflow-hidden animate-fade-in">
            <div className="px-4 py-3 bg-brand-50 border-b border-brand-100">
              <h2 className="text-lg font-semibold text-brand-800 font-display">
                {PROTEIN_LABELS[protein] || protein}
                <span className="text-sm font-normal text-brand-600 ml-2">({proteinItems.length} món)</span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 text-left">
                    <th className="px-4 py-2.5 font-medium text-stone-500">Hương vị</th>
                    <th className="px-4 py-2.5 font-medium text-stone-500 text-center">Khối lượng</th>
                    <th className="px-4 py-2.5 font-medium text-stone-500 text-right">Giá</th>
                    <th className="px-4 py-2.5 font-medium text-stone-500 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {proteinItems.map(item => (
                    <tr key={item.id} className={`border-b border-stone-50 hover:bg-stone-50 transition-smooth ${!item.active ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-2.5 font-medium text-stone-700 capitalize">{item.flavor}</td>
                      <td className="px-4 py-2.5 text-center text-stone-600">{item.sizeGrams}g</td>
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
                            <button onClick={() => setEditingId(null)} className="text-stone-400 hover:text-stone-600 cursor-pointer bg-transparent border-0 text-sm">✕</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(item)}
                            className="text-stone-700 hover:text-brand-600 cursor-pointer bg-transparent border-0 font-medium transition-smooth text-sm"
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
                              : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
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

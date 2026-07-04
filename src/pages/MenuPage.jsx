import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DEFAULT_MENU_ITEMS, PROTEIN_LABELS } from '../lib/menuData';
import { formatVND } from '../lib/pricing';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { UtensilsCrossed, Sprout, Search, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { SkeletonTable } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

export default function MenuPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState('');

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

  const handleDelete = async (item) => {
    const label = `${PROTEIN_LABELS[item.protein] || item.protein} ${item.flavor} (${item.sizeGrams}g)`;
    const ok = await confirm({
      title: 'Xóa món',
      message: `Xóa "${label}" khỏi thực đơn? Các đơn hàng/gói đăng ký đã tạo trước đó sẽ không bị ảnh hưởng, nhưng món này sẽ không thể chọn cho đơn mới.`,
      confirmLabel: 'Xóa',
      danger: true,
    });
    if (!ok) return;

    setDeletingId(item.id);
    try {
      await deleteDoc(doc(db, 'menuItems', item.id));
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast.success('Đã xóa món');
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // Search across all items (by protein label or flavor), then group by protein
  const filteredItems = items.filter(item => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return item.flavor.toLowerCase().includes(q) ||
      (PROTEIN_LABELS[item.protein] || item.protein).toLowerCase().includes(q);
  });
  const grouped = filteredItems.reduce((acc, item) => {
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
        {/* Dev-only convenience: never shown in a production build */}
        {import.meta.env.DEV && (
          <Button onClick={handleSeed} loading={seeding} variant="secondary">
            <Sprout className="w-4 h-4" />
            {seeding ? 'Đang tạo...' : 'Tạo dữ liệu mẫu (dev)'}
          </Button>
        )}
      </div>

      {!loading && items.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Tìm theo loại protein hoặc hương vị..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 bg-white"
          />
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={5} cols={4} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Chưa có món nào"
          subtitle={import.meta.env.DEV ? 'Nhấn "Tạo dữ liệu mẫu (dev)" để bắt đầu' : 'Liên hệ quản trị viên để thiết lập thực đơn'}
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title="Không tìm thấy món nào" />
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
                  <tr className="border-b border-stone-100 bg-stone-50 text-left">
                    <th className="px-4 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wide">Hương vị</th>
                    <th className="px-4 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wide text-center">Khối lượng</th>
                    <th className="px-4 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wide text-right">Giá</th>
                    <th className="px-4 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wide text-center">Trạng thái</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {proteinItems.map((item, idx) => (
                    <tr key={item.id} className={`border-b border-stone-50 last:border-0 hover:bg-brand-50/40 transition-smooth ${!item.active ? 'opacity-50' : ''} ${idx % 2 === 1 ? 'bg-stone-50/50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-stone-700 capitalize">{item.flavor}</td>
                      <td className="px-4 py-3 text-center text-stone-600 tabular-nums">{item.sizeGrams}g</td>
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
                          className="cursor-pointer border-0 bg-transparent p-0 hover:opacity-80 transition-smooth"
                          title="Nhấn để đổi trạng thái"
                        >
                          <Badge tone={item.active ? 'green' : 'stone'}>{item.active ? 'Đang bán' : 'Tạm ngưng'}</Badge>
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => handleDelete(item)}
                          disabled={deletingId === item.id}
                          className="text-stone-300 hover:text-red-500 cursor-pointer bg-transparent border-0 transition-smooth disabled:opacity-50"
                          aria-label={`Xóa món ${item.flavor}`}
                        >
                          <Trash2 className="w-4 h-4" />
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

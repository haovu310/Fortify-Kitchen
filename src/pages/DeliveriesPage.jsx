import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { collection, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DELIVERY_STATUSES, PROTEIN_LABELS } from '../lib/menuData';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { Truck, Trash2 } from 'lucide-react';
import { SkeletonList } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

export default function DeliveriesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  // Filters live in the URL so refresh/share preserves the exact view.
  const [searchParams, setSearchParams] = useSearchParams();
  const filterStatus = searchParams.get('status') || 'all';
  const filterDate = searchParams.get('date') || '';

  const updateParams = (updates) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, value]) => {
        if (!value || value === 'all') next.delete(key);
        else next.set(key, value);
      });
      return next;
    }, { replace: true });
  };

  const fetchDeliveries = async () => {
    setLoading(true);
    const snapshot = await getDocs(collection(db, 'deliveries'));
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    data.sort((a, b) => (a.scheduledDate || '').localeCompare(b.scheduledDate || ''));
    setDeliveries(data);
    setLoading(false);
  };

  useEffect(() => { fetchDeliveries(); }, []);

  const handleStatusChange = async (deliveryId, newStatus) => {
    try {
      await updateDoc(doc(db, 'deliveries', deliveryId), { status: newStatus });
      setDeliveries(prev => prev.map(d => d.id === deliveryId ? { ...d, status: newStatus } : d));
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    }
  };

  const handleDelete = async (delivery) => {
    const ok = await confirm({
      title: 'Xóa lần giao',
      message: `Xóa lần giao cho "${delivery.customerName || 'N/A'}" ngày ${delivery.scheduledDate}? Nếu đây là gói đăng ký, số lần giao còn lại sẽ giảm theo.`,
      confirmLabel: 'Xóa',
      danger: true,
    });
    if (!ok) return;

    setDeletingId(delivery.id);
    try {
      await deleteDoc(doc(db, 'deliveries', delivery.id));
      setDeliveries(prev => prev.filter(d => d.id !== delivery.id));
      toast.success('Đã xóa lần giao');
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = deliveries.filter(d => {
    if (filterStatus !== 'all' && d.status !== filterStatus) return false;
    if (filterDate && d.scheduledDate !== filterDate) return false;
    return true;
  });

  const statusColor = (status) => {
    switch (status) {
      case 'Scheduled': return 'bg-blue-100 text-blue-700';
      case 'Prepping': return 'bg-amber-100 text-amber-700';
      case 'Delivered': return 'bg-green-100 text-green-700';
      case 'Skipped': return 'bg-stone-100 text-stone-500';
      case 'Cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-stone-100 text-stone-600';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-800 font-display flex items-center gap-2">
          <Truck className="w-6 h-6 text-brand-600" />
          Giao hàng
        </h1>
        <p className="text-sm text-stone-500 mt-1">{filtered.length} / {deliveries.length} lần giao</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-stone-500 mb-1">Trạng thái</label>
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => updateParams({ status: 'all' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border-0 transition-smooth ${filterStatus === 'all' ? 'bg-brand-500 text-white' : 'bg-stone-100 text-stone-600'}`}>
              Tất cả
            </button>
            {DELIVERY_STATUSES.map(s => (
              <button key={s} onClick={() => updateParams({ status: s })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border-0 transition-smooth ${filterStatus === s ? 'bg-brand-500 text-white' : 'bg-stone-100 text-stone-600'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">Ngày</label>
          <input type="date" value={filterDate} onChange={(e) => updateParams({ date: e.target.value })}
            className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
          {filterDate && (
            <button onClick={() => updateParams({ date: '' })} className="ml-1 text-stone-400 hover:text-stone-600 cursor-pointer bg-transparent border-0 text-xs">✕</button>
          )}
        </div>
      </div>

      {/* Delivery list */}
      {loading ? (
        <SkeletonList rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Truck} title="Không có lần giao nào" />
      ) : (
        <div className="space-y-2">
          {filtered.map(delivery => (
            <div key={delivery.id} className="bg-white rounded-xl border border-stone-100 shadow-warm p-4 hover:shadow-warm-lg transition-smooth animate-fade-in">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-stone-800">
                      {delivery.customerId ? (
                        <Link to={`/customers/${delivery.customerId}`} className="text-stone-800 hover:text-brand-600 no-underline transition-smooth">
                          {delivery.customerName || 'N/A'}
                        </Link>
                      ) : (delivery.customerName || 'N/A')}
                    </h3>
                    <span className="text-xs text-stone-400">•</span>
                    <span className="text-sm text-brand-600 font-medium">{delivery.packageName || 'N/A'}</span>
                  </div>
                  <div className="text-sm text-stone-500 mt-1">
                    📅 {delivery.scheduledDate}
                  </div>
                  {delivery.lineItems && delivery.lineItems.length > 0 && (
                    <div className="text-xs text-stone-400 mt-1">
                      {delivery.lineItems.map((l, i) => (
                        <span key={i}>{i > 0 && ', '}{PROTEIN_LABELS[l.protein] || l.protein} {l.flavor} ×{l.qty}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={delivery.status}
                    onChange={(e) => handleStatusChange(delivery.id, e.target.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${statusColor(delivery.status)}`}
                  >
                    {DELIVERY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button
                    onClick={() => handleDelete(delivery)}
                    disabled={deletingId === delivery.id}
                    className="text-stone-300 hover:text-red-500 cursor-pointer bg-transparent border-0 transition-smooth disabled:opacity-50"
                    aria-label="Xóa lần giao"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

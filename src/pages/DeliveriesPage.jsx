import { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DELIVERY_STATUSES, PROTEIN_LABELS } from '../lib/menuData';
import { useToast } from '../components/Toast';
import { Truck } from 'lucide-react';

export default function DeliveriesPage() {
  const toast = useToast();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');

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
        <p className="text-sm text-stone-500 mt-1">{deliveries.length} lần giao</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-stone-500 mb-1">Trạng thái</label>
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border-0 transition-smooth ${filterStatus === 'all' ? 'bg-brand-500 text-white' : 'bg-stone-100 text-stone-600'}`}>
              Tất cả
            </button>
            {DELIVERY_STATUSES.map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border-0 transition-smooth ${filterStatus === s ? 'bg-brand-500 text-white' : 'bg-stone-100 text-stone-600'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">Ngày</label>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
          {filterDate && (
            <button onClick={() => setFilterDate('')} className="ml-1 text-stone-400 hover:text-stone-600 cursor-pointer bg-transparent border-0 text-xs">✕</button>
          )}
        </div>
      </div>

      {/* Delivery list */}
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
            <p className="text-stone-500 font-display">Không có lần giao nào</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(delivery => (
            <div key={delivery.id} className="bg-white rounded-xl border border-stone-100 shadow-warm p-4 hover:shadow-md transition-smooth animate-fade-in">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-stone-800">{delivery.customerName || 'N/A'}</h3>
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
                <select
                  value={delivery.status}
                  onChange={(e) => handleStatusChange(delivery.id, e.target.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${statusColor(delivery.status)}`}
                >
                  {DELIVERY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

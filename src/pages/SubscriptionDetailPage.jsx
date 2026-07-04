import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { calculateOrderTotal, formatVND } from '../lib/pricing';
import {
  PAYMENT_STATUSES, PROTEIN_LABELS, getMenuItemLabel,
  formatIntervalLabel, formatDurationLabel,
} from '../lib/menuData';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { ArrowLeft, Package, Truck, Pencil, Trash2, CalendarRange } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import { SkeletonList } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

const SUBSCRIPTION_STATUSES = ['Active', 'Paused', 'Completed', 'Cancelled'];
const paymentTone = (status) => status === 'Đã thanh toán' ? 'green' : status === 'Đã cọc' ? 'amber' : 'red';
const deliveryStatusTone = (status) => {
  switch (status) {
    case 'Delivered': return 'green';
    case 'Prepping': return 'amber';
    case 'Scheduled': return 'blue';
    case 'Cancelled': return 'red';
    default: return 'stone';
  }
};

export default function SubscriptionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  const [sub, setSub] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editForm, setEditForm] = useState({ packageName: '', totalPrice: '', paymentStatus: '', status: '' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [subsSnap, delivSnap] = await Promise.all([
      getDocs(collection(db, 'subscriptions')),
      getDocs(query(collection(db, 'deliveries'), where('subscriptionId', '==', id))),
    ]);
    const s = subsSnap.docs.find(d => d.id === id);
    setSub(s ? { id: s.id, ...s.data() } : null);
    setDeliveries(
      delivSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.scheduledDate || '').localeCompare(b.scheduledDate || ''))
    );
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Recompute the same bulk-discount price estimate used at creation time,
  // so the detail page shows exactly how the package price breaks down —
  // even for legacy subscriptions that predate this feature.
  const pricingResult = sub?.lineItemsPerDelivery?.length > 0 && sub?.deliveriesPlanned > 0
    ? calculateOrderTotal(sub.lineItemsPerDelivery.map(l => ({ ...l, qty: l.qty * sub.deliveriesPlanned })))
    : null;

  const remaining = deliveries.filter(d => !['Delivered', 'Skipped', 'Cancelled'].includes(d.status)).length;
  const delivered = deliveries.filter(d => d.status === 'Delivered').length;

  const scheduleLabel = () => {
    if (!sub) return null;
    if (sub.deliveryIntervalDays) {
      const durationPart = sub.planDurationDays ? `${formatDurationLabel(sub.planDurationDays)} · ` : '';
      return `${durationPart}Giao ${formatIntervalLabel(sub.deliveryIntervalDays).toLowerCase()}`;
    }
    if (sub.frequency === 'weekly') return 'Hàng tuần';
    if (sub.frequency === 'biweekly') return '2 tuần/lần';
    if (sub.frequency === 'monthly') return 'Hàng tháng';
    return null;
  };

  const openEdit = () => {
    if (!sub) return;
    setEditForm({
      packageName: sub.packageName || '',
      totalPrice: String(sub.totalPrice || ''),
      paymentStatus: sub.paymentStatus || 'Chưa thanh toán',
      status: sub.status || 'Active',
    });
    setShowEdit(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.packageName.trim()) { toast.error('Vui lòng nhập tên gói'); return; }
    setSaving(true);
    try {
      const updates = {
        packageName: editForm.packageName.trim(),
        totalPrice: parseInt(editForm.totalPrice) || 0,
        paymentStatus: editForm.paymentStatus,
        status: editForm.status,
      };
      await updateDoc(doc(db, 'subscriptions', id), updates);
      setSub(prev => ({ ...prev, ...updates }));
      toast.success('Đã cập nhật gói đăng ký');
      setShowEdit(false);
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Xóa gói đăng ký',
      message: remaining > 0
        ? `"${sub.packageName}" còn ${remaining} lần giao chưa thực hiện. Xóa gói sẽ xóa luôn các lần giao đó. Vẫn xóa?`
        : `Bạn có chắc muốn xóa "${sub.packageName}"? Hành động này không thể hoàn tác.`,
      confirmLabel: 'Xóa',
      danger: true,
    });
    if (!ok) return;

    setDeleting(true);
    try {
      await Promise.all(deliveries.map(d => deleteDoc(doc(db, 'deliveries', d.id))));
      await deleteDoc(doc(db, 'subscriptions', id));
      toast.success('Đã xóa gói đăng ký và lịch giao liên quan');
      navigate('/subscriptions');
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
      setDeleting(false);
    }
  };

  if (loading) {
    return <SkeletonList rows={4} />;
  }

  if (!sub) {
    return (
      <EmptyState
        title="Không tìm thấy gói đăng ký"
        subtitle="Gói này có thể đã bị xóa."
        action={<Link to="/subscriptions" className="text-brand-600 text-sm font-medium no-underline">← Quay lại danh sách gói đăng ký</Link>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/subscriptions" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-brand-600 no-underline transition-smooth">
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách gói đăng ký
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-3xl border border-stone-100 shadow-warm p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-stone-800 font-display flex items-center gap-2">
              <Package className="w-6 h-6 text-brand-600" /> {sub.packageName}
            </h1>
            {sub.customerId ? (
              <Link to={`/customers/${sub.customerId}`} className="text-sm text-stone-500 hover:text-brand-600 no-underline transition-smooth">
                {sub.customerName || 'N/A'}
              </Link>
            ) : (
              <p className="text-sm text-stone-500">{sub.customerName || 'N/A'}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge tone={sub.status === 'Active' ? 'brand' : 'stone'}>{sub.status}</Badge>
              <Badge tone={paymentTone(sub.paymentStatus)}>{sub.paymentStatus}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={openEdit}><Pencil className="w-3.5 h-3.5" /> Sửa</Button>
            <Button variant="danger" size="sm" loading={deleting} onClick={handleDelete}><Trash2 className="w-3.5 h-3.5" /> Xóa</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-5 border-t border-stone-100">
          <div>
            <div className="text-xl font-bold text-brand-700 font-display">{sub.startDate}</div>
            <div className="text-xs text-stone-500 mt-0.5">Ngày bắt đầu</div>
          </div>
          <div>
            <div className="text-xl font-bold text-brand-700 font-display">{scheduleLabel() || '—'}</div>
            <div className="text-xs text-stone-500 mt-0.5">Lịch giao</div>
          </div>
          <div>
            <div className="text-xl font-bold text-brand-700 font-display">{delivered} / {sub.deliveriesPlanned ?? deliveries.length}</div>
            <div className="text-xs text-stone-500 mt-0.5">Đã giao / tổng số lần</div>
          </div>
          <div>
            <div className="text-xl font-bold text-brand-700 font-display">{formatVND(sub.totalPrice || 0)}</div>
            <div className="text-xs text-stone-500 mt-0.5">Giá gói</div>
          </div>
        </div>
      </div>

      {/* Price breakdown */}
      {pricingResult && (
        <section className="bg-white rounded-3xl border border-stone-100 shadow-warm p-4">
          <h2 className="text-sm font-semibold text-stone-700 font-display mb-3">Chi tiết giá (áp dụng chính sách giảm giá)</h2>
          <div className="text-sm space-y-1.5">
            <div className="flex justify-between text-stone-600">
              <span>Tạm tính ({sub.deliveriesPlanned} lần giao):</span>
              <span className="tabular-nums">{formatVND(pricingResult.lineSubtotal)}</span>
            </div>
            {Object.entries(pricingResult.proteinDiscounts).filter(([, v]) => v).map(([protein]) => (
              <div key={protein} className="text-green-600 text-xs">✓ {PROTEIN_LABELS[protein] || protein} ≥1kg (cả gói) → giảm 10%</div>
            ))}
            {pricingResult.orderDiscountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Giảm giá theo tổng đơn ({pricingResult.orderDiscountTier}):</span>
                <span className="tabular-nums">-{formatVND(pricingResult.orderDiscountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t border-stone-100 pt-1.5">
              <span>Giá gợi ý:</span>
              <span className="text-brand-700 tabular-nums">{formatVND(pricingResult.finalTotal)}</span>
            </div>
            {Math.round(pricingResult.finalTotal) !== (sub.totalPrice || 0) && (
              <p className="text-xs text-amber-600 pt-1">⚠ Giá gói hiện tại ({formatVND(sub.totalPrice || 0)}) khác với giá gợi ý — có thể đã được điều chỉnh thủ công.</p>
            )}
          </div>
        </section>
      )}

      {/* Items per delivery */}
      {sub.lineItemsPerDelivery?.length > 0 && (
        <section className="bg-white rounded-3xl border border-stone-100 shadow-warm overflow-hidden">
          <div className="px-4 py-3 bg-stone-50 border-b border-stone-100">
            <h2 className="text-sm font-semibold text-stone-700 font-display">Món mỗi lần giao</h2>
          </div>
          <div className="divide-y divide-stone-50">
            {sub.lineItemsPerDelivery.map((l, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <span className="text-stone-700">{getMenuItemLabel(l)}</span>
                <span className="text-stone-500">× {l.qty}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Full delivery schedule */}
      <section className="bg-white rounded-3xl border border-stone-100 shadow-warm overflow-hidden">
        <div className="px-4 py-3 bg-stone-50 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-700 font-display flex items-center gap-1.5">
            <CalendarRange className="w-4 h-4" /> Lịch giao hàng đầy đủ
          </h2>
          <span className="text-xs text-stone-500">{deliveries.length} lần</span>
        </div>
        {deliveries.length === 0 ? (
          <div className="px-4 py-6">
            <EmptyState icon={Truck} title="Chưa có lịch giao" />
          </div>
        ) : (
          <div className="divide-y divide-stone-50 max-h-96 overflow-y-auto">
            {deliveries.map((d, idx) => (
              <div key={d.id} className={`px-4 py-2.5 flex items-center justify-between text-sm ${idx % 2 === 1 ? 'bg-stone-50/50' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className="text-stone-400 tabular-nums w-6 text-right">{idx + 1}</span>
                  <span className="font-medium text-stone-700 tabular-nums">{d.scheduledDate}</span>
                </div>
                <Badge tone={deliveryStatusTone(d.status)}>{d.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Edit modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Sửa gói đăng ký" maxWidth="max-w-sm">
        <form onSubmit={handleSaveEdit} className="space-y-3">
          <Input
            label="Tên gói"
            required
            value={editForm.packageName}
            onChange={(e) => setEditForm(f => ({ ...f, packageName: e.target.value }))}
          />
          <Input
            label="Tổng giá gói (VND)"
            type="number"
            value={editForm.totalPrice}
            onChange={(e) => setEditForm(f => ({ ...f, totalPrice: e.target.value }))}
          />
          <Select
            label="Thanh toán"
            value={editForm.paymentStatus}
            onChange={(e) => setEditForm(f => ({ ...f, paymentStatus: e.target.value }))}
          >
            {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select
            label="Trạng thái gói"
            value={editForm.status}
            onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value }))}
          >
            {SUBSCRIPTION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <p className="text-xs text-stone-400">Lưu ý: sửa ở đây không thay đổi lịch giao hàng đã tạo — vào trang Giao hàng để chỉnh từng lần giao.</p>
          <div className="flex gap-2 pt-2">
            <Button type="submit" fullWidth loading={saving}>Cập nhật</Button>
            <Button type="button" variant="secondary" onClick={() => setShowEdit(false)}>Hủy</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

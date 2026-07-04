import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PROTEIN_LABELS, getMenuItemLabel } from '../lib/menuData';

export default function PrepListPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [prepItems, setPrepItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPrepList = async (date) => {
    setLoading(true);

    // Fetch deliveries + orders for the selected date
    const [delivSnap, orderSnap] = await Promise.all([
      getDocs(collection(db, 'deliveries')),
      getDocs(collection(db, 'orders')),
    ]);

    const deliveries = delivSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(d => d.scheduledDate === date && ['Scheduled', 'Prepping'].includes(d.status));

    const orders = orderSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(o => o.deliveryDate === date);

    // Aggregate all line items
    const aggregation = {};

    const processLineItems = (lineItems) => {
      for (const item of (lineItems || [])) {
        const key = `${item.protein}|${item.flavor}|${item.sizeGrams}`;
        if (!aggregation[key]) {
          aggregation[key] = {
            protein: item.protein,
            flavor: item.flavor,
            sizeGrams: item.sizeGrams,
            portions: 0,
          };
        }
        aggregation[key].portions += item.qty || 0;
      }
    };

    for (const delivery of deliveries) {
      processLineItems(delivery.lineItems);
    }
    for (const order of orders) {
      processLineItems(order.lineItems);
    }

    // Sort: chicken → beef → shrimp, then flavor, then size
    const sorted = Object.values(aggregation).sort((a, b) => {
      const po = { chicken: 0, beef: 1, shrimp: 2 };
      return (po[a.protein] ?? 3) - (po[b.protein] ?? 3)
        || a.flavor.localeCompare(b.flavor)
        || a.sizeGrams - b.sizeGrams;
    });

    setPrepItems(sorted);
    setLoading(false);
  };

  useEffect(() => { fetchPrepList(selectedDate); }, [selectedDate]);

  const totalPortions = prepItems.reduce((s, i) => s + i.portions, 0);
  const totalGrams = prepItems.reduce((s, i) => s + (i.portions * i.sizeGrams), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">👨‍🍳 Prep List</h1>
          <p className="text-sm text-slate-500 mt-1">Tổng hợp nguyên liệu cần chuẩn bị</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 font-medium">Ngày:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : prepItems.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-lg mb-1">Không có gì cần chuẩn bị</p>
          <p className="text-slate-400 text-sm">Ngày {selectedDate} không có đơn hàng hoặc giao hàng nào</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-brand-50 rounded-2xl p-4 border border-brand-100">
              <div className="text-3xl font-bold text-brand-700">{totalPortions}</div>
              <div className="text-sm text-brand-600">Tổng phần</div>
            </div>
            <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
              <div className="text-3xl font-bold text-purple-700">{(totalGrams / 1000).toFixed(1)} kg</div>
              <div className="text-sm text-purple-600">Tổng khối lượng</div>
            </div>
          </div>

          {/* Prep table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left">
                    <th className="px-4 py-3 font-medium text-slate-500">Món</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-center">Phần</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-right">Tổng gram</th>
                  </tr>
                </thead>
                <tbody>
                  {prepItems.map((item, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-brand-50/30 transition-smooth">
                      <td className="px-4 py-3 font-medium text-slate-700">
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                          item.protein === 'chicken' ? 'bg-amber-400' :
                          item.protein === 'beef' ? 'bg-red-400' : 'bg-pink-400'
                        }`} />
                        {PROTEIN_LABELS[item.protein] || item.protein} {item.flavor}
                        <span className="text-slate-400 ml-1">({item.sizeGrams}g)</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block bg-brand-100 text-brand-700 px-2.5 py-0.5 rounded-full font-semibold">
                          {item.portions}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-600">
                        {(item.portions * item.sizeGrams).toLocaleString()}g
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-brand-200 bg-brand-50">
                    <td className="px-4 py-3 font-bold text-brand-800">Tổng cộng</td>
                    <td className="px-4 py-3 text-center font-bold text-brand-700">{totalPortions}</td>
                    <td className="px-4 py-3 text-right font-bold text-brand-700">{totalGrams.toLocaleString()}g</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PROTEIN_LABELS, getMenuItemLabel } from '../lib/menuData';
import { ChefHat } from 'lucide-react';

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
          <h1 className="text-2xl font-bold text-stone-800 font-display flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-brand-600" />
            Prep List
          </h1>
          <p className="text-sm text-stone-500 mt-1">Tổng hợp nguyên liệu cần chuẩn bị</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-stone-600 font-medium">Ngày:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : prepItems.length === 0 ? (
        <div className="relative overflow-hidden text-center py-16 bg-white rounded-3xl border border-stone-100 shadow-warm">
          <svg className="absolute w-[300px] h-[300px] opacity-5 text-accent-400 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,81.3,-46.3C90.8,-33.5,96.8,-18,95.5,-2.9C94.2,12.2,85.6,26.9,76.5,41.2C67.4,55.5,57.8,69.4,44.7,78.5C31.6,87.6,15.8,91.9,0.3,91.4C-15.2,90.9,-30.4,85.6,-43.3,76.3C-56.2,67,-66.8,53.7,-75.6,39.2C-84.4,24.7,-91.4,9,-90.4,-6.2C-89.4,-21.4,-80.4,-36.1,-70.3,-49C-60.2,-61.9,-49,-73,-35.6,-79.8C-22.2,-86.6,-6.6,-89.1,7.8,-87.3C22.2,-85.5,44.4,-79.4,44.7,-76.4Z" transform="translate(100 100)" />
          </svg>
          <div className="relative z-10">
            <p className="text-stone-500 text-lg mb-1 font-display">Không có gì cần chuẩn bị</p>
            <p className="text-stone-400 text-sm">Ngày {selectedDate} không có đơn hàng hoặc giao hàng nào</p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-brand-50 rounded-3xl p-4 border border-brand-100">
              <div className="text-3xl font-bold text-brand-700 font-display">{totalPortions}</div>
              <div className="text-sm text-brand-600">Tổng phần</div>
            </div>
            <div className="bg-accent-50 rounded-3xl p-4 border border-accent-100">
              <div className="text-3xl font-bold text-accent-700 font-display">{(totalGrams / 1000).toFixed(1)} kg</div>
              <div className="text-sm text-accent-600">Tổng khối lượng</div>
            </div>
          </div>

          {/* Prep table */}
          <div className="bg-white rounded-3xl border border-stone-100 shadow-warm overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50 text-left">
                    <th className="px-4 py-3 font-medium text-stone-500">Món</th>
                    <th className="px-4 py-3 font-medium text-stone-500 text-center">Phần</th>
                    <th className="px-4 py-3 font-medium text-stone-500 text-right">Tổng gram</th>
                  </tr>
                </thead>
                <tbody>
                  {prepItems.map((item, i) => (
                    <tr key={i} className="border-b border-stone-50 hover:bg-brand-50/30 transition-smooth">
                      <td className="px-4 py-3 font-medium text-stone-700">
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                          item.protein === 'chicken' ? 'bg-amber-400' :
                          item.protein === 'beef' ? 'bg-red-400' : 'bg-pink-400'
                        }`} />
                        {PROTEIN_LABELS[item.protein] || item.protein} {item.flavor}
                        <span className="text-stone-400 ml-1">({item.sizeGrams}g)</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block bg-brand-100 text-brand-700 px-2.5 py-0.5 rounded-full font-semibold">
                          {item.portions}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-stone-600">
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

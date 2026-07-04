import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { calculateOrderTotal, formatVND } from '../lib/pricing';
import { PROTEIN_LABELS, getMenuItemLabel } from '../lib/menuData';

export default function TestPricingPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [lineItems, setLineItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    const fetch = async () => {
      const snapshot = await getDocs(collection(db, 'menuItems'));
      const data = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => d.active !== false)
        .sort((a, b) => {
          const po = { chicken: 0, beef: 1, shrimp: 2 };
          return (po[a.protein] ?? 3) - (po[b.protein] ?? 3) || a.flavor.localeCompare(b.flavor) || a.sizeGrams - b.sizeGrams;
        });
      setData(data);
    };
    const setData = (data) => {
      setMenuItems(data);
      if (data.length > 0) setSelectedItemId(data[0].id);
    };
    fetch();
  }, []);

  const addLineItem = () => {
    const menuItem = menuItems.find(m => m.id === selectedItemId);
    if (!menuItem || qty <= 0) return;
    // Check if same item already in list — merge quantities
    const existing = lineItems.find(l => l.menuItemId === selectedItemId);
    if (existing) {
      setLineItems(prev => prev.map(l =>
        l.menuItemId === selectedItemId ? { ...l, qty: l.qty + qty } : l
      ));
    } else {
      setLineItems(prev => [...prev, {
        menuItemId: selectedItemId,
        protein: menuItem.protein,
        flavor: menuItem.flavor,
        sizeGrams: menuItem.sizeGrams,
        unitPrice: menuItem.price,
        qty,
      }]);
    }
    setQty(1);
  };

  const removeLineItem = (index) => {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateQty = (index, newQty) => {
    if (newQty <= 0) {
      removeLineItem(index);
      return;
    }
    setLineItems(prev => prev.map((l, i) => i === index ? { ...l, qty: newQty } : l));
  };

  // Calculate live
  const result = lineItems.length > 0 ? calculateOrderTotal(lineItems) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">🧪 Test Pricing</h1>
        <p className="text-sm text-stone-500 mt-1">Kiểm tra tính năng tính giá với các tổ hợp đơn hàng</p>
      </div>

      {/* Add item form */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-warm p-4">
        <h2 className="text-sm font-semibold text-stone-600 mb-3">Thêm món</h2>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-stone-500 mb-1">Chọn món</label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 bg-white"
            >
              {menuItems.map(item => (
                <option key={item.id} value={item.id}>
                  {getMenuItemLabel(item)} — {formatVND(item.price)}
                </option>
              ))}
            </select>
          </div>
          <div className="w-20">
            <label className="block text-xs text-stone-500 mb-1">Số lượng</label>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
            />
          </div>
          <button
            onClick={addLineItem}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-medium rounded-xl transition-smooth cursor-pointer border-0"
          >
            + Thêm
          </button>
        </div>
      </div>

      {/* Line items table */}
      {lineItems.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-warm overflow-hidden animate-fade-in">
          <div className="px-4 py-3 bg-stone-50 border-b border-stone-100">
            <h2 className="text-sm font-semibold text-stone-600">Các món đã chọn</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-left">
                  <th className="px-4 py-2 font-medium text-stone-500">Món</th>
                  <th className="px-4 py-2 font-medium text-stone-500 text-center">SL</th>
                  <th className="px-4 py-2 font-medium text-stone-500 text-right">Đơn giá</th>
                  <th className="px-4 py-2 font-medium text-stone-500 text-right">Thành tiền</th>
                  <th className="px-4 py-2 font-medium text-stone-500 text-center">1kg?</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {result.lineDetails.map((line, i) => (
                  <tr key={i} className="border-b border-stone-50 hover:bg-stone-50 transition-smooth">
                    <td className="px-4 py-2 font-medium text-stone-700">
                      {PROTEIN_LABELS[line.protein]} {line.flavor} ({line.sizeGrams}g)
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => updateQty(i, lineItems[i].qty - 1)} className="w-6 h-6 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 border-0 cursor-pointer text-sm">−</button>
                        <span className="w-8 text-center">{line.qty}</span>
                        <button onClick={() => updateQty(i, lineItems[i].qty + 1)} className="w-6 h-6 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 border-0 cursor-pointer text-sm">+</button>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right text-stone-600">{formatVND(line.unitPrice)}</td>
                    <td className="px-4 py-2 text-right font-medium text-stone-700">
                      {formatVND(line.lineTotal)}
                      {line.discounted && <span className="text-green-600 text-xs ml-1">(-10%)</span>}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {line.discounted
                        ? <span className="text-green-600 text-xs font-medium bg-green-50 px-2 py-0.5 rounded-full">✓</span>
                        : <span className="text-stone-400 text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => removeLineItem(i)} className="text-red-400 hover:text-red-600 cursor-pointer bg-transparent border-0 text-sm">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pricing breakdown */}
      {result && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-warm p-4 space-y-4 animate-fade-in">
          {/* Per-protein summary */}
          <div>
            <h3 className="text-sm font-semibold text-stone-600 mb-2">📊 Tổng gram theo loại protein</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(result.proteinGrams).map(([protein, grams]) => (
                <div key={protein} className={`px-3 py-2 rounded-xl text-sm font-medium ${
                  result.proteinDiscounts[protein]
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-stone-50 border border-stone-200 text-stone-600'
                }`}>
                  <span className="font-semibold">{PROTEIN_LABELS[protein] || protein}:</span> {grams.toLocaleString()}g
                  {result.proteinDiscounts[protein] && <span className="ml-1 text-green-600">≥1kg → -10%</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-stone-100 pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Tạm tính (sau giảm giá protein):</span>
              <span className="font-medium text-stone-700">{formatVND(result.lineSubtotal)}</span>
            </div>
            {result.orderDiscountTier ? (
              <div className="flex justify-between text-sm">
                <span className="text-green-600">
                  Giảm đơn hàng ({result.orderDiscountTier} → -{result.orderDiscountPercent}%):
                </span>
                <span className="font-medium text-green-600">-{formatVND(result.orderDiscountAmount)}</span>
              </div>
            ) : (
              <div className="flex justify-between text-sm">
                <span className="text-stone-400">Giảm đơn hàng:</span>
                <span className="text-stone-400">Không áp dụng (dưới 1.5M)</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t border-stone-200 pt-2">
              <span className="text-stone-800">TỔNG CỘNG:</span>
              <span className="text-brand-600">{formatVND(result.finalTotal)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Regression test hint */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
        <strong>🧪 Test case:</strong> Thêm 8× Gà xá xíu 150g + 4× Bò herb 150g → Kết quả đúng: <strong>380,000 đ</strong>
        <br />
        <span className="text-amber-600">(Gà: 1,200g ≥ 1kg → -10%; Bò: 600g, không giảm; Tổng 380k &lt; 1.5M → không giảm thêm)</span>
      </div>
    </div>
  );
}

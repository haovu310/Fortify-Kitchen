/**
 * Pricing engine for Fortify Kitchen.
 *
 * calculateOrderTotal(lineItems) implements the exact 2-tier discount system:
 *
 * 1. Per-protein 1kg rule: if total grams of a single protein (across ALL
 *    flavors/sizes) >= 1000g, every line item of that protein gets 10% off.
 *
 * 2. Order-level tiered discount on post-meat-discount subtotal:
 *    - >= 3,000,000 VND → 10% off
 *    - >= 1,500,000 VND → 5% off
 *    - else → no additional discount
 *    Tiers do NOT stack (10% replaces 5%, not added on top).
 *
 * Regression test:
 *   8× chicken xá xíu 150g (25,000đ) + 4× beef herb 150g (50,000đ)
 *   → Chicken total grams: 8 × 150 = 1,200g >= 1000 → 10% off
 *   → Chicken line: 8 × 25,000 = 200,000 × 0.9 = 180,000
 *   → Beef total grams: 4 × 150 = 600g < 1000 → no discount
 *   → Beef line: 4 × 50,000 = 200,000
 *   → Subtotal: 380,000 < 1,500,000 → no order-level discount
 *   → TOTAL: 380,000 VND ✓
 */

/**
 * @param {Array<{protein: string, flavor: string, sizeGrams: number, unitPrice: number, qty: number}>} lineItems
 * @returns {{
 *   proteinGrams: Record<string, number>,
 *   proteinDiscounts: Record<string, boolean>,
 *   lineDetails: Array<{protein: string, flavor: string, sizeGrams: number, unitPrice: number, qty: number, lineTotal: number, discounted: boolean}>,
 *   lineSubtotal: number,
 *   orderDiscountTier: string|null,
 *   orderDiscountPercent: number,
 *   orderDiscountAmount: number,
 *   finalTotal: number
 * }}
 */
export function calculateOrderTotal(lineItems) {
  // Step 1 — total grams per protein across ALL flavors/sizes
  const proteinGrams = {};
  for (const item of lineItems) {
    if (!proteinGrams[item.protein]) {
      proteinGrams[item.protein] = 0;
    }
    proteinGrams[item.protein] += item.sizeGrams * item.qty;
  }

  // Step 2 — 10% off any protein whose combined weight >= 1000g
  const proteinDiscounts = {};
  for (const protein of Object.keys(proteinGrams)) {
    proteinDiscounts[protein] = proteinGrams[protein] >= 1000;
  }

  let lineSubtotal = 0;
  const lineDetails = [];
  for (const item of lineItems) {
    let lineTotal = item.unitPrice * item.qty;
    const discounted = proteinGrams[item.protein] >= 1000;
    if (discounted) {
      lineTotal = lineTotal * 0.90;
    }
    lineSubtotal += lineTotal;
    lineDetails.push({
      protein: item.protein,
      flavor: item.flavor,
      sizeGrams: item.sizeGrams,
      unitPrice: item.unitPrice,
      qty: item.qty,
      lineTotal,
      discounted,
    });
  }

  // Step 3 — order-level tiered discount on the POST-meat-discount subtotal
  // Tiers do NOT stack: 10% replaces 5%, not added on top
  let finalTotal;
  let orderDiscountTier = null;
  let orderDiscountPercent = 0;

  if (lineSubtotal >= 3_000_000) {
    orderDiscountTier = '≥ 3,000,000đ';
    orderDiscountPercent = 10;
    finalTotal = lineSubtotal * 0.90;
  } else if (lineSubtotal >= 1_500_000) {
    orderDiscountTier = '≥ 1,500,000đ';
    orderDiscountPercent = 5;
    finalTotal = lineSubtotal * 0.95;
  } else {
    finalTotal = lineSubtotal;
  }

  const orderDiscountAmount = lineSubtotal - finalTotal;

  return {
    proteinGrams,
    proteinDiscounts,
    lineDetails,
    lineSubtotal,
    orderDiscountTier,
    orderDiscountPercent,
    orderDiscountAmount,
    finalTotal,
  };
}

/**
 * Format a number as VND currency.
 * @param {number} amount
 * @returns {string} e.g. "380,000 đ"
 */
export function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' đ';
}

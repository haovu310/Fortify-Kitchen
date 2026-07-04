/**
 * Default menu items for Fortify Kitchen.
 * Used to seed the Firestore menuItems collection.
 */
export const DEFAULT_MENU_ITEMS = [
  // Chicken — 7 flavors × 2 sizes
  ...['xá xíu', 'teriyaki', 'cay Hàn Quốc', 'muối ớt', 'phô mai', 'tiêu đen', 'sốt thái'].flatMap(flavor => [
    { protein: 'chicken', flavor, sizeGrams: 150, price: 25000, active: true },
    { protein: 'chicken', flavor, sizeGrams: 250, price: 42000, active: true },
  ]),
  // Beef — 1 flavor, 1 size
  { protein: 'beef', flavor: 'herb', sizeGrams: 150, price: 50000, active: true },
  // Shrimp — 3 flavors, 1 size each
  { protein: 'shrimp', flavor: 'herb', sizeGrams: 150, price: 50000, active: true },
  { protein: 'shrimp', flavor: 'muối ớt', sizeGrams: 150, price: 50000, active: true },
  { protein: 'shrimp', flavor: 'sốt thái', sizeGrams: 150, price: 50000, active: true },
];

/**
 * Protein display names (Vietnamese)
 */
export const PROTEIN_LABELS = {
  chicken: 'Gà',
  beef: 'Bò',
  shrimp: 'Tôm',
};

/**
 * Payment status options
 */
export const PAYMENT_STATUSES = [
  'Chưa thanh toán',
  'Đã cọc',
  'Đã thanh toán',
];

/**
 * Delivery status options
 */
export const DELIVERY_STATUSES = [
  'Scheduled',
  'Prepping',
  'Delivered',
  'Skipped',
  'Cancelled',
];

/**
 * Get a display name for a menu item
 */
export function getMenuItemLabel(item) {
  const proteinLabel = PROTEIN_LABELS[item.protein] || item.protein;
  return `${proteinLabel} ${item.flavor} (${item.sizeGrams}g)`;
}

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

/**
 * Subscription scheduling model.
 *
 * A subscription has two independent settings:
 *  - planDurationDays: how long the package runs in total (e.g. a "monthly"
 *    package = 30 days).
 *  - deliveryIntervalDays: how often a delivery happens within that span
 *    (e.g. every day = 1, every week = 7).
 *
 * The number of deliveries generated is derived from the two:
 *   deliveries = floor(planDurationDays / deliveryIntervalDays), min 1.
 *
 * Example: a monthly (30-day) plan delivered daily (every 1 day) generates
 * 30 deliveries, one per day. A weekly (7-day) plan delivered weekly
 * (every 7 days) generates 1 delivery. A monthly plan delivered weekly
 * generates 4.
 */
export const PLAN_DURATION_PRESETS = [
  { days: 7, label: 'Gói tuần (7 ngày)' },
  { days: 14, label: 'Gói 2 tuần (14 ngày)' },
  { days: 30, label: 'Gói tháng (30 ngày)' },
  { days: 90, label: 'Gói quý (90 ngày)' },
];

export const DELIVERY_FREQUENCY_PRESETS = [
  { days: 1, label: 'Hàng ngày (mỗi 1 ngày)' },
  { days: 2, label: 'Mỗi 2 ngày' },
  { days: 3, label: 'Mỗi 3 ngày' },
  { days: 7, label: 'Hàng tuần (mỗi 7 ngày)' },
  { days: 14, label: 'Mỗi 2 tuần' },
  { days: 30, label: 'Hàng tháng (mỗi 30 ngày)' },
];

/**
 * Human label for an arbitrary interval in days, falling back to
 * "Mỗi N ngày" for values with no dedicated preset (e.g. a custom 4-day
 * interval typed in by the user).
 */
export function formatIntervalLabel(days) {
  if (days === 1) return 'Hàng ngày';
  if (days === 7) return 'Hàng tuần';
  if (days === 14) return 'Mỗi 2 tuần';
  if (days === 30) return 'Hàng tháng';
  return `Mỗi ${days} ngày`;
}

/** Human label for an arbitrary plan duration in days. */
export function formatDurationLabel(days) {
  if (days === 7) return 'Gói tuần (7 ngày)';
  if (days === 14) return 'Gói 2 tuần (14 ngày)';
  if (days === 30) return 'Gói tháng (30 ngày)';
  if (days === 90) return 'Gói quý (90 ngày)';
  return `Gói ${days} ngày`;
}

/** Number of deliveries a plan duration + delivery interval produces. */
export function computeDeliveryCount(planDurationDays, deliveryIntervalDays) {
  if (!planDurationDays || !deliveryIntervalDays || deliveryIntervalDays <= 0) return 0;
  return Math.max(1, Math.floor(planDurationDays / deliveryIntervalDays));
}

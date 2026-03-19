/**
 * Cheapest Basket Engine — algorithm owner: Manh Duc Huy Le
 *
 * Given a grocery list and price data by item/store, computes total cost per store
 * and returns the cheapest store. See docs/ALGORITHM_OWNER.md.
 */

/**
 * Normalize item name for price lookup (lowercase, trim).
 * Grocery list has names like "Milk", "Bread"; price DB uses "milk", "bread".
 * @param {string} name
 * @returns {string}
 */
export function normalizeItemName(name) {
  if (typeof name !== "string") return "";
  return name.trim().toLowerCase();
}

/**
 * Price data shape: { [normalizedItemName]: { [storeId]: price } }
 * Example: { "milk": { "aldi": 2.10, "coles": 2.40, "woolworths": 2.50 } }
 *
 * @typedef {Record<string, number>} StorePrices
 * @typedef {Record<string, StorePrices>} PricesByItem
 * @typedef {{ id: string, name: string, quantity: number }} ListItem
 *
 * @param {ListItem[]} list - Grocery list from the app
 * @param {PricesByItem} pricesByItem - Full price map (from Firestore or mock)
 * @returns {{ totalsByStore: Record<string, number>, bestStore: string | null, bestTotal: number, missingItems: string[] }}
 */
export function calculateBasketTotals(list, pricesByItem) {
  const totalsByStore = {};
  const itemCountByStore = {}; // track how many items each store has prices for
  const missingItems = [];

  if (!list || list.length === 0) {
    return { totalsByStore: {}, bestStore: null, bestTotal: 0, missingItems: [] };
  }

  // Count items that have at least one store price (used for completeness check)
  let itemsWithAnyPrice = 0;

  for (const item of list) {
    const key = normalizeItemName(item.name);
    const storePrices = pricesByItem?.[key];
    const qty = Math.max(0, Number(item.quantity) || 0);

    if (!storePrices || typeof storePrices !== "object") {
      if (key && !missingItems.includes(item.name)) missingItems.push(item.name);
      continue;
    }

    let itemHadAnyPrice = false;
    for (const [storeId, price] of Object.entries(storePrices)) {
      // Skip null/undefined/zero — missing data must not count as $0
      if (price == null || price === 0) continue;
      const cost = Number(price) * qty;
      if (!Number.isFinite(cost) || cost <= 0) continue;
      totalsByStore[storeId] = (totalsByStore[storeId] ?? 0) + cost;
      itemCountByStore[storeId] = (itemCountByStore[storeId] ?? 0) + 1;
      itemHadAnyPrice = true;
    }
    if (itemHadAnyPrice) itemsWithAnyPrice++;
  }

  // Only consider stores that have prices for ALL items that have any price data.
  // This prevents a store with 2/5 items appearing cheaper than one with 5/5.
  let bestStore = null;
  let bestTotal = Infinity;
  for (const [storeId, total] of Object.entries(totalsByStore)) {
    const t = Number(total);
    const coverage = itemCountByStore[storeId] ?? 0;
    // Must cover all items that have price data to be eligible for "best"
    if (Number.isFinite(t) && t < bestTotal && coverage >= itemsWithAnyPrice) {
      bestTotal = t;
      bestStore = storeId;
    }
  }

  // If no store has full coverage, fall back to highest-coverage store
  if (!bestStore && Object.keys(totalsByStore).length > 0) {
    const maxCoverage = Math.max(...Object.values(itemCountByStore));
    for (const [storeId, total] of Object.entries(totalsByStore)) {
      const t = Number(total);
      const coverage = itemCountByStore[storeId] ?? 0;
      if (coverage === maxCoverage && Number.isFinite(t) && t < bestTotal) {
        bestTotal = t;
        bestStore = storeId;
      }
    }
  }

  if (bestTotal === Infinity) bestTotal = 0;

  return {
    totalsByStore,
    bestStore,
    bestTotal,
    missingItems,
  };
}

/**
 * Mock prices for testing without Firestore. Match shape expected from jamie's price DB.
 * Use in development and unit tests until prices/store is in Firestore.
 */
export const MOCK_PRICES = {
  milk:   { aldi: 2.10, coles: 2.40, woolworths: 2.50 },
  bread:  { aldi: 1.80, coles: 2.00, woolworths: 2.20 },
  eggs:   { aldi: 3.50, coles: 4.00, woolworths: 4.20 },
  chicken: { aldi: 8.00, coles: 9.50, woolworths: 10.00 },
  rice:   { aldi: 2.50, coles: 2.80, woolworths: 3.00 },
  pasta:  { aldi: 1.20, coles: 1.50, woolworths: 1.80 },
};

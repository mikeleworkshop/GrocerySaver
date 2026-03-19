/**
 * Dummy Supermarket Price Database
 * Structure matches Feature 3: {"itemKey": {"aldi": number, "coles": number, "woolworths": number}}
 * Keys are lowercase for case-insensitive lookup.
 * Replace this with real data from your Price Database owner (API, scraper, or open dataset).
 */

export const STORES = ["aldi", "coles", "woolworths"];

export const dummyPriceDatabase = {
  milk: { aldi: 2.1, coles: 2.4, woolworths: 2.5 },
  bread: { aldi: 1.8, coles: 2.0, woolworths: 2.2 },
  eggs: { aldi: 4.5, coles: 5.2, woolworths: 5.5 },
  chicken: { aldi: 8.99, coles: 10.5, woolworths: 11.0 },
  rice: { aldi: 1.5, coles: 1.8, woolworths: 2.0 },
  pasta: { aldi: 1.2, coles: 1.5, woolworths: 1.6 },
  cheese: { aldi: 5.5, coles: 6.2, woolworths: 6.5 },
  yogurt: { aldi: 3.2, coles: 3.8, woolworths: 4.0 },
  butter: { aldi: 4.0, coles: 4.5, woolworths: 4.8 },
  apples: { aldi: 3.5, coles: 4.0, woolworths: 4.2 },
  bananas: { aldi: 2.8, coles: 3.2, woolworths: 3.4 },
  tomatoes: { aldi: 3.0, coles: 3.5, woolworths: 3.8 },
  onions: { aldi: 1.8, coles: 2.0, woolworths: 2.2 },
  potatoes: { aldi: 2.5, coles: 2.8, woolworths: 3.0 },
  carrots: { aldi: 1.5, coles: 1.8, woolworths: 2.0 },
  lettuce: { aldi: 2.2, coles: 2.5, woolworths: 2.8 },
  cereal: { aldi: 3.5, coles: 4.2, woolworths: 4.5 },
  oatmeal: { aldi: 2.8, coles: 3.2, woolworths: 3.5 },
  juice: { aldi: 3.0, coles: 3.5, woolworths: 3.8 },
  coffee: { aldi: 8.0, coles: 9.5, woolworths: 10.0 },
  tea: { aldi: 3.2, coles: 3.8, woolworths: 4.0 },
  flour: { aldi: 1.5, coles: 1.8, woolworths: 2.0 },
  sugar: { aldi: 1.8, coles: 2.0, woolworths: 2.2 },
  "olive oil": { aldi: 6.5, coles: 7.5, woolworths: 8.0 },
  beans: { aldi: 1.2, coles: 1.5, woolworths: 1.6 },
  tuna: { aldi: 2.5, coles: 3.0, woolworths: 3.2 },
  "ground beef": { aldi: 10.0, coles: 11.5, woolworths: 12.0 },
  broccoli: { aldi: 2.2, coles: 2.5, woolworths: 2.8 },
  spinach: { aldi: 2.5, coles: 3.0, woolworths: 3.2 },
  "frozen vegetables": { aldi: 2.8, coles: 3.2, woolworths: 3.5 },
  "ice cream": { aldi: 4.5, coles: 5.5, woolworths: 6.0 },
  "peanut butter": { aldi: 3.5, coles: 4.0, woolworths: 4.2 },
};

/** Normalise item name for lookup (lowercase, trim). */
export function getPriceKey(name) {
  return (name || "").toLowerCase().trim();
}

/**
 * Get prices for an item. Returns null if not in database.
 * @param {string} itemName
 * @returns {{ aldi: number, coles: number, woolworths: number } | null}
 */
export function getPrices(itemName, priceDb = dummyPriceDatabase) {
  const key = getPriceKey(itemName);
  const existing = priceDb[key];
  if (existing) return existing;

  // Fallback dummy pricing for any other item name.
  // Deterministic per key so values stay stable across renders.
  if (!key) return null;
  const base = 3 + (key.length % 4); // 3–6
  const aldi = base;
  const coles = base + 0.4;
  const woolworths = base + 0.7;
  return { aldi, coles, woolworths };
}

/**
 * Get cheapest store for an item.
 * @param {{ aldi: number, coles: number, woolworths: number }} prices
 * @returns {string} store name
 */
export function getCheapestStore(prices) {
  if (!prices) return "—";
  const entries = Object.entries(prices);
  const [store] = entries.reduce((min, curr) =>
    curr[1] < min[1] ? curr : min
  );
  return store;
}

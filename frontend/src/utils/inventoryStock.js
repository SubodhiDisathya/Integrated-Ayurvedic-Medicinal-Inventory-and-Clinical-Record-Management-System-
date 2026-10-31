export const getInventoryQuantity = (item = {}) => {
  const value = item.quantity ?? item.currentStock ?? item.stock ?? 0;
  const quantity = Number(value);
  return Number.isFinite(quantity) ? quantity : 0;
};

export const getInventoryThreshold = (item = {}) => {
  const value = item.minLevel ?? item.threshold;
  const threshold = Number(value);
  return Number.isFinite(threshold) && threshold >= 0 ? threshold : 10;
};

export const isLowStock = (item) =>
  getInventoryQuantity(item) < getInventoryThreshold(item);

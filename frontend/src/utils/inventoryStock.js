import { BOTTLE_STOCK_UNITS } from './medicineQuantity';

export const DEFAULT_INVENTORY_THRESHOLD = 20;

export const DEFAULT_INVENTORY_INGREDIENTS = {
  'ජීවලේප ආලේපනය': [
    'පාවට්ටා කොළ',
    'ආඩතෝඩා කොළ',
    'වෙනිවැල් ගැට',
    'කහ',
    'පොල්තෙල්'
  ],
  'අරළු පෙති': ['අරළු ගෙඩි'],
  'බුද්ධරාජ කල්ක': [
    'අරළු ගෙඩි',
    'බුළු ගෙඩි',
    'නෙල්ලි ගෙඩි',
    'ඉඟුරු',
    'ගම්මිරිස්',
    'තිප්පිලි'
  ],
  'බුද්ධරාජ කල්ක(ගුලි)': [
    'අරළු ගෙඩි',
    'බුළු ගෙඩි',
    'නෙල්ලි ගෙඩි',
    'ඉඟුරු',
    'ගම්මිරිස්',
    'තිප්පිලි'
  ],
  'ත්‍රිඵලා පෙති': ['අරළු ගෙඩි', 'බුළු ගෙඩි', 'නෙල්ලි ගෙඩි'],
  'සරස්වතාරිෂ්ටය': ['වැල්මී මුල්', 'වදකහ', 'ඉඟුරු', 'තිප්පිලි']
};

export const getInventoryQuantity = (item = {}) => {
  const value = item.quantity ?? item.currentStock ?? item.stock ?? 0;
  const quantity = Number(value);
  return Number.isFinite(quantity) ? quantity : 0;
};

export const getInventoryThreshold = (item = {}) => {
  const value = item.minLevel ?? item.threshold;
  const threshold = Number(value);
  return Number.isFinite(threshold) && threshold >= 0
    ? Math.max(threshold, DEFAULT_INVENTORY_THRESHOLD)
    : DEFAULT_INVENTORY_THRESHOLD;
};

export const getInventoryIngredients = (item = {}) => {
  const value = [item.ingredients, item.ingredient].find((candidate) =>
    Array.isArray(candidate)
      ? candidate.some((ingredient) => String(ingredient).trim())
      : candidate != null && String(candidate).trim()
  );
  if (value) {
    return Array.isArray(value)
      ? value.map((ingredient) => String(ingredient).trim()).filter(Boolean).join('\n')
      : String(value).trim();
  }

  return DEFAULT_INVENTORY_INGREDIENTS[item.name?.trim()]?.join('\n') || '';
};

export const parseInventoryIngredientNames = (value) => {
  const ingredients = Array.isArray(value) ? value : String(value || '').split(/[,\n]/);
  return ingredients.map((ingredient) => String(ingredient).trim()).filter(Boolean);
};

export const getLowStockRequestIngredients = (request = {}, inventoryItem) => {
  const storedIngredients = parseInventoryIngredientNames(
    Array.isArray(request.ingredientNames) && request.ingredientNames.length
      ? request.ingredientNames
      : request.ingredients
  );
  if (storedIngredients.length || !inventoryItem) return storedIngredients;

  return parseInventoryIngredientNames(getInventoryIngredients({
    ...inventoryItem,
    name: inventoryItem.name || request.itemName
  }));
};

export const isLowStock = (item) =>
  getInventoryQuantity(item) < getInventoryThreshold(item);

export const getInventoryStockRows = (item = {}) => {
  if (item.bottleStock) {
    return BOTTLE_STOCK_UNITS.map(({ key, label }) => ({
      key,
      packageUnit: key,
      unit: label,
      quantity: Number(item.bottleStock[key] ?? 0)
    }));
  }

  return [{
    key: 'default',
    packageUnit: null,
    unit: item.unit || 'ඒකක',
    quantity: getInventoryQuantity(item)
  }];
};

export const getInventoryItemCodeForStockRow = (item = {}, stockRow = {}) =>
  (stockRow.packageUnit && item.packageItemCodes?.[stockRow.packageUnit]) || item.itemCode;

export const getLowStockRows = (item = {}) =>
  getInventoryStockRows(item).filter((row) =>
    isLowStock({ quantity: row.quantity, minLevel: getInventoryThreshold(item) })
  );

export const deductBottleStock = (stock = {}, issued = {}) => {
  const remaining = {};
  for (const { key } of BOTTLE_STOCK_UNITS) {
    const available = Number(stock[key] ?? 0);
    const required = Number(issued[key] ?? 0);
    if (!Number.isFinite(available) || available < 0 || !Number.isFinite(required) || required < 0 || available < required) {
      return { remaining: null, insufficientUnit: key, available, required };
    }
    remaining[key] = available - required;
  }
  return { remaining, insufficientUnit: null };
};

export const getInventoryItemCode = (prefix, number) =>
  `${prefix}-${number}`;

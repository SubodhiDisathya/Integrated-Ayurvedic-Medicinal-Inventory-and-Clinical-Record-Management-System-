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
  return Number.isFinite(threshold) && threshold >= 0 ? threshold : 10;
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

export const isLowStock = (item) =>
  getInventoryQuantity(item) < getInventoryThreshold(item);

export const getInventoryItemCode = (prefix, number) =>
  `${prefix}-${number}`;

import {
  getInventoryIngredients,
  getInventoryItemCode,
  getInventoryQuantity,
  getInventoryThreshold,
  isLowStock
} from './inventoryStock';

describe('inventory stock helpers', () => {
  test('uses the dispensing quantity, including zero, before legacy stock fields', () => {
    expect(getInventoryQuantity({ quantity: 0, currentStock: 8 })).toBe(0);
    expect(getInventoryQuantity({ currentStock: 4 })).toBe(4);
    expect(getInventoryQuantity({ stock: 3 })).toBe(3);
  });

  test('uses the configured minimum level and defaults to ten', () => {
    expect(getInventoryThreshold({ minLevel: 5, threshold: 8 })).toBe(5);
    expect(getInventoryThreshold({ threshold: 7 })).toBe(7);
    expect(getInventoryThreshold({})).toBe(10);
  });

  test('considers stock below its threshold low', () => {
    expect(isLowStock({ quantity: 9 })).toBe(true);
    expect(isLowStock({ quantity: 10 })).toBe(false);
    expect(isLowStock({ quantity: 11 })).toBe(false);
    expect(isLowStock({ quantity: 0, minLevel: 0 })).toBe(false);
  });

  test('formats compact collection-prefixed inventory numbers', () => {
    expect(getInventoryItemCode('MED', 1)).toBe('MED-1');
    expect(getInventoryItemCode('ING', 12)).toBe('ING-12');
  });

  test('reads ingredient fields without substituting the medicine category', () => {
    expect(getInventoryIngredients({ ingredients: 'අරළු, බුළු' })).toBe('අරළු, බුළු');
    expect(getInventoryIngredients({ ingredient: 'අරළු' })).toBe('අරළු');
    expect(getInventoryIngredients({ category: 'Tablet' })).toBe('');
    expect(getInventoryIngredients({ ingredients: ['අරළු', 'බුළු'] })).toBe('අරළු\nබුළු');
  });

  test('uses the supplied ingredient list for known medicines without saved ingredients', () => {
    expect(getInventoryIngredients({ name: 'අරළු පෙති' })).toBe('අරළු ගෙඩි');
    expect(getInventoryIngredients({ name: 'ජීවලේප ආලේපනය' })).toBe(
      'පාවට්ටා කොළ\nආඩතෝඩා කොළ\nවෙනිවැල් ගැට\nකහ\nපොල්තෙල්'
    );
    expect(getInventoryIngredients({ name: 'බුද්ධරාජ කල්ක' })).toBe(
      'අරළු ගෙඩි\nබුළු ගෙඩි\nනෙල්ලි ගෙඩි\nඉඟුරු\nගම්මිරිස්\nතිප්පිලි'
    );
    expect(getInventoryIngredients({ name: 'ත්‍රිඵලා පෙති' })).toBe(
      'අරළු ගෙඩි\nබුළු ගෙඩි\nනෙල්ලි ගෙඩි'
    );
    expect(getInventoryIngredients({ name: 'සරස්වතාරිෂ්ටය' })).toBe(
      'වැල්මී මුල්\nවදකහ\nඉඟුරු\nතිප්පිලි'
    );
    expect(getInventoryIngredients({
      name: 'අරළු පෙති',
      ingredients: 'වෙනත් අමුද්‍රව්‍ය'
    })).toBe('වෙනත් අමුද්‍රව්‍ය');
    expect(getInventoryIngredients({ name: 'නොදන්නා ඖෂධය' })).toBe('');
  });
});

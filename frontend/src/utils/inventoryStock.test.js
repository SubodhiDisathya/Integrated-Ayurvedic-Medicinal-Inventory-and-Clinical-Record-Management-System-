import {
  deductBottleStock,
  DEFAULT_INVENTORY_THRESHOLD,
  getInventoryStockRows,
  getLowStockRows,
  getInventoryIngredients,
  getInventoryItemCode,
  getInventoryQuantity,
  getInventoryThreshold,
  getLowStockRequestIngredients,
  isLowStock
} from './inventoryStock';

describe('inventory stock helpers', () => {
  test('uses the dispensing quantity, including zero, before legacy stock fields', () => {
    expect(getInventoryQuantity({ quantity: 0, currentStock: 8 })).toBe(0);
    expect(getInventoryQuantity({ currentStock: 4 })).toBe(4);
    expect(getInventoryQuantity({ stock: 3 })).toBe(3);
  });

  test('uses 20 as the minimum threshold while retaining higher custom levels', () => {
    expect(DEFAULT_INVENTORY_THRESHOLD).toBe(20);
    expect(getInventoryThreshold({ minLevel: 5, threshold: 8 })).toBe(20);
    expect(getInventoryThreshold({ threshold: 25 })).toBe(25);
    expect(getInventoryThreshold({})).toBe(20);
  });

  test('considers stock below its threshold low', () => {
    expect(isLowStock({ quantity: 9 })).toBe(true);
    expect(isLowStock({ quantity: 19, minLevel: 10 })).toBe(true);
    expect(isLowStock({ quantity: 20 })).toBe(false);
    expect(isLowStock({ quantity: 25, minLevel: 30 })).toBe(true);
    expect(isLowStock({ quantity: 0, minLevel: 0 })).toBe(true);
  });

  test('expands bottle medicine stock into all three package units', () => {
    expect(getInventoryStockRows({
      bottleStock: { bottle: 20, halfBottle: 30, quarterBottle: 40 }
    })).toEqual([
      { key: 'bottle', packageUnit: 'bottle', unit: 'බෝතල්', quantity: 20 },
      { key: 'halfBottle', packageUnit: 'halfBottle', unit: 'භාග බෝතල්', quantity: 30 },
      { key: 'quarterBottle', packageUnit: 'quarterBottle', unit: 'කාල බෝතල්', quantity: 40 }
    ]);
  });

  test('detects low stock per bottle package unit', () => {
    expect(getLowStockRows({
      bottleStock: { bottle: 5, halfBottle: 30, quarterBottle: 3 },
      minLevel: 10
    }).map((row) => row.packageUnit)).toEqual(['bottle', 'quarterBottle']);
  });

  test('deducts issued quantities from matching bottle-size stock only', () => {
    expect(deductBottleStock(
      { bottle: 44, halfBottle: 20, quarterBottle: 30 },
      { quarterBottle: 3 }
    )).toEqual({
      remaining: { bottle: 44, halfBottle: 20, quarterBottle: 27 },
      insufficientUnit: null
    });
  });

  test('reports insufficient stock for the requested bottle size', () => {
    expect(deductBottleStock(
      { bottle: 44, halfBottle: 2, quarterBottle: 30 },
      { halfBottle: 3 }
    )).toEqual({
      remaining: null,
      insufficientUnit: 'halfBottle',
      available: 2,
      required: 3
    });
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
    expect(getInventoryIngredients({ name: 'බුද්ධරාජ කල්ක(ගුලි)' })).toBe(
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

  test('resolves low-stock request ingredients without sending the medicine name', () => {
    expect(getLowStockRequestIngredients({
      itemName: 'අරළු පෙති',
      ingredients: 'අරළු ගෙඩි, බුළු ගෙඩි'
    })).toEqual(['අරළු ගෙඩි', 'බුළු ගෙඩි']);
    expect(getLowStockRequestIngredients(
      { itemName: 'අරළු පෙති' },
      { name: 'අරළු පෙති' }
    )).toEqual(['අරළු ගෙඩි']);
    expect(getLowStockRequestIngredients({ itemName: 'නොදන්නා ඖෂධය' })).toEqual([]);
  });
});

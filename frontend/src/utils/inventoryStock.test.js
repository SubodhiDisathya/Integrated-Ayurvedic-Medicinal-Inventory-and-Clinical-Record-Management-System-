import { getInventoryQuantity, getInventoryThreshold, isLowStock } from './inventoryStock';

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
});

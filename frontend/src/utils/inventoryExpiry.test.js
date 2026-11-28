import {
  getExpiryDateForInventoryCode,
  getInventoryExpiryDateForStockRow,
  getInventoryExpiryUpdates,
  getMissingInventoryExpiryUpdates
} from './inventoryExpiry';

describe('inventory expiry dates', () => {
  test('uses the supplied dates for the configured medicine code ranges', () => {
    expect(getExpiryDateForInventoryCode('MED-1')).toBe('2027-03-08');
    expect(getExpiryDateForInventoryCode('MED-2')).toBe('2027-03-08');
    expect(getExpiryDateForInventoryCode('MED-3')).toBe('2026-12-25');
    expect(getExpiryDateForInventoryCode('MED-4')).toBe('2027-03-08');
    expect(getExpiryDateForInventoryCode('MED-5')).toBe('2027-03-08');
    expect(getExpiryDateForInventoryCode('MED-6')).toBe('2027-05-08');
    expect(getExpiryDateForInventoryCode('MED-10')).toBe('2027-05-08');
    expect(getExpiryDateForInventoryCode('MED-11')).toBeNull();
  });

  test('resolves expiry dates separately for package stock rows', () => {
    const item = {
      itemCode: 'MED-1',
      packageItemCodes: {
        bottle: 'MED-1',
        halfBottle: 'MED-7',
        quarterBottle: 'MED-8'
      },
      expiryDate: '2026-12-25'
    };

    expect(getInventoryExpiryDateForStockRow(item, { packageUnit: 'bottle' })).toBe('2027-03-08');
    expect(getInventoryExpiryDateForStockRow(item, { packageUnit: 'halfBottle' })).toBe('2027-05-08');
  });

  test('creates updates only for missing expiry dates', () => {
    expect(getMissingInventoryExpiryUpdates({
      itemCode: 'MED-1',
      bottleStock: { bottle: 1, halfBottle: 1, quarterBottle: 1 },
      packageItemCodes: {
        bottle: 'MED-1',
        halfBottle: 'MED-7',
        quarterBottle: 'MED-8'
      },
      packageExpiryDates: { halfBottle: '2028-01-01' }
    })).toEqual({
      expiryDate: '2027-03-08',
      'packageExpiryDates.bottle': '2027-03-08',
      'packageExpiryDates.quarterBottle': '2027-05-08'
    });

    expect(getInventoryExpiryDateForStockRow({
      itemCode: 'MED-2',
      expiryDate: '2028-01-01'
    }, {})).toBe('2028-01-01');

    expect(getMissingInventoryExpiryUpdates({
      itemCode: 'MED-2',
      expiryDate: '2028-01-01'
    })).toEqual({});
  });

  test('updates stored dates for the newly supplied codes only once', () => {
    const item = {
      itemCode: 'MED-1',
      expiryDate: '2026-12-25',
      bottleStock: { bottle: 1, halfBottle: 1, quarterBottle: 1 },
      packageItemCodes: {
        bottle: 'MED-1',
        halfBottle: 'MED-7',
        quarterBottle: 'MED-8'
      },
      packageExpiryDates: {
        bottle: '2026-12-25',
        halfBottle: '2027-05-08',
        quarterBottle: '2027-05-08'
      }
    };

    expect(getInventoryExpiryUpdates(item)).toEqual({
      expiryDate: '2027-03-08',
      'packageExpiryDates.bottle': '2027-03-08',
      expiryDateOverrideVersion: 'med-expiry-2027-03-08'
    });
    expect(getInventoryExpiryUpdates({
      ...item,
      expiryDateOverrideVersion: 'med-expiry-2027-03-08',
      expiryDate: '2028-01-01'
    })).toEqual({});
  });
});

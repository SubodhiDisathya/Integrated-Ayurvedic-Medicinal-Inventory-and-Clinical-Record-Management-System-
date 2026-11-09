import {
  getHighestInventoryItemNumber,
  isInventoryItemCode
} from './inventoryCodes';

describe('inventory codes', () => {
  test('accepts only compact numeric codes for the matching inventory type', () => {
    expect(isInventoryItemCode('MED', 'MED-12')).toBe(true);
    expect(isInventoryItemCode('MED', 'MED-G4LDKK7Z5UEBOFHQ6RKK')).toBe(false);
    expect(isInventoryItemCode('MED', 'ING-12')).toBe(false);
  });

  test('finds the highest existing numeric code for counter initialization', () => {
    expect(getHighestInventoryItemNumber([
      { itemCode: 'MED-3' },
      { itemCode: 'MED-11' },
      { itemCode: 'MED-G4LDKK7Z5UEBOFHQ6RKK' },
      { itemCode: 'ING-99' }
    ], 'MED')).toBe(11);
    expect(getHighestInventoryItemNumber([], 'ING')).toBe(0);
  });
});

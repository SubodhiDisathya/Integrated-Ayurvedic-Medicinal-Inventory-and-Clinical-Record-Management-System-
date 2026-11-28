import {
  compareInventoryItemCodes,
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
      { itemCode: 'MED-4', packageItemCodes: { halfBottle: 'MED-14' } },
      { itemCode: 'MED-G4LDKK7Z5UEBOFHQ6RKK' },
      { itemCode: 'ING-99' }
    ], 'MED')).toBe(14);
    expect(getHighestInventoryItemNumber([], 'ING')).toBe(0);
  });

  test('sorts numeric medicine codes in ascending order and leaves unknown codes last', () => {
    expect(['MED-10', 'MED-2', '...', 'MED-1'].sort(
      (left, right) => compareInventoryItemCodes(left, right, 'MED')
    )).toEqual(['MED-1', 'MED-2', 'MED-10', '...']);
  });
});

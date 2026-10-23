import { calculateMedicineQuantity, isMilliliterUnit } from './medicineQuantity';

describe('calculateMedicineQuantity', () => {
  test('calculates half-cup liquid doses for each named time of day', () => {
    expect(calculateMedicineQuantity({
      dosage: 'කෝප්ප භාගයක් (60 mL) උදේ, සවස, රාත්‍රී',
      duration: 'දින 7ක්'
    })).toEqual({ quantity: 1260, unit: 'ml' });
  });

  test('calculates one-cup doses twice per day', () => {
    expect(calculateMedicineQuantity({
      dosage: 'කෝප්ප එකක් (120 mL) උදේ සවස',
      duration: 'දින 5ක්'
    })).toEqual({ quantity: 1200, unit: 'ml' });
  });

  test('uses the separate frequency selected by the doctor', () => {
    expect(calculateMedicineQuantity({
      dosage: 'කෝප්ප භාගයක් (60 mL)',
      frequency: 'උදේ, සවස, රාත්‍රී',
      duration: 'දින 7ක්'
    })).toEqual({ quantity: 1260, unit: 'ml' });
  });

  test('converts a cup without a printed mL value and counts a numeric daily frequency', () => {
    expect(calculateMedicineQuantity({
      dosage: 'කෝප්ප බාගයක්',
      frequency: 'දිනකට 3 වරක්',
      duration: 'දින 2ක්'
    })).toEqual({ quantity: 360, unit: 'ml' });
  });

  test('calculates tablet quantity using the amount per dose and named times', () => {
    expect(calculateMedicineQuantity({
      dosage: '1 වේලකට 2 බැගින් උදේ සවස',
      duration: 'දින 5ක්'
    })).toEqual({ quantity: 20, unit: 'count' });
  });

  test('accepts an explicit total quantity without multiplying it again', () => {
    expect(calculateMedicineQuantity({
      dosage: '60 mL උදේ සවස',
      duration: 'දින 5ක්',
      totalQty: 600
    })).toEqual({ quantity: 600, unit: 'ml' });
  });
});

describe('isMilliliterUnit', () => {
  test.each(['mL', 'ml', 'milliliters', 'මිලිලීටර්', 'මි.ලි.'])(
    'recognizes %s as a milliliter unit',
    (unit) => {
      expect(isMilliliterUnit(unit)).toBe(true);
    }
  );

  test('does not treat bottle stock as milliliters', () => {
    expect(isMilliliterUnit('බෝතල්')).toBe(false);
  });
});

import {
  BOTTLE_STOCK_DEFAULTS,
  calculateMedicineQuantity,
  convertBottleStockToMilliliters,
  isBottleMedicine,
  isBottleUnit,
  isMilliliterUnit
} from './medicineQuantity';

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

  test.each([
    ['කාල බෝතල්', 'උදේ, සවස', 'දින 3ක්', { quantity: 6, unit: 'quarterBottle' }],
    ['භාග බෝතල්', 'උදේ, දවල්, රාත්‍රී', 'දින 2ක්', { quantity: 6, unit: 'halfBottle' }],
    ['බෝතල් කාලක්', 'උදේ, සවස', 'දින 3ක්', { quantity: 6, unit: 'quarterBottle' }],
    ['බෝතල් භාගයක්', 'උදේ, දවල්, රාත්‍රී', 'දින 2ක්', { quantity: 6, unit: 'halfBottle' }],
    ['බෝතල් එකක්', 'උදේ', 'දින 5ක්', { quantity: 5, unit: 'bottle' }]
  ])('calculates %s bottle doses in the matching stock unit', (dosage, frequency, duration, expected) => {
    expect(calculateMedicineQuantity({ dosage, frequency, duration })).toEqual(expected);
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

describe('isBottleUnit', () => {
  test.each(['bottle', 'bottles', 'බෝතලය', 'බෝතල්'])(
    'recognizes %s as a bottle unit',
    (unit) => {
      expect(isBottleUnit(unit)).toBe(true);
    }
  );
});

describe('isBottleMedicine', () => {
  test.each(['සරස්වතාරිෂ්ටය', 'කොලසැලෙස්මා තෛලය'])(
    'treats %s as package bottle stock',
    (name) => {
      expect(isBottleMedicine(name)).toBe(true);
    }
  );

  test('does not treat another medicine as package bottle stock', () => {
    expect(isBottleMedicine('ත්‍රිඵලා පෙති')).toBe(false);
  });
});

describe('BOTTLE_STOCK_DEFAULTS', () => {
  test('provides bottle package defaults', () => {
    expect(BOTTLE_STOCK_DEFAULTS).toEqual({
      bottle: 20,
      halfBottle: 30,
      quarterBottle: 40
    });
  });
});

describe('convertBottleStockToMilliliters', () => {
  test('converts bottle stock using the configured bottle volume', () => {
    expect(convertBottleStockToMilliliters(2, 450)).toBe(900);
  });

  test('rejects missing or invalid bottle volume', () => {
    expect(convertBottleStockToMilliliters(2, '')).toBeNull();
    expect(convertBottleStockToMilliliters(2, -450)).toBeNull();
  });
});

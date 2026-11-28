import {
  collectUniqueRecipeIngredients,
  getIngredientCodeAssignments,
  getIngredientCatalogDocumentId,
  normalizeIngredientName
} from './ingredientCodeCatalog';

describe('ingredient code catalog', () => {
  test('deduplicates ingredient names across recipes and records where they are used', () => {
    expect(collectUniqueRecipeIngredients([
      {
        medicineCode: 'MED-1',
        medicineName: 'ඖෂධය A',
        packageType: 'බෝතල්',
        ingredients: [
          { name: 'ඉඟුරු', quantity: 10, unit: 'g' },
          { name: '  ඉඟුරු  ', quantity: 5, unit: 'g' }
        ]
      },
      {
        medicineCode: 'MED-2',
        medicineName: 'ඖෂධය B',
        packageType: 'පෙති',
        ingredients: [{ name: 'ඉඟුරු', quantity: 2, unit: 'g' }]
      }
    ], [{ name: 'ඉඟුරු' }, { name: 'පාවට්ටා කොළ' }])).toEqual([
      {
        name: 'ඉඟුරු',
        normalizedName: 'ඉඟුරු',
        recipeUses: ['MED-1 - ඖෂධය A', 'MED-2 - ඖෂධය B']
      },
      {
        name: 'පාවට්ටා කොළ',
        normalizedName: 'පාවට්ටා කොළ',
        recipeUses: []
      }
    ]);
  });

  test('creates a consistent catalog key from a trimmed ingredient name', () => {
    expect(normalizeIngredientName('  Ginger   Root ')).toBe('ginger root');
    expect(getIngredientCatalogDocumentId('  Ginger   Root ')).toBe(
      getIngredientCatalogDocumentId('ginger root')
    );
  });

  test('assigns the requested ingredient names codes ING-1 through ING-20 in order', () => {
    const assignments = getIngredientCodeAssignments([
      { name: 'වදකහ' },
      { name: 'ඉඟුරු' },
      { name: 'තල තෙල්' }
    ]);

    expect(assignments.get(normalizeIngredientName('තල තෙල්'))).toBe('ING-1');
    expect(assignments.get(normalizeIngredientName('ඉඟුරු'))).toBe('ING-3');
    expect(assignments.get(normalizeIngredientName('වදකහ'))).toBe('ING-20');
  });

  test('assigns additional ingredients after the requested first 20', () => {
    const assignments = getIngredientCodeAssignments([
      { name: 'අමතර අමුද්‍රව්‍ය' },
      { name: 'ඉඟුරු' }
    ]);

    expect(assignments.get(normalizeIngredientName('ඉඟුරු'))).toBe('ING-3');
    expect(assignments.get(normalizeIngredientName('අමතර අමුද්‍රව්‍ය'))).toBe('ING-21');
  });
});

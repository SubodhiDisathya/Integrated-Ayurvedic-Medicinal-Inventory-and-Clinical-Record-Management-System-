import {
  calculateRecipeProductionEstimate,
  DEFAULT_MEDICINE_RECIPES,
  getIngredientProductionEstimates,
  getRecipeIngredientsForRequest,
  parseRecipeIngredients
} from './medicineRecipes';
import {
  collectRecipeNumberEntries,
  prepareRecipeNumberEntries
} from './recipeNumbers';

describe('medicine recipe helpers', () => {
  test('provides recipe rows for the supplied medicine packages', () => {
    expect(DEFAULT_MEDICINE_RECIPES).toHaveLength(10);
    expect(DEFAULT_MEDICINE_RECIPES.find((recipe) => recipe.id === 'med-6-quarter-bottle').outputQuantity)
      .toBe('187.5ml (0.25)');
  });

  test('scales ingredient amounts to the low-stock request quantity', () => {
    const recipes = DEFAULT_MEDICINE_RECIPES.map((recipe) =>
      recipe.id === 'med-2-pill'
        ? {
          ...recipe,
          ingredients: recipe.ingredients.map((ingredient, index) => ({
            ...ingredient,
            ingredientNumber: index + 1
          }))
        }
        : recipe
    );
    const ingredients = getRecipeIngredientsForRequest(recipes, {
      itemCode: 'MED-2',
      itemName: 'බුද්ධරාජ කල්ක(ගුලි)',
      quantity: 14
    });

    expect(ingredients[0]).toEqual({ name: 'අරළු ගෙඩි', quantity: 2.8, unit: 'g' });
    expect(ingredients[3]).toEqual({ name: 'ඉඟුරු', quantity: 1.4, unit: 'g' });
  });

  test('matches the recipe for a specific bottle package', () => {
    const ingredients = getRecipeIngredientsForRequest(DEFAULT_MEDICINE_RECIPES, {
      itemCode: 'MED-6',
      itemName: 'කොලසැලෙස්මා තෛලය',
      packageUnit: 'halfBottle',
      quantity: 1
    });

    expect(ingredients[0]).toEqual({ name: 'තල තෙල්', quantity: 150, unit: 'ml' });
  });

  test('matches package-specific pharmacy codes by medicine and package unit', () => {
    const ingredients = getRecipeIngredientsForRequest(DEFAULT_MEDICINE_RECIPES, {
      itemCode: 'MED-9',
      itemName: 'කොලසැලෙස්මා තෛලය',
      packageUnit: 'halfBottle',
      quantity: 1
    });

    expect(ingredients[0]).toEqual({ name: 'තල තෙල්', quantity: 150, unit: 'ml' });
  });

  test('estimates complete medicine quantities from a requested ingredient amount', () => {
    const estimates = getIngredientProductionEstimates(
      DEFAULT_MEDICINE_RECIPES,
      'වැල්මී මුල්',
      100,
      'g'
    );

    expect(estimates.map(({ packageType, possibleQuantity }) => [
      packageType,
      possibleQuantity
    ])).toEqual([
      ['බෝතල්', 3],
      ['භාග බෝතල්', 6],
      ['කාල බෝතල්', 13]
    ]);
  });

  test('converts recipe units when estimating and ignores incompatible units', () => {
    const recipe = [{
      id: 'test-recipe',
      medicineName: 'Test',
      ingredients: [{ name: 'Ingredient', quantity: 500, unit: 'g' }]
    }];

    expect(getIngredientProductionEstimates(recipe, 'Ingredient', 1, 'kg')[0].possibleQuantity)
      .toBe(2);
    expect(getIngredientProductionEstimates(recipe, 'Ingredient', 1, 'ml')).toEqual([]);
  });

  test('calculates complete batches using the most limiting ingredient', () => {
    const recipe = DEFAULT_MEDICINE_RECIPES.find((item) => item.id === 'med-1-bottle');
    const estimate = calculateRecipeProductionEstimate(recipe, [
      { name: 'වැල්මී මුල්', quantity: 100, unit: 'g' },
      { name: 'වදකහ', quantity: 100, unit: 'g' },
      { name: 'ඉඟුරු', quantity: 100, unit: 'g' },
      { name: 'තිප්පිලි', quantity: 100, unit: 'g' }
    ]);

    expect(estimate).toMatchObject({
      possibleQuantity: 3,
      limitingIngredient: 'වැල්මී මුල්'
    });
  });

  test('parses editable ingredient rows and rejects incomplete rows', () => {
    expect(parseRecipeIngredients('තල තෙල් | 300 | ml\nඉඟුරු | 7.5 | g')).toEqual([
      { name: 'තල තෙල්', quantity: 300, unit: 'ml' },
      { name: 'ඉඟුරු', quantity: 7.5, unit: 'g' }
    ]);
    expect(() => parseRecipeIngredients('තල තෙල් | | ml')).toThrow();
  });

  test('creates one numbered entry for each medicine package recipe', () => {
    const med6Recipes = DEFAULT_MEDICINE_RECIPES.filter((recipe) => recipe.medicineCode === 'MED-6');
    const entries = collectRecipeNumberEntries(med6Recipes);

    expect(entries).toHaveLength(3);
    expect(entries.map((entry) => entry.packageType)).toEqual([
      'බෝතල්',
      'භාග බෝතල්',
      'කාල බෝතල්'
    ]);
  });

  test('assigns a persistent unique number to each MED-6 package recipe', () => {
    const recipes = DEFAULT_MEDICINE_RECIPES.filter((recipe) => recipe.medicineCode === 'MED-6');
    const existingId = recipes[0].id;
    const result = prepareRecipeNumberEntries(recipes, [{
      id: existingId,
      recipeNumber: 12
    }], 12);
    const numbers = result.entries.map((recipe) => recipe.recipeNumber);

    expect(result.entries.find((recipe) => recipe.id === existingId).recipeNumber).toBe(12);
    expect(new Set(numbers).size).toBe(3);
    expect(result.lastNumber).toBe(14);
  });
});

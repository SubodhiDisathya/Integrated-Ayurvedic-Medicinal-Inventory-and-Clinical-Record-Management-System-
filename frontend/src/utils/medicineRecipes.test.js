import {
  DEFAULT_MEDICINE_RECIPES,
  getRecipeIngredientsForRequest,
  parseRecipeIngredients
} from './medicineRecipes';
import {
  collectRecipeIngredients,
  prepareIngredientCatalogEntries
} from './ingredientCatalog';

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

  test('parses editable ingredient rows and rejects incomplete rows', () => {
    expect(parseRecipeIngredients('තල තෙල් | 300 | ml\nඉඟුරු | 7.5 | g')).toEqual([
      { name: 'තල තෙල්', quantity: 300, unit: 'ml' },
      { name: 'ඉඟුරු', quantity: 7.5, unit: 'g' }
    ]);
    expect(() => parseRecipeIngredients('තල තෙල් | | ml')).toThrow();
  });

  test('collects each distinct recipe ingredient only once', () => {
    const ingredients = collectRecipeIngredients([
      { ingredients: [{ name: 'ඉඟුරු' }, { name: 'තිප්පිලි' }] },
      { ingredients: [{ name: 'ඉඟුරු' }, { name: 'අරළු' }] }
    ]);

    expect(ingredients).toHaveLength(3);
    expect(ingredients.filter((ingredient) => ingredient.name === 'ඉඟුරු')).toHaveLength(1);
  });

  test('assigns one persistent number per distinct ingredient', () => {
    const existingId = encodeURIComponent('ඉඟුරු');
    const result = prepareIngredientCatalogEntries([
      { ingredients: [{ name: 'ඉඟුරු' }, { name: 'නව අමුද්‍රව්‍ය' }] },
      { ingredients: [{ name: 'ඉඟුරු' }] }
    ], [{
      id: existingId,
      name: 'ඉඟුරු',
      normalizedName: 'ඉඟුරු',
      ingredientNumber: 12
    }]);

    expect(result.entries.find((ingredient) => ingredient.name === 'ඉඟුරු').ingredientNumber).toBe(12);
    expect(result.entries.find((ingredient) => ingredient.name === 'නව අමුද්‍රව්‍ය').ingredientNumber).toBe(13);
    expect(result.lastNumber).toBe(13);
  });
});

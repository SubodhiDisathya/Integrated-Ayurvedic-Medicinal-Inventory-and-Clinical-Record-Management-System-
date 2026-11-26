import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';

const kolasalesmaIngredients = [
  { name: 'තල තෙල්', quantity: 300, unit: 'ml' },
  { name: 'එරඬු තෙල්', quantity: 150, unit: 'ml' },
  { name: 'ඉඟුරු', quantity: 30, unit: 'g' },
  { name: 'කුප්පමේනියා', quantity: 60, unit: 'g' },
  { name: 'සුදු ළූණු', quantity: 30, unit: 'g' },
  { name: 'ඉරමුසු', quantity: 60, unit: 'g' },
  { name: 'තිප්පිලි', quantity: 60, unit: 'g' },
  { name: 'කරාබුනැටි', quantity: 30, unit: 'g' },
  { name: 'පෙරුංකායම්', quantity: 30, unit: 'g' }
];

export const DEFAULT_MEDICINE_RECIPES = [
  {
    id: 'med-6-bottle',
    displayOrder: 1,
    medicineCode: 'MED-6',
    medicineName: 'කොලසැලෙස්මා තෛලය',
    packageType: 'බෝතල්',
    stockPackageUnit: 'bottle',
    outputQuantity: '750ml (1.00)',
    ingredients: kolasalesmaIngredients
  },
  {
    id: 'med-6-half-bottle',
    displayOrder: 2,
    medicineCode: 'MED-6',
    medicineName: 'කොලසැලෙස්මා තෛලය',
    packageType: 'භාග බෝතල්',
    stockPackageUnit: 'halfBottle',
    outputQuantity: '375ml (0.50)',
    ingredients: [
      { name: 'තල තෙල්', quantity: 150, unit: 'ml' },
      { name: 'එරඬු තෙල්', quantity: 75, unit: 'ml' },
      { name: 'ඉඟුරු', quantity: 15, unit: 'g' },
      { name: 'කුප්පමේනියා', quantity: 30, unit: 'g' },
      { name: 'සුදු ළූණු', quantity: 15, unit: 'g' },
      { name: 'ඉරමුසු', quantity: 30, unit: 'g' },
      { name: 'තිප්පිලි', quantity: 30, unit: 'g' },
      { name: 'කරාබුනැටි', quantity: 15, unit: 'g' },
      { name: 'පෙරුංකායම්', quantity: 15, unit: 'g' }
    ]
  },
  {
    id: 'med-6-quarter-bottle',
    displayOrder: 3,
    medicineCode: 'MED-6',
    medicineName: 'කොලසැලෙස්මා තෛලය',
    packageType: 'කාල බෝතල්',
    stockPackageUnit: 'quarterBottle',
    outputQuantity: '187.5ml (0.25)',
    ingredients: [
      { name: 'තල තෙල්', quantity: 75, unit: 'ml' },
      { name: 'එරඬු තෙල්', quantity: 37.5, unit: 'ml' },
      { name: 'ඉඟුරු', quantity: 7.5, unit: 'g' },
      { name: 'කුප්පමේනියා', quantity: 15, unit: 'g' },
      { name: 'සුදු ළූණු', quantity: 7.5, unit: 'g' },
      { name: 'ඉරමුසු', quantity: 15, unit: 'g' },
      { name: 'තිප්පිලි', quantity: 15, unit: 'g' },
      { name: 'කරාබුනැටි', quantity: 7.5, unit: 'g' },
      { name: 'පෙරුංකායම්', quantity: 7.5, unit: 'g' }
    ]
  },
  {
    id: 'med-5-packet',
    displayOrder: 4,
    medicineCode: 'MED-5',
    medicineName: 'ජීවලේප ආලේපනය',
    packageType: 'පැකට් (50g)',
    stockPackageUnit: null,
    outputQuantity: '1.00',
    ingredients: [
      { name: 'පාවට්ටා කොළ', quantity: 15, unit: 'g' },
      { name: 'ආඩතෝඩා කොළ', quantity: 15, unit: 'g' },
      { name: 'වෙනිවැල් ගැට', quantity: 10, unit: 'g' },
      { name: 'කහ', quantity: 5, unit: 'g' },
      { name: 'පොල්තෙල්', quantity: 15, unit: 'ml' }
    ]
  },
  {
    id: 'med-4-tablet',
    displayOrder: 5,
    medicineCode: 'MED-4',
    medicineName: 'අරළු පෙති',
    packageType: 'පෙති (1 පෙත්ත)',
    stockPackageUnit: null,
    outputQuantity: '1.00',
    ingredients: [{ name: 'අරළු ගෙඩි', quantity: 0.5, unit: 'g' }]
  },
  {
    id: 'med-2-pill',
    displayOrder: 6,
    medicineCode: 'MED-2',
    medicineName: 'බුද්ධරාජ කල්ක(ගුලි)',
    packageType: 'ගුලි (1 ගුලිය)',
    stockPackageUnit: null,
    outputQuantity: '1.00',
    ingredients: [
      { name: 'අරළු ගෙඩි', quantity: 0.2, unit: 'g' },
      { name: 'බුළු ගෙඩි', quantity: 0.2, unit: 'g' },
      { name: 'නෙල්ලි ගෙඩි', quantity: 0.2, unit: 'g' },
      { name: 'ඉඟුරු', quantity: 0.1, unit: 'g' },
      { name: 'ගම්මිරිස්', quantity: 0.1, unit: 'g' },
      { name: 'තිප්පිලි', quantity: 0.1, unit: 'g' }
    ]
  },
  {
    id: 'med-3-tablet',
    displayOrder: 7,
    medicineCode: 'MED-3',
    medicineName: 'ත්‍රිඵලා පෙති',
    packageType: 'පෙති (1 පෙත්ත)',
    stockPackageUnit: null,
    outputQuantity: '1.00',
    ingredients: [
      { name: 'අරළු ගෙඩි', quantity: 0.2, unit: 'g' },
      { name: 'බුළු ගෙඩි', quantity: 0.2, unit: 'g' },
      { name: 'නෙල්ලි ගෙඩි', quantity: 0.2, unit: 'g' }
    ]
  },
  {
    id: 'med-1-bottle',
    displayOrder: 8,
    medicineCode: 'MED-1',
    medicineName: 'සරස්වතාරිෂ්ටය',
    packageType: 'බෝතල්',
    stockPackageUnit: 'bottle',
    outputQuantity: '750ml (1.00)',
    ingredients: [
      { name: 'වැල්මී මුල්', quantity: 30, unit: 'g' },
      { name: 'වදකහ', quantity: 20, unit: 'g' },
      { name: 'ඉඟුරු', quantity: 20, unit: 'g' },
      { name: 'තිප්පිලි', quantity: 20, unit: 'g' }
    ]
  },
  {
    id: 'med-1-half-bottle',
    displayOrder: 9,
    medicineCode: 'MED-1',
    medicineName: 'සරස්වතාරිෂ්ටය',
    packageType: 'භාග බෝතල්',
    stockPackageUnit: 'halfBottle',
    outputQuantity: '375ml (0.50)',
    ingredients: [
      { name: 'වැල්මී මුල්', quantity: 15, unit: 'g' },
      { name: 'වදකහ', quantity: 10, unit: 'g' },
      { name: 'ඉඟුරු', quantity: 10, unit: 'g' },
      { name: 'තිප්පිලි', quantity: 10, unit: 'g' }
    ]
  },
  {
    id: 'med-1-quarter-bottle',
    displayOrder: 10,
    medicineCode: 'MED-1',
    medicineName: 'සරස්වතාරිෂ්ටය',
    packageType: 'කාල බෝතල්',
    stockPackageUnit: 'quarterBottle',
    outputQuantity: '187.5ml (0.25)',
    ingredients: [
      { name: 'වැල්මී මුල්', quantity: 7.5, unit: 'g' },
      { name: 'වදකහ', quantity: 5, unit: 'g' },
      { name: 'ඉඟුරු', quantity: 5, unit: 'g' },
      { name: 'තිප්පිලි', quantity: 5, unit: 'g' }
    ]
  }
];

export const parseRecipeIngredients = (text) => {
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.map((line) => {
    const [name, quantityText, unit] = line.split('|').map((part) => part.trim());
    const quantity = Number(quantityText);
    if (!name || !quantityText || !unit || !Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('සෑම අමුද්‍රව්‍යයක්ම නම | ප්‍රමාණය | ඒකකය ලෙස ඇතුළත් කරන්න.');
    }
    return { name, quantity, unit };
  });
};

export const getRecipeIngredientsForRequest = (recipes = [], request = {}) => {
  const packageUnit = request.packageUnit || null;
  const matchesRequest = (recipe) =>
    (recipe.stockPackageUnit || null) === packageUnit;
  const recipe = recipes.find((item) =>
    item.medicineCode === request.itemCode && matchesRequest(item)
  ) || recipes.find((item) =>
    item.medicineName === request.itemName && matchesRequest(item)
  );
  if (!recipe) return [];

  const requestedQuantity = Number(request.quantity);
  const multiplier = Number.isFinite(requestedQuantity) && requestedQuantity >= 0
    ? requestedQuantity
    : 1;
  return (recipe.ingredients || []).map((ingredient) => ({
    name: ingredient.name,
    quantity: Number((Number(ingredient.quantity) * multiplier).toFixed(3)),
    unit: ingredient.unit
  }));
};

export const ensureDefaultMedicineRecipes = async (db) => {
  const markerRef = doc(db, 'system_metadata', 'medicine_recipes_seeded');
  const rowNumberMigrationRef = doc(db, 'system_metadata', 'medicine_recipe_row_numbers_removed');
  const curatedRecipesMarkerRef = doc(db, 'system_metadata', 'medicine_recipes_curated_list_updated');
  await runTransaction(db, async (transaction) => {
    const [markerSnapshot, migrationSnapshot, curatedRecipesMarkerSnapshot] = await Promise.all([
      transaction.get(markerRef),
      transaction.get(rowNumberMigrationRef),
      transaction.get(curatedRecipesMarkerRef)
    ]);
    if (
      markerSnapshot.exists() &&
      migrationSnapshot.exists() &&
      curatedRecipesMarkerSnapshot.exists()
    ) return;

    const recipesSnapshot = await transaction.get(collection(db, 'medicine_recipes'));
    const existingRecipesById = new Map(recipesSnapshot.docs.map((recipeDoc) => [
      recipeDoc.id,
      recipeDoc.data()
    ]));
    const curatedRecipeIds = new Set(DEFAULT_MEDICINE_RECIPES.map((recipe) => recipe.id));
    DEFAULT_MEDICINE_RECIPES.forEach((defaultRecipe) => {
      const existingRecipe = existingRecipesById.get(defaultRecipe.id);
      if (existingRecipe && curatedRecipesMarkerSnapshot.exists()) return;

      const { id, ...recipe } = defaultRecipe;
      transaction.set(doc(db, 'medicine_recipes', id), {
        ...recipe,
        createdAt: existingRecipe?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    });

    if (!migrationSnapshot.exists()) {
      recipesSnapshot.docs.forEach((recipeDoc) => {
        if (!curatedRecipesMarkerSnapshot.exists() && curatedRecipeIds.has(recipeDoc.id)) return;
        const ingredients = recipeDoc.data().ingredients;
        if (!Array.isArray(ingredients) || !ingredients.some((ingredient) =>
          Object.prototype.hasOwnProperty.call(ingredient, 'ingredientNumber')
        )) return;

        transaction.update(recipeDoc.ref, {
          ingredients: ingredients.map(({ ingredientNumber, ...ingredient }) => ingredient)
        });
      });
      transaction.set(rowNumberMigrationRef, {
        completed: true,
        completedAt: serverTimestamp()
      });
    }

    if (!markerSnapshot.exists()) {
      transaction.set(markerRef, {
        initialized: true,
        initializedAt: serverTimestamp()
      });
    }

    if (!curatedRecipesMarkerSnapshot.exists()) {
      transaction.set(curatedRecipesMarkerRef, {
        updated: true,
        updatedAt: serverTimestamp()
      });
    }
  });
};

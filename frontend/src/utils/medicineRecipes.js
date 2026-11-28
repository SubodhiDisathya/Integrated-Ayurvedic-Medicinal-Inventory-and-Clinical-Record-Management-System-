import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';

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

const getIngredientUnit = (unit) => {
  const normalized = String(unit || '').trim().toLocaleLowerCase();
  const units = {
    g: { dimension: 'mass', factor: 1 },
    gram: { dimension: 'mass', factor: 1 },
    grams: { dimension: 'mass', factor: 1 },
    'ග්‍රෑම්': { dimension: 'mass', factor: 1 },
    kg: { dimension: 'mass', factor: 1000 },
    kilogram: { dimension: 'mass', factor: 1000 },
    kilograms: { dimension: 'mass', factor: 1000 },
    'කිලෝ': { dimension: 'mass', factor: 1000 },
    ml: { dimension: 'volume', factor: 1 },
    milliliter: { dimension: 'volume', factor: 1 },
    milliliters: { dimension: 'volume', factor: 1 },
    'මිලිලීටර්': { dimension: 'volume', factor: 1 },
    l: { dimension: 'volume', factor: 1000 },
    liter: { dimension: 'volume', factor: 1000 },
    liters: { dimension: 'volume', factor: 1000 },
    'ලීටර්': { dimension: 'volume', factor: 1000 }
  };
  return units[normalized] || { dimension: normalized, factor: 1 };
};

export const getIngredientProductionEstimates = (
  recipes = [],
  ingredientName,
  requestedQuantity,
  requestedUnit
) => {
  const normalizedName = String(ingredientName || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  const quantity = Number(requestedQuantity);
  const requestUnit = getIngredientUnit(requestedUnit);
  if (!normalizedName || !Number.isFinite(quantity) || quantity <= 0 || !requestUnit.dimension) {
    return [];
  }

  return recipes.flatMap((recipe) => {
    const requiredQuantity = (recipe.ingredients || []).reduce((total, ingredient) => {
      const ingredientNameKey = String(ingredient.name || '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLocaleLowerCase();
      const recipeUnit = getIngredientUnit(ingredient.unit);
      if (ingredientNameKey !== normalizedName || recipeUnit.dimension !== requestUnit.dimension) {
        return total;
      }

      const ingredientQuantity = Number(ingredient.quantity);
      return Number.isFinite(ingredientQuantity) && ingredientQuantity > 0
        ? total + ingredientQuantity * recipeUnit.factor / requestUnit.factor
        : total;
    }, 0);

    if (requiredQuantity <= 0) return [];

    return [{
      recipeId: recipe.id,
      medicineCode: recipe.medicineCode || '',
      medicineName: recipe.medicineName || '',
      packageType: recipe.packageType || '',
      ingredientQuantityPerUnit: requiredQuantity,
      ingredientUnit: requestedUnit,
      possibleQuantity: Math.floor(quantity / requiredQuantity + Number.EPSILON)
    }];
  });
};

export const calculateRecipeProductionEstimate = (recipe, availableIngredients = []) => {
  const recipeIngredients = recipe?.ingredients || [];
  if (recipeIngredients.length === 0) return null;

  const getNameKey = (name) =>
    String(name || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  const ingredientYields = recipeIngredients.map((ingredient) => {
    const requiredQuantity = Number(ingredient.quantity);
    const recipeUnit = getIngredientUnit(ingredient.unit);
    const availableQuantity = availableIngredients.reduce((total, available) => {
      if (getNameKey(available.name) !== getNameKey(ingredient.name)) return total;

      const availableUnit = getIngredientUnit(available.unit);
      if (availableUnit.dimension !== recipeUnit.dimension) return total;

      const quantity = Number(available.quantity);
      return Number.isFinite(quantity) && quantity > 0
        ? total + quantity * availableUnit.factor / recipeUnit.factor
        : total;
    }, 0);

    return {
      name: ingredient.name,
      unit: ingredient.unit,
      requiredQuantity,
      availableQuantity,
      possibleQuantity: Number.isFinite(requiredQuantity) && requiredQuantity > 0
        ? availableQuantity / requiredQuantity
        : 0
    };
  });
  const limitingIngredient = ingredientYields.reduce((limiting, current) =>
    current.possibleQuantity < limiting.possibleQuantity ? current : limiting
  );

  return {
    possibleQuantity: Math.floor(limitingIngredient.possibleQuantity + Number.EPSILON),
    limitingIngredient: limitingIngredient.name,
    ingredientYields
  };
};

export const ensureDefaultMedicineRecipes = async (db) => {
  const markerRef = doc(db, 'system_metadata', 'medicine_recipes_seeded');
  const curatedRecipesMarkerRef = doc(db, 'system_metadata', 'medicine_recipes_curated_list_updated');
  await runTransaction(db, async (transaction) => {
    const [markerSnapshot, curatedRecipesMarkerSnapshot] = await Promise.all([
      transaction.get(markerRef),
      transaction.get(curatedRecipesMarkerRef)
    ]);
    if (markerSnapshot.exists() && curatedRecipesMarkerSnapshot.exists()) return;

    const recipeRefs = DEFAULT_MEDICINE_RECIPES.map((recipe) =>
      doc(db, 'medicine_recipes', recipe.id)
    );
    const recipeSnapshots = await Promise.all(recipeRefs.map((recipeRef) =>
      transaction.get(recipeRef)
    ));

    recipeSnapshots.forEach((recipeSnapshot, index) => {
      if (recipeSnapshot.exists() && curatedRecipesMarkerSnapshot.exists()) return;

      const defaultRecipe = DEFAULT_MEDICINE_RECIPES[index];
      const { id, ...recipe } = defaultRecipe;
      transaction.set(doc(db, 'medicine_recipes', id), {
        ...recipe,
        createdAt: recipeSnapshot.data()?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    });

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

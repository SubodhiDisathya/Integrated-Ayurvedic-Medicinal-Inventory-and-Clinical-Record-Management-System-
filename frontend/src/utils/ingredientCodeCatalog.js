export const normalizeIngredientName = (name) =>
  String(name || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();

const PREFERRED_INGREDIENT_ORDER = [
  'තල තෙල්',
  'එරඬු තෙල්',
  'ඉඟුරු',
  'කුප්පමේනියා',
  'සුදු ළූණු',
  'ඉරමුසු',
  'තිප්පිලි',
  'කරාබුනැටි',
  'පෙරුංකායම්',
  'පාවට්ටා කොළ',
  'ආඩතෝඩා කොළ',
  'වෙනිවැල් ගැට',
  'කහ',
  'පොල්තෙල්',
  'අරළු ගෙඩි',
  'බුළු ගෙඩි',
  'නෙල්ලි ගෙඩි',
  'ගම්මිරිස්',
  'වැල්මී මුල්',
  'වදකහ'
].map(normalizeIngredientName);

export const getIngredientCatalogDocumentId = (name) =>
  encodeURIComponent(normalizeIngredientName(name));

export const collectUniqueRecipeIngredients = (recipes = [], stockIngredients = []) => {
  const ingredientsByName = new Map();
  const addIngredient = (rawName, recipeLabel) => {
    const name = String(rawName || '').trim().replace(/\s+/g, ' ');
    const normalizedName = normalizeIngredientName(name);
    if (!normalizedName) return;

    let entry = ingredientsByName.get(normalizedName);
    if (!entry) {
      entry = { name, normalizedName, recipeUses: [] };
      ingredientsByName.set(normalizedName, entry);
    }

    if (recipeLabel && !entry.recipeUses.includes(recipeLabel)) {
      entry.recipeUses.push(recipeLabel);
    }
  };

  stockIngredients.forEach((ingredient) => addIngredient(ingredient.name));
  recipes.forEach((recipe) => {
    const recipeLabel = [
      recipe.medicineCode,
      recipe.medicineName
    ].filter(Boolean).join(' - ');

    (recipe.ingredients || []).forEach((ingredient) => {
      addIngredient(ingredient.name, recipeLabel);
    });
  });

  return [...ingredientsByName.values()].sort((left, right) =>
    left.name.localeCompare(right.name)
  );
};

export const getIngredientCodeAssignments = (ingredients = []) => {
  const ingredientNames = new Set(ingredients.map((ingredient) =>
    normalizeIngredientName(ingredient.normalizedName || ingredient.name)
  ));
  const preferredNames = new Set(PREFERRED_INGREDIENT_ORDER);
  const additionalNames = [...ingredientNames]
    .filter((name) => name && !preferredNames.has(name))
    .sort((left, right) => left.localeCompare(right));
  const allNames = [...PREFERRED_INGREDIENT_ORDER, ...additionalNames];

  return new Map(allNames.map((name, index) => [name, `ING-${index + 1}`]));
};

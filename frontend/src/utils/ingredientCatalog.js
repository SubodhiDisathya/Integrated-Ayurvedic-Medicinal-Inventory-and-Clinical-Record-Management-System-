import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';

const ingredientCatalogCounterRef = (db) =>
  doc(db, 'system_metadata', 'ingredient_catalog_number_counter');

const normalizeIngredientName = (name) =>
  String(name || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();

export const collectRecipeIngredients = (recipes = []) => {
  const ingredientsByName = new Map();

  recipes.forEach((recipe) => {
    (recipe.ingredients || []).forEach((ingredient) => {
      const name = String(ingredient.name || '').trim().replace(/\s+/g, ' ');
      const normalizedName = normalizeIngredientName(name);
      if (!name || ingredientsByName.has(normalizedName)) return;

      ingredientsByName.set(normalizedName, {
        id: encodeURIComponent(normalizedName),
        name,
        normalizedName
      });
    });
  });

  return [...ingredientsByName.values()].sort((a, b) =>
    a.normalizedName.localeCompare(b.normalizedName)
  );
};

export const prepareIngredientCatalogEntries = (
  recipes = [],
  existingEntries = [],
  minimumNumber = 0
) => {
  const entriesById = new Map(existingEntries.map((entry) => [entry.id, { ...entry }]));
  collectRecipeIngredients(recipes).forEach((ingredient) => {
    if (!entriesById.has(ingredient.id)) entriesById.set(ingredient.id, ingredient);
  });

  let lastNumber = Math.max(0, Number(minimumNumber) || 0);
  const reservedNumbers = new Set();
  entriesById.forEach((entry) => {
    const number = Number(entry.ingredientNumber);
    if (Number.isSafeInteger(number) && number > 0 && !reservedNumbers.has(number)) {
      reservedNumbers.add(number);
      lastNumber = Math.max(lastNumber, number);
    }
  });

  const usedNumbers = new Set();
  const entries = [...entriesById.values()].map((entry) => {
    const existingNumber = Number(entry.ingredientNumber);
    let ingredientNumber;
    if (
      Number.isSafeInteger(existingNumber) &&
      existingNumber > 0 &&
      !usedNumbers.has(existingNumber)
    ) {
      ingredientNumber = existingNumber;
    } else {
      do {
        lastNumber += 1;
      } while (reservedNumbers.has(lastNumber) || usedNumbers.has(lastNumber));
      ingredientNumber = lastNumber;
    }

    usedNumbers.add(ingredientNumber);
    return { ...entry, ingredientNumber };
  });

  return { entries, lastNumber };
};

export const ensureIngredientCatalog = async (db) => {
  const recipesRef = collection(db, 'medicine_recipes');
  const catalogRef = collection(db, 'ingredient_catalog');
  const counterRef = ingredientCatalogCounterRef(db);

  await runTransaction(db, async (transaction) => {
    const [recipesSnapshot, catalogSnapshot, counterSnapshot] = await Promise.all([
      transaction.get(recipesRef),
      transaction.get(catalogRef),
      transaction.get(counterRef)
    ]);

    const recipes = recipesSnapshot.docs.map((recipeDoc) => recipeDoc.data());
    const existingEntries = catalogSnapshot.docs.map((ingredientDoc) => ({
      id: ingredientDoc.id,
      ...ingredientDoc.data()
    }));
    const currentLastNumber = Number(counterSnapshot.data()?.lastNumber) || 0;
    const { entries, lastNumber } = prepareIngredientCatalogEntries(
      recipes,
      existingEntries,
      currentLastNumber
    );
    const existingIds = new Set(existingEntries.map((entry) => entry.id));
    const existingNumbers = new Map(existingEntries.map((entry) => [
      entry.id,
      Number(entry.ingredientNumber)
    ]));

    entries.forEach((entry) => {
      if (!existingIds.has(entry.id)) {
        const { id, ...ingredient } = entry;
        transaction.set(doc(db, 'ingredient_catalog', id), {
          ...ingredient,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else if (existingNumbers.get(entry.id) !== entry.ingredientNumber) {
        transaction.update(doc(db, 'ingredient_catalog', entry.id), {
          ingredientNumber: entry.ingredientNumber,
          updatedAt: serverTimestamp()
        });
      }
    });

    if (lastNumber > currentLastNumber) {
      transaction.set(counterRef, { lastNumber }, { merge: true });
    }
  });
};

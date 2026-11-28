import { collection, doc, getDocs, runTransaction, serverTimestamp } from 'firebase/firestore';

const recipeNumberCounterRef = (db) =>
  doc(db, 'system_metadata', 'medicine_recipe_number_counter');

export const collectRecipeNumberEntries = (recipes = []) => recipes
  .map((recipe, index) => {
    const id = recipe.id || recipe.recipeId ||
      `${recipe.medicineCode || 'medicine'}-${recipe.stockPackageUnit || recipe.packageType || index}`;
    return {
      id,
      medicineCode: recipe.medicineCode || '',
      medicineName: recipe.medicineName || '',
      packageType: recipe.packageType || '',
      outputQuantity: recipe.outputQuantity || '',
      displayOrder: recipe.displayOrder,
      ingredients: (recipe.ingredients || []).map(({ name, quantity, unit }) => ({
        name,
        quantity,
        unit
      }))
    };
  })
  .sort((a, b) =>
    (a.displayOrder ?? Number.MAX_SAFE_INTEGER) - (b.displayOrder ?? Number.MAX_SAFE_INTEGER) ||
    a.id.localeCompare(b.id)
  );

export const prepareRecipeNumberEntries = (
  recipes = [],
  existingEntries = [],
  minimumNumber = 0
) => {
  const existingById = new Map(existingEntries.map((entry) => [entry.id, entry]));
  const rows = collectRecipeNumberEntries(recipes);
  let lastNumber = Math.max(0, Number(minimumNumber) || 0);
  const reservedNumbers = new Set();

  existingEntries.forEach((entry) => {
    const number = Number(entry.recipeNumber);
    if (Number.isSafeInteger(number) && number > 0) {
      reservedNumbers.add(number);
      lastNumber = Math.max(lastNumber, number);
    }
  });

  const usedNumbers = new Set();
  const entries = rows.map((row) => {
    const existingNumber = Number(existingById.get(row.id)?.recipeNumber);
    let recipeNumber;

    if (
      Number.isSafeInteger(existingNumber) &&
      existingNumber > 0 &&
      !usedNumbers.has(existingNumber)
    ) {
      recipeNumber = existingNumber;
    } else {
      do {
        lastNumber += 1;
      } while (reservedNumbers.has(lastNumber) || usedNumbers.has(lastNumber));
      recipeNumber = lastNumber;
    }

    usedNumbers.add(recipeNumber);
    return { ...row, recipeNumber };
  });

  return { entries, lastNumber };
};

export const ensureRecipeNumberCatalog = async (db) => {
  const [recipesSnapshot, catalogSnapshot] = await Promise.all([
    getDocs(collection(db, 'medicine_recipes')),
    getDocs(collection(db, 'medicine_recipe_numbers'))
  ]);
  const recipes = recipesSnapshot.docs.map((recipeDoc) => ({
    ...recipeDoc.data(),
    id: recipeDoc.id
  }));
  const existingCatalog = catalogSnapshot.docs.map((recipeDoc) => ({
    ...recipeDoc.data(),
    id: recipeDoc.id
  }));
  const counterRef = recipeNumberCounterRef(db);
  const refsById = new Map();
  [...existingCatalog, ...recipes].forEach((recipe) => {
    refsById.set(recipe.id, doc(db, 'medicine_recipe_numbers', recipe.id));
  });

  await runTransaction(db, async (transaction) => {
    const refEntries = [...refsById.entries()];
    const [counterSnapshot, ...recipeSnapshots] = await Promise.all([
      transaction.get(counterRef),
      ...refEntries.map(([, recipeRef]) => transaction.get(recipeRef))
    ]);

    const currentEntriesById = new Map();
    recipeSnapshots.forEach((snapshot, index) => {
      if (!snapshot.exists()) return;
      const [id] = refEntries[index];
      currentEntriesById.set(id, { ...snapshot.data(), id });
    });

    const currentNumber = Number(counterSnapshot.data()?.lastNumber) || 0;
    const { entries, lastNumber } = prepareRecipeNumberEntries(
      recipes,
      [...currentEntriesById.values()],
      currentNumber
    );
    const desiredIds = new Set(entries.map((entry) => entry.id));

    entries.forEach((entry) => {
      const existing = currentEntriesById.get(entry.id);
      const { id, ...data } = entry;
      if (!existing) {
        transaction.set(doc(db, 'medicine_recipe_numbers', id), {
          ...data,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        return;
      }

      const changed = [
        'medicineCode',
        'medicineName',
        'packageType',
        'outputQuantity',
        'recipeNumber'
      ].some((field) => existing[field] !== entry[field]) ||
        JSON.stringify(existing.ingredients) !== JSON.stringify(entry.ingredients) ||
        existing.active === false;
      if (changed) {
        transaction.set(doc(db, 'medicine_recipe_numbers', id), {
          ...data,
          active: true,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    });

    currentEntriesById.forEach((entry, id) => {
      if (!desiredIds.has(id) && entry.active !== false) {
        transaction.update(doc(db, 'medicine_recipe_numbers', id), {
          active: false,
          updatedAt: serverTimestamp()
        });
      }
    });

    if (lastNumber > currentNumber) {
      transaction.set(counterRef, { lastNumber }, { merge: true });
    }
  });
};

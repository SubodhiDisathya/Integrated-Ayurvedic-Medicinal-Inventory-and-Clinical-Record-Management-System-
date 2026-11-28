import { doc, runTransaction } from 'firebase/firestore';
import { getInventoryItemCode } from './inventoryStock';

export const isInventoryItemCode = (prefix, itemCode) =>
  new RegExp(`^${prefix}-\\d+$`).test(itemCode || '');

export const compareInventoryItemCodes = (leftCode, rightCode, prefix) => {
  const getNumber = (itemCode) => {
    const match = new RegExp(`^${prefix}-(\\d+)$`).exec(itemCode || '');
    return match ? Number(match[1]) : null;
  };
  const leftNumber = getNumber(leftCode);
  const rightNumber = getNumber(rightCode);

  if (leftNumber === null) return rightNumber === null ? 0 : 1;
  if (rightNumber === null) return -1;
  return leftNumber - rightNumber;
};

export const getHighestInventoryItemNumber = (items, prefix) =>
  items.reduce((highest, item) => {
    const itemCodes = [item.itemCode, ...Object.values(item.packageItemCodes || {})];
    return itemCodes.reduce((currentHighest, itemCode) => {
      const match = new RegExp(`^${prefix}-(\\d+)$`).exec(itemCode || '');
      return match ? Math.max(currentHighest, Number(match[1])) : currentHighest;
    }, highest);
  }, 0);

export const ensureInventoryPackageItemCodes = async (
  db,
  itemRef,
  prefix,
  minimumNumber = 0,
  packageUnitKeys = []
) => {
  const counterRef = doc(db, 'inventory_code_counters', prefix);

  return runTransaction(db, async (transaction) => {
    const [itemSnapshot, counterSnapshot] = await Promise.all([
      transaction.get(itemRef),
      transaction.get(counterRef)
    ]);

    if (!itemSnapshot.exists()) {
      throw new Error(`Cannot assign package codes to missing ${prefix} item.`);
    }

    const itemData = itemSnapshot.data();
    let lastNumber = Math.max(
      Number(counterSnapshot.data()?.lastNumber) || 0,
      minimumNumber,
      getHighestInventoryItemNumber([itemData], prefix)
    );
    const allocateCode = () => {
      lastNumber += 1;
      return getInventoryItemCode(prefix, lastNumber);
    };

    const itemCode = isInventoryItemCode(prefix, itemData.itemCode)
      ? itemData.itemCode
      : allocateCode();
    const existingPackageCodes =
      itemData.packageItemCodes && typeof itemData.packageItemCodes === 'object'
        ? itemData.packageItemCodes
        : {};
    const packageItemCodes = {};
    const assignedCodes = new Set();

    for (const [index, packageUnit] of packageUnitKeys.entries()) {
      const existingCode = existingPackageCodes[packageUnit];
      let packageCode;

      if (isInventoryItemCode(prefix, existingCode) && !assignedCodes.has(existingCode)) {
        packageCode = existingCode;
      } else if (index === 0 && !assignedCodes.has(itemCode)) {
        packageCode = itemCode;
      } else {
        packageCode = allocateCode();
      }

      packageItemCodes[packageUnit] = packageCode;
      assignedCodes.add(packageCode);
    }

    const codesChanged =
      itemData.itemCode !== itemCode ||
      Object.keys(existingPackageCodes).length !== Object.keys(packageItemCodes).length ||
      packageUnitKeys.some((packageUnit) =>
        existingPackageCodes[packageUnit] !== packageItemCodes[packageUnit]
      );

    if (codesChanged) {
      transaction.update(itemRef, { itemCode, packageItemCodes });
    }
    if (lastNumber > (Number(counterSnapshot.data()?.lastNumber) || 0)) {
      transaction.set(counterRef, { lastNumber }, { merge: true });
    }

    return { itemCode, packageItemCodes };
  });
};

export const ensureInventoryItemCode = async (
  db,
  itemRef,
  prefix,
  minimumNumber = 0,
  newItemData
) => {
  const counterRef = doc(db, 'inventory_code_counters', prefix);

  return runTransaction(db, async (transaction) => {
    const [itemSnapshot, counterSnapshot] = await Promise.all([
      transaction.get(itemRef),
      transaction.get(counterRef)
    ]);

    const existingCode = itemSnapshot.data()?.itemCode;
    if (itemSnapshot.exists() && isInventoryItemCode(prefix, existingCode)) {
      return existingCode;
    }

    if (!itemSnapshot.exists() && !newItemData) {
      throw new Error(`Cannot assign an inventory code to missing ${prefix} item.`);
    }

    const lastNumber = Math.max(
      Number(counterSnapshot.data()?.lastNumber) || 0,
      minimumNumber
    );
    const itemCode = getInventoryItemCode(prefix, lastNumber + 1);
    transaction.set(counterRef, { lastNumber: lastNumber + 1 }, { merge: true });

    if (itemSnapshot.exists()) {
      transaction.update(itemRef, { itemCode });
    } else {
      transaction.set(itemRef, { ...newItemData, itemCode });
    }

    return itemCode;
  });
};

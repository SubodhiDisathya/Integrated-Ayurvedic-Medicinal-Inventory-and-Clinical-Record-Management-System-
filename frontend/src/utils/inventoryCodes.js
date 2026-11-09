import { doc, runTransaction } from 'firebase/firestore';
import { getInventoryItemCode } from './inventoryStock';

export const isInventoryItemCode = (prefix, itemCode) =>
  new RegExp(`^${prefix}-\\d+$`).test(itemCode || '');

export const getHighestInventoryItemNumber = (items, prefix) =>
  items.reduce((highest, item) => {
    const match = new RegExp(`^${prefix}-(\\d+)$`).exec(item.itemCode || '');
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

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

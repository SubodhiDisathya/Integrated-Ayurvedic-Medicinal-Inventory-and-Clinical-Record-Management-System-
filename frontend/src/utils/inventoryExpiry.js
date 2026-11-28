import { getInventoryItemCodeForStockRow } from './inventoryStock';

const EXPIRY_OVERRIDE_VERSION = 'med-expiry-2027-03-08';

export const getExpiryDateForInventoryCode = (itemCode) => {
  const match = /^MED-(\d+)$/.exec(itemCode || '');
  if (!match) return null;

  const codeNumber = Number(match[1]);
  if ([1, 2, 4, 5].includes(codeNumber)) return '2027-03-08';
  if (codeNumber === 3) return '2026-12-25';
  if (codeNumber >= 6 && codeNumber <= 10) return '2027-05-08';
  return null;
};

export const getInventoryExpiryDateForStockRow = (item, stockRow) => {
  const itemCode = getInventoryItemCodeForStockRow(item, stockRow);
  const itemExpiryDate = item.expiryDate && item.expiryDate !== '—'
    ? item.expiryDate
    : null;

  if (!stockRow.packageUnit) {
    return itemExpiryDate || getExpiryDateForInventoryCode(itemCode) || '—';
  }

  return item.packageExpiryDates?.[stockRow.packageUnit] ||
    getExpiryDateForInventoryCode(itemCode) ||
    itemExpiryDate ||
    '—';
};

export const getMissingInventoryExpiryUpdates = (item) => {
  const updates = {};

  if (!item.expiryDate || item.expiryDate === '—') {
    const itemExpiryDate = getExpiryDateForInventoryCode(item.itemCode);
    if (itemExpiryDate) updates.expiryDate = itemExpiryDate;
  }

  if (item.bottleStock) {
    for (const [packageUnit, itemCode] of Object.entries(item.packageItemCodes || {})) {
      if (item.packageExpiryDates?.[packageUnit]) continue;

      const expiryDate = getExpiryDateForInventoryCode(itemCode);
      if (expiryDate) updates[`packageExpiryDates.${packageUnit}`] = expiryDate;
    }
  }

  return updates;
};

export const getInventoryExpiryUpdates = (item) => {
  const updates = getMissingInventoryExpiryUpdates(item);
  if (item.expiryDateOverrideVersion === EXPIRY_OVERRIDE_VERSION) return updates;

  let hasConfiguredCode = false;
  const itemExpiryDate = getExpiryDateForInventoryCode(item.itemCode);
  if (itemExpiryDate) {
    hasConfiguredCode = true;
    if (item.expiryDate !== itemExpiryDate) {
      updates.expiryDate = itemExpiryDate;
    }
  }

  for (const [packageUnit, itemCode] of Object.entries(item.packageItemCodes || {})) {
    const expiryDate = getExpiryDateForInventoryCode(itemCode);
    if (!expiryDate) continue;

    hasConfiguredCode = true;
    if (item.packageExpiryDates?.[packageUnit] !== expiryDate) {
      updates[`packageExpiryDates.${packageUnit}`] = expiryDate;
    }
  }

  if (hasConfiguredCode) {
    updates.expiryDateOverrideVersion = EXPIRY_OVERRIDE_VERSION;
  }

  return updates;
};

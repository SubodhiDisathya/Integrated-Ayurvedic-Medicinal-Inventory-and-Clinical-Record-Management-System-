const getNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getDays = (duration = '') => {
  const text = String(duration).toLowerCase();
  const match = text.match(/\d+(?:\.\d+)?/);
  if (!match) return 1;

  const amount = Number(match[0]);
  if (text.includes('සති') || text.includes('week')) return amount * 7;
  if (text.includes('මාස') || text.includes('month')) return amount * 30;
  return amount;
};

const getTimesPerDay = (frequency = '') => {
  const text = String(frequency).toLowerCase();
  const numericFrequency = text.match(/දිනකට\s*(\d+(?:\.\d+)?)\s*(?:වරක්|වතාවක්|වේලක්)?|(\d+(?:\.\d+)?)\s*times?\s*(?:(?:per|a)\s*day|daily)?/);
  if (numericFrequency) {
    return Number(numericFrequency[1] || numericFrequency[2]) || 1;
  }

  const dayParts = [
    /උදේ|උදෑසන|පෙරවරුව|morning/g,
    /දවල්|මධ්‍යහ්න|noon|afternoon/g,
    /සවස|හවස|පස්වරුව|evening/g,
    /රෑ(?:ට)?|රාත්‍රි(?:ය|යේ|යට)?|රාත්‍රී(?:ය|යේ|යට)?|night/g
  ];
  const count = dayParts.reduce((total, pattern) => total + (text.match(pattern) || []).length, 0);
  if (count > 0) return count;

  if (text.includes('දිනකට තුන් වරක්') || text.includes('දිනකට තුන් වතාවක්')) return 3;
  if (text.includes('දිනකට දෙවරක්')) return 2;
  if (text.includes('දිනකට සිව්වරක්') || text.includes('දිනකට හතර වරක්')) return 4;
  return 1;
};

const getVolumeDose = (dosage) => {
  const text = String(dosage || '').toLowerCase();
  const mlMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:ml|m\.l\.|මිලි\s*ලීටර්|මිලිලීටර්|මි\.ලි\.?)/i);
  if (mlMatch) return Number(mlMatch[1]);

  if (/කෝප්ප\s*(?:භාගයක්|භාගය|බාගයක්|බාගය)|අඩ\s*කෝප්ප|(?:1\/2|½)\s*කෝප්ප|half\s+a?\s*cup/.test(text)) {
    return 60;
  }
  if (/කෝප්ප\s*(?:එකක්|යක්|1\b)|one\s+cup/.test(text)) {
    return 120;
  }
  if (/මේස\s*හැඳි?යක්|tablespoon/.test(text)) {
    return 15;
  }
  return null;
};

const getPerDoseCount = (dosage) => {
  const text = String(dosage || '').toLowerCase();
  const contextualMatch = text.match(/(?:වේලකට|පෙති|tablets?)\s*(\d+(?:\.\d+)?)/);
  if (contextualMatch) return Number(contextualMatch[1]);

  const match = text.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 1;
};

export const isMilliliterUnit = (unit = '') => {
  const normalized = String(unit).toLowerCase().replace(/\s/g, '');
  return normalized === 'ml' ||
    normalized === 'm.l.' ||
    normalized === 'milliliter' ||
    normalized === 'milliliters' ||
    normalized === 'millilitre' ||
    normalized === 'millilitres' ||
    normalized === 'මිලිලීටර්' ||
    normalized === 'මි.ලි.';
};

export const calculateMedicineQuantity = (medicine) => {
  if (!medicine) return { quantity: 0, unit: 'count' };

  const dosage = medicine.dosage || medicine.dosageOption || '';
  const volumeDose = getVolumeDose(dosage);
  const explicitTotal = getNumber(medicine.totalQty) || getNumber(medicine.quantity);
  if (explicitTotal !== null) {
    return { quantity: explicitTotal, unit: volumeDose === null ? 'count' : 'ml' };
  }

  const perDose = volumeDose === null ? getPerDoseCount(dosage) : volumeDose;
  const timesPerDay = getTimesPerDay(medicine.frequency || dosage);
  const quantity = perDose * timesPerDay * getDays(medicine.duration || medicine.days);

  return {
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 0,
    unit: volumeDose === null ? 'count' : 'ml'
  };
};

export const calculateTotalQuantity = (medicine) => calculateMedicineQuantity(medicine).quantity;

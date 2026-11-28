import React, { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { compareInventoryItemCodes } from '../../utils/inventoryCodes';
import {
  getInventoryItemCodeForStockRow,
  getInventoryStockRows
} from '../../utils/inventoryStock';
import {
  getExpiryDateForInventoryCode,
  getInventoryExpiryDateForStockRow
} from '../../utils/inventoryExpiry';
import SidebarAdmin from '../../components/SidebarAdmin';
import RoleTopbar from '../../components/RoleTopbar';
import {
  DEFAULT_MEDICINE_RECIPES,
  ensureDefaultMedicineRecipes,
  parseRecipeIngredients
} from '../../utils/medicineRecipes';
import '../Admin.css';
import './AdminMedicineRecipes.css';

const emptyForm = {
  medicineCode: '',
  medicineName: '',
  packageType: '',
  stockPackageUnit: 'default',
  outputQuantity: '1.00',
  ingredientsText: ''
};

const formatIngredientsForForm = (ingredients = []) => ingredients
  .map(({ name, quantity, unit }) => `${name} | ${quantity} | ${unit}`)
  .join('\n');

const formatIngredientsForTable = (ingredients = []) => ingredients
  .map(({ name, quantity, unit }) => `${name} ${quantity}${unit}`)
  .join(', ');

const defaultRecipeList = DEFAULT_MEDICINE_RECIPES.map((recipe) => ({ ...recipe }));

export default function AdminMedicineRecipes() {
  const [recipes, setRecipes] = useState(defaultRecipeList);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    const unsubscribeRecipes = onSnapshot(
      collection(db, 'medicine_recipes'),
      (snapshot) => {
        const recipeList = snapshot.docs
          .map((recipeDoc) => ({ id: recipeDoc.id, ...recipeDoc.data() }))
          .sort((a, b) => (a.displayOrder ?? Number.MAX_SAFE_INTEGER) - (b.displayOrder ?? Number.MAX_SAFE_INTEGER));
        setRecipes(recipeList.length === 0 && snapshot.metadata.fromCache
          ? defaultRecipeList
          : recipeList);
        setLoading(false);
      },
      (snapshotError) => {
        console.error('Error loading medicine recipes:', snapshotError);
        setError('ඖෂධ වට්ටෝරු ලබාගැනීමට නොහැකි විය.');
        setLoading(false);
      }
    );
    const unsubscribeInventory = onSnapshot(
      collection(db, 'inventory'),
      (snapshot) => {
        setInventoryItems(snapshot.docs.map((inventoryDoc) => ({
          id: inventoryDoc.id,
          ...inventoryDoc.data()
        })));
      },
      (inventoryError) => console.error('Error loading recipe inventory details:', inventoryError)
    );

    ensureDefaultMedicineRecipes(db).catch((loadError) => {
      console.error('Error initializing medicine recipes:', loadError);
      if (active) {
        setError('ඖෂධ වට්ටෝරු සකස් කිරීමට නොහැකි විය.');
        setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribeRecipes();
      unsubscribeInventory();
    };
  }, []);

  const getRecipeDisplayDetails = (recipe) => {
    const inventoryItem = inventoryItems.find((item) =>
      item.itemCode === recipe.medicineCode
    ) || inventoryItems.find((item) =>
      item.name?.trim() === recipe.medicineName?.trim()
    );

    if (!inventoryItem) {
      return {
        medicineCode: recipe.medicineCode,
        expiryDate: getExpiryDateForInventoryCode(recipe.medicineCode) || '—'
      };
    }

    const stockRows = getInventoryStockRows(inventoryItem);
    const stockRow = stockRows.find((row) =>
      (row.packageUnit || null) === (recipe.stockPackageUnit || null)
    ) || stockRows[0];
    const medicineCode = getInventoryItemCodeForStockRow(inventoryItem, stockRow) || recipe.medicineCode;
    const inventoryExpiryDate = getInventoryExpiryDateForStockRow(inventoryItem, stockRow);

    return {
      medicineCode,
      expiryDate: inventoryExpiryDate !== '—'
        ? inventoryExpiryDate
        : getExpiryDateForInventoryCode(medicineCode) || '—'
    };
  };
  const recipesWithInventoryDetails = recipes
    .map((recipe) => ({ ...recipe, ...getRecipeDisplayDetails(recipe) }))
    .sort((left, right) =>
      compareInventoryItemCodes(left.medicineCode, right.medicineCode, 'MED')
    );

  const resetForm = () => {
    setEditingRecipeId('');
    setForm(emptyForm);
  };

  const handleEdit = (recipe) => {
    setEditingRecipeId(recipe.id);
    setForm({
      medicineCode: recipe.medicineCode || '',
      medicineName: recipe.medicineName || '',
      packageType: recipe.packageType || '',
      stockPackageUnit: recipe.stockPackageUnit || 'default',
      outputQuantity: recipe.outputQuantity || '',
      ingredientsText: formatIngredientsForForm(recipe.ingredients)
    });
    setError('');
    setMessage('');
    document.getElementById('medicine-recipe-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    const medicineCode = form.medicineCode.trim().toUpperCase();
    const medicineName = form.medicineName.trim();
    const packageType = form.packageType.trim();
    const outputQuantity = form.outputQuantity.trim();
    const stockPackageUnit = form.stockPackageUnit === 'default' ? null : form.stockPackageUnit;

    if (!medicineCode || !medicineName || !packageType || !outputQuantity) {
      setError('සියලුම වට්ටෝරු විස්තර ඇතුළත් කරන්න.');
      return;
    }

    let ingredients;
    try {
      ingredients = parseRecipeIngredients(form.ingredientsText);
    } catch (parseError) {
      setError(parseError.message);
      return;
    }
    if (ingredients.length === 0) {
      setError('අවම වශයෙන් එක් අමුද්‍රව්‍යයක් ඇතුළත් කරන්න.');
      return;
    }

    const duplicateRecipe = recipes.find((recipe) =>
      recipe.id !== editingRecipeId &&
      getRecipeDisplayDetails(recipe).medicineCode === medicineCode &&
      (recipe.stockPackageUnit || null) === stockPackageUnit
    );
    if (duplicateRecipe) {
      setError('මෙම ඖෂධය සහ පැකේජ් වර්ගය සඳහා වට්ටෝරුවක් දැනටමත් ඇත.');
      return;
    }

    const existingRecipe = recipes.find((recipe) => recipe.id === editingRecipeId);

    setSaving(true);
    try {
      const recipeData = {
        medicineCode,
        medicineName,
        packageType,
        stockPackageUnit,
        outputQuantity,
        ingredients,
        displayOrder: existingRecipe?.displayOrder ?? Date.now(),
        updatedAt: serverTimestamp()
      };

      if (editingRecipeId) {
        await setDoc(doc(db, 'medicine_recipes', editingRecipeId), {
          ...recipeData,
          ...(!existingRecipe?.createdAt ? { createdAt: serverTimestamp() } : {})
        }, { merge: true });
        setMessage('වට්ටෝරුව යාවත්කාලීන කරන ලදී.');
      } else {
        await addDoc(collection(db, 'medicine_recipes'), {
          ...recipeData,
          createdAt: serverTimestamp()
        });
        setMessage('නව වට්ටෝරුව එක් කරන ලදී.');
      }
      resetForm();
    } catch (saveError) {
      console.error('Error saving medicine recipe:', saveError);
      setError('වට්ටෝරුව සුරැකීමට නොහැකි විය.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (recipe) => {
    if (!window.confirm(`${recipe.medicineName} - ${recipe.packageType} වට්ටෝරුව ඉවත් කරන්නද?`)) return;

    setError('');
    setMessage('');
    try {
      await deleteDoc(doc(db, 'medicine_recipes', recipe.id));
      if (editingRecipeId === recipe.id) resetForm();
      setMessage('වට්ටෝරුව ඉවත් කරන ලදී.');
    } catch (deleteError) {
      console.error('Error deleting medicine recipe:', deleteError);
      setError('වට්ටෝරුව ඉවත් කිරීමට නොහැකි විය.');
    }
  };

  return (
    <div className="admin-page-scope">
      <div className="admin-container">
        <SidebarAdmin />
        <main className="admin-main">
          <RoleTopbar roleLabel="පරිපාලක" notificationCount={0} />
          <div className="content-inner">
            <section className="card-box admin-recipe-header">
              <h1>ඖෂධ වට්ටෝරු සහ අමුද්‍රව්‍ය</h1>
              <p>එක් එක් ඖෂධ පැකේජයට අවශ්‍ය අමුද්‍රව්‍ය හා ප්‍රමාණ කළමනාකරණය කරන්න.</p>
            </section>

            {error && <div className="admin-recipe-message error" role="alert">{error}</div>}
            {message && <div className="admin-recipe-message success" role="status">{message}</div>}

            <section className="card-box admin-recipe-form-card" id="medicine-recipe-form">
              <div className="admin-recipe-section-heading">
                <h2>{editingRecipeId ? 'වට්ටෝරුව සංස්කරණය කරන්න' : 'නව වට්ටෝරුවක් එක් කරන්න'}</h2>
                {editingRecipeId && (
                  <button type="button" className="admin-recipe-secondary-button" onClick={resetForm}>
                    අවලංගු කරන්න
                  </button>
                )}
              </div>

              <form onSubmit={handleSave}>
                <div className="admin-recipe-form-grid">
                  <label>
                    ඖෂධ අංකය
                    <input
                      value={form.medicineCode}
                      onChange={(event) => setForm((current) => ({ ...current, medicineCode: event.target.value }))}
                      placeholder="උදා: MED-6"
                      required
                    />
                  </label>
                  <label>
                    ඖෂධයේ නම
                    <input
                      value={form.medicineName}
                      onChange={(event) => setForm((current) => ({ ...current, medicineName: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    පැකේජ් වර්ගය
                    <input
                      value={form.packageType}
                      onChange={(event) => setForm((current) => ({ ...current, packageType: event.target.value }))}
                      placeholder="උදා: භාග බෝතල්"
                      required
                    />
                  </label>
                  <label>
                    තොග පැකේජ් ඒකකය
                    <select
                      value={form.stockPackageUnit}
                      onChange={(event) => setForm((current) => ({ ...current, stockPackageUnit: event.target.value }))}
                    >
                      <option value="default">සාමාන්‍ය / වෙනත්</option>
                      <option value="bottle">බෝතල්</option>
                      <option value="halfBottle">භාග බෝතල්</option>
                      <option value="quarterBottle">කාල බෝතල්</option>
                    </select>
                  </label>
                  <label className="admin-recipe-output-field">
                    නිෂ්පාදන ප්‍රමාණය
                    <input
                      value={form.outputQuantity}
                      onChange={(event) => setForm((current) => ({ ...current, outputQuantity: event.target.value }))}
                      placeholder="උදා: 750ml (1.00)"
                      required
                    />
                  </label>
                  <label className="admin-recipe-ingredients-field">
                    අමුද්‍රව්‍ය (එක් පේළියකට එකක්: නම | ප්‍රමාණය | ඒකකය)
                    <textarea
                      value={form.ingredientsText}
                      onChange={(event) => setForm((current) => ({ ...current, ingredientsText: event.target.value }))}
                      placeholder={'තල තෙල් | 300 | ml\nඉඟුරු | 30 | g'}
                      rows="6"
                      required
                    />
                  </label>
                </div>
                <div className="admin-recipe-form-actions">
                  <button type="submit" className="admin-recipe-primary-button" disabled={saving}>
                    {saving ? 'සුරකිමින්...' : editingRecipeId ? 'වෙනස්කම් සුරකින්න' : 'වට්ටෝරුව එක් කරන්න'}
                  </button>
                </div>
              </form>
            </section>

            <section className="card-box admin-recipe-list-card">
              <div className="admin-recipe-section-heading">
                <h2>වට්ටෝරු ලැයිස්තුව</h2>
                <span>{recipes.length} වට්ටෝරු</span>
              </div>
              {loading && recipes.length === 0 ? (
                <p className="admin-recipe-empty">වට්ටෝරු පූරණය වෙමින් පවතී...</p>
              ) : recipes.length === 0 ? (
                <p className="admin-recipe-empty">වට්ටෝරු නොමැත.</p>
              ) : (
                <div className="admin-recipe-table-wrap">
                  <table className="admin-users-table-custom admin-recipe-table">
                    <thead>
                      <tr>
                        <th>අංකය</th>
                        <th>ඖෂධය</th>
                        <th>කල් ඉකුත් වන දිනය</th>
                        <th>පැකේජ් වර්ගය</th>
                        <th>නිෂ්පාදන ප්‍රමාණය</th>
                        <th>අමුද්‍රව්‍ය සහ ප්‍රමාණ</th>
                        <th>ක්‍රියා</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipesWithInventoryDetails.map((recipe) => (
                        <tr key={recipe.id}>
                          <td>{recipe.medicineCode}</td>
                          <td>{recipe.medicineName}</td>
                          <td>{recipe.expiryDate}</td>
                          <td>{recipe.packageType}</td>
                          <td>{recipe.outputQuantity}</td>
                          <td className="admin-recipe-ingredients-cell">{formatIngredientsForTable(recipe.ingredients)}</td>
                          <td>
                            <div className="admin-recipe-row-actions">
                              <button type="button" className="admin-recipe-secondary-button" onClick={() => handleEdit(recipe)}>
                                සංස්කරණය
                              </button>
                              <button type="button" className="btn-delete-custom" onClick={() => handleDelete(recipe)}>
                                ඉවත් කරන්න
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import SidebarAdmin from '../../components/SidebarAdmin';
import RoleTopbar from '../../components/RoleTopbar';
import { ensureDefaultMedicineRecipes } from '../../utils/medicineRecipes';
import { compareInventoryItemCodes } from '../../utils/inventoryCodes';
import {
  collectUniqueRecipeIngredients,
  getIngredientCodeAssignments,
  getIngredientCatalogDocumentId,
  normalizeIngredientName
} from '../../utils/ingredientCodeCatalog';
import '../Admin.css';
import './AdminIngredients.css';

export default function AdminIngredients() {
  const [recipes, setRecipes] = useState([]);
  const [stockIngredients, setStockIngredients] = useState([]);
  const [ingredientCodeCatalog, setIngredientCodeCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pendingCodeAssignments = useRef(new Set());

  useEffect(() => {
    let active = true;
    let unsubscribeRecipes;

    const unsubscribeStockIngredients = onSnapshot(
      collection(db, 'ingredients'),
      (snapshot) => {
        setStockIngredients(snapshot.docs.map((ingredientDoc) => ({
          id: ingredientDoc.id,
          ...ingredientDoc.data()
        })));
      },
      (snapshotError) => {
        console.error('Error loading ingredient inventory:', snapshotError);
        setError('ගබඩා අමුද්‍රව්‍ය ලබාගැනීමට නොහැකි විය.');
      }
    );
    const unsubscribeIngredientCodes = onSnapshot(
      collection(db, 'ingredient_code_catalog'),
      (snapshot) => {
        setIngredientCodeCatalog(snapshot.docs.map((ingredientDoc) => ({
          id: ingredientDoc.id,
          ...ingredientDoc.data()
        })));
      },
      (snapshotError) => {
        console.error('Error loading ingredient number catalog:', snapshotError);
        setError('අමුද්‍රව්‍ය අංක ලබාගැනීමට නොහැකි විය.');
      }
    );

    const loadRecipes = async () => {
      try {
        await ensureDefaultMedicineRecipes(db);
        if (!active) return;

        unsubscribeRecipes = onSnapshot(
          collection(db, 'medicine_recipes'),
          (snapshot) => {
            setRecipes(snapshot.docs.map((recipeDoc) => ({
              id: recipeDoc.id,
              ...recipeDoc.data()
            })));
            setLoading(false);
          },
          (snapshotError) => {
            console.error('Error loading recipe ingredients:', snapshotError);
            setError('වට්ටෝරු අමුද්‍රව්‍ය ලබාගැනීමට නොහැකි විය.');
            setLoading(false);
          }
        );
      } catch (loadError) {
        console.error('Error initializing recipe ingredients:', loadError);
        if (active) {
          setError('වට්ටෝරු අමුද්‍රව්‍ය සකස් කිරීමට නොහැකි විය.');
          setLoading(false);
        }
      }
    };

    loadRecipes();
    return () => {
      active = false;
      unsubscribeRecipes?.();
      unsubscribeStockIngredients();
      unsubscribeIngredientCodes();
    };
  }, []);

  useEffect(() => {
    const uniqueIngredients = collectUniqueRecipeIngredients(recipes, stockIngredients);
    if (uniqueIngredients.length === 0) return undefined;

    let active = true;
    const codeAssignments = getIngredientCodeAssignments(uniqueIngredients);
    const catalogByName = new Map(ingredientCodeCatalog.map((ingredient) => [
      normalizeIngredientName(ingredient.normalizedName || ingredient.name),
      ingredient
    ]));

    uniqueIngredients.forEach((ingredient) => {
      const catalogEntry = catalogByName.get(ingredient.normalizedName);
      const itemCode = codeAssignments.get(ingredient.normalizedName);
      if (!itemCode || catalogEntry?.itemCode === itemCode) return;
      if (pendingCodeAssignments.current.has(ingredient.normalizedName)) return;

      pendingCodeAssignments.current.add(ingredient.normalizedName);
      const ingredientRef = doc(
        db,
        'ingredient_code_catalog',
        getIngredientCatalogDocumentId(ingredient.name)
      );
      const saveCode = setDoc(ingredientRef, {
        name: ingredient.name,
        normalizedName: ingredient.normalizedName,
        itemCode,
        ...(!catalogEntry ? { createdAt: serverTimestamp() } : {}),
        updatedAt: serverTimestamp()
      }, { merge: true });

      saveCode.catch((saveError) => {
        console.error(`Error assigning code to ingredient ${ingredient.name}:`, saveError);
        if (active) setError(`අමුද්‍රව්‍ය අංකයක් සකස් කිරීමට නොහැකි විය: ${ingredient.name}`);
      }).finally(() => {
        pendingCodeAssignments.current.delete(ingredient.normalizedName);
      });
    });

    return () => {
      active = false;
    };
  }, [recipes, stockIngredients, ingredientCodeCatalog]);

  const uniqueIngredients = collectUniqueRecipeIngredients(recipes, stockIngredients);
  const codeAssignments = getIngredientCodeAssignments(uniqueIngredients);
  const ingredientRows = uniqueIngredients.map((ingredient) => {
    return {
      ...ingredient,
      itemCode: codeAssignments.get(ingredient.normalizedName) || '—'
    };
  }).sort((left, right) =>
    compareInventoryItemCodes(left.itemCode, right.itemCode, 'ING')
  );

  return (
    <div className="admin-page-scope">
      <div className="admin-container">
        <SidebarAdmin />
        <main className="admin-main">
          <RoleTopbar roleLabel="පරිපාලක" notificationCount={0} />
          <div className="content-inner">
            <section className="card-box admin-ingredients-header">
              <h1>අමුද්‍රව්‍ය අංක ලේඛනය</h1>
              <p>එක් එක් වෙනස් අමුද්‍රව්‍යයට ස්ථිර ING අංකයක් ලබා දේ. එකම අමුද්‍රව්‍යය වට්ටෝරු කිහිපයක තිබුණත් එම අංකයම භාවිතා වේ.</p>
            </section>

            {error && <div className="admin-ingredients-error" role="alert">{error}</div>}

            <section className="card-box admin-ingredients-list">
              <div className="admin-ingredients-heading">
                <h2>අමුද්‍රව්‍ය ලැයිස්තුව</h2>
                <span>{ingredientRows.length} අමුද්‍රව්‍ය</span>
              </div>
              {loading ? (
                <p className="admin-ingredients-empty">අමුද්‍රව්‍ය පූරණය වෙමින් පවතී...</p>
              ) : ingredientRows.length === 0 ? (
                <p className="admin-ingredients-empty">අමුද්‍රව්‍ය නොමැත.</p>
              ) : (
                <div className="admin-ingredients-table-wrap">
                  <table className="admin-users-table-custom admin-ingredients-table">
                    <thead>
                      <tr>
                        <th>අංකය</th>
                        <th>අමුද්‍රව්‍යය</th>
                        <th>භාවිතා වන වට්ටෝරු</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ingredientRows.map((ingredient) => (
                        <tr key={ingredient.normalizedName}>
                          <td>{ingredient.itemCode}</td>
                          <td>{ingredient.name}</td>
                          <td>{ingredient.recipeUses.join(', ')}</td>
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

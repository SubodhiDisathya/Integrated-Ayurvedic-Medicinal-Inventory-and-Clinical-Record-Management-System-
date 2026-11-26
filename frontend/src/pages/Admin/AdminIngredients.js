import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import SidebarAdmin from '../../components/SidebarAdmin';
import RoleTopbar from '../../components/RoleTopbar';
import { ensureDefaultMedicineRecipes } from '../../utils/medicineRecipes';
import { ensureIngredientCatalog } from '../../utils/ingredientCatalog';
import '../Admin.css';
import './AdminIngredients.css';

export default function AdminIngredients() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let unsubscribeIngredients;

    const loadIngredients = async () => {
      try {
        await ensureDefaultMedicineRecipes(db);
        await ensureIngredientCatalog(db);
        if (!active) return;

        unsubscribeIngredients = onSnapshot(
          collection(db, 'ingredient_catalog'),
          (snapshot) => {
            const ingredientList = snapshot.docs
              .map((ingredientDoc) => ({ id: ingredientDoc.id, ...ingredientDoc.data() }))
              .sort((a, b) => a.ingredientNumber - b.ingredientNumber);
            setIngredients(ingredientList);
            setLoading(false);
          },
          (snapshotError) => {
            console.error('Error loading ingredient catalog:', snapshotError);
            setError('අමුද්‍රව්‍ය ලැයිස්තුව ලබාගැනීමට නොහැකි විය.');
            setLoading(false);
          }
        );
      } catch (loadError) {
        console.error('Error initializing ingredient catalog:', loadError);
        if (active) {
          setError('අමුද්‍රව්‍ය අංක සකස් කිරීමට නොහැකි විය.');
          setLoading(false);
        }
      }
    };

    loadIngredients();
    return () => {
      active = false;
      unsubscribeIngredients?.();
    };
  }, []);

  return (
    <div className="admin-page-scope">
      <div className="admin-container">
        <SidebarAdmin />
        <main className="admin-main">
          <RoleTopbar roleLabel="පරිපාලක" notificationCount={0} />
          <div className="content-inner">
            <section className="card-box admin-ingredients-header">
              <h1>අමුද්‍රව්‍ය අංක ලේඛනය</h1>
              <p>වට්ටෝරුවල ඇති එක් එක් වෙනස් අමුද්‍රව්‍යයට ස්ථිර අංකයක් ලබා දී ඇත. එකම අමුද්‍රව්‍යය වට්ටෝරු කිහිපයක තිබුණත් එකම අංකය භාවිතා වේ.</p>
            </section>

            {error && <div className="admin-ingredients-error" role="alert">{error}</div>}

            <section className="card-box admin-ingredients-list">
              <div className="admin-ingredients-heading">
                <h2>අමුද්‍රව්‍ය ලැයිස්තුව</h2>
                <span>{ingredients.length} අමුද්‍රව්‍ය</span>
              </div>
              {loading ? (
                <p className="admin-ingredients-empty">අමුද්‍රව්‍ය පූරණය වෙමින් පවතී...</p>
              ) : ingredients.length === 0 ? (
                <p className="admin-ingredients-empty">වට්ටෝරුවල අමුද්‍රව්‍ය නොමැත.</p>
              ) : (
                <div className="admin-ingredients-table-wrap">
                  <table className="admin-users-table-custom admin-ingredients-table">
                    <thead>
                      <tr>
                        <th>අමුද්‍රව්‍ය අංකය</th>
                        <th>අමුද්‍රව්‍යයේ නම</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ingredients.map((ingredient) => (
                        <tr key={ingredient.id}>
                          <td>{ingredient.ingredientNumber}</td>
                          <td>{ingredient.name}</td>
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

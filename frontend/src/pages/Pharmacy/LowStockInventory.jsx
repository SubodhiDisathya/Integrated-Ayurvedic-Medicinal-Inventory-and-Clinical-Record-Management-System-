import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase/firebase';
import { collection, onSnapshot, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import {
  compareInventoryItemCodes,
  ensureInventoryItemCode,
  ensureInventoryPackageItemCodes,
  getHighestInventoryItemNumber,
  isInventoryItemCode
} from '../../utils/inventoryCodes';
import {
  DEFAULT_INVENTORY_THRESHOLD,
  getInventoryIngredients,
  getInventoryItemCodeForStockRow,
  getInventoryQuantity,
  getInventoryThreshold,
  getInventoryStockRows,
  parseInventoryIngredientNames,
  getLowStockRows,
  isLowStock
} from '../../utils/inventoryStock';
import {
  getInventoryExpiryDateForStockRow,
  getInventoryExpiryUpdates
} from '../../utils/inventoryExpiry';
import { BOTTLE_STOCK_UNITS } from '../../utils/medicineQuantity';
import { getRecipeIngredientsForRequest } from '../../utils/medicineRecipes';
import SidebarPhar from '../../components/Sidebar_phar';
import './LowStockInventory.css';

const parseInventoryDate = (value) => {
  if (!value) return null;
  const date = typeof value.toDate === 'function'
    ? value.toDate()
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isExpiringSoon = (item, days = 30) => {
  const expiryDate = parseInventoryDate(item.expiryDate);
  if (!expiryDate) return false;
  const now = new Date();
  const limit = new Date(now);
  limit.setDate(limit.getDate() + days);
  return expiryDate >= now && expiryDate <= limit;
};

export default function LowStockInventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [inventory, setInventory] = useState([]);
  const [medicineRecipes, setMedicineRecipes] = useState([]);
  const [notificationMessage, setNotificationMessage] = useState('');
  const previousLowStock = useRef(null);

  const [requestingStockKey, setRequestingStockKey] = useState('');
  const [supplyRequests, setSupplyRequests] = useState([]);

  // ඖෂධවල නම සහ ඔබ ඉල්ලූ මුල් සිංහල අමුද්‍රව්‍ය අනුව නිවැරදි විස්තර ලබාදෙන Helper Function එක
  const getCustomInventoryDetails = (medicineName, originalIngredients, originalExpiry) => {
    const name = (medicineName || '').trim();
    
    if (name.includes('ජීවලේප ආලේපනය')) {
      return {
        ingredients: 'පාවට්ටා කොළ, ආඩතෝඩා කොළ, වෙනිවෙල් ගැට, කහ, පොල්තෙල්',
        expiryDate: originalExpiry || ''
      };
    }
    if (name.includes('අරළු පෙති')) {
      return {
        ingredients: 'අරළු ගෙඩි',
        expiryDate: originalExpiry || ''
      };
    }
    if (name.includes('බුද්ධරාජ කල්ක')) {
      return {
        ingredients: 'අරළු ගෙඩි, බුළු ගෙඩි, නෙල්ලි ගෙඩි, ඉඟුරු, ගම්මිරිස්, තිප්පිලි',
        expiryDate: originalExpiry || ''
      };
    }
    if (name.includes('ත්‍රිඵලා පෙති')) {
      return {
        ingredients: 'අරළු ගෙඩි, බුළු ගෙඩි, නෙල්ලි ගෙඩි',
        expiryDate: originalExpiry || ''
      };
    }
    if (name.includes('සරස්වතාරිෂ්ටය')) {
      return {
        ingredients: 'වල්මි මුල්, වදකහ, ඉඟුරු, තිප්පිලි',
        expiryDate: originalExpiry || ''
      };
    }

    return {
      ingredients: originalIngredients || '',
      expiryDate: originalExpiry || '—'
    };
  };

  useEffect(() => {
    // Real-time listener using onSnapshot
    const unsubscribe = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      const list = [];
      const seenNames = new Set();
      const minimumMedicineNumber = getHighestInventoryItemNumber(
        snapshot.docs.map((itemDoc) => itemDoc.data()),
        'MED'
      );

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const name = data.name?.trim();
        if (!name || seenNames.has(name)) return;

        seenNames.add(name);

        const customDetails = getCustomInventoryDetails(name, getInventoryIngredients(data), data.expiryDate);

        const item = {
          ...data,
          id: docSnap.id,
          itemCode: isInventoryItemCode('MED', data.itemCode) ? data.itemCode : '...',
          name,
          ingredients: customDetails.ingredients,
          currentStock: getInventoryQuantity(data),
          threshold: getInventoryThreshold(data),
          unit: data.unit || 'ඒකක',
          bottleStock: data.bottleStock || null,
          expiryDate: customDetails.expiryDate
        };

        if (data.bottleStock) {
          ensureInventoryPackageItemCodes(
            db,
            docSnap.ref,
            'MED',
            minimumMedicineNumber,
            BOTTLE_STOCK_UNITS.map(({ key }) => key)
          ).then(({ itemCode, packageItemCodes }) => {
            const expiryUpdates = getInventoryExpiryUpdates({
              ...data,
              itemCode,
              packageItemCodes
            });
            if (Object.keys(expiryUpdates).length > 0) {
              return updateDoc(docSnap.ref, expiryUpdates);
            }
          }).catch((error) => {
            console.error('Error assigning medicine package codes:', error);
          });
        } else if (!isInventoryItemCode('MED', data.itemCode)) {
          ensureInventoryItemCode(db, docSnap.ref, 'MED', minimumMedicineNumber)
            .then((itemCode) => {
              const expiryUpdates = getInventoryExpiryUpdates({ ...data, itemCode });
              if (Object.keys(expiryUpdates).length > 0) {
                return updateDoc(docSnap.ref, expiryUpdates);
              }
            })
            .catch((error) => console.error('Error assigning medicine inventory code:', error));
        } else {
          const expiryUpdates = getInventoryExpiryUpdates(data);
          if (Object.keys(expiryUpdates).length > 0) {
            updateDoc(docSnap.ref, expiryUpdates).catch((error) => {
              console.error('Error saving medicine expiry dates:', error);
            });
          }
        }
        list.push(item);
      });

      const newlyLowItems = list.flatMap((item) =>
        getLowStockRows(item).filter((row) =>
          !previousLowStock.current?.get(`${item.id}-${row.packageUnit || 'default'}`)
        ).map((row) => ({ ...item, alertStock: row.quantity, alertUnit: row.unit }))
      );
      if (newlyLowItems.length > 0) {
        const message = newlyLowItems.map((item) => item.name).join(', ');
        setNotificationMessage(`${message} සඳහා අඩු තොග අනතුරු ඇඟවීමක් ඇත.`);

        if ('Notification' in window && window.Notification.permission === 'granted') {
          newlyLowItems.forEach((item) => {
            new window.Notification('අඩු තොග අනතුරු ඇඟවීම', {
              body: `${item.name} (${item.alertUnit}): ඉතිරි තොගය ${item.alertStock}.`
            });
          });
        }
      }

      const nextLowStock = new Map();
      list.forEach((item) => {
        getLowStockRows(item).forEach((row) => {
          nextLowStock.set(`${item.id}-${row.packageUnit || 'default'}`, true);
        });
      });
      previousLowStock.current = nextLowStock;
      setInventory(list);
    }, (error) => {
      console.error('Error fetching inventory: ', error);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'low_stock_requests'),
      (snapshot) => {
        setSupplyRequests(snapshot.docs.map((requestDoc) => ({
          id: requestDoc.id,
          ...requestDoc.data()
        })));
      },
      (error) => console.error('Error fetching low-stock request status:', error)
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'medicine_recipes'),
      (snapshot) => {
        setMedicineRecipes(snapshot.docs.map((recipeDoc) => ({
          id: recipeDoc.id,
          ...recipeDoc.data()
        })));
      },
      (error) => console.error('Error fetching medicine recipes:', error)
    );

    return () => unsubscribe();
  }, []);

  const handleCreateSupplyRequest = async (item) => {
    const stockKey = `${item.id}-${item.stockRowKey || item.unit}`;
    setRequestingStockKey(stockKey);
    try {
      await addDoc(collection(db, 'low_stock_requests'), {
        inventoryId: item.id,
        itemCode: item.itemCode,
        itemName: item.name,
        ingredients: item.ingredients,
        ingredientNames: parseInventoryIngredientNames(item.ingredients),
        quantity: Math.max(0, getInventoryThreshold(item) - item.currentStock),
        unit: item.unit,
        packageUnit: item.stockRowKey && item.stockRowKey !== 'default' ? item.stockRowKey : null,
        threshold: getInventoryThreshold(item),
        currentStock: item.currentStock,
        status: 'pending_admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error creating low-stock supply request:', error);
      alert('සැපයුම් ඉල්ලීම යැවීමේදී දෝෂයක් ඇති විය.');
    } finally {
      setRequestingStockKey('');
    }
  };

  const displayInventory = inventory;
  const getRecipeIngredientsForStockRow = (item, stockRow) => {
    const ingredients = getRecipeIngredientsForRequest(medicineRecipes, {
      itemCode: getInventoryItemCodeForStockRow(item, stockRow),
      itemName: item.name,
      packageUnit: stockRow.packageUnit
    });

    return ingredients.length > 0
      ? ingredients.map((ingredient) =>
        `${ingredient.name} ${ingredient.quantity}${ingredient.unit || ''}`
      ).join(', ')
      : item.ingredients;
  };
  const lowStockAlerts = displayInventory.flatMap((item) =>
    getLowStockRows(item).map((row) => ({
      ...item,
      stockRowKey: row.key,
      itemCode: getInventoryItemCodeForStockRow(item, row),
      displayIngredients: getRecipeIngredientsForStockRow(item, row),
      quantity: row.quantity,
      currentStock: row.quantity,
      unit: row.unit,
      expiryDate: getInventoryExpiryDateForStockRow(item, row)
    }))
  ).sort((left, right) =>
    compareInventoryItemCodes(left.itemCode, right.itemCode, 'MED')
  );

  const filteredInventory = displayInventory.flatMap((item) =>
    getInventoryStockRows(item).map((row) => ({
      ...item,
      stockRowKey: row.key,
      itemCode: getInventoryItemCodeForStockRow(item, row),
      displayIngredients: getRecipeIngredientsForStockRow(item, row),
      quantity: row.quantity,
      currentStock: row.quantity,
      unit: row.unit,
      expiryDate: getInventoryExpiryDateForStockRow(item, row)
    }))
  ).filter(item =>
    (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.displayIngredients && item.displayIngredients.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.unit && item.unit.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((left, right) =>
    compareInventoryItemCodes(left.itemCode, right.itemCode, 'MED')
  );

  return (
    <div className="ls-layout">
      {/* 1. වම්පස ෆාමසි මෙනු පුවරුව (Sidebar) */}
      <SidebarPhar />

      {/* 2. ප්‍රධාන අන්තර්ගත ප්‍රදේශය */}
      <div className="ls-main-wrapper">
        {/* ඉහළ ශීර්ෂකය (Top Header Bar) */}
        <header className="ls-topbar">
          <div className="ls-search-bar">
            <i className="bi bi-search"></i>
            <input
              type="text"
              placeholder="ඖෂධ හෝ අමුද්‍රව්‍ය සොයන්න..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="ls-user-profile">
            <button
              type="button"
              className="ls-nav-bell"
              aria-label="අවම තොග දැනුම්දීම"
              onClick={() => document.getElementById('low-stock-alerts')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ border: 0, background: 'transparent' }}
            >
              <i className="bi bi-bell-fill"></i>
              <span className="ls-badge-count">{lowStockAlerts.length}</span>
            </button>
            <div className="ls-user-info">
              <i className="bi bi-person-circle"></i>
              <span>ෆාමසි කාර්ය මණ්ඩලය</span>
            </div>
          </div>
        </header>

        {notificationMessage && (
          <div role="status" aria-live="polite" style={{ margin: '12px 28px 0', padding: '12px 16px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', color: '#9a3412' }}>
            <i className="bi bi-exclamation-triangle-fill" aria-hidden="true"></i> {notificationMessage}
            <button type="button" onClick={() => setNotificationMessage('')} aria-label="දැනුම්දීම වසන්න" style={{ float: 'right', border: 0, background: 'transparent', cursor: 'pointer' }}>×</button>
          </div>
        )}

        <div className="ls-body-content">
          {/* ප්‍රධාන ඉන්වෙන්ටරි වගු අංශය */}
          <div className="ls-left-content">
            <div className="ls-title-area">
              <h2>🌿 ආයුර්වේද ඖෂධ ඉන්වෙන්ටරිය</h2>
              <p>ඖෂධ තොග මට්ටම්, අමුද්‍රව්‍ය සහ කල් ඉකුත් වන දින නිරීක්ෂණය කරන්න.</p>
            </div>

            {/* ඉක්මන් සංඛ්‍යාලේඛන කාඩ්පත් */}
            <div className="ls-stats-grid">
              <div className="ls-stat-card">
                <div className="ls-stat-icon green"><i className="bi bi-box-seam"></i></div>
                <div>
                  <span className="ls-stat-title">සම්පූර්ණ ඖෂධ</span>
                  <h3 className="ls-stat-val">{displayInventory.length}</h3>
                </div>
              </div>

              <div className="ls-stat-card">
                <div className="ls-stat-icon yellow"><i className="bi bi-exclamation-triangle-fill"></i></div>
                <div>
                  <span className="ls-stat-title">අඩු තොග ඖෂධ</span>
                  <h3 className="ls-stat-val">{lowStockAlerts.length}</h3>
                </div>
              </div>

              <div className="ls-stat-card">
                <div className="ls-stat-icon red"><i className="bi bi-x-circle-fill"></i></div>
                <div>
                  <span className="ls-stat-title">තොග නොමැත</span>
                  <h3 className="ls-stat-val">
                    {lowStockAlerts.filter((item) => item.currentStock === 0).length}
                  </h3>
                </div>
              </div>

              <div className="ls-stat-card">
                <div className="ls-stat-icon blue"><i className="bi bi-calendar-event-fill"></i></div>
                <div>
                  <span className="ls-stat-title">කල් ඉකුත්වෙමින් පවතී</span>
                  <h3 className="ls-stat-val">{displayInventory.filter(isExpiringSoon).length}</h3>
                </div>
              </div>
            </div>

            {/* ඉන්වෙන්ටරි වගුව */}
            <div className="ls-table-card">
              <table className="ls-table">
                <thead>
                  <tr>
                    <th>අංකය</th>
                    <th>ඖෂධයේ නම</th>
                    <th>අමුද්‍රව්‍ය</th>
                    <th>වත්මන් තොගය</th>
                    <th>කල් ඉකුත් වන දිනය</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((med) => {
                    const isLow = isLowStock(med);
                    return (
                      <tr key={`${med.id}-${med.stockRowKey}`}>
                        <td>{med.itemCode}</td>
                        <td>
                          <strong>{med.name}</strong>
                        </td>
                        <td className="ls-ingredients-td">{med.displayIngredients || 'අමුද්‍රව්‍ය සඳහන් කර නැත'}</td>
                        <td>
                          <strong>{med.currentStock}</strong> ({med.unit})
                          {isLow && (
                            <span className="ls-tag-low">අඩු තොගය</span>
                          )}
                        </td>
                        <td>{med.expiryDate}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* දකුණුපස අනතුරු ඇඟවීම් සහ විකල්ප පුවරුව */}
          <div className="ls-right-panel">
            {/* අවම තොග දැනුම්දීම පෙට්ටිය */}
            <div className="ls-alert-card" id="low-stock-alerts">
              <div className="ls-alert-header">
                <h3><i className="bi bi-bell-fill text-danger"></i> අවම තොග දැනුම්දීම</h3>
                <span className="ls-alert-badge">{lowStockAlerts.length}</span>
              </div>

              <div className="ls-alerts-list">
                {lowStockAlerts.length > 0 ? (
                  lowStockAlerts.map((item) => (
                    <div className="ls-alert-item" key={`${item.id}-${item.stockRowKey}`}>
                      <div className="ls-alert-item-title">
                        <i className="bi bi-exclamation-circle-fill text-warning"></i>
                        <span><strong>{item.name}</strong></span>
                      </div>
                      <p>වත්මන් තොගය: <strong className="text-danger">{item.currentStock}</strong> ({item.unit})</p>
                      <p className="ls-text-muted">අවම සීමාව: {item.threshold ?? DEFAULT_INVENTORY_THRESHOLD}</p>
                      {(() => {
                        const relatedRequest = supplyRequests.find((request) =>
                          request.inventoryId === item.id &&
                          (request.packageUnit || null) === (item.stockRowKey && item.stockRowKey !== 'default' ? item.stockRowKey : null)
                        );
                        if (relatedRequest) {
                          return (
                            <div style={{ marginTop: '8px', borderRadius: '8px', padding: '8px', background: relatedRequest.status === 'approved' ? '#ecfdf5' : '#fff7ed', color: relatedRequest.status === 'approved' ? '#065f46' : '#9a3412', textAlign: 'center', fontWeight: '600', fontSize: '12px' }}>
                              {relatedRequest.status === 'approved' ? 'අනුමත වී Supplier වෙත යවා ඇත' : 'පරිපාලක වෙත යවන ලදී'}
                            </div>
                          );
                        }
                        return (
                      <button
                        type="button"
                        onClick={() => handleCreateSupplyRequest(item)}
                        disabled={requestingStockKey === `${item.id}-${item.stockRowKey || item.unit}`}
                        style={{ width: '100%', marginTop: '8px', border: 0, borderRadius: '8px', padding: '8px', background: '#1a5a38', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}
                      >
                        {requestingStockKey === `${item.id}-${item.stockRowKey || item.unit}` ? 'යවමින්...' : 'පරිපාලක වෙත සැපයුම් ඉල්ලීම යවන්න'}
                      </button>
                        );
                      })()}
                    </div>
                  ))
                ) : (
                  <p className="ls-text-muted">අවම තොග දැනුම්දීම් නොමැත.</p>
                )}
              </div>
            </div>

          </div> 
        </div>
      </div>

    </div>
  );
}
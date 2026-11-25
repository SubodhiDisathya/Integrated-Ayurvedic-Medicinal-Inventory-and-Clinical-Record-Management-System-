import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/firebase';
import { collection, onSnapshot, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { ensureInventoryItemCode, getHighestInventoryItemNumber, isInventoryItemCode } from '../../utils/inventoryCodes';
import {
  DEFAULT_INVENTORY_THRESHOLD,
  getInventoryIngredients,
  getInventoryQuantity,
  getInventoryThreshold,
  getInventoryStockRows,
  getLowStockRows,
  isLowStock
} from '../../utils/inventoryStock';
import { BOTTLE_STOCK_UNITS, isBottleMedicine } from '../../utils/medicineQuantity';
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
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [inventory, setInventory] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'unsupported'
  );
  const previousLowStock = useRef(null);

  // Modal State සඳහා
  const [showModal, setShowModal] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editIngredients, setEditIngredients] = useState('');
  const [editBottleStock, setEditBottleStock] = useState({});
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
      ingredients: originalIngredients || 'අමුද්‍රව්‍ය සඳහන් කර නැත',
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

        if (!isInventoryItemCode('MED', data.itemCode)) {
          ensureInventoryItemCode(db, docSnap.ref, 'MED', minimumMedicineNumber).catch((error) => {
            console.error('Error assigning medicine inventory code:', error);
          });
        }
        list.push(item);
      });

      const newlyLowItems = list.flatMap((item) =>
        getLowStockRows(item).filter((row) =>
          !previousLowStock.current?.get(`${item.id}-${row.packageUnit || 'default'}`)
        ).map((row) => ({ ...item, alertStock: row.quantity, alertUnit: row.unit }))
      );
      if (newlyLowItems.length > 0) {
        setNotifications((current) => [
          ...newlyLowItems.map((item) => ({
            id: `${item.id}-${Date.now()}`,
            message: `${item.name} (${item.alertUnit}): තොගය ${item.alertStock} දක්වා අඩු වී ඇත.`
          })),
          ...current
        ].slice(0, 5));

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

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }

    const permission = await window.Notification.requestPermission();
    setNotificationPermission(permission);
  };

  // Edit Modal එක විවෘත කිරීම
  const handleOpenEditModal = (item) => {
    setCurrentId(item.id);
    setEditName(item.name || '');
    setEditStock(item.bottleStock ? '' : (item.currentStock ?? ''));
    setEditUnit(item.unit || '');
    setEditIngredients(item.ingredients);
    setEditBottleStock(item.bottleStock ? { ...item.bottleStock } : {});
    setShowModal(true);
  };

  // යාවත්කාලීන කිරීම සුරැකීම (Update Handler) - Vuguruwe neza ngo ikore
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      if (currentId && typeof currentId === 'string' && currentId.length > 5) {
        const medRef = doc(db, 'inventory', currentId);
        const newStockVal = Number(editStock);
        if (isBottleMedicine(editName) && Object.keys(editBottleStock).length > 0) {
          const parsedBottleStock = {};
          for (const { key } of BOTTLE_STOCK_UNITS) {
            const parsedValue = Number(editBottleStock[key]);
            if (!Number.isFinite(parsedValue) || parsedValue < 0) {
              alert('සියලුම බෝතල් වර්ග සඳහා වලංගු තොග ප්‍රමාණයක් ඇතුළත් කරන්න.');
              return;
            }
            parsedBottleStock[key] = parsedValue;
          }
          await updateDoc(medRef, {
            quantity: parsedBottleStock.bottle,
            currentStock: parsedBottleStock.bottle,
            stock: parsedBottleStock.bottle,
            unit: 'බෝතල්',
            bottleStock: parsedBottleStock,
            ingredients: editIngredients.trim()
          });
        } else {
          await updateDoc(medRef, {
            quantity: newStockVal,
            currentStock: newStockVal,
            stock: newStockVal,
            unit: editUnit,
            ingredients: editIngredients.trim()
          });
        }
      }

      alert('ඖෂධ තොරතුරු සාර්ථකව යාවත්කාලීන කරන ලදී!');
      setShowModal(false);
    } catch (error) {
      console.error("Error updating stock: ", error);
      alert('යාවත්කාලීන කිරීමේදී දෝෂයක් ඇති විය.');
    }
  };

  const handleCreateSupplyRequest = async (item) => {
    const stockKey = `${item.id}-${item.stockRowKey || item.unit}`;
    setRequestingStockKey(stockKey);
    try {
      await addDoc(collection(db, 'low_stock_requests'), {
        inventoryId: item.id,
        itemCode: item.itemCode,
        itemName: item.name,
        quantity: Math.max(0, getInventoryThreshold(item) - item.currentStock),
        unit: item.unit,
        packageUnit: item.stockRowKey && item.stockRowKey !== 'default' ? item.stockRowKey : null,
        threshold: getInventoryThreshold(item),
        currentStock: item.currentStock,
        status: 'pending_admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      alert('අඩු තොග ඉල්ලීම පරිපාලක අනුමත කිරීම සඳහා යවන ලදී.');
    } catch (error) {
      console.error('Error creating low-stock supply request:', error);
      alert('සැපයුම් ඉල්ලීම යැවීමේදී දෝෂයක් ඇති විය.');
    } finally {
      setRequestingStockKey('');
    }
  };

  const displayInventory = inventory;
  const lowStockAlerts = displayInventory.flatMap((item) =>
    getLowStockRows(item).map((row) => ({
      ...item,
      stockRowKey: row.key,
      quantity: row.quantity,
      currentStock: row.quantity,
      unit: row.unit
    }))
  );

  const filteredInventory = displayInventory.flatMap((item) =>
    getInventoryStockRows(item).map((row) => ({
      ...item,
      stockRowKey: row.key,
      quantity: row.quantity,
      currentStock: row.quantity,
      unit: row.unit
    }))
  ).filter(item =>
    (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.ingredients && item.ingredients.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.unit && item.unit.toLowerCase().includes(searchTerm.toLowerCase()))
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
              aria-label="අඩු තොග අනතුරු ඇඟවීම්"
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
                    <th>තත්ත්වය</th>
                    <th>ක්‍රියා</th>
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
                        <td className="ls-ingredients-td">{med.ingredients}</td>
                        <td>
                          <strong>{med.currentStock}</strong> ({med.unit})
                          {isLow && (
                            <span className="ls-tag-low">අඩු තොගය</span>
                          )}
                        </td>
                        <td>{med.expiryDate}</td>
                        <td>
                          <span className={`ls-status-pill ${isLow ? 'low' : 'ok'}`}>
                            {isLow ? 'අඩු තොගය' : 'තොගයේ ඇත'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button 
                              className="ls-btn-action" 
                              onClick={() => handleOpenEditModal(med)}
                              title="යාවත්කාලීන කරන්න"
                              style={{ background: '#e6f4ea', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', color: '#137333', fontSize: '12px', fontWeight: 'bold' }}
                            >
                              යාවත්කාලීන
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* දකුණුපස අනතුරු ඇඟවීම් සහ විකල්ප පුවරුව */}
          <div className="ls-right-panel">
            {/* අඩු තොග අනතුරු ඇඟවීම් පෙට්ටිය */}
            <div className="ls-alert-card" id="low-stock-alerts">
              <div className="ls-alert-header">
                <h3><i className="bi bi-bell-fill text-danger"></i> අඩු තොග අනතුරු ඇඟවීම්</h3>
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
                              {relatedRequest.status === 'approved' ? 'අනුමත වී Supplier වෙත යවා ඇත' : 'පරිපාලක අනුමතිය බලා'}
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
                  <p className="ls-text-muted">අඩු තොග අනතුරු ඇඟවීම් නොමැත.</p>
                )}
              </div>
            </div>

            {/* ඉක්මන් ක්‍රියාකාරකම් පෙට්ටිය */}
            <div className="ls-quick-actions-card">
              <h3><i className="bi bi-plus-circle-fill"></i> ඉක්මන් ක්‍රියා</h3>
              <button className="ls-btn-green" onClick={() => navigate('/pharmacy/inventory')}>
                <i className="bi bi-plus-lg"></i> නව ඖෂධයක් එක් කරන්න
              </button>
              <button className="ls-btn-outline" onClick={() => navigate('/pharmacy/inventory?tab=ingredients')}>
                <i className="bi bi-list-nested"></i> අමුද්‍රව්‍ය ලැයිස්තුව බලන්න
              </button>
              <button className="ls-btn-outline">
                <i className="bi bi-file-earmark-pdf"></i> අඩු තොග වාර්තාවක් සාදන්න
              </button>
            </div>

            {/* මෑත කාලීන දැනුම්දීම් */}
            <div className="ls-notifications-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0 }}>මෑත කාලීන දැනුම්දීම්</h3>
                {notificationPermission === 'default' && (
                  <button type="button" onClick={handleEnableNotifications} style={{ border: 0, background: 'transparent', color: '#137333', cursor: 'pointer', fontSize: '11px' }}>
                    දැනුම්දීම් සක්‍රිය කරන්න
                  </button>
                )}
              </div>
              <ul className="ls-notif-list">
                {notifications.length > 0 ? notifications.map((notification) => (
                  <li key={notification.id}>
                    <span className="dot red"></span>
                    <div><p>{notification.message}</p><small>දැන්</small></div>
                  </li>
                )) : (
                  <li><span className="dot yellow"></span><div><p>නව අඩු තොග දැනුම්දීම් නොමැත.</p></div></li>
                )}
              </ul>
            </div>
          </div> 
        </div>
      </div>

      {/* Edit Modal Popup Box */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '16px', width: '400px', maxWidth: '90%', boxShadow: '0 15px 30px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#1a5a38', fontSize: '18px', fontWeight: 'bold' }}>
              ඖෂධ තොගය යාවත්කාලීන කරන්න
            </h3>
            
            <form onSubmit={handleUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4a3f35', display: 'block', marginBottom: '5px' }}>ඖෂධයේ නම</label>
                <input 
                  type="text" 
                  value={editName} 
                  disabled 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', background: '#f7f6f2', color: '#666' }} 
                />
              </div>

              {isBottleMedicine(editName) ? (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4a3f35', display: 'block', marginBottom: '8px' }}>බෝතල් වර්ගය අනුව තොගය</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {BOTTLE_STOCK_UNITS.map(({ key, label }) => (
                      <div key={key}>
                        <label style={{ fontSize: '12px', color: '#4a3f35', display: 'block', marginBottom: '5px' }}>{label}</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={editBottleStock[key] ?? ''}
                          onChange={(e) => setEditBottleStock((previous) => ({
                            ...previous,
                            [key]: e.target.value
                          }))}
                          required
                          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4a3f35', display: 'block', marginBottom: '5px' }}>වත්මන් තොග ප්‍රමාණය</label>
                    <input
                      type="number"
                      min="0"
                      value={editStock}
                      onChange={(e) => setEditStock(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4a3f35', display: 'block', marginBottom: '5px' }}>ඒකකය (Unit)</label>
                    <input
                      type="text"
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                    />
                  </div>
                </>
              )}

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4a3f35', display: 'block', marginBottom: '5px' }}>අමුද්‍රව්‍ය (එක් පේළියකට එකක්)</label>
                <textarea
                  value={editIngredients}
                  onChange={(e) => setEditIngredients(e.target.value)}
                  rows={4}
                  placeholder={'අරළු\nබුළු\nනෙල්ලි'}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  style={{ flex: 1, background: '#f3ede2', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', color: '#5c4a42' }}
                >
                  අවලංගු කරන්න
                </button>
                <button 
                  type="submit" 
                  style={{ flex: 1, background: '#1a5a38', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  යාවත්කාලීන කරන්න
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
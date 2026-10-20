import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/firebase';
import { collection, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';

import SidebarPhar from '../../components/Sidebar_phar';
import './LowStockInventory.css';

// අද්විතීය ඖෂධ 6 සහ ඒවායේ අමුද්‍රව්‍ය
const INITIAL_MEDICINES = [
  { id: '1', name: 'බුද්ධරාජ කල්ක', ingredients: 'අරළු ගෙඩි, බුළු ගෙඩි, නෙල්ලි ගෙඩි, ඉඟුරු, ගම්මිරිස්, තිප්පිලි', currentStock: 40, unit: 'පැකට්', expiryDate: '2026-12-31', status: 'තොගයේ ඇත', threshold: 10 },
  { id: '2', name: 'සරස්වතාරිෂ්ටය', ingredients: 'වැල්මී මුල්, වදකහ, ඉඟුරු, තිප්පිලි', currentStock: 50, unit: 'බෝතල්', expiryDate: '2026-12-31', status: 'තොගයේ ඇත', threshold: 10 },
  { id: '3', name: 'කොලසැලෙස්මා තෛලය', ingredients: 'ආඩතෝඩා කොළ, පාවට්ටා කොළ, වෙනිවැල්ගැට, ඉඟුරු, තල තෙල්', currentStock: 30, unit: 'බෝතල්', expiryDate: '2026-12-31', status: 'තොගයේ ඇත', threshold: 10 },
  { id: '4', name: 'ජීවලේප ආලේපනය', ingredients: 'පාවට්ටා කොළ, ආඩතෝඩා කොළ, වෙනිවැල්ගැට, කහ, පොල්තෙල්', currentStock: 30, unit: 'ආලේපන', expiryDate: '2026-12-31', status: 'තොගයේ ඇත', threshold: 10 },
  { id: '5', name: 'අරළු පෙති', ingredients: 'අරළු ගෙඩි', currentStock: 300, unit: 'පෙති', expiryDate: '2026-12-31', status: 'තොගයේ ඇත', threshold: 10 },
  { id: '6', name: 'ත්‍රිඵලා පෙති', ingredients: 'අරළු ගෙඩි, බුළු ගෙඩි, නෙල්ලි ගෙඩි', currentStock: 500, unit: 'පෙති', expiryDate: '2026-12-31', status: 'තොගයේ ඇත', threshold: 10 }
];

export default function LowStockInventory() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [inventory, setInventory] = useState(INITIAL_MEDICINES);

  // Modal State සඳහා
  const [showModal, setShowModal] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editUnit, setEditUnit] = useState('');

  // Firebase Firestore Integration
  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, 'inventory'), (snapshot) => {
        if (!snapshot.empty) {
          const list = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const matchedSample = INITIAL_MEDICINES.find(m => m.name === data.name);
            list.push({ 
              id: docSnap.id, 
              name: data.name,
              ingredients: data.ingredients || (matchedSample ? matchedSample.ingredients : 'සාම්ප්‍රදායික ඖෂධීය අමුද්‍රව්‍ය'),
              currentStock: data.currentStock !== undefined ? data.currentStock : (data.quantity || 10),
              threshold: data.threshold || data.minLevel || 10,
              unit: data.unit || 'ඒකක',
              expiryDate: data.expiryDate || '2026-12-31',
              ...data 
            });
          });

          // එකම නම ඇති ඖෂධ ඉවත් කර Unique 6ක් පමණක් තබා ගැනීම
          const uniqueList = [];
          const seenNames = new Set();

          for (const item of list) {
            if (item.name && !seenNames.has(item.name)) {
              seenNames.add(item.name);
              uniqueList.push(item);
            }
          }

          if (uniqueList.length > 0) {
            setInventory(uniqueList.slice(0, 6));
          }
        }
      });
      return () => unsub();
    } catch (error) {
      console.error("Firebase error: ", error);
    }
  }, []);

  // Edit Modal එක විවෘත කිරීම
  const handleOpenEditModal = (item) => {
    setCurrentId(item.id);
    setEditName(item.name || '');
    setEditStock(item.currentStock || '');
    setEditUnit(item.unit || '');
    setShowModal(true);
  };

  // යාවත්කාලීන කිරීම සුරැකීම (Update Handler)
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      if (currentId && typeof currentId === 'string' && currentId.length > 5) {
        const medRef = doc(db, 'inventory', currentId);
        await updateDoc(medRef, {
          currentStock: Number(editStock),
          unit: editUnit
        });
      }

      setInventory(inventory.map(item => 
        item.id === currentId ? { ...item, currentStock: Number(editStock), unit: editUnit } : item
      ));

      alert('ඖෂධ තොරතුරු සාර්ථකව යාවත්කාලීන කරන ලදී!');
      setShowModal(false);
    } catch (error) {
      console.error("Error updating stock: ", error);
      alert('යාවත්කාලීන කිරීමේදී දෝෂයක් ඇති විය.');
    }
  };

  // ඖෂධයක් ඉවත් කිරීම (Delete Handler)
  const handleDeleteItem = async (id, name) => {
    if (window.confirm(`"${name}" ඖෂධය ඉන්වෙන්ටරියෙන් ඉවත් කිරීමට අවශ්‍ය ද?`)) {
      try {
        if (typeof id === 'string' && id.length > 5) {
          await deleteDoc(doc(db, 'inventory', id));
        }
        setInventory(inventory.filter(item => item.id !== id));
        alert('ඖෂධය සාර්ථකව ඉවත් කරන ලදී.');
      } catch (error) {
        console.error("Error deleting document: ", error);
        alert('ඉවත් කිරීමේදී දෝෂයක් ඇති විය.');
      }
    }
  };

  const displayInventory = inventory.reduce((acc, current) => {
    const x = acc.find(item => item.name === current.name);
    if (!x) {
      return acc.concat([current]);
    } else {
      return acc;
    }
  }, []).slice(0, 6);

  const lowStockAlerts = displayInventory.filter(item => Number(item.currentStock || 0) <= Number(item.threshold || 10));

  const filteredInventory = displayInventory.filter(item =>
    (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.ingredients && item.ingredients.toLowerCase().includes(searchTerm.toLowerCase()))
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
            <div className="ls-nav-bell">
              <i className="bi bi-bell-fill"></i>
              <span className="ls-badge-count">{lowStockAlerts.length}</span>
            </div>
            <div className="ls-user-info">
              <i className="bi bi-person-circle"></i>
              <span>ෆාමසි කාර්ය මණ්ඩලය</span>
            </div>
          </div>
        </header>

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
                  <h3 className="ls-stat-val">0</h3>
                </div>
              </div>

              <div className="ls-stat-card">
                <div className="ls-stat-icon blue"><i className="bi bi-calendar-event-fill"></i></div>
                <div>
                  <span className="ls-stat-title">කල් ඉකුත්වෙමින් පවතී</span>
                  <h3 className="ls-stat-val">1</h3>
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
                  {filteredInventory.map((med, idx) => {
                    const isLow = Number(med.currentStock || 0) <= Number(med.threshold || 10);
                    return (
                      <tr key={med.id || idx}>
                        <td>{idx + 1}</td>
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
                            <button 
                              className="ls-btn-action" 
                              onClick={() => handleDeleteItem(med.id, med.name)}
                              title="ඉවත් කරන්න"
                              style={{ background: '#fce8e6', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', color: '#c5221f', fontSize: '14px' }}
                            >
                              🗑️
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
            <div className="ls-alert-card">
              <div className="ls-alert-header">
                <h3><i className="bi bi-bell-fill text-danger"></i> අඩු තොග අනතුරු ඇඟවීම්</h3>
                <span className="ls-alert-badge">{lowStockAlerts.length}</span>
              </div>

              <div className="ls-alerts-list">
                {lowStockAlerts.length > 0 ? (
                  lowStockAlerts.map((item) => (
                    <div className="ls-alert-item" key={item.id}>
                      <div className="ls-alert-item-title">
                        <i className="bi bi-exclamation-circle-fill text-warning"></i>
                        <span><strong>{item.name}</strong></span>
                      </div>
                      <p>වත්මන් තොගය: <strong className="text-danger">{item.currentStock}</strong> ({item.unit})</p>
                      <p className="ls-text-muted">අවම සීමාව: {item.threshold || 10}</p>
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
              <button className="ls-btn-outline">
                <i className="bi bi-list-nested"></i> අමුද්‍රව්‍ය ලැයිස්තුව බලන්න
              </button>
              <button className="ls-btn-outline">
                <i className="bi bi-file-earmark-pdf"></i> අඩු තොග වාර්තාවක් සාදන්න
              </button>
            </div>

            {/* මෑත කාලීන දැනුම්දීම් */}
            <div className="ls-notifications-card">
              <h3>මෑත කාලීන දැනුම්දීම්</h3>
              <ul className="ls-notif-list">
                <li>
                  <span className="dot red"></span>
                  <div>
                    <p>ත්‍රිඵලා පෙති සඳහා අඩු තොග අනතුරු ඇඟවීමක් ඇත</p>
                    <small>පැය 2කට පෙර</small>
                  </div>
                </li>
                <li>
                  <span className="dot yellow"></span>
                  <div>
                    <p>කොලසැලෙස්මා තෛලය සඳහා අඩු තොග අනතුරු ඇඟවීමක් ඇත</p>
                    <small>පැය 3කට පෙර</small>
                  </div>
                </li>
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

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4a3f35', display: 'block', marginBottom: '5px' }}>වත්මන් තොග ප්‍රමාණය</label>
                <input 
                  type="number" 
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
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Firebase Imports
import { db } from '../../firebase/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

// CSS & Assets
import './PharmacyDashboard.css';
import logoEmblem from '../../assets/logo-top.png';
import cornerLeaves from '../../assets/corner-leaves.png';

// නව ආයුර්වේද ඖෂධ ලැයිස්තුව
const AYURVEDIC_MEDICINES = [
  'ත්‍රිඵලා පෙති',
  'සරස්වතාරිෂ්ටය',
  'ජීවලේප ආලේපනය',
  'බුද්ධරාජ කල්ක',
  'කොලසැලෙස්මා තෛලය',
  'අරළු පෙති'
];

// ඖෂධ මාත්‍රා විකල්ප (Dosage Options)
const DOSAGE_OPTIONS = [
  '1 වේලකට 1 බැගින්',
  '1 වේලකට 2 බැගින්',
  'උදේ සවස 1 බැගින්',
  'දිනකට 3 වරක්',
  'අවශ්‍ය පරිදි',
  'බිංදු 5-10 බැගින්',
  'තේ හැඳි 1 බැගින්',
  'මේස හැඳි 1 බැගින්'
];

export default function PharmacyInventory() {
  const navigate = useNavigate();
  
  const [inventory, setInventory] = useState([]);
  const [todaysUsage, setTodaysUsage] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  // Form Fields
  const [medName, setMedName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [minLevel, setMinLevel] = useState('');
  const [dosageOption, setDosageOption] = useState('');

  // Real-time Fetching for Inventory & Prescriptions
  useEffect(() => {
    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      const list = [];
      const seenNames = new Set();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const trimmedName = data.name?.trim();

        if (trimmedName && !seenNames.has(trimmedName)) {
          seenNames.add(trimmedName);
          list.push({ id: docSnap.id, ...data });
        }
      });

      setInventory(list);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching inventory: ", error);
      setLoading(false);
    });

    const unsubPrescriptions = onSnapshot(collection(db, 'pharmacy_prescriptions'), (snapshot) => {
      const usageMap = {};
      const today = new Date();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let presDate = null;

        if (data.createdAt) {
          presDate = typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : new Date(data.createdAt);
        }

        if (presDate && data.status === 'Completed') {
          const isToday = 
            presDate.getDate() === today.getDate() &&
            presDate.getMonth() === today.getMonth() &&
            presDate.getFullYear() === today.getFullYear();

          if (isToday && data.medicines && Array.isArray(data.medicines)) {
            data.medicines.forEach(med => {
              const name = med.name?.trim();
              const matchQty = med.dosage ? parseInt(med.dosage) || 1 : 1; 
              if (name) {
                usageMap[name] = (usageMap[name] || 0) + matchQty;
              }
            });
          }
        }
      });

      setTodaysUsage(usageMap);
    }, (error) => {
      console.error("Error fetching prescriptions usage: ", error);
    });

    return () => {
      unsubInventory();
      unsubPrescriptions();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!medName || !quantity || !unit) {
      alert('කරුණාකර සියලුම අවශ්‍ය තොරතුරු පුරවන්න.');
      return;
    }

    try {
      const payload = {
        name: medName,
        category: category || 'ටැබ්ලට්',
        quantity: Number(quantity),
        unit: unit,
        minLevel: Number(minLevel || 10),
        dosageOption: dosageOption || '',
        updatedAt: serverTimestamp()
      };

      if (isEditing) {
        const medRef = doc(db, 'inventory', currentId);
        await updateDoc(medRef, payload);
        alert('ඖෂධ තොරතුරු යාවත්කාලීන කරන ලදී!');
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, 'inventory'), payload);
        alert('නව ඖෂධය සාර්ථකව එකතු කරන ලදී!');
      }

      handleCloseModal();
    } catch (error) {
      console.error("Error saving medicine: ", error);
      alert('දෝෂයක් ඇති විය.');
    }
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setMedName(AYURVEDIC_MEDICINES[0]);
    setCategory('ටැබ්ලට්');
    setQuantity('');
    setUnit('පෙති');
    setMinLevel('10');
    setDosageOption(DOSAGE_OPTIONS[0]);
    setShowModal(true);
  };

  const handleOpenEditModal = (item) => {
    setIsEditing(true);
    setCurrentId(item.id);
    setMedName(item.name || AYURVEDIC_MEDICINES[0]);
    setCategory(item.category || '');
    setQuantity(item.quantity || '');
    setUnit(item.unit || '');
    setMinLevel(item.minLevel || '');
    setDosageOption(item.dosageOption || '');
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const handleDelete = async (id) => {
    if (window.confirm('මෙම ඖෂධය ඉවත් කිරීමට අවශ්‍යම ද?')) {
      try {
        await deleteDoc(doc(db, 'inventory', id));
      } catch (error) {
        console.error("Error deleting: ", error);
      }
    }
  };

  const filteredInventory = inventory.filter(item => 
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="doctor-container">
      {/* Sidebar */}
      <aside className="doctor-sidebar">
        <div className="sidebar-brand">
          <img src={logoEmblem} alt="Sri Lanka Emblem" className="brand-logo" />
          <h2 className="brand-title">ජාතික ආයුර්වේද</h2>
          <p className="brand-subtitle">ඖෂධ තොග හා රෝගීන් සත්කාරක කළමනාකරණය</p>
          <span className="brand-tag">MANAGEMENT SYSTEM</span>
        </div>

        <nav className="sidebar-menu">
          <button className="menu-item" onClick={() => navigate('/pharmacy/dashboard')}>
            <i className="bi bi-house-door-fill"></i> මුල් පිටුව
          </button>
          <button className="menu-item active" onClick={() => navigate('/pharmacy/inventory')}>
            <i className="bi bi-box-seam"></i> ඖෂධ ඉන්වෙන්ටරිය
          </button>
          <button className="menu-item" onClick={() => navigate('/pharmacy/alerts')}>
            <i className="bi bi-exclamation-triangle-fill" style={{ color: '#fbbf24' }}></i> අඩු තොග අනතුරු ඇඟවීම්
          </button>
          <button className="menu-item" onClick={() => navigate('/pharmacy/issue')}>
            <i className="bi bi-file-medical-fill"></i> ඖෂධ නිකුත් කිරීම
          </button>
        </nav>

        <div className="sidebar-footer-bg">
          <img src={cornerLeaves} alt="Decor Leaves" className="leaf-decor" />
        </div>

        <button className="logout-btn" onClick={() => navigate('/')}>
          <i className="bi bi-box-arrow-left"></i> පිටවීම
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="doctor-main">
        <header className="top-bar">
          <div className="welcome-msg">
            🌿 ඖෂධ ඉන්වෙන්ටරි කළමනාකරණය
          </div>

          <button 
            onClick={handleOpenAddModal}
            style={{ background: '#1a5a38', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            + නව ඖෂධයක් එකතු කරන්න
          </button>
        </header>

        <div className="content-inner" style={{ padding: '20px 30px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '25px', border: '1px solid #f0eae1', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '25px' }}>
              <h3 style={{ margin: 0, color: '#2c221e', fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                <span style={{ color: '#1a5a38', fontWeight: 'bold' }}>|</span> ඖෂධ ඉන්වෙන්ටරිය
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fcfaf7', padding: '8px 15px', borderRadius: '12px', border: '1px solid #e9e2d5', width: '280px' }}>
                <span style={{ color: '#a0aec0', fontSize: '14px' }}>🔍</span>
                <input 
                  type="text" 
                  placeholder="ඖෂධ සොයන්න..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', background: 'transparent', color: '#2c221e' }}
                />
              </div>
            </div>

            {loading ? (
              <p style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>දත්ත ලබාගනිමින් පවතී...</p>
            ) : filteredInventory.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f0eae1', color: '#718096', fontSize: '13px', background: '#fcfaf7' }}>
                      <th style={{ padding: '14px 12px' }}>ඖෂධ නම</th>
                      <th style={{ padding: '14px 12px' }}>ඒකකය</th>
                      <th style={{ padding: '14px 12px' }}>ප්‍රමාණය</th>
                      <th style={{ padding: '14px 12px' }}>තත්ත්වය</th>
                      <th style={{ padding: '14px 12px', textAlign: 'center' }}>ක්‍රියා</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((item) => {
                      const totalQty = Number(item.quantity || 0);
                      const todayUsed = todaysUsage[item.name?.trim()] || 0;
                      // රෝගීන්ට නිකුත් කළ ප්‍රමාණයත් සමඟ ඉන්වෙන්ටරි ප්‍රමාණය Real-time ලෙස අඩු කර පෙන්වීම
                      const currentQty = Math.max(0, totalQty - todayUsed);

                      const minLvl = Number(item.minLevel || 10);
                      const isLow = currentQty <= minLvl;

                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f2ede4', fontSize: '14px' }}>
                          <td style={{ padding: '16px 12px', fontWeight: '600', color: '#2c221e', verticalAlign: 'middle' }}>
                            {item.name}
                            {todayUsed > 0 && (
                              <div style={{ fontSize: '11px', color: '#d97706', marginTop: '4px', fontWeight: 'normal' }}>
                                ⚡ අද නිකුත් කර ඇත: <strong>{item.unit || 'Units'} {todayUsed}</strong>
                              </div>
                            )}
                          </td>
                          
                          <td style={{ padding: '16px 12px', color: '#5c4a42', verticalAlign: 'middle' }}>
                            {item.unit || 'Units'}
                          </td>

                          <td style={{ padding: '16px 12px', fontWeight: 'bold', color: isLow ? '#b91c1c' : '#2c221e', verticalAlign: 'middle' }}>
                            {currentQty}
                          </td>

                          <td style={{ padding: '16px 12px', verticalAlign: 'middle' }}>
                            <span style={{ 
                              padding: '5px 12px', 
                              borderRadius: '20px', 
                              fontSize: '11px', 
                              fontWeight: '600',
                              background: isLow ? '#fee2e2' : '#ecfdf5',
                              color: isLow ? '#991b1b' : '#065f46',
                              display: 'inline-block'
                            }}>
                              {isLow ? 'අඩු තොගය' : 'තොගයේ ඇත'}
                            </span>
                          </td>
                          <td style={{ padding: '16px 12px', textAlign: 'center', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                              <button 
                                onClick={() => handleOpenEditModal(item)}
                                style={{ background: '#f3ede2', border: 'none', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: '#4a3f35', fontWeight: '600' }}
                              >
                                යාවත්කාලීන
                              </button>
                              <button 
                                onClick={() => handleDelete(item.id)}
                                style={{ background: '#fee2e2', border: 'none', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: '#991b1b' }}
                                title="ඉවත් කරන්න"
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
            ) : (
              <p style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>ඉන්වෙන්ටරියේ ඖෂධ කිසිවක් නොමැත.</p>
            )}

          </div>
        </div>
      </main>

      {/* Modal Popup for Add / Edit */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '16px', width: '440px', maxWidth: '90%', boxShadow: '0 15px 30px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#1a5a38', fontSize: '18px', fontWeight: 'bold' }}>
              {isEditing ? 'ඖෂධ තොරතුරු යාවත්කාලීන කරන්න' : 'නව ආයුර්වේද ඖෂධයක් එකතු කරන්න'}
            </h3>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4a3f35', display: 'block', marginBottom: '5px' }}>ඖෂධයේ නම</label>
                <select 
                  value={medName} 
                  onChange={(e) => setMedName(e.target.value)} 
                  required 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', background: '#fff' }}
                >
                  {AYURVEDIC_MEDICINES.map((med, idx) => (
                    <option key={idx} value={med}>{med}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4a3f35', display: 'block', marginBottom: '5px' }}>කාණ්ඩය</label>
                <input 
                  type="text" 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)} 
                  placeholder="උදා: ක්වාථ / චූර්ණ / තෛලය / අස්වය" 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }} 
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4a3f35', display: 'block', marginBottom: '5px' }}>ප්‍රමාණය</label>
                  <input 
                    type="number" 
                    value={quantity} 
                    onChange={(e) => setQuantity(e.target.value)} 
                    required 
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4a3f35', display: 'block', marginBottom: '5px' }}>යුනිට් (Unit)</label>
                  <input 
                    type="text" 
                    value={unit} 
                    onChange={(e) => setUnit(e.target.value)} 
                    placeholder="උදා: බෝතල්, පැකට්, kg" 
                    required 
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }} 
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4a3f35', display: 'block', marginBottom: '5px' }}>සම්මත මාත්‍රාව (Dosage Option)</label>
                <select 
                  value={dosageOption} 
                  onChange={(e) => setDosageOption(e.target.value)} 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', background: '#fff' }}
                >
                  <option value="">-- මාත්‍රාවක් තෝරන්න --</option>
                  {DOSAGE_OPTIONS.map((opt, idx) => (
                    <option key={idx} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4a3f35', display: 'block' }}>අවම තොග මට්ටම (අනතුරු ඇඟවීම සඳහා)</label>
                <input 
                  type="number" 
                  value={minLevel} 
                  onChange={(e) => setMinLevel(e.target.value)} 
                  placeholder="10" 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }} 
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button 
                  type="button" 
                  onClick={handleCloseModal} 
                  style={{ flex: 1, background: '#f3ede2', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', color: '#5c4a42' }}
                >
                  අවලංගු කරන්න
                </button>
                <button 
                  type="submit" 
                  style={{ flex: 1, background: '#1a5a38', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  සුරකින්න
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
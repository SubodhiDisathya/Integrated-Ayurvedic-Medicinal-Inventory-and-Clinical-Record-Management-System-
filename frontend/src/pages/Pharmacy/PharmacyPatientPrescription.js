import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Firebase Imports
import { db } from '../../firebase/firebase';
import { collection, onSnapshot, doc, updateDoc, query, where } from 'firebase/firestore';

// CSS Import
import './PharmacyDashboard.css';

// Asset Imports
import logoEmblem from '../../assets/logo-top.png';
import cornerLeaves from '../../assets/corner-leaves.png';

export default function PharmacyPatientPrescription() {
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    // Pending තත්ත්වයේ ඇති සියලුම වට්ටෝරු ලබා ගැනීම
    const q = query(
      collection(db, 'pharmacy_prescriptions'), 
      where('status', '==', 'Pending')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      const today = new Date();
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let prescriptionDate = null;

        // Firestore Timestamp එක JavaScript Date එකකට හැරවීම
        if (data.createdAt) {
          if (typeof data.createdAt.toDate === 'function') {
            prescriptionDate = data.createdAt.toDate();
          } else {
            prescriptionDate = new Date(data.createdAt);
          }
        }

        // වට්ටෝරුව සාදා ඇති දිනය අද දිනට (Year, Month, Date) සමාන දැයි පරීක්ෂා කිරීම
        if (prescriptionDate) {
          const isToday = 
            prescriptionDate.getDate() === today.getDate() &&
            prescriptionDate.getMonth() === today.getMonth() &&
            prescriptionDate.getFullYear() === today.getFullYear();

          if (isToday) {
            list.push({ id: docSnap.id, ...data });
          }
        }
      });

      setPrescriptions(list);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching prescriptions: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleToggleMedicine = async (prescriptionId, medIndex, currentMedicines) => {
    try {
      const updatedMedicines = currentMedicines.map((med, idx) => {
        if (idx === medIndex) {
          return { ...med, isIssued: !med.isIssued };
        }
        return med;
      });

      const prescriptionRef = doc(db, 'pharmacy_prescriptions', prescriptionId);
      await updateDoc(prescriptionRef, {
        medicines: updatedMedicines
      });
    } catch (error) {
      console.error("Error updating medicine status: ", error);
      alert('බෙහෙත් තත්ත්වය යාවත්කාලීන කිරීමේදී දෝෂයක් ඇති විය.');
    }
  };

  const handleCompletePrescription = async (prescriptionId) => {
    try {
      const prescriptionRef = doc(db, 'pharmacy_prescriptions', prescriptionId);
      await updateDoc(prescriptionRef, {
        status: 'Completed'
      });
      alert('රෝගියාට ඖෂධ සාර්ථකව නිකුත් කර අවසන් කරන ලදී!');
    } catch (error) {
      console.error("Error updating prescription status: ", error);
      alert('වට්ටෝරුව අවසන් කිරීමේදී දෝෂයක් ඇති විය.');
    }
  };

  const filteredPrescriptions = prescriptions.filter(item => {
    if (selectedCategory === 'All') return true;
    return item.diagnosis === selectedCategory;
  });

  const categories = ['All', ...new Set(prescriptions.map(item => item.diagnosis))];

  return (
    <div className="doctor-container">
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
          <button className="menu-item" onClick={() => navigate('/pharmacy/inventory')}>
            <i className="bi bi-box-seam"></i> ඖෂධ ඉන්වෙන්ටරිය
          </button>
          <button className="menu-item" onClick={() => navigate('/pharmacy/alerts')}>
            <i className="bi bi-exclamation-triangle-fill" style={{ color: '#fbbf24' }}></i> අඩු තොග අනතුරු ඇඟවීම්
          </button>
          <button className="menu-item active" onClick={() => navigate('/pharmacy/issue')}>
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

      <main className="doctor-main">
        <header className="top-bar">
          <div className="welcome-msg">
            <span className="leaf-icon">🍃</span> රෝගී ඖෂධ නිකුත් කිරීමේ අංශය (Pharmacy Dispensing Dashboard)
          </div>
          <button className="back-btn" onClick={() => navigate('/pharmacy/dashboard')}>
            ⬅ උපකරණ පුවරුවට
          </button>
        </header>

        <div className="content-inner">
          <div className="card-box" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
              <h3><span className="bar-icon">|</span> නිකුත් කළ යුතු රෝගී වට්ටෝරු ලැයිස්තුව (අද දිනට පමණි)</h3>
              
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {categories.map((cat, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      border: '1px solid #1a5a38',
                      background: selectedCategory === cat ? '#1a5a38' : '#fff',
                      color: selectedCategory === cat ? '#fff' : '#1a5a38',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {cat === 'All' ? 'සියලුම (All)' : cat}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <p className="loading-text">දත්ත ලබාගනිමින් පවතී...</p>
            ) : filteredPrescriptions.length > 0 ? (
              <div className="prescription-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {filteredPrescriptions.map((item) => {
                  const medicines = item.medicines || [];
                  const allChecked = medicines.length > 0 && medicines.every(m => m.isIssued);
                  
                  return (
                    <div key={item.id} className="prescription-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div>
                            <span className="patient-id-badge" style={{ background: '#eef2e8', color: '#1a5a38', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>{item.patientId}</span>
                            <h4 className="patient-name" style={{ margin: '6px 0 0 0', color: '#1c2a1d', fontSize: '18px' }}>{item.patientName}</h4>
                          </div>
                          <span className="diagnosis-tag" style={{ background: '#f7f2e7', color: '#8a4a32', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '500' }}>
                            📌 {item.diagnosis}
                          </span>
                        </div>
                        <hr className="divider" style={{ border: '0', borderTop: '1px solid #eee', margin: '12px 0' }} />

                        <p className="med-list-title" style={{ fontSize: '13px', fontWeight: 'bold', color: '#2d3748', marginBottom: '8px' }}>🌿 නියමිත ඖෂධ සහ මාත්‍රා:</p>
                        <ul className="med-items" style={{ listStyle: 'none', padding: 0, margin: '0 0 15px 0' }}>
                          {medicines.map((med, idx) => (
                            <li key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', background: '#fafaf9', padding: '8px 10px', borderRadius: '6px', border: '1px solid #f0f0f0' }}>
                              <label style={{ display: 'flex', alignItems: 'center', width: '100%', cursor: 'pointer', gap: '10px' }}>
                                <input 
                                  type="checkbox"
                                  checked={!!med.isIssued}
                                  onChange={() => handleToggleMedicine(item.id, idx, medicines)}
                                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#1a5a38' }}
                                />
                                <span style={{ fontSize: '13px', color: med.isIssued ? '#718096' : '#2d3748', textDecoration: med.isIssued ? 'line-through' : 'none' }}>
                                  <strong>{med.name}</strong> 
                                  {med.dosage ? ` - ${med.dosage}` : ''}
                                  {med.duration ? ` (${med.duration})` : ''}
                                </span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button 
                        onClick={() => handleCompletePrescription(item.id)}
                        disabled={!allChecked}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: 'none',
                          background: allChecked ? '#1a5a38' : '#cbd5e0',
                          color: '#fff',
                          fontWeight: 'bold',
                          cursor: allChecked ? 'pointer' : 'not-allowed',
                          transition: 'background 0.3s ease'
                        }}
                      >
                        {allChecked ? '✅ ඖෂධ නිකුත් කර අවසන් කරන්න' : '⏳ සියලුම බෙහෙත් තෝරන්න'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>අද දිනට නිකුත් කළ යුතු වට්ටෝරු නොමැත.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
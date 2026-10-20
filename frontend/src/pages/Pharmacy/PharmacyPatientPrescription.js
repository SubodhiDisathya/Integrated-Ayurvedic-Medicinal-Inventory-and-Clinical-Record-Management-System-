import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Firebase Imports
import { db } from '../../firebase/firebase';
import { collection, onSnapshot, doc, updateDoc, query, where, getDocs } from 'firebase/firestore';

// Component Import
import SidebarPhar from '../../components/Sidebar_phar';

// CSS Import
import './PharmacyDashboard.css';

// 🧮 Precise Universal Calculation Helper Function
export const calculateTotalQuantity = (med) => {
  if (!med) return 0;
  if (med.totalQty !== undefined && !isNaN(Number(med.totalQty)) && Number(med.totalQty) > 0) {
    return Number(med.totalQty);
  }
  if (med.quantity !== undefined && !isNaN(Number(med.quantity)) && Number(med.quantity) > 0) {
    return Number(med.quantity);
  }

  const dosageStr = String(med.dosage || med.dosageOption || '').toLowerCase();
  const durationStr = String(med.duration || med.days || '').toLowerCase();

  // 1. Extract Days safely
  let days = 1;
  const durationMatches = durationStr.match(/\d+/);
  if (durationMatches) {
    days = Number(durationMatches[0]) || 1;
  }
  if (durationStr.includes('සති') || durationStr.includes('week')) {
    days = days * 7;
  }

  // 2. Extract Per-Dose quantity safely
  let perDose = 1;
  const dosageMatches = dosageStr.match(/\d+/g);
  if (dosageMatches && dosageMatches.length > 0) {
    perDose = Number(dosageMatches[0]) || 1;
  }

  // 3. Extract Frequency (Times per day)
  let timesPerDay = 1;
  if (dosageStr.includes('දිනකට 3') || dosageStr.includes('3 වරක්') || dosageStr.includes('3 times')) {
    timesPerDay = 3;
  } else if (dosageStr.includes('උදේ සවස') || dosageStr.includes('උදේ/සවස') || dosageStr.includes('දිනකට 2') || dosageStr.includes('2 වරක්')) {
    timesPerDay = 2;
  } else if (dosageStr.includes('දිනකට 4') || dosageStr.includes('4 වරක්')) {
    timesPerDay = 4;
  }

  const total = perDose * timesPerDay * days;
  return isNaN(total) || total <= 0 ? 1 : total;
};

export default function PharmacyPatientPrescription() {
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
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

        if (data.createdAt) {
          if (typeof data.createdAt.toDate === 'function') {
            prescriptionDate = data.createdAt.toDate();
          } else {
            prescriptionDate = new Date(data.createdAt);
          }
        }

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
      alert('Error updating medicine status.');
    }
  };

  const handleCompletePrescription = async (prescriptionId) => {
    try {
      const prescriptionToIssue = prescriptions.find(p => p.id === prescriptionId);
      
      if (prescriptionToIssue && prescriptionToIssue.medicines) {
        const invSnapshot = await getDocs(collection(db, 'inventory'));
        
        for (const med of prescriptionToIssue.medicines) {
          const medNameTrimmed = med.name?.trim();
          const issuedQty = calculateTotalQuantity(med);

          invSnapshot.forEach(async (invDoc) => {
            const invData = invDoc.data();
            if (invData.name?.trim() === medNameTrimmed) {
              const currentStock = Number(invData.quantity || 0);
              const updatedStock = Math.max(0, currentStock - issuedQty);

              const invRef = doc(db, 'inventory', invDoc.id);
              await updateDoc(invRef, {
                quantity: updatedStock
              });
            }
          });
        }
      }

      const prescriptionRef = doc(db, 'pharmacy_prescriptions', prescriptionId);
      await updateDoc(prescriptionRef, {
        status: 'Completed'
      });

      alert('Medicines successfully issued and inventory updated!');
    } catch (error) {
      console.error("Error updating prescription status: ", error);
      alert('Error completing prescription.');
    }
  };

  const filteredPrescriptions = prescriptions.filter(item => {
    if (selectedCategory === 'All') return true;
    return item.diagnosis === selectedCategory;
  });

  const categories = ['All', ...new Set(prescriptions.map(item => item.diagnosis))];

  return (
    <div className="doctor-container">
      <SidebarPhar />

      <main className="doctor-main">
        <header className="top-bar">
          <div className="welcome-msg">
            <span className="leaf-icon">🍃</span> Pharmacy Dispensing Dashboard
          </div>
          <button className="back-btn" onClick={() => navigate('/pharmacy/dashboard')}>
            ⬅ Back to Dashboard
          </button>
        </header>

        <div className="content-inner">
          <div className="card-box" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
              <h3><span className="bar-icon">|</span> Pending Prescriptions (Today Only)</h3>
              
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
                    {cat === 'All' ? 'All' : cat}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <p className="loading-text">Loading data...</p>
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

                        <p className="med-list-title" style={{ fontSize: '13px', fontWeight: 'bold', color: '#2d3748', marginBottom: '8px' }}>🌿 Prescribed Medicines & Dosages:</p>
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
                        {allChecked ? '✅ Complete Issuing' : '⏳ Select All Medicines'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>No prescriptions to issue today.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
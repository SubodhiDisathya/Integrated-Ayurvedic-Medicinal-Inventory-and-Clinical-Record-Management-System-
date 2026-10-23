import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Firebase Imports
import { db } from '../../firebase/firebase';
import { collection, onSnapshot, doc, updateDoc, query, where, getDocs, runTransaction } from 'firebase/firestore';
import { calculateMedicineQuantity, calculateTotalQuantity, isMilliliterUnit } from '../../utils/medicineQuantity';

// Component Import
import SidebarPhar from '../../components/Sidebar_phar';

// CSS Import
import './PharmacyDashboard.css';

export { calculateTotalQuantity };

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

      if (!prescriptionToIssue?.medicines?.length) {
        throw new Error('This prescription has no medicines to issue.');
      }

      const inventorySnapshot = await getDocs(collection(db, 'inventory'));
      const inventoryByName = new Map();
      inventorySnapshot.forEach((inventoryDoc) => {
        const name = inventoryDoc.data().name?.trim();
        if (name && !inventoryByName.has(name)) {
          inventoryByName.set(name, inventoryDoc.ref);
        }
      });

      const stockChanges = new Map();
      for (const med of prescriptionToIssue.medicines) {
        const name = med.name?.trim();
        const inventoryRef = inventoryByName.get(name);
        if (!inventoryRef) {
          throw new Error(`"${name || 'නොදන්නා ඖෂධය'}" තොග ලැයිස්තුවේ හමු නොවීය.`);
        }

        const issue = calculateMedicineQuantity(med);
        if (!issue.quantity) {
          throw new Error(`"${name}" සඳහා නිකුත් කළ යුතු ප්‍රමාණය ගණනය කළ නොහැක.`);
        }

        const existingChange = stockChanges.get(inventoryRef.id);
        if (existingChange && existingChange.unit !== issue.unit) {
          throw new Error(`"${name}" ඖෂධය සඳහා එකිනෙකට වෙනස් මිනුම් ඒකක සහිත මාත්‍රා තිබේ.`);
        }
        stockChanges.set(inventoryRef.id, {
          ref: inventoryRef,
          name,
          unit: issue.unit,
          issuedQty: (existingChange?.issuedQty || 0) + issue.quantity
        });
      }

      const prescriptionRef = doc(db, 'pharmacy_prescriptions', prescriptionId);
      await runTransaction(db, async (transaction) => {
        const prescriptionSnapshot = await transaction.get(prescriptionRef);
        if (!prescriptionSnapshot.exists() || prescriptionSnapshot.data().status !== 'Pending') {
          throw new Error('මෙම බෙහෙත් තුණ්ඩුව දැනටමත් නිකුත් කර ඇත, නැතහොත් තවදුරටත් පොරොත්තු තත්ත්වයේ නොමැත.');
        }

        const changes = Array.from(stockChanges.values());
        const inventorySnapshots = await Promise.all(
          changes.map(({ ref }) => transaction.get(ref))
        );

        changes.forEach((change, index) => {
          const inventoryDoc = inventorySnapshots[index];
          if (!inventoryDoc.exists()) {
            throw new Error(`"${change.name}" ඖෂධය තොග ලැයිස්තුවේ හමු නොවීය.`);
          }

          const inventoryData = inventoryDoc.data();
          if (change.unit === 'ml' && !isMilliliterUnit(inventoryData.unit)) {
            throw new Error(`"${change.name}" ඖෂධයේ තොග ඒකකය mL නොවේ. බෝතල් ප්‍රමාණය අනුමාන නොකරන බැවින්, තොග ඒකකය mL කර නිවැරදි ඉතිරි mL ප්‍රමාණය ඇතුළත් කරන්න.`);
          }
          if (change.unit === 'count' && isMilliliterUnit(inventoryData.unit)) {
            throw new Error(`"${change.name}" සඳහා මාත්‍රාව mL ලෙස සඳහන් කරන්න. තොග ඒකකය mL වේ.`);
          }

          const currentStock = Number(inventoryData.quantity || 0);
          if (!Number.isFinite(currentStock) || currentStock < change.issuedQty) {
            throw new Error(`"${change.name}" සඳහා තොගය ප්‍රමාණවත් නැත. ඉතිරිව ඇත්තේ ${currentStock}යි; අවශ්‍ය ප්‍රමාණය ${change.issuedQty}යි.`);
          }
        });

        changes.forEach((change, index) => {
          const currentStock = Number(inventorySnapshots[index].data().quantity || 0);
          transaction.update(change.ref, { quantity: currentStock - change.issuedQty });
        });
        transaction.update(prescriptionRef, { status: 'Completed' });
      });

      alert('ඖෂධ සාර්ථකව නිකුත් කර තොගය යාවත්කාලීන කරන ලදී!');
    } catch (error) {
      console.error("Error updating prescription status: ", error);
      alert(error instanceof Error ? error.message : 'බෙහෙත් තුණ්ඩුව සම්පූර්ණ කිරීමේදී දෝෂයක් ඇති විය.');
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
                                  {med.frequency ? ` (${med.frequency})` : ''}
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
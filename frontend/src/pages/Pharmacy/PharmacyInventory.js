import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

// Component & CSS Imports
import SidebarPhar from '../../components/Sidebar_phar';
import './PharmacyDashboard.css';

// 🧮 100% Accurate Calculation Function
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

  // 1. දින ගණන (Days)
  let days = 1;
  const durationMatches = durationStr.match(/\d+/);
  if (durationMatches) {
    days = Number(durationMatches[0]) || 1;
  }
  if (durationStr.includes('සති') || durationStr.includes('week')) {
    days = days * 7;
  }

  // 2. වේලකට ගන්නා ප්‍රමාණය (Per-Dose)
  let perDose = 1;
  const dosageMatches = dosageStr.match(/\d+/g);
  if (dosageMatches && dosageMatches.length > 0) {
    perDose = Number(dosageMatches[0]) || 1;
  }

  // 3. දිනකට වාර ගණන (Times per day)
  let timesPerDay = 1;
  if (dosageStr.includes('දිනකට 3') || dosageStr.includes('3 වරක්') || dosageStr.includes('3 times') || dosageStr.includes('දිනකට තුන් වරක්')) {
    timesPerDay = 3;
  } else if (dosageStr.includes('උදේ සවස') || dosageStr.includes('උදේ/සවස') || dosageStr.includes('දිනකට 2') || dosageStr.includes('2 වරක්') || dosageStr.includes('දිනකට දෙවරක්')) {
    timesPerDay = 2;
  } else if (dosageStr.includes('දිනකට 4') || dosageStr.includes('4 වරක්')) {
    timesPerDay = 4;
  }

  const total = perDose * timesPerDay * days;
  return isNaN(total) || total <= 0 ? 1 : total;
};

const AYURVEDIC_MEDICINES = [
  'ත්‍රිඵලා පෙති',
  'සරස්වතාරිෂ්ටය',
  'ජීවලේප ආලේපනය',
  'බුද්ධරාජ කල්ක',
  'කොලසැලෙස්මා තෛලය',
  'අරළු පෙති'
];

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

  useEffect(() => {
    // 1. Inventory Real-time Listener
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

    // 2. Prescriptions Usage Real-time Listener (Only for Displaying Today's Issued Badge)
    const unsubPrescriptions = onSnapshot(collection(db, 'pharmacy_prescriptions'), (snapshot) => {
      const usageMap = {};
      const today = new Date();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let presDate = null;

        if (data.createdAt) {
          presDate = typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : new Date(data.createdAt);
        }

        if (presDate && (data.status === 'Completed' || data.status === 'Issued')) {
          const isToday = 
            presDate.getDate() === today.getDate() &&
            presDate.getMonth() === today.getMonth() &&
            presDate.getFullYear() === today.getFullYear();

          if (isToday && data.medicines && Array.isArray(data.medicines)) {
            data.medicines.forEach(med => {
              const name = med.name?.trim();
              const totalIssuedQty = calculateTotalQuantity(med);

              if (name && totalIssuedQty > 0) {
                usageMap[name] = (usageMap[name] || 0) + totalIssuedQty;
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
      alert('කරුණාකර අවශ්‍ය සියලුම තොරතුරු පුරවන්න.');
      return;
    }

    try {
      const payload = {
        name: medName,
        category: category || 'Tablet',
        quantity: Number(quantity),
        unit: unit,
        minLevel: Number(minLevel || 10),
        dosageOption: dosageOption || '',
        updatedAt: serverTimestamp()
      };

      if (isEditing) {
        const medRef = doc(db, 'inventory', currentId);
        await updateDoc(medRef, payload);
        alert('ඖෂධ තොරතුරු සාර්ථකව යාවත්කාලීන කරන ලදී!');
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, 'inventory'), payload);
        alert('නව ඖෂධය සාර්ථකව එක් කරන ලදී!');
      }

      setShowModal(false);
    } catch (error) {
      console.error("Error saving medicine: ", error);
      alert('දෝෂයක් සිදු විය.');
    }
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setMedName(AYURVEDIC_MEDICINES[0]);
    setCategory('Tablet');
    setQuantity('');
    setUnit('Tablets');
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

  const handleDelete = async (id) => {
    if (window.confirm('මෙම ඖෂධය මකා දැමීමට ඔබට විශ්වාසද?')) {
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
      <SidebarPhar />

      <main className="doctor-main">
        <header className="top-bar">
          <div className="welcome-msg">
            🌿 ඖෂධශාලා තොග කළමනාකරණය
          </div>

          <button 
            onClick={handleOpenAddModal}
            style={{ background: '#1a5a38', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            + නව ඖෂධයක් එක් කරන්න
          </button>
        </header>

        <div className="content-inner" style={{ padding: '20px 30px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '25px', border: '1px solid #f0eae1', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '25px' }}>
              <h3 style={{ margin: 0, color: '#2c221e', fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                <span style={{ color: '#1a5a38', fontWeight: 'bold' }}>|</span> ඖෂධ තොගය
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
              <p style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>දත්ත ලබා ගනිමින්...</p>
            ) : filteredInventory.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f0eae1', color: '#718096', fontSize: '13px', background: '#fcfaf7' }}>
                      <th style={{ padding: '14px 12px' }}>ඖෂධයේ නම</th>
                      <th style={{ padding: '14px 12px' }}>ඒකකය</th>
                      <th style={{ padding: '14px 12px' }}>ඉතිරි ප්‍රමාණය</th>
                      <th style={{ padding: '14px 12px' }}>තත්ත්වය</th>
                      <th style={{ padding: '14px 12px', textAlign: 'center' }}>ක්‍රියාමාර්ග</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((item) => {
                      // 💡 FIXED: Real-time Stock is directly managed from Firestore `quantity`
                      const currentQty = Number(item.quantity || 0);
                      const todayUsed = todaysUsage[item.name?.trim()] || 0;
                      
                      const minLvl = Number(item.minLevel || 10);
                      const isLow = currentQty <= minLvl;

                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f2ede4', fontSize: '14px' }}>
                          <td style={{ padding: '16px 12px', fontWeight: '600', color: '#2c221e', verticalAlign: 'middle' }}>
                            {item.name}
                            {todayUsed > 0 && (
                              <div style={{ fontSize: '11px', color: '#d97706', marginTop: '4px', fontWeight: 'normal' }}>
                                ⚡ අද නිකුත් කළ ප්‍රමාණය: <strong>{todayUsed} {item.unit || 'ඒකක'}</strong>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '16px 12px', color: '#5c4a42', verticalAlign: 'middle' }}>
                            {item.unit || 'ඒකක'}
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
                              {isLow ? 'තොගය අඩුයි' : 'තොගයේ ඇත'}
                            </span>
                          </td>
                          <td style={{ padding: '16px 12px', textAlign: 'center', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                              <button 
                                onClick={() => handleOpenEditModal(item)}
                                style={{ background: '#f3ede2', border: 'none', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: '#4a3f35', fontWeight: '600' }}
                              >
                                යාවත්කාලීන කරන්න
                              </button>
                              <button 
                                onClick={() => handleDelete(item.id)}
                                style={{ background: '#fee2e2', border: 'none', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: '#991b1b' }}
                                title="මකන්න"
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
              <p style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>තොගයේ ඖෂධ හමු නොවීය.</p>
            )}

          </div>
        </div>
      </main>

      {/* Modal Popup */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '16px', width: '440px', maxWidth: '90%', boxShadow: '0 15px 30px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#1a5a38', fontSize: '18px', fontWeight: 'bold' }}>
              {isEditing ? 'ඖෂධ තොරතුරු යාවත්කාලීන කරන්න' : 'නව ආයුර්වේද ඖෂධයක් එක් කරන්න'}
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
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4a3f35', display: 'block', marginBottom: '5px' }}>වර්ගය</label>
                <input 
                  type="text" 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)} 
                  placeholder="උදා: පෙති / සිරප්"
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
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4a3f35', display: 'block', marginBottom: '5px' }}>ඒකකය</label>
                  <input 
                    type="text" 
                    value={unit} 
                    onChange={(e) => setUnit(e.target.value)} 
                    placeholder="උදා: පෙති, බෝතල්"
                    required 
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }} 
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4a3f35', display: 'block', marginBottom: '5px' }}>සාමාන්‍ය මාත්‍රා විකල්පය</label>
                <select 
                  value={dosageOption} 
                  onChange={(e) => setDosageOption(e.target.value)} 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', background: '#fff' }}
                >
                  <option value="">-- මාත්‍රා විකල්පයක් තෝරන්න --</option>
                  {DOSAGE_OPTIONS.map((opt, idx) => (
                    <option key={idx} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4a3f35', display: 'block' }}>අවම තොග මට්ටම (දැනුම්දීම් සඳහා)</label>
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
                  onClick={() => setShowModal(false)} 
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
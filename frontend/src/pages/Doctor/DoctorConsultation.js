import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

// Firebase Imports
import { db } from '../../firebase/firebase';
import { 
  collection, 
  addDoc, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  updateDoc, 
  arrayUnion, 
  serverTimestamp 
} from 'firebase/firestore';

// CSS Import
import './DoctorConsultation.css';

// Asset Imports
import logoEmblem from '../../assets/logo-top.png';
import cornerLeaves from '../../assets/corner-leaves.png';

// Dropdown options
const DISEASE_OPTIONS = [
  'මලබද්ධය / අජීර්ණය (Constipation / Indigestion)',
  'ස්නායු දුබලතා සහ මානසික ආතතිය (Nervous System Disorders / and Stress Relief)',
  'මාංශ පේශි වේදනා / සන්ධි වේදනා / හිසරදය සහ සෙම්ප්‍රතිශ්‍යාව (Muscle Aches / Joint Pain / Headache / and Common Cold)',
  'උණ / සෙම්ප්‍රතිශ්‍යාව / උදරයේ කැක්කුම සහ බඩ පිපීම (Fever / Common Cold / Abdominal Colic / and Flatulence)',
  'අධික කැස්ස / පීනස / සෙම් රෝග සහ ශ්වසන අපහසුතා (Severe Cough / Catarrh / Phlegm-related Disorders / and Respiratory Issues)',
  'මලබද්ධය / අර්ශස් රෝගී අපහසුතා සහ ශරීරය අභ්‍යන්තරයෙන් පිරිසිදු කිරීම(Constipation, Piles/Hemorrhoids discomfort / and Body Detoxification)',
];

const MEDICINE_NAMES = [
  'ත්‍රිඵලා පෙති',
  'සරස්වතාරිෂ්ටය',
  'ජීවලේප ආලේපනය',
  'බුද්ධරාජ කල්ක',
  'කොලසැලෙස්මා තෛලය',
  'අරළු පෙති'
];

const DOSAGE_OPTIONS = [
  'කෝප්ප භාගයක් (60 mL)',
  'කෝප්ප එකක් (120 mL)',
  'තේ හැන්දක් (3 g)',
  'තේ හැඳි 2ක් (6 g)',
  'පෙති 1 බැගින්',
  'පෙති 2 බැගින්',
  'මේස හැන්දක් (15 mL)',
  'ආලේප කිරීම (අවශ්‍ය පමණ)'
];

const DURATION_OPTIONS = [
  'දින 3ක්',
  'දින 5ක්',
  'දින 7ක්',
  'දින 10ක්',
  'දින 14ක්',
  'දින 21ක්',
  'මාස 1ක්'
];

const FREQUENCY_OPTIONS = [
  'උදේ',
  'උදේ, සවස',
  'උදේ, දවල්, රාත්‍රී',
  'උදේ, සවස, රාත්‍රී',
  'දිනකට 4 වරක්'
];

export default function DoctorConsultation() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const passedPatient = location.state?.patient;

  const [patient, setPatient] = useState({
    docFirestoreId: '',
    id: id || passedPatient?.id || '',
    name: passedPatient?.name || '',
    age: passedPatient?.age || '',
    gender: passedPatient?.gender || '',
    phone: passedPatient?.phone || '',
    history: Array.isArray(passedPatient?.history) ? passedPatient.history : [],
  });

  const [loadingPatient, setLoadingPatient] = useState(true);

  // Form States
  const [diseases, setDiseases] = useState(['']);
  const [medicines, setMedicines] = useState([{ name: '', dosage: '', frequency: '', duration: '', isIssued: false }]);
  const [nextVisit, setNextVisit] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Workflow States
  const [isPharmacySent, setIsPharmacySent] = useState(false);
  const [currentPrescriptionId, setCurrentPrescriptionId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchId = id || passedPatient?.id;
    if (!searchId) {
      setLoadingPatient(false);
      return;
    }

    setLoadingPatient(true);

    const docRef = doc(db, 'patients', searchId);
    const unsubDoc = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPatient({
          docFirestoreId: docSnap.id,
          id: data?.patientId || searchId,
          name: data?.fullName || data?.name || '',
          age: data?.age || '',
          gender:
            data?.gender === 'male' ? 'පුරුෂ'
            : data?.gender === 'female' ? 'ස්ත්‍රී'
            : data?.gender || '',
          phone: data?.contactNumber || data?.phone || '',
          history: Array.isArray(data?.history) ? data.history : [],
        });
        setLoadingPatient(false);
      } else {
        const q = query(collection(db, 'patients'), where('patientId', '==', searchId));
        const unsubQuery = onSnapshot(q, (querySnapshot) => {
          if (!querySnapshot.empty) {
            const foundDoc = querySnapshot.docs[0];
            const data = foundDoc.data();
            setPatient({
              docFirestoreId: foundDoc.id,
              id: data?.patientId || searchId,
              name: data?.fullName || data?.name || '',
              age: data?.age || '',
              gender:
                data?.gender === 'male' ? 'පුරුෂ'
                : data?.gender === 'female' ? 'ස්ත්‍රී'
                : data?.gender || '',
              phone: data?.contactNumber || data?.phone || '',
              history: Array.isArray(data?.history) ? data.history : [],
            });
          }
          setLoadingPatient(false);
        });

        return () => unsubQuery();
      }
    });

    return () => unsubDoc();
  }, [id, passedPatient]);

  const handleAddDisease = () => setDiseases((prev) => [...prev, '']);
  const handleDiseaseChange = (index, value) => {
    const updated = [...diseases];
    updated[index] = value;
    setDiseases(updated);
  };
  const handleRemoveDisease = (index) => setDiseases(diseases.filter((_, i) => i !== index));

  const handleAddMedicine = () => setMedicines((prev) => [...prev, { name: '', dosage: '', frequency: '', duration: '', isIssued: false }]);
  const handleMedicineChange = (index, field, value) => {
    const updated = [...medicines];
    if (updated[index]) {
      updated[index][field] = value;
      setMedicines(updated);
    }
  };
  const handleRemoveMedicine = (index) => setMedicines(medicines.filter((_, i) => i !== index));

  const handleSendToPharmacy = async (e) => {
    e.preventDefault();

    const filledDiseases = diseases.filter(d => d.trim() !== '');
    if (filledDiseases.length === 0) {
      alert('කරුණාකර අවම වශයෙන් එක් ලෙඩ වර්ගයක් / රෝග ලක්ෂණයක්වත් ඇතුළත් කරන්න!');
      return;
    }

    setLoading(true);

    try {
      const formattedDiagnosis = filledDiseases.join(', ');

      const docRef = await addDoc(collection(db, 'pharmacy_prescriptions'), {
        patientId: patient.id || '',
        patientName: patient.name || '',
        diagnosis: formattedDiagnosis,
        diseasesList: filledDiseases,
        medicines: medicines.map(m => ({ ...m, isIssued: false })),
        status: 'Pending',
        createdAt: serverTimestamp(),
      });

      setCurrentPrescriptionId(docRef.id);
      setIsPharmacySent(true);

      const todayDate = new Date().toISOString().split('T')[0];
      
      const formattedMedsList = medicines.map((m) => {
        let text = m.name;
        if (m.dosage) text += ` - ${m.dosage}`;
        if (m.frequency) text += ` (${m.frequency})`;
        if (m.duration) text += ` (${m.duration})`;
        return text;
      });

      const newHistoryItem = {
        date: todayDate,
        diagnosis: formattedDiagnosis,
        medicines: formattedMedsList,
        createdAt: new Date().getTime()
      };

      const targetDocId = patient.docFirestoreId;
      if (targetDocId) {
        const patientRef = doc(db, 'patients', targetDocId);
        await updateDoc(patientRef, {
          history: arrayUnion(newHistoryItem)
        });
      }

      alert(`Step 1 සාර්ථකයි: ${patient.name} ගේ ඖෂධ වට්ටෝරුව Pharmacy වෙත යවන ලදී!`);
    } catch (error) {
      console.error('Firebase Error: ', error);
      alert('දත්ත Firebase වෙත ඇතුළත් කිරීමේදී දෝෂයක් සිදු විය.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendToTicketCounter = async () => {
    if (!nextVisit) {
      alert('කරුණාකර නැවත පැමිණිය යුතු දිනය තෝරන්න!');
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, 'ticket_counter_visits'), {
        patientId: patient.id || '',
        patientName: patient.name || '',
        patientPhone: patient.phone || '',
        nextVisitDate: nextVisit,
        prescriptionId: currentPrescriptionId || '',
        status: 'Scheduled',
        createdAt: serverTimestamp(),
      });

      alert(`Step 2 සාර්ථකයි: නැවත පැමිණෙන දිනය Ticket Counter වෙත යවන ලදී!`);
      navigate('/doctor/todays-patients');
    } catch (error) {
      console.error('Firebase Error: ', error);
      alert('දත්ත ඇතුළත් කිරීමේදී දෝෂයක් සිදු විය.');
    } finally {
      setLoading(false);
    }
  };

  const rawHistory = Array.isArray(patient?.history) ? patient.history : [];
  const historyList = [...rawHistory].reverse(); 
  const latestVisit = historyList.length > 0 ? historyList[0] : null;

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
          <button className="menu-item" onClick={() => navigate('/doctor/dashboard')}>
            <i className="bi bi-house-door-fill"></i> මුල් පිටුව
          </button>
          <button className="menu-item active" onClick={() => navigate('/doctor/todays-patients')}>
            <i className="bi bi-people-fill"></i> අද දින පැමිණි රෝගීන්
          </button>
          <button className="menu-item" onClick={() => navigate('/doctor/treatment-history')}>
            <i className="bi bi-clock-history"></i> ප්‍රතිකාර ඉතිහාසය
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
            <span className="leaf-icon">🍃</span> රෝගී පරීක්ෂාව සහ ප්‍රතිකාර සටහන් කිරීම
          </div>
          <button className="back-btn" onClick={() => navigate('/doctor/todays-patients')}>
            ⬅ ආපසු යන්න
          </button>
        </header>

        <div className="content-inner">
          <div className="patient-info-card">
            {loadingPatient ? (
              <p style={{ padding: '15px', textAlign: 'center' }}>රෝගියාගේ තොරතුරු ලබාගනිමින් පවතී...</p>
            ) : (
              <>
                <div className="patient-header">
                  <div className="patient-main">
                    <span className="patient-badge">{patient.id || id}</span>
                    <h2>{patient.name || 'නොදන්නා රෝගියෙකි'}</h2>
                    <span className="meta-tag">{patient.age ? `${patient.age} වයස` : '-'} | {patient.gender || '-'}</span>
                    <span className="meta-tag">📞 {patient.phone || '-'}</span>
                  </div>
                  <button className="history-btn" onClick={() => setShowHistoryModal(true)}>
                    📜 ප්‍රතිකාර ඉතිහාසය බලන්න ({historyList.length})
                  </button>
                </div>

                <hr className="divider" />

                <div className="latest-visit-section">
                  <h4>
                    <i className="bi bi-calendar-check"></i> අවසාන වරට පැමිණි දිනය සහ දුන් බෙහෙත් (Latest Visit)
                  </h4>
                  {latestVisit ? (
                    <div className="latest-details">
                      <p><strong>පැමිණි දිනය:</strong> {latestVisit.date || '-'}</p>
                      <p><strong>රෝග විනිශ්චය / රෝගය:</strong> {latestVisit.diagnosis || '-'}</p>
                      <p><strong>ලබාදුන් ඖෂධ:</strong></p>
                      <ul className="med-list">
                        {Array.isArray(latestVisit.medicines) ? (
                          latestVisit.medicines.map((med, idx) => <li key={idx}>🌿 {med}</li>)
                        ) : (
                          <li>🌿 {latestVisit.medicines || '-'}</li>
                        )}
                      </ul>
                    </div>
                  ) : (
                    <p className="no-history">පෙර පැමිණීමේ සටහන් නොමැත (නව රෝගියෙකි).</p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className={`consultation-form-card ${isPharmacySent ? 'step-completed' : ''}`}>
            <h3>
              <span className="step-badge">පියවර 1</span> අද දින රෝග විනිශ්චය සහ ඖෂධ නියම කිරීම (Pharmacy)
            </h3>

            <form onSubmit={handleSendToPharmacy}>
              <div className="form-group">
                <label>අද දින රෝග ලක්ෂණ / රෝගය (Diagnosis / Illness Categories)</label>
                {diseases.map((dis, index) => (
                  <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                    <input
                      type="text"
                      list="disease-options"
                      placeholder={`රෝගය ${index + 1} තෝරන්න හෝ ටයිප් කරන්න...`}
                      value={dis}
                      onChange={(e) => handleDiseaseChange(index, e.target.value)}
                      disabled={isPharmacySent || loading}
                      required={index === 0}
                      style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' }}
                    />
                    {!isPharmacySent && diseases.length > 1 && (
                      <button
                        type="button"
                        className="remove-med-btn"
                        onClick={() => handleRemoveDisease(index)}
                        disabled={loading}
                        style={{ padding: '8px 12px' }}
                      >
                        ✖
                      </button>
                    )}
                  </div>
                ))}

                <datalist id="disease-options">
                  {DISEASE_OPTIONS.map((item, idx) => (
                    <option key={idx} value={item} />
                  ))}
                </datalist>

                {!isPharmacySent && (
                  <button
                    type="button"
                    className="add-med-btn"
                    onClick={handleAddDisease}
                    disabled={loading}
                    style={{ marginTop: '5px', backgroundColor: '#e2e8f0', color: '#2d3748', border: '1px solid #cbd5e0' }}
                  >
                    ➕ තවත් ලෙඩ වර්ගයක් එකතු කරන්න
                  </button>
                )}
              </div>

              <div className="form-group" style={{ marginTop: '20px' }}>
                <label>අද දින ලබාදෙන ඖෂධ (Prescription)</label>
                {medicines.map((med, index) => (
                  <div key={index} style={{ marginBottom: '16px', padding: '12px', border: '1px solid #cbd5e0', borderRadius: '8px', backgroundColor: '#fff' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', alignItems: 'center' }}>
                      
                      <div>
                        <input
                          type="text"
                          list={`med-names-${index}`}
                          placeholder="ඖෂධයේ නම"
                          value={med.name}
                          onChange={(e) => handleMedicineChange(index, 'name', e.target.value)}
                          disabled={isPharmacySent || loading}
                          required
                          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                        />
                        <datalist id={`med-names-${index}`}>
                          {MEDICINE_NAMES.map((item, idx) => (
                            <option key={idx} value={item} />
                          ))}
                        </datalist>
                      </div>

                      <div>
                        <input
                          type="text"
                          list={`med-dosages-${index}`}
                          placeholder="මාත්‍රාව"
                          value={med.dosage}
                          onChange={(e) => handleMedicineChange(index, 'dosage', e.target.value)}
                          disabled={isPharmacySent || loading}
                          required
                          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                        />
                        <datalist id={`med-dosages-${index}`}>
                          {DOSAGE_OPTIONS.map((item, idx) => (
                            <option key={idx} value={item} />
                          ))}
                        </datalist>
                      </div>

                      <div>
                        <select
                          value={med.frequency || ''}
                          onChange={(e) => handleMedicineChange(index, 'frequency', e.target.value)}
                          disabled={isPharmacySent || loading}
                          required
                          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff' }}
                        >
                          <option value="">ඖෂධය ලබාදෙන වේලාව තෝරන්න</option>
                          {FREQUENCY_OPTIONS.map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <input
                          type="text"
                          list={`med-durations-${index}`}
                          placeholder="කාලසීමාව"
                          value={med.duration}
                          onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)}
                          disabled={isPharmacySent || loading}
                          required
                          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                        />
                        <datalist id={`med-durations-${index}`}>
                          {DURATION_OPTIONS.map((item, idx) => (
                            <option key={idx} value={item} />
                          ))}
                        </datalist>
                      </div>

                      {!isPharmacySent && medicines.length > 1 && (
                        <button
                          type="button"
                          className="remove-med-btn"
                          onClick={() => handleRemoveMedicine(index)}
                          disabled={loading}
                        >
                          ✖
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {!isPharmacySent && (
                  <button type="button" className="add-med-btn" onClick={handleAddMedicine} disabled={loading}>
                    ➕ තවත් ඖෂධයක් එකතු කරන්න
                  </button>
                )}
              </div>

              {!isPharmacySent ? (
                <div className="form-actions-row">
                  <button type="submit" className="send-pharmacy-btn" disabled={loading}>
                    {loading ? 'Firebase වෙත සුරැකෙමින් පවතී...' : '🏥 ඖෂධාලය (Pharmacy) වෙත යවන්න'}
                  </button>
                </div>
              ) : (
                <div className="status-success-badge">
                  ✅ Firebase සහ Pharmacy වෙත සාර්ථකව යවන ලදී.
                </div>
              )}
            </form>
          </div>

          <div className={`consultation-form-card step-two-card ${!isPharmacySent ? 'step-disabled' : ''}`}>
            <h3>
              <span className="step-badge alt">පියවර 2</span> නැවත පැමිණිය යුතු දිනය නියම කිරීම (Ticket Counter)
            </h3>

            {!isPharmacySent && (
              <p className="step-warning-text">
                ⚠️ මෙම පියවර සක්‍රිය වීමට පළමුව රෝග විනිශ්චය සහ ඖෂධ Pharmacy වෙත යවන්න.
              </p>
            )}

            <div className="form-group inline-group">
              <div className="date-field">
                <label>නැවත පැමිණිය යුතු දිනය (Next Visit Date)</label>
                <input
                  type="date"
                  value={nextVisit}
                  onChange={(e) => setNextVisit(e.target.value)}
                  disabled={!isPharmacySent || loading}
                />
              </div>
            </div>

            <div className="form-actions-row">
              <button
                type="button"
                className="send-ticket-btn"
                onClick={handleSendToTicketCounter}
                disabled={!isPharmacySent || loading}
              >
                {loading ? 'සුරැකෙමින් පවතී...' : '🎟️ නැවත පැමිණෙන දිනය Ticket Counter වෙත යවන්න'}
              </button>
            </div>
          </div>
        </div>
      </main>

      {showHistoryModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>{patient.name} ගේ පෙර ප්‍රතිකාර ඉතිහාසය</h3>
              <button className="close-btn" onClick={() => setShowHistoryModal(false)}>✖</button>
            </div>
            <div className="modal-body">
              {historyList.length > 0 ? (
                historyList.map((item, idx) => (
                  <div key={idx} className="history-item-card" style={{ marginBottom: '15px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                    <div className="history-date" style={{ fontWeight: 'bold', color: '#2b6cb0' }}>📅 දිනය: {item.date || '-'}</div>
                    <p style={{ margin: '5px 0' }}><strong>රෝගී තත්ත්වය:</strong> {item.diagnosis || '-'}</p>
                    <p style={{ margin: '5px 0' }}><strong>දුන් ඖෂධ:</strong></p>
                    <ul style={{ margin: '5px 0 0 20px', padding: 0 }}>
                      {Array.isArray(item.medicines) ? (
                        item.medicines.map((m, mIdx) => <li key={mIdx}>🌿 {m}</li>)
                      ) : (
                        <li>🌿 {item.medicines || '-'}</li>
                      )}
                    </ul>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: 'center', padding: '20px', color: '#718096' }}>
                  පෙර ප්‍රතිකාර ඉතිහාසයක් නොමැත.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
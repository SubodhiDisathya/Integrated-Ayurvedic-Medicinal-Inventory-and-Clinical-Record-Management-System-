import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Firebase Imports
import { db } from '../firebase/firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';

// CSS Files
import './TicketCounter.css';
import './TicketCounter_Registerpatient.css';

// Images
import logoAyurveda from '../assets/logo-top.png';
import cornerLeaves from '../assets/corner-leaves.png';

export default function RegisterPatient() {
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    age: '',
    gender: '',
    contactNumber: '',
    address: ''
  });

  const [loading, setLoading] = useState(false);

  // In-site Highlighting Message State
  const [alertInfo, setAlertInfo] = useState({ message: '', type: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 🔍 දුරකථන අංකයෙන් හෝ සම්පූර්ණ නමින් රෝගියා මීට පෙර ලියාපදිංචි වී ඇත්දැයි පරීක්ෂා කිරීම
  const findExistingPatient = async (contactNo, fullName) => {
    const patientsRef = collection(db, 'patients');
    
    const trimmedContact = contactNo.trim();
    const trimmedName = fullName.trim().toLowerCase();

    // 1. මුලින්ම දුරකථන අංකය මඟින් සෙවීම
    if (trimmedContact) {
      const qContact = query(patientsRef, where('contactNumber', '==', trimmedContact));
      const contactSnap = await getDocs(qContact);
      if (!contactSnap.empty) {
        return contactSnap.docs[0];
      }
    }

    // 2. දුරකථන අංකයෙන් හමු නොවූණහොත්, නම මඟින් සෙවීම
    if (trimmedName) {
      const allPatientsSnap = await getDocs(patientsRef);
      for (const docItem of allPatientsSnap.docs) {
        const data = docItem.data();
        if (data.fullName && data.fullName.trim().toLowerCase() === trimmedName) {
          return docItem;
        }
      }
    }

    return null;
  };

  // Firebase එකට දත්ත Save කර 'visits' වෙත යොමු කිරීම (කලින් නොමැති නම් පමණි)
  const saveAndSendToDoctor = async (e) => {
    e.preventDefault();
    setAlertInfo({ message: '', type: '' });

    if (!formData.fullName || !formData.age || !formData.gender || !formData.contactNumber || !formData.address) {
      setAlertInfo({
        message: 'කරුණාකර සියලුම අනිවාර්ය තොරතුරු ඇතුළත් කරන්න!',
        type: 'error'
      });
      return;
    }

    try {
      setLoading(true);

      // දුරකථන අංකය හෝ නම මඟින් කලින් ලියාපදිංචි වී ඇද්දැයි පරීක්ෂා කරයි
      const existingDoc = await findExistingPatient(formData.contactNumber, formData.fullName);

      if (existingDoc) {
        // රෝගියා දැනටමත් සිටී නම් - දත්ත සුරැකීමෙන් තොරව Error පණිවිඩයක් පෙන්වයි
        setAlertInfo({
          message: 'මෙම රෝගියා මීට පෙර ලියාපදිංචි වී ඇත!',
          type: 'error'
        });
        setLoading(false);
        return;
      }

      // සම්පූර්ණයෙන්ම අලුත් රෝගියෙක් නම් පමණක් ඉදිරියට යයි
      const todayStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      const patientsRef = collection(db, 'patients');
      const qMax = query(patientsRef, orderBy('createdAt', 'desc'), limit(1));
      const maxSnap = await getDocs(qMax);

      let nextIdNumber = 1;
      if (!maxSnap.empty) {
        const lastPatient = maxSnap.docs[0].data();
        if (lastPatient.patientId) {
          const lastNum = parseInt(lastPatient.patientId.replace(/[^0-9]/g, ''), 10);
          if (!isNaN(lastNum)) {
            nextIdNumber = lastNum + 1;
          }
        }
      }

      const targetPatientId = `P${String(nextIdNumber).padStart(3, '0')}`;

      const docRef = await addDoc(collection(db, 'patients'), {
        patientId: targetPatientId,
        fullName: formData.fullName.trim(),
        age: Number(formData.age),
        gender: formData.gender,
        contactNumber: formData.contactNumber.trim(),
        address: formData.address.trim(),
        createdAt: serverTimestamp()
      });
      const patientDocId = docRef.id;

      // වෛද්‍යවරයාගේ පිටුවට දත්ත පෙන්වීම සඳහා 'visits' collection එකට ඇතුළත් කිරීම
      await addDoc(collection(db, 'visits'), {
        patientDocId: patientDocId,
        patientId: targetPatientId,
        fullName: formData.fullName.trim(),
        age: Number(formData.age),
        gender: formData.gender,
        contactNumber: formData.contactNumber.trim(),
        address: formData.address.trim(),
        status: 'පොරොත්තුවෙන්',
        visitDate: todayStr,
        date: todayStr,
        time: timeStr,
        type: 'new',
        createdAt: serverTimestamp()
      });

      setAlertInfo({
        message: `රෝගියා සාර්ථකව අලුතින් ලියාපදිංචි කර වෛද්‍යවරයා වෙත යොමු කරන ලදී! (ලියාපදිංචි අංකය: ${targetPatientId})`,
        type: 'success'
      });

      handleClear(false);

    } catch (error) {
      console.error('Error saving patient:', error);
      setAlertInfo({
        message: 'දත්ත සුරැකීමේදී දෝෂයක් සිදු විය: ' + error.message,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Form එක Reset කිරීම
  const handleClear = (clearAlert = true) => {
    setFormData({
      fullName: '',
      age: '',
      gender: '',
      contactNumber: '',
      address: ''
    });
    if (clearAlert) {
      setAlertInfo({ message: '', type: '' });
    }
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={logoAyurveda} alt="Ayurveda Logo" className="brand-logo" />
          <h2 className="brand-title">ජාතික ආයුර්වේද</h2>
          <p className="brand-subtitle">ඖෂධ තොග හා රෝගීන් සත්කාරක කළමනාකරණය</p>
          <span className="brand-tag">MANAGEMENT SYSTEM</span>
        </div>

        <nav className="sidebar-menu">
          <button className="menu-item" onClick={() => navigate('/ticket-counter')}>
            <i className="bi bi-house-door-fill"></i> මුල් පිටුව
          </button>
          <button className="menu-item active">
            <i className="bi bi-person-plus"></i> රෝගී ලියාපදිංචිය
          </button>
          <button className="menu-item" onClick={() => navigate('/ticket-counter/records')}>
            <i className="bi bi-file-earmark-text"></i> පැරණි රෝගීන් සහ රෝගී වාර්තා
          </button>
        </nav>

        <div className="sidebar-footer-bg">
          <img src={cornerLeaves} alt="" className="leaf-decor" />
        </div>

        <button className="logout-btn" onClick={() => navigate('/')}>
          <i className="bi bi-box-arrow-left"></i> පිටවීම
        </button>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-bar">
          <div className="welcome-msg">
            <span className="leaf-icon">🍃</span> ඔබට සුභ දවසක්!
          </div>
          <div className="top-bar-actions">
            <button className="notification-icon">
              <i className="bi bi-bell"></i>
              <span className="badge">3</span>
            </button>
            <button className="user-profile">
              <i className="bi bi-person-circle"></i>
              <span>පිළිගනිමු</span>
            </button>
          </div>
        </header>

        {/* Registration Form Card */}
        <div className="register-card">
          <div className="register-card-header">
            <h2>
              <i className="bi bi-person-plus-fill"></i> නව රෝගී ලියාපදිංචිය
            </h2>
          </div>

          {/* 🔔 Highlighted Message Banner */}
          {alertInfo.message && (
            <div className={`site-highlight-banner ${alertInfo.type}`}>
              <div className="banner-content">
                <i
                  className={
                    alertInfo.type === 'error'
                      ? 'bi bi-exclamation-triangle-fill'
                      : 'bi bi-check-circle-fill'
                  }
                ></i>
                <span>{alertInfo.message}</span>
              </div>
              <button
                type="button"
                className="close-banner-btn"
                onClick={() => setAlertInfo({ message: '', type: '' })}
              >
                &times;
              </button>
            </div>
          )}

          <form onSubmit={saveAndSendToDoctor} className="register-form">
            {/* සම්පූර්ණ නම */}
            <div className="input-field-group">
              <label>සම්පූර්ණ නම *</label>
              <input
                type="text"
                name="fullName"
                placeholder="රෝගියාගේ නම"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>

            {/* වයස සහ ස්ත්‍රී/පුරුෂ භාවය */}
            <div className="input-row">
              <div className="input-field-group">
                <label>වයස *</label>
                <input
                  type="number"
                  name="age"
                  placeholder="වයස"
                  value={formData.age}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="input-field-group">
                <label>ස්ත්‍රී පුරුෂ භාවය *</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                >
                  <option value="">තෝරන්න</option>
                  <option value="male">පුරුෂ</option>
                  <option value="female">ස්ත්‍රී</option>
                  <option value="other">වෙනත්</option>
                </select>
              </div>
            </div>

            {/* සම්බන්ධතා අංකය */}
            <div className="input-field-group">
              <label>දුරකථන අංකය *</label>
              <input
                type="tel"
                name="contactNumber"
                placeholder="077XXXXXXX"
                value={formData.contactNumber}
                onChange={handleChange}
                required
              />
            </div>

            {/* ලිපිනය */}
            <div className="input-field-group">
              <label>ලිපිනය *</label>
              <input
                type="text"
                name="address"
                placeholder="නගරය, දිස්ත්‍රික්කය"
                value={formData.address}
                onChange={handleChange}
                required
              />
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button type="submit" className="btn-save" disabled={loading}>
                <i className="bi bi-check-lg"></i>{' '}
                {loading
                  ? 'පරීක්ෂා කරමින්...'
                  : 'රෝගියා සුරකින්න සහ වෛද්‍යවරයා වෙත යවන්න'}
              </button>

              <button
                type="button"
                className="btn-clear"
                onClick={() => handleClear(true)}
                disabled={loading}
              >
                <i className="bi bi-x-circle"></i> අස් කරන්න
              </button>
            </div>
          </form>
        </div>

        <footer className="dashboard-footer">
          <p>“ආයුර්වේදය සුවදිවියයි මඟ”</p>
        </footer>
      </main>
    </div>
  );
}
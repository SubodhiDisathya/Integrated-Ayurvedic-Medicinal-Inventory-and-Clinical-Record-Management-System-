import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Firebase Imports
import { db } from '../firebase/firebase';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';

// CSS Files
import './TicketCounter.css';
import './TicketCounter_Patientrecords.css';

// Images
import logoAyurveda from '../assets/logo-top.png';
import cornerLeaves from '../assets/corner-leaves.png';
import heroBanner from '../assets/banner-hero.jpeg';

export default function PatientRecords() {
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState(null);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      
      const q = query(collection(db, 'patients'), orderBy('createdAt', 'desc'));
      
      let querySnapshot;
      try {
        querySnapshot = await getDocs(q);
      } catch (err) {
        console.warn('orderBy createdAt failed, fetching standard collection:', err);
        querySnapshot = await getDocs(collection(db, 'patients'));
      }

      const patientsData = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() || {};

        let formattedDate = 'N/A';
        try {
          if (data.createdAt && typeof data.createdAt.toDate === 'function') {
            formattedDate = data.createdAt.toDate().toISOString().split('T')[0];
          } else if (data.createdAt) {
            formattedDate = String(data.createdAt);
          } else {
            formattedDate = new Date().toISOString().split('T')[0];
          }
        } catch (e) { 
          formattedDate = 'N/A';
        }

        // Gender mapping: Display 'පුරුෂ' and 'ස්ත්‍රී'
        let genderDisplay = 'වෙනත්';
        if (
          data.gender === 'male' || 
          data.gender === 'පුරුෂ' || 
          data.gender === 'පිරිමි'
        ) {
          genderDisplay = 'පුරුෂ';
        } else if (
          data.gender === 'female' || 
          data.gender === 'ස්ත්‍රී' || 
          data.gender === 'ගෑනු' || 
          data.gender === 'ගැහැණු' || 
          data.gender === 'කාන්තා'
        ) {
          genderDisplay = 'ස්ත්‍රී';
        }

        patientsData.push({
          id: docSnap.id,
          patientId: data.patientId || docSnap.id,
          fullName: data.fullName || 'නමක් සඳහන් කර නැත',
          age: data.age || '-',
          gender: genderDisplay,
          contactNumber: data.contactNumber || 'N/A',
          lastVisit: formattedDate,
          status: data.status || 'Registered',
          createdAt: data.createdAt
        });
      });

      patientsData.sort((a, b) => {
        if (a.patientId && b.patientId) {
          return a.patientId.localeCompare(b.patientId, undefined, { numeric: true, sensitivity: 'base' });
        }
        return 0;
      });

      setPatients(patientsData);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendToDoctor = async (patient) => {
    try {
      setSendingId(patient.id);
      
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      await addDoc(collection(db, 'visits'), {
        patientDocId: patient.id,
        patientId: patient.patientId,
        fullName: patient.fullName,
        age: patient.age,
        gender: patient.gender,
        contactNumber: patient.contactNumber,
        type: 'returning',
        status: 'පොරොත්තුවෙන්',
        date: todayStr,
        visitDate: todayStr,
        time: timeStr,
        createdAt: serverTimestamp()
      });

      alert(`${patient.fullName} සාර්ථකව වෛද්‍යවරයා වෙත යොමු කරන ලදී!`);
    } catch (error) {
      console.error('Error sending patient to doctor:', error);
      alert('වෛද්‍යවරයා වෙත යොමු කිරීමට අපොහොසත් විය. නැවත උත්සාහ කරන්න.');
    } finally {
      setSendingId(null);
    }
  };

  const filteredPatients = patients.filter((patient) => {
    const rawSearch = searchTerm.trim().toLowerCase();
    if (!rawSearch) return true;

    const name = (patient.fullName || '').toLowerCase();
    const pId = (patient.patientId || '').toLowerCase();
    const phone = (patient.contactNumber || '').toString();

    return (
      name.includes(rawSearch) ||
      pId.includes(rawSearch) ||
      phone.includes(rawSearch)
    );
  });

  return (
    <div className="dashboard-container">
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
          <button className="menu-item" onClick={() => navigate('/ticket-counter/register-patient')}>
            <i className="bi bi-person-plus"></i> රෝගී ලියාපදිංචිය
          </button>
          <button className="menu-item active">
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

        <div className="content-inner">
          <div className="hero-banner-container">
            <img src={heroBanner} alt="Ayurveda Banner" className="hero-banner-img" />
            <div className="hero-overlay-card">
              <h1 className="hero-title">ප්‍රවේශපත්‍ර කවුන්ටරය</h1>
              <p className="hero-subtext">සුවය සුරකිමු, ජීවිතය සවිමත් කරමු</p>
              <p className="hero-tagline">ආයුර්වේද සුවය ඔබේ ළඟට</p>
            </div>
          </div>

          <div className="records-container-card">
            <div className="records-header">
              <h3><span>|</span> රෝගී වාර්තා</h3>
            </div>

            <div className="search-bar-box">
              <i className="bi bi-search search-icon"></i>
              <input
                type="text"
                placeholder="රෝගී ID, නම හෝ දුරකථන අංකය මගින් සොයන්න..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="table-responsive">
              <table className="patients-table">
                <thead>
                  <tr>
                    <th>රෝගී ID</th>
                    <th>නම</th>
                    <th>වයස</th>
                    <th>ස්ත්‍රී/පුරුෂ</th>
                    <th>දුරකථනය</th>
                    <th>අවසාන දිනය</th>
                    <th>ක්‍රියා</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '25px' }}>
                        දත්ත පූරණය වෙමින් පවතී...
                      </td>
                    </tr>
                  ) : filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '25px', color: '#888' }}>
                        "{searchTerm}" සඳහා කිසිදු රෝගී වාර්තාවක් හමු නොවීය.
                      </td>
                    </tr>
                  ) : (
                    filteredPatients.map((patient) => (
                      <tr key={patient.id}>
                        <td className="patient-id">{patient.patientId}</td>
                        <td className="patient-name">{patient.fullName}</td>
                        <td>{patient.age}</td>
                        <td>
                          <span className={`gender-badge ${patient.gender === 'පුරුෂ' ? 'male' : 'female'}`}>
                            {patient.gender}
                          </span>
                        </td>
                        <td>{patient.contactNumber}</td>
                        <td>{patient.lastVisit}</td>
                        <td className="action-cell">
                          <button
                            className="btn-queue"
                            onClick={() => handleSendToDoctor(patient)}
                            disabled={sendingId === patient.id}
                            title="වෛද්‍යවරයා වෙත යවන්න"
                          >
                            <i className="bi bi-person-check-fill" style={{ marginRight: '5px' }}></i>
                            {sendingId === patient.id ? 'යවමින්...' : 'වෛද්‍යවරයාට යවන්න'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
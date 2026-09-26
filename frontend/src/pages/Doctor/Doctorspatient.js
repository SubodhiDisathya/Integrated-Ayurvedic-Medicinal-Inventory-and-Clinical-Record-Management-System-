import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Firebase Import
import { db } from '../../firebase/firebase';
import { collection, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore';

// CSS Import
import './Doctorspatient.css';

// Asset Imports
import logoEmblem from '../../assets/logo-top.png';
import cornerLeaves from '../../assets/corner-leaves.png';

export default function Doctorspatient() {
  const navigate = useNavigate();

  // Active Tab: 'all', 'new', 'returning'
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const todayStr = new Date().toISOString().split('T')[0];

    // today's visits query
    const q = query(
      collection(db, 'visits'),
      where('visitDate', '==', todayStr)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const fetchedList = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() || {};

          let formattedTime = 'N/A';
          if (data.time) {
            formattedTime = data.time;
          } else if (data.createdAt && typeof data.createdAt.toDate === 'function') {
            formattedTime = data.createdAt.toDate().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            });
          }

          return {
            docId: docSnap.id,
            patientDocId: data.patientDocId || docSnap.id,
            id: data.patientId || docSnap.id,
            name: data.fullName || data.name || 'නමක් නැත',
            age: data.age || '-',
            gender:
              data.gender === 'male' || data.gender === 'පුරුෂ' || data.gender === 'පිරිමි' ? 'පුරුෂ'
              : data.gender === 'female' || data.gender === 'ස්ත්‍රී' || data.gender === 'ගෑනු' ? 'ස්ත්‍රී'
              : data.gender || '-',
            phone: data.contactNumber || data.phone || 'N/A',
            type: data.type || 'new',
            time: formattedTime,
            date: data.visitDate || data.date || todayStr,
            status: data.status || 'පොරොත්තුවෙන්', // 'පොරොත්තුවෙන්' හෝ 'අවසන්'
            history: data.history || []
          };
        });

        fetchedList.sort((a, b) => (b.time > a.time ? 1 : -1));

        setPatients(fetchedList);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading today visits for doctor:', error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Checkbox toggle function to mark as completed/pending in Firestore
  const handleToggleStatus = async (visitDocId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'අවසන්' ? 'පොරොත්තුවෙන්' : 'අවසන්';
      const visitRef = doc(db, 'visits', visitDocId);
      await updateDoc(visitRef, {
        status: newStatus
      });
    } catch (error) {
      console.error('Error updating patient visit status:', error);
      alert('තත්ත්වය වෙනස් කිරීමට නොහැකි විය. නැවත උත්සාහ කරන්න.');
    }
  };

  // Filter Logic
  const filteredPatients = patients.filter((patient) => {
    const matchesTab =
      activeTab === 'all' ? true : patient.type === activeTab;

    const rawSearch = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !rawSearch ||
      (patient.name && patient.name.toLowerCase().includes(rawSearch)) ||
      (patient.id && patient.id.toLowerCase().includes(rawSearch)) ||
      (patient.phone && patient.phone.toString().includes(rawSearch));

    return matchesTab && matchesSearch;
  });

  const newCount = patients.filter((p) => p.type === 'new').length;
  const returningCount = patients.filter((p) => p.type === 'returning').length;

  const handleConsultClick = (patientItem) => {
    const pId = patientItem.id || patientItem.docId;

    navigate(`/doctor/consultation/${pId}`, {
      state: {
        patient: {
          id: pId,
          docId: patientItem.docId,
          patientDocId: patientItem.patientDocId,
          name: patientItem.name || '',
          age: patientItem.age || '',
          gender: patientItem.gender || '',
          phone: patientItem.phone || '',
          history: patientItem.history || [],
        },
      },
    });
  };

  return (
    <div className="doctor-container">
      <aside className="doctor-sidebar">
        <div className="sidebar-brand">
          <img src={logoEmblem} alt="Sri Lanka Emblem" className="brand-logo" />
          <h2 className="brand-title">ජාතික ආයුර්වේද</h2>
          <p className="brand-subtitle">ඖෂධ තොග හා රෝගීන් සත්කාරක කළමනාකරණය</p>
          <span className="brand-tag">MANAGEMENT SYSTEM</span>
        </div>

        <nav className="sidebar-menu" aria-label="වෛද්‍ය මෙනුව">
          <button className="menu-item" onClick={() => navigate('/doctor/dashboard')}>
            <i className="bi bi-house-door-fill"></i> මුල් පිටුව
          </button>

          <button className="menu-item active">
            <i className="bi bi-people-fill"></i> අද දින පැමිණි රෝගීන්
          </button>

          <button
            className="menu-item"
            onClick={() => navigate('/doctor/treatment-history')}
          >
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
            <span className="leaf-icon">🍃</span> අද දින පැමිණි රෝගීන් ලේඛනය
          </div>
          <div className="top-bar-actions">
            <button className="notification-icon">
              <i className="bi bi-bell"></i>
              <span className="badge">{patients.length}</span>
            </button>
            <button className="user-profile">
              <i className="bi bi-person-circle"></i>
              <span>පිළිගනිමු</span>
            </button>
          </div>
        </header>

        <div className="content-inner">
          <div className="patients-header-card">
            <div className="header-left">
              <h2><span className="bar-icon">|</span> අද දින රෝගීන්</h2>
              <p>අද දින පැමිණි නව සහ පෙර ලියාපදිංචි වූ රෝගීන්ගේ ලැයිස්තුව</p>
            </div>

            <div className="search-box">
              <i className="bi bi-search"></i>
              <input
                type="text"
                placeholder="නම, අංකය හෝ දුරකථන අංකයෙන් සොයන්න..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="filter-tabs-container">
            <button
              className={`filter-tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              සියලුම රෝගීන් <span className="tab-badge">{patients.length}</span>
            </button>

            <button
              className={`filter-tab new-tab ${activeTab === 'new' ? 'active' : ''}`}
              onClick={() => setActiveTab('new')}
            >
              <i className="bi bi-person-plus-fill"></i> අද පැමිණි නව රෝගීන්
              <span className="tab-badge green">{newCount}</span>
            </button>

            <button
              className={`filter-tab returning-tab ${activeTab === 'returning' ? 'active' : ''}`}
              onClick={() => setActiveTab('returning')}
            >
              <i className="bi bi-arrow-repeat"></i> පෙර පැමිණි රෝගීන්
              <span className="tab-badge blue">{returningCount}</span>
            </button>
          </div>

          <div className="table-card">
            <table className="patients-table">
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>ලබාදී ඇත</th>
                  <th>රෝගී අංකය</th>
                  <th>රෝගියාගේ නම</th>
                  <th>වයස / ලිංගය</th>
                  <th>දුරකථන අංකය</th>
                  <th>ලියාපදිංචි වර්ගය</th>
                  <th>පැමිණි වේලාව</th>
                  <th>දිනය</th>
                  <th>ක්‍රියාමාර්ග</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="no-data">
                      දත්ත පූරණය වෙමින් පවතී...
                    </td>
                  </tr>
                ) : filteredPatients.length > 0 ? (
                  filteredPatients.map((patient) => {
                    const isCompleted = patient.status === 'අවසන්';
                    return (
                      <tr key={patient.docId} style={{ opacity: isCompleted ? 0.6 : 1 }}>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            checked={isCompleted}
                            onChange={() => handleToggleStatus(patient.docId, patient.status)}
                            title={isCompleted ? "ලබාදී නැත ලෙස වෙනස් කරන්න" : "ඖෂධ/පරීක්ෂා ලබාදී අවසන් ලෙස සටහන් කරන්න"}
                          />
                        </td>
                        <td className="patient-id" style={{ textDecoration: isCompleted ? 'line-through' : 'none' }}>
                          {patient.id}
                        </td>
                        <td className="patient-name" style={{ textDecoration: isCompleted ? 'line-through' : 'none' }}>
                          {patient.name}
                        </td>
                        <td>{patient.age} / {patient.gender}</td>
                        <td>{patient.phone}</td>
                        <td>
                          {patient.type === 'returning' ? (
                            <span className="type-badge returning">පෙර ලියාපදිංචි</span>
                          ) : (
                            <span className="type-badge new">නව රෝගී</span>
                          )}
                        </td>
                        <td>{patient.time}</td>
                        <td>
                          <span className="date-tag">
                            {patient.date}
                          </span>
                        </td>
                        <td>
                          <button
                            className="consult-btn"
                            onClick={() => handleConsultClick(patient)}
                          >
                            {isCompleted ? 'නැවත බලන්න' : 'පරීක්ෂා කරන්න'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="9" className="no-data">
                      {searchTerm ? `"${searchTerm}" සඳහා රෝගීන් හමු නොවීය.` : 'අද දින සඳහා තවමත් රෝගීන් යොමු කර නොමැත.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
import React, { useState, useEffect } from 'react';

// Firebase Import
import { db } from '../../firebase/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import SidebarDoc from '../../components/SidebarDoctor';

// CSS Import
import './Treatmenthistory.css';

export default function Treatmenthistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'patients'));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            docId: docSnap.id,
            patientId: data.patientId || docSnap.id,
            fullName: data.fullName || data.name || 'නමක් නැත',
            age: data.age || '-',
            gender: data.gender === 'male' || data.gender === 'පුරුෂ' ? 'පුරුෂ' : 'ස්ත්‍රී',
            phone: data.contactNumber || data.phone || '-',
            allergies: data.allergies || 'අසාත්මිකතා සටහන් වී නොමැත',
            history: Array.isArray(data.history) ? data.history : [],
          };
        });

        setPatients(fetched);

        setSelectedPatient((prevSelected) => {
          if (!prevSelected && fetched.length > 0) {
            return fetched[0];
          }
          return prevSelected;
        });

        setLoading(false);
      },
      (error) => {
        console.error('Error fetching treatment history:', error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Search filter
  const filteredPatients = patients.filter((p) => {
    const term = searchTerm.trim().toLowerCase();
    return (
      !term ||
      p.fullName.toLowerCase().includes(term) ||
      p.patientId.toLowerCase().includes(term) ||
      p.phone.includes(term)
    );
  });

  // Date Range filter
  const getFilteredHistory = () => {
    if (!selectedPatient || !selectedPatient.history) return [];
    return selectedPatient.history.filter((item) => {
      if (!item.date) return true;
      if (startDate && item.date < startDate) return false;
      if (endDate && item.date > endDate) return false;
      return true;
    });
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="th-container">
      <SidebarDoc className="doctor-shared-sidebar-fixed th-sidebar no-print" />

      {/* Main Content Area */}
      <main className="th-main">
        <header className="top-bar no-print">
          <div className="welcome-msg">
            <span className="leaf-icon">🍃</span> ප්‍රතිකාර ඉතිහාසය සහ වාර්තා සෙවීම
          </div>
        </header>

        <div className="th-content">
          {/* Left Panel: Search & Select Patient */}
          <div className="th-left-panel no-print">
            <h3>🔍 රෝගියා තෝරන්න</h3>
            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder="නම / අංකය / දුරකථනය..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="patient-scroll-list">
              {loading ? (
                <p className="status-text">දත්ත පූරණය වෙමින්...</p>
              ) : filteredPatients.length > 0 ? (
                filteredPatients.map((p) => (
                  <div
                    key={p.docId}
                    className={`patient-card-item ${selectedPatient?.docId === p.docId ? 'selected' : ''}`}
                    onClick={() => setSelectedPatient(p)}
                  >
                    <div className="p-name">{p.fullName}</div>
                    <div className="p-details">
                      අංකය: <strong>{p.patientId}</strong> | {p.phone}
                    </div>
                  </div>
                ))
              ) : (
                <p className="status-text">රෝගීන් හමු නොවීය.</p>
              )}
            </div>
          </div>

          {/* Right Panel: Medical Timeline & Report */}
          <div className="th-right-panel printable-area">
            {selectedPatient ? (
              <>
                {/* Header */}
                <div className="patient-header-banner">
                  <div>
                    <h2 className="p-title">{selectedPatient.fullName}</h2>
                    <p className="p-sub-info">
                      ලියාපදිංචි අංකය: <strong>{selectedPatient.patientId}</strong> | වයස: {selectedPatient.age} | ලිංගය: {selectedPatient.gender} | දුරකථනය: {selectedPatient.phone}
                    </p>
                    <p className="allergy-alert">
                      ⚠️ අසාත්මිකතා (Allergies): {selectedPatient.allergies}
                    </p>
                  </div>

                  <button className="print-btn no-print" onClick={handlePrintReport}>
                    <i className="bi bi-printer-fill"></i> වාර්තාව Print කරන්න
                  </button>
                </div>

                {/* Date Filter Bar */}
                <div className="date-filter-bar no-print">
                  <span className="filter-label">🗓️ දින පරාසය අනුව Filter කරන්න:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <span>සිට</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                  {(startDate || endDate) && (
                    <button className="clear-btn" onClick={() => { setStartDate(''); setEndDate(''); }}>
                      Clear
                    </button>
                  )}
                </div>

                {/* Timeline History */}
                <h3 className="section-title">
                  📋 පසුගිය ප්‍රතිකාර සටහන් ({getFilteredHistory().length})
                </h3>

                {getFilteredHistory().length > 0 ? (
                  <div className="timeline-wrapper">
                    {[...getFilteredHistory()].reverse().map((record, index) => (
                      <div key={index} className="timeline-card">
                        <div className="card-top-date">
                          📅 දිනය: {record.date || 'දක්වා නැත'}
                        </div>
                        <p className="record-diagnosis">
                          <strong>රෝග විනිශ්චය / ලක්ෂණ:</strong> {record.diagnosis || '-'}
                        </p>
                        <p className="med-title">
                          <strong>ලබාදුන් ඖෂධ:</strong>
                        </p>
                        <ul className="med-list">
                          {Array.isArray(record.medicines) ? (
                            record.medicines.map((m, mIdx) => (
                              <li key={mIdx}>
                                🌿 {typeof m === 'object' ? `${m.name} ${m.dosage ? `(${m.dosage})` : ''}` : m}
                              </li>
                            ))
                          ) : (
                            <li>🌿 {record.medicines || '-'}</li>
                          )}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-data-box">
                    තෝරාගත් දින පරාසය සඳහා ප්‍රතිකාර සටහන් නොමැත.
                  </div>
                )}
              </>
            ) : (
              <p className="no-selection-msg">
                වම්පසින් රෝගියෙකු තෝරන්න.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
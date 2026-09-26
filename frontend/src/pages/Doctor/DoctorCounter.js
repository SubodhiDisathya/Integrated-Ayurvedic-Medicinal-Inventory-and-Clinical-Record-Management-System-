import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Firebase Imports
import { db } from '../../firebase/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

// CSS File Import
import './DoctorCounter.css';

// Asset Imports
import logoEmblem from '../../assets/logo-top.png';
import cornerLeaves from '../../assets/corner-leaves.png';
import heroBanner from '../../assets/ayurvedicdoctor.jpg';

export default function DoctorCounter() {
  const navigate = useNavigate();

  // State for Doctor Dashboard Stats
  const [stats, setStats] = useState({
    todayVisits: 0,
    treatmentsCount: 0,
    consultationsCount: 0,
  });

  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    // Real-time listener for today's visits / doctor consultations
    const visitsUnsub = onSnapshot(
      collection(db, 'visits'),
      (snapshot) => {
        let todayVisitsCount = 0;
        let consultedCount = 0;

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          let visitDate = '';

          if (data.visitDate && typeof data.visitDate.toDate === 'function') {
            visitDate = data.visitDate.toDate().toISOString().split('T')[0];
          } else if (data.visitDate) {
            visitDate = String(data.visitDate).split('T')[0];
          } else if (data.createdAt && typeof data.createdAt.toDate === 'function') {
            visitDate = data.createdAt.toDate().toISOString().split('T')[0];
          }

          if (visitDate === todayStr) {
            todayVisitsCount++;
            if (data.status === 'Completed' || data.status === 'සාකච්ඡා සම්පූර්ණ') {
              consultedCount++;
            }
          }
        });

        setStats((prev) => ({
          ...prev,
          todayVisits: todayVisitsCount,
          consultationsCount: consultedCount,
        }));
      },
      (error) => console.error('Error fetching doctor visits:', error)
    );

    return () => visitsUnsub();
  }, []);

  return (
    <div className="doctor-container">
      {/* --- Left Sidebar Navigation --- */}
      <aside className="doctor-sidebar">
        <div className="sidebar-brand">
          <img src={logoEmblem} alt="Sri Lanka Emblem" className="brand-logo" />
          <h2 className="brand-title">ජාතික ආයුර්වේද</h2>
          <p className="brand-subtitle">ඖෂධ තොග හා රෝගීන් සත්කාරක කළමනාකරණය</p>
          <span className="brand-tag">MANAGEMENT SYSTEM</span>
        </div>

        <nav className="sidebar-menu" aria-label="වෛද්‍ය මෙනුව">
          <button className="menu-item active">
            <i className="bi bi-house-door-fill"></i> මුල් පිටුව
          </button>

          <button
            className="menu-item"
            onClick={() => navigate('/doctor/todays-patients')}
          >
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

      {/* --- Main Content Area --- */}
      <main className="doctor-main">
        {/* Top Header Bar */}
        <header className="top-bar">
          <div className="welcome-msg">
            <span className="leaf-icon">🍃</span> ඔබට සුභ දවසක්!
          </div>
          <div className="top-bar-actions">
            <button className="notification-icon" aria-label="දැනුම්දීම්">
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
          {/* --- Wide Hero Banner Section --- */}
          <div className="hero-banner-container">
            <img src={heroBanner} alt="Ayurveda Banner" className="hero-banner-img" />
            <div className="hero-overlay-card">
              <h1 className="hero-title">වෛද්‍ය පුවරුව</h1>
              <p className="hero-subtext">රෝගී සාකච්ඡාව & ප්‍රතිකාර නිර්දේශ</p>
              <p className="hero-tagline">ආයුර්වේද සුවය ඔබේ ළඟට</p>
            </div>
          </div>

          {/* Stats Cards Section */}
          <section className="stats-grid-doctor">
            <div className="stat-card">
              <div className="stat-number">{stats.treatmentsCount || 2}</div>
              <div className="stat-info">
                <h4>ප්‍රතිකාර ලේඛනය</h4>
                <p>ලේඛනය</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-number">{stats.consultationsCount || 8}</div>
              <div className="stat-info">
                <h4>අද සාකච්ඡා</h4>
                <p>සම්පූර්ණ</p>
              </div>
            </div>
          </section>

          {/* Lower Grid (Quick Actions & Summary) */}
          <section className="lower-grid-doctor">
            {/* Quick Actions */}
            <div className="card-box quick-actions-box">
              <h3><span className="bar-icon">|</span> ඉක්මන් ක්‍රියා</h3>
              <div className="actions-list">
                <button
                  className="quick-action-btn beige"
                  onClick={() => navigate('/doctor/treatment-history')}
                >
                  <i className="bi bi-clock-history"></i> ප්‍රතිකාර ඉතිහාසය
                </button>

                {/* නව බොත්තම 1: බෙහෙත් කවුන්ටරයට යැවීම */}
                <button
                  className="quick-action-btn green"
                  onClick={() => navigate('/doctor/send-to-dispensary')}
                >
                  <i className="bi bi-capsule"></i> බෙහෙත් කවුන්ටරයට යැවීම
                </button>

                {/* නව බොත්තම 2: ප්‍රවේශ පත්‍රයට යැවීම */}
                <button
                  className="quick-action-btn blue"
                  onClick={() => navigate('/doctor/send-to-admission')}
                >
                  <i className="bi bi-file-earmark-plus"></i> ප්‍රවේශ පත්‍රයට යැවීම
                </button>
              </div>
            </div>

            {/* Today Summary */}
            <div className="card-box summary-box">
              <h3><span className="bar-icon">|</span> අද සාරාංශය</h3>
              <ul className="summary-items">
                <li>
                  <span>සාකච්ඡා සම්පූර්ණ</span>
                  <strong className="count">{stats.consultationsCount || 8}</strong>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
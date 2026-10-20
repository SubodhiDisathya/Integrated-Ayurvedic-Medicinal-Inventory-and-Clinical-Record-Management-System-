import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Firebase Imports
import { db } from '../../firebase/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

// Component Import
import SidebarPhar from '../../components/Sidebar_phar';

// CSS File Import
import './PharmacyDashboard.css';

// Asset Imports
import heroBanner from '../../assets/Medicine.jpg';

export default function PharmacyDashboard() {
  const navigate = useNavigate();

  // State for Pharmacy Dashboard Stats
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockCount: 0,
    reportsCount: 2,
    todayIssued: 2,
  });

  useEffect(() => {
    // Real-time listener for inventory items from Firestore
    const inventoryUnsub = onSnapshot(
      collection(db, 'medicines'),
      (snapshot) => {
        let total = 0;
        let lowStock = 0;

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          total++;
          const qty = Number(data.quantity || data.stock || 0);
          const threshold = Number(data.threshold || 10);
          
          if (qty <= threshold) {
            lowStock++;
          }
        });

        setStats((prev) => ({
          ...prev,
          totalItems: total || 8,
          lowStockCount: lowStock || 4,
        }));
      },
      (error) => console.error('Error fetching inventory stats:', error)
    );

    return () => inventoryUnsub();
  }, []);

  return (
    <div className="doctor-container">
      {/* --- Left Sidebar Navigation (Modular Component) --- */}
      <SidebarPhar />

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
              <h1 className="hero-title">ෆාමසි පුවරුව</h1>
              <p className="hero-subtext">ඖෂධ තොග කළමනාකරණය සහ නිකුත් කිරීම</p>
              <p className="hero-tagline">ආයුර්වේද සුවය ඔබේ ළඟට</p>
            </div>
          </div>

          {/* Stats Cards Section */}
          <section className="stats-grid-doctor">
            <div className="stat-card">
              <div className="stat-number">{stats.totalItems || 8}</div>
              <div className="stat-info">
                <h4>සම්පූර්ණ ඖෂධ</h4>
                <p>ඉන්වෙන්ටරිය</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-number" style={{ color: '#d97706' }}>{stats.lowStockCount || 4}</div>
              <div className="stat-info">
                <h4>අඩු තොග අනතුරු</h4>
                <p>අවධානය පිණිස</p>
              </div>
            </div>
          </section>

          {/* Lower Grid (Quick Actions & Summary) */}
          <section className="lower-grid-doctor">
            <div className="card-box quick-actions-box">
              <h3><span className="bar-icon">|</span> ඉක්මන් ක්‍රියා</h3>
              <div className="actions-list">
                <button
                  className="quick-action-btn beige"
                  onClick={() => navigate('/pharmacy/inventory')}
                >
                  <i className="bi bi-box-seam"></i> ඖෂධ ඉන්වෙන්ටරිය බැලීම
                </button>

                <button
                  className="quick-action-btn green"
                  onClick={() => navigate('/pharmacy/issue')}
                >
                  <i className="bi bi-arrow-up-right-square"></i> ඖෂධ නිකුත් කිරීම
                </button>
              </div>
            </div>

            <div className="card-box summary-box">
              <h3><span className="bar-icon">|</span> ඉන්වෙන්ටරි සාරාංශය</h3>
              <ul className="summary-items">
                <li>
                  <span>අද දින නිකුත් කළ වට්ටෝරු</span>
                  <strong className="count">{stats.todayIssued || 2}</strong>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
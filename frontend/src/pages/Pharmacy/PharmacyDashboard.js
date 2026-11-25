import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Firebase Imports
import { db } from '../../firebase/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { getLowStockRows } from '../../utils/inventoryStock';

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
    pendingSupplyRequests: 0,
    reportsCount: 0,
    todayIssued: 0,
  });

  useEffect(() => {
    // Real-time listener for inventory items from Firestore
    const inventoryUnsub = onSnapshot(
      collection(db, 'inventory'),
      (snapshot) => {
        let total = 0;
        let lowStock = 0;

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          total++;
          lowStock += getLowStockRows(data).length;
        });

        setStats((prev) => ({
          ...prev,
          totalItems: total,
          lowStockCount: lowStock,
        }));
      },
      (error) => console.error('Error fetching inventory stats:', error)
    );

    const supplyRequestUnsub = onSnapshot(
      collection(db, 'low_stock_requests'),
      (snapshot) => {
        const pending = snapshot.docs.filter((requestDoc) =>
          requestDoc.data().status !== 'approved'
        ).length;
        setStats((prev) => ({ ...prev, pendingSupplyRequests: pending }));
      },
      (error) => console.error('Error fetching supply requests:', error)
    );

    const prescriptionsUnsub = onSnapshot(
      collection(db, 'pharmacy_prescriptions'),
      (snapshot) => {
        const today = new Date();
        let todayIssuedCount = 0;
        snapshot.forEach((prescriptionDoc) => {
          const data = prescriptionDoc.data();
          let prescriptionDate = null;
          if (data.updatedAt?.toDate) prescriptionDate = data.updatedAt.toDate();
          else if (data.createdAt?.toDate) prescriptionDate = data.createdAt.toDate();
          else if (data.updatedAt) prescriptionDate = new Date(data.updatedAt);
          else if (data.createdAt) prescriptionDate = new Date(data.createdAt);
          const isToday = prescriptionDate &&
            prescriptionDate.getDate() === today.getDate() &&
            prescriptionDate.getMonth() === today.getMonth() &&
            prescriptionDate.getFullYear() === today.getFullYear();
          if (isToday && (data.status === 'Completed' || data.status === 'Issued')) {
            todayIssuedCount++;
          }
        });
        setStats((prev) => ({ ...prev, todayIssued: todayIssuedCount }));
      },
      (error) => console.error('Error fetching pharmacy prescriptions:', error)
    );

    return () => {
      inventoryUnsub();
      supplyRequestUnsub();
      prescriptionsUnsub();
    };
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
            <button
              className="notification-icon"
              aria-label="දැනුම්දීම්"
              onClick={() => navigate('/pharmacy/low-stock')}
            >
              <i className="bi bi-bell"></i>
              {stats.lowStockCount > 0 && (
                <span className="badge">{stats.lowStockCount}</span>
              )}
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
              <div className="stat-number">{stats.totalItems}</div>
              <div className="stat-info">
                <h4>සම්පූර්ණ ඖෂධ</h4>
                <p>ඉන්වෙන්ටරිය</p>
              </div>
            </div>

            <div className="stat-card">
              <div
                className="stat-number"
                style={{ color: '#d97706', cursor: 'pointer' }}
                onClick={() => navigate('/pharmacy/low-stock')}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') navigate('/pharmacy/low-stock');
                }}
              >
                {stats.lowStockCount}
              </div>
              <div className="stat-info">
                <h4>අඩු තොග අනතුරු</h4>
                <p>අවධානය පිණිස</p>
              </div>
            </div>

            <div className="stat-card">
              <div
                className="stat-number"
                style={{ color: '#2563eb', cursor: 'pointer' }}
                onClick={() => navigate('/admin')}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') navigate('/admin');
                }}
              >
                {stats.pendingSupplyRequests}
              </div>
              <div className="stat-info">
                <h4>පරිපාලක බලාපොරොත්තු ඉල්ලීම්</h4>
                <p>සැපයුම් අනුමැතිය</p>
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
                  <strong className="count">{stats.todayIssued}</strong>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Doctor.css';

const Doctor = () => {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState('dashboard');

  return (
    <div className="doctor-container">

      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Ayurvedic Management System</h2>
          <p>Doctor</p>
        </div>

        <ul className="sidebar-menu">
          <li className={activePage === 'dashboard' ? 'active' : ''}
            onClick={() => setActivePage('dashboard')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
            Dashboard
          </li>
          <li className={activePage === 'queue' ? 'active' : ''}
            onClick={() => setActivePage('queue')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            Patient Queue
          </li>
          <li className={activePage === 'history' ? 'active' : ''}
            onClick={() => setActivePage('history')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="12 8 12 12 14 14"/>
              <path d="M3.05 11a9 9 0 1 0 .5-4"/>
              <polyline points="3 3 3 7 7 7"/>
            </svg>
            Treatment History
          </li>
          <li className={activePage === 'prescriptions' ? 'active' : ''}
            onClick={() => setActivePage('prescriptions')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="8" y1="13" x2="16" y2="13"/>
              <line x1="8" y1="17" x2="16" y2="17"/>
            </svg>
            Prescriptions
          </li>
        </ul>

        <div className="sidebar-footer">
          <button onClick={() => navigate('/')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">

        {/* Top Bar */}
        <div className="top-bar">
          <h1>Doctor Panel</h1>
          <div className="top-bar-right">
            <div className="notification-bell">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="bell-dot"></span>
            </div>
            <div className="user-avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Dashboard */}
        {activePage === 'dashboard' && (
          <>
            <div className="stats-cards">
              <div className="stat-card">
                <div className="stat-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#004D40" strokeWidth="2.5">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                </div>
                <div className="stat-info">
                  <p>Patient Queue</p>
                  <h3>2</h3>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#004D40" strokeWidth="2.5">
                    <polyline points="12 8 12 12 14 14"/>
                    <path d="M3.05 11a9 9 0 1 0 .5-4"/>
                    <polyline points="3 3 3 7 7 7"/>
                  </svg>
                </div>
                <div className="stat-info">
                  <p>Treatment Records</p>
                  <h3>2</h3>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#004D40" strokeWidth="2.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div className="stat-info">
                  <p>Today's Cases</p>
                  <h3>8</h3>
                </div>
              </div>
            </div>

            <div className="bottom-section">
              <div className="quick-actions">
                <h2>Quick Actions</h2>
                <button className="action-btn primary" onClick={() => setActivePage('queue')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  View Patient Queue
                </button>
                <button className="action-btn" onClick={() => setActivePage('history')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="12 8 12 12 14 14"/>
                    <path d="M3.05 11a9 9 0 1 0 .5-4"/>
                    <polyline points="3 3 3 7 7 7"/>
                  </svg>
                  View Treatment History
                </button>
              </div>

              <div className="summary">
                <h2>Today's Summary</h2>
                <div className="summary-item">
                  <span>Patients in Queue</span>
                  <span className="summary-value">2</span>
                </div>
                <div className="summary-item">
                  <span>Consultations Done</span>
                  <span className="summary-value">8</span>
                </div>
                <div className="summary-item">
                  <span>Prescriptions Issued</span>
                  <span className="summary-value">8</span>
                </div>
              </div>
            </div>
          </>
        )}

        {activePage === 'queue' && (
          <div className="page-container">
            <h2>Patient Queue</h2>
            <p>Coming soon...</p>
          </div>
        )}

        {activePage === 'history' && (
          <div className="page-container">
            <h2>Treatment History</h2>
            <p>Coming soon...</p>
          </div>
        )}

        {activePage === 'prescriptions' && (
          <div className="page-container">
            <h2>Prescriptions</h2>
            <p>Coming soon...</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default Doctor;
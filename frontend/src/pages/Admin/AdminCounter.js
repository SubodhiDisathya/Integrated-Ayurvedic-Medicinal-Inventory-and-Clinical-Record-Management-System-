import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';


import { db, auth } from '../../firebase/firebase';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

// CSS File Import
import './AdminCounter.css';

// Asset Imports
import logoEmblem from '../../assets/logo-top.png';
import cornerLeaves from '../../assets/corner-leaves.png';
import heroBanner from '../../assets/Medicine.jpg';

export default function AdminCounter() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, doctors: 0, staff: 0, patients: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersList);

        const doctorCount = usersList.filter(u => u.role === 'doctor').length;
        const staffCount = usersList.filter(u => u.role === 'staff' || u.role === 'pharmacist' || u.role === 'ticket_counter').length;

        let patientCount = 0;
        try {
          const patientsSnapshot = await getDocs(collection(db, 'patients'));
          patientCount = patientsSnapshot.size;
        } catch (e) {
          patientCount = usersList.filter(u => u.role === 'patient').length;
        }
        
        setStats({
          totalUsers: usersList.length,
          doctors: doctorCount,
          staff: staffCount,
          patients: patientCount
        });
      } catch (error) {
        console.error("දත්ත ලබාගැනීමේදී දෝෂයක් ඇති විය:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDeleteUser = async (userId) => {
    if (window.confirm('මෙම පරිශීලකයා පද්ධතියෙන් ඉවත් කිරීමට ඔබට අවශ්‍ය බව විශ්වාස ද?')) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        setUsers(users.filter(user => user.id !== userId));
        alert('පරිශීලකයා සාර්ථකව ඉවත් කරන ලදී.');
      } catch (error) {
        console.error("ඉවත් කිරීමේදී දෝෂයක් ඇති විය:", error);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('user');
      navigate('/');
    } catch (error) {
      console.error("පිටවීමේ දෝෂයකි:", error);
    }
  };

  return (
    <div className="admin-page-scope">
      <div className="doctor-container">
        {/* --- Left Sidebar Navigation --- */}
        <aside className="doctor-sidebar">
          <div className="sidebar-brand">
            <img src={logoEmblem} alt="Sri Lanka Emblem" className="brand-logo" />
            <h2 className="brand-title">ජාතික ආයුර්වේද</h2>
            <p className="brand-subtitle">පරිපාලක පාලක මණ්ඩලය</p>
            <span className="brand-tag">ADMIN PANEL</span>
          </div>

          <nav className="sidebar-menu" aria-label="පරිපාලක මෙනුව">
            <button className="menu-item active" onClick={() => navigate('/admin')}>
              <i className="bi bi-grid-fill"></i> දළ විශ්ලේෂණය
            </button>
            <button className="menu-item" onClick={() => navigate('/admin/dashboard')}>
              <i className="bi bi-people-fill"></i> පරිශීලක කළමනාකරණය
            </button>
          </nav>

          <div className="sidebar-footer-bg">
            <img src={cornerLeaves} alt="Decor Leaves" className="leaf-decor" />
          </div>

          <button className="logout-btn" onClick={handleLogout}>
            <i className="bi bi-box-arrow-left"></i> පිටවීම
          </button>
        </aside>

        {/* --- Main Content Area --- */}
        <main className="doctor-main">
          {/* Top Header Bar */}
          <header className="top-bar">
            <div className="welcome-msg">
              <span className="leaf-icon">🍃</span> ආයුබෝවන්, පරිපාලකතුමා!
            </div>
            <div className="top-bar-actions">
              <button className="notification-icon" aria-label="දැනුම්දීම්">
                <i className="bi bi-bell"></i>
                <span className="badge">1</span>
              </button>
              <button className="user-profile">
                <i className="bi bi-shield-lock-fill"></i>
                <span>පරිපාලක ගිණුම</span>
              </button>
            </div>
          </header>

          <div className="content-inner">
            {/* --- Hero Banner Section --- */}
            <div className="hero-banner-container">
              <img src={heroBanner} alt="Ayurveda Banner" className="hero-banner-img" />
              <div className="hero-overlay-card">
                <h1 className="hero-title">පරිපාලක පුවරුව</h1>
                <p className="hero-subtext">පද්ධතියේ සමස්ත පරිශීලක සහ දත්ත කළමනාකරණය</p>
                <p className="hero-tagline">ආයුර්වේද සුවය ඔබේ ළඟට</p>
              </div>
            </div>

            {/* Stats Cards Section */}
            <section className="stats-grid-doctor">
              <div className="stat-card">
                <div className="stat-number">{loading ? '...' : stats.totalUsers}</div>
                <div className="stat-info">
                  <h4>සම්පූර්ණ පරිශීලකයින්</h4>
                  <p>පද්ධතියේ සමස්තය</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-number" style={{ color: '#0b4d3c' }}>{loading ? '...' : stats.doctors}</div>
                <div className="stat-info">
                  <h4>වෛද්‍යවරුන් සංඛ්‍යාව</h4>
                  <p>ක්‍රියාකාරී වෛද්‍යවරු</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-number" style={{ color: '#d97706' }}>{loading ? '...' : stats.staff}</div>
                <div className="stat-info">
                  <h4>කාර්ය මණ්ඩලය</h4>
                  <p>ෆාමසි සහ කවුන්ටර</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-number" style={{ color: '#2b6cb0' }}>{loading ? '...' : stats.patients}</div>
                <div className="stat-info">
                  <h4>ලියාපදිංචි රෝගීන්</h4>
                  <p>සමස්ත රෝගී දත්ත</p>
                </div>
              </div>
            </section>

            {/* Users Table Card Section */}
            <section className="card-box" style={{ marginBottom: '24px' }}>
              <h3><span className="bar-icon">|</span> පද්ධතියේ ලියාපදිංචි පරිශීලකයින්</h3>
              
              <div className="table-responsive-wrapper" style={{ overflowX: 'auto' }}>
                <table className="admin-users-table-custom">
                  <thead>
                    <tr>
                      <th>නම</th>
                      <th>විද්‍යුත් තැපෑල</th>
                      <th>දුරකථන අංකය</th>
                      <th>භූමිකාව (Role)</th>
                      <th>ක්‍රියාමාර්ග</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>දත්ත පූරණය වෙමින් පවතී...</td></tr>
                    ) : users.length === 0 ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>පරිශීලකයින් හමු නොවීය.</td></tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id}>
                          <td>{user.name || 'N/A'}</td>
                          <td>{user.email}</td>
                          <td>{user.phone || 'N/A'}</td>
                          <td>
                            <span className={`role-badge-custom ${user.role || 'staff'}`}>
                              {user.role || 'user'}
                            </span>
                          </td>
                          <td>
                            <button 
                              className="btn-delete-custom" 
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              ඉවත් කරන්න
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
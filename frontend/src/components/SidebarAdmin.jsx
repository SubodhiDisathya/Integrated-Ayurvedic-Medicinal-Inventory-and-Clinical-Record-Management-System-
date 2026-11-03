import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/firebase';
import './Sidebar_admin.css';

import logoEmblem from '../assets/logo-top.png';
import cornerLeaves from '../assets/corner-leaves.png';

const menuItems = [
  {
    path: '/admin',
    label: 'දළ විශ්ලේෂණය',
    icon: 'bi-grid-fill'
  },
  {
    path: '/admin/dashboard',
    label: 'පරිශීලක කළමනාකරණය',
    icon: 'bi-people-fill'
  }
];

export default function SidebarAdmin() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('user');
      navigate('/');
    } catch (error) {
      console.error('පිටවීමේ දෝෂයකි:', error);
    }
  };

  return (
    <aside className="admin-shared-sidebar">
      <div className="admin-shared-brand">
        <div className="admin-shared-logo-wrap">
          <img src={logoEmblem} alt="Sri Lanka Emblem" className="admin-shared-logo" />
        </div>
        <h2 className="admin-shared-title">ජාතික ආයුර්වේද</h2>
        <p className="admin-shared-subtitle">ඖෂධ තොග හා රෝගීන් සත්කාරක කළමනාකරණය</p>
        <span className="admin-shared-tag">ADMIN PANEL</span>
      </div>

      <nav className="admin-shared-menu" aria-label="පරිපාලක මෙනුව">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              className={`admin-shared-menu-item${isActive ? ' active' : ''}`}
              onClick={() => navigate(item.path)}
              aria-current={isActive ? 'page' : undefined}
            >
              <i className={`bi ${item.icon}`} aria-hidden="true"></i>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="admin-shared-footer">
        <img src={cornerLeaves} alt="" className="admin-shared-leaves" />
      </div>

      <button className="admin-shared-logout" onClick={handleLogout}>
        <i className="bi bi-box-arrow-left" aria-hidden="true"></i>
        <span>පිටවීම</span>
      </button>
    </aside>
  );
}

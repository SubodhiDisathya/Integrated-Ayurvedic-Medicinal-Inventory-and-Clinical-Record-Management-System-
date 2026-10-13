import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar_phar.css';

import logoTop from '../assets/logo-top.png';
import cornerLeaves from '../assets/corner-leaves.png';

export default function Sidebar_phar() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { 
      path: '/pharmacy/dashboard', 
      label: 'මුල් පිටුව', 
      icon: 'bi-house-door-fill' 
    },
    { 
      path: '/pharmacy/inventory', 
      label: 'ඖෂධ ඉන්වෙන්ටරිය', 
      icon: 'bi-box-seam-fill' 
    },
    { 
      path: '/pharmacy/low-stock', 
      label: 'අඩු තොග අනතුරු ඇඟවීම්', 
      icon: 'bi-exclamation-triangle-fill' 
    },
    { 
      path: '/pharmacy/issue', 
      label: 'ඖෂධ නිකුත් කිරීම', 
      icon: 'bi-capsule-capsule' 
    },
  ];

  return (
    <aside className="phar-sidebar">
      {/* Brand Header */}
      <div className="phar-sidebar-brand">
        <div className="phar-logo-container">
          <img src={logoTop} alt="Ayurveda Logo" className="phar-brand-logo" />
        </div>
        <h2 className="phar-brand-title">ජාතික ආයුර්වේද</h2>
        <p className="phar-brand-subtitle">ඖෂධ තොග හා රෝගීන් සත්කාරක කළමනාකරණය</p>
        <span className="phar-brand-tag">MANAGEMENT SYSTEM</span>
      </div>

      <div className="phar-brand-divider"></div>

      {/* Navigation Menu */}
      <nav className="phar-sidebar-menu">
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={index}
              className={`phar-menu-item ${isActive ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <i className={`bi ${item.icon} phar-menu-icon`}></i>
              <span className="phar-menu-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Leaves Decor */}
      <div className="phar-sidebar-footer-decor">
        <img src={cornerLeaves} alt="Decor" className="phar-leaf-decor" />
      </div>

      {/* Logout */}
      <button className="phar-logout-btn" onClick={() => navigate('/')}>
        <i className="bi bi-box-arrow-left"></i>
        <span>පිටවීම</span>
      </button>
    </aside>
  );
}
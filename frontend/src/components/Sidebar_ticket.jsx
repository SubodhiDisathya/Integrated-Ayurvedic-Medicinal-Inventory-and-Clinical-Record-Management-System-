import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar_ticket.css';

import logoTop from '../assets/logo-top.png';
import cornerLeaves from '../assets/corner-leaves.png';

export default function Sidebar_ticket() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      path: '/ticket-counter',
      label: 'මුල් පිටුව',
      icon: 'bi-house-door-fill'
    },
    {
      path: '/ticket-counter/register-patient',
      label: 'රෝගී ලියාපදිංචිය',
      icon: 'bi-person-plus-fill'
    },
    {
      path: '/ticket-counter/records',
      label: 'රෝගී වාර්තා',
      icon: 'bi-file-earmark-text-fill'
    }
  ];

  return (
    <aside className="ticket-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="logo-container">
          <img src={logoTop} alt="Emblem" className="brand-logo" />
        </div>
        <h2 className="brand-title">ජාතික ආයුර්වේද</h2>
        <p className="brand-subtitle">ඖෂධ තොග හා රෝගීන් සත්කාරක කළමනාකරණය</p>
        <span className="brand-tag">MANAGEMENT SYSTEM</span>
      </div>

      <div className="brand-divider"></div>

      {/* Navigation Menu */}
      <nav className="sidebar-menu">
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={index}
              className={`menu-item ${isActive ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <i className={`bi ${item.icon} menu-icon`}></i>
              <span className="menu-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Leaves */}
      <div className="sidebar-footer-decor">
        <img src={cornerLeaves} alt="Decor" className="leaf-decor" />
      </div>

      {/* Logout */}
      <button className="logout-btn" onClick={() => navigate('/')}>
        <i className="bi bi-box-arrow-left"></i>
        <span>පිටවීම</span>
      </button>
    </aside>
  );
}
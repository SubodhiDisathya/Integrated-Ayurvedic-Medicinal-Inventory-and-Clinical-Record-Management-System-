import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar_ticket.css';

import logoTop from '../assets/logo-top.png';
import cornerLeaves from '../assets/corner-leaves.png';

export default function SidebarTicket() {
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
      <div className="ticket-sidebar-brand">
        <div className="ticket-logo-container">
          <img src={logoTop} alt="Emblem" className="ticket-brand-logo" />
        </div>
        <h2 className="ticket-brand-title">ජාතික ආයුර්වේද</h2>
        <p className="ticket-brand-subtitle">ඖෂධ තොග හා රෝගීන් සත්කාරක කළමනාකරණය</p>
        <span className="ticket-brand-tag">MANAGEMENT SYSTEM</span>
      </div>

      <div className="ticket-brand-divider"></div>

      {/* Navigation Menu */}
      <nav className="ticket-sidebar-menu" aria-label="ප්‍රවේශපත්‍ර කවුන්ටර් මෙනුව">
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={index}
              className={`ticket-menu-item ${isActive ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
              aria-current={isActive ? 'page' : undefined}
            >
              <i className={`bi ${item.icon} ticket-menu-icon`}></i>
              <span className="ticket-menu-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Leaves */}
      <div className="ticket-sidebar-footer-decor">
        <img src={cornerLeaves} alt="" className="ticket-leaf-decor" />
      </div>

      {/* Logout */}
      <button className="ticket-logout-btn" onClick={() => navigate('/')}>
        <i className="bi bi-box-arrow-left"></i>
        <span>පිටවීම</span>
      </button>
    </aside>
  );
}
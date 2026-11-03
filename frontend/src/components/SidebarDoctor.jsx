import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import logoEmblem from '../assets/logo-top.png';
import cornerLeaves from '../assets/corner-leaves.png';
import './Sidebar_doc.css';

const doctorLinks = [
  { path: '/doctor/dashboard', label: 'මුල් පිටුව', icon: 'bi-house-door-fill' },
  { path: '/doctor/todays-patients', label: 'අද දින පැමිණි රෝගීන්', icon: 'bi-people-fill' },
  { path: '/doctor/treatment-history', label: 'ප්‍රතිකාර ඉතිහාසය', icon: 'bi-clock-history' }
];

function SidebarDoc({ className = '' }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) =>
    location.pathname === path ||
    (path === '/doctor/dashboard' && location.pathname === '/doctor') ||
    (path === '/doctor/todays-patients' && location.pathname.startsWith('/doctor/consultation/'));

  return (
    <aside className={`doctor-shared-sidebar ${className}`.trim()}>
      <div className="doctor-shared-brand">
        <div className="doctor-shared-logo-wrap">
          <img src={logoEmblem} alt="Sri Lanka Emblem" />
        </div>
        <h2>ජාතික ආයුර්වේද</h2>
        <p>ඖෂධ තොග හා රෝගීන් සත්කාරක කළමනාකරණය</p>
        <span>MANAGEMENT SYSTEM</span>
      </div>

      <nav className="doctor-shared-menu" aria-label="වෛද්‍ය මෙනුව">
        {doctorLinks.map((link) => (
          <button
            key={link.path}
            type="button"
            className={isActive(link.path) ? 'active' : ''}
            aria-current={isActive(link.path) ? 'page' : undefined}
            onClick={() => navigate(link.path)}
          >
            <i className={`bi ${link.icon}`} aria-hidden="true" />
            <span>{link.label}</span>
          </button>
        ))}
      </nav>

      <img className="doctor-shared-leaves" src={cornerLeaves} alt="" />

      <button
        type="button"
        className="doctor-shared-logout"
        onClick={() => navigate('/')}
      >
        <i className="bi bi-box-arrow-left" aria-hidden="true" />
        <span>පිටවීම</span>
      </button>
    </aside>
  );
}

export default SidebarDoc;
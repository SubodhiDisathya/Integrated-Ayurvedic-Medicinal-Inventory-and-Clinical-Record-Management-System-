import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './Sidebar.css';
import emblem from '../assets/logo-sri-lanka-emblem.png';
import cornerLeaves from '../assets/corner-leaves.png';

const menus = {
  doctor: [
    {
      id: 'home',
      label: 'මුල් පිටුව',
      to: '/doctor/dashboard',
      icon: 'bi-house-door',
      activePaths: ['/doctor', '/doctor/dashboard'],
    },
    {
      id: 'patients',
      label: 'රෝගීන් සත්කාර',
      to: '/doctor/todays-patients',
      icon: 'bi-people',
      activePaths: ['/doctor/todays-patients'],
    },
    {
      id: 'prescriptions',
      label: 'ඖෂධ නියම කිරීම',
      to: '/doctor/treatment-history',
      icon: 'bi-capsule',
      activePaths: ['/doctor/treatment-history', '/doctor/consultation'],
    },
  ],
  pharmacy: [
    {
      id: 'home',
      label: 'මුල් පිටුව',
      to: '/pharmacy/dashboard',
      icon: 'bi-house-door',
      activePaths: ['/pharmacy', '/pharmacy/dashboard'],
    },
    {
      id: 'inventory',
      label: 'ඖෂධ ඉන්වෙන්ටරිය',
      to: '/pharmacy/inventory',
      icon: 'bi-box-seam',
      activePaths: ['/pharmacy/inventory'],
    },
    {
      id: 'low-stock',
      label: 'අඩු තොග අනතුරු ඇඟවීම්',
      to: '/pharmacy/low-stock',
      icon: 'bi-exclamation-triangle',
      activePaths: ['/pharmacy/low-stock'],
    },
    {
      id: 'issue',
      label: 'ඖෂධ නිකුත් කිරීම',
      to: '/pharmacy/issue',
      icon: 'bi-prescription2',
      activePaths: ['/pharmacy/issue', '/pharmacy/prescriptions'],
    },
  ],
  ticket: [
    {
      id: 'home',
      label: 'මුල් පිටුව',
      to: '/ticket-counter',
      icon: 'bi-house-door',
      activePaths: ['/ticket', '/ticket-counter'],
    },
    {
      id: 'register-patient',
      label: 'නව රෝගියා ලියාපදිංචිය',
      to: '/ticket-counter/register-patient',
      icon: 'bi-person-plus',
      activePaths: ['/ticket/register-patient', '/ticket-counter/register-patient'],
    },
    {
      id: 'issue-ticket',
      label: 'ටිකට් පත් නිකුත් කිරීම',
      to: '/ticket-counter/records',
      icon: 'bi-ticket-perforated',
      activePaths: ['/ticket/issue', '/ticket-counter/records'],
    },
    {
      id: 'queue',
      label: 'පෝලිම් කළමනාකරණය',
      to: '/ticket-counter/queue',
      icon: 'bi-list-ol',
      activePaths: ['/ticket/queue', '/ticket-counter/queue'],
    },
  ],
  admin: [
    {
      id: 'home',
      label: 'Dashboard',
      to: '/admin',
      icon: 'bi-grid',
      activePaths: ['/admin'],
    },
    {
      id: 'users',
      label: 'පරිශීලක කළමනාකරණය',
      to: '/admin/users',
      icon: 'bi-person-gear',
      activePaths: ['/admin/users'],
    },
    {
      id: 'reports',
      label: 'වාර්තා (Reports)',
      to: '/admin/reports',
      icon: 'bi-graph-up',
      activePaths: ['/admin/reports'],
    },
    {
      id: 'settings',
      label: 'පද්ධති සැකසුම් (Settings)',
      to: '/admin/settings',
      icon: 'bi-gear',
      activePaths: ['/admin/settings'],
    },
  ],
};

const roleAliases = {
  doctor: 'doctor',
  'doctor-counter': 'doctor',
  pharmacy: 'pharmacy',
  'pharmacy-counter': 'pharmacy',
  pharmacist: 'pharmacy',
  staff: 'pharmacy',
  ticket: 'ticket',
  'ticket-counter': 'ticket',
  admin: 'admin',
  'admin-counter': 'admin',
};

function getRole(role, pathname) {
  const pathRole = pathname.startsWith('/doctor')
    ? 'doctor'
    : pathname.startsWith('/pharmacy')
      ? 'pharmacy'
      : pathname.startsWith('/ticket')
        ? 'ticket'
        : pathname.startsWith('/admin')
          ? 'admin'
          : null;

  const normalizedRole = String(role || pathRole || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-');

  return roleAliases[normalizedRole] || pathRole || null;
}

function isPathActive(pathname, paths) {
  const rootPaths = ['/doctor', '/pharmacy', '/ticket', '/ticket-counter', '/admin'];
  return paths.some(
    (path) => pathname === path || (!rootPaths.includes(path) && pathname.startsWith(`${path}/`))
  );
}

export default function Sidebar({ role, activeTab }) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentRole = getRole(role, location.pathname);
  const items = currentRole ? menus[currentRole] : [];

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <aside className="ayur-sidebar" aria-label="ප්‍රධාන මෙනුව">
      <div className="ayur-sidebar-brand">
        <img className="ayur-sidebar-emblem" src={emblem} alt="ශ්‍රී ලංකා රාජ්‍ය ලාංඡනය" />
        <div className="ayur-sidebar-brand-copy">
          <h1>ජාතික ආයුර්වේද</h1>
          <p>රෝහල් කළමනාකරණ පද්ධතිය</p>
          <span className="ayur-sidebar-tag">MANAGEMENT SYSTEM</span>
        </div>
      </div>

      <nav className="ayur-sidebar-nav" aria-label="කවුන්ටර් මෙනුව">
        {items.map((item) => {
          const active = activeTab
            ? activeTab === item.id || activeTab === item.to
            : isPathActive(location.pathname, item.activePaths);

          return (
            <Link
              key={item.id}
              className={`ayur-sidebar-link${active ? ' is-active' : ''}`}
              to={item.to}
              aria-current={active ? 'page' : undefined}
            >
              <i className={`bi ${item.icon}`} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="ayur-sidebar-footer">
        <button className="ayur-sidebar-logout" type="button" onClick={handleLogout}>
          <i className="bi bi-box-arrow-left" aria-hidden="true" />
          <span>පිටවීම</span>
        </button>
      </div>

      <img className="ayur-sidebar-leaves" src={cornerLeaves} alt="" aria-hidden="true" />
    </aside>
  );
}

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { getLowStockRows } from '../utils/inventoryStock';
import './Sidebar_phar.css';

import logoTop from '../assets/logo-top.png';
import cornerLeaves from '../assets/corner-leaves.png';

export default function Sidebar_phar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'inventory'),
      (snapshot) => {
        let count = 0;
        snapshot.forEach((itemDoc) => {
          count += getLowStockRows(itemDoc.data()).length;
        });
        setLowStockCount(count);
      },
      (error) => console.error('Error fetching sidebar low-stock count:', error)
    );
    return () => unsubscribe();
  }, []);

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
      icon: 'bi-capsule' 
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
              {item.path === '/pharmacy/low-stock' && lowStockCount > 0 && (
                <span style={{ marginLeft: 'auto', minWidth: '20px', height: '20px', lineHeight: '20px', textAlign: 'center', borderRadius: '10px', background: '#dc2626', color: '#fff', fontSize: '10px', fontWeight: '700' }}>
                  {lowStockCount}
                </span>
              )}
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
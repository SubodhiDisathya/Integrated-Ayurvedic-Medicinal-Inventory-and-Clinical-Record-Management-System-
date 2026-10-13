import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

import SidebarPhar from '../../components/Sidebar_phar';
import './LowStockInventory.css';

// Sample inventory mapped with ingredients
const MEDICINES_DATA = [
  { id: '1', name: 'ත්‍රිඵලා පෙති', enName: 'Triphala Pethi', ingredients: 'අරළු ගෙඩි (Haritaki), බුළු ගෙඩි (Bibhitaki), නෙල්ලි ගෙඩි (Amalaki)', currentStock: 8, unit: 'Packets', expiryDate: '2025-10-15', status: 'Low Stock', threshold: 10 },
  { id: '2', name: 'සරස්වතාරිෂ්ටය', enName: 'Saraswatharishtaya', ingredients: 'වැල්මී මුල් (Vacha), වදකහ (Katu), ඉඟුරු (Inguru), තිප්පිලි (Thippili)', currentStock: 25, unit: 'Bottles', expiryDate: '2026-03-20', status: 'In Stock', threshold: 10 },
  { id: '3', name: 'ජීවලේප ආලේපනය', enName: 'Jeewalepa Alapenaya', ingredients: 'පාවට්ටා කොළ (Pavatta), ආඩතෝඩා කොළ (Adhatoda), වෙනිවැල්ගැට (Venivelgeta), කහ (Kaha), පොල්තෙල් (Coconut Oil)', currentStock: 15, unit: 'Bottles', expiryDate: '2026-01-10', status: 'In Stock', threshold: 10 },
  { id: '4', name: 'බුද්ධරාජ කල්ක', enName: 'Buddharaja Kalkaya', ingredients: 'අරළු ගෙඩි (Haritaki), බුළු ගෙඩි (Bibhitaki), නෙල්ලි ගෙඩි (Amalaki), ඉඟුරු (Inguru), ගම්මිරිස් (Gammiris), තිප්පිලි (Thippili)', currentStock: 12, unit: 'Packets', expiryDate: '2025-12-05', status: 'In Stock', threshold: 10 },
  { id: '5', name: 'කොලසැලෙස්මා තෛලය', enName: 'Kolaselesma Tailaya', ingredients: 'ආඩතෝඩා කොළ (Adhatoda), පාවට්ටා කොළ (Pavatta), වෙනිවැල්ගැට (Venivelgeta), ඉඟුරු (Inguru), තල තෙල් (Sesame Oil)', currentStock: 5, unit: 'Bottles', expiryDate: '2025-11-30', status: 'Low Stock', threshold: 10 },
  { id: '6', name: 'අරළු පෙති', enName: 'Aralu Pethi', ingredients: 'අරළු ගෙඩි (Haritaki)', currentStock: 30, unit: 'Packets', expiryDate: '2026-04-18', status: 'In Stock', threshold: 10 }
];

export default function LowStockInventory() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [inventory, setInventory] = useState(MEDICINES_DATA);

  // Firestore Integration
  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, 'inventory'), (snapshot) => {
        if (!snapshot.empty) {
          const list = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() });
          });
          setInventory(list);
        }
      });
      return () => unsub();
    } catch (error) {
      console.error("Firebase error: ", error);
    }
  }, []);

  const lowStockAlerts = inventory.filter(item => Number(item.currentStock || 0) <= Number(item.threshold || 10));

  const filteredInventory = inventory.filter(item =>
    (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.ingredients && item.ingredients.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="ls-layout">
      {/* 1. Left Pharmacy Sidebar Component */}
      <SidebarPhar />

      {/* 2. Middle & Main Dashboard Area */}
      <div className="ls-main-wrapper">
        {/* Top Header Bar */}
        <header className="ls-topbar">
          <div className="ls-search-bar">
            <i className="bi bi-search"></i>
            <input
              type="text"
              placeholder="Search medicine, ingredient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="ls-user-profile">
            <div className="ls-nav-bell">
              <i className="bi bi-bell-fill"></i>
              <span className="ls-badge-count">{lowStockAlerts.length}</span>
            </div>
            <div className="ls-user-info">
              <i className="bi bi-person-circle"></i>
              <span>Pharmacy Staff</span>
            </div>
          </div>
        </header>

        <div className="ls-body-content">
          {/* Main Inventory Section (Left Grid) */}
          <div className="ls-left-content">
            <div className="ls-title-area">
              <h2>🌿 Herbal Medicine Inventory</h2>
              <p>Track stock levels, Ingredients and expiry dates of Ayurvedic medicines.</p>
            </div>

            {/* Quick Stat Cards */}
            <div className="ls-stats-grid">
              <div className="ls-stat-card">
                <div className="ls-stat-icon green"><i className="bi bi-box-seam"></i></div>
                <div>
                  <span className="ls-stat-title">Total Medicines</span>
                  <h3 className="ls-stat-val">{inventory.length}</h3>
                </div>
              </div>

              <div className="ls-stat-card">
                <div className="ls-stat-icon yellow"><i className="bi bi-exclamation-triangle-fill"></i></div>
                <div>
                  <span className="ls-stat-title">Low Stock Items</span>
                  <h3 className="ls-stat-val">{lowStockAlerts.length}</h3>
                </div>
              </div>

              <div className="ls-stat-card">
                <div className="ls-stat-icon red"><i className="bi bi-x-circle-fill"></i></div>
                <div>
                  <span className="ls-stat-title">Out of Stock</span>
                  <h3 className="ls-stat-val">0</h3>
                </div>
              </div>

              <div className="ls-stat-card">
                <div className="ls-stat-icon blue"><i className="bi bi-calendar-event-fill"></i></div>
                <div>
                  <span className="ls-stat-title">Expiring Soon</span>
                  <h3 className="ls-stat-val">1</h3>
                </div>
              </div>
            </div>

            {/* Inventory Table Card */}
            <div className="ls-table-card">
              <table className="ls-table">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Medicine Name</th>
                    <th>Ingredients</th>
                    <th>Current Stock</th>
                    <th>Expiry Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((med, idx) => {
                    const isLow = Number(med.currentStock || 0) <= Number(med.threshold || 10);
                    return (
                      <tr key={med.id || idx}>
                        <td>{idx + 1}</td>
                        <td>
                          <strong>{med.name}</strong>
                          <div className="ls-subtext">({med.enName})</div>
                        </td>
                        <td className="ls-ingredients-td">{med.ingredients}</td>
                        <td>
                          <strong>{med.currentStock}</strong> ({med.unit})
                          {isLow && (
                            <span className="ls-tag-low">Low Stock</span>
                          )}
                        </td>
                        <td>{med.expiryDate}</td>
                        <td>
                          <span className={`ls-status-pill ${isLow ? 'low' : 'ok'}`}>
                            {isLow ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                        <td>
                          <button className="ls-btn-action"><i className="bi bi-pencil-square"></i></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Side Alert Panel */}
          <div className="ls-right-panel">
            {/* Low Stock Alerts Box */}
            <div className="ls-alert-card">
              <div className="ls-alert-header">
                <h3><i className="bi bi-bell-fill text-danger"></i> Low Stock Alerts</h3>
                <span className="ls-alert-badge">{lowStockAlerts.length}</span>
              </div>

              <div className="ls-alerts-list">
                {lowStockAlerts.length > 0 ? (
                  lowStockAlerts.map((item) => (
                    <div className="ls-alert-item" key={item.id}>
                      <div className="ls-alert-item-title">
                        <i className="bi bi-exclamation-circle-fill text-warning"></i>
                        <span><strong>{item.name}</strong></span>
                      </div>
                      <p>Current stock: <strong className="text-danger">{item.currentStock}</strong> ({item.unit})</p>
                      <p className="ls-text-muted">Threshold: {item.threshold || 10}</p>
                    </div>
                  ))
                ) : (
                  <p className="ls-text-muted">No low stock alerts.</p>
                )}
              </div>
            </div>

            {/* Quick Actions Box */}
            <div className="ls-quick-actions-card">
              <h3><i className="bi bi-plus-circle-fill"></i> Quick Actions</h3>
              <button className="ls-btn-green" onClick={() => navigate('/pharmacy/inventory')}>
                <i className="bi bi-plus-lg"></i> Add New Medicine
              </button>
              <button className="ls-btn-outline">
                <i className="bi bi-list-nested"></i> View Ingredient List
              </button>
              <button className="ls-btn-outline">
                <i className="bi bi-file-earmark-pdf"></i> Generate Low Stock Report
              </button>
            </div>

            {/* Recent Notifications */}
            <div className="ls-notifications-card">
              <h3>Recent Notifications</h3>
              <ul className="ls-notif-list">
                <li>
                  <span className="dot red"></span>
                  <div>
                    <p>Low stock alert for ත්‍රිඵලා පෙති</p>
                    <small>2 hours ago</small>
                  </div>
                </li>
                <li>
                  <span className="dot yellow"></span>
                  <div>
                    <p>Low stock alert for කොලසැලෙස්මා තෛලය</p>
                    <small>3 hours ago</small>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
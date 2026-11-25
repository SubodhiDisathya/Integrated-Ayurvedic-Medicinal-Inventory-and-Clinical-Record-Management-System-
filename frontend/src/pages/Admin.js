import React, { useState, useEffect } from 'react';

// Firebase Imports
import { db } from '../firebase/firebase';
import { collection, doc, deleteDoc, onSnapshot, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// CSS File Import
import './Admin.css';

// Asset Imports
import heroBanner from '../assets/Medicine.jpg';
import SidebarAdmin from '../components/SidebarAdmin';
import RoleTopbar from '../components/RoleTopbar';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, doctors: 0, staff: 0, patients: 0 });
  const [suppliers, setSuppliers] = useState([]);
  const [supplyRequests, setSupplyRequests] = useState([]);
  const [supplierSelections, setSupplierSelections] = useState({});
  const [acceptingRequestId, setAcceptingRequestId] = useState('');

  useEffect(() => {
    const updateUserStats = (usersList) => {
        setUsers(usersList);
        setSuppliers(usersList.filter((user) => user.role === 'supplier'));

        const doctorCount = usersList.filter(u => u.role === 'doctor').length;
        const staffCount = usersList.filter(u => u.role === 'staff' || u.role === 'pharmacist' || u.role === 'ticket_counter').length;

        setStats({
          totalUsers: usersList.length,
          doctors: doctorCount,
          staff: staffCount,
          patients: usersList.filter(u => u.role === 'patient').length
        });
    };

    const unsubscribeUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const usersList = snapshot.docs.map((userDoc) => ({ id: userDoc.id, ...userDoc.data() }));
        updateUserStats(usersList);
        setLoading(false);
      },
      (error) => {
        console.error('දත්ත ලබාගැනීමේදී දෝෂයක් ඇති විය:', error);
        setLoading(false);
      }
    );

    const unsubscribePatients = onSnapshot(
      collection(db, 'patients'),
      (snapshot) => {
        setStats((current) => ({ ...current, patients: snapshot.size }));
      },
      (error) => console.error('Error fetching patients:', error)
    );
    const unsubscribeSupplyRequests = onSnapshot(
      collection(db, 'low_stock_requests'),
      (snapshot) => {
        setSupplyRequests(snapshot.docs.map((requestDoc) => ({
          id: requestDoc.id,
          ...requestDoc.data()
        })).sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        }));
      },
      (error) => console.error('Error fetching low-stock supply requests:', error)
    );

    return () => {
      unsubscribeUsers();
      unsubscribePatients();
      unsubscribeSupplyRequests();
    };
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

  const handleAcceptSupplyRequest = async (request) => {
    const supplierId = supplierSelections[request.id];
    if (!supplierId) {
      alert('සැපයුම්කරු තෝරන්න.');
      return;
    }

    const supplier = suppliers.find((item) => item.id === supplierId);
    if (!supplier) {
      alert('තෝරාගත් සැපයුම්කරු සොයාගත නොහැක.');
      return;
    }

    setAcceptingRequestId(request.id);
    try {
      const requestNumber = `SR-${Date.now().toString().slice(-8)}`;
      await addDoc(collection(db, 'supplier_requests'), {
        requestNumber,
        lowStockRequestId: request.id,
        supplierId,
        supplierName: supplier.companyName || supplier.name || supplier.email,
        ingredientName: request.itemName,
        itemName: request.itemName,
        quantity: request.quantity,
        unit: request.unit,
        packageUnit: request.packageUnit || null,
        currentStock: request.currentStock,
        threshold: request.threshold,
        status: 'approved',
        expectedDate: null,
        deliveryDate: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'low_stock_requests', request.id), {
        status: 'approved',
        supplierId,
        supplierName: supplier.companyName || supplier.name || supplier.email,
        requestNumber,
        acceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      alert('ඉල්ලීම අනුමත කර සැපයුම්කරුට යවන ලදී.');
    } catch (error) {
      console.error('Error accepting low-stock supply request:', error);
      alert('ඉල්ලීම අනුමත කිරීමේදී දෝෂයක් ඇති විය.');
    } finally {
      setAcceptingRequestId('');
    }
  };

  return (
    <div className="admin-page-scope">
      <div className="admin-container">
        <SidebarAdmin />

        {/* --- Main Content Area --- */}
        <main className="admin-main">
          <RoleTopbar
            roleLabel="පරිපාලක"
            notificationCount={supplyRequests.filter((request) => request.status !== 'approved').length}
          />

          <div className="content-inner">
            {/* --- Hero Banner Section --- */}
            <div className="hero-banner-container">
              <img src={heroBanner} alt="Ayurveda Banner" className="hero-banner-img" />
              <div className="hero-overlay-card">
                <h1 className="hero-title" style={{ fontSize: '2.3rem' }}>පරිපාලක පුවරුව</h1>
                <p className="hero-subtext">පද්ධතියේ සමස්ත පරිශීලක සහ දත්ත කළමනාකරණය</p>
                <p className="hero-tagline">ආයුර්වේද සුවය ඔබේ ළඟට</p>
              </div>
            </div>

            {/* Stats Cards Section */}
            <section className="stats-grid-admin">
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

            <section className="card-box" style={{ marginBottom: '24px' }}>
              <h3><span className="bar-icon">|</span> අඩු තොග සැපයුම් ඉල්ලීම්</h3>
              {suppliers.length === 0 && (
                <p style={{ color: '#b45309', fontSize: '13px' }}>
                  Supplier ගිණුමක් නොමැත. ඉල්ලීම් අනුමත කිරීමට supplier පරිශීලකයකු Register කරන්න.
                </p>
              )}
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-users-table-custom">
                  <thead>
                    <tr>
                      <th>අයිතමය</th>
                      <th>වත්මන් තොගය</th>
                      <th>ඉල්ලූ ප්‍රමාණය</th>
                      <th>සැපයුම්කරු</th>
                      <th>තත්ත්වය</th>
                      <th>ක්‍රියා</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplyRequests.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>සැපයුම් ඉල්ලීම් නොමැත.</td>
                      </tr>
                    ) : supplyRequests.map((request) => (
                      <tr key={request.id}>
                        <td>{request.itemName}</td>
                        <td>{request.currentStock} ({request.unit})</td>
                        <td>{request.quantity} ({request.unit})</td>
                        <td>
                          {request.status === 'approved' ? (
                            <strong>{request.supplierName || '—'}</strong>
                          ) : (
                            <select
                              value={supplierSelections[request.id] || ''}
                              onChange={(event) => setSupplierSelections((current) => ({
                                ...current,
                                [request.id]: event.target.value
                              }))}
                              style={{ width: '180px', padding: '8px', borderRadius: '8px', border: '1px solid #d6e0d8' }}
                            >
                              <option value="">සැපයුම්කරු තෝරන්න</option>
                              {suppliers.map((supplier) => (
                                <option key={supplier.id} value={supplier.id}>
                                  {supplier.companyName || supplier.name || supplier.email}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td>
                          <span className={`role-badge-custom ${request.status === 'approved' ? 'supplier' : 'staff'}`}>
                            {request.status === 'approved' ? 'අනුමතයි' : 'පරිපාලක අනුමතිය බලා'}
                          </span>
                        </td>
                        <td>
                          {request.status === 'approved' ? (
                            <span style={{ color: '#137333', fontWeight: '600' }}>Supplier වෙත යවා ඇත</span>
                          ) : (
                            <button
                              type="button"
                              className="btn-delete-custom"
                              onClick={() => handleAcceptSupplyRequest(request)}
                              disabled={acceptingRequestId === request.id}
                              style={{ background: '#1a5a38', color: '#fff' }}
                            >
                              {acceptingRequestId === request.id ? 'අනුමත කරමින්...' : 'අනුමත කරන්න'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
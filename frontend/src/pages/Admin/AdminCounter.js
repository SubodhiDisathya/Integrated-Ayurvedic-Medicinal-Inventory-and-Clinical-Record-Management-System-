import React, { useState, useEffect } from 'react';


import { db } from '../../firebase/firebase';
import { collection, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { getLowStockRequestIngredients } from '../../utils/inventoryStock';
import {
  DEFAULT_MEDICINE_RECIPES,
  ensureDefaultMedicineRecipes,
  getRecipeIngredientsForRequest
} from '../../utils/medicineRecipes';

// CSS File Import
import './AdminCounter.css';

// Asset Imports
import heroBanner from '../../assets/Medicine.jpg';
import SidebarAdmin from '../../components/SidebarAdmin';
import RoleTopbar from '../../components/RoleTopbar';

export default function AdminCounter() {
  const [users, setUsers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [supplyRequests, setSupplyRequests] = useState([]);
  const [inventoryItemsById, setInventoryItemsById] = useState({});
  const [medicineRecipes, setMedicineRecipes] = useState(DEFAULT_MEDICINE_RECIPES);
  const [loading, setLoading] = useState(true);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [supplyRequestsLoading, setSupplyRequestsLoading] = useState(true);
  const [selectedStatFilter, setSelectedStatFilter] = useState('users');
  const [stats, setStats] = useState({ totalUsers: 0, doctors: 0, staff: 0, patients: 0, suppliers: 0 });
  const [pendingSupplyRequests, setPendingSupplyRequests] = useState(0);

  useEffect(() => {
    const updateUserStats = (usersList) => {
        setUsers(usersList);

        const doctorCount = usersList.filter(u => u.role === 'doctor').length;
        const staffCount = usersList.filter(u => u.role === 'staff' || u.role === 'pharmacist' || u.role === 'ticket_counter').length;

        setStats({
          totalUsers: usersList.length,
          doctors: doctorCount,
          staff: staffCount,
          patients: usersList.filter(u => u.role === 'patient').length,
          suppliers: usersList.filter(u => u.role === 'supplier').length
        });
    };

    const unsubscribeUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        updateUserStats(snapshot.docs.map((userDoc) => ({ id: userDoc.id, ...userDoc.data() })));
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
        setPatients(snapshot.docs.map((patientDoc) => ({ id: patientDoc.id, ...patientDoc.data() })));
        setStats((current) => ({ ...current, patients: snapshot.size }));
        setPatientsLoading(false);
      },
      (error) => {
        console.error('Error fetching patients:', error);
        setPatientsLoading(false);
      }
    );
    const unsubscribeSupplyRequests = onSnapshot(
      collection(db, 'low_stock_requests'),
      (snapshot) => {
        const requests = snapshot.docs
          .map((requestDoc) => ({ id: requestDoc.id, ...requestDoc.data() }))
          .filter((request) => request.status !== 'approved');
        setSupplyRequests(requests);
        setPendingSupplyRequests(requests.length);
        setSupplyRequestsLoading(false);
      },
      (error) => {
        console.error('Error fetching supply requests:', error);
        setSupplyRequestsLoading(false);
      },
      (error) => console.error('Error fetching supply requests:', error)
    );
    const unsubscribeInventory = onSnapshot(
      collection(db, 'inventory'),
      (snapshot) => {
        setInventoryItemsById(Object.fromEntries(
          snapshot.docs.map((inventoryDoc) => [inventoryDoc.id, inventoryDoc.data()])
        ));
      },
      (error) => console.error('Error fetching inventory ingredients:', error)
    );

    return () => {
      unsubscribeUsers();
      unsubscribePatients();
      unsubscribeSupplyRequests();
      unsubscribeInventory();
    };
  }, []);

  useEffect(() => {
    let active = true;
    let unsubscribeRecipes;

    const loadRecipes = async () => {
      try {
        await ensureDefaultMedicineRecipes(db);
        if (!active) return;
        unsubscribeRecipes = onSnapshot(
          collection(db, 'medicine_recipes'),
          (snapshot) => {
            setMedicineRecipes(snapshot.docs.map((recipeDoc) => ({
              id: recipeDoc.id,
              ...recipeDoc.data()
            })));
          },
          (error) => console.error('Error fetching medicine recipes:', error)
        );
      } catch (error) {
        console.error('Error initializing medicine recipes:', error);
      }
    };

    loadRecipes();
    return () => {
      active = false;
      unsubscribeRecipes?.();
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

  const filteredUsers = selectedStatFilter === 'doctors'
    ? users.filter((user) => user.role === 'doctor')
    : selectedStatFilter === 'staff'
      ? users.filter((user) => ['staff', 'pharmacist', 'ticket_counter'].includes(user.role))
      : users;
  const filteredSuppliers = users.filter((user) => user.role === 'supplier');
  const getRequestIngredientNames = (request) =>
    getLowStockRequestIngredients(request, inventoryItemsById[request.inventoryId]);
  const getRequestIngredientDetails = (request) => {
    if (request.requestType === 'ingredient') {
      const ingredientName = request.ingredientName || request.itemName;
      const requestedQuantity = Number(request.quantity);
      return ingredientName
        ? [{
          name: ingredientName,
          quantity: Number.isFinite(requestedQuantity) ? requestedQuantity : null,
          unit: request.unit || ''
        }]
        : [];
    }

    const recipeIngredients = getRecipeIngredientsForRequest(medicineRecipes, request);
    if (recipeIngredients.length > 0) return recipeIngredients;
    return getRequestIngredientNames(request).map((name) => ({ name, quantity: null, unit: '' }));
  };
  const formatIngredientDetails = (ingredients) => ingredients.map((ingredient) =>
    ingredient.quantity == null
      ? ingredient.name
      : `${ingredient.name} ${ingredient.quantity}${ingredient.unit || ''}`
  ).join(', ');
  const tableLoading = selectedStatFilter === 'patients'
    ? patientsLoading
    : selectedStatFilter === 'supplyRequests'
      ? supplyRequestsLoading
      : loading;
  const tableTitle = {
    users: 'පද්ධතියේ ලියාපදිංචි පරිශීලකයින්',
    doctors: 'ලියාපදිංචි වෛද්‍යවරුන්',
    staff: 'කාර්ය මණ්ඩලය',
    patients: 'ලියාපදිංචි රෝගීන්',
    supplyRequests: 'අඩු තොග ඉල්ලීම්',
    suppliers: 'සැපයුම්කරුවන්'
  }[selectedStatFilter];

  return (
    <div className="admin-page-scope">
      <div className="doctor-container">
        <SidebarAdmin />

        {/* --- Main Content Area --- */}
        <main className="doctor-main">
          <RoleTopbar roleLabel="පරිපාලක" notificationCount={pendingSupplyRequests} />

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
              <button type="button" className={`stat-card${selectedStatFilter === 'users' ? ' selected' : ''}`} onClick={() => setSelectedStatFilter('users')} aria-pressed={selectedStatFilter === 'users'}>
                <div className="stat-number">{loading ? '...' : stats.totalUsers}</div>
                <div className="stat-info">
                  <h4>සම්පූර්ණ පරිශීලකයින්</h4>
                  <p>පද්ධතියේ සමස්තය</p>
                </div>
              </button>

              <button type="button" className={`stat-card${selectedStatFilter === 'doctors' ? ' selected' : ''}`} onClick={() => setSelectedStatFilter('doctors')} aria-pressed={selectedStatFilter === 'doctors'}>
                <div className="stat-number" style={{ color: '#0b4d3c' }}>{loading ? '...' : stats.doctors}</div>
                <div className="stat-info">
                  <h4>වෛද්‍යවරුන් සංඛ්‍යාව</h4>
                  <p>ක්‍රියාකාරී වෛද්‍යවරු</p>
                </div>
              </button>

              <button type="button" className={`stat-card${selectedStatFilter === 'staff' ? ' selected' : ''}`} onClick={() => setSelectedStatFilter('staff')} aria-pressed={selectedStatFilter === 'staff'}>
                <div className="stat-number" style={{ color: '#d97706' }}>{loading ? '...' : stats.staff}</div>
                <div className="stat-info">
                  <h4>කාර්ය මණ්ඩලය</h4>
                  <p>ෆාමසි සහ කවුන්ටර</p>
                </div>
              </button>

              <button type="button" className={`stat-card${selectedStatFilter === 'patients' ? ' selected' : ''}`} onClick={() => setSelectedStatFilter('patients')} aria-pressed={selectedStatFilter === 'patients'}>
                <div className="stat-number" style={{ color: '#2b6cb0' }}>{loading ? '...' : stats.patients}</div>
                <div className="stat-info">
                  <h4>ලියාපදිංචි රෝගීන්</h4>
                  <p>සමස්ත රෝගී දත්ත</p>
                </div>
              </button>

              <button type="button" className={`stat-card${selectedStatFilter === 'supplyRequests' ? ' selected' : ''}`} onClick={() => setSelectedStatFilter('supplyRequests')} aria-pressed={selectedStatFilter === 'supplyRequests'}>
                <div className="stat-number" style={{ color: '#dc2626' }}>{pendingSupplyRequests}</div>
                <div className="stat-info">
                  <h4>අඩු තොග ඉල්ලීම්</h4>
                  <p>පරිපාලක අනුමැතිය බලා</p>
                </div>
              </button>

              <button type="button" className={`stat-card${selectedStatFilter === 'suppliers' ? ' selected' : ''}`} onClick={() => setSelectedStatFilter('suppliers')} aria-pressed={selectedStatFilter === 'suppliers'}>
                <div className="stat-number" style={{ color: '#059669' }}>{loading ? '...' : stats.suppliers}</div>
                <div className="stat-info">
                  <h4>සැපයුම්කරුවන්</h4>
                  <p>බාහිර සැපයුම්කරුවන්</p>
                </div>
              </button>
            </section>

            {/* Selected dashboard category */}
            <section className="card-box" style={{ marginBottom: '24px' }}>
              <h3><span className="bar-icon">|</span> {tableTitle}</h3>
              
              <div className="table-responsive-wrapper" style={{ overflowX: 'auto' }}>
                <table className="admin-users-table-custom">
                  <thead>
                    {selectedStatFilter === 'patients' ? (
                      <tr><th>නම</th><th>රෝගී අංකය</th><th>දුරකථන අංකය</th><th>වයස</th></tr>
                    ) : selectedStatFilter === 'supplyRequests' ? (
                      <tr><th>ඖෂධය / අමුද්‍රව්‍යය</th><th>අංකය</th><th>අවශ්‍ය අමුද්‍රව්‍ය</th><th>දැනට ඇති තොගය</th></tr>
                    ) : selectedStatFilter === 'suppliers' ? (
                      <tr><th>සැපයුම්කරු</th><th>වර්ගය</th><th>දුරකථන අංකය</th><th>විද්‍යුත් තැපෑල</th></tr>
                    ) : (
                      <tr><th>නම</th><th>විද්‍යුත් තැපෑල</th><th>දුරකථන අංකය</th><th>භූමිකාව (Role)</th><th>ක්‍රියාමාර්ග</th></tr>
                    )}
                  </thead>
                  <tbody>
                    {tableLoading ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>දත්ත පූරණය වෙමින් පවතී...</td></tr>
                    ) : selectedStatFilter === 'patients' ? patients.length === 0 ? (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>රෝගීන් හමු නොවීය.</td></tr>
                    ) : patients.map((patient) => (
                      <tr key={patient.id}>
                        <td>{patient.fullName || patient.name || 'N/A'}</td>
                        <td>{patient.patientId || 'N/A'}</td>
                        <td>{patient.contactNumber || 'N/A'}</td>
                        <td>{patient.age ?? 'N/A'}</td>
                      </tr>
                    )                    ) : selectedStatFilter === 'supplyRequests' ? supplyRequests.length === 0 ? (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>අඩු තොග ඉල්ලීම් නොමැත.</td></tr>
                    ) : supplyRequests.map((request) => (
                      <tr key={request.id}>
                        <td>{request.itemName || 'N/A'}</td>
                        <td>{request.itemCode || 'N/A'}</td>
                        <td>{formatIngredientDetails(getRequestIngredientDetails(request)) || '—'}</td>
                        <td>{request.currentStock ?? 'N/A'} {request.unit || ''}</td>
                      </tr>
                    )) : selectedStatFilter === 'suppliers' ? (
                      filteredSuppliers.map((supplier) => (
                        <tr key={supplier.id}>
                          <td>{supplier.companyName || supplier.name || 'N/A'}</td>
                          <td>External Supplier</td>
                          <td>{supplier.phone || '—'}</td>
                          <td>{supplier.email || '—'}</td>
                        </tr>
                      ))
                    ) : filteredUsers.length === 0 ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>පරිශීලකයින් හමු නොවීය.</td></tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id}>
                          <td>{user.name || 'N/A'}</td>
                          <td>{user.email || '—'}</td>
                          <td>{user.phone || 'N/A'}</td>
                          <td>
                            <span className={`role-badge-custom ${user.role || 'staff'}`}>
                              {user.role === 'supplier' ? 'External Supplier' : user.role || 'user'}
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
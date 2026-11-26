import React, { useState, useEffect } from 'react';

// Firebase Imports
import { db } from '../firebase/firebase';
import { collection, doc, deleteDoc, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore';
import { getLowStockRequestIngredients } from '../utils/inventoryStock';
import {
  DEFAULT_MEDICINE_RECIPES,
  ensureDefaultMedicineRecipes,
  getRecipeIngredientsForRequest
} from '../utils/medicineRecipes';

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
  const [inventoryItemsById, setInventoryItemsById] = useState({});
  const [medicineRecipes, setMedicineRecipes] = useState(DEFAULT_MEDICINE_RECIPES);
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
    const unsubscribeInventory = onSnapshot(
      collection(db, 'inventory'),
      (snapshot) => {
        setInventoryItemsById(Object.fromEntries(
          snapshot.docs.map((inventoryDoc) => [inventoryDoc.id, inventoryDoc.data()])
        ));
      },
      (error) => console.error('Error fetching medicine ingredients:', error)
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

  const getRequestIngredientNames = (request) => {
    return getLowStockRequestIngredients(request, inventoryItemsById[request.inventoryId]);
  };
  const getRequestIngredientDetails = (request) => {
    const recipeIngredients = getRecipeIngredientsForRequest(medicineRecipes, request);
    if (recipeIngredients.length > 0) return recipeIngredients;
    return getRequestIngredientNames(request).map((name) => ({ name, quantity: null, unit: '' }));
  };
  const formatIngredientDetails = (ingredients) => ingredients.map((ingredient) =>
    ingredient.quantity == null
      ? ingredient.name
      : `${ingredient.name} ${ingredient.quantity}${ingredient.unit || ''}`
  ).join(', ');

  const handleAcceptSupplyRequest = async (request) => {
    const supplierIds = supplierSelections[request.id] || [];
    if (supplierIds.length === 0) {
      alert('අවම වශයෙන් එක් සැපයුම්කරුවෙකු තෝරන්න.');
      return;
    }

    const ingredientDetails = getRequestIngredientDetails(request);
    if (ingredientDetails.length === 0) {
      alert('මෙම ඉල්ලීමට අවශ්‍ය අමුද්‍රව්‍ය සඳහන් කර නැත.');
      return;
    }
    const ingredientNames = ingredientDetails.map((ingredient) => ingredient.name);

    const selectedSuppliers = suppliers.filter((supplier) => supplierIds.includes(supplier.id));
    if (selectedSuppliers.length !== supplierIds.length) {
      alert('තෝරාගත් සැපයුම්කරුවෙකු සොයාගත නොහැක.');
      return;
    }

    setAcceptingRequestId(request.id);
    try {
      const requestNumber = `SR-${Date.now().toString().slice(-8)}`;
      const supplierNames = selectedSuppliers.map((supplier) =>
        supplier.companyName || supplier.name || supplier.email
      );
      const batch = writeBatch(db);

      selectedSuppliers.forEach((supplier, index) => {
        batch.set(doc(collection(db, 'supplier_requests')), {
          requestNumber,
          lowStockRequestId: request.id,
          supplierId: supplier.id,
          supplierName: supplierNames[index],
          ingredientName: formatIngredientDetails(ingredientDetails),
          ingredientNames,
          ingredients: ingredientDetails,
          status: 'approved',
          expectedDate: null,
          deliveryDate: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });

      batch.update(doc(db, 'low_stock_requests', request.id), {
        status: 'approved',
        supplierIds,
        supplierNames,
        supplierId: selectedSuppliers.length === 1 ? selectedSuppliers[0].id : null,
        supplierName: supplierNames.join(', '),
        requestNumber,
        acceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await batch.commit();
      alert('ඉල්ලීම අනුමත කර සැපයුම්කරුට යවන ලදී.');
    } catch (error) {
      console.error('Error accepting low-stock supply request:', error);
      alert('ඉල්ලීම අනුමත කිරීමේදී දෝෂයක් ඇති විය.');
    } finally {
      setAcceptingRequestId('');
    }
  };

  const toggleSupplierSelection = (requestId, supplierId) => {
    setSupplierSelections((current) => {
      const selectedIds = current[requestId] || [];
      const nextSelectedIds = selectedIds.includes(supplierId)
        ? selectedIds.filter((selectedId) => selectedId !== supplierId)
        : [...selectedIds, supplierId];

      return { ...current, [requestId]: nextSelectedIds };
    });
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
                      <th>අවශ්‍ය අමුද්‍රව්‍ය</th>
                      <th>වත්මන් තොගය</th>
                      <th>සැපයුම්කරු</th>
                      <th>තත්ත්වය</th>
                      <th>ක්‍රියා</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplyRequests.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>සැපයුම් ඉල්ලීම් නොමැත.</td>
                      </tr>
                    ) : supplyRequests.map((request) => (
                      <tr key={request.id}>
                        <td>{formatIngredientDetails(getRequestIngredientDetails(request)) || '—'}</td>
                        <td>{request.currentStock} ({request.unit})</td>
                        <td>
                          {request.status === 'approved' ? (
                            <strong>{request.supplierNames?.join(', ') || request.supplierName || '—'}</strong>
                          ) : (
                            <details className="supplier-multiselect">
                              <summary>
                                {supplierSelections[request.id]?.length
                                  ? `${supplierSelections[request.id].length} සැපයුම්කරුවන් තෝරා ඇත`
                                  : 'සැපයුම්කරුවන් තෝරන්න'}
                              </summary>
                              <div className="supplier-multiselect-options">
                                {suppliers.map((supplier) => (
                                  <label key={supplier.id} className="supplier-multiselect-option">
                                    <input
                                      type="checkbox"
                                      checked={(supplierSelections[request.id] || []).includes(supplier.id)}
                                      onChange={() => toggleSupplierSelection(request.id, supplier.id)}
                                      disabled={acceptingRequestId === request.id}
                                    />
                                    <span>{supplier.companyName || supplier.name || supplier.email}</span>
                                  </label>
                                ))}
                              </div>
                            </details>
                          )}
                        </td>
                        <td>
                          <span className={`role-badge-custom ${request.status === 'approved' ? 'supplier' : 'staff'}`}>
                            {request.status === 'approved' ? 'අනුමතයි' : 'පරිපාලක වෙත යවන ලදී'}
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
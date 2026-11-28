import React, { useState, useEffect } from 'react';

// Firebase Imports
import { db } from '../firebase/firebase';
import { collection, doc, deleteDoc, onSnapshot, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { getLowStockRequestIngredients } from '../utils/inventoryStock';
import {
  calculateRecipeProductionEstimate,
  DEFAULT_MEDICINE_RECIPES,
  ensureDefaultMedicineRecipes,
  getIngredientProductionEstimates,
  getRecipeIngredientsForRequest
} from '../utils/medicineRecipes';

// CSS File Import
import './Admin.css';

// Asset Imports
import heroBanner from '../assets/Medicine.jpg';
import SidebarAdmin from '../components/SidebarAdmin';
import RoleTopbar from '../components/RoleTopbar';

const normalizeIngredientName = (name) =>
  String(name || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, doctors: 0, staff: 0, patients: 0 });
  const [suppliers, setSuppliers] = useState([]);
  const [supplyRequests, setSupplyRequests] = useState([]);
  const [inventoryItemsById, setInventoryItemsById] = useState({});
  const [ingredientStockByName, setIngredientStockByName] = useState({});
  const [medicineRecipes, setMedicineRecipes] = useState(DEFAULT_MEDICINE_RECIPES);
  const [supplierSelections, setSupplierSelections] = useState({});
  const [productionEstimates, setProductionEstimates] = useState({});
  const [estimateModalRequest, setEstimateModalRequest] = useState(null);
  const [estimateRecipeId, setEstimateRecipeId] = useState('');
  const [estimateIngredientAmounts, setEstimateIngredientAmounts] = useState([]);
  const [savingEstimate, setSavingEstimate] = useState(false);
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
    const unsubscribeIngredientStock = onSnapshot(
      collection(db, 'ingredients'),
      (snapshot) => {
        const ingredientsByName = {};
        snapshot.docs.forEach((ingredientDoc) => {
          const ingredient = ingredientDoc.data();
          const nameKey = normalizeIngredientName(ingredient.name);
          if (nameKey) ingredientsByName[nameKey] = ingredient;
        });
        setIngredientStockByName(ingredientsByName);
      },
      (error) => console.error('Error fetching ingredient stock quantities:', error)
    );

    return () => {
      unsubscribeUsers();
      unsubscribePatients();
      unsubscribeSupplyRequests();
      unsubscribeInventory();
      unsubscribeIngredientStock();
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
  const getProductionEstimateOptions = (request) => {
    if (request.requestType === 'ingredient') {
      return getIngredientProductionEstimates(
        medicineRecipes,
        request.ingredientName || request.itemName,
        request.quantity,
        request.unit
      );
    }

    const packageUnit = request.packageUnit || null;
    const matchesPackage = (recipe) => (recipe.stockPackageUnit || null) === packageUnit;
    const recipe = medicineRecipes.find((item) =>
      item.medicineCode === request.itemCode && matchesPackage(item)
    ) || medicineRecipes.find((item) =>
      item.medicineName === request.itemName && matchesPackage(item)
    );
    return recipe ? [{
      recipeId: recipe.id,
      medicineCode: recipe.medicineCode || '',
      medicineName: recipe.medicineName || '',
      packageType: recipe.packageType || '',
      possibleQuantity: Number(request.quantity) || 0
    }] : [];
  };
  const getInitialEstimateAmounts = (request, recipe) => {
    const savedEstimate = productionEstimates[request.id] || request.productionEstimate;
    const savedAmounts = savedEstimate?.recipeId === recipe.id
      ? savedEstimate.ingredientAmounts || []
      : [];
    const requestedIngredientKey = request.requestType === 'ingredient'
      ? normalizeIngredientName(request.ingredientName || request.itemName)
      : '';

    return (recipe.ingredients || []).map((ingredient, index) => {
      const savedAmount = savedAmounts[index]?.name === ingredient.name
        ? savedAmounts[index]
        : savedAmounts.find((amount) =>
          normalizeIngredientName(amount.name) === normalizeIngredientName(ingredient.name)
        );
      const ingredientKey = normalizeIngredientName(ingredient.name);
      const stockItem = ingredientStockByName[ingredientKey];
      const isRequestedIngredient =
        request.requestType === 'ingredient' && ingredientKey === requestedIngredientKey;
      const defaultQuantity = isRequestedIngredient
        ? (Number(request.currentStock) || 0) + (Number(request.quantity) || 0)
        : stockItem?.quantity ?? '';

      return {
        name: ingredient.name,
        quantity: savedAmount?.quantity ?? defaultQuantity,
        unit: savedAmount?.unit || (isRequestedIngredient
          ? request.unit || ingredient.unit
          : stockItem?.unit || ingredient.unit)
      };
    });
  };
  const openProductionEstimateModal = (request) => {
    const estimateOptions = getProductionEstimateOptions(request);
    if (estimateOptions.length === 0) {
      alert('මෙම අමුද්‍රව්‍යය භාවිතා කරන වට්ටෝරුවක් සොයාගත නොහැක.');
      return;
    }

    const savedEstimate = productionEstimates[request.id] || request.productionEstimate;
    const recipeId = estimateOptions.some((estimate) => estimate.recipeId === savedEstimate?.recipeId)
      ? savedEstimate.recipeId
      : estimateOptions[0].recipeId;
    const recipe = medicineRecipes.find((item) => item.id === recipeId);
    if (!recipe) {
      alert('තෝරාගත් ඖෂධ වට්ටෝරුව සොයාගත නොහැක.');
      return;
    }

    setEstimateModalRequest(request);
    setEstimateRecipeId(recipeId);
    setEstimateIngredientAmounts(getInitialEstimateAmounts(request, recipe));
  };
  const handleEstimateRecipeChange = (recipeId) => {
    const recipe = medicineRecipes.find((item) => item.id === recipeId);
    if (!recipe || !estimateModalRequest) return;

    setEstimateRecipeId(recipeId);
    setEstimateIngredientAmounts(getInitialEstimateAmounts(estimateModalRequest, recipe));
  };
  const handleEstimateIngredientAmountChange = (index, quantity) => {
    setEstimateIngredientAmounts((current) => current.map((ingredient, itemIndex) =>
      itemIndex === index ? { ...ingredient, quantity } : ingredient
    ));
  };
  const handleSaveProductionEstimate = async () => {
    if (!estimateModalRequest) return;
    const recipe = medicineRecipes.find((item) => item.id === estimateRecipeId);
    if (!recipe) {
      alert('ඖෂධ වට්ටෝරුවක් තෝරන්න.');
      return;
    }

    const missingQuantity = estimateIngredientAmounts.some((ingredient) =>
      String(ingredient.quantity).trim() === '' ||
      !Number.isFinite(Number(ingredient.quantity)) ||
      Number(ingredient.quantity) < 0
    );
    if (missingQuantity) {
      alert('සෑම අමුද්‍රව්‍යයකටම ඇති ප්‍රමාණය ඇතුළත් කරන්න. තොගය නොමැති නම් 0 ඇතුළත් කරන්න.');
      return;
    }

    const availableIngredients = estimateIngredientAmounts.map((ingredient) => ({
      ...ingredient,
      quantity: Number(ingredient.quantity)
    }));
    const calculation = calculateRecipeProductionEstimate(recipe, availableIngredients);
    if (!calculation) {
      alert('මෙම වට්ටෝරුවෙන් නිෂ්පාදන ඇස්තමේන්තුවක් ගණනය කළ නොහැක.');
      return;
    }

    const productionEstimate = {
      recipeId: recipe.id,
      medicineCode: recipe.medicineCode || '',
      medicineName: recipe.medicineName || '',
      packageType: recipe.packageType || '',
      possibleQuantity: calculation.possibleQuantity,
      limitingIngredient: calculation.limitingIngredient,
      ingredientAmounts: availableIngredients,
      ingredientYields: calculation.ingredientYields
    };

    setSavingEstimate(true);
    try {
      await updateDoc(doc(db, 'low_stock_requests', estimateModalRequest.id), {
        productionEstimate,
        updatedAt: serverTimestamp()
      });
      setProductionEstimates((current) => ({
        ...current,
        [estimateModalRequest.id]: productionEstimate
      }));
    } catch (error) {
      console.error('Error saving ingredient production estimate:', error);
      alert('නිෂ්පාදන ඇස්තමේන්තුව සුරැකීමේදී දෝෂයක් ඇති විය.');
    } finally {
      setSavingEstimate(false);
    }
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
    const productionEstimateOptions = getProductionEstimateOptions(request);
    const productionEstimate = productionEstimates[request.id] || request.productionEstimate || null;
    if (
      productionEstimateOptions.length > 0 &&
      (!productionEstimate?.ingredientAmounts?.length ||
        !productionEstimateOptions.some((option) => option.recipeId === productionEstimate.recipeId))
    ) {
      alert('සැපයුම්කරුට යැවීමට පෙර නිෂ්පාදන ඇස්තමේන්තුව ගණනය කර සුරකින්න.');
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
      const supplierIngredientDetails = request.requestType === 'ingredient'
        ? ingredientDetails.map(({ name }) => ({ name }))
        : ingredientDetails;
      const ingredientRequestQuantity = request.requestType === 'ingredient'
        ? { quantity: request.quantity, unit: request.unit }
        : {};

      selectedSuppliers.forEach((supplier, index) => {
        batch.set(doc(collection(db, 'supplier_requests')), {
          requestNumber,
          lowStockRequestId: request.id,
          requestType: request.requestType || 'medicine',
          supplierId: supplier.id,
          supplierName: supplierNames[index],
          ingredientName: formatIngredientDetails(ingredientDetails),
          ingredientNames,
          ingredients: supplierIngredientDetails,
          ...ingredientRequestQuantity,
          productionEstimate,
          status: 'approved',
          expectedDate: null,
          deliveryDate: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });

      batch.update(doc(db, 'low_stock_requests', request.id), {
        status: 'approved',
        productionEstimate,
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

  const estimateModalRecipe = medicineRecipes.find((recipe) =>
    recipe.id === estimateRecipeId
  );
  const hasCompleteEstimateInputs = Boolean(
    estimateModalRecipe &&
    estimateIngredientAmounts.length === estimateModalRecipe.ingredients.length &&
    estimateIngredientAmounts.every((ingredient) =>
      String(ingredient.quantity).trim() !== '' &&
      Number.isFinite(Number(ingredient.quantity)) &&
      Number(ingredient.quantity) >= 0
    )
  );
  const liveEstimateCalculation = hasCompleteEstimateInputs
    ? calculateRecipeProductionEstimate(
      estimateModalRecipe,
      estimateIngredientAmounts.map((ingredient) => ({
        ...ingredient,
        quantity: Number(ingredient.quantity)
      }))
    )
    : null;
  const liveProductionEstimate = liveEstimateCalculation
    ? {
      medicineName: estimateModalRecipe.medicineName || '',
      packageType: estimateModalRecipe.packageType || '',
      possibleQuantity: liveEstimateCalculation.possibleQuantity,
      limitingIngredient: liveEstimateCalculation.limitingIngredient
    }
    : null;

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
                      <th>නිෂ්පාදන ඇස්තමේන්තුව</th>
                      <th>සැපයුම්කරු</th>
                      <th>ක්‍රියා</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplyRequests.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>සැපයුම් ඉල්ලීම් නොමැත.</td>
                      </tr>
                    ) : supplyRequests.map((request) => {
                      const estimateOptions = getProductionEstimateOptions(request);
                      const selectedEstimate =
                        productionEstimates[request.id] || request.productionEstimate;

                      return (
                        <tr key={request.id}>
                          <td>{formatIngredientDetails(getRequestIngredientDetails(request)) || '—'}</td>
                          <td>{request.currentStock} ({request.unit})</td>
                          <td>
                            {estimateOptions.length === 0 ? (
                              <span>ගැළපෙන වට්ටෝරුවක් නැත</span>
                            ) : (
                              <>
                                {request.status !== 'approved' && (
                                  <button
                                    type="button"
                                    onClick={() => openProductionEstimateModal(request)}
                                    disabled={acceptingRequestId === request.id || savingEstimate}
                                    style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1ddd5', background: '#fff', color: '#155e3f', cursor: 'pointer' }}
                                  >
                                    නිෂ්පාදන ඇස්තමේන්තුව
                                  </button>
                                )}
                                {selectedEstimate?.ingredientAmounts?.length ? (
                                  <small style={{ display: 'block', marginTop: '6px', color: '#166534' }}>
                                    {selectedEstimate.medicineName} - {selectedEstimate.packageType}: {selectedEstimate.possibleQuantity} ක්
                                    {selectedEstimate.limitingIngredient
                                      ? ` (සීමාකාරී අමුද්‍රව්‍යය: ${selectedEstimate.limitingIngredient})`
                                      : ''}
                                  </small>
                                ) : request.status !== 'approved' ? (
                                  <small style={{ display: 'block', marginTop: '6px', color: '#64748b' }}>
                                    තවම ගණනය කර නැත
                                  </small>
                                ) : (
                                  <small style={{ display: 'block', marginTop: '6px', color: '#64748b' }}>—</small>
                                )}
                              </>
                            )}
                          </td>
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {estimateModalRequest && estimateModalRecipe && (
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="production-estimate-title"
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px' }}
              >
                <section className="card-box" style={{ width: '620px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
                  <h2 id="production-estimate-title" style={{ margin: '0 0 8px', color: '#155e3f' }}>
                    නිෂ්පාදන ඇස්තමේන්තුව
                  </h2>
                  <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '13px' }}>
                    {estimateModalRequest.requestType === 'ingredient'
                      ? `ඉල්ලූ අමුද්‍රව්‍යය: ${estimateModalRequest.ingredientName || estimateModalRequest.itemName} ${estimateModalRequest.quantity} ${estimateModalRequest.unit} | දැනට තොගය: ${estimateModalRequest.currentStock} ${estimateModalRequest.unit}`
                      : `අඩු තොග ඖෂධය: ${estimateModalRequest.itemName} | ඉල්ලූ නිෂ්පාදන ප්‍රමාණය: ${estimateModalRequest.quantity} ${estimateModalRequest.unit}`}
                  </p>
                  <small style={{ display: 'block', marginBottom: '14px', color: '#64748b' }}>
                    ඉල්ලූ අමුද්‍රව්‍යයට දැනට ඇති තොගය සහ ඉල්ලූ ප්‍රමාණය එකතු කර ඇත. අනෙක් අමුද්‍රව්‍යවල තොග ප්‍රමාණද පුරවා ඇත; අවශ්‍ය නම් වෙනස් කරන්න.
                  </small>

                  <label style={{ display: 'block', marginBottom: '16px', fontWeight: '600', color: '#374151' }}>
                    ඖෂධ වට්ටෝරුව
                    <select
                      value={estimateRecipeId}
                      onChange={(event) => handleEstimateRecipeChange(event.target.value)}
                      style={{ display: 'block', width: '100%', marginTop: '6px', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff' }}
                    >
                      {getProductionEstimateOptions(estimateModalRequest).map((estimate) => (
                        <option key={estimate.recipeId} value={estimate.recipeId}>
                          {estimate.medicineCode} - {estimate.medicineName} - {estimate.packageType}
                        </option>
                      ))}
                    </select>
                  </label>

                  <p style={{ margin: '0 0 12px', color: '#64748b', fontSize: '13px' }}>
                    එක් නිෂ්පාදන ඒකකයකට අවශ්‍ය ප්‍රමාණය බලන්න. ඇති ප්‍රමාණ ඇතුළත් කරන විට නිෂ්පාදන ගණන ස්වයංක්‍රීයව යාවත්කාලීන වේ.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {estimateModalRecipe.ingredients.map((ingredient, index) => (
                      <div key={`${ingredient.name}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'center', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                        <div>
                          <strong>{ingredient.name}</strong>
                          <small style={{ display: 'block', marginTop: '4px', color: '#64748b' }}>
                            එක් {estimateModalRecipe.packageType || 'ඒකකයකට'} අවශ්‍ය: {ingredient.quantity} {ingredient.unit}
                          </small>
                        </div>
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                          ඇති ප්‍රමාණය ({estimateIngredientAmounts[index]?.unit || ingredient.unit})
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={estimateIngredientAmounts[index]?.quantity ?? ''}
                            onChange={(event) => handleEstimateIngredientAmountChange(index, event.target.value)}
                            style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '4px', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                          />
                        </label>
                      </div>
                    ))}
                  </div>

                  {liveProductionEstimate ? (
                    <div role="status" style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', background: '#ecfdf5', color: '#166534' }}>
                      <strong>
                        {liveProductionEstimate.medicineName} නිෂ්පාදනය කළ හැකි ආසන්න ප්‍රමාණය: {liveProductionEstimate.possibleQuantity} {liveProductionEstimate.packageType}
                      </strong>
                      <small style={{ display: 'block', marginTop: '4px' }}>
                        සීමාකාරී අමුද්‍රව්‍යය: {liveProductionEstimate.limitingIngredient}
                      </small>
                    </div>
                  ) : (
                    <small style={{ display: 'block', marginTop: '16px', color: '#64748b' }}>
                      ඇස්තමේන්තුව බැලීමට සියලු අමුද්‍රව්‍ය ප්‍රමාණ ඇතුළත් කරන්න.
                    </small>
                  )}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
                    <button
                      type="button"
                      onClick={() => setEstimateModalRequest(null)}
                      disabled={savingEstimate}
                      style={{ flex: 1, padding: '10px', border: 0, borderRadius: '8px', background: '#f3ede2', color: '#5c4a42', fontWeight: '600', cursor: 'pointer' }}
                    >
                      වසන්න
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProductionEstimate}
                      disabled={savingEstimate || !liveProductionEstimate}
                      style={{ flex: 1, padding: '10px', border: 0, borderRadius: '8px', background: '#1a5a38', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
                    >
                      {savingEstimate ? 'සුරකිමින්...' : 'ඇස්තමේන්තුව සුරකින්න'}
                    </button>
                  </div>
                </section>
              </div>
            )}

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
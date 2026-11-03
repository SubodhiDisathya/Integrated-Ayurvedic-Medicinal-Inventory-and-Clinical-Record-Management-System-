import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';
import logoTop from '../assets/logo-top.png';
import bannerHero from '../assets/supplier-hero.png';
import cornerLeaves from '../assets/corner-leaves.png';
import './SupplierPortal.css';

const formatDate = (value) => {
  if (!value) return '—';
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toISOString().slice(0, 10);
};

const getRequestStatus = (status = '') => {
  const normalized = String(status).toLowerCase();
  if (['delivered', 'completed', 'සම්පූර්ණයි', 'ලැබී ඇත'].includes(normalized)) {
    return { label: 'සම්පූර්ණයි', className: 'completed' };
  }
  if (['approved', 'accepted', 'අනුමතයි'].includes(normalized)) {
    return { label: 'අනුමතයි', className: 'approved' };
  }
  return { label: 'පොරොත්තුවෙන්', className: 'pending' };
};

export default function SupplierPortal() {
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [requests, setRequests] = useState([]);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [error, setError] = useState('');

  useEffect(() => {
    let unsubscribeSupplier;
    let unsubscribeRequests;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }

      unsubscribeSupplier?.();
      unsubscribeRequests?.();
      setError('');

      unsubscribeSupplier = onSnapshot(
        doc(db, 'users', user.uid),
        (snapshot) => {
          setSupplier({
            uid: user.uid,
            email: user.email || '',
            ...(snapshot.exists() ? snapshot.data() : {})
          });
        },
        (snapshotError) => {
          console.error('Error fetching supplier profile:', snapshotError);
          setError('සැපයුම්කරුගේ ගිණුම් තොරතුරු ලබාගත නොහැක.');
        }
      );

      unsubscribeRequests = onSnapshot(
        query(collection(db, 'supplier_requests'), where('supplierId', '==', user.uid)),
        (snapshot) => {
          setRequests(snapshot.docs.map((requestDoc) => ({
            id: requestDoc.id,
            ...requestDoc.data()
          })));
        },
        (snapshotError) => {
          console.error('Error fetching supplier requests:', snapshotError);
          setError('ඇණවුම් තොරතුරු ලබාගත නොහැක.');
        }
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSupplier?.();
      unsubscribeRequests?.();
    };
  }, [navigate]);

  const pendingCount = requests.filter((request) =>
    getRequestStatus(request.status).className === 'pending'
  ).length;
  const completedCount = requests.filter((request) =>
    getRequestStatus(request.status).className === 'completed'
  ).length;

  const goToSection = (section) => {
    setActiveSection(section);
    document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login', { replace: true });
    } catch (logoutError) {
      console.error('Error signing out supplier:', logoutError);
      setError('පිටවීමේදී දෝෂයක් ඇති විය. නැවත උත්සාහ කරන්න.');
    }
  };

  const supplierName = supplier?.companyName || supplier?.name || 'සැපයුම්කරු';

  return (
    <div className="supplier-portal">
      <aside className="supplier-sidebar">
        <div className="supplier-brand">
          <div className="supplier-brand-logo">
            <img src={logoTop} alt="" />
          </div>
          <h1>ආයුර්වේද ඖෂධාලය</h1>
          <p>බාහිර සැපයුම්කරු පෝර්ටලය</p>
          <span>SUPPLIER PORTAL</span>
        </div>

        <nav className="supplier-nav" aria-label="සැපයුම්කරු මෙනුව">
          <button
            type="button"
            className={activeSection === 'dashboard' ? 'active' : ''}
            onClick={() => goToSection('dashboard')}
          >
            <i className="bi bi-house-door-fill" /> මුල් පිටුව
          </button>
          <button
            type="button"
            className={activeSection === 'requests' ? 'active' : ''}
            onClick={() => goToSection('requests')}
          >
            <i className="bi bi-clipboard2-check" /> ඉල්ලීම් ලැයිස්තුව
          </button>
          <button
            type="button"
            className={activeSection === 'supplier-details' ? 'active' : ''}
            onClick={() => goToSection('supplier-details')}
          >
            <i className="bi bi-person-vcard" /> සැපයුම්කරු තොරතුරු
          </button>
        </nav>

        <button type="button" className="supplier-logout-button" onClick={handleLogout}>
          <i className="bi bi-box-arrow-left" /> ඉවත් වීම
        </button>

        <img className="supplier-sidebar-leaves" src={cornerLeaves} alt="" />
      </aside>

      <main className="supplier-main">
        <header className="supplier-topbar">
          <div className="supplier-topbar-title supplier-welcome">
            <span aria-hidden="true">🍃</span>
            <strong>ඔබට සුභ දවසක්!</strong>
          </div>
          <div className="supplier-topbar-account">
            <i className="bi bi-bell-fill" aria-hidden="true" />
            <span className="supplier-notification-count">{pendingCount}</span>
            <i className="bi bi-person-circle" aria-hidden="true" />
            <span>{supplierName}</span>
          </div>
        </header>

        <div className="supplier-content" id="dashboard">
          {error && <div className="supplier-error" role="alert">{error}</div>}

          <section className="supplier-hero" style={{ backgroundImage: `url(${bannerHero})` }}>
            <div className="supplier-hero-copy">
              <h2>සැපයුම්කරු පුවරුව</h2>
              <p>ඔබගේ සැපයුම් සහ ඇණවුම් මෙතැනින් කළමනාකරණය කරන්න.</p>
            </div>
          </section>

          <section className="supplier-stat-grid" aria-label="සැපයුම් සාරාංශය">
            <article className="supplier-stat-card">
              <span className="supplier-stat-icon green"><i className="bi bi-clipboard2-check" /></span>
              <div><span>මුළු ඉල්ලීම්</span><strong>{requests.length}</strong></div>
              <i className="bi bi-chevron-right supplier-stat-arrow" />
            </article>
            <article className="supplier-stat-card">
              <span className="supplier-stat-icon amber"><i className="bi bi-clock-history" /></span>
              <div><span>නව ඉල්ලීම්</span><strong>{pendingCount}</strong></div>
              <i className="bi bi-chevron-right supplier-stat-arrow" />
            </article>
            <article className="supplier-stat-card">
              <span className="supplier-stat-icon mint"><i className="bi bi-check-circle-fill" /></span>
              <div><span>සම්පූර්ණ කළ ඉල්ලීම්</span><strong>{completedCount}</strong></div>
              <i className="bi bi-chevron-right supplier-stat-arrow" />
            </article>
          </section>

          <div className="supplier-dashboard-grid">
            <section className="supplier-panel supplier-requests-panel" id="requests">
              <div className="supplier-panel-heading">
                <h2><span />මෑතකාලීන ඉල්ලීම්</h2>
                <span className="supplier-live-label"><i className="bi bi-broadcast" /> සජීවී යාවත්කාලීන</span>
              </div>
              <div className="supplier-table-wrap">
                <table className="supplier-request-table">
                  <thead>
                    <tr>
                      <th>ඉල්ලීම් අංකය</th>
                      <th>අමුද්‍රව්‍ය</th>
                      <th>ඉල්ලූ ප්‍රමාණය</th>
                      <th>අපේක්ෂිත දිනය</th>
                      <th>තත්ත්වය</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.length ? requests.map((request) => {
                      const status = getRequestStatus(request.status);
                      return (
                        <tr key={request.id}>
                          <td>{request.requestNumber || request.code || request.id}</td>
                          <td>{request.ingredientName || request.ingredient || request.itemName || '—'}</td>
                          <td>{request.quantity != null ? `${request.quantity} ${request.unit || ''}` : '—'}</td>
                          <td>{formatDate(request.expectedDate || request.deliveryDate)}</td>
                          <td><span className={`supplier-status ${status.className}`}>{status.label}</span></td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan="5" className="supplier-empty-cell">
                          <i className="bi bi-inbox" />
                          <span>දැනට ඔබට ලැබුණු සැපයුම් ඉල්ලීම් නොමැත.</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className="supplier-side-panels">
              <section className="supplier-panel supplier-profile-panel" id="supplier-details">
                <div className="supplier-panel-heading">
                  <h2><span />සැපයුම්කරුගේ තොරතුරු</h2>
                </div>
                <div className="supplier-profile-heading">
                  <div className="supplier-profile-mark"><i className="bi bi-flower3" /></div>
                  <div>
                    <strong>{supplierName}</strong>
                    <small>සැපයුම්කරු ගිණුම</small>
                  </div>
                </div>
                <div className="supplier-contact-line">
                  <i className="bi bi-telephone-fill" /><span>{supplier?.phone || 'දුරකථන අංකය ඇතුළත් කර නැත'}</span>
                </div>
                <div className="supplier-contact-line">
                  <i className="bi bi-envelope-fill" /><span>{supplier?.email || '—'}</span>
                </div>
                {supplier?.address && (
                  <div className="supplier-contact-line">
                    <i className="bi bi-geo-alt-fill" /><span>{supplier.address}</span>
                  </div>
                )}
              </section>

              <section className="supplier-panel supplier-help-panel">
                <div className="supplier-panel-heading"><h2><span />උදව් සහ සහාය</h2></div>
                <p>සැපයුම් ඉල්ලීම් පිළිබඳ සහාය අවශ්‍ය නම් පද්ධති පරිපාලක අමතන්න.</p>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

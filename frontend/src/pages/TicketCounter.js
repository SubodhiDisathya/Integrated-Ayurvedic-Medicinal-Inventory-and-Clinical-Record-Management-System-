import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

// නිවැරදි ෆෝල්ඩර මාර්ගය (Path) යොදා Sidebar එක ඉම්පෝට් කිරීම[cite: 6]
import SidebarTicket from '../components/Sidebar_ticket'; 

import bannerHero from '../assets/banner-hero.jpeg';

export default function TicketCounter() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalPatients: 0,
    todayVisits: 0,
    todayNewPatients: 0,
    notYetVisited: 0,
    sentToDoctor: 0
  });

  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    const patientsUnsub = onSnapshot(collection(db, 'patients'), (snapshot) => {
      const totalCount = snapshot.size;
      let newTodayCount = 0;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let createdDate = '';
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          createdDate = data.createdAt.toDate().toISOString().split('T')[0];
        } else if (data.createdAt) {
          createdDate = String(data.createdAt).split('T')[0];
        }
        if (createdDate === todayStr) newTodayCount++;
      });
      setStats((prev) => ({ ...prev, totalPatients: totalCount, todayNewPatients: newTodayCount }));
    });

    const visitsUnsub = onSnapshot(collection(db, 'visits'), (snapshot) => {
      let todayVisitsCount = 0;
      let waitingCount = 0;
      let sentCount = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let visitDate = '';
        if (data.visitDate && typeof data.visitDate.toDate === 'function') {
          visitDate = data.visitDate.toDate().toISOString().split('T')[0];
        } else if (data.visitDate) {
          visitDate = String(data.visitDate).split('T')[0];
        }

        if (visitDate === todayStr) {
          todayVisitsCount++;
          if (data.status === 'Waiting for Doctor') waitingCount++;
          if (data.status === 'Sent to Doctor') sentCount++;
        }
      });

      setStats((prev) => ({
        ...prev,
        todayVisits: todayVisitsCount,
        notYetVisited: waitingCount,
        sentToDoctor: sentCount
      }));
    });

    return () => {
      patientsUnsub();
      visitsUnsub();
    };
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f7f2e7', width: '100vw', overflowX: 'hidden', fontFamily: 'sans-serif' }}>
      
      {/* --- Sidebar Component --- */}
      <SidebarTicket />

      {/* --- Main Content Area --- */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
        
        {/* Top Bar */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', backgroundColor: '#fffdf9', borderBottom: '1px solid #e4ddc9' }}>
          <div style={{ fontWeight: '700', color: '#0f3d27', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
            <span>🍃</span> ඔබට සුභ දවසක්!
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button style={{ background: '#eef2e8', border: '1px solid #e4ddc9', padding: '8px 14px', borderRadius: '50px', fontSize: '0.9rem', color: '#0f3d27', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', position: 'relative' }}>
              <i className="bi bi-bell"></i>
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', backgroundColor: '#c1483f', color: '#ffffff', fontSize: '0.65rem', padding: '2px 5px', borderRadius: '50%' }}>3</span>
            </button>
            <button style={{ background: '#eef2e8', border: '1px solid #e4ddc9', padding: '8px 14px', borderRadius: '50px', fontSize: '0.9rem', color: '#0f3d27', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
              <i className="bi bi-person-circle"></i>
              <span>පිළිගනිමු</span>
            </button>
          </div>
        </header>

        <div style={{ padding: '28px 32px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          
          {/* Hero Banner */}
          <div style={{ position: 'relative', width: '100%', height: '260px', borderRadius: '16px', overflow: 'hidden', marginBottom: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
            <img src={bannerHero} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 25%', display: 'block' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, width: '65%', height: '100%', background: 'linear-gradient(90deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.82) 70%, rgba(255,255,255,0) 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: '35px' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#0f3d27', margin: '0 0 6px 0' }}>ප්‍රවේශපත්‍ර කවුන්ටරය</h1>
              <p style={{ fontSize: '1rem', fontWeight: '600', color: '#c78a3d', margin: '0 0 4px 0' }}>සුවය සුරකිමු, ජීවිතය සවිමත් කරමු</p>
              <p style={{ fontSize: '0.9rem', fontWeight: '500', color: '#35452f', margin: 0 }}>ආයුර්වේද සුවය ඔබේ ළඟට</p>
            </div>
          </div>

          {/* Stats Grid */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            <div style={{ background: '#fffdf9', borderRadius: '12px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', border: '1px solid #e4ddc9' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#0f3d27' }}>{stats.totalPatients}</div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#1c2a1d' }}>රෝගී සංඛ්‍යාව</h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#35452f' }}>ලියාපදිංචි රෝගීන්</p>
              </div>
            </div>

            <div style={{ background: '#fffdf9', borderRadius: '12px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', border: '1px solid #e4ddc9' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#0f3d27' }}>{stats.todayVisits}</div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#1c2a1d' }}>රෝගී පැමිණීම</h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#35452f' }}>අද දින</p>
              </div>
            </div>
          </section>

          {/* Lower Grid */}
          <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
            <div style={{ background: '#fffdf9', borderRadius: '12px', padding: '24px', border: '1px solid #e4ddc9' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f3d27', margin: '0 0 20px 0' }}><span style={{ color: '#c78a3d', fontWeight: '900' }}>|</span> ඉක්මන් මෙනුව</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button onClick={() => navigate('/ticket/patients-today')} style={{ width: '100%', padding: '13px 18px', borderRadius: '10px', border: 'none', background: '#0f3d27', color: '#ffffff', fontSize: '0.92rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <i className="bi bi-person-plus"></i> නව රෝගී ලියාපදිංචිය
                </button>
                <button onClick={() => navigate('/ticket/history')} style={{ width: '100%', padding: '13px 18px', borderRadius: '10px', border: '1px solid #e4ddc9', background: '#e5eedb', color: '#0f3d27', fontSize: '0.92rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <i className="bi bi-search"></i> රෝගී වාර්තා සොයන්න
                </button>
              </div>
            </div>

            <div style={{ background: '#fffdf9', borderRadius: '12px', padding: '24px', border: '1px solid #e4ddc9' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f3d27', margin: '0 0 20px 0' }}><span style={{ color: '#c78a3d', fontWeight: '900' }}>|</span> අද සංඛ්‍යාලේඛන</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <li style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#e5eedb', borderRadius: '8px', border: '1px dashed #e4ddc9', color: '#1c2a1d' }}>
                  <span><i className="bi bi-person-check"></i> සම්පූර්ණ රෝගීන්</span>
                  <span style={{ fontWeight: '800', color: '#0f3d27' }}>{stats.todayVisits}</span>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#e5eedb', borderRadius: '8px', border: '1px dashed #e4ddc9', color: '#1c2a1d' }}>
                  <span><i className="bi bi-person-plus"></i> අද දින පැමිණි නව රෝගීන්</span>
                  <span style={{ fontWeight: '800', color: '#0f3d27' }}>{stats.todayNewPatients}</span>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#e5eedb', borderRadius: '8px', border: '1px dashed #e4ddc9', color: '#1c2a1d' }}>
                  <span><i className="bi bi-hourglass-split"></i> නොපැමිණි රෝගීන්</span>
                  <span style={{ fontWeight: '800', color: '#0f3d27' }}>{stats.notYetVisited}</span>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#e5eedb', borderRadius: '8px', border: '1px dashed #e4ddc9', color: '#1c2a1d' }}>
                  <span><i className="bi bi-arrow-right-circle"></i> වෛද්‍යවරයාට යවා ඇත</span>
                  <span style={{ fontWeight: '800', color: '#0f3d27' }}>{stats.sentToDoctor}</span>
                </li>
              </ul>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
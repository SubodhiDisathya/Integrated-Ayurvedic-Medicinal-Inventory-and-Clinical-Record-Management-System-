import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import './TicketCounter_Queuemanagement.css';

const QueueManagement = () => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    try {
      const q = query(collection(db, 'queue'), orderBy('createdAt', 'asc'));
      const snapshot = await getDocs(q);
      const queueData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(item => item.status === 'Waiting');
      setQueue(queueData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQueue(); }, []);

  const sendToDoctor = async (id) => {
    try {
      await updateDoc(doc(db, 'queue', id), { status: 'Sent to Doctor' });
      fetchQueue();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="queue-container">
      <h2>Current Waiting Queue</h2>

      {loading && <p className="loading-text">Loading queue...</p>}

      {!loading && queue.length === 0 && (
        <p className="empty-text">No patients in queue.</p>
      )}

      {queue.map((patient) => (
        <div key={patient.id} className="queue-card">
          <div className="ticket-badge">{patient.ticketNumber}</div>
          <div className="patient-info">
            <h3>{patient.fullName}</h3>
            <p>Patient ID: {patient.patientId}</p>
          </div>
          <span className="status-badge">Waiting</span>
          <button className="send-btn" onClick={() => sendToDoctor(patient.id)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            Send to Doctor
          </button>
        </div>
      ))}
    </div>
  );
};

export default QueueManagement;
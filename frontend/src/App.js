import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Pages Import
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Register from './pages/Register';
import TicketCounter from './pages/TicketCounter';
import TicketCounterRegisterpatient from './pages/TicketCounter_Registerpatient';
import TicketCounterPatientrecords from './pages/TicketCounter_Patientrecords';

// Doctor Pages Import
import DoctorCounter from './pages/Doctor/DoctorCounter';
import Doctorspatient from './pages/Doctor/Doctorspatient';
import DoctorConsultation from './pages/Doctor/DoctorConsultation';
import Treatmenthistory from './pages/Doctor/Treatmenthistory';

// Pharmacy Pages Import
import PharmacyDashboard from './pages/Pharmacy/PharmacyDashboard';
import PharmacyPatientPrescription from './pages/Pharmacy/PharmacyPatientPrescription';
import PharmacyInventory from './pages/Pharmacy/PharmacyInventory'; // 👈 මෙතන ඉන්වෙන්ටරි පේජ් එක ඉම්පෝට් කරන්න

import Admin from './pages/Admin';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/ticket-counter" element={<TicketCounter />} />
        <Route path="/ticket-counter/register-patient" element={<TicketCounterRegisterpatient />} />
        <Route path="/ticket-counter/records" element={<TicketCounterPatientrecords />} />

        {/* Doctor Routes */}
        <Route path="/doctor" element={<DoctorCounter />} />
        <Route path="/doctor/dashboard" element={<DoctorCounter />} />
        <Route path="/doctor/todays-patients" element={<Doctorspatient />} />
        <Route path="/doctor/consultation/:id" element={<DoctorConsultation />} />
        
        {/* Treatment History Route */}
        <Route path="/doctor/treatment-history" element={<Treatmenthistory />} />

        {/* Pharmacy Routes */}
        <Route path="/pharmacy" element={<Navigate to="/pharmacy/dashboard" replace />} />
        <Route path="/pharmacy/dashboard" element={<PharmacyDashboard />} />
        <Route path="/pharmacy/inventory" element={<PharmacyInventory />} /> 
        <Route path="/pharmacy/prescriptions" element={<PharmacyPatientPrescription />} />
        <Route path="/pharmacy/issue" element={<PharmacyPatientPrescription />} />

        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
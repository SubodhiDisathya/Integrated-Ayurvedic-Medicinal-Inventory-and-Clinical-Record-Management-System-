const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { db } = require('./config/db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ============ ROUTES ============
// Auth routes (login, register)
app.use('/api/auth', require('./routes/authRoutes'));

// Patient routes
app.use('/api/patients', require('./routes/patientRoutes'));
// ================================

// Test route
app.get('/', (req, res) => {
    res.json({ 
        success: true, 
        message: '✅ Ayurvedic System Backend is running!' 
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📋 Available routes:`);
    console.log(`   POST http://localhost:${PORT}/api/auth/register`);
    console.log(`   POST http://localhost:${PORT}/api/auth/login`);
    console.log(`   GET  http://localhost:${PORT}/api/patients/all`);
    console.log(`   POST http://localhost:${PORT}/api/patients/add`);
});
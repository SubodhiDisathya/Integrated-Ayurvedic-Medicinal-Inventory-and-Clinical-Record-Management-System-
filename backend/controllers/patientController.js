const { db } = require('../config/db');

const addPatient = async (req, res) => {
  try {
    const { name, age, gender, contact, address } = req.body;
    const docRef = await db.collection('patients').add({
      name, age, gender, contact, address,
      createdAt: new Date()
    });
    res.json({ success: true, message: 'Patient Added!', id: docRef.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPatients = async (req, res) => {
  try {
    const snapshot = await db.collection('patients').get();
    const patients = [];
    snapshot.forEach(doc => {
      patients.push({ id: doc.id, ...doc.data() });
    });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { addPatient, getPatients };
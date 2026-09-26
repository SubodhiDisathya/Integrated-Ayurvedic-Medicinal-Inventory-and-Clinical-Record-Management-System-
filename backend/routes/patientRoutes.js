const express = require('express');
const router = express.Router();
const { addPatient, getPatients } = require('../controllers/patientController');

router.post('/add', addPatient);
router.get('/all', getPatients);

module.exports = router;
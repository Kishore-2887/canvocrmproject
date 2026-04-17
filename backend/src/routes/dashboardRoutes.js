const express = require('express');
const router = express.Router();
const { getDashboard } = require('../controllers/dashboardController');

// Auth temporarily removed for production debugging
router.get('/', getDashboard);

module.exports = router;

const express = require('express');
const router = express.Router();
const { login, getMe, updateMe } = require('../controllers/authController');

// Auth middleware removed — all routes open for demo
router.post('/login', login);
router.get('/me', getMe);
router.put('/me', updateMe);

module.exports = router;

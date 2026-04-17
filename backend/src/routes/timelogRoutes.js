const express = require('express');
const ExpressRouter = express.Router();

const { getMyTimeLog, checkIn, checkOut, toggleBreak } = require('../controllers/timelogController');

// Auth temporarily removed for production debugging
ExpressRouter.get('/me', getMyTimeLog);
ExpressRouter.post('/checkin', checkIn);
ExpressRouter.post('/checkout', checkOut);
ExpressRouter.post('/break', toggleBreak);

module.exports = ExpressRouter;

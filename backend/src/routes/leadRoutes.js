const express = require('express');
const router = express.Router();
const {
  upload,
  uploadLeadsCSV,
  getAllLeads,
  getMyLeads,
  getLead,
  updateLead,
  createLead,
} = require('../controllers/leadController');
const Activity = require('../models/Activity');

// Auth temporarily removed for production debugging

// Employee activities
router.get('/activities/mine', async (req, res) => {
  const activities = await Activity.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('lead', 'name');
  res.json({ success: true, data: activities });
});

// Employee routes
router.get('/mine', getMyLeads);
router.put('/:id', updateLead);
router.get('/:id', getLead);

// Admin routes
router.post('/upload', upload.single('file'), uploadLeadsCSV);
router.post('/', createLead);
router.get('/', getAllLeads);

module.exports = router;

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
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const Activity = require('../models/Activity');

// Employee activities
router.get('/activities/mine', protect, authorize('employee', 'admin'), async (req, res) => {
  const activities = await Activity.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('lead', 'name');
  res.json({ success: true, data: activities });
});

// Employee routes
router.get('/mine', protect, authorize('employee', 'admin'), getMyLeads);
router.put('/:id', protect, authorize('employee', 'admin'), updateLead);
router.get('/:id', protect, authorize('employee', 'admin'), getLead);

// Admin routes
router.post('/upload', protect, authorize('admin'), upload.single('file'), uploadLeadsCSV);
router.post('/', protect, authorize('admin'), createLead);
router.get('/', protect, authorize('admin'), getAllLeads);

module.exports = router;

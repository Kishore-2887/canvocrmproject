const path = require('path');
const multer = require('multer');
const Lead = require('../models/Lead');
const Activity = require('../models/Activity');
const asyncHandler = require('../utils/asyncHandler');
const { parseCSV } = require('../services/csvParser');
const { distributeLeads } = require('../services/leadDistributor');

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => cb(null, `leads_${Date.now()}${path.extname(file.originalname)}`),
});

const csvFilter = (req, file, cb) => {
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed'), false);
  }
};

const upload = multer({ storage, fileFilter: csvFilter });

// @desc    Upload CSV and assign leads
// @route   POST /api/leads/upload
// @access  Admin
const uploadLeadsCSV = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please upload a CSV file' });
  }

  const { leads, errors } = await parseCSV(req.file.path);

  if (leads.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No valid leads found in CSV',
      errors,
    });
  }

  const result = await distributeLeads(leads);

  res.status(201).json({
    success: true,
    message: `Upload complete`,
    data: result,
    parseErrors: errors,
  });
});

// @desc    Get all leads (Admin)
// @route   GET /api/leads?page=1&status=&type=&search=
// @access  Admin
const getAllLeads = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const query = {};
  if (req.query.status) query.status = req.query.status;
  if (req.query.type) query.type = req.query.type;
  if (req.query.assigned === 'true') query.assignedTo = { $ne: null };
  if (req.query.assigned === 'false') query.assignedTo = null;
  if (req.query.search) {
    query.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } },
      { location: { $regex: req.query.search, $options: 'i' } },
    ];
  }

  const [leads, total] = await Promise.all([
    Lead.find(query)
      .populate('assignedTo', 'name email employeeId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Lead.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: leads,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// @desc    Get leads assigned to current employee
// @route   GET /api/leads/mine
// @access  Employee
const getMyLeads = asyncHandler(async (req, res) => {
  const leads = await Lead.find({ assignedTo: req.user._id }).sort({ updatedAt: -1 });
  res.json({ success: true, data: leads, total: leads.length });
});

// @desc    Get single lead
// @route   GET /api/leads/:id
// @access  Protected
const getLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id).populate('assignedTo', 'name email');
  if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

  // Employee can only see their own leads
  if (
    req.user.role === 'employee' &&
    lead.assignedTo?._id.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  res.json({ success: true, data: lead });
});

// @desc    Update lead (type, scheduledDate, status)
// @route   PUT /api/leads/:id
// @access  Employee (own) | Admin (any)
const updateLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

  // Employee can only update their own leads
  if (
    req.user.role === 'employee' &&
    lead.assignedTo?.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  // Allowed field updates
  const allowedFields = ['type', 'scheduledDate', 'status'];
  const updates = {};
  allowedFields.forEach((f) => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  // Validation: Leads Scheduled cannot be closed before time
  const targetStatus = updates.status || lead.status;
  const targetDate = updates.scheduledDate || lead.scheduledDate;
  if (targetStatus === 'Closed' && targetDate) {
    if (new Date(targetDate) > new Date()) {
      return res.status(400).json({ success: false, message: 'Cannot close a scheduled lead before its scheduled time.' });
    }
  }

  // Track closed leads on user AND decrement unassigned capacity
  if (updates.status === 'Closed' && lead.status !== 'Closed' && lead.assignedTo) {
    await require('../models/User').findByIdAndUpdate(lead.assignedTo, {
      $inc: { closedLeads: 1, assignedLeads: -1 },
    });
    process.nextTick(() => require('../services/leadDistributor').distributeUnassignedLeads());
  } else if (updates.status === 'Ongoing' && lead.status === 'Closed' && lead.assignedTo) {
    await require('../models/User').findByIdAndUpdate(lead.assignedTo, {
      $inc: { closedLeads: -1, assignedLeads: 1 },
    });
  }

  Object.assign(lead, updates);
  await lead.save();

  await Activity.create({
    action: `Lead "${lead.name}" updated — status: ${lead.status}, type: ${lead.type}`,
    user: req.user._id,
    lead: lead._id,
  });

  res.json({ success: true, data: lead });
});

// @desc    Create a single lead manually (Admin)
// @route   POST /api/leads
// @access  Admin
const createLead = asyncHandler(async (req, res) => {
  const { name, email, source, date, location, language } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Lead name is required' });
  }

  const lead = await Lead.create({
    name,
    email: email || '',
    source: source || '',
    date: date ? new Date(date) : new Date(),
    location: location || '',
    language: language || 'English',
    status: 'Ongoing',
    type: 'Warm',
  });

  await Activity.create({ action: `Lead "${name}" added manually by admin` });

  process.nextTick(() => require('../services/leadDistributor').distributeUnassignedLeads());

  res.status(201).json({ success: true, data: lead });
});

module.exports = { upload, uploadLeadsCSV, getAllLeads, getMyLeads, getLead, updateLead, createLead };

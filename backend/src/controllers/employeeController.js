const User = require('../models/User');
const Lead = require('../models/Lead');
const Activity = require('../models/Activity');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Create new employee
// @route   POST /api/employees
// @access  Admin
const createEmployee = asyncHandler(async (req, res) => {
  const { name, email, language, status } = req.body;

  if (!name || !email) {
    return res.status(400).json({ success: false, message: 'Name and email are required' });
  }

  // Mandatory Requirement: Login (username = first name, password = first name)
  const username = name.split(' ')[0].toLowerCase();
  const password = username;

  const employee = await User.create({
    name,
    email: email.toLowerCase().trim(),
    username,
    password,
    language: language || 'English',
    status: status || 'Active',
    role: 'employee',
  });

  await Activity.create({ action: `New employee "${name}" created`, user: employee._id });

  // Trigger distribution of any existing unassigned leads
  process.nextTick(() => require('../services/leadDistributor').distributeUnassignedLeads());

  res.status(201).json({
    success: true,
    data: employee,
    credentials: { username: email, password: email }, // Return email-based credentials
  });
});

// @desc    Get all employees with pagination
// @route   GET /api/employees?page=1&limit=8&search=
// @access  Admin
const getEmployees = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 8;
  const search = req.query.search || '';
  const skip = (page - 1) * limit;

  const query = { role: 'employee' };
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
    ];
  }

  const [employees, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: employees,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Admin
const updateEmployee = asyncHandler(async (req, res) => {
  const allowedFields = ['name', 'email', 'language', 'status'];
  const updates = {};
  allowedFields.forEach((f) => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  if (req.body.password) {
    const user = await User.findById(req.params.id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'Employee not found' });
    user.password = req.body.password;
    Object.assign(user, updates);
    await user.save();
    return res.json({ success: true, data: user });
  }

  const employee = await User.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!employee) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }

  await Activity.create({ action: `Employee "${employee.name}" updated`, user: employee._id });

  // In case the update was changing status to Active
  process.nextTick(() => require('../services/leadDistributor').distributeUnassignedLeads());

  res.json({ success: true, data: employee });
});

// @desc    Bulk delete employees
// @route   DELETE /api/employees
// @access  Admin
const bulkDeleteEmployees = asyncHandler(async (req, res) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: 'Provide an array of employee IDs' });
  }

  // Unassign their leads first
  await Lead.updateMany({ assignedTo: { $in: ids } }, { assignedTo: null });

  const result = await User.deleteMany({ _id: { $in: ids }, role: 'employee' });

  await Activity.create({
    action: `${result.deletedCount} employee(s) deleted`,
    meta: { ids },
  });

  process.nextTick(() => require('../services/leadDistributor').distributeUnassignedLeads());

  res.json({ success: true, deleted: result.deletedCount });
});

// @desc    Get single employee
// @route   GET /api/employees/:id
// @access  Admin
const getEmployee = asyncHandler(async (req, res) => {
  const employee = await User.findOne({ _id: req.params.id, role: 'employee' });
  if (!employee) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }
  res.json({ success: true, data: employee });
});

module.exports = { createEmployee, getEmployees, getEmployee, updateEmployee, bulkDeleteEmployees };

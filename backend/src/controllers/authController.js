const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

// Generate JWT
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;
  const identifier = username || email;

  if (!identifier) {
    return res.status(400).json({ success: false, message: 'Your name is required to login' });
  }

  // Search by email, username, or loosely matching the first name case-insensitively
  let user = await User.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier.toLowerCase() },
      { name: new RegExp(`^${identifier}(?:\\s|$)`, 'i') } // Precise first-name start match
    ],
  }).select('+password');

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid name provided. Please enter your first name.' });
  }

  if (user.status === 'Inactive') {
    return res.status(403).json({ success: false, message: 'Account is inactive. Contact admin.' });
  }

  // Employees get automatic login once name is matched
  if (user.role === 'employee') {
    // No strict password check for employees as per user request (first name login)
  } else {
    // Admins still need strict password check
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required for admin' });
    }
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }
  }

  const token = generateToken(user._id);

  res.json({
    success: true,
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      language: user.language,
      employeeId: user.employeeId,
      status: user.status,
    },
  });
});

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Protected
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, data: user });
});

// @desc    Update own profile
// @route   PUT /api/auth/me
// @access  Protected
const updateMe = asyncHandler(async (req, res) => {
  const allowedFields = ['name', 'language'];
  const updates = {};
  allowedFields.forEach((f) => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  if (req.body.password) {
    // Re-save to trigger pre-save hook for hashing
    const user = await User.findById(req.user._id).select('+password');
    user.password = req.body.password;
    Object.assign(user, updates);
    await user.save();
    return res.json({ success: true, data: user });
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });
  res.json({ success: true, data: user });
});

module.exports = { login, getMe, updateMe };

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
// @access  Public (auth removed)
const getMe = asyncHandler(async (req, res) => {
  // Extract user from token if present, otherwise return first admin
  let user;
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
      user = await User.findById(decoded.id);
    } catch (e) { /* invalid token — fall through */ }
  }
  if (!user) user = await User.findOne({ role: 'admin' });
  res.json({ success: true, data: user });
});

// @desc    Update own profile
// @route   PUT /api/auth/me
// @access  Public (auth removed)
const updateMe = asyncHandler(async (req, res) => {
  const allowedFields = ['name', 'language'];
  const updates = {};
  allowedFields.forEach((f) => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  let userId = req.user?._id;
  if (!userId) {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (e) { /* ignore */ }
    }
  }
  if (!userId) {
    const admin = await User.findOne({ role: 'admin' });
    userId = admin?._id;
  }

  const user = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true });
  res.json({ success: true, data: user });
});


module.exports = { login, getMe, updateMe };

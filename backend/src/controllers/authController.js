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
  const identifier = (username || email || '').trim();

  if (!identifier) {
    return res.status(400).json({ success: false, message: 'Please enter your name to login' });
  }

  // Search by email, username, OR first-name match (case-insensitive)
  let user = await User.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier.toLowerCase() },
      { name: new RegExp(`^${identifier}`, 'i') }, // matches first name
    ],
  });

  if (!user) {
    return res.status(401).json({ success: false, message: `No employee found with name "${identifier}". Please check and try again.` });
  }

  if (user.status === 'Inactive') {
    return res.status(403).json({ success: false, message: 'Account is inactive. Contact admin.' });
  }

  // ✅ No password check — any password works for demo
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

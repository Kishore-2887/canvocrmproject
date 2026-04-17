const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'employee'],
      default: 'employee',
    },
    language: {
      type: String,
      trim: true,
      default: 'English',
    },
    employeeId: {
      type: String,
      unique: true,
      sparse: true,
    },
    assignedLeads: {
      type: Number,
      default: 0,
    },
    closedLeads: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
  },
  { timestamps: true }
);

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Generate employee ID — finds highest existing EMP number to avoid duplicates
UserSchema.pre('save', async function (next) {
  if (this.isNew && this.role === 'employee' && !this.employeeId) {
    let nextNum = 1;
    const last = await mongoose.model('User').findOne(
      { role: 'employee', employeeId: { $exists: true, $ne: null } },
      { employeeId: 1 },
      { sort: { employeeId: -1 } }
    );
    if (last?.employeeId) {
      const m = last.employeeId.match(/EMP(\d+)/);
      if (m) nextNum = parseInt(m[1], 10) + 1;
    }
    this.employeeId = `EMP${String(nextNum).padStart(4, '0')}`;
  }
  next();
});

// Match password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Indexes
UserSchema.index({ language: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ role: 1 });

module.exports = mongoose.model('User', UserSchema);

const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Lead name is required'],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    location: {
      type: String,
      trim: true,
    },
    language: {
      type: String,
      trim: true,
      default: 'English',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['Ongoing', 'Closed', 'Lost'],
      default: 'Ongoing',
    },
    type: {
      type: String,
      enum: ['Hot', 'Warm', 'Cold'],
      default: 'Warm',
    },
    scheduledDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for performance
LeadSchema.index({ language: 1 });
LeadSchema.index({ assignedTo: 1 });
LeadSchema.index({ status: 1 });
LeadSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Lead', LeadSchema);

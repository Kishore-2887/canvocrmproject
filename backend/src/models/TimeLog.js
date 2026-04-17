const mongoose = require('mongoose');

const TimeLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: String, // 'YYYY-MM-DD' local time
      required: true,
    },
    checkIn: {
      type: String, // 'HH:MM AM/PM'
      default: null,
    },
    checkOut: {
      type: String, // 'HH:MM AM/PM'
      default: null,
    },
    currentBreak: {
      type: String, // Start time of ongoing break
      default: null,
    },
    breaks: [
      {
        start: String,
        end: String,
        date: String,
      },
    ],
  },
  { timestamps: true }
);

TimeLogSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('TimeLog', TimeLogSchema);

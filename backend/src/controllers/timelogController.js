const TimeLog = require('../models/TimeLog');
const asyncHandler = require('../utils/asyncHandler');

// Helpers
const pad = (n) => String(n).padStart(2, '0');
const fmtTime = (d) => {
  const h = d.getHours(), m = d.getMinutes();
  return `${pad(h % 12 || 12)}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`;
};
const fmtShortDate = (d) =>
  `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`;
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; // Local YYYY-MM-DD
};

// @desc    Get or Create Today's Timelog & Return State
// @route   GET /api/timelogs/me
// @access  Protected/Employee
const getMyTimeLog = asyncHandler(async (req, res) => {
  const date = todayKey();
  
  // Find past logs (up to 5 to get previous checkouts & breaks)
  const pastLogs = await TimeLog.find({ user: req.user._id })
    .sort({ date: -1 })
    .limit(5);

  let todayLog = pastLogs.find(l => l.date === date);
  let previousCheckOut = '--:-- _';

  // Find most recent past checkout
  const previousLog = pastLogs.find(l => l.date !== date && l.checkOut);
  if (previousLog) {
    previousCheckOut = previousLog.checkOut;
  }

  // Auto check-in if no log for today exists
  if (!todayLog) {
    todayLog = await TimeLog.create({
      user: req.user._id,
      date,
      checkIn: fmtTime(new Date()),
      breaks: [],
    });
  }

  // Gather last 4 days of breaks
  let allBreaks = [];
  pastLogs.slice(0, 4).forEach(log => {
      allBreaks = [...allBreaks, ...log.breaks];
  });
  // Include today breaks if they were not in pastLogs array (if newly created)
  if(!pastLogs.find(l => l.date === date)) {
      allBreaks = [...allBreaks, ...todayLog.breaks];
  }

  res.json({
    success: true,
    data: {
      log: todayLog,
      previousCheckOut,
      recentBreaks: allBreaks,
    }
  });
});

// @desc    Perform Check-In
// @route   POST /api/timelogs/checkin
const checkIn = asyncHandler(async (req, res) => {
  const date = todayKey();
  let log = await TimeLog.findOne({ user: req.user._id, date });
  if (!log) {
    log = await TimeLog.create({ user: req.user._id, date, checkIn: fmtTime(new Date()) });
  } else if (!log.checkIn) {
    log.checkIn = fmtTime(new Date());
    await log.save();
  }
  res.json({ success: true, data: log });
});

// @desc    Perform Check-Out
// @route   POST /api/timelogs/checkout
const checkOut = asyncHandler(async (req, res) => {
  const date = todayKey();
  let log = await TimeLog.findOne({ user: req.user._id, date });
  if (!log) return res.status(400).json({ success: false, message: 'No check-in found for today' });

  // If on break, end the break before checkout
  if (log.currentBreak) {
    log.breaks.push({
      start: log.currentBreak,
      end: fmtTime(new Date()),
      date: fmtShortDate(new Date())
    });
    log.currentBreak = null;
  }
  
  log.checkOut = fmtTime(new Date());
  await log.save();
  res.json({ success: true, data: log });
});

// @desc    Start/End Break
// @route   POST /api/timelogs/break
const toggleBreak = asyncHandler(async (req, res) => {
  const date = todayKey();
  let log = await TimeLog.findOne({ user: req.user._id, date });
  if (!log) return res.status(400).json({ success: false, message: 'Check in first' });
  
  if (log.checkOut) return res.status(400).json({ success: false, message: 'Already checked out' });

  if (log.currentBreak) {
    // End Break
    log.breaks.push({
      start: log.currentBreak,
      end: fmtTime(new Date()),
      date: fmtShortDate(new Date())
    });
    log.currentBreak = null;
  } else {
    // Start Break
    log.currentBreak = fmtTime(new Date());
  }

  await log.save();
  res.json({ success: true, data: log });
});

module.exports = { getMyTimeLog, checkIn, checkOut, toggleBreak };

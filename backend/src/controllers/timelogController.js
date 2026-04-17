const TimeLog = require('../models/TimeLog');
const asyncHandler = require('../utils/asyncHandler');

const pad = (n) => String(n).padStart(2, '0');
const fmtTime = (d) => {
  const h = d.getHours(), m = d.getMinutes();
  return `${pad(h % 12 || 12)}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`;
};
const fmtShortDate = (d) =>
  `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`;
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Use a fixed demo user ID when auth is removed
const DEMO_USER_ID = '000000000000000000000001';

// @desc    Get or Create Today's Timelog & Return State
const getMyTimeLog = asyncHandler(async (req, res) => {
  const userId = req.user?._id || DEMO_USER_ID;
  const date = todayKey();

  const pastLogs = await TimeLog.find({ user: userId }).sort({ date: -1 }).limit(5);
  let todayLog = pastLogs.find(l => l.date === date);
  let previousCheckOut = '--:-- _';

  const previousLog = pastLogs.find(l => l.date !== date && l.checkOut);
  if (previousLog) previousCheckOut = previousLog.checkOut;

  if (!todayLog) {
    todayLog = await TimeLog.create({ user: userId, date, checkIn: fmtTime(new Date()), breaks: [] });
  }

  let allBreaks = [];
  pastLogs.slice(0, 4).forEach(log => { allBreaks = [...allBreaks, ...log.breaks]; });
  if (!pastLogs.find(l => l.date === date)) allBreaks = [...allBreaks, ...todayLog.breaks];

  res.json({ success: true, data: { log: todayLog, previousCheckOut, recentBreaks: allBreaks } });
});

const checkIn = asyncHandler(async (req, res) => {
  const userId = req.user?._id || DEMO_USER_ID;
  const date = todayKey();
  let log = await TimeLog.findOne({ user: userId, date });
  if (!log) {
    log = await TimeLog.create({ user: userId, date, checkIn: fmtTime(new Date()) });
  } else if (!log.checkIn) {
    log.checkIn = fmtTime(new Date());
    await log.save();
  }
  res.json({ success: true, data: log });
});

const checkOut = asyncHandler(async (req, res) => {
  const userId = req.user?._id || DEMO_USER_ID;
  const date = todayKey();
  let log = await TimeLog.findOne({ user: userId, date });
  if (!log) return res.status(400).json({ success: false, message: 'No check-in found for today' });

  if (log.currentBreak) {
    log.breaks.push({ start: log.currentBreak, end: fmtTime(new Date()), date: fmtShortDate(new Date()) });
    log.currentBreak = null;
  }
  log.checkOut = fmtTime(new Date());
  await log.save();
  res.json({ success: true, data: log });
});

const toggleBreak = asyncHandler(async (req, res) => {
  const userId = req.user?._id || DEMO_USER_ID;
  const date = todayKey();
  let log = await TimeLog.findOne({ user: userId, date });
  if (!log) return res.status(400).json({ success: false, message: 'Check in first' });
  if (log.checkOut) return res.status(400).json({ success: false, message: 'Already checked out' });

  if (log.currentBreak) {
    log.breaks.push({ start: log.currentBreak, end: fmtTime(new Date()), date: fmtShortDate(new Date()) });
    log.currentBreak = null;
  } else {
    log.currentBreak = fmtTime(new Date());
  }
  await log.save();
  res.json({ success: true, data: log });
});

module.exports = { getMyTimeLog, checkIn, checkOut, toggleBreak };

const User = require('../models/User');
const Lead = require('../models/Lead');
const Activity = require('../models/Activity');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get dashboard KPIs + recent activity
// @route   GET /api/dashboard
// @access  Admin
const getDashboard = asyncHandler(async (req, res) => {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const [
    unassignedCount,
    assignedThisWeek,
    activeSalesPeople,
    totalAssigned,
    totalClosed,
    recentActivities,
    activeSalesDetails,
    leadsPerDay,
  ] = await Promise.all([
    // Unassigned leads
    Lead.countDocuments({ assignedTo: null }),

    // Leads assigned this week
    Lead.countDocuments({ assignedTo: { $ne: null }, createdAt: { $gte: weekStart } }),

    // Active sales people count
    User.countDocuments({ role: 'employee', status: 'Active' }),

    // Total assigned leads (for conversion rate)
    Lead.countDocuments({ assignedTo: { $ne: null } }),

    // Total closed leads
    Lead.countDocuments({ status: 'Closed' }),

    // Recent 7 activities
    Activity.find()
      .sort({ createdAt: -1 })
      .limit(7)
      .populate('user', 'name')
      .populate('lead', 'name'),

    // Active sales people details
    User.find({ role: 'employee', status: 'Active' })
      .select('name email employeeId assignedLeads closedLeads language')
      .sort({ assignedLeads: -1 }),

    // Leads per day for last 14 days (for bar chart)
    Lead.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
          assigned: {
            $sum: { $cond: [{ $ne: ['$assignedTo', null] }, 1, 0] },
          },
          closed: {
            $sum: { $cond: [{ $eq: ['$status', 'Closed'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const conversionRate =
    totalAssigned > 0 ? ((totalClosed / totalAssigned) * 100).toFixed(1) : 0;

  res.json({
    success: true,
    data: {
      kpis: {
        unassignedLeads: unassignedCount,
        assignedThisWeek,
        activeSalesPeople,
        conversionRate: parseFloat(conversionRate),
        totalAssigned,
        totalClosed,
      },
      recentActivities,
      activeSalesDetails,
      leadsPerDay,
    },
  });
});

module.exports = { getDashboard };

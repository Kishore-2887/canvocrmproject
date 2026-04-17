const User = require('../models/User');
const Lead = require('../models/Lead');
const Activity = require('../models/Activity');

const MAX_LEADS_PER_USER = 3;

/**
 * Distribute newly uploaded leads
 */
const distributeLeads = async (parsedLeads) => {
  // First insert all as unassigned
  const docs = parsedLeads.map((l) => ({ ...l, assignedTo: null }));
  await Lead.insertMany(docs);
  
  // Then triggering assignment logic
  const assignedCount = await distributeUnassignedLeads();

  await Activity.create({
    action: `Bulk uploaded ${parsedLeads.length} leads — ${assignedCount} assigned, ${parsedLeads.length - assignedCount} unassigned`,
    meta: { total: parsedLeads.length, assigned: assignedCount },
  });

  return { assigned: assignedCount, unassigned: parsedLeads.length - assignedCount, inserted: parsedLeads.length };
};

/**
 * Sweeps the DB and assigns any unassigned leads to employees
 * using STRICT language matching only. No fallback.
 */
const distributeUnassignedLeads = async () => {
  const employees = await User.find({ role: 'employee', status: 'Active' });
  if (!employees.length) return 0;

  let totalAvailableSlots = 0;
  const assignmentCount = {};
  const languageMap = {};

  employees.forEach((emp) => {
    const lang = (emp.language || 'English').toLowerCase().trim();
    if (!languageMap[lang]) languageMap[lang] = [];
    languageMap[lang].push(emp);
    
    let slots = Math.max(0, MAX_LEADS_PER_USER - (emp.assignedLeads || 0));
    totalAvailableSlots += slots;
    assignmentCount[emp._id.toString()] = emp.assignedLeads || 0;
  });

  if (totalAvailableSlots === 0) return 0; // Queue full

  const unassignedLeads = await Lead.find({ assignedTo: null }).sort({ createdAt: 1 });
  if (!unassignedLeads.length) return 0;

  const roundRobinIndex = {};
  let newlyAssignedCount = 0;
  const leadsToUpdate = [];

  for (const lead of unassignedLeads) {
    if (newlyAssignedCount >= totalAvailableSlots) break;

    const lang = (lead.language || 'English').toLowerCase().trim();

    // STRICT language match — no fallback to English
    const pool = languageMap[lang];
    if (!pool || pool.length === 0) continue; // skip if no matching employee

    let pointer = roundRobinIndex[lang] || 0;
    let attempts = 0;

    while (attempts < pool.length) {
      const candidate = pool[pointer % pool.length];
      const candidateId = candidate._id.toString();

      if (assignmentCount[candidateId] < MAX_LEADS_PER_USER) {
        // Found a slot
        leadsToUpdate.push({
          leadId: lead._id,
          leadName: lead.name,
          userId: candidate._id,
          userName: candidate.name,
        });
        assignmentCount[candidateId]++;
        pointer++;
        roundRobinIndex[lang] = pointer;
        newlyAssignedCount++;
        break;
      }
      pointer++;
      attempts++;
    }
  }

  if (leadsToUpdate.length > 0) {
    // Bulk update leads
    const leadBulkOps = leadsToUpdate.map(t => ({
      updateOne: { filter: { _id: t.leadId }, update: { $set: { assignedTo: t.userId } } }
    }));
    await Lead.bulkWrite(leadBulkOps);

    // Update assignedLeads counts on employees
    for (const [id, count] of Object.entries(assignmentCount)) {
      const emp = employees.find((e) => e._id.toString() === id);
      if (emp && count !== (emp.assignedLeads || 0)) {
        await User.findByIdAndUpdate(id, { assignedLeads: count });
      }
    }

    // Create individual Activity records for each assignment
    const activityDocs = leadsToUpdate.map(t => ({
      action: `Assigned lead "${t.leadName}" to ${t.userName}`,
      user: t.userId,
      lead: t.leadId,
    }));
    await Activity.insertMany(activityDocs);
  }

  return newlyAssignedCount;
};

module.exports = { distributeLeads, distributeUnassignedLeads };

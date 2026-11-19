import { Ticket } from '../models/Ticket.js';
import { getSlaState } from '../services/slaService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { ROLES } from '../utils/constants.js';

const scopeFilter = (user) => {
  const filter = { organization: user.organization };
  if (user.role === ROLES.AGENT) {
    filter.assignedTo = user._id;
  }
  return filter;
};

export const getSummary = asyncHandler(async (req, res) => {
  const filter = scopeFilter(req.user);
  const tickets = await Ticket.find(filter).select('status priority slaDeadline createdAt').lean();
  const now = new Date();

  const summary = {
    total: tickets.length,
    open: 0,
    inProgress: 0,
    resolved: 0,
    critical: 0,
    slaBreached: 0,
  };

  for (const t of tickets) {
    if (t.status === 'OPEN') summary.open += 1;
    if (t.status === 'IN_PROGRESS') summary.inProgress += 1;
    if (t.status === 'RESOLVED') summary.resolved += 1;
    if (t.priority === 'CRITICAL') summary.critical += 1;
    if (getSlaState(t, now) === 'BREACHED') summary.slaBreached += 1;
  }

  return sendSuccess(res, 200, { summary });
});

export const getAnalytics = asyncHandler(async (req, res) => {
  const match = scopeFilter(req.user);

  const [byCategory, byPriority, byStatus] = await Promise.all([
    Ticket.aggregate([{ $match: match }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
    Ticket.aggregate([{ $match: match }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
    Ticket.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const toMap = (rows) =>
    rows.reduce((acc, r) => {
      acc[r._id] = r.count;
      return acc;
    }, {});

  return sendSuccess(res, 200, {
    analytics: {
      byCategory: toMap(byCategory),
      byPriority: toMap(byPriority),
      byStatus: toMap(byStatus),
    },
  });
});

export const getAgentWorkload = asyncHandler(async (req, res) => {
  const match = {
    organization: req.user.organization,
    status: { $nin: ['RESOLVED', 'CLOSED'] },
    assignedTo: { $ne: null },
  };

  if (req.user.role === ROLES.AGENT) {
    match.assignedTo = req.user._id;
  }

  const rows = await Ticket.aggregate([
    { $match: match },
    { $group: { _id: '$assignedTo', activeTickets: { $sum: 1 } } },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'agent',
      },
    },
    { $unwind: '$agent' },
    {
      $project: {
        _id: 0,
        agentId: '$agent._id',
        name: '$agent.name',
        email: '$agent.email',
        role: '$agent.role',
        activeTickets: 1,
      },
    },
    { $sort: { activeTickets: -1 } },
  ]);

  return sendSuccess(res, 200, { workload: rows });
});

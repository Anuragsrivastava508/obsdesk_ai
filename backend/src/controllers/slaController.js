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

export const getSlaOverview = asyncHandler(async (req, res) => {
  const filter = scopeFilter(req.user);
  const tickets = await Ticket.find(filter)
    .select('status priority slaDeadline createdAt ticketNumber subject')
    .lean();
  const now = new Date();

  const overview = { ON_TRACK: 0, APPROACHING: 0, BREACHED: 0 };
  for (const t of tickets) {
    if (['RESOLVED', 'CLOSED'].includes(t.status)) {
      overview.ON_TRACK += 1;
      continue;
    }
    overview[getSlaState(t, now)] += 1;
  }

  return sendSuccess(res, 200, { overview });
});

export const getBreachedTickets = asyncHandler(async (req, res) => {
  const page = req.query.page || 1;
  const limit = req.query.limit || 20;
  const filter = scopeFilter(req.user);
  filter.status = { $nin: ['RESOLVED', 'CLOSED'] };
  filter.slaDeadline = { $lt: new Date() };

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Ticket.find(filter)
      .sort({ slaDeadline: 1 })
      .skip(skip)
      .limit(limit)
      .populate('assignedTo', 'name email role'),
    Ticket.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, {
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 0,
  });
});

import { Ticket } from '../models/Ticket.js';
import { User } from '../models/User.js';
import { Conversation } from '../models/Conversation.js';
import { nextTicketNumber } from '../services/ticketNumberService.js';
import { suggestTeam } from '../services/routingService.js';
import { computeSlaDeadline, getResolutionMinutes } from '../services/slaService.js';
import { findRelatedTickets } from '../services/relatedTicketService.js';
import {
  assertCanUpdateTicket,
  assertCanViewTicket,
  buildTicketVisibilityFilter,
} from '../utils/ticketAccess.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { ROLES } from '../utils/constants.js';

const populateTicket = (q) =>
  q
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email role');

const createSystemEvent = async ({ ticket, organization, body, author = null }) => {
  await Conversation.create({
    ticket,
    organization,
    type: 'SYSTEM_EVENT',
    body,
    author,
    approvalStatus: 'PENDING',
  });
};

export const createTicket = asyncHandler(async (req, res) => {
  const orgId = req.user.organization;
  const ticketNumber = await nextTicketNumber(orgId);
  const assignedTeam = suggestTeam(req.body.category);
  const minutes = await getResolutionMinutes(orgId, req.body.priority);
  const now = new Date();
  const slaDeadline = computeSlaDeadline(now, minutes);

  const ticket = await Ticket.create({
    ticketNumber,
    subject: req.body.subject,
    description: req.body.description,
    category: req.body.category,
    priority: req.body.priority,
    status: 'OPEN',
    source: req.body.source,
    agency: req.body.agency || '',
    bookingReference: req.body.bookingReference || '',
    customerName: req.body.customerName || '',
    assignedTeam,
    organization: orgId,
    slaDeadline,
    createdBy: req.user._id,
    createdAt: now,
    updatedAt: now,
  });

  await createSystemEvent({
    ticket: ticket._id,
    organization: orgId,
    body: `Ticket ${ticketNumber} created with priority ${ticket.priority} and routed to ${assignedTeam}`,
    author: req.user._id,
  });

  const populated = await populateTicket(Ticket.findById(ticket._id));
  return sendSuccess(res, 201, { ticket: populated }, 'Ticket created');
});

export const listTickets = asyncHandler(async (req, res) => {
  const { page, limit, status, priority, category, assignedTo, search } = req.query;
  const filter = buildTicketVisibilityFilter(req.user);

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;
  if (assignedTo) filter.assignedTo = assignedTo;
  if (search) {
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { ticketNumber: { $regex: search, $options: 'i' } },
        { bookingReference: { $regex: search, $options: 'i' } },
      ],
    });
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    populateTicket(
      Ticket.find(filter)
        .sort({ priority: 1, createdAt: -1 }) // CRITICAL first via custom? Use collation below
        .skip(skip)
        .limit(limit)
    ),
    Ticket.countDocuments(filter),
  ]);

  // CRITICAL first: re-sort in memory for MVP (enum alphabetical puts CRITICAL first among priorities)
  const priorityRank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  items.sort((a, b) => {
    const pr = priorityRank[a.priority] - priorityRank[b.priority];
    if (pr !== 0) return pr;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return sendSuccess(res, 200, {
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 0,
  });
});

export const getTicket = asyncHandler(async (req, res) => {
  const ticket = await populateTicket(
    Ticket.findOne({ _id: req.params.id, organization: req.user.organization })
  );
  if (!ticket) throw new ApiError(404, 'Ticket not found');
  assertCanViewTicket(req.user, ticket);
  return sendSuccess(res, 200, { ticket });
});

export const updateTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findOne({
    _id: req.params.id,
    organization: req.user.organization,
  });
  if (!ticket) throw new ApiError(404, 'Ticket not found');
  assertCanUpdateTicket(req.user, ticket);

  const allowed = [
    'subject',
    'description',
    'category',
    'priority',
    'source',
    'agency',
    'bookingReference',
    'customerName',
  ];
  const prevPriority = ticket.priority;
  const prevCategory = ticket.category;

  for (const key of allowed) {
    if (req.body[key] !== undefined) ticket[key] = req.body[key];
  }

  if (req.body.category && req.body.category !== prevCategory) {
    ticket.assignedTeam = suggestTeam(ticket.category);
  }

  if (req.body.priority && req.body.priority !== prevPriority) {
    const minutes = await getResolutionMinutes(ticket.organization, ticket.priority);
    ticket.slaDeadline = computeSlaDeadline(ticket.createdAt, minutes);
  }

  await ticket.save();
  const populated = await populateTicket(Ticket.findById(ticket._id));
  return sendSuccess(res, 200, { ticket: populated }, 'Ticket updated');
});

export const assignTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findOne({
    _id: req.params.id,
    organization: req.user.organization,
  });
  if (!ticket) throw new ApiError(404, 'Ticket not found');

  const assignee = await User.findOne({
    _id: req.body.assignedTo,
    organization: req.user.organization,
    isActive: true,
  });
  if (!assignee) {
    throw new ApiError(400, 'Assignee must be an active user in your organization');
  }

  ticket.assignedTo = assignee._id;
  if (ticket.status === 'OPEN') ticket.status = 'IN_PROGRESS';
  await ticket.save();

  await createSystemEvent({
    ticket: ticket._id,
    organization: ticket.organization,
    body: `Ticket assigned to ${assignee.name} (${assignee.email})`,
    author: req.user._id,
  });

  const populated = await populateTicket(Ticket.findById(ticket._id));
  return sendSuccess(res, 200, { ticket: populated }, 'Ticket assigned');
});

export const changeStatus = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findOne({
    _id: req.params.id,
    organization: req.user.organization,
  });
  if (!ticket) throw new ApiError(404, 'Ticket not found');

  if (req.user.role === ROLES.AGENT) {
    if (ticket.assignedTo?.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Agents may only change status of tickets assigned to them');
    }
  } else {
    assertCanViewTicket(req.user, ticket);
  }

  const previous = ticket.status;
  ticket.status = req.body.status;
  await ticket.save();

  await createSystemEvent({
    ticket: ticket._id,
    organization: ticket.organization,
    body: `Status changed from ${previous} to ${ticket.status}`,
    author: req.user._id,
  });

  const populated = await populateTicket(Ticket.findById(ticket._id));
  return sendSuccess(res, 200, { ticket: populated }, 'Ticket status updated');
});

export const getRelatedTickets = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findOne({
    _id: req.params.id,
    organization: req.user.organization,
  }).lean();
  if (!ticket) throw new ApiError(404, 'Ticket not found');
  assertCanViewTicket(req.user, ticket);

  const candidates = await Ticket.find({
    organization: req.user.organization,
    _id: { $ne: ticket._id },
  })
    .limit(200)
    .lean();

  const related = findRelatedTickets(ticket, candidates, 10).map((r) => ({
    score: r.score,
    reasons: r.reasons,
    matchType: r.matchType,
    ticket: {
      _id: r.ticket._id,
      ticketNumber: r.ticket.ticketNumber,
      subject: r.ticket.subject,
      category: r.ticket.category,
      priority: r.ticket.priority,
      status: r.ticket.status,
      agency: r.ticket.agency,
      bookingReference: r.ticket.bookingReference,
    },
  }));

  return sendSuccess(res, 200, { related });
});

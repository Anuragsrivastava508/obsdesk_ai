import { Conversation } from '../models/Conversation.js';
import { Ticket } from '../models/Ticket.js';
import { assertCanViewTicket } from '../utils/ticketAccess.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

export const listConversations = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findOne({
    _id: req.params.id,
    organization: req.user.organization,
  });
  if (!ticket) throw new ApiError(404, 'Ticket not found');
  assertCanViewTicket(req.user, ticket);

  const items = await Conversation.find({
    ticket: ticket._id,
    organization: req.user.organization,
  })
    .sort({ createdAt: 1 })
    .populate('author', 'name email role')
    .populate('approvedBy', 'name email role');

  return sendSuccess(res, 200, { items });
});

export const addConversation = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findOne({
    _id: req.params.id,
    organization: req.user.organization,
  });
  if (!ticket) throw new ApiError(404, 'Ticket not found');
  assertCanViewTicket(req.user, ticket);

  const { type, body } = req.body;
  const conversation = await Conversation.create({
    ticket: ticket._id,
    organization: req.user.organization,
    type,
    body,
    author: req.user._id,
    approvalStatus: type === 'SUPPLIER_DRAFT' ? 'PENDING' : 'PENDING',
  });

  const populated = await Conversation.findById(conversation._id).populate(
    'author',
    'name email role'
  );

  return sendSuccess(
    res,
    201,
    { conversation: populated },
    type === 'SUPPLIER_DRAFT'
      ? 'Supplier draft saved (not sent). Awaiting approval.'
      : 'Internal note added'
  );
});

/**
 * Approval only updates approvalStatus. It NEVER sends anything externally.
 */
export const approveConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    organization: req.user.organization,
  });
  if (!conversation) throw new ApiError(404, 'Conversation not found');

  if (conversation.type !== 'SUPPLIER_DRAFT') {
    throw new ApiError(400, 'Only SUPPLIER_DRAFT messages can be approved or rejected');
  }

  conversation.approvalStatus = req.body.decision;
  conversation.approvedBy = req.user._id;
  conversation.approvedAt = new Date();
  await conversation.save();

  const populated = await Conversation.findById(conversation._id)
    .populate('author', 'name email role')
    .populate('approvedBy', 'name email role');

  return sendSuccess(
    res,
    200,
    { conversation: populated },
    `Supplier draft ${req.body.decision.toLowerCase()} (not sent externally)`
  );
});

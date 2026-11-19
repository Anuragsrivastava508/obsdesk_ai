import { ROLES } from './constants.js';
import { ApiError } from './ApiError.js';

export const buildTicketVisibilityFilter = (user) => {
  const base = { organization: user.organization };
  if (user.role === ROLES.AGENT) {
    return {
      ...base,
      $or: [{ assignedTo: user._id }, { createdBy: user._id }],
    };
  }
  return base;
};

export const assertCanViewTicket = (user, ticket) => {
  if (ticket.organization.toString() !== user.organization.toString()) {
    throw new ApiError(404, 'Ticket not found');
  }
  if (user.role === ROLES.AGENT) {
    const assigned = ticket.assignedTo?.toString() === user._id.toString();
    const created = ticket.createdBy?.toString() === user._id.toString();
    if (!assigned && !created) {
      throw new ApiError(404, 'Ticket not found');
    }
  }
};

export const assertCanUpdateTicket = (user, ticket) => {
  assertCanViewTicket(user, ticket);
  if (user.role === ROLES.AGENT) {
    if (ticket.assignedTo?.toString() !== user._id.toString()) {
      throw new ApiError(403, 'Agents may only update tickets assigned to them');
    }
  }
};

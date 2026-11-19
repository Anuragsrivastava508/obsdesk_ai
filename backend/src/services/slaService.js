import { SLAPolicy } from '../models/SLAPolicy.js';
import { DEFAULT_SLA_MINUTES } from '../utils/constants.js';

export const getResolutionMinutes = async (organizationId, priority) => {
  const policy = await SLAPolicy.findOne({ organization: organizationId, priority }).lean();
  if (policy) return policy.resolutionMinutes;
  return DEFAULT_SLA_MINUTES[priority] ?? DEFAULT_SLA_MINUTES.MEDIUM;
};

export const computeSlaDeadline = (createdAt, resolutionMinutes) => {
  const base = createdAt instanceof Date ? createdAt : new Date(createdAt);
  return new Date(base.getTime() + resolutionMinutes * 60 * 1000);
};

/**
 * MVP limitation: SLA clock does NOT pause on WAITING_FOR_SUPPLIER.
 * RESOLVED and CLOSED are not counted as breached.
 */
export const getSlaState = (ticket, now = new Date()) => {
  if (['RESOLVED', 'CLOSED'].includes(ticket.status)) {
    return 'ON_TRACK';
  }

  const deadline = new Date(ticket.slaDeadline).getTime();
  const created = new Date(ticket.createdAt).getTime();
  const current = now.getTime();

  if (current > deadline) return 'BREACHED';

  const windowMs = Math.max(deadline - created, 1);
  const remaining = deadline - current;
  if (remaining < 0.25 * windowMs) return 'APPROACHING';

  return 'ON_TRACK';
};

export function getSlaState(ticket, now = Date.now()) {
  if (['RESOLVED', 'CLOSED'].includes(ticket.status)) return 'ON_TRACK';

  const deadline = new Date(ticket.slaDeadline).getTime();
  const created = new Date(ticket.createdAt).getTime();
  const remaining = deadline - now;

  if (remaining < 0) return 'BREACHED';
  if (remaining < Math.max(deadline - created, 1) * 0.25) return 'APPROACHING';
  return 'ON_TRACK';
}

export function formatRemainingTime(deadline, now = Date.now()) {
  const remaining = new Date(deadline).getTime() - now;
  const minutes = Math.ceil(Math.abs(remaining) / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const remainder = minutes % 60;
  const duration = days ? `${days}d ${hours}h` : hours ? `${hours}h ${remainder}m` : `${remainder}m`;
  return remaining < 0 ? `${duration} overdue` : `${duration} left`;
}

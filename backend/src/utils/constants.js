export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  AGENT: 'AGENT',
});

export const TICKET_CATEGORIES = Object.freeze([
  'HOTEL',
  'FLIGHT',
  'CANCELLATION',
  'REFUND',
  'BOOKING',
  'PAYMENT',
  'OTHER',
]);

export const TICKET_PRIORITIES = Object.freeze(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const TICKET_STATUSES = Object.freeze([
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_SUPPLIER',
  'RESOLVED',
  'CLOSED',
]);

export const TICKET_SOURCES = Object.freeze([
  'EMAIL',
  'PHONE',
  'PORTAL',
  'WHATSAPP',
  'MANUAL',
]);

export const TEAMS = Object.freeze([
  'FLIGHT_OPERATIONS',
  'HOTEL_OPERATIONS',
  'FINANCE_OPERATIONS',
  'CANCELLATION_OPERATIONS',
  'GENERAL_OPERATIONS',
]);

export const MESSAGE_TYPES = Object.freeze([
  'INTERNAL_NOTE',
  'SUPPLIER_DRAFT',
  'SYSTEM_EVENT',
]);

export const APPROVAL_STATUSES = Object.freeze(['PENDING', 'APPROVED', 'REJECTED']);

export const SLA_STATES = Object.freeze(['ON_TRACK', 'APPROACHING', 'BREACHED']);

export const DEFAULT_SLA_MINUTES = Object.freeze({
  CRITICAL: 30,
  HIGH: 120,
  MEDIUM: 480,
  LOW: 1440,
});

export const CATEGORY_TEAM_MAP = Object.freeze({
  FLIGHT: 'FLIGHT_OPERATIONS',
  HOTEL: 'HOTEL_OPERATIONS',
  REFUND: 'FINANCE_OPERATIONS',
  PAYMENT: 'FINANCE_OPERATIONS',
  CANCELLATION: 'CANCELLATION_OPERATIONS',
  BOOKING: 'GENERAL_OPERATIONS',
  OTHER: 'GENERAL_OPERATIONS',
});

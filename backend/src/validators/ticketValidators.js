import { z } from 'zod';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TICKET_SOURCES,
} from '../utils/constants.js';

export const createTicketSchema = z.object({
  subject: z.string().min(3).max(200).trim(),
  description: z.string().min(3).max(5000).trim(),
  category: z.enum(TICKET_CATEGORIES),
  priority: z.enum(TICKET_PRIORITIES).default('MEDIUM'),
  source: z.enum(TICKET_SOURCES).default('MANUAL'),
  agency: z.string().max(200).trim().optional().default(''),
  bookingReference: z.string().max(100).trim().optional().default(''),
  customerName: z.string().max(200).trim().optional().default(''),
});

export const updateTicketSchema = z
  .object({
    subject: z.string().min(3).max(200).trim().optional(),
    description: z.string().min(3).max(5000).trim().optional(),
    category: z.enum(TICKET_CATEGORIES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    source: z.enum(TICKET_SOURCES).optional(),
    agency: z.string().max(200).trim().optional(),
    bookingReference: z.string().max(100).trim().optional(),
    customerName: z.string().max(200).trim().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const assignTicketSchema = z.object({
  assignedTo: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid user id'),
});

export const statusTicketSchema = z.object({
  status: z.enum(TICKET_STATUSES),
});

export const listTicketsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  category: z.enum(TICKET_CATEGORIES).optional(),
  assignedTo: z
    .string()
    .regex(/^[a-fA-F0-9]{24}$/, 'Invalid assignee id')
    .optional(),
  search: z.string().max(100).trim().optional(),
});

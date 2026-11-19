import { z } from 'zod';

export const createConversationSchema = z.object({
  type: z.enum(['INTERNAL_NOTE', 'SUPPLIER_DRAFT']),
  body: z.string().min(1).max(5000).trim(),
});

export const approveConversationSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

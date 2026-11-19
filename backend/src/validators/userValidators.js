import { z } from 'zod';
import { ROLES } from '../utils/constants.js';

export const createUserSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(8).max(128),
  role: z.enum([ROLES.ADMIN, ROLES.MANAGER, ROLES.AGENT]),
  isActive: z.boolean().optional().default(true),
});

export const updateUserSchema = z
  .object({
    name: z.string().min(2).max(100).trim().optional(),
    role: z.enum([ROLES.ADMIN, ROLES.MANAGER, ROLES.AGENT]).optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(8).max(128).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum([ROLES.ADMIN, ROLES.MANAGER, ROLES.AGENT]).optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

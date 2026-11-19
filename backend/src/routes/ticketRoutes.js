import { Router } from 'express';
import {
  assignTicket,
  changeStatus,
  createTicket,
  getRelatedTickets,
  getTicket,
  listTickets,
  updateTicket,
} from '../controllers/ticketController.js';
import {
  addConversation,
  listConversations,
} from '../controllers/conversationController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate, validateObjectIdParam } from '../middleware/validate.js';
import {
  assignTicketSchema,
  createTicketSchema,
  listTicketsQuerySchema,
  statusTicketSchema,
  updateTicketSchema,
} from '../validators/ticketValidators.js';
import { createConversationSchema } from '../validators/conversationValidators.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.use(authenticate);

router.get('/', validate(listTicketsQuerySchema, 'query'), listTickets);
router.post('/', validate(createTicketSchema), createTicket);
router.get('/:id', validateObjectIdParam('id'), getTicket);
router.patch('/:id', validateObjectIdParam('id'), validate(updateTicketSchema), updateTicket);
router.patch(
  '/:id/assign',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validateObjectIdParam('id'),
  validate(assignTicketSchema),
  assignTicket
);
router.patch(
  '/:id/status',
  validateObjectIdParam('id'),
  validate(statusTicketSchema),
  changeStatus
);
router.get('/:id/related', validateObjectIdParam('id'), getRelatedTickets);
router.get('/:id/conversations', validateObjectIdParam('id'), listConversations);
router.post(
  '/:id/conversations',
  validateObjectIdParam('id'),
  validate(createConversationSchema),
  addConversation
);

export default router;

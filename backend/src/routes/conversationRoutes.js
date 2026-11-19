import { Router } from 'express';
import { approveConversation } from '../controllers/conversationController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate, validateObjectIdParam } from '../middleware/validate.js';
import { approveConversationSchema } from '../validators/conversationValidators.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.use(authenticate);

router.patch(
  '/:id/approve',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validateObjectIdParam('id'),
  validate(approveConversationSchema),
  approveConversation
);

export default router;

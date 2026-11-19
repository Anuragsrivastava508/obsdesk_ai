import { Router } from 'express';
import { getBreachedTickets, getSlaOverview } from '../controllers/slaController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { paginationQuerySchema } from '../validators/conversationValidators.js';

const router = Router();

router.use(authenticate);

router.get('/overview', getSlaOverview);
router.get('/breached', validate(paginationQuerySchema, 'query'), getBreachedTickets);

export default router;

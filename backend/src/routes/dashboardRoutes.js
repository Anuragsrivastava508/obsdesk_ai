import { Router } from 'express';
import {
  getAgentWorkload,
  getAnalytics,
  getSummary,
} from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/summary', getSummary);
router.get('/analytics', getAnalytics);
router.get('/agent-workload', getAgentWorkload);

export default router;

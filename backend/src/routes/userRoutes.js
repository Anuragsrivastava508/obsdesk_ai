import { Router } from 'express';
import {
  createUser,
  getUser,
  listUsers,
  updateUser,
} from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate, validateObjectIdParam } from '../middleware/validate.js';
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
} from '../validators/userValidators.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize(ROLES.ADMIN, ROLES.MANAGER), validate(listUsersQuerySchema, 'query'), listUsers);
router.post('/', authorize(ROLES.ADMIN), validate(createUserSchema), createUser);
router.get('/:id', authorize(ROLES.ADMIN, ROLES.MANAGER), validateObjectIdParam('id'), getUser);
router.patch(
  '/:id',
  authorize(ROLES.ADMIN),
  validateObjectIdParam('id'),
  validate(updateUserSchema),
  updateUser
);

export default router;

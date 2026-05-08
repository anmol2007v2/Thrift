import { Router } from 'express';
import * as usersController from './users.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { validate } from '../../middleware/validate';
import { changePasswordSchema, updateProfileSchema } from '../auth/auth.schema';

const router = Router();

router.use(requireAuth);

router.patch('/me', validate(updateProfileSchema.shape), usersController.updateProfile);
router.patch('/me/password', validate(changePasswordSchema.shape), usersController.changePassword);
router.delete('/me', usersController.deleteAccount);

export default router;

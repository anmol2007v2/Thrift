import { Router } from 'express';
import * as authController from './auth.controller';
import { validate } from '../../middleware/validate';
import { registerSchema, loginSchema } from './auth.schema';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

router.post('/register', validate(registerSchema.shape), authController.register);
router.post('/login', validate(loginSchema.shape), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.getMe);

export default router;

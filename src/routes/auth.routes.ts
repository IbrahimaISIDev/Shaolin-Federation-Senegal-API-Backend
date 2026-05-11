import { Router } from 'express';
import { register, login, refresh, logout, me, changePassword, forgotPassword, resetPassword } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/refresh
router.post('/refresh', refresh);

// POST /api/auth/logout
router.post('/logout', logout);

// GET /api/auth/me  (protégé)
router.get('/me', requireAuth, me);

// POST /api/auth/change-password  (protégé)
router.post('/change-password', requireAuth, changePassword);

// POST /api/auth/forgot-password  (public)
router.post('/forgot-password', forgotPassword);

// POST /api/auth/reset-password  (public)
router.post('/reset-password', resetPassword);

export default router;
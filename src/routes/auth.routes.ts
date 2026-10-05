import { Router } from 'express';
import { login, refresh, logout, me, changePassword, forgotPassword, resetPassword } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { loginAccountLimiter, loginIpLimiter, passwordLimiter } from '../middlewares/rate-limit.middleware';

const router = Router();

// Pas de route d'inscription libre : les comptes sont créés uniquement à
// l'approbation d'une affiliation (ou par import admin), après paiement.

// POST /api/auth/login
router.post('/login', loginIpLimiter, loginAccountLimiter, login);

// POST /api/auth/refresh
router.post('/refresh', refresh);

// POST /api/auth/logout
router.post('/logout', logout);

// GET /api/auth/me  (protégé)
router.get('/me', requireAuth, me);

// POST /api/auth/change-password  (protégé)
router.post('/change-password', requireAuth, passwordLimiter, changePassword);

// POST /api/auth/forgot-password  (public)
router.post('/forgot-password', passwordLimiter, forgotPassword);

// POST /api/auth/reset-password  (public)
router.post('/reset-password', passwordLimiter, resetPassword);

export default router;
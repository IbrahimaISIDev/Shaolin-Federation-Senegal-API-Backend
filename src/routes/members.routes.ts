import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { getMe, updateMe, getMyPayments, getMyLicense } from '../controllers/members.controller';

const router = Router();

// Toutes les routes membres sont protégées
router.use(requireAuth);

// GET  /api/members/me
router.get('/me', getMe);

// PUT  /api/members/me
router.put('/me', updateMe);

// GET  /api/members/me/license
router.get('/me/license', getMyLicense);

// GET  /api/members/me/payments
router.get('/me/payments', getMyPayments);

export default router;
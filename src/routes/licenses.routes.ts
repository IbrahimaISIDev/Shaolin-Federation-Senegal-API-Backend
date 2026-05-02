import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { verify, getQRCode, createLicense } from '../controllers/licenses.controller';

const router = Router();

// GET /api/licenses/verify?token=xxx  — PUBLIC (scan QR Code événement)
router.get('/verify', verify);

// GET /api/licenses/:id/qrcode  — membre connecté
router.get('/:id/qrcode', requireAuth, getQRCode);

// POST /api/licenses  — admin uniquement
router.post('/', requireAuth, requireRole('ADMIN'), createLicense);

export default router;
import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { get, update } from '../controllers/settings.controller';

const router = Router();

// GET /api/settings  — public (utilisé par le header/footer/contact du site)
router.get('/', get);

// PUT /api/settings  — admin uniquement
router.put('/', requireAuth, requireRole('ADMIN'), update);

export default router;

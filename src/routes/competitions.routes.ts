import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import {
    listPublic,
    getPublic,
    inscrire,
    listAdmin,
    getAdmin,
    create,
    update,
    remove,
} from '../controllers/competitions.controller';
import { requireRole } from '../middlewares/auth.middleware';

const router = Router();

// ── Public ─────────────────────────────────────────────────────────────────────
// GET /api/competitions?search=&region=DK&status=upcoming&page=1&limit=20
router.get('/', listPublic);

// GET /api/competitions/:id
router.get('/:id', getPublic);

// POST /api/competitions/:id/inscriptions  — membre connecté
router.post('/:id/inscriptions', requireAuth, inscrire);

export default router;

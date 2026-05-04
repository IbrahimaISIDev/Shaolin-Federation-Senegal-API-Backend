import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { getMyClub, getStats, getMembers, getLicenses } from '../controllers/club.manager.controller';

const router = Router();

// Toutes les routes requièrent d'être authentifié en tant que CLUB_MANAGER ou ADMIN
router.use(requireAuth, requireRole('CLUB_MANAGER', 'ADMIN'));

// GET /api/club/me      — infos du club géré
router.get('/me', getMyClub);

// GET /api/club/stats   — statistiques du club
router.get('/stats', getStats);

// GET /api/club/membres — liste des membres avec filtres
router.get('/membres', getMembers);

// GET /api/club/licences — licences des membres
router.get('/licences', getLicenses);

export default router;

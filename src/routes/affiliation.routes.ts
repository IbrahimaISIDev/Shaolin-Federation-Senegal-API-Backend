import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import {
  submitClub,
  submitMaitre,
  submitMembre,
  listAffiliations,
  getAffiliation,
  approve,
  reject,
} from '../controllers/affiliation.controller';

const router = Router();

// Public — submission (no account required)
router.post('/club', submitClub);
router.post('/maitre', submitMaitre);
router.post('/membre', submitMembre);

// Admin — list, detail, approve, reject
router.get('/', requireAuth, requireRole('ADMIN'), listAffiliations);
router.get('/:id', requireAuth, requireRole('ADMIN'), getAffiliation);
router.patch('/:id/approve', requireAuth, requireRole('ADMIN'), approve);
router.patch('/:id/reject', requireAuth, requireRole('ADMIN'), reject);

export default router;

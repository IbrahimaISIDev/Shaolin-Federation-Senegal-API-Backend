import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { publicSubmissionLimiter } from '../middlewares/rate-limit.middleware';
import {
  submitClub,
  submitMaitre,
  submitMembre,
  listAffiliations,
  exportAffiliationsPdf,
  getAffiliation,
  approve,
  reject,
  submitPaymentProof,
  confirmPayment,
} from '../controllers/affiliation.controller';

const router = Router();

// Public — submission (no account required)
router.post('/club', publicSubmissionLimiter, submitClub);
router.post('/maitre', publicSubmissionLimiter, submitMaitre);
router.post('/membre', publicSubmissionLimiter, submitMembre);

// Public — soumission de la preuve de paiement manuel (pas encore de compte)
router.patch('/:id/payment-proof', publicSubmissionLimiter, submitPaymentProof);

// Admin — list, detail, approve, reject, confirmation de paiement
router.get('/', requireAuth, requireRole('ADMIN'), listAffiliations);
router.get('/export/pdf', requireAuth, requireRole('ADMIN'), exportAffiliationsPdf);
router.get('/:id', requireAuth, requireRole('ADMIN'), getAffiliation);
router.patch('/:id/approve', requireAuth, requireRole('ADMIN'), approve);
router.patch('/:id/reject', requireAuth, requireRole('ADMIN'), reject);
router.patch('/:id/confirm-payment', requireAuth, requireRole('ADMIN'), confirmPayment);

export default router;

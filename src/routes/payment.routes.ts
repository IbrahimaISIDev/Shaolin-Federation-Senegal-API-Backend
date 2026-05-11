import { Router } from 'express';
import {
  initiateWavePayment,
  waveWebhook,
  initiateOmPayment,
  omWebhook,
  checkPaymentStatus,
} from '../controllers/payment.controller';

const router = Router();

// ─── Wave ────────────────────────────────────────────────────────────────────
router.post('/wave/initiate', initiateWavePayment);
router.post('/wave/webhook', waveWebhook);

// ─── Orange Money ─────────────────────────────────────────────────────────────
router.post('/om/initiate', initiateOmPayment);
router.post('/om/webhook', omWebhook);

// ─── Statut unifié ────────────────────────────────────────────────────────────
router.get('/status/:demandeId', checkPaymentStatus);

export default router;

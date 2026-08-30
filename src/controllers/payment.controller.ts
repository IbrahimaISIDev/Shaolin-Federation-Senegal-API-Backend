import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  createCheckoutSession,
  getCheckoutSession,
  verifyWebhookSignature,
  WaveWebhookPayload,
} from '../services/wave.service';
import {
  createOmPayment,
  getOmPaymentStatus,
  generateOmOrderId,
  OmWebhookPayload,
} from '../services/orange-money.service';
import { sendAffiliationReceivedEmail } from '../services/email.service';

const prisma = new PrismaClient();

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';
const BACKEND_URL  = process.env.BACKEND_URL  ?? 'http://localhost:4000';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getDemandePendingPayment(demandeId: number, res: Response) {
  const demande = await prisma.affiliationDemande.findUnique({
    where: { id: demandeId },
  });
  if (!demande) {
    res.status(404).json({ success: false, message: 'Demande introuvable' });
    return null;
  }
  if (demande.status !== 'PENDING_PAYMENT') {
    res.status(400).json({
      success: false,
      message: 'Cette demande a déjà été payée ou traitée',
    });
    return null;
  }
  return demande;
}

async function confirmPayment(demandeId: number, provider: 'WAVE' | 'ORANGE_MONEY') {
  const demande = await prisma.affiliationDemande.update({
    where: { id: demandeId },
    data: { status: 'PENDING', paidAt: new Date(), paymentProvider: provider },
  });
  sendAffiliationReceivedEmail(
    demande.email,
    `${demande.prenom} ${demande.nom}`,
    demande.type,
    demande.id
  ).catch((e) => console.error('[email] sendAffiliationReceivedEmail failed:', e.message));
}

// ─── Wave ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/payments/wave/initiate
 */
export const initiateWavePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { demandeId } = req.body as { demandeId: number };
    if (!demandeId) { res.status(400).json({ success: false, message: 'demandeId requis' }); return; }

    const demande = await getDemandePendingPayment(Number(demandeId), res);
    if (!demande) return;

    // Réutiliser la session Wave si elle est encore ouverte
    if (demande.waveCheckoutId && demande.paymentProvider === 'WAVE') {
      try {
        const existing = await getCheckoutSession(demande.waveCheckoutId);
        if (existing.checkout_status === 'open') {
          res.json({ success: true, data: { checkoutUrl: existing.wave_launch_url, sessionId: demande.waveCheckoutId, montant: demande.montant } });
          return;
        }
      } catch { /* expirée → on recrée */ }
    }

    const session = await createCheckoutSession({
      amount: demande.montant,
      clientReference: `affiliation-${demande.id}-${Date.now()}`,
      successUrl: `${FRONTEND_URL}/affiliation/paiement-confirme?id=${demande.id}`,
      errorUrl: `${FRONTEND_URL}/affiliation/paiement-echec?id=${demande.id}`,
    });

    await prisma.affiliationDemande.update({
      where: { id: demande.id },
      data: { waveCheckoutId: session.id, waveCheckoutUrl: session.wave_launch_url, paymentProvider: 'WAVE' },
    });

    res.json({ success: true, data: { checkoutUrl: session.wave_launch_url, sessionId: session.id, montant: demande.montant } });
  } catch (err: any) {
    console.error('[Wave] initiate error:', err?.response?.data ?? err.message);
    res.status(500).json({ success: false, message: 'Impossible de créer la session Wave' });
  }
};

/**
 * POST /api/payments/wave/webhook
 */
export const waveWebhook = async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers['wave-signature'] as string ?? '';
  if (!verifyWebhookSignature(signature)) { res.status(401).json({ error: 'Signature invalide' }); return; }

  const payload = req.body as WaveWebhookPayload;
  if (payload.type === 'checkout.session.completed' && payload.data.payment_status === 'succeeded') {
    const demande = await prisma.affiliationDemande.findUnique({
      where: { waveCheckoutId: payload.data.id },
    });
    if (demande?.status === 'PENDING_PAYMENT') {
      await confirmPayment(demande.id, 'WAVE');
    }
  }
  res.status(200).json({ received: true });
};

// ─── Orange Money ─────────────────────────────────────────────────────────────

/**
 * POST /api/payments/om/initiate
 */
export const initiateOmPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { demandeId } = req.body as { demandeId: number };
    if (!demandeId) { res.status(400).json({ success: false, message: 'demandeId requis' }); return; }

    const demande = await getDemandePendingPayment(Number(demandeId), res);
    if (!demande) return;

    const orderId = generateOmOrderId(demande.id);

    const session = await createOmPayment({
      amount: demande.montant,
      orderId,
      returnUrl: `${FRONTEND_URL}/affiliation/paiement-confirme?id=${demande.id}`,
      cancelUrl: `${FRONTEND_URL}/affiliation/paiement-echec?id=${demande.id}`,
      notifUrl: `${BACKEND_URL}/api/payments/om/webhook`,
    });

    await prisma.affiliationDemande.update({
      where: { id: demande.id },
      data: { omOrderId: orderId, omPayToken: session.pay_token, paymentProvider: 'ORANGE_MONEY' },
    });

    res.json({
      success: true,
      data: { paymentUrl: session.payment_url, orderId, montant: demande.montant },
    });
  } catch (err: any) {
    console.error('[OrangeMoney] initiate error:', err?.response?.data ?? err.message);
    res.status(500).json({ success: false, message: 'Impossible de créer le paiement Orange Money' });
  }
};

/**
 * POST /api/payments/om/webhook
 * Notification Orange Money (notif_url)
 */
export const omWebhook = async (req: Request, res: Response): Promise<void> => {
  const payload = req.body as OmWebhookPayload;

  if (payload.status === 'SUCCESS' && payload.order_id) {
    const demande = await prisma.affiliationDemande.findUnique({
      where: { omOrderId: payload.order_id },
    });
    if (demande?.status === 'PENDING_PAYMENT') {
      await confirmPayment(demande.id, 'ORANGE_MONEY');
    }
  }
  res.status(200).json({ received: true });
};

// ─── Status unifié ────────────────────────────────────────────────────────────

/**
 * GET /api/payments/status/:demandeId
 * Vérifie le statut de paiement d'une demande (par son ID, toutes méthodes).
 */
export const checkPaymentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const demandeId = parseInt(req.params.demandeId as string);

    const demande = await prisma.affiliationDemande.findUnique({
      where: { id: demandeId },
      select: {
        id: true, status: true, paidAt: true, type: true,
        prenom: true, nom: true, montant: true,
        paymentProvider: true, waveCheckoutId: true, omOrderId: true,
      },
    });

    if (!demande) { res.status(404).json({ success: false, message: 'Demande introuvable' }); return; }

    // Si toujours PENDING_PAYMENT, interroger le provider pour être sûr
    if (demande.status === 'PENDING_PAYMENT') {
      if (demande.paymentProvider === 'WAVE' && demande.waveCheckoutId) {
        try {
          const s = await getCheckoutSession(demande.waveCheckoutId);
          if (s.payment_status === 'succeeded') {
            await confirmPayment(demande.id, 'WAVE');
          }
        } catch { /* pas critique */ }
      } else if (demande.paymentProvider === 'ORANGE_MONEY' && demande.omOrderId) {
        try {
          const s = await getOmPaymentStatus(demande.omOrderId);
          if (s.status === 'SUCCESS') {
            await confirmPayment(demande.id, 'ORANGE_MONEY');
          }
        } catch { /* pas critique */ }
      }
    }

    const fresh = await prisma.affiliationDemande.findUnique({
      where: { id: demandeId },
      select: { status: true, paidAt: true },
    });

    res.json({
      success: true,
      data: {
        paid: fresh?.status !== 'PENDING_PAYMENT',
        demandeId: demande.id,
        status: fresh?.status ?? demande.status,
        paidAt: fresh?.paidAt,
        type: demande.type,
        prenom: demande.prenom,
        nom: demande.nom,
        montant: demande.montant,
        paymentProvider: demande.paymentProvider,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

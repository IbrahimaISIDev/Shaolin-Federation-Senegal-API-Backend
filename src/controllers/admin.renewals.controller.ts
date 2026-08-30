// ============================================================
// CONTROLLER — admin.renewals.controller.ts
// Renouvellements de licence en attente de vérification (paiement manuel)
// ============================================================
import { Request, Response } from 'express';
import { listPendingRenewals, confirmRenewalPayment, rejectRenewalPayment } from '../services/licenses.service';

export const listRenewals = async (_req: Request, res: Response): Promise<void> => {
    try {
        const renewals = await listPendingRenewals();
        res.json({ data: renewals });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};

export const confirmRenewal = async (req: Request, res: Response): Promise<void> => {
    try {
        const paymentId = parseInt(req.params.paymentId as string);
        const payment = await confirmRenewalPayment(paymentId, req.user!.userId);
        res.json({ data: payment, message: 'Renouvellement confirmé' });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};

export const rejectRenewal = async (req: Request, res: Response): Promise<void> => {
    try {
        const paymentId = parseInt(req.params.paymentId as string);
        const payment = await rejectRenewalPayment(paymentId, req.user!.userId);
        res.json({ data: payment, message: 'Renouvellement rejeté' });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};

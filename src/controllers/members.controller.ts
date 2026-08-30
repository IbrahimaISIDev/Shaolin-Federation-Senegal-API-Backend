import { Request, Response } from 'express';
import { z } from 'zod';
import {
  getMemberProfile,
  updateMemberProfile,
  getMemberPayments,
  getMemberInscriptions,
  getActiveLicense,
  renewMyLicense,
  submitMyRenewalProof,
} from '../services/members.service';

const UpdateProfileSchema = z.object({
  prenom: z.string().min(1).max(100).optional(),
  nom: z.string().min(1).max(100).optional(),
  telephone: z.string().max(20).optional(),
  grade: z.string().max(50).optional(),
  discipline: z.string().max(100).optional(),
  photoUrl: z.string().url().optional(),
  adresse: z.string().max(255).optional(),
});

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = await getMemberProfile(req.user!.userId);
    res.json({ data: profile });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
  }
};

export const updateMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = UpdateProfileSchema.parse(req.body);
    const updated = await updateMemberProfile(req.user!.userId, data);
    res.json({ data: updated, message: 'Profil mis à jour' });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(422).json({ error: 'Données invalides', code: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
  }
};

export const getMyPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const payments = await getMemberPayments(req.user!.userId);
    res.json({ data: payments });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
  }
};

export const getMyInscriptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const inscriptions = await getMemberInscriptions(req.user!.userId);
    res.json({ data: inscriptions });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
  }
};

export const getMyLicense = async (req: Request, res: Response): Promise<void> => {
  try {
    const license = await getActiveLicense(req.user!.userId);
    res.json({ data: license });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
  }
};

const RenewSchema = z.object({ provider: z.enum(['WAVE', 'ORANGE_MONEY']) });

export const renewLicense = async (req: Request, res: Response): Promise<void> => {
  try {
    const { provider } = RenewSchema.parse(req.body);
    const result = await renewMyLicense(req.user!.userId, provider);
    res.status(201).json({ data: result, message: 'Renouvellement initié' });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(422).json({ error: 'Données invalides', code: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
  }
};

const RenewalProofSchema = z.object({
  transactionRef: z.string().min(1),
  preuveUrl: z.string().url(),
});

export const submitRenewalProof = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = RenewalProofSchema.parse(req.body);
    const licenseId = parseInt(req.params.licenseId as string);
    const payment = await submitMyRenewalProof(req.user!.userId, licenseId, data);
    res.json({ data: payment, message: 'Preuve de paiement envoyée' });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(422).json({ error: 'Données invalides', code: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
  }
};
// ─── CONTROLLER ──────────────────────────────────────────────────────────────
import { Request, Response } from 'express';
import { verifyQRCode, getLicenseQRCode, generateLicense } from '../services/licenses.service';
import { sendError } from '../utils/http-error';

export const verify = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.query as { token: string };
    if (!token) {
      res.status(400).json({ error: 'Token manquant', code: 'MISSING_TOKEN' });
      return;
    }
    const result = await verifyQRCode(token);
    res.json({ data: result });
  } catch (err: any) {
    sendError(res, err);
  }
};

export const getQRCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await getLicenseQRCode(parseInt(id as string), req.user!.userId);
    res.json({ data: result });
  } catch (err: any) {
    sendError(res, err);
  }
};

export const createLicense = async (req: Request, res: Response): Promise<void> => {
  try {
    const { memberId, annee } = req.body;
    const license = await generateLicense(memberId, annee);
    res.status(201).json({ data: license, message: 'Licence créée' });
  } catch (err: any) {
    sendError(res, err);
  }
};
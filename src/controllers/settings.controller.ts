// ============================================================
// CONTROLLER — settings.controller.ts
// ============================================================
import { Request, Response } from 'express';
import { z } from 'zod';
import { getSettings, updateSettings } from '../services/settings.service';

const UpdateSettingsSchema = z.object({
    orgName: z.string().min(1).max(200).optional(),
    contactEmail: z.string().email().optional().or(z.literal('')),
    contactPhone: z.string().max(30).optional().or(z.literal('')),
    website: z.string().url().optional().or(z.literal('')),
    notifyNewMember: z.boolean().optional(),
    notifyNewAffiliation: z.boolean().optional(),
    notifyCompetitions: z.boolean().optional(),
    notifyNewsletter: z.boolean().optional(),
});

export const get = async (_req: Request, res: Response): Promise<void> => {
    try {
        const settings = await getSettings();
        res.json({ data: settings });
    } catch (err: any) {
        res.status(500).json({ error: err.message, code: 'SERVER_ERROR' });
    }
};

export const update = async (req: Request, res: Response): Promise<void> => {
    try {
        const data = UpdateSettingsSchema.parse(req.body);
        const settings = await updateSettings(data);
        res.json({ data: settings, message: 'Paramètres mis à jour' });
    } catch (err: any) {
        if (err.name === 'ZodError') {
            res.status(422).json({ error: 'Données invalides', code: 'VALIDATION_ERROR', details: err.errors });
            return;
        }
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};

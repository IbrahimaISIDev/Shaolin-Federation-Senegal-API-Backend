// ============================================================
// CONTROLLER — competitions.controller.ts
// Public + Admin
// ============================================================
import { Request, Response } from 'express';
import { z } from 'zod';
import {
    listCompetitionsPublic,
    getCompetitionPublic,
    inscrireCompetition,
    listCompetitionsAdmin,
    getCompetitionAdmin,
    createCompetition,
    updateCompetition,
    deleteCompetition,
} from '../services/competitions.service';

const CompetitionSchema = z.object({
    titre: z.string().min(1).max(200),
    description: z.string().optional(),
    regionId: z.number().int().positive(),
    lieu: z.string().max(200).optional(),
    dateDebut: z.coerce.date(),
    dateFin: z.coerce.date().optional(),
    categories: z.any().optional(),
    imageUrl: z.string().url().optional().or(z.literal('')),
    isPublished: z.boolean().optional(),
});

const UpdateCompetitionSchema = CompetitionSchema.partial();

// ── Public ─────────────────────────────────────────────────────────────────────

export const listPublic = async (req: Request, res: Response): Promise<void> => {
    try {
        const { search, region, status, page = '1', limit = '20' } = req.query as any;
        const result = await listCompetitionsPublic({
            search,
            regionCode: region,
            status,
            page: parseInt(page),
            limit: Math.min(parseInt(limit), 50),
        });
        res.json(result);
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};

export const getPublic = async (req: Request, res: Response): Promise<void> => {
    try {
        const competition = await getCompetitionPublic(parseInt(req.params.id as string));
        res.json({ data: competition });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};

export const inscrire = async (req: Request, res: Response): Promise<void> => {
    try {
        const { categorie } = req.body;
        const inscription = await inscrireCompetition(
            req.user!.memberId!,
            parseInt(req.params.id as string),
            categorie
        );
        res.status(201).json({ data: inscription, message: 'Inscription enregistrée' });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};

// ── Admin ──────────────────────────────────────────────────────────────────────

export const listAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { search, page = '1', limit = '20' } = req.query as any;
        const result = await listCompetitionsAdmin({
            search,
            page: parseInt(page),
            limit: Math.min(parseInt(limit), 100),
        });
        res.json(result);
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};

export const getAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        const competition = await getCompetitionAdmin(parseInt(req.params.id as string));
        res.json({ data: competition });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};

export const create = async (req: Request, res: Response): Promise<void> => {
    try {
        const data = CompetitionSchema.parse(req.body);
        const competition = await createCompetition(data);
        res.status(201).json({ data: competition, message: 'Compétition créée' });
    } catch (err: any) {
        if (err.name === 'ZodError') {
            res.status(422).json({ error: 'Données invalides', code: 'VALIDATION_ERROR', details: err.errors });
            return;
        }
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};

export const update = async (req: Request, res: Response): Promise<void> => {
    try {
        const data = UpdateCompetitionSchema.parse(req.body);
        const competition = await updateCompetition(parseInt(req.params.id as string), data);
        res.json({ data: competition, message: 'Compétition mise à jour' });
    } catch (err: any) {
        if (err.name === 'ZodError') {
            res.status(422).json({ error: 'Données invalides', code: 'VALIDATION_ERROR', details: err.errors });
            return;
        }
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
    try {
        await deleteCompetition(parseInt(req.params.id as string));
        res.json({ message: 'Compétition supprimée' });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};

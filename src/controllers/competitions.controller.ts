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
    getResultsAdmin,
    saveResults,
    setResultsPublished,
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
        if (!req.user!.memberId) {
            res.status(403).json({ error: 'Inscription réservée aux membres licenciés', code: 'MEMBER_REQUIRED' });
            return;
        }
        const inscription = await inscrireCompetition(
            req.user!.memberId,
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


// ── Résultats (admin) ──────────────────────────────────────────────────────────

const ResultsSchema = z.object({
    resultats: z.array(z.object({
        memberId: z.number().int().positive(),
        categorie: z.string().max(100).optional(),
        classement: z.number().int().min(1, 'Le classement commence à 1').max(999),
        points: z.number().min(0).max(100000).nullable().optional(),
    })).max(1000),
});

const handleError = (res: Response, err: any) => {
    if (err.name === 'ZodError') {
        res.status(422).json({ error: err.errors?.[0]?.message ?? 'Données invalides', code: 'VALIDATION_ERROR', details: err.errors });
        return;
    }
    res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
};

export const getResults = async (req: Request, res: Response): Promise<void> => {
    try {
        res.json({ data: await getResultsAdmin(parseInt(req.params.id as string)) });
    } catch (err: any) {
        handleError(res, err);
    }
};

export const putResults = async (req: Request, res: Response): Promise<void> => {
    try {
        const { resultats } = ResultsSchema.parse(req.body);
        const data = await saveResults(parseInt(req.params.id as string), resultats);
        res.json({ data, message: 'Résultats enregistrés' });
    } catch (err: any) {
        handleError(res, err);
    }
};

export const publishResults = async (req: Request, res: Response): Promise<void> => {
    try {
        const { publie } = z.object({ publie: z.boolean() }).parse(req.body);
        const data = await setResultsPublished(parseInt(req.params.id as string), publie);
        res.json({ data, message: publie ? 'Résultats publiés' : 'Résultats retirés du site' });
    } catch (err: any) {
        handleError(res, err);
    }
};

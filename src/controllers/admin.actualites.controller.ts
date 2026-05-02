// ============================================================
// CONTROLLER — admin.actualites.controller.ts
// ============================================================
import { Request, Response } from 'express';
import { z } from 'zod';
import {
    listActualitesAdmin,
    getActualiteAdmin,
    createActualite,
    updateActualite,
    togglePublishActualite,
    deleteActualite,
} from '../services/admin.actualites.service';

const ArticleSchema = z.object({
    titre: z.string().min(1).max(255),
    contenu: z.string().min(1),
    imageUrl: z.string().url().optional().or(z.literal('')),
    isPublished: z.boolean().optional(),
});

const UpdateArticleSchema = ArticleSchema.partial();

export const listArticles = async (req: Request, res: Response): Promise<void> => {
    try {
        const { search, published, page = '1', limit = '20' } = req.query as any;
        const isPublished = published !== undefined ? published === 'true' : undefined;
        const result = await listActualitesAdmin({
            search,
            isPublished,
            page: parseInt(page),
            limit: Math.min(parseInt(limit), 100),
        });
        res.json(result);
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};

export const getArticle = async (req: Request, res: Response): Promise<void> => {
    try {
        const article = await getActualiteAdmin(parseInt(req.params.id as string));
        res.json({ data: article });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};

export const createArticle = async (req: Request, res: Response): Promise<void> => {
    try {
        const data = ArticleSchema.parse(req.body);
        const article = await createActualite(data);
        res.status(201).json({ data: article, message: 'Article créé' });
    } catch (err: any) {
        if (err.name === 'ZodError') {
            res.status(422).json({ error: 'Données invalides', code: 'VALIDATION_ERROR', details: err.errors });
            return;
        }
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};

export const updateArticle = async (req: Request, res: Response): Promise<void> => {
    try {
        const data = UpdateArticleSchema.parse(req.body);
        const article = await updateActualite(parseInt(req.params.id as string), data);
        res.json({ data: article, message: 'Article mis à jour' });
    } catch (err: any) {
        if (err.name === 'ZodError') {
            res.status(422).json({ error: 'Données invalides', code: 'VALIDATION_ERROR', details: err.errors });
            return;
        }
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};

export const publishArticle = async (req: Request, res: Response): Promise<void> => {
    try {
        const article = await togglePublishActualite(parseInt(req.params.id as string), true);
        res.json({ data: article, message: 'Article publié' });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};

export const unpublishArticle = async (req: Request, res: Response): Promise<void> => {
    try {
        const article = await togglePublishActualite(parseInt(req.params.id as string), false);
        res.json({ data: article, message: 'Article dépublié' });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};

export const deleteArticle = async (req: Request, res: Response): Promise<void> => {
    try {
        await deleteActualite(parseInt(req.params.id as string));
        res.json({ message: 'Article supprimé' });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};

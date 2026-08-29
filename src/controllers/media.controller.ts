// ============================================================
// CONTROLLER — media.controller.ts
// ============================================================
import { Request, Response } from 'express';
import { uploadMedia, listMedia, deleteMedia } from '../services/media.service';

export const upload = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'Aucun fichier fourni', code: 'NO_FILE' });
            return;
        }
        const title = req.body?.title as string | undefined;
        const item = await uploadMedia(req.file, req.user!.userId, title);
        res.status(201).json({ data: item, message: 'Média ajouté' });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};

export const list = async (req: Request, res: Response): Promise<void> => {
    try {
        const { search, page = '1', limit = '24' } = req.query as any;
        const result = await listMedia({
            search,
            page: parseInt(page),
            limit: Math.min(parseInt(limit), 100),
        });
        res.json(result);
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
    try {
        await deleteMedia(parseInt(req.params.id as string));
        res.json({ message: 'Média supprimé' });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};

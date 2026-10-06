// ============================================================
// CONTROLLER — media.controller.ts
// ============================================================
import { Request, Response } from 'express';
import { z } from 'zod';
import { uploadMedia, listMedia, deleteMedia, updateMedia, listPublicGallery } from '../services/media.service';
import { sendError } from '../utils/http-error';

export const upload = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'Aucun fichier fourni', code: 'NO_FILE' });
            return;
        }
        // Champs multipart : texte uniquement
        const item = await uploadMedia(req.file, req.user!.userId, {
            title: req.body?.title as string | undefined,
            album: (req.body?.album as string | undefined)?.slice(0, 100),
            inGallery: req.body?.inGallery === 'true',
        });
        res.status(201).json({ data: item, message: 'Média ajouté' });
    } catch (err: any) {
        sendError(res, err);
    }
};

export const list = async (req: Request, res: Response): Promise<void> => {
    try {
        const { search, page = '1', limit = '24', inGallery } = req.query as any;
        const result = await listMedia({
            search,
            page: parseInt(page),
            limit: Math.min(parseInt(limit), 100),
            inGallery: inGallery === 'true' ? true : inGallery === 'false' ? false : undefined,
        });
        res.json(result);
    } catch (err: any) {
        sendError(res, err);
    }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
    try {
        await deleteMedia(parseInt(req.params.id as string));
        res.json({ message: 'Média supprimé' });
    } catch (err: any) {
        sendError(res, err);
    }
};

const UpdateMediaSchema = z.object({
    title: z.string().max(150).optional(),
    album: z.string().max(100).nullable().optional(),
    inGallery: z.boolean().optional(),
});

export const update = async (req: Request, res: Response): Promise<void> => {
    try {
        const data = UpdateMediaSchema.parse(req.body);
        const item = await updateMedia(parseInt(req.params.id as string), data);
        res.json({ data: item, message: 'Média mis à jour' });
    } catch (err: any) {
        if (err.name === 'ZodError') {
            res.status(422).json({ error: err.errors?.[0]?.message ?? 'Données invalides', code: 'VALIDATION_ERROR' });
            return;
        }
        sendError(res, err);
    }
};

// GET /api/gallery — public
export const publicGallery = async (req: Request, res: Response): Promise<void> => {
    try {
        const { album, limit } = req.query as { album?: string; limit?: string };
        res.json(await listPublicGallery({ album, limit: limit ? parseInt(limit) : undefined }));
    } catch (err: any) {
        sendError(res, err);
    }
};

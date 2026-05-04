import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getArticles = async (req: Request, res: Response): Promise<void> => {
    try {
        const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 9));
        const skip  = (page - 1) * limit;

        const where = { isPublished: true };

        const [articles, total] = await prisma.$transaction([
            prisma.actualite.findMany({
                where,
                orderBy: { publishedAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.actualite.count({ where }),
        ]);

        res.json({ data: articles, total, page, limit });
    } catch {
        res.status(500).json({ error: 'Erreur serveur', code: 'SERVER_ERROR' });
    }
};

export const getArticle = async (req: Request, res: Response): Promise<void> => {
    try {
        const article = await prisma.actualite.findUnique({
            where: { slug: req.params.slug as string },
        });

        if (!article || !article.isPublished) {
            res.status(404).json({ error: 'Article introuvable', code: 'NOT_FOUND' });
            return;
        }

        res.json({ data: article });
    } catch {
        res.status(500).json({ error: 'Erreur serveur', code: 'SERVER_ERROR' });
    }
};

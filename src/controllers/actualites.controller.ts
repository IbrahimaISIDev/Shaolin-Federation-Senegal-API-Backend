import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getArticles = async (req: Request, res: Response) => {
    try {
        const articles = await prisma.actualite.findMany({
            where: {
                isPublished: true,
            },
            orderBy: {
                publishedAt: 'desc',
            },
        });

        res.json({ data: articles });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const getArticle = async (req: Request, res: Response) => {
    try {
        const article = await prisma.actualite.findUnique({
            where: {
                slug: req.params.slug as string,
            },
        });

        if (!article || !article.isPublished) {
            return res.status(404).json({ error: 'Article not found' });
        }

        res.json({ data: article });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

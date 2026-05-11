// ============================================================
// SERVICE — admin.actualites.service.ts
// CRUD complet des actualités pour l'admin
// ============================================================
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

function toSlug(titre: string): string {
    return titre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}

export const listActualitesAdmin = async (filters: {
    search?: string;
    isPublished?: boolean;
    page?: number;
    limit?: number;
}) => {
    const { search, isPublished, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (typeof isPublished === 'boolean') where.isPublished = isPublished;

    if (search) {
        where.OR = [
            { titre: { contains: search, mode: 'insensitive' } },
            { contenu: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [articles, total] = await Promise.all([
        prisma.actualite.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        }),
        prisma.actualite.count({ where }),
    ]);

    return { data: articles, total, page, limit };
};

export const getActualiteAdmin = async (id: number) => {
    const article = await prisma.actualite.findUnique({ where: { id } });
    if (!article) throw { status: 404, message: 'Article introuvable', code: 'NOT_FOUND' };
    return article;
};

export const createActualite = async (data: {
    titre: string;
    contenu: string;
    imageUrl?: string;
    isPublished?: boolean;
}) => {
    let slug = toSlug(data.titre);

    // Rendre le slug unique si besoin
    const existing = await prisma.actualite.findUnique({ where: { slug } });
    if (existing) {
        slug = `${slug}-${Date.now()}`;
    }

    return prisma.actualite.create({
        data: {
            ...data,
            slug,
            publishedAt: data.isPublished ? new Date() : null,
        },
    });
};

export const updateActualite = async (
    id: number,
    data: {
        titre?: string;
        contenu?: string;
        imageUrl?: string;
        isPublished?: boolean;
    }
) => {
    const article = await prisma.actualite.findUnique({ where: { id } });
    if (!article) throw { status: 404, message: 'Article introuvable', code: 'NOT_FOUND' };

    // Si on publie pour la première fois, enregistrer la date
    const publishedAt =
        data.isPublished && !article.isPublished ? new Date() : article.publishedAt;

    return prisma.actualite.update({
        where: { id },
        data: { ...data, publishedAt },
    });
};

export const togglePublishActualite = async (id: number, publish: boolean) => {
    const article = await prisma.actualite.findUnique({ where: { id } });
    if (!article) throw { status: 404, message: 'Article introuvable', code: 'NOT_FOUND' };

    return prisma.actualite.update({
        where: { id },
        data: {
            isPublished: publish,
            publishedAt: publish ? (article.publishedAt ?? new Date()) : article.publishedAt,
        },
    });
};

export const deleteActualite = async (id: number) => {
    const article = await prisma.actualite.findUnique({ where: { id } });
    if (!article) throw { status: 404, message: 'Article introuvable', code: 'NOT_FOUND' };
    await prisma.actualite.delete({ where: { id } });
};

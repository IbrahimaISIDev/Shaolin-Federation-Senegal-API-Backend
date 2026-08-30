// ============================================================
// SERVICE — competitions.service.ts
// Gestion publique + admin des compétitions
// ============================================================
import { PrismaClient } from '@prisma/client';
import { sendCompetitionRegistrationEmail } from './email.service';
const prisma = new PrismaClient();

// ── Public ─────────────────────────────────────────────────────────────────────

export const listCompetitionsPublic = async (filters: {
    search?: string;
    regionCode?: string;
    status?: 'upcoming' | 'open' | 'completed';
    page?: number;
    limit?: number;
}) => {
    const { search, regionCode, status, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;
    const where: any = { isPublished: true };
    const now = new Date();

    if (status === 'upcoming') {
        where.dateDebut = { gt: now };
    } else if (status === 'completed') {
        where.dateFin = { lt: now };
    } else if (status === 'open') {
        where.dateDebut = { lte: now };
        where.dateFin = { gte: now };
    }

    if (search) {
        where.OR = [
            { titre: { contains: search, mode: 'insensitive' } },
            { lieu: { contains: search, mode: 'insensitive' } },
        ];
    }

    if (regionCode) {
        const region = await prisma.region.findUnique({ where: { code: regionCode.toUpperCase() } });
        if (region) where.regionId = region.id;
    }

    const [competitions, total] = await Promise.all([
        prisma.competition.findMany({
            where,
            skip,
            take: limit,
            orderBy: { dateDebut: 'asc' },
            include: {
                region: { select: { nom: true, code: true } },
                _count: { select: { inscriptions: true } },
            },
        }),
        prisma.competition.count({ where }),
    ]);

    return { data: competitions, total, page, limit };
};

export const getCompetitionPublic = async (id: number) => {
    const competition = await prisma.competition.findUnique({
        where: { id, isPublished: true },
        include: {
            region: { select: { nom: true, code: true } },
            _count: { select: { inscriptions: true } },
            resultats: {
                orderBy: { classement: 'asc' },
                take: 10,
            },
        },
    });
    if (!competition) throw { status: 404, message: 'Compétition introuvable', code: 'NOT_FOUND' };
    return competition;
};

export const inscrireCompetition = async (memberId: number, competitionId: number, categorie?: string) => {
    const competition = await prisma.competition.findUnique({ where: { id: competitionId, isPublished: true } });
    if (!competition) throw { status: 404, message: 'Compétition introuvable', code: 'NOT_FOUND' };

    const existing = await prisma.inscription.findUnique({
        where: { memberId_competitionId: { memberId, competitionId } },
    });
    if (existing) throw { status: 409, message: 'Déjà inscrit à cette compétition', code: 'ALREADY_REGISTERED' };

    const inscription = await prisma.inscription.create({
        data: { memberId, competitionId, categorie },
    });

    // Email de confirmation (non-bloquant)
    const member = await prisma.member.findUnique({
        where: { id: memberId },
        include: { user: { select: { email: true } } },
    });
    if (member?.user?.email) {
        sendCompetitionRegistrationEmail(member.user.email, member.prenom, {
            titre:     competition.titre,
            dateDebut: competition.dateDebut,
            lieu:      competition.lieu,
        }).catch((e) => console.error('[email] sendCompetitionRegistrationEmail failed:', e.message));
    }

    return inscription;
};

// ── Admin ──────────────────────────────────────────────────────────────────────

export const listCompetitionsAdmin = async (filters: {
    search?: string;
    page?: number;
    limit?: number;
}) => {
    const { search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
        where.OR = [
            { titre: { contains: search, mode: 'insensitive' } },
            { lieu: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [competitions, total] = await Promise.all([
        prisma.competition.findMany({
            where,
            skip,
            take: limit,
            orderBy: { dateDebut: 'desc' },
            include: {
                region: { select: { nom: true, code: true } },
                _count: { select: { inscriptions: true } },
            },
        }),
        prisma.competition.count({ where }),
    ]);

    return { data: competitions, total, page, limit };
};

export const getCompetitionAdmin = async (id: number) => {
    const competition = await prisma.competition.findUnique({
        where: { id },
        include: {
            region: { select: { nom: true, code: true } },
            inscriptions: {
                include: {
                    member: { select: { id: true, prenom: true, nom: true, photoUrl: true } },
                },
            },
            resultats: { orderBy: { classement: 'asc' } },
        },
    });
    if (!competition) throw { status: 404, message: 'Compétition introuvable', code: 'NOT_FOUND' };
    return competition;
};

export const createCompetition = async (data: {
    titre: string;
    description?: string;
    regionId: number;
    lieu?: string;
    dateDebut: Date;
    dateFin?: Date;
    categories?: any;
    imageUrl?: string;
    isPublished?: boolean;
}) => {
    const region = await prisma.region.findUnique({ where: { id: data.regionId } });
    if (!region) throw { status: 404, message: 'Région introuvable', code: 'NOT_FOUND' };

    return prisma.competition.create({
        data: { ...data, isPublished: data.isPublished ?? false },
        include: { region: { select: { nom: true, code: true } } },
    });
};

export const updateCompetition = async (
    id: number,
    data: {
        titre?: string;
        description?: string;
        regionId?: number;
        lieu?: string;
        dateDebut?: Date;
        dateFin?: Date;
        categories?: any;
        imageUrl?: string;
        isPublished?: boolean;
    }
) => {
    const competition = await prisma.competition.findUnique({ where: { id } });
    if (!competition) throw { status: 404, message: 'Compétition introuvable', code: 'NOT_FOUND' };

    if (data.regionId) {
        const region = await prisma.region.findUnique({ where: { id: data.regionId } });
        if (!region) throw { status: 404, message: 'Région introuvable', code: 'NOT_FOUND' };
    }

    return prisma.competition.update({
        where: { id },
        data,
        include: { region: { select: { nom: true, code: true } } },
    });
};

export const deleteCompetition = async (id: number) => {
    const competition = await prisma.competition.findUnique({
        where: { id },
        include: { _count: { select: { inscriptions: true } } },
    });
    if (!competition) throw { status: 404, message: 'Compétition introuvable', code: 'NOT_FOUND' };

    return prisma.competition.delete({ where: { id } });
};

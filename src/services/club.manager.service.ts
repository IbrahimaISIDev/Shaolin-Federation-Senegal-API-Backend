// ============================================================
// SERVICE — club.manager.service.ts
// Espace Gestionnaire de Club
// ============================================================
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ─── Récupérer le club du gestionnaire connecté ───────────────────────────────
export const getManagerClub = async (userId: number) => {
    const member = await prisma.member.findUnique({
        where: { userId },
        include: {
            club: {
                include: {
                    region: { select: { id: true, nom: true, code: true } },
                    _count: { select: { members: true } },
                },
            },
        },
    });
    if (!member?.club) throw { status: 404, message: 'Club introuvable', code: 'NOT_FOUND' };
    return { member, club: member.club };
};

// ─── Stats du club ────────────────────────────────────────────────────────────
export const getClubStats = async (clubId: number) => {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
        totalMembers,
        activeLicenses,
        pendingLicenses,
        expiredLicenses,
        expiringLicenses,
        upcomingInscriptions,
    ] = await Promise.all([
        prisma.member.count({ where: { clubId } }),
        prisma.license.count({ where: { member: { clubId }, status: 'ACTIVE' } }),
        prisma.license.count({ where: { member: { clubId }, status: 'PENDING' } }),
        prisma.license.count({ where: { member: { clubId }, status: 'EXPIRED' } }),
        prisma.license.count({
            where: {
                member: { clubId },
                status: 'ACTIVE',
                dateFin: { gte: now, lte: thirtyDaysLater },
            },
        }),
        prisma.inscription.count({
            where: {
                member: { clubId },
                competition: { dateDebut: { gt: now } },
            },
        }),
    ]);

    return {
        totalMembers,
        activeLicenses,
        pendingLicenses,
        expiredLicenses,
        expiringLicenses,
        upcomingInscriptions,
    };
};

// ─── Liste des membres du club ────────────────────────────────────────────────
export const getClubMembers = async (
    clubId: number,
    filters: {
        search?: string;
        licenseStatus?: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'SUSPENDED';
        page?: number;
        limit?: number;
    }
) => {
    const { search, licenseStatus, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;
    const where: any = { clubId };

    if (search) {
        where.OR = [
            { prenom: { contains: search, mode: 'insensitive' } },
            { nom:    { contains: search, mode: 'insensitive' } },
            { user:   { email: { contains: search, mode: 'insensitive' } } },
        ];
    }

    if (licenseStatus) {
        where.licenses = { some: { status: licenseStatus } };
    }

    const [members, total] = await Promise.all([
        prisma.member.findMany({
            where,
            skip,
            take: limit,
            orderBy: { nom: 'asc' },
            include: {
                user: { select: { email: true, phone: true, isActive: true } },
                licenses: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { id: true, status: true, annee: true, dateFin: true },
                },
            },
        }),
        prisma.member.count({ where }),
    ]);

    return { data: members, total, page, limit };
};

// ─── Licences du club ─────────────────────────────────────────────────────────
export const getClubLicenses = async (
    clubId: number,
    filters: {
        status?: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'SUSPENDED';
        page?: number;
        limit?: number;
    }
) => {
    const { status, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;
    const where: any = { member: { clubId } };
    if (status) where.status = status;

    const [licenses, total] = await Promise.all([
        prisma.license.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                member: {
                    select: {
                        id: true, prenom: true, nom: true, photoUrl: true, grade: true,
                        user: { select: { email: true } },
                    },
                },
            },
        }),
        prisma.license.count({ where }),
    ]);

    return { data: licenses, total, page, limit };
};

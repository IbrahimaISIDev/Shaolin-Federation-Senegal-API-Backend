// ============================================================
// SERVICE — competitions.service.ts
// Gestion publique + admin des compétitions
// ============================================================
import { prisma } from '../lib/prisma';
import { sendCompetitionRegistrationEmail, sendAdminCompetitionRegistrationEmail } from './email.service';

// ── Public ─────────────────────────────────────────────────────────────────────

export const listCompetitionsPublic = async (filters: {
    search?: string;
    regionCode?: string;
    status?: 'upcoming' | 'open' | 'completed';
    from?: Date;   // période (calendrier) : compétitions qui la chevauchent
    to?: Date;
    page?: number;
    limit?: number;
}) => {
    const { search, regionCode, status, from, to, page = 1, limit = 20 } = filters;
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

    // Chevauchement avec [from, to] : commence avant la fin de la période et
    // se termine (ou commence, si pas de date de fin) après son début
    if (from && to) {
        where.AND = [
            { dateDebut: { lte: to } },
            { OR: [{ dateFin: { gte: from } }, { dateFin: null, dateDebut: { gte: from } }] },
        ];
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
            // Résultats exposés uniquement une fois publiés par l'admin
            resultats: {
                where: { competition: { resultatsPublies: true } },
                orderBy: [{ categorie: 'asc' }, { classement: 'asc' }],
                select: {
                    id: true, categorie: true, classement: true, points: true, medaille: true,
                    member: {
                        select: { prenom: true, nom: true, club: { select: { nom: true } } },
                    },
                },
            },
        },
    });
    if (!competition) throw { status: 404, message: 'Compétition introuvable', code: 'NOT_FOUND' };
    return competition;
};

export const inscrireCompetition = async (memberId: number, competitionId: number, categorie?: string) => {
    const competition = await prisma.competition.findUnique({ where: { id: competitionId, isPublished: true } });
    if (!competition) throw { status: 404, message: 'Compétition introuvable', code: 'NOT_FOUND' };

    const now = new Date();
    if (competition.dateDebut <= now) {
        throw { status: 400, message: 'Les inscriptions sont closes : la compétition a déjà commencé', code: 'REGISTRATION_CLOSED' };
    }

    // Seuls les licenciés à jour peuvent s'inscrire
    const activeLicense = await prisma.license.findFirst({
        where: {
            memberId,
            status: 'ACTIVE',
            OR: [{ dateFin: null }, { dateFin: { gte: now } }],
        },
    });
    if (!activeLicense) {
        throw { status: 403, message: 'Une licence active est requise pour s\'inscrire à une compétition', code: 'LICENSE_REQUIRED' };
    }

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
        include: { user: { select: { email: true } }, club: { select: { nom: true } } },
    });
    if (member) {
        sendAdminCompetitionRegistrationEmail({
            prenom: member.prenom, nom: member.nom, club: member.club.nom,
            competition: competition.titre, competitionId, categorie,
        }).catch((e) => console.error('[email] sendAdminCompetitionRegistrationEmail failed:', e.message));
    }
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
    // Les inscriptions ne sont pas supprimées en cascade : message clair au lieu d'une erreur 500
    if (competition._count.inscriptions > 0) {
        throw {
            status: 409,
            message: `Impossible de supprimer : ${competition._count.inscriptions} inscription(s). Dépubliez plutôt la compétition.`,
            code: 'HAS_INSCRIPTIONS',
        };
    }

    return prisma.competition.delete({ where: { id } });
};

// ── Résultats (admin) ──────────────────────────────────────────────────────────

// Médaille déduite du classement (ex aequo possibles, ex. deux bronzes en combat)
const medailleFor = (classement: number) =>
    classement === 1 ? 'OR' : classement === 2 ? 'ARGENT' : classement === 3 ? 'BRONZE' : null;

// Données de l'écran de saisie : participants inscrits + résultats existants
export const getResultsAdmin = async (competitionId: number) => {
    const competition = await prisma.competition.findUnique({
        where: { id: competitionId },
        select: {
            id: true, titre: true, dateDebut: true, categories: true, resultatsPublies: true,
            inscriptions: {
                orderBy: [{ categorie: 'asc' }, { createdAt: 'asc' }],
                select: {
                    categorie: true,
                    member: {
                        select: { id: true, prenom: true, nom: true, club: { select: { nom: true } } },
                    },
                },
            },
            resultats: {
                orderBy: [{ categorie: 'asc' }, { classement: 'asc' }],
                select: { id: true, memberId: true, categorie: true, classement: true, points: true, medaille: true },
            },
        },
    });
    if (!competition) throw { status: 404, message: 'Compétition introuvable', code: 'NOT_FOUND' };
    return competition;
};

// Remplace l'ensemble des résultats d'une compétition (saisie en tableau)
export const saveResults = async (
    competitionId: number,
    rows: { memberId: number; categorie?: string; classement: number; points?: number | null }[]
) => {
    const competition = await prisma.competition.findUnique({
        where: { id: competitionId },
        select: { id: true, inscriptions: { select: { memberId: true } } },
    });
    if (!competition) throw { status: 404, message: 'Compétition introuvable', code: 'NOT_FOUND' };

    // Seuls les participants inscrits peuvent être classés
    const inscrits = new Set(competition.inscriptions.map((i) => i.memberId));
    const notRegistered = rows.filter((r) => !inscrits.has(r.memberId));
    if (notRegistered.length > 0) {
        throw { status: 400, message: 'Seuls les participants inscrits à la compétition peuvent être classés', code: 'NOT_REGISTERED' };
    }

    const seen = new Set<string>();
    const data = rows.map((r) => {
        const categorie = (r.categorie ?? '').trim();
        const key = `${r.memberId}|${categorie.toLowerCase()}`;
        if (seen.has(key)) {
            throw { status: 400, message: 'Un participant ne peut être classé qu\'une fois par catégorie', code: 'DUPLICATE_RESULT' };
        }
        seen.add(key);
        return {
            competitionId,
            memberId: r.memberId,
            categorie,
            classement: r.classement,
            points: r.points ?? null,
            medaille: medailleFor(r.classement),
        };
    });

    await prisma.$transaction([
        prisma.resultat.deleteMany({ where: { competitionId } }),
        prisma.resultat.createMany({ data }),
    ]);

    return getResultsAdmin(competitionId);
};

export const setResultsPublished = async (competitionId: number, publie: boolean) => {
    const competition = await prisma.competition.findUnique({
        where: { id: competitionId },
        select: { id: true, _count: { select: { resultats: true } } },
    });
    if (!competition) throw { status: 404, message: 'Compétition introuvable', code: 'NOT_FOUND' };
    if (publie && competition._count.resultats === 0) {
        throw { status: 400, message: 'Aucun résultat à publier : saisissez d\'abord le classement', code: 'NO_RESULTS' };
    }
    return prisma.competition.update({
        where: { id: competitionId },
        data: { resultatsPublies: publie },
        select: { id: true, resultatsPublies: true },
    });
};

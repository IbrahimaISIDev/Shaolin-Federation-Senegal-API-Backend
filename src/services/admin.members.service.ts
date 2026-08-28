// ============================================================
// SERVICE — admin.members.service.ts
// Gestion CRUD des membres par un administrateur
// ============================================================
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const listMembersAdmin = async (filters: {
    search?: string;
    clubId?: number;
    status?: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
    annee?: number;
    page?: number;
    limit?: number;
}) => {
    const { search, clubId, status, annee, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (clubId) where.clubId = clubId;

    if (search) {
        where.OR = [
            { prenom: { contains: search, mode: 'insensitive' } },
            { nom: { contains: search, mode: 'insensitive' } },
            { user: { email: { contains: search, mode: 'insensitive' } } },
        ];
    }

    // Filtre par statut et/ou saison (année) de licence
    if (status || annee) {
        where.licenses = {
            some: {
                ...(status ? { status } : {}),
                ...(annee ? { annee } : {}),
            },
        };
    }

    const [members, total] = await Promise.all([
        prisma.member.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { email: true, phone: true, role: true, isActive: true } },
                club: { select: { id: true, nom: true, region: { select: { nom: true, code: true } } } },
                licenses: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { id: true, status: true, dateFin: true, annee: true },
                },
            },
        }),
        prisma.member.count({ where }),
    ]);

    return { data: members, total, page, limit };
};

export const getMemberAdmin = async (id: number) => {
    const member = await prisma.member.findUnique({
        where: { id },
        include: {
            user: { select: { email: true, phone: true, role: true, isActive: true } },
            club: { select: { id: true, nom: true, region: { select: { nom: true, code: true } } } },
            licenses: {
                orderBy: { createdAt: 'desc' },
                include: { payments: true },
            },
            inscriptions: {
                include: { competition: { select: { id: true, titre: true, dateDebut: true } } },
            },
        },
    });

    if (!member) throw { status: 404, message: 'Membre introuvable', code: 'NOT_FOUND' };
    return member;
};

export const updateMemberAdmin = async (
    id: number,
    data: {
        prenom?: string;
        nom?: string;
        grade?: string;
        discipline?: string;
        photoUrl?: string;
        clubId?: number;
        dateNaissance?: Date;
        sexe?: 'M' | 'F';
    },
    changedById?: number
) => {
    const member = await prisma.member.findUnique({ where: { id } });
    if (!member) throw { status: 404, message: 'Membre introuvable', code: 'NOT_FOUND' };

    if (data.clubId) {
        const club = await prisma.club.findUnique({ where: { id: data.clubId } });
        if (!club) throw { status: 404, message: 'Club introuvable', code: 'NOT_FOUND' };
    }

    const gradeChanged = data.grade !== undefined && data.grade !== member.grade;

    const [updated] = await prisma.$transaction([
        prisma.member.update({
            where: { id },
            data,
            include: {
                user: { select: { email: true, phone: true, role: true, isActive: true } },
                club: { select: { id: true, nom: true } },
            },
        }),
        ...(gradeChanged
            ? [
                  prisma.gradeHistory.create({
                      data: {
                          memberId: id,
                          ancienGrade: member.grade,
                          nouveauGrade: data.grade!,
                          changedById,
                      },
                  }),
              ]
            : []),
    ]);

    return updated;
};

export const getGradeHistoryAdmin = async (memberId: number) => {
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) throw { status: 404, message: 'Membre introuvable', code: 'NOT_FOUND' };

    return prisma.gradeHistory.findMany({
        where: { memberId },
        orderBy: { createdAt: 'desc' },
        include: { changedBy: { select: { email: true } } },
    });
};

export const deleteMemberAdmin = async (id: number) => {
    const member = await prisma.member.findUnique({
        where: { id },
        include: { _count: { select: { licenses: true, inscriptions: true } } },
    });
    if (!member) throw { status: 404, message: 'Membre introuvable', code: 'NOT_FOUND' };

    // Cascade via Prisma (licenses, inscriptions) — supprime aussi l'user lié
    await prisma.member.delete({ where: { id } });
    // L'utilisateur est supprimé en cascade (onDelete: Cascade dans le schéma)
};

export const validateMember = async (id: number) => {
    const member = await prisma.member.findUnique({
        where: { id },
        include: { user: true },
    });
    if (!member) throw { status: 404, message: 'Membre introuvable', code: 'NOT_FOUND' };

    return prisma.user.update({
        where: { id: member.userId },
        data: { isActive: true },
    });
};

export const suspendMember = async (id: number) => {
    const member = await prisma.member.findUnique({
        where: { id },
        include: { user: true },
    });
    if (!member) throw { status: 404, message: 'Membre introuvable', code: 'NOT_FOUND' };

    return prisma.user.update({
        where: { id: member.userId },
        data: { isActive: false },
    });
};

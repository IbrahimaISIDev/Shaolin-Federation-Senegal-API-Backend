// ============================================================
// CONTROLLER — admin.stats.controller.ts
// Dashboard KPIs enrichis pour le tableau de bord admin
// ============================================================
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const stats = async (_req: Request, res: Response): Promise<void> => {
    try {
        const now = new Date();
        const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [
            totalMembers,
            newMembersThisWeek,
            pendingMembers,
            totalClubs,
            activeClubs,
            totalLicenses,
            activeLicenses,
            expiringLicenses,
            expiredLicenses,
            draftArticles,
            totalCompetitions,
            upcomingCompetitions,
            _membersByRegion,
            membersByMonth,
        ] = await Promise.all([
            // Comptages globaux
            prisma.member.count(),
            prisma.member.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
            prisma.member.count({ where: { user: { isActive: false } } }),
            prisma.club.count(),
            prisma.club.count({ where: { isActive: true } }),
            prisma.license.count(),
            prisma.license.count({ where: { status: 'ACTIVE' } }),

            // Licences expirant dans 30 jours
            prisma.license.count({
                where: {
                    status: 'ACTIVE',
                    dateFin: { gte: now, lte: thirtyDaysLater },
                },
            }),

            // Licences expirées
            prisma.license.count({ where: { status: 'EXPIRED' } }),

            // Articles en brouillon
            prisma.actualite.count({ where: { isPublished: false } }),

            // Compétitions
            prisma.competition.count(),
            prisma.competition.count({ where: { dateDebut: { gt: now }, isPublished: true } }),

            // Membres par région (placeholder — résultat ignoré, on utilise la raw query)
            prisma.club.groupBy({
                by: ['regionId'],
                _count: { id: true },
            }),

            // Membres par mois (derniers 12 mois)
            prisma.$queryRaw<Array<{ mois: string; total: number }>>`
        SELECT TO_CHAR("createdAt", 'YYYY-MM') as mois, COUNT(*)::int as total
        FROM members
        WHERE "createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
        ORDER BY mois ASC
      `,
        ]);

        const membersParRegion = await prisma.$queryRaw<
            Array<{ regionNom: string; regionCode: string; total: number }>
        >`
      SELECT r.nom as "regionNom", r.code as "regionCode", COUNT(m.id)::int as total
      FROM members m
      JOIN clubs c ON m."clubId" = c.id
      JOIN regions r ON c."regionId" = r.id
      GROUP BY r.id, r.nom, r.code
      ORDER BY total DESC
    `;

        res.json({
            data: {
                // Membres
                totalMembers,
                newMembersThisWeek,
                pendingMembers,

                // Clubs
                totalClubs,
                activeClubs,

                // Licences
                totalLicenses,
                activeLicenses,
                expiringLicenses,
                expiredLicenses,

                // Contenu
                draftArticles,

                // Compétitions
                totalCompetitions,
                upcomingCompetitions,

                // Graphiques
                membresParRegion: membersParRegion,
                membresMoisParMois: membersByMonth,
            },
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message, code: 'SERVER_ERROR' });
    }
};

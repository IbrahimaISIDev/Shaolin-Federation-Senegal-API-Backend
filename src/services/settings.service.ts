// ============================================================
// SERVICE — settings.service.ts
// Paramètres généraux de l'association (ligne unique, id=1)
// ============================================================
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getSettings = async () => {
    return prisma.settings.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1 },
    });
};

export const updateSettings = async (data: {
    orgName?: string;
    contactEmail?: string;
    contactPhone?: string;
    website?: string;
    paymentWaveNumber?: string;
    paymentOMNumber?: string;
    notifyNewMember?: boolean;
    notifyNewAffiliation?: boolean;
    notifyCompetitions?: boolean;
    notifyNewsletter?: boolean;
}) => {
    return prisma.settings.upsert({
        where: { id: 1 },
        update: data,
        create: { id: 1, ...data },
    });
};

// ─── SERVICE ─────────────────────────────────────────────────────────────────
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getAllRegions = async () => {
  return prisma.region.findMany({
    orderBy: { nom: 'asc' },
    select: {
      id: true,
      nom: true,
      code: true,
      latitude: true,
      longitude: true,
      _count: { select: { clubs: true } },
    },
  });
};

export const getRegionByCode = async (code: string) => {
  const region = await prisma.region.findUnique({
    where: { code: code.toUpperCase() },
    include: { _count: { select: { clubs: true } } },
  });
  if (!region) throw { status: 404, message: 'Région introuvable', code: 'NOT_FOUND' };
  return region;
};
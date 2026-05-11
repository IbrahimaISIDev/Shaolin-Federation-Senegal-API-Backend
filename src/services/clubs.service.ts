import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

interface ClubFilters {
  regionCode?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const getClubs = async ({ regionCode, search, page = 1, limit = 20 }: ClubFilters) => {
  const skip = (page - 1) * limit;

  const where: any = { isActive: true };

  if (regionCode) {
    const region = await prisma.region.findUnique({ where: { code: regionCode.toUpperCase() } });
    if (region) where.regionId = region.id;
  }

  if (search) {
    where.OR = [
      { nom: { contains: search, mode: 'insensitive' } },
      { ville: { contains: search, mode: 'insensitive' } },
      { nomMaitre: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [clubs, total] = await Promise.all([
    prisma.club.findMany({
      where,
      skip,
      take: limit,
      orderBy: { nom: 'asc' },
      include: {
        region: { select: { id: true, nom: true, code: true } },
        _count: { select: { members: true } },
      },
    }),
    prisma.club.count({ where }),
  ]);

  return { data: clubs, total, page, limit };
};

export const getClubById = async (id: number) => {
  const club = await prisma.club.findUnique({
    where: { id },
    include: {
      region: { select: { id: true, nom: true, code: true } },
      _count: { select: { members: true } },
    },
  });
  if (!club) throw { status: 404, message: 'Club introuvable', code: 'NOT_FOUND' };
  return club;
};

// Pour la carte — clubs géolocalisés par région
export const getClubsForMap = async (regionCode?: string, limit = 100) => {
  const where: any = { isActive: true, latitude: { not: null }, longitude: { not: null } };

  if (regionCode) {
    const region = await prisma.region.findUnique({ where: { code: regionCode.toUpperCase() } });
    if (region) where.regionId = region.id;
  }

  return prisma.club.findMany({
    where,
    take: limit,
    select: {
      id: true,
      nom: true,
      latitude: true,
      longitude: true,
      ville: true,
      nomMaitre: true,
      telephone: true,
      email: true,
      region: { select: { nom: true, code: true } },
      _count: { select: { members: true } },
    },
  });
};

// Recherche pour la carte
export const searchClubs = async (q: string) => {
  return prisma.club.findMany({
    where: {
      isActive: true,
      OR: [
        { nom: { contains: q, mode: 'insensitive' } },
        { ville: { contains: q, mode: 'insensitive' } },
        { nomMaitre: { contains: q, mode: 'insensitive' } },
      ],
    },
    take: 10,
    select: {
      id: true,
      nom: true,
      ville: true,
      latitude: true,
      longitude: true,
      region: { select: { nom: true, code: true } },
    },
  });
};
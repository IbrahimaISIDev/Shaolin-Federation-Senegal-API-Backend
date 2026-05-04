// ============================================================
// SERVICE — admin.clubs.service.ts
// ============================================================
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const listClubsAdmin = async (filters: {
  search?: string;
  regionCode?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}) => {
  const { search, regionCode, isActive, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;
  const where: any = {};

  if (typeof isActive === 'boolean') where.isActive = isActive;

  if (search) {
    where.OR = [
      { nom: { contains: search, mode: 'insensitive' } },
      { ville: { contains: search, mode: 'insensitive' } },
      { nomMaitre: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (regionCode) {
    const region = await prisma.region.findUnique({ where: { code: regionCode.toUpperCase() } });
    if (region) where.regionId = region.id;
  }

  const [clubs, total] = await Promise.all([
    prisma.club.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        region: { select: { nom: true, code: true } },
        _count: { select: { members: true } },
      },
    }),
    prisma.club.count({ where }),
  ]);

  return { data: clubs, total, page, limit };
};

export const createClub = async (data: {
  nom: string;
  regionId: number;
  ville?: string;
  latitude?: number;
  longitude?: number;
  nomMaitre?: string;
  telephone?: string;
  email?: string;
  description?: string;
  logoUrl?: string;
}) => {
  const region = await prisma.region.findUnique({ where: { id: data.regionId } });
  if (!region) throw { status: 404, message: 'Région introuvable', code: 'NOT_FOUND' };

  return prisma.club.create({
    data: { ...data, isActive: true },
    include: { region: { select: { nom: true, code: true } } },
  });
};

export const updateClub = async (id: number, data: {
  nom?: string;
  regionId?: number;
  ville?: string;
  latitude?: number;
  longitude?: number;
  nomMaitre?: string;
  telephone?: string;
  email?: string;
  description?: string;
  logoUrl?: string;
  isActive?: boolean;
}) => {
  const club = await prisma.club.findUnique({ where: { id } });
  if (!club) throw { status: 404, message: 'Club introuvable', code: 'NOT_FOUND' };

  if (data.regionId) {
    const region = await prisma.region.findUnique({ where: { id: data.regionId } });
    if (!region) throw { status: 404, message: 'Région introuvable', code: 'NOT_FOUND' };
  }

  return prisma.club.update({
    where: { id },
    data,
    include: { region: { select: { nom: true, code: true } } },
  });
};

export const toggleClubStatus = async (id: number, isActive: boolean) => {
  const club = await prisma.club.findUnique({ where: { id } });
  if (!club) throw { status: 404, message: 'Club introuvable', code: 'NOT_FOUND' };
  return prisma.club.update({ where: { id }, data: { isActive } });
};

export const deleteClub = async (id: number) => {
  const club = await prisma.club.findUnique({
    where: { id },
    include: { _count: { select: { members: true } } },
  });
  if (!club) throw { status: 404, message: 'Club introuvable', code: 'NOT_FOUND' };
  if (club._count.members > 0) {
    throw { status: 409, message: `Impossible de supprimer : ${club._count.members} membre(s) affilié(s)`, code: 'HAS_MEMBERS' };
  }
  return prisma.club.delete({ where: { id } });
};
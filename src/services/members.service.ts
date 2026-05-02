import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getMemberProfile = async (userId: number) => {
  const member = await prisma.member.findUnique({
    where: { userId },
    include: {
      user: { select: { email: true, phone: true, role: true, createdAt: true } },
      club: {
        include: { region: { select: { nom: true, code: true } } },
      },
      licenses: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true, uuid: true, status: true,
          dateDebut: true, dateFin: true, annee: true, pdfUrl: true,
        },
      },
    },
  });
  if (!member) throw { status: 404, message: 'Membre introuvable', code: 'NOT_FOUND' };
  return member;
};

export const updateMemberProfile = async (userId: number, data: {
  prenom?: string; nom?: string; phone?: string;
  grade?: string; discipline?: string; photoUrl?: string;
}) => {
  const member = await prisma.member.findUnique({ where: { userId } });
  if (!member) throw { status: 404, message: 'Membre introuvable', code: 'NOT_FOUND' };

  const [updatedMember] = await prisma.$transaction([
    prisma.member.update({
      where: { userId },
      data: {
        prenom: data.prenom,
        nom: data.nom,
        grade: data.grade,
        discipline: data.discipline,
        photoUrl: data.photoUrl,
      },
    }),
    ...(data.phone ? [prisma.user.update({
      where: { id: userId },
      data: { phone: data.phone },
    })] : []),
  ]);

  return updatedMember;
};

export const getMemberPayments = async (userId: number) => {
  const member = await prisma.member.findUnique({ where: { userId } });
  if (!member) throw { status: 404, message: 'Membre introuvable', code: 'NOT_FOUND' };

  return prisma.payment.findMany({
    where: { license: { memberId: member.id } },
    orderBy: { createdAt: 'desc' },
    include: {
      license: { select: { annee: true, uuid: true } },
    },
  });
};

export const getActiveLicense = async (userId: number) => {
  const member = await prisma.member.findUnique({ where: { userId } });
  if (!member) throw { status: 404, message: 'Membre introuvable', code: 'NOT_FOUND' };

  const license = await prisma.license.findFirst({
    where: { memberId: member.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });

  return license;
};
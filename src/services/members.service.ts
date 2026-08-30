import { PrismaClient, PaymentProvider } from '@prisma/client';
import { renewLicense, submitRenewalProof } from './licenses.service';
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
        take: 5, // au-delà du plus récent : permet au frontend de distinguer un renouvellement
                 // en cours (nouvelle licence PENDING) de la licence ACTIVE/EXPIRED en vigueur
        select: {
          id: true, uuid: true, status: true,
          dateDebut: true, dateFin: true, annee: true, pdfUrl: true,
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, status: true, transactionRef: true, montant: true, provider: true },
          },
        },
      },
    },
  });
  if (!member) throw { status: 404, message: 'Membre introuvable', code: 'NOT_FOUND' };
  return member;
};

export const updateMemberProfile = async (userId: number, data: {
  prenom?: string; nom?: string; telephone?: string;
  grade?: string; discipline?: string; photoUrl?: string; adresse?: string;
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
        adresse: data.adresse,
      },
    }),
    ...(data.telephone ? [prisma.user.update({
      where: { id: userId },
      data: { phone: data.telephone },
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

export const getMemberInscriptions = async (userId: number) => {
  const member = await prisma.member.findUnique({ where: { userId } });
  if (!member) throw { status: 404, message: 'Membre introuvable', code: 'NOT_FOUND' };

  return prisma.inscription.findMany({
    where: { memberId: member.id },
    orderBy: { createdAt: 'desc' },
    include: {
      competition: {
        select: {
          id: true, titre: true, lieu: true, dateDebut: true, dateFin: true,
          region: { select: { nom: true, code: true } },
        },
      },
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

export const renewMyLicense = async (userId: number, provider: PaymentProvider) => {
  const member = await prisma.member.findUnique({ where: { userId } });
  if (!member) throw { status: 404, message: 'Membre introuvable', code: 'NOT_FOUND' };
  return renewLicense(member.id, provider);
};

export const submitMyRenewalProof = async (
  userId: number,
  licenseId: number,
  data: { transactionRef: string; preuveUrl: string }
) => {
  const member = await prisma.member.findUnique({ where: { userId } });
  if (!member) throw { status: 404, message: 'Membre introuvable', code: 'NOT_FOUND' };
  return submitRenewalProof(licenseId, member.id, data);
};
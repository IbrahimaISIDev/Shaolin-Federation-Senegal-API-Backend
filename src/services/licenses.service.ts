import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// ─── Générer un QR Token signé ───────────────────────────────────────────────
const generateQRToken = (licenseUuid: string, memberId: number): string => {
  return jwt.sign(
    { licenseUuid, memberId, type: 'LICENSE_QR' },
    process.env.QR_SECRET!,
    { expiresIn: '366d' }
  );
};

// ─── Générer une licence complète ────────────────────────────────────────────
export const generateLicense = async (memberId: number, annee?: number) => {
  const currentYear = annee || new Date().getFullYear();

  // Vérifier qu'il n'y a pas déjà une licence active pour cette année
  const existing = await prisma.license.findFirst({
    where: { memberId, annee: currentYear, status: { in: ['ACTIVE', 'PENDING'] } },
  });
  if (existing) {
    throw { status: 409, message: 'Une licence existe déjà pour cette année', code: 'LICENSE_EXISTS' };
  }

  const licenseUuid = uuidv4();
  const qrToken = generateQRToken(licenseUuid, memberId);

  const dateDebut = new Date();
  const dateFin = new Date(currentYear, 11, 31); // 31 décembre

  const license = await prisma.license.create({
    data: {
      memberId,
      uuid: licenseUuid,
      qrToken,
      status: 'PENDING', // devient ACTIVE après paiement
      dateDebut,
      dateFin,
      annee: currentYear,
    },
  });

  return license;
};

// ─── Générer le QR Code en base64 (pour l'affichage) ────────────────────────
export const getLicenseQRCode = async (licenseId: number, userId: number) => {
  const member = await prisma.member.findUnique({ where: { userId } });
  if (!member) throw { status: 404, message: 'Membre introuvable', code: 'NOT_FOUND' };

  const license = await prisma.license.findFirst({
    where: { id: licenseId, memberId: member.id },
  });
  if (!license) throw { status: 404, message: 'Licence introuvable', code: 'NOT_FOUND' };

  // Générer le QR Code en base64
  const verifyUrl = `${process.env.FRONTEND_URL}/verify?token=${license.qrToken}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 300,
    margin: 2,
    color: { dark: '#1A5276', light: '#FFFFFF' },
  });

  return { qrDataUrl, license };
};

// ─── Vérifier un QR Code (endpoint public pour les événements) ───────────────
export const verifyQRCode = async (token: string) => {
  // Vérifier la signature JWT
  let payload: any;
  try {
    payload = jwt.verify(token, process.env.QR_SECRET!);
  } catch {
    return { valid: false, reason: 'QR Code invalide ou falsifié' };
  }

  if (payload.type !== 'LICENSE_QR') {
    return { valid: false, reason: 'Type de QR Code incorrect' };
  }

  // Trouver la licence en BDD
  const license = await prisma.license.findUnique({
    where: { uuid: payload.licenseUuid },
    include: {
      member: {
        include: {
          club: { include: { region: { select: { nom: true } } } },
        },
      },
    },
  });

  if (!license) return { valid: false, reason: 'Licence introuvable' };

  if (license.status !== 'ACTIVE') {
    return {
      valid: false,
      reason: `Licence ${license.status === 'EXPIRED' ? 'expirée' : 'suspendue'}`,
      license: { status: license.status, annee: license.annee },
    };
  }

  if (license.dateFin && license.dateFin < new Date()) {
    // Mettre à jour automatiquement en EXPIRED
    await prisma.license.update({ where: { id: license.id }, data: { status: 'EXPIRED' } });
    return { valid: false, reason: 'Licence expirée' };
  }

  return {
    valid: true,
    member: {
      nom: license.member.nom,
      prenom: license.member.prenom,
      photoUrl: license.member.photoUrl,
      grade: license.member.grade,
      discipline: license.member.discipline,
      club: license.member.club.nom,
      region: license.member.club.region.nom,
    },
    license: {
      uuid: license.uuid,
      annee: license.annee,
      status: license.status,
      dateDebut: license.dateDebut,
      dateFin: license.dateFin,
    },
  };
};

// ─── Activer une licence (après paiement validé) ─────────────────────────────
export const activateLicense = async (licenseId: number) => {
  const license = await prisma.license.findUnique({ where: { id: licenseId } });
  if (!license) throw { status: 404, message: 'Licence introuvable', code: 'NOT_FOUND' };
  if (license.status === 'ACTIVE') return license;

  return prisma.license.update({
    where: { id: licenseId },
    data: { status: 'ACTIVE' },
  });
};

// ─── CRON : expirer les licences périmées ────────────────────────────────────
export const expireOldLicenses = async () => {
  const result = await prisma.license.updateMany({
    where: {
      status: 'ACTIVE',
      dateFin: { lt: new Date() },
    },
    data: { status: 'EXPIRED' },
  });
  console.log(`⏰ CRON: ${result.count} licence(s) expirée(s)`);
  return result.count;
};
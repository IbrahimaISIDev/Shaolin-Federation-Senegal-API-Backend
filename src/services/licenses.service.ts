import { PrismaClient, PaymentProvider } from '@prisma/client';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { sendLicenseExpiringEmail } from './email.service';

const prisma = new PrismaClient();

// Prix du renouvellement — source de vérité côté serveur (ne pas faire
// confiance à un montant envoyé par le client). Miroir de
// LICENSE_FEES.RENEWAL côté frontend (lib/constants/index.ts).
export const RENEWAL_FEE = 10300;

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

// ─── CRON : relancer les licences qui expirent bientôt (J-30 et J-7) ─────────
const sendExpiryReminders = async (windowDays: number, field: 'notifiedJ30' | 'notifiedJ7') => {
  const now = new Date();
  const limit = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);

  const licenses = await prisma.license.findMany({
    where: {
      status: 'ACTIVE',
      dateFin: { gte: now, lte: limit },
      [field]: null,
    },
    include: {
      member: { include: { user: { select: { email: true } } } },
    },
  });

  for (const license of licenses) {
    if (!license.dateFin) continue;
    const joursRestants = Math.max(
      1,
      Math.ceil((license.dateFin.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    );
    try {
      await sendLicenseExpiringEmail(
        license.member.user.email,
        license.member.prenom,
        license.dateFin,
        joursRestants
      );
      await prisma.license.update({ where: { id: license.id }, data: { [field]: now } });
    } catch (err) {
      console.error(`⚠️ Échec envoi rappel licence ${license.id}:`, err);
    }
  }

  return licenses.length;
};

export const notifyExpiringLicenses = async () => {
  const countJ30 = await sendExpiryReminders(30, 'notifiedJ30');
  const countJ7 = await sendExpiryReminders(7, 'notifiedJ7');
  console.log(`📧 CRON: ${countJ30} rappel(s) J-30, ${countJ7} rappel(s) J-7 envoyés`);
  return { countJ30, countJ7 };
};

// ─── Renouvellement annuel (paiement manuel) ─────────────────────────────────

// Démarre un renouvellement : crée la licence de l'année cible (PENDING) et
// le paiement associé (PENDING). generateLicense() protège déjà contre les
// doublons pour une même année (LICENSE_EXISTS).
export const renewLicense = async (memberId: number, provider: PaymentProvider) => {
  const latest = await prisma.license.findFirst({
    where: { memberId },
    orderBy: { annee: 'desc' },
  });
  const currentYear = new Date().getFullYear();
  const targetYear = latest ? Math.max(latest.annee + 1, currentYear) : currentYear;

  const license = await generateLicense(memberId, targetYear);

  const payment = await prisma.payment.create({
    data: {
      licenseId: license.id,
      montant: RENEWAL_FEE,
      provider,
      status: 'PENDING',
    },
  });

  return { license, payment };
};

export const submitRenewalProof = async (
  licenseId: number,
  memberId: number,
  data: { transactionRef: string; preuveUrl: string }
) => {
  const license = await prisma.license.findFirst({
    where: { id: licenseId, memberId },
    include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  if (!license) throw { status: 404, message: 'Licence introuvable', code: 'NOT_FOUND' };

  const payment = license.payments[0];
  if (!payment || payment.status !== 'PENDING') {
    throw { status: 400, message: 'Aucun paiement en attente pour cette licence', code: 'NO_PENDING_PAYMENT' };
  }

  return prisma.payment.update({
    where: { id: payment.id },
    data: { transactionRef: data.transactionRef, preuveUrl: data.preuveUrl },
  });
};

// ─── Admin : renouvellements en attente de vérification ──────────────────────
export const listPendingRenewals = async () => {
  return prisma.payment.findMany({
    where: { status: 'PENDING', transactionRef: { not: null } },
    orderBy: { createdAt: 'desc' },
    include: {
      license: {
        include: {
          member: {
            select: {
              id: true, prenom: true, nom: true,
              user: { select: { email: true } },
              club: { select: { nom: true } },
            },
          },
        },
      },
    },
  });
};

export const confirmRenewalPayment = async (paymentId: number, adminId: number) => {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw { status: 404, message: 'Paiement introuvable', code: 'NOT_FOUND' };
  if (payment.status !== 'PENDING') {
    throw { status: 400, message: 'Ce paiement a déjà été traité', code: 'ALREADY_PROCESSED' };
  }

  const [updatedPayment] = await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'SUCCESS', paidAt: new Date(), confirmedById: adminId, confirmedAt: new Date() },
    }),
    prisma.license.update({ where: { id: payment.licenseId }, data: { status: 'ACTIVE' } }),
  ]);

  return updatedPayment;
};

export const rejectRenewalPayment = async (paymentId: number, adminId: number) => {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw { status: 404, message: 'Paiement introuvable', code: 'NOT_FOUND' };
  if (payment.status !== 'PENDING') {
    throw { status: 400, message: 'Ce paiement a déjà été traité', code: 'ALREADY_PROCESSED' };
  }

  return prisma.payment.update({
    where: { id: paymentId },
    data: { status: 'FAILED', confirmedById: adminId, confirmedAt: new Date() },
  });
};
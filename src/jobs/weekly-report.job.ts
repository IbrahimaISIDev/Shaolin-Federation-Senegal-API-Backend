// ============================================================
// JOB — weekly-report.job.ts
// Rapport hebdomadaire envoyé à l'admin chaque lundi à 8h (Dakar),
// si « Rapport hebdomadaire » est activé dans Paramètres → Notifications.
// ============================================================
import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { sendAdminWeeklyReportEmail } from '../services/email.service';

const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

export const buildWeeklyReport = async (now = new Date()) => {
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recent = { gte: since };

  const [
    nouvellesDemandes, affiliationsApprouvees, renouvellementsConfirmes,
    inscriptionsCompetitions, messagesContact,
    paiements, affiliations, renouvellements, messagesNonLus,
    membresActifs, clubsActifs,
  ] = await Promise.all([
    prisma.affiliationDemande.count({ where: { createdAt: recent } }),
    prisma.affiliationDemande.count({ where: { status: 'APPROVED', approvedAt: recent } }),
    prisma.payment.count({ where: { status: 'SUCCESS', confirmedAt: recent } }),
    prisma.inscription.count({ where: { createdAt: recent } }),
    prisma.contactMessage.count({ where: { createdAt: recent } }),
    prisma.affiliationDemande.count({ where: { status: 'PENDING_PAYMENT', referenceManuelle: { not: null } } }),
    prisma.affiliationDemande.count({ where: { status: 'PENDING' } }),
    prisma.payment.count({ where: { status: 'PENDING', transactionRef: { not: null } } }),
    prisma.contactMessage.count({ where: { isRead: false } }),
    prisma.license.count({ where: { status: 'ACTIVE', OR: [{ dateDebut: null }, { dateDebut: { lte: now } }] } }),
    prisma.club.count({ where: { isActive: true } }),
  ]);

  return {
    periode: `du ${fmt(since)} au ${fmt(now)}`,
    nouvellesDemandes, affiliationsApprouvees, renouvellementsConfirmes,
    inscriptionsCompetitions, messagesContact,
    enAttente: { paiements, affiliations, renouvellements, messagesNonLus },
    membresActifs, clubsActifs,
  };
};

export const startWeeklyReportJob = () => {
  cron.schedule('0 8 * * 1', async () => {
    try {
      await sendAdminWeeklyReportEmail(await buildWeeklyReport());
      console.log('📊 CRON weekly-report: rapport envoyé');
    } catch (err) {
      console.error('⚠️ CRON weekly-report: erreur', err);
    }
  }, { timezone: 'Africa/Dakar' });
  console.log('✅ CRON weekly-report planifié (lundi 08:00 Africa/Dakar)');
};

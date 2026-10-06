import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient, Prisma, AffiliationType, AffiliationStatus, Sexe } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  sendAffiliationApprovedEmail, sendAffiliationRejectedEmail, sendAffiliationReceivedEmail,
  sendAdminAffiliationProofEmail,
} from './email.service';
import { generateLicense, activateLicense } from './licenses.service';
import { generateLicensePDF } from './pdf.service';
import { isValidDemandeToken } from './affiliation-token';
import { normalizeEmail, emailEquals } from '../utils/email';


const TYPE_PREFIX: Record<AffiliationType, string> = {
  CLUB: '001',
  MAITRE: '002',
  MEMBRE: '003',
};

const MONTANTS: Record<AffiliationType, number> = {
  CLUB: 5000,
  MAITRE: 10000,
  MEMBRE: 5300,
};

async function generateCode(
  type: AffiliationType,
  db: PrismaClient | Prisma.TransactionClient = prisma
): Promise<string> {
  const prefix = TYPE_PREFIX[type];
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-`;

  const last = await db.affiliationDemande.findFirst({
    where: { type, code: { startsWith: pattern } },
    orderBy: { code: 'desc' },
    select: { code: true },
  });

  let seq = 1;
  if (last?.code) {
    const parts = last.code.split('-');
    seq = parseInt(parts[2], 10) + 1;
  }

  return `${prefix}-${year}-${seq.toString().padStart(3, '0')}`;
}

// Email obligatoire et plausible, normalisé en minuscules
function requireEmail(email: unknown): string {
  const value = typeof email === 'string' ? normalizeEmail(email) : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw { status: 400, message: 'Adresse email invalide', code: 'INVALID_EMAIL' };
  }
  return value;
}

// ─── Submit handlers ──────────────────────────────────────────────────────────

export async function submitClubAffiliation(body: {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  dateNaissance?: string;
  sexe?: 'M' | 'F';
  adresse?: string;
  ville?: string;
  regionId?: number;
  nationalite?: string;
  photoUrl?: string;
  // club-specific
  nomClub: string;
  villeClub?: string;
  telephoneClub?: string;
  emailClub?: string;
  logoUrl?: string;
  description?: string;
}) {
  const demande = await prisma.affiliationDemande.create({
    data: {
      type: 'CLUB',
      status: 'PENDING_PAYMENT',
      montant: MONTANTS.CLUB,
      prenom: body.prenom,
      nom: body.nom,
      email: requireEmail(body.email),
      telephone: body.telephone,
      dateNaissance: body.dateNaissance ? new Date(body.dateNaissance) : undefined,
      sexe: body.sexe as Sexe | undefined,
      adresse: body.adresse,
      ville: body.ville,
      regionId: body.regionId,
      nationalite: body.nationalite,
      photoUrl: body.photoUrl,
      donneesSpecifiques: {
        nomClub: body.nomClub,
        villeClub: body.villeClub,
        telephoneClub: body.telephoneClub,
        emailClub: body.emailClub,
        logoUrl: body.logoUrl,
        description: body.description,
      },
    },
  });

  // L'email de confirmation est envoyé après confirmation du paiement Wave (webhook)
  return demande;
}

export async function submitMaitreAffiliation(body: {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  dateNaissance?: string;
  sexe?: 'M' | 'F';
  adresse?: string;
  ville?: string;
  regionId?: number;
  nationalite?: string;
  photoUrl?: string;
  // maître-specific
  clubId?: number;
  gradeActuel?: string;
  specialite?: string;
  anneesPratique?: number;
  experience?: string;
  certificationsUrl?: string;
}) {
  const demande = await prisma.affiliationDemande.create({
    data: {
      type: 'MAITRE',
      status: 'PENDING_PAYMENT',
      montant: MONTANTS.MAITRE,
      prenom: body.prenom,
      nom: body.nom,
      email: requireEmail(body.email),
      telephone: body.telephone,
      dateNaissance: body.dateNaissance ? new Date(body.dateNaissance) : undefined,
      sexe: body.sexe as Sexe | undefined,
      adresse: body.adresse,
      ville: body.ville,
      regionId: body.regionId,
      nationalite: body.nationalite,
      photoUrl: body.photoUrl,
      clubId: body.clubId,
      donneesSpecifiques: {
        gradeActuel: body.gradeActuel,
        specialite: body.specialite,
        anneesPratique: body.anneesPratique,
        experience: body.experience,
        certificationsUrl: body.certificationsUrl,
      },
    },
  });

  return demande;
}

export async function submitMembreAffiliation(body: {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  dateNaissance?: string;
  sexe?: 'M' | 'F';
  adresse?: string;
  ville?: string;
  regionId?: number;
  nationalite?: string;
  photoUrl?: string;
  // membre-specific
  clubId: number;
  discipline: string;
  gradeJi?: string;
  groupeSanguin?: string;
  contactUrgenceNom?: string;
  contactUrgencePhone?: string;
  certificatMedicalUrl?: string;
}) {
  const demande = await prisma.affiliationDemande.create({
    data: {
      type: 'MEMBRE',
      status: 'PENDING_PAYMENT',
      montant: MONTANTS.MEMBRE,
      prenom: body.prenom,
      nom: body.nom,
      email: requireEmail(body.email),
      telephone: body.telephone,
      dateNaissance: body.dateNaissance ? new Date(body.dateNaissance) : undefined,
      sexe: body.sexe as Sexe | undefined,
      adresse: body.adresse,
      ville: body.ville,
      regionId: body.regionId,
      nationalite: body.nationalite,
      photoUrl: body.photoUrl,
      clubId: body.clubId,
      donneesSpecifiques: {
        discipline: body.discipline,
        gradeJi: body.gradeJi,
        groupeSanguin: body.groupeSanguin,
        contactUrgenceNom: body.contactUrgenceNom,
        contactUrgencePhone: body.contactUrgencePhone,
        certificatMedicalUrl: body.certificatMedicalUrl,
      },
    },
  });

  return demande;
}

// ─── Admin: list ─────────────────────────────────────────────────────────────

export async function listAffiliations(filters: {
  type?: AffiliationType;
  status?: AffiliationStatus;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (filters.type) where.type = filters.type;
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    where.OR = [
      { prenom: { contains: filters.search, mode: 'insensitive' } },
      { nom: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
      { code: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [demandes, total] = await Promise.all([
    prisma.affiliationDemande.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        region: { select: { nom: true } },
        club: { select: { nom: true } },
      },
    }),
    prisma.affiliationDemande.count({ where }),
  ]);

  return {
    data: demandes,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getAffiliationById(id: number) {
  return prisma.affiliationDemande.findUnique({
    where: { id },
    include: {
      region: { select: { id: true, nom: true } },
      club: { select: { id: true, nom: true } },
      approvedBy: { select: { id: true, email: true } },
    },
  });
}

// ─── Admin: approve ───────────────────────────────────────────────────────────

export async function approveAffiliation(id: number, adminId: number, adminNote?: string) {
  const demande = await prisma.affiliationDemande.findUnique({ where: { id } });
  if (!demande) throw new Error('Demande introuvable');
  if (demande.status !== 'PENDING') throw new Error('Cette demande a déjà été traitée');

  const donnees = demande.donneesSpecifiques as Record<string, any> ?? {};
  const isPerson = demande.type === 'MAITRE' || demande.type === 'MEMBRE';

  // Vérifications préalables — avant toute écriture, pour ne jamais laisser
  // une demande APPROVED sans le club / compte qui devait l'accompagner.
  if (demande.type === 'CLUB' && !demande.regionId) {
    throw new Error('Région manquante : impossible de créer le club. Corrigez la demande avant de l\'approuver.');
  }
  if (isPerson) {
    if (!demande.clubId) throw new Error('Club manquant : impossible de créer le compte membre.');
    const existingUser = await prisma.user.findFirst({ where: emailEquals(demande.email) });
    if (existingUser) {
      throw new Error(`Un compte existe déjà avec l'email ${demande.email}. Rejetez la demande ou modifiez le compte existant.`);
    }
  }

  // Hash hors transaction (bcrypt est lent, la transaction doit rester courte)
  const tempPassword = isPerson ? crypto.randomBytes(9).toString('base64url') : '';
  const hashedPassword = isPerson ? await bcrypt.hash(tempPassword, 10) : '';

  // Tout ou rien : statut + club/compte + licence
  const { updated, code, licenseId, userId } = await prisma.$transaction(async (tx) => {
    const code = await generateCode(demande.type, tx);

    // Garde contre une double approbation simultanée
    const { count } = await tx.affiliationDemande.updateMany({
      where: { id, status: 'PENDING' },
      data: {
        status: 'APPROVED',
        code,
        adminNote,
        approvedById: adminId,
        approvedAt: new Date(),
      },
    });
    if (count === 0) throw new Error('Cette demande a déjà été traitée');

    let licenseId: number | undefined;
    let userId: number | undefined;

    if (demande.type === 'CLUB') {
      await tx.club.create({
        data: {
          nom: donnees.nomClub ?? `${demande.prenom} ${demande.nom} Club`,
          code,
          regionId: demande.regionId!,
          ville: donnees.villeClub ?? demande.ville ?? undefined,
          telephone: donnees.telephoneClub ?? demande.telephone,
          email: donnees.emailClub ?? demande.email,
          logoUrl: donnees.logoUrl ?? undefined,
          description: donnees.description ?? undefined,
          nomMaitre: `${demande.prenom} ${demande.nom}`,
        },
      });
    } else {
      const newUser = await tx.user.create({
        data: {
          email: normalizeEmail(demande.email),
          phone: demande.telephone,
          password: hashedPassword,
          role: demande.type === 'MAITRE' ? 'CLUB_MANAGER' : 'MEMBER',
          member: {
            create: {
              prenom: demande.prenom,
              nom: demande.nom,
              dateNaissance: demande.dateNaissance ?? undefined,
              sexe: demande.sexe ?? undefined,
              photoUrl: demande.photoUrl ?? undefined,
              adresse: demande.adresse ?? undefined,
              nationalite: demande.nationalite ?? undefined,
              groupeSanguin: donnees.groupeSanguin ?? undefined,
              contactUrgenceNom: donnees.contactUrgenceNom ?? undefined,
              contactUrgencePhone: donnees.contactUrgencePhone ?? undefined,
              discipline: donnees.discipline ?? donnees.specialite ?? undefined,
              grade: donnees.gradeJi ?? donnees.gradeActuel ?? undefined,
              clubId: demande.clubId!,
            },
          },
        },
        include: { member: { select: { id: true } } },
      });
      userId = newUser.id;

      // Licence créée et activée immédiatement — le paiement est déjà confirmé
      if (newUser.member) {
        const license = await generateLicense(newUser.member.id, undefined, tx);
        await activateLicense(license.id, tx);
        licenseId = license.id;
      }
    }

    const updated = await tx.affiliationDemande.findUniqueOrThrow({ where: { id } });
    return { updated, code, licenseId, userId };
  }, { timeout: 20000 });

  // Effets de bord après commit uniquement
  if (licenseId && userId) {
    // Génération du PDF en arrière-plan — l'approbation ne doit pas échouer si Puppeteer est lent
    generateLicensePDF(licenseId, userId)
      .catch((e) => console.error('[pdf] generateLicensePDF (approbation) failed:', e?.message ?? e));
  }

  sendAffiliationApprovedEmail(
    demande.email,
    `${demande.prenom} ${demande.nom}`,
    demande.type,
    code,
    isPerson ? { email: demande.email, password: tempPassword } : undefined
  ).catch((e) => console.error('[email] sendAffiliationApprovedEmail failed:', e.message));

  return updated;
}

// ─── Admin: reject ────────────────────────────────────────────────────────────

export async function rejectAffiliation(id: number, adminId: number, motifRejet: string) {
  const demande = await prisma.affiliationDemande.findUnique({ where: { id } });
  if (!demande) throw new Error('Demande introuvable');
  if (demande.status !== 'PENDING') throw new Error('Cette demande a déjà été traitée');

  const updated = await prisma.affiliationDemande.update({
    where: { id },
    data: {
      status: 'REJECTED',
      motifRejet,
      approvedById: adminId,
      approvedAt: new Date(),
    },
  });

  sendAffiliationRejectedEmail(demande.email, `${demande.prenom} ${demande.nom}`, motifRejet)
    .catch((e) => console.error('[email] sendAffiliationRejectedEmail failed:', e.message));

  return updated;
}

// ─── Paiement manuel ──────────────────────────────────────────────────────────

export async function submitPaymentProof(
  id: number,
  token: unknown,
  data: { referenceManuelle: string; preuvePaiementUrl: string }
) {
  const demande = await prisma.affiliationDemande.findUnique({ where: { id } });
  // Même réponse si la demande n'existe pas ou si le jeton est faux :
  // on ne révèle pas quels ids existent.
  if (!demande || !isValidDemandeToken(demande, token)) {
    throw { status: 404, message: 'Demande introuvable ou lien invalide' };
  }
  // La preuve doit venir de notre propre upload Cloudinary — pas d'URL arbitraire
  // (lien piégé) que l'admin ouvrirait ensuite.
  if (!data.preuvePaiementUrl.startsWith(`https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`)) {
    throw { status: 400, message: 'Preuve de paiement invalide' };
  }
  if (demande.status !== 'PENDING_PAYMENT') {
    throw { status: 400, message: 'Cette demande n\'est plus en attente de paiement' };
  }

  const updated = await prisma.affiliationDemande.update({
    where: { id },
    data: {
      referenceManuelle: data.referenceManuelle,
      preuvePaiementUrl: data.preuvePaiementUrl,
    },
  });

  sendAdminAffiliationProofEmail({ ...updated, referenceManuelle: data.referenceManuelle })
    .catch((e) => console.error('[email] sendAdminAffiliationProofEmail failed:', e.message));

  return updated;
}

export async function confirmAffiliationPayment(id: number, adminId: number) {
  const demande = await prisma.affiliationDemande.findUnique({ where: { id } });
  if (!demande) throw { status: 404, message: 'Demande introuvable' };
  if (demande.status !== 'PENDING_PAYMENT') {
    throw { status: 400, message: 'Cette demande n\'est plus en attente de paiement' };
  }

  const updated = await prisma.affiliationDemande.update({
    where: { id },
    data: {
      status: 'PENDING',
      paidAt: new Date(),
      paymentConfirmedById: adminId,
      paymentConfirmedAt: new Date(),
    },
  });

  sendAffiliationReceivedEmail(
    demande.email,
    `${demande.prenom} ${demande.nom}`,
    demande.type,
    demande.id
  ).catch((e) => console.error('[email] sendAffiliationReceivedEmail failed:', e.message));

  return updated;
}

import { PrismaClient, AffiliationType, AffiliationStatus, Sexe } from '@prisma/client';
import { sendAffiliationApprovedEmail, sendAffiliationRejectedEmail } from './email.service';
import { generateLicense, activateLicense } from './licenses.service';

const prisma = new PrismaClient();

const TYPE_PREFIX: Record<AffiliationType, string> = {
  CLUB: '001',
  MAITRE: '002',
  MEMBRE: '003',
};

const MONTANTS: Record<AffiliationType, number> = {
  CLUB: 5000,
  MAITRE: 10000,
  MEMBRE: 5000,
};

async function generateCode(type: AffiliationType): Promise<string> {
  const prefix = TYPE_PREFIX[type];
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-`;

  const last = await prisma.affiliationDemande.findFirst({
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
      email: body.email,
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
      email: body.email,
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
      email: body.email,
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

  const code = await generateCode(demande.type);
  const donnees = demande.donneesSpecifiques as Record<string, any> ?? {};

  // Update demande
  const updated = await prisma.affiliationDemande.update({
    where: { id },
    data: {
      status: 'APPROVED',
      code,
      adminNote,
      approvedById: adminId,
      approvedAt: new Date(),
    },
  });

  // Type-specific actions on approval
  if (demande.type === 'CLUB') {
    // Create the club in the DB
    if (demande.regionId) {
      await prisma.club.create({
        data: {
          nom: donnees.nomClub ?? `${demande.prenom} ${demande.nom} Club`,
          code,
          regionId: demande.regionId,
          ville: donnees.villeClub ?? demande.ville ?? undefined,
          telephone: donnees.telephoneClub ?? demande.telephone,
          email: donnees.emailClub ?? demande.email,
          logoUrl: donnees.logoUrl ?? undefined,
          description: donnees.description ?? undefined,
          nomMaitre: `${demande.prenom} ${demande.nom}`,
        },
      });
    }
    sendAffiliationApprovedEmail(demande.email, `${demande.prenom} ${demande.nom}`, 'CLUB', code).catch(() => {});
  } else if (demande.type === 'MAITRE' || demande.type === 'MEMBRE') {
    // Create a user account and member record
    const tempPassword = Math.random().toString(36).slice(2, 10);
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const role = demande.type === 'MAITRE' ? 'CLUB_MANAGER' : 'MEMBER';

    const clubId = demande.clubId;
    if (!clubId) throw new Error('clubId requis pour MAITRE/MEMBRE');

    const newUser = await prisma.user.create({
      data: {
        email: demande.email,
        phone: demande.telephone,
        password: hashedPassword,
        role,
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
            clubId,
          },
        },
      },
      include: { member: { select: { id: true } } },
    });

    // Créer et activer immédiatement la licence — le paiement est déjà confirmé
    if (demande.type === 'MEMBRE' && newUser.member) {
      const license = await generateLicense(newUser.member.id);
      await activateLicense(license.id);
    }

    sendAffiliationApprovedEmail(
      demande.email,
      `${demande.prenom} ${demande.nom}`,
      demande.type,
      code,
      { email: demande.email, password: tempPassword }
    ).catch(() => {});
  }

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

  sendAffiliationRejectedEmail(demande.email, `${demande.prenom} ${demande.nom}`, motifRejet).catch(() => {});

  return updated;
}

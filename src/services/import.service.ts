// ============================================================
// SERVICE — import.service.ts
// Import en masse de clubs et de membres déjà existants (données
// historiques hors plateforme) depuis un fichier Excel (.xlsx).
// ============================================================
import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { generateLicense, activateLicense } from './licenses.service';
import { sendMemberImportedEmail } from './email.service';

const prisma = new PrismaClient();

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportReport {
  total: number;
  created: number;
  errors: ImportRowError[];
}

function readRows(buffer: Buffer): Record<string, any>[] {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function excelDateToJs(raw: unknown): Date | undefined {
  if (!raw) return undefined;
  if (typeof raw === 'number') {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (!parsed) return undefined;
    return new Date(parsed.y, parsed.m - 1, parsed.d);
  }
  const parsed = new Date(String(raw));
  return isNaN(parsed.getTime()) ? undefined : parsed;
}

// ─── Import des clubs ─────────────────────────────────────────────────────────
export async function importClubsFromExcel(buffer: Buffer): Promise<ImportReport> {
  const rows = readRows(buffer);
  const report: ImportReport = { total: rows.length, created: 0, errors: [] };

  const regions = await prisma.region.findMany();
  const regionByName = new Map(regions.map((r) => [r.nom.trim().toLowerCase(), r]));
  const regionByCode = new Map(regions.map((r) => [r.code.trim().toLowerCase(), r]));

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // ligne 1 = en-têtes
    const row = rows[i];

    const nom = String(row['Nom'] ?? '').trim();
    const regionRaw = String(row['Région'] ?? row['Region'] ?? '').trim();

    if (!nom) {
      report.errors.push({ row: rowNum, message: 'Nom du club manquant' });
      continue;
    }
    if (!regionRaw) {
      report.errors.push({ row: rowNum, message: 'Région manquante' });
      continue;
    }

    const region = regionByName.get(regionRaw.toLowerCase()) ?? regionByCode.get(regionRaw.toLowerCase());
    if (!region) {
      report.errors.push({ row: rowNum, message: `Région inconnue : "${regionRaw}"` });
      continue;
    }

    const existing = await prisma.club.findFirst({
      where: { nom: { equals: nom, mode: 'insensitive' } },
    });
    if (existing) {
      report.errors.push({ row: rowNum, message: `Ce club existe déjà : "${nom}"` });
      continue;
    }

    try {
      await prisma.club.create({
        data: {
          nom,
          regionId: region.id,
          ville: String(row['Ville'] ?? '').trim() || undefined,
          telephone: String(row['Téléphone'] ?? '').trim() || undefined,
          email: String(row['Email'] ?? '').trim() || undefined,
          nomMaitre: String(row['Président'] ?? row['Maître'] ?? '').trim() || undefined,
          code: String(row['Code'] ?? '').trim() || undefined,
        },
      });
      report.created++;
    } catch (e: any) {
      report.errors.push({ row: rowNum, message: e.message ?? 'Erreur inconnue' });
    }
  }

  return report;
}

// ─── Import des membres ───────────────────────────────────────────────────────
// Les membres importés sont déjà affiliés et à jour de cotisation hors
// plateforme : la licence est créée directement ACTIVE, sans repasser par
// le circuit affiliation + paiement.
export async function importMembersFromExcel(buffer: Buffer): Promise<ImportReport> {
  const rows = readRows(buffer);
  const report: ImportReport = { total: rows.length, created: 0, errors: [] };

  const clubs = await prisma.club.findMany();
  const clubByName = new Map(clubs.map((c) => [c.nom.trim().toLowerCase(), c]));

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const row = rows[i];

    const prenom = String(row['Prénom'] ?? '').trim();
    const nom = String(row['Nom'] ?? '').trim();
    const email = String(row['Email'] ?? '').trim().toLowerCase();
    const clubNomRaw = String(row['Club'] ?? '').trim();

    if (!prenom || !nom) {
      report.errors.push({ row: rowNum, message: 'Prénom ou nom manquant' });
      continue;
    }
    if (!email || !email.includes('@')) {
      report.errors.push({ row: rowNum, message: 'Email manquant ou invalide' });
      continue;
    }
    if (!clubNomRaw) {
      report.errors.push({ row: rowNum, message: 'Club manquant' });
      continue;
    }

    const club = clubByName.get(clubNomRaw.toLowerCase());
    if (!club) {
      report.errors.push({ row: rowNum, message: `Club inconnu (importe d'abord les clubs) : "${clubNomRaw}"` });
      continue;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      report.errors.push({ row: rowNum, message: `Email déjà utilisé : "${email}"` });
      continue;
    }

    const sexeRaw = String(row['Sexe'] ?? '').trim().toUpperCase();
    const sexe = sexeRaw === 'M' || sexeRaw === 'F' ? (sexeRaw as 'M' | 'F') : undefined;
    const dateNaissance = excelDateToJs(row['Date de naissance']);

    try {
      const tempPassword = Math.random().toString(36).slice(2, 10);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const newUser = await prisma.user.create({
        data: {
          email,
          phone: String(row['Téléphone'] ?? '').trim() || undefined,
          password: hashedPassword,
          role: 'MEMBER',
          member: {
            create: {
              prenom,
              nom,
              dateNaissance,
              sexe,
              adresse: String(row['Ville'] ?? row['Adresse'] ?? '').trim() || undefined,
              nationalite: String(row['Nationalité'] ?? '').trim() || undefined,
              discipline: String(row['Discipline'] ?? '').trim() || undefined,
              grade: String(row['Grade'] ?? '').trim() || undefined,
              clubId: club.id,
            },
          },
        },
        include: { member: { select: { id: true } } },
      });

      if (newUser.member) {
        const license = await generateLicense(newUser.member.id);
        await activateLicense(license.id);
      }

      sendMemberImportedEmail(email, `${prenom} ${nom}`, club.nom, { email, password: tempPassword })
        .catch((e) => console.error('[email] sendMemberImportedEmail failed:', e.message));

      report.created++;
    } catch (e: any) {
      report.errors.push({ row: rowNum, message: e.message ?? 'Erreur inconnue' });
    }
  }

  return report;
}

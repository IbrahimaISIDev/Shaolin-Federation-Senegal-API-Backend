import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { sendWelcomeEmail, sendPasswordResetEmail } from './email.service';

const prisma = new PrismaClient();

export interface RegisterInput {
  email: string;
  password: string;
  prenom: string;
  nom: string;
  phone?: string;
  clubId: number;
  grade?: string;
  discipline?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

// ─── Génération des tokens ───────────────────────────────────────────────────

export const generateAccessToken = (userId: number, role: string, memberId?: number) => {
  return jwt.sign(
    { userId, role, memberId },
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRY || "15m") as any }
  );
};

export const generateRefreshToken = (userId: number) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: (process.env.JWT_REFRESH_EXPIRY || "7d") as any }
  );
};

// ─── Register ────────────────────────────────────────────────────────────────

export const registerService = async (input: RegisterInput) => {
  // Vérifier email unique
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw { status: 409, message: 'Cet email est déjà utilisé', code: 'EMAIL_TAKEN' };
  }

  // Vérifier que le club existe
  const club = await prisma.club.findUnique({ where: { id: input.clubId } });
  if (!club) {
    throw { status: 404, message: 'Club introuvable', code: 'CLUB_NOT_FOUND' };
  }

  // Hasher le mot de passe
  const hashedPassword = await bcrypt.hash(input.password, 12);

  // Créer user + member en transaction
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        phone: input.phone,
        role: 'MEMBER',
      },
    });

    const member = await tx.member.create({
      data: {
        userId: user.id,
        clubId: input.clubId,
        prenom: input.prenom,
        nom: input.nom,
        grade: input.grade,
        discipline: input.discipline,
      },
    });

    return { user, member };
  });

  // Email de bienvenue (non-bloquant)
  sendWelcomeEmail(result.user.email, result.member.prenom)
    .catch((e) => console.error('[email] sendWelcomeEmail failed:', e.message));

  return {
    id: result.user.id,
    email: result.user.email,
    role: result.user.role,
    memberId: result.member.id,
    prenom: result.member.prenom,
    nom: result.member.nom,
  };
};

// ─── Login ───────────────────────────────────────────────────────────────────

export const loginService = async (input: LoginInput) => {
  // Trouver l'utilisateur
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { member: true },
  });

  if (!user) {
    throw { status: 401, message: 'Email ou mot de passe incorrect', code: 'INVALID_CREDENTIALS' };
  }

  if (!user.isActive) {
    throw { status: 403, message: 'Compte désactivé', code: 'ACCOUNT_DISABLED' };
  }

  // Vérifier le mot de passe
  const isValid = await bcrypt.compare(input.password, user.password);
  if (!isValid) {
    throw { status: 401, message: 'Email ou mot de passe incorrect', code: 'INVALID_CREDENTIALS' };
  }

  // Générer les tokens
  const accessToken = generateAccessToken(user.id, user.role, user.member?.id);
  const refreshToken = generateRefreshToken(user.id);

  // Sauvegarder le refresh token en BDD
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      memberId: user.member?.id,
      prenom: user.member?.prenom,
      nom: user.member?.nom,
    },
  };
};

// ─── Refresh Token ───────────────────────────────────────────────────────────

export const refreshService = async (token: string) => {
  // Vérifier la signature JWT
  let payload: any;
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!);
  } catch {
    throw { status: 401, message: 'Refresh token invalide', code: 'INVALID_REFRESH_TOKEN' };
  }

  // Vérifier que le token existe en BDD et n'est pas expiré
  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.expiresAt < new Date()) {
    throw { status: 401, message: 'Session expirée', code: 'SESSION_EXPIRED' };
  }

  // Trouver l'utilisateur
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { member: true },
  });

  if (!user || !user.isActive) {
    throw { status: 401, message: 'Utilisateur introuvable', code: 'USER_NOT_FOUND' };
  }

  // Rotation : supprimer l'ancien, créer un nouveau
  const newRefreshToken = generateRefreshToken(user.id);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.$transaction([
    prisma.refreshToken.delete({ where: { token } }),
    prisma.refreshToken.create({
      data: { token: newRefreshToken, userId: user.id, expiresAt },
    }),
  ]);

  const accessToken = generateAccessToken(user.id, user.role, user.member?.id);

  return { accessToken, refreshToken: newRefreshToken };
};

// ─── Logout ──────────────────────────────────────────────────────────────────

export const logoutService = async (token: string) => {
  await prisma.refreshToken.deleteMany({ where: { token } });
};

// ─── Mot de passe oublié ─────────────────────────────────────────────────────

export const forgotPasswordService = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { member: true },
  });
  // Toujours répondre OK pour ne pas révéler si l'email existe
  if (!user) return;

  const token   = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // +1 heure

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: token, passwordResetExpires: expires },
  });

  const prenom = user.member?.prenom ?? 'Membre';
  try {
    await sendPasswordResetEmail(user.email, prenom, token);
  } catch (e: any) {
    // Le token existe déjà en base — on log l'échec d'envoi sans le remonter
    // au client (le contrôleur répond toujours 200 pour ne pas révéler si
    // l'email existe), sinon cet échec restait totalement invisible.
    console.error('[email] sendPasswordResetEmail failed:', e.message);
  }
};

export const resetPasswordService = async (token: string, newPassword: string) => {
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken:   token,
      passwordResetExpires: { gt: new Date() },
    },
  });

  if (!user) {
    throw { status: 400, message: 'Lien invalide ou expiré', code: 'INVALID_RESET_TOKEN' };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password:             hashedPassword,
      passwordResetToken:   null,
      passwordResetExpires: null,
    },
  });

  // Révoquer toutes les sessions
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
};

// ─── Changement de mot de passe ───────────────────────────────────────────────

export const changePasswordService = async (
  userId: number,
  currentPassword: string,
  newPassword: string
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw { status: 404, message: 'Utilisateur introuvable', code: 'USER_NOT_FOUND' };

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) throw { status: 401, message: 'Mot de passe actuel incorrect', code: 'INVALID_PASSWORD' };

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });

  // Révoquer tous les refresh tokens (forcer re-connexion sur les autres appareils)
  await prisma.refreshToken.deleteMany({ where: { userId } });
};
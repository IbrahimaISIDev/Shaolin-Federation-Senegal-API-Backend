import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient();

// ─── Configuration Cloudinary ─────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Types de fichiers autorisés ──────────────────────────────────────────────
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const validateImageFile = (file: Express.Multer.File) => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    throw { status: 422, message: 'Format non supporté. Utilisez JPG, PNG ou WebP', code: 'INVALID_FILE_TYPE' };
  }
  if (file.size > MAX_FILE_SIZE) {
    throw { status: 422, message: 'Fichier trop volumineux (max 5MB)', code: 'FILE_TOO_LARGE' };
  }
};

// ─── Upload photo de profil membre ───────────────────────────────────────────
export const uploadMemberPhoto = async (
  file: Express.Multer.File,
  userId: number
): Promise<string> => {
  validateImageFile(file);

  const member = await prisma.member.findUnique({ where: { userId } });
  if (!member) throw { status: 404, message: 'Membre introuvable', code: 'NOT_FOUND' };

  // Supprimer l'ancienne photo si elle existe
  if (member.photoUrl) {
    try {
      const publicId = extractCloudinaryPublicId(member.photoUrl);
      if (publicId) await cloudinary.uploader.destroy(publicId);
    } catch { /* ignorer si suppression échoue */ }
  }

  // Upload vers Cloudinary
  const result = await new Promise<any>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'shaolin/members',
        public_id: `member_${member.id}_${Date.now()}`,
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    ).end(file.buffer);
  });

  // Mettre à jour en BDD
  await prisma.member.update({
    where: { userId },
    data: { photoUrl: result.secure_url },
  });

  return result.secure_url;
};

// ─── Upload logo de club ──────────────────────────────────────────────────────
export const uploadClubLogo = async (
  file: Express.Multer.File,
  clubId: number
): Promise<string> => {
  validateImageFile(file);

  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) throw { status: 404, message: 'Club introuvable', code: 'NOT_FOUND' };

  if (club.logoUrl) {
    try {
      const publicId = extractCloudinaryPublicId(club.logoUrl);
      if (publicId) await cloudinary.uploader.destroy(publicId);
    } catch { /* ignorer */ }
  }

  const result = await new Promise<any>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'shaolin/clubs',
        public_id: `club_${clubId}_${Date.now()}`,
        transformation: [
          { width: 300, height: 300, crop: 'fill' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    ).end(file.buffer);
  });

  await prisma.club.update({
    where: { id: clubId },
    data: { logoUrl: result.secure_url },
  });

  return result.secure_url;
};

// ─── Upload image article ─────────────────────────────────────────────────────
export const uploadArticleImage = async (file: Express.Multer.File): Promise<string> => {
  validateImageFile(file);

  const result = await new Promise<any>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'shaolin/actualites',
        public_id: `article_${Date.now()}`,
        transformation: [
          { width: 1200, height: 630, crop: 'fill' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    ).end(file.buffer);
  });

  return result.secure_url;
};

// ─── Upload preuve de paiement (public — candidat sans compte) ────────────────
export const uploadPaymentProof = async (file: Express.Multer.File): Promise<string> => {
  validateImageFile(file);

  const result = await new Promise<any>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'shaolin/preuves-paiement',
        public_id: `preuve_${Date.now()}`,
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    ).end(file.buffer);
  });

  return result.secure_url;
};

// ─── Helper : extraire le public_id Cloudinary depuis une URL ─────────────────
const extractCloudinaryPublicId = (url: string): string | null => {
  try {
    const parts = url.split('/');
    const uploadIndex = parts.findIndex(p => p === 'upload');
    if (uploadIndex === -1) return null;
    // Sauter la version (v123456)
    const afterUpload = parts.slice(uploadIndex + 2);
    const filename = afterUpload.join('/');
    return filename.replace(/\.[^/.]+$/, ''); // enlever l'extension
  } catch {
    return null;
  }
};
// ============================================================
// SERVICE — media.service.ts
// Bibliothèque de médias (galerie) : upload, liste, suppression
// ============================================================
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';
import { validateImageFile } from './upload.service';

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadMedia = async (
  file: Express.Multer.File,
  userId: number,
  title?: string
) => {
  validateImageFile(file);

  const result = await new Promise<any>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'shaolin/gallery',
        public_id: `media_${Date.now()}`,
        quality: 'auto',
        fetch_format: 'auto',
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    ).end(file.buffer);
  });

  return prisma.mediaItem.create({
    data: {
      url: result.secure_url,
      publicId: result.public_id,
      title: title || file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      width: result.width,
      height: result.height,
      uploadedById: userId,
    },
  });
};

export const listMedia = async (filters: { search?: string; page?: number; limit?: number }) => {
  const { search, page = 1, limit = 24 } = filters;
  const skip = (page - 1) * limit;
  const where: any = {};

  if (search) {
    where.title = { contains: search, mode: 'insensitive' };
  }

  const [items, total] = await Promise.all([
    prisma.mediaItem.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { uploadedBy: { select: { email: true } } },
    }),
    prisma.mediaItem.count({ where }),
  ]);

  return { data: items, total, page, limit };
};

export const deleteMedia = async (id: number) => {
  const item = await prisma.mediaItem.findUnique({ where: { id } });
  if (!item) throw { status: 404, message: 'Média introuvable', code: 'NOT_FOUND' };

  try {
    await cloudinary.uploader.destroy(item.publicId);
  } catch {
    /* ignorer si déjà supprimé côté Cloudinary */
  }

  await prisma.mediaItem.delete({ where: { id } });
};

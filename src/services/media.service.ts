// ============================================================
// SERVICE — media.service.ts
// Bibliothèque de médias (galerie) : upload, liste, suppression
// ============================================================
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from '../lib/prisma';
import { validateImageFile } from './upload.service';


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer décode le nom de fichier en Latin-1 : « Prési.jpg » arrivait en
// « PrÃ©si.jpg ». On le relit en UTF-8 et on retire l'extension pour en
// faire un titre lisible.
const titleFromFilename = (name: string) => {
  const utf8 = Buffer.from(name, 'latin1').toString('utf8');
  const decoded = utf8.includes('\uFFFD') ? name : utf8;
  return decoded.replace(/\.[a-z0-9]{2,5}$/i, '').slice(0, 150) || 'Photo';
};

export const uploadMedia = async (
  file: Express.Multer.File,
  userId: number,
  options: { title?: string; album?: string; inGallery?: boolean } = {}
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
      title: options.title?.trim() || titleFromFilename(file.originalname),
      album: options.album?.trim() || null,
      inGallery: options.inGallery ?? false,
      mimeType: file.mimetype,
      size: file.size,
      width: result.width,
      height: result.height,
      uploadedById: userId,
    },
  });
};

export const listMedia = async (filters: {
  search?: string; page?: number; limit?: number; inGallery?: boolean;
}) => {
  const { search, page = 1, limit = 24, inGallery } = filters;
  const skip = (page - 1) * limit;
  const where: any = {};

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { album: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (inGallery !== undefined) where.inGallery = inGallery;

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

  // Les photos « static:… » sont des fichiers du frontend : rien à supprimer chez Cloudinary
  if (!item.publicId.startsWith('static:')) {
    try {
      await cloudinary.uploader.destroy(item.publicId);
    } catch {
      /* ignorer si déjà supprimé côté Cloudinary */
    }
  }

  await prisma.mediaItem.delete({ where: { id } });
};

export const updateMedia = async (
  id: number,
  data: { title?: string; album?: string | null; inGallery?: boolean }
) => {
  const item = await prisma.mediaItem.findUnique({ where: { id } });
  if (!item) throw { status: 404, message: 'Média introuvable', code: 'NOT_FOUND' };

  return prisma.mediaItem.update({
    where: { id },
    data: {
      title: data.title !== undefined ? data.title.trim() || item.title : undefined,
      album: data.album !== undefined ? data.album?.trim() || null : undefined,
      inGallery: data.inGallery,
    },
  });
};

// ─── Galerie publique ─────────────────────────────────────────────────────────
// Uniquement les médias marqués visibles, du plus récent au plus ancien,
// avec la liste des albums (et leur nombre de photos) pour les filtres.
export const listPublicGallery = async (filters: { album?: string; limit?: number }) => {
  const limit = Math.min(filters.limit ?? 200, 200);
  const where: any = { inGallery: true };
  if (filters.album) where.album = filters.album;

  const [items, albums, total] = await Promise.all([
    prisma.mediaItem.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, url: true, title: true, album: true, width: true, height: true, createdAt: true },
    }),
    prisma.mediaItem.groupBy({
      by: ['album'],
      where: { inGallery: true },
      _count: { _all: true },
      orderBy: { album: 'asc' },
    }),
    prisma.mediaItem.count({ where: { inGallery: true } }),
  ]);

  return {
    data: items,
    albums: albums
      .filter((a) => a.album)
      .map((a) => ({ album: a.album as string, count: a._count._all })),
    total,
  };
};

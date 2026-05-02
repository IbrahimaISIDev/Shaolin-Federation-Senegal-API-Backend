import { Request, Response } from 'express';
import multer from 'multer';
import { uploadMemberPhoto, uploadClubLogo, uploadArticleImage } from '../services/upload.service';

// ─── Configuration Multer (stockage en mémoire) ───────────────────────────────
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format non supporté. Utilisez JPG, PNG ou WebP'));
    }
  },
});

// ─── Upload photo membre ──────────────────────────────────────────────────────
export const uploadPhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Aucun fichier fourni', code: 'NO_FILE' });
      return;
    }
    const url = await uploadMemberPhoto(req.file, req.user!.userId);
    res.json({ data: { url }, message: 'Photo mise à jour' });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
  }
};

// ─── Upload logo club ─────────────────────────────────────────────────────────
export const uploadLogo = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Aucun fichier fourni', code: 'NO_FILE' });
      return;
    }
    const url = await uploadClubLogo(req.file, parseInt(req.params.id as string));
    res.json({ data: { url }, message: 'Logo mis à jour' });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
  }
};

// ─── Upload image article ─────────────────────────────────────────────────────
export const uploadImage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Aucun fichier fourni', code: 'NO_FILE' });
      return;
    }
    const url = await uploadArticleImage(req.file);
    res.json({ data: { url }, message: 'Image uploadée' });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
  }
};
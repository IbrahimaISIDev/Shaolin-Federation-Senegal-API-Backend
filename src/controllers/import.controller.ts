import { Request, Response } from 'express';
import multer from 'multer';
import { importClubsFromExcel, importMembersFromExcel } from '../services/import.service';

// ─── Configuration Multer (fichiers Excel, en mémoire) ────────────────────────
export const uploadExcel = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format non supporté. Utilisez un fichier .xlsx ou .xls'));
    }
  },
});

export const importClubs = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Aucun fichier fourni', code: 'NO_FILE' });
      return;
    }
    const report = await importClubsFromExcel(req.file.buffer);
    res.json({ data: report, message: `${report.created} club(s) importé(s) sur ${report.total}` });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
  }
};

export const importMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Aucun fichier fourni', code: 'NO_FILE' });
      return;
    }
    const report = await importMembersFromExcel(req.file.buffer);
    res.json({ data: report, message: `${report.created} membre(s) importé(s) sur ${report.total}` });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
  }
};

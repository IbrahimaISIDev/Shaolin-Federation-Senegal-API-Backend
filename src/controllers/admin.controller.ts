import { Request, Response } from 'express';
import { z } from 'zod';
import {
  listClubsAdmin, createClub, updateClub,
  toggleClubStatus, deleteClub,
} from '../services/admin.service';

const ClubSchema = z.object({
  nom: z.string().min(1).max(150),
  regionId: z.number().int().positive(),
  ville: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  nomMaitre: z.string().max(100).optional(),
  telephone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
});

const UpdateClubSchema = ClubSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const listClubs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, region, active, page = '1', limit = '20' } = req.query as any;
    const result = await listClubsAdmin({
      search,
      regionCode: region,
      isActive: active !== undefined ? active === 'true' : undefined,
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100),
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'SERVER_ERROR' });
  }
};

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = ClubSchema.parse(req.body);
    const club = await createClub(data);
    res.status(201).json({ data: club, message: 'Club créé avec succès' });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(422).json({ error: 'Données invalides', code: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = UpdateClubSchema.parse(req.body);
    const club = await updateClub(parseInt(req.params.id as string), data);
    res.json({ data: club, message: 'Club mis à jour' });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(422).json({ error: 'Données invalides', code: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
  }
};

export const activate = async (req: Request, res: Response): Promise<void> => {
  try {
    const club = await toggleClubStatus(parseInt(req.params.id as string), true);
    res.json({ data: club, message: 'Club activé' });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
  }
};

export const deactivate = async (req: Request, res: Response): Promise<void> => {
  try {
    const club = await toggleClubStatus(parseInt(req.params.id as string), false);
    res.json({ data: club, message: 'Club désactivé' });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
  }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    await deleteClub(parseInt(req.params.id as string));
    res.json({ message: 'Club supprimé' });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
  }
};
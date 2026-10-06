import { Request, Response } from 'express';
import { z } from 'zod';
import {
  listClubsAdmin, createClub, updateClub,
  toggleClubStatus, deleteClub,
} from '../services/admin.service';
import { sendError } from '../utils/http-error';

// Coordonnées limitées au Sénégal (avec marge) : attrape notamment
// l'inversion latitude/longitude. null = effacer la position.
const latitudeSchema = z.number()
  .min(12, 'Latitude hors du Sénégal (attendue entre 12 et 17)')
  .max(17, 'Latitude hors du Sénégal (attendue entre 12 et 17)')
  .nullable();
const longitudeSchema = z.number()
  .min(-18, 'Longitude hors du Sénégal (attendue entre -18 et -11)')
  .max(-11, 'Longitude hors du Sénégal (attendue entre -18 et -11)')
  .nullable();

const ClubSchema = z.object({
  nom: z.string().min(1).max(150),
  regionId: z.number().int().positive(),
  ville: z.string().max(100).optional(),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  nomMaitre: z.string().max(100).optional(),
  telephone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
});

const UpdateClubSchema = ClubSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// Latitude et longitude vont ensemble : toutes deux renseignées, ou toutes deux absentes
const bothOrNeither = (d: { latitude?: number | null; longitude?: number | null }) =>
  (d.latitude === undefined) === (d.longitude === undefined) &&
  (d.latitude === null) === (d.longitude === null);
const COORDS_MESSAGE = { message: 'Latitude et longitude doivent être renseignées ensemble', path: ['latitude'] };

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
    sendError(res, err);
  }
};

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = ClubSchema.refine(bothOrNeither, COORDS_MESSAGE).parse(req.body);
    const club = await createClub(data);
    res.status(201).json({ data: club, message: 'Club créé avec succès' });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(422).json({ error: 'Données invalides', code: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    sendError(res, err);
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = UpdateClubSchema.refine(bothOrNeither, COORDS_MESSAGE).parse(req.body);
    const club = await updateClub(parseInt(req.params.id as string), data);
    res.json({ data: club, message: 'Club mis à jour' });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(422).json({ error: 'Données invalides', code: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    sendError(res, err);
  }
};

export const activate = async (req: Request, res: Response): Promise<void> => {
  try {
    const club = await toggleClubStatus(parseInt(req.params.id as string), true);
    res.json({ data: club, message: 'Club activé' });
  } catch (err: any) {
    sendError(res, err);
  }
};

export const deactivate = async (req: Request, res: Response): Promise<void> => {
  try {
    const club = await toggleClubStatus(parseInt(req.params.id as string), false);
    res.json({ data: club, message: 'Club désactivé' });
  } catch (err: any) {
    sendError(res, err);
  }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    await deleteClub(parseInt(req.params.id as string));
    res.json({ message: 'Club supprimé' });
  } catch (err: any) {
    sendError(res, err);
  }
};
import { Request, Response } from 'express';
import { getClubs, getClubById, getClubsForMap, searchClubs } from '../services/clubs.service';

export const listClubs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { region, search, page = '1', limit = '20' } = req.query as any;
    const result = await getClubs({
      regionCode: region,
      search,
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100),
    });
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
  }
};

export const getClub = async (req: Request, res: Response): Promise<void> => {
  try {
    const club = await getClubById(parseInt(req.params.id as string));
    res.json({ data: club });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
  }
};

export const mapClubs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { region, limit = '100' } = req.query as any;
    const clubs = await getClubsForMap(region, parseInt(limit));
    res.json({ data: clubs, total: clubs.length });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
  }
};

export const searchMap = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query as any;
    if (!q || q.length < 2) {
      res.json({ data: [] });
      return;
    }
    const results = await searchClubs(q);
    res.json({ data: results });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
  }
};
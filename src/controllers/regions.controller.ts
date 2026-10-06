import { Request, Response } from 'express';
import { getAllRegions, getRegionByCode } from '../services/regions.service';
import { sendError } from '../utils/http-error';

export const listRegions = async (_req: Request, res: Response): Promise<void> => {
  try {
    const regions = await getAllRegions();
    res.json({ data: regions });
  } catch (err: any) {
    sendError(res, err);
  }
};

export const getRegion = async (req: Request, res: Response): Promise<void> => {
  try {
    const region = await getRegionByCode(req.params.code as string as string);
    res.json({ data: region });
  } catch (err: any) {
    sendError(res, err);
  }
};
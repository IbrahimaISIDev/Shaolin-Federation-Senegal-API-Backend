// ============================================================
// CONTROLLER — club.manager.controller.ts
// ============================================================
import { Request, Response } from 'express';
import {
    getManagerClub,
    getClubStats,
    getClubMembers,
    getClubLicenses,
} from '../services/club.manager.service';
import { sendError } from '../utils/http-error';

// GET /api/club/me
export const getMyClub = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await getManagerClub(req.user!.userId);
        res.json({ data: result.club });
    } catch (err: any) {
        sendError(res, err);
    }
};

// GET /api/club/stats
export const getStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const { club } = await getManagerClub(req.user!.userId);
        const stats = await getClubStats(club.id);
        res.json({ data: stats });
    } catch (err: any) {
        sendError(res, err);
    }
};

// GET /api/club/membres
export const getMembers = async (req: Request, res: Response): Promise<void> => {
    try {
        const { club } = await getManagerClub(req.user!.userId);
        const { search, status, page, limit } = req.query as any;
        const result = await getClubMembers(club.id, {
            search,
            licenseStatus: status,
            page:  page  ? parseInt(page)  : undefined,
            limit: limit ? parseInt(limit) : undefined,
        });
        res.json(result);
    } catch (err: any) {
        sendError(res, err);
    }
};

// GET /api/club/licences
export const getLicenses = async (req: Request, res: Response): Promise<void> => {
    try {
        const { club } = await getManagerClub(req.user!.userId);
        const { status, page, limit } = req.query as any;
        const result = await getClubLicenses(club.id, {
            status,
            page:  page  ? parseInt(page)  : undefined,
            limit: limit ? parseInt(limit) : undefined,
        });
        res.json(result);
    } catch (err: any) {
        sendError(res, err);
    }
};

// ============================================================
// CONTROLLER — admin.messages.controller.ts
// Messages reçus via le formulaire de contact du site
// ============================================================
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { sendError } from '../utils/http-error';

// GET /api/admin/messages?status=unread|read&search=&page=&limit=
export const listMessages = async (req: Request, res: Response): Promise<void> => {
    try {
        const { status, search, page = '1', limit = '20' } = req.query as Record<string, string | undefined>;
        const take = Math.min(parseInt(limit ?? '20') || 20, 100);
        const current = Math.max(parseInt(page ?? '1') || 1, 1);

        const where: any = {};
        if (status === 'unread') where.isRead = false;
        if (status === 'read') where.isRead = true;
        if (search) {
            where.OR = ['name', 'email', 'subject', 'message'].map((f) => ({
                [f]: { contains: search, mode: 'insensitive' },
            }));
        }

        const [data, total, unread] = await Promise.all([
            prisma.contactMessage.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (current - 1) * take,
                take,
            }),
            prisma.contactMessage.count({ where }),
            prisma.contactMessage.count({ where: { isRead: false } }),
        ]);

        res.json({ data, total, unread, page: current, limit: take });
    } catch (err) {
        sendError(res, err);
    }
};

// PATCH /api/admin/messages/:id  { isRead: boolean }
export const updateMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { isRead } = z.object({ isRead: z.boolean() }).parse(req.body);
        const data = await prisma.contactMessage.update({
            where: { id: parseInt(req.params.id as string) },
            data: { isRead },
        });
        res.json({ data });
    } catch (err) {
        sendError(res, err);
    }
};

// DELETE /api/admin/messages/:id
export const deleteMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        await prisma.contactMessage.delete({ where: { id: parseInt(req.params.id as string) } });
        res.json({ message: 'Message supprimé' });
    } catch (err) {
        sendError(res, err);
    }
};

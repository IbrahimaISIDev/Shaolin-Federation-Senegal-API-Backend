import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { sendContactNotificationEmail } from '../services/email.service';

const prisma = new PrismaClient();

const ContactSchema = z.object({
    name:    z.string().min(2).max(150),
    email:   z.string().email().max(255),
    phone:   z.string().max(30).optional(),
    subject: z.string().min(1).max(100),
    message: z.string().min(10).max(5000),
});

export const sendContact = async (req: Request, res: Response): Promise<void> => {
    try {
        const data = ContactSchema.parse(req.body);
        await prisma.contactMessage.create({ data });
        sendContactNotificationEmail(data).catch(() => {});
        res.status(201).json({ message: 'Message envoyé avec succès' });
    } catch (err: any) {
        if (err.name === 'ZodError') {
            res.status(422).json({ error: 'Données invalides', code: 'VALIDATION_ERROR', details: err.errors });
            return;
        }
        res.status(500).json({ error: err.message, code: 'SERVER_ERROR' });
    }
};

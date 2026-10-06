// ============================================================
// CONTROLLER — content.controller.ts
// Contenus éditoriaux du site modifiables depuis l'admin.
// Chaque clé a son schéma : une saisie invalide ne peut pas casser la page.
// Contenu absent → le site affiche son contenu par défaut.
// ============================================================
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { sendError } from '../utils/http-error';

const text = (max: number) => z.string().trim().max(max);
// Image : URL https (Cloudinary…) ou fichier du site (« /images/… »)
const imageUrl = z.string().trim().max(500)
  .refine((v) => v === '' || v.startsWith('/') || /^https:\/\//.test(v), 'Image invalide');

const SCHEMAS = {
  // Page d'accueil : bandeau principal + chiffres clés
  home: z.object({
    hero: z.object({
      badge: text(150),
      description: text(600).min(1, 'Le texte de présentation est requis'),
      photoUrl: imageUrl,
      photoCaption: text(120),
      stats: z.array(z.object({ value: text(20).min(1), label: text(40).min(1) })).max(4),
    }),
    keyFigures: z.array(z.object({
      value: text(20).min(1, 'Valeur requise'),
      label: text(50).min(1, 'Libellé requis'),
      description: text(120),
    })).min(1).max(6),
  }),
  // Bureau de l'association (accueil + page « L'Association »)
  bureau: z.array(z.object({
    id: text(60).min(1),
    name: text(100).min(1, 'Nom requis'),
    role: text(100).min(1, 'Fonction requise'),
    tier: z.enum(['presidency', 'executive', 'commission']),
    commission: text(100).optional(),
    photoUrl: imageUrl.optional(),
  })).max(60),
} as const;

type ContentKey = keyof typeof SCHEMAS;
const isKey = (k: string): k is ContentKey => k in SCHEMAS;

// GET /api/content/:key — public
export const getContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const key = req.params.key as string;
    if (!isKey(key)) { res.status(404).json({ error: 'Contenu inconnu', code: 'NOT_FOUND' }); return; }
    const row = await prisma.siteContent.findUnique({ where: { key } });
    res.json({ data: row?.data ?? null, updatedAt: row?.updatedAt ?? null });
  } catch (err) {
    sendError(res, err);
  }
};

// PUT /api/admin/content/:key — admin
export const putContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const key = req.params.key as string;
    if (!isKey(key)) { res.status(404).json({ error: 'Contenu inconnu', code: 'NOT_FOUND' }); return; }
    const data = SCHEMAS[key].parse(req.body?.data);
    const row = await prisma.siteContent.upsert({
      where: { key },
      update: { data, updatedById: req.user!.userId },
      create: { key, data, updatedById: req.user!.userId },
    });
    res.json({ data: row.data, updatedAt: row.updatedAt, message: 'Contenu enregistré' });
  } catch (err) {
    sendError(res, err);
  }
};

// DELETE /api/admin/content/:key — revenir au contenu par défaut
export const resetContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const key = req.params.key as string;
    if (!isKey(key)) { res.status(404).json({ error: 'Contenu inconnu', code: 'NOT_FOUND' }); return; }
    await prisma.siteContent.deleteMany({ where: { key } });
    res.json({ data: null, message: 'Contenu par défaut rétabli' });
  } catch (err) {
    sendError(res, err);
  }
};

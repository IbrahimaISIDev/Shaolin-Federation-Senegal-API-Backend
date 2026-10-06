// ============================================================
// Réponse d'erreur HTTP unique pour tous les contrôleurs.
// Ne renvoie au client que des messages destinés à l'utilisateur ;
// toute erreur imprévue (base de données, réseau…) est journalisée côté
// serveur et masquée derrière un message générique.
// ============================================================
import type { Response } from 'express';

type AnyError = {
  status?: unknown;
  code?: unknown;
  message?: unknown;
  name?: unknown;
  errors?: { message?: string }[];
};

export const sendError = (res: Response, error: unknown, fallback = 'Erreur serveur interne'): void => {
  const err = (error ?? {}) as AnyError;
  const body = (status: number, message: string, code: string) =>
    // `error` et `message` : les deux formats lus par le frontend
    res.status(status).json({ success: false, error: message, message, code });

  // Erreurs métier typées : { status, message, code }
  if (typeof err.status === 'number') {
    body(err.status, String(err.message ?? fallback), String(err.code ?? 'ERROR'));
    return;
  }
  // Validation Zod
  if (err.name === 'ZodError') {
    body(422, err.errors?.[0]?.message ?? 'Données invalides', 'VALIDATION_ERROR');
    return;
  }
  // Prisma : données invalides, doublon, enregistrement introuvable
  if (err.name === 'PrismaClientValidationError') {
    body(400, 'Données invalides', 'VALIDATION_ERROR');
    return;
  }
  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') { body(409, 'Cet élément existe déjà', 'CONFLICT'); return; }
    if (err.code === 'P2025') { body(404, 'Élément introuvable', 'NOT_FOUND'); return; }
    if (err.code === 'P2003') { body(409, "Opération impossible : l'élément est encore utilisé", 'CONFLICT'); return; }
  }
  // Erreur métier simple levée par nos services : throw new Error('message lisible')
  if (error instanceof Error && error.name === 'Error' && !('code' in error)) {
    body(400, error.message, 'ERROR');
    return;
  }

  console.error('[erreur serveur]', error);
  body(500, fallback, 'SERVER_ERROR');
};

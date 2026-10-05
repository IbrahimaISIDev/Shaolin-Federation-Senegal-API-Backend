// ============================================================
// MIDDLEWARE — rate-limit.middleware.ts
// Les opérateurs mobiles sénégalais partagent souvent une même IP publique
// entre de nombreux abonnés (CGNAT) : la limite globale par IP doit rester
// large, et la protection se concentre sur les routes sensibles.
// ============================================================
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

const MIN = 60 * 1000;

const common = {
  standardHeaders: 'draft-8' as const,
  legacyHeaders: false,
};

const tooMany = (error: string) => ({ error, code: 'TOO_MANY_REQUESTS' });

// Filet global : large, pour ne pas bloquer des utilisateurs partageant une IP
export const globalLimiter = rateLimit({
  ...common,
  windowMs: 15 * MIN,
  limit: 1000,
  message: tooMany('Trop de requêtes, réessayez dans quelques minutes.'),
});

// Connexion : échecs comptés par couple IP + email (force brute sur un compte),
// avec un plafond par IP pour limiter le test de nombreux comptes.
export const loginAccountLimiter = rateLimit({
  ...common,
  windowMs: 15 * MIN,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request) =>
    `${ipKeyGenerator(req.ip ?? '')}:${String(req.body?.email ?? '').trim().toLowerCase()}`,
  message: tooMany('Trop de tentatives de connexion pour ce compte. Réessayez dans 15 minutes.'),
});

export const loginIpLimiter = rateLimit({
  ...common,
  windowMs: 15 * MIN,
  limit: 100,
  skipSuccessfulRequests: true,
  message: tooMany('Trop de tentatives de connexion. Réessayez dans 15 minutes.'),
});

// Mot de passe oublié / réinitialisation : génère des emails ou teste des jetons
export const passwordLimiter = rateLimit({
  ...common,
  windowMs: 15 * MIN,
  limit: 20,
  message: tooMany('Trop de demandes. Réessayez dans 15 minutes.'),
});

// Soumissions publiques sans compte (affiliations, preuves de paiement, uploads)
export const publicSubmissionLimiter = rateLimit({
  ...common,
  windowMs: 60 * MIN,
  limit: 30,
  message: tooMany('Trop de soumissions depuis cette connexion. Réessayez dans une heure.'),
});

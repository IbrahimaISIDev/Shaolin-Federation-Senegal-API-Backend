// ============================================================
// SERVICE — affiliation-token.ts
// Jeton d'accès d'un candidat à SA demande d'affiliation (pas de compte à ce
// stade). Remis à la soumission, il est exigé par les routes publiques qui
// lisent ou modifient la demande (preuve de paiement, statut, paiement en
// ligne) — l'id seul, séquentiel, ne suffit plus.
// Dérivé par HMAC de l'id + date de création : rien à stocker en base.
// ============================================================
import crypto from 'crypto';

const secret = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET manquant');
  return s;
};

export const signDemandeToken = (demande: { id: number; createdAt: Date }): string =>
  crypto
    .createHmac('sha256', secret())
    .update(`affiliation-demande:${demande.id}:${demande.createdAt.getTime()}`)
    .digest('base64url');

export const isValidDemandeToken = (
  demande: { id: number; createdAt: Date },
  token: unknown
): boolean => {
  if (typeof token !== 'string' || !token) return false;
  const expected = Buffer.from(signDemandeToken(demande));
  const received = Buffer.from(token);
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
};

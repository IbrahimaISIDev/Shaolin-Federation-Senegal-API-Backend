// Les adresses email sont comparées sans tenir compte de la casse :
// « Awa.Diop@Gmail.com » et « awa.diop@gmail.com » désignent le même compte.
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

// Filtre Prisma : utilisateur dont l'email correspond, quelle que soit la casse
// (couvre aussi les comptes enregistrés avant la normalisation).
export const emailEquals = (email: string) => ({
  email: { equals: email.trim(), mode: 'insensitive' as const },
});

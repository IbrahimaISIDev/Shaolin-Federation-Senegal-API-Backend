// Échappe une valeur avant insertion dans du HTML (emails, gabarits PDF) :
// toute donnée saisie par un utilisateur doit passer par ici.
export const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

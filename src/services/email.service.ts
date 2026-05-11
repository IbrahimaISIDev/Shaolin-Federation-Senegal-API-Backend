// ============================================================
// SERVICE — email.service.ts
// Emails transactionnels via Nodemailer / SMTP
// ============================================================
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST  || 'smtp.gmail.com',
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const FROM        = `"ADSS Sénégal" <${process.env.SMTP_USER}>`;
const SITE_URL    = process.env.FRONTEND_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.SMTP_USER || '';

// ─── Wrapper HTML commun ──────────────────────────────────────────────────────
function wrap(body: string): string {
    return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f4f4f5;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
    <div style="background:#0f172a;padding:24px;text-align:center">
      <p style="margin:0;color:#f59e0b;font-size:22px;font-weight:700">🥋 ADSS Sénégal</p>
      <p style="margin:4px 0 0;color:#94a3b8;font-size:12px">Association Disciples Shaolin Si Sénégal</p>
    </div>
    <div style="padding:32px">${body}</div>
    <div style="background:#f8fafc;padding:16px;text-align:center;font-size:12px;color:#94a3b8">
      © ${new Date().getFullYear()} ADSS Sénégal · Dakar, Sénégal ·
      <a href="${SITE_URL}" style="color:#f59e0b;text-decoration:none">shaolin-senegal.sn</a>
    </div>
  </div>
</body></html>`;
}

function btn(label: string, url: string): string {
    return `<p style="text-align:center;margin:24px 0">
      <a href="${url}" style="background:#f59e0b;color:#0f172a;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;display:inline-block">${label}</a>
    </p>`;
}

// ─── 1. Email de bienvenue ────────────────────────────────────────────────────
export const sendWelcomeEmail = async (to: string, prenom: string) => {
    const body = `
      <h2 style="color:#0f172a;margin-top:0">Bienvenue, ${prenom} ! 🎉</h2>
      <p style="color:#475569">Votre compte ADSS Sénégal a bien été créé.</p>
      <p style="color:#475569">Votre demande d'adhésion est en cours d'examen par notre équipe.
         Vous recevrez une confirmation dès que votre licence sera activée.</p>
      <div style="background:#fef9ee;border-left:4px solid #f59e0b;padding:16px;border-radius:0 8px 8px 0;margin:20px 0">
        <p style="margin:0;color:#78350f;font-size:14px">En attendant, vous pouvez compléter votre profil et explorer les prochaines compétitions.</p>
      </div>
      ${btn('Accéder à mon espace', `${SITE_URL}/membre`)}`;

    await transporter.sendMail({ from: FROM, to, subject: 'Bienvenue à l\'ADSS Sénégal 🥋', html: wrap(body) });
};

// ─── 2. Réinitialisation du mot de passe ─────────────────────────────────────
export const sendPasswordResetEmail = async (to: string, prenom: string, token: string) => {
    const url  = `${SITE_URL}/reinitialiser-mot-de-passe?token=${token}`;
    const body = `
      <h2 style="color:#0f172a;margin-top:0">Réinitialisation du mot de passe</h2>
      <p style="color:#475569">Bonjour ${prenom},</p>
      <p style="color:#475569">Vous avez demandé à réinitialiser votre mot de passe.
         Cliquez sur le bouton ci-dessous. Ce lien expire dans <strong>1 heure</strong>.</p>
      ${btn('Réinitialiser mon mot de passe', url)}
      <p style="color:#94a3b8;font-size:13px;text-align:center">
        Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
      </p>`;

    await transporter.sendMail({ from: FROM, to, subject: 'Réinitialisation de votre mot de passe', html: wrap(body) });
};

// ─── 3. Confirmation d'inscription à une compétition ─────────────────────────
export const sendCompetitionRegistrationEmail = async (
    to: string,
    prenom: string,
    competition: { titre: string; dateDebut: Date; lieu?: string | null }
) => {
    const dateStr = new Date(competition.dateDebut).toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    const body = `
      <h2 style="color:#0f172a;margin-top:0">Inscription confirmée ! 🏆</h2>
      <p style="color:#475569">Bonjour ${prenom},</p>
      <p style="color:#475569">Votre inscription à la compétition suivante a bien été enregistrée :</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:20px 0">
        <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#14532d">${competition.titre}</p>
        <p style="margin:0;color:#166534;font-size:14px">📅 ${dateStr}</p>
        ${competition.lieu ? `<p style="margin:4px 0 0;color:#166534;font-size:14px">📍 ${competition.lieu}</p>` : ''}
      </div>
      <p style="color:#475569;font-size:14px">N'oubliez pas de vous munir de votre licence et de votre certificat médical le jour J.</p>
      ${btn('Voir mes compétitions', `${SITE_URL}/membre/competitions`)}`;

    await transporter.sendMail({ from: FROM, to, subject: `Inscription confirmée — ${competition.titre}`, html: wrap(body) });
};

// ─── 4. Affiliation reçue ─────────────────────────────────────────────────────
export const sendAffiliationReceivedEmail = async (
    to: string,
    nomComplet: string,
    type: 'CLUB' | 'MAITRE' | 'MEMBRE',
    demandeId: number
) => {
    const labels = { CLUB: 'Club', MAITRE: 'Maître', MEMBRE: 'Membre/Disciple' };
    const body = `
      <h2 style="color:#0f172a;margin-top:0">Demande d'affiliation reçue ✅</h2>
      <p style="color:#475569">Bonjour ${nomComplet},</p>
      <p style="color:#475569">Votre demande d'affiliation en tant que <strong>${labels[type]}</strong> a bien été reçue et est en cours d'examen.</p>
      <div style="background:#fef9ee;border-left:4px solid #f59e0b;padding:16px;border-radius:0 8px 8px 0;margin:20px 0">
        <p style="margin:0;color:#78350f;font-size:14px">Référence : <strong>#${demandeId}</strong></p>
        <p style="margin:8px 0 0;color:#78350f;font-size:14px">Vous serez notifié(e) par email dès qu'une décision sera prise.</p>
      </div>`;

    await transporter.sendMail({ from: FROM, to, subject: 'Demande d\'affiliation ADSS reçue', html: wrap(body) });
};

// ─── 5. Affiliation approuvée ─────────────────────────────────────────────────
export const sendAffiliationApprovedEmail = async (
    to: string,
    nomComplet: string,
    type: 'CLUB' | 'MAITRE' | 'MEMBRE',
    code: string,
    credentials?: { email: string; password: string }
) => {
    const labels = { CLUB: 'Club', MAITRE: 'Maître', MEMBRE: 'Membre/Disciple' };
    const credentialsBlock = credentials ? `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:20px 0">
        <p style="margin:0 0 8px;font-weight:700;color:#14532d">Vos identifiants de connexion</p>
        <p style="margin:0;color:#166534;font-size:14px">Email : <strong>${credentials.email}</strong></p>
        <p style="margin:4px 0 0;color:#166534;font-size:14px">Mot de passe temporaire : <strong>${credentials.password}</strong></p>
        <p style="margin:8px 0 0;color:#166534;font-size:13px">Veuillez changer votre mot de passe dès la première connexion.</p>
      </div>` : '';

    const body = `
      <h2 style="color:#0f172a;margin-top:0">Affiliation approuvée 🎉</h2>
      <p style="color:#475569">Bonjour ${nomComplet},</p>
      <p style="color:#475569">Votre demande d'affiliation en tant que <strong>${labels[type]}</strong> a été <strong style="color:#16a34a">approuvée</strong>.</p>
      <div style="background:#fef9ee;border-left:4px solid #f59e0b;padding:16px;border-radius:0 8px 8px 0;margin:20px 0">
        <p style="margin:0;color:#78350f;font-size:14px">Code d'affiliation : <strong style="font-size:18px">${code}</strong></p>
      </div>
      ${credentialsBlock}
      ${btn('Accéder à mon espace', `${SITE_URL}/connexion`)}`;

    await transporter.sendMail({ from: FROM, to, subject: `Affiliation approuvée — Code ${code}`, html: wrap(body) });
};

// ─── 6. Affiliation rejetée ───────────────────────────────────────────────────
export const sendAffiliationRejectedEmail = async (
    to: string,
    nomComplet: string,
    motif: string
) => {
    const body = `
      <h2 style="color:#0f172a;margin-top:0">Demande d'affiliation non approuvée</h2>
      <p style="color:#475569">Bonjour ${nomComplet},</p>
      <p style="color:#475569">Après examen, votre demande d'affiliation n'a pas pu être approuvée.</p>
      <div style="background:#fff1f2;border-left:4px solid #ef4444;padding:16px;border-radius:0 8px 8px 0;margin:20px 0">
        <p style="margin:0;color:#991b1b;font-size:14px"><strong>Motif :</strong> ${motif}</p>
      </div>
      <p style="color:#475569;font-size:14px">Pour toute question, n'hésitez pas à nous contacter.</p>
      ${btn('Nous contacter', `${SITE_URL}/contact`)}`;

    await transporter.sendMail({ from: FROM, to, subject: 'Décision sur votre demande d\'affiliation ADSS', html: wrap(body) });
};

// ─── 7. Notification admin — nouveau message de contact ──────────────────────
export const sendContactNotificationEmail = async (contact: {
    name: string;
    email: string;
    phone?: string | null;
    subject: string;
    message: string;
}) => {
    if (!ADMIN_EMAIL) return;

    const body = `
      <h2 style="color:#0f172a;margin-top:0">Nouveau message de contact</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:8px 0;color:#64748b;width:120px">De</td><td style="padding:8px 0;font-weight:600">${contact.name}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b">Email</td><td style="padding:8px 0"><a href="mailto:${contact.email}" style="color:#f59e0b">${contact.email}</a></td></tr>
        ${contact.phone ? `<tr><td style="padding:8px 0;color:#64748b">Téléphone</td><td style="padding:8px 0">${contact.phone}</td></tr>` : ''}
        <tr><td style="padding:8px 0;color:#64748b">Sujet</td><td style="padding:8px 0">${contact.subject}</td></tr>
      </table>
      <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-top:16px">
        <p style="margin:0;color:#334155;white-space:pre-wrap">${contact.message}</p>
      </div>
      ${btn('Voir dans l\'admin', `${SITE_URL}/admin`)}`;

    await transporter.sendMail({
        from: FROM,
        to:   ADMIN_EMAIL,
        replyTo: contact.email,
        subject: `[Contact] ${contact.subject} — ${contact.name}`,
        html: wrap(body),
    });
};

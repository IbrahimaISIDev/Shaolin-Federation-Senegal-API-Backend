// ============================================================
// SERVICE — email.service.ts
// Emails transactionnels via Nodemailer / SMTP
// ============================================================
import nodemailer from 'nodemailer';
import { escapeHtml } from '../utils/html';
import { prisma } from '../lib/prisma';

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
const SITE_HOST   = SITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');

// Toute donnée saisie par un utilisateur est échappée avant insertion dans le HTML
const esc = escapeHtml;

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
      <a href="${SITE_URL}" style="color:#f59e0b;text-decoration:none">${SITE_HOST}</a>
    </div>
  </div>
</body></html>`;
}

function btn(label: string, url: string): string {
    return `<p style="text-align:center;margin:24px 0">
      <a href="${url}" style="background:#f59e0b;color:#0f172a;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;display:inline-block">${label}</a>
    </p>`;
}

// ─── 2. Réinitialisation du mot de passe ─────────────────────────────────────
export const sendPasswordResetEmail = async (to: string, prenom: string, token: string) => {
    const url  = `${SITE_URL}/reinitialiser-mot-de-passe?token=${token}`;
    const body = `
      <h2 style="color:#0f172a;margin-top:0">Réinitialisation du mot de passe</h2>
      <p style="color:#475569">Bonjour ${esc(prenom)},</p>
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
      <p style="color:#475569">Bonjour ${esc(prenom)},</p>
      <p style="color:#475569">Votre inscription à la compétition suivante a bien été enregistrée :</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:20px 0">
        <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#14532d">${esc(competition.titre)}</p>
        <p style="margin:0;color:#166534;font-size:14px">📅 ${dateStr}</p>
        ${competition.lieu ? `<p style="margin:4px 0 0;color:#166534;font-size:14px">📍 ${esc(competition.lieu)}</p>` : ''}
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
      <p style="color:#475569">Bonjour ${esc(nomComplet)},</p>
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
        <p style="margin:0;color:#166534;font-size:14px">Email : <strong>${esc(credentials.email)}</strong></p>
        <p style="margin:4px 0 0;color:#166534;font-size:14px">Mot de passe temporaire : <strong>${esc(credentials.password)}</strong></p>
        <p style="margin:8px 0 0;color:#166534;font-size:13px">Veuillez changer votre mot de passe dès la première connexion.</p>
      </div>` : '';

    const body = `
      <h2 style="color:#0f172a;margin-top:0">Affiliation approuvée 🎉</h2>
      <p style="color:#475569">Bonjour ${esc(nomComplet)},</p>
      <p style="color:#475569">Votre demande d'affiliation en tant que <strong>${labels[type]}</strong> a été <strong style="color:#16a34a">approuvée</strong>.</p>
      <div style="background:#fef9ee;border-left:4px solid #f59e0b;padding:16px;border-radius:0 8px 8px 0;margin:20px 0">
        <p style="margin:0;color:#78350f;font-size:14px">Code d'affiliation : <strong style="font-size:18px">${esc(code)}</strong></p>
      </div>
      ${credentialsBlock}
      ${btn('Accéder à mon espace', `${SITE_URL}/connexion`)}`;

    await transporter.sendMail({ from: FROM, to, subject: `Affiliation approuvée — Code ${code}`, html: wrap(body) });
};

// ─── 5bis. Compte créé via import en masse (membres déjà affiliés) ────────────
export const sendMemberImportedEmail = async (
    to: string,
    nomComplet: string,
    clubNom: string,
    credentials: { email: string; password: string }
) => {
    const body = `
      <h2 style="color:#0f172a;margin-top:0">Ton espace membre est prêt 🥋</h2>
      <p style="color:#475569">Bonjour ${esc(nomComplet)},</p>
      <p style="color:#475569">Un espace membre a été créé pour toi sur la plateforme de l'ADSS Sénégal, au sein du club <strong>${esc(clubNom)}</strong>. Ta licence est active.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:20px 0">
        <p style="margin:0 0 8px;font-weight:700;color:#14532d">Vos identifiants de connexion</p>
        <p style="margin:0;color:#166534;font-size:14px">Email : <strong>${esc(credentials.email)}</strong></p>
        <p style="margin:4px 0 0;color:#166534;font-size:14px">Mot de passe temporaire : <strong>${esc(credentials.password)}</strong></p>
        <p style="margin:8px 0 0;color:#166534;font-size:13px">Veuillez changer votre mot de passe dès la première connexion.</p>
      </div>
      ${btn('Accéder à mon espace', `${SITE_URL}/connexion`)}`;

    await transporter.sendMail({ from: FROM, to, subject: 'Ton espace membre ADSS Sénégal est prêt', html: wrap(body) });
};

// ─── 6. Affiliation rejetée ───────────────────────────────────────────────────
export const sendAffiliationRejectedEmail = async (
    to: string,
    nomComplet: string,
    motif: string
) => {
    const body = `
      <h2 style="color:#0f172a;margin-top:0">Demande d'affiliation non approuvée</h2>
      <p style="color:#475569">Bonjour ${esc(nomComplet)},</p>
      <p style="color:#475569">Après examen, votre demande d'affiliation n'a pas pu être approuvée.</p>
      <div style="background:#fff1f2;border-left:4px solid #ef4444;padding:16px;border-radius:0 8px 8px 0;margin:20px 0">
        <p style="margin:0;color:#991b1b;font-size:14px"><strong>Motif :</strong> ${esc(motif)}</p>
      </div>
      <p style="color:#475569;font-size:14px">Pour toute question, n'hésitez pas à nous contacter.</p>
      ${btn('Nous contacter', `${SITE_URL}/contact`)}`;

    await transporter.sendMail({ from: FROM, to, subject: 'Décision sur votre demande d\'affiliation ADSS', html: wrap(body) });
};

// ─── 7bis. Licence bientôt expirée ────────────────────────────────────────────
export const sendLicenseExpiringEmail = async (
    to: string,
    prenom: string,
    dateFin: Date,
    joursRestants: number
) => {
    const dateStr = new Date(dateFin).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
    });
    const urgent = joursRestants <= 7;

    const body = `
      <h2 style="color:#0f172a;margin-top:0">Votre licence expire bientôt ⏰</h2>
      <p style="color:#475569">Bonjour ${esc(prenom)},</p>
      <p style="color:#475569">Votre licence ADSS Sénégal arrive à expiration dans <strong>${joursRestants} jour${joursRestants > 1 ? 's' : ''}</strong>, le <strong>${dateStr}</strong>.</p>
      <div style="background:${urgent ? '#fff1f2' : '#fef9ee'};border-left:4px solid ${urgent ? '#ef4444' : '#f59e0b'};padding:16px;border-radius:0 8px 8px 0;margin:20px 0">
        <p style="margin:0;color:${urgent ? '#991b1b' : '#78350f'};font-size:14px">
          ${urgent
            ? "Pensez à renouveler rapidement votre licence pour continuer à participer aux compétitions et activités de l'association."
            : "Vous pouvez dès maintenant préparer le renouvellement de votre licence auprès de votre club."}
        </p>
      </div>
      ${btn('Voir ma licence', `${SITE_URL}/membre/licence`)}`;

    await transporter.sendMail({
        from: FROM,
        to,
        subject: urgent ? `⚠️ Votre licence expire dans ${joursRestants} jours` : 'Votre licence expire bientôt',
        html: wrap(body),
    });
};

// ─── 7. Notification admin — nouveau message de contact ──────────────────────
export const sendContactNotificationEmail = async (contact: {
    name: string;
    email: string;
    phone?: string | null;
    subject: string;
    message: string;
}) => {
    if (!(await adminRecipient())) return;

    const body = `
      <h2 style="color:#0f172a;margin-top:0">Nouveau message de contact</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:8px 0;color:#64748b;width:120px">De</td><td style="padding:8px 0;font-weight:600">${esc(contact.name)}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b">Email</td><td style="padding:8px 0"><a href="mailto:${esc(contact.email)}" style="color:#f59e0b">${esc(contact.email)}</a></td></tr>
        ${contact.phone ? `<tr><td style="padding:8px 0;color:#64748b">Téléphone</td><td style="padding:8px 0">${esc(contact.phone)}</td></tr>` : ''}
        <tr><td style="padding:8px 0;color:#64748b">Sujet</td><td style="padding:8px 0">${esc(contact.subject)}</td></tr>
      </table>
      <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-top:16px">
        <p style="margin:0;color:#334155;white-space:pre-wrap">${esc(contact.message)}</p>
      </div>
      ${btn('Lire dans l\'admin', `${SITE_URL}/admin/messages`)}`;

    await transporter.sendMail({
        from: FROM,
        to:   await adminRecipient(),
        replyTo: contact.email,
        subject: `[Contact] ${contact.subject} — ${contact.name}`,
        html: wrap(body),
    });
};

// ─── Notifications de l'administration ────────────────────────────────────────
// Destinataire : email de contact des Paramètres, sinon le compte d'envoi SMTP.
async function adminRecipient(): Promise<string> {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } }).catch(() => null);
    return settings?.contactEmail?.trim() || ADMIN_EMAIL;
}

type NotificationKey = 'notifyNewAffiliation' | 'notifyNewMember' | 'notifyCompetitions' | 'notifyNewsletter';

// Envoie une notification à l'admin si l'interrupteur correspondant est activé
// dans Paramètres → Notifications.
async function notifyAdmin(key: NotificationKey, subject: string, body: string): Promise<void> {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (settings && settings[key] === false) return;
    const to = await adminRecipient();
    if (!to) return;
    await transporter.sendMail({ from: FROM, to, subject, html: wrap(body) });
}

const row = (label: string, value: unknown) =>
    `<tr><td style="padding:7px 0;color:#64748b;width:62%;border-bottom:1px solid #f1f5f9">${esc(label)}</td>`
    + `<td style="padding:7px 0;font-weight:600;color:#0f172a;text-align:right;border-bottom:1px solid #f1f5f9">${esc(value)}</td></tr>`;

// 8. Preuve de paiement d'affiliation reçue → à vérifier
export const sendAdminAffiliationProofEmail = async (demande: {
    id: number; type: string; prenom: string; nom: string; email: string; telephone: string;
    montant: number; referenceManuelle: string;
}) => {
    const labels: Record<string, string> = { CLUB: 'Club', MAITRE: 'Maître', MEMBRE: 'Membre/Disciple' };
    const body = `
      <h2 style="color:#0f172a;margin-top:0">Paiement d'affiliation à vérifier 💳</h2>
      <p style="color:#475569">Un candidat vient d'envoyer sa preuve de paiement.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${row('Candidat', `${demande.prenom} ${demande.nom}`)}
        ${row('Type', labels[demande.type] ?? demande.type)}
        ${row('Montant', `${demande.montant.toLocaleString('fr-FR')} FCFA`)}
        ${row('Référence', demande.referenceManuelle)}
        ${row('Contact', `${demande.telephone} · ${demande.email}`)}
      </table>
      ${btn('Vérifier le paiement', `${SITE_URL}/admin/affiliations`)}`;
    await notifyAdmin('notifyNewAffiliation', `[Affiliation] Paiement à vérifier — ${demande.prenom} ${demande.nom}`, body);
};

// 9. Preuve de paiement de renouvellement reçue → à vérifier
export const sendAdminRenewalProofEmail = async (info: {
    prenom: string; nom: string; club: string; annee: number; montant: number; transactionRef: string;
}) => {
    const body = `
      <h2 style="color:#0f172a;margin-top:0">Renouvellement de licence à vérifier 🔄</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${row('Membre', `${info.prenom} ${info.nom}`)}
        ${row('Club', info.club)}
        ${row('Saison', info.annee)}
        ${row('Montant', `${info.montant.toLocaleString('fr-FR')} FCFA`)}
        ${row('Référence', info.transactionRef)}
      </table>
      ${btn('Vérifier le renouvellement', `${SITE_URL}/admin/renouvellements`)}`;
    await notifyAdmin('notifyNewMember', `[Licence] Renouvellement à vérifier — ${info.prenom} ${info.nom}`, body);
};

// 10. Inscription à une compétition
export const sendAdminCompetitionRegistrationEmail = async (info: {
    prenom: string; nom: string; club: string; competition: string; competitionId: number; categorie?: string | null;
}) => {
    const body = `
      <h2 style="color:#0f172a;margin-top:0">Nouvelle inscription à une compétition 🏆</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${row('Compétition', info.competition)}
        ${row('Participant', `${info.prenom} ${info.nom}`)}
        ${row('Club', info.club)}
        ${info.categorie ? row('Catégorie', info.categorie) : ''}
      </table>
      ${btn('Voir les inscrits', `${SITE_URL}/admin/competitions/${info.competitionId}`)}`;
    await notifyAdmin('notifyCompetitions', `[Compétition] ${info.prenom} ${info.nom} — ${info.competition}`, body);
};

// 11. Rapport hebdomadaire d'activité
export const sendAdminWeeklyReportEmail = async (report: {
    periode: string;
    nouvellesDemandes: number; affiliationsApprouvees: number; renouvellementsConfirmes: number;
    inscriptionsCompetitions: number; messagesContact: number;
    enAttente: { paiements: number; affiliations: number; renouvellements: number; messagesNonLus: number };
    membresActifs: number; clubsActifs: number;
}) => {
    const attente = report.enAttente.paiements + report.enAttente.affiliations
        + report.enAttente.renouvellements + report.enAttente.messagesNonLus;
    const body = `
      <h2 style="color:#0f172a;margin-top:0">Rapport hebdomadaire 📊</h2>
      <p style="color:#475569">Activité de la plateforme — ${esc(report.periode)}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${row('Nouvelles demandes d\'affiliation', report.nouvellesDemandes)}
        ${row('Affiliations approuvées', report.affiliationsApprouvees)}
        ${row('Renouvellements confirmés', report.renouvellementsConfirmes)}
        ${row('Inscriptions aux compétitions', report.inscriptionsCompetitions)}
        ${row('Messages de contact', report.messagesContact)}
      </table>
      <h3 style="color:#0f172a;margin:24px 0 8px">En attente de traitement : ${attente}</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${row('Paiements d\'affiliation à vérifier', report.enAttente.paiements)}
        ${row('Affiliations à valider', report.enAttente.affiliations)}
        ${row('Renouvellements à confirmer', report.enAttente.renouvellements)}
        ${row('Messages non lus', report.enAttente.messagesNonLus)}
      </table>
      <p style="color:#475569;font-size:14px;margin-top:20px">Licences actives : <strong>${report.membresActifs}</strong> · Clubs actifs : <strong>${report.clubsActifs}</strong></p>
      ${btn('Ouvrir le tableau de bord', `${SITE_URL}/admin`)}`;
    await notifyAdmin('notifyNewsletter', `Rapport hebdomadaire ADSS — ${report.periode}`, body);
};

// ─── Notifications aux membres ────────────────────────────────────────────────

// 12. Renouvellement confirmé
export const sendRenewalConfirmedEmail = async (to: string, prenom: string, annee: number) => {
    const body = `
      <h2 style="color:#0f172a;margin-top:0">Licence ${annee} confirmée ✅</h2>
      <p style="color:#475569">Bonjour ${esc(prenom)},</p>
      <p style="color:#475569">Votre paiement a été vérifié : votre licence pour la saison <strong>${annee}</strong> est active.
         Vous pouvez télécharger votre carte de licence depuis votre espace membre.</p>
      ${btn('Voir ma licence', `${SITE_URL}/membre/licence`)}`;
    await transporter.sendMail({ from: FROM, to, subject: `Votre licence ${annee} est active`, html: wrap(body) });
};

// 13. Renouvellement refusé
export const sendRenewalRejectedEmail = async (to: string, prenom: string, annee: number, motif?: string | null) => {
    const body = `
      <h2 style="color:#0f172a;margin-top:0">Paiement de renouvellement non validé</h2>
      <p style="color:#475569">Bonjour ${esc(prenom)},</p>
      <p style="color:#475569">Le paiement envoyé pour votre licence <strong>${annee}</strong> n'a pas pu être validé.</p>
      ${motif ? `<div style="background:#fff1f2;border-left:4px solid #ef4444;padding:16px;border-radius:0 8px 8px 0;margin:20px 0">
        <p style="margin:0;color:#991b1b;font-size:14px"><strong>Motif :</strong> ${esc(motif)}</p></div>` : ''}
      <p style="color:#475569">Vous pouvez relancer le renouvellement depuis votre espace membre, ou nous contacter.</p>
      ${btn('Relancer mon renouvellement', `${SITE_URL}/membre/licence`)}`;
    await transporter.sendMail({ from: FROM, to, subject: `Licence ${annee} : paiement non validé`, html: wrap(body) });
};

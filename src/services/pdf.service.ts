import puppeteer from 'puppeteer';
import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import QRCode from 'qrcode';

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Template HTML de la carte de licence ────────────────────────────────────
const buildLicenseHTML = (data: {
  prenom: string;
  nom: string;
  club: string;
  region: string;
  grade?: string;
  discipline?: string;
  annee: number;
  dateFin: string;
  uuid: string;
  photoUrl?: string;
  qrDataUrl: string;
  numeroLicence: string;
}) => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Arial', sans-serif;
      width: 856px; height: 540px;
      background: #fff;
      overflow: hidden;
    }
    .card {
      width: 856px; height: 540px;
      background: linear-gradient(135deg, #0A1628 0%, #1A2B4A 50%, #1A5276 100%);
      position: relative;
      display: flex;
      flex-direction: column;
      color: white;
    }
    /* Motif décoratif */
    .card::before {
      content: '';
      position: absolute;
      top: -80px; right: -80px;
      width: 300px; height: 300px;
      border: 40px solid rgba(230,126,34,0.15);
      border-radius: 50%;
    }
    .card::after {
      content: '';
      position: absolute;
      bottom: -60px; left: -60px;
      width: 240px; height: 240px;
      border: 30px solid rgba(255,255,255,0.05);
      border-radius: 50%;
    }
    /* Header */
    .header {
      display: flex;
      align-items: center;
      padding: 24px 32px 16px;
      border-bottom: 2px solid rgba(230,126,34,0.6);
      gap: 16px;
    }
    .header-title { flex: 1; }
    .federation-name {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #fff;
      text-transform: uppercase;
    }
    .federation-sub {
      font-size: 11px;
      color: rgba(255,255,255,0.6);
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .year-badge {
      background: #E67E22;
      color: white;
      font-size: 22px;
      font-weight: 800;
      padding: 8px 20px;
      border-radius: 8px;
      letter-spacing: 0.05em;
    }
    /* Body */
    .body {
      display: flex;
      flex: 1;
      padding: 24px 32px;
      gap: 24px;
    }
    /* Photo */
    .photo-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .photo {
      width: 110px; height: 110px;
      border-radius: 12px;
      border: 3px solid rgba(230,126,34,0.8);
      object-fit: cover;
      background: rgba(255,255,255,0.1);
    }
    .photo-placeholder {
      width: 110px; height: 110px;
      border-radius: 12px;
      border: 3px solid rgba(230,126,34,0.8);
      background: rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      font-weight: 700;
      color: rgba(255,255,255,0.5);
    }
    /* Infos membre */
    .info-section { flex: 1; }
    .member-name {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 0.02em;
      margin-bottom: 4px;
      color: #fff;
    }
    .info-row {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      gap: 8px;
    }
    .info-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: rgba(255,255,255,0.5);
      width: 80px;
      flex-shrink: 0;
    }
    .info-value {
      font-size: 13px;
      font-weight: 600;
      color: rgba(255,255,255,0.9);
    }
    .divider {
      height: 1px;
      background: rgba(255,255,255,0.1);
      margin: 12px 0;
    }
    /* QR + numéro */
    .qr-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .qr-img {
      width: 110px; height: 110px;
      background: white;
      border-radius: 8px;
      padding: 6px;
    }
    .license-number {
      font-size: 9px;
      color: rgba(255,255,255,0.5);
      letter-spacing: 0.05em;
      text-align: center;
    }
    /* Footer */
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 32px;
      background: rgba(0,0,0,0.3);
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    .footer-left { font-size: 11px; color: rgba(255,255,255,0.5); }
    .status-badge {
      background: #1D9E75;
      color: white;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 14px;
      border-radius: 99px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .validity {
      font-size: 11px;
      color: rgba(255,255,255,0.6);
      text-align: right;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="header-title">
        <div class="federation-name">Fédération Shaolin Sénégal</div>
        <div class="federation-sub">Licence officielle de membre</div>
      </div>
      <div class="year-badge">${data.annee}</div>
    </div>

    <div class="body">
      <div class="photo-section">
        ${data.photoUrl
          ? `<img src="${data.photoUrl}" class="photo" alt="photo"/>`
          : `<div class="photo-placeholder">${data.prenom[0]}${data.nom[0]}</div>`
        }
      </div>

      <div class="info-section">
        <div class="member-name">${data.prenom.toUpperCase()} ${data.nom.toUpperCase()}</div>
        <div class="divider"></div>
        <div class="info-row">
          <span class="info-label">Club</span>
          <span class="info-value">${data.club}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Région</span>
          <span class="info-value">${data.region}</span>
        </div>
        ${data.grade ? `
        <div class="info-row">
          <span class="info-label">Grade</span>
          <span class="info-value">${data.grade}</span>
        </div>` : ''}
        ${data.discipline ? `
        <div class="info-row">
          <span class="info-label">Discipline</span>
          <span class="info-value">${data.discipline}</span>
        </div>` : ''}
        <div class="info-row">
          <span class="info-label">Validité</span>
          <span class="info-value" style="color:#E67E22">Jusqu'au ${data.dateFin}</span>
        </div>
      </div>

      <div class="qr-section">
        <img src="${data.qrDataUrl}" class="qr-img" alt="QR Code"/>
        <div class="license-number">N° ${data.numeroLicence}</div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-left">federation-shaolin-senegal.sn</div>
      <div class="status-badge">✓ Licence active</div>
      <div class="validity">Saison ${data.annee}</div>
    </div>
  </div>
</body>
</html>
`;

// ─── Générer et uploader le PDF ───────────────────────────────────────────────
export const generateLicensePDF = async (licenseId: number, userId: number): Promise<string> => {
  // Récupérer les données complètes
  const member = await prisma.member.findUnique({
    where: { userId },
    include: {
      club: { include: { region: { select: { nom: true } } } },
      licenses: {
        where: { id: licenseId },
        take: 1,
      },
    },
  });

  if (!member) throw { status: 404, message: 'Membre introuvable', code: 'NOT_FOUND' };

  const license = member.licenses[0];
  if (!license) throw { status: 404, message: 'Licence introuvable', code: 'NOT_FOUND' };
  if (license.status !== 'ACTIVE') throw { status: 400, message: 'La licence doit être active pour générer un PDF', code: 'LICENSE_NOT_ACTIVE' };

  // Si PDF déjà généré, retourner l'URL existante
  if (license.pdfUrl) return license.pdfUrl;

  // Générer le QR Code en base64
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify?token=${license.qrToken}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 200, margin: 1,
    color: { dark: '#1A5276', light: '#FFFFFF' },
  });

  const dateFin = license.dateFin
    ? new Date(license.dateFin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '31 décembre ' + license.annee;

  const numeroLicence = `SHN-${license.annee}-${String(license.id).padStart(5, '0')}`;

  // Générer le HTML
  const html = buildLicenseHTML({
    prenom: member.prenom,
    nom: member.nom,
    club: member.club.nom,
    region: member.club.region.nom,
    grade: member.grade || undefined,
    discipline: member.discipline || undefined,
    annee: license.annee,
    dateFin,
    uuid: license.uuid,
    photoUrl: member.photoUrl || undefined,
    qrDataUrl,
    numeroLicence,
  });

  // Lancer Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.setViewport({ width: 856, height: 540 });

    const pdfBuffer = await page.pdf({
      width: '856px',
      height: '540px',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    // Uploader sur Cloudinary
    const uploadResult = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'shaolin/licenses',
          public_id: `license_${license.id}_${license.annee}`,
          resource_type: 'raw',
          format: 'pdf',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(pdfBuffer);
    });

    // Sauvegarder l'URL en BDD
    await prisma.license.update({
      where: { id: licenseId },
      data: { pdfUrl: uploadResult.secure_url },
    });

    return uploadResult.secure_url;
  } finally {
    await browser.close();
  }
};
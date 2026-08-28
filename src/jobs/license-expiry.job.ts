// ============================================================
// JOB — license-expiry.job.ts
// Cron quotidien : expire les licences dépassées et envoie les
// rappels de renouvellement (J-30 et J-7 avant expiration)
// ============================================================
import cron from 'node-cron';
import { expireOldLicenses, notifyExpiringLicenses } from '../services/licenses.service';

const runLicenseExpiryJob = async () => {
  console.log('⏰ CRON license-expiry: démarrage');
  try {
    await expireOldLicenses();
    await notifyExpiringLicenses();
  } catch (err) {
    console.error('⚠️ CRON license-expiry: erreur', err);
  }
};

export const startLicenseExpiryJob = () => {
  // Tous les jours à 8h, heure de Dakar
  cron.schedule('0 8 * * *', runLicenseExpiryJob, { timezone: 'Africa/Dakar' });
  console.log('✅ CRON license-expiry planifié (quotidien, 08:00 Africa/Dakar)');
};

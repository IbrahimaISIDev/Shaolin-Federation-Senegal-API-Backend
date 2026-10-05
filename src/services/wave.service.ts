import axios from 'axios';
import crypto from 'crypto';

const WAVE_API_URL = 'https://api.wave.com/v1';
const WAVE_API_KEY = process.env.WAVE_API_KEY ?? '';
const WAVE_WEBHOOK_SECRET = process.env.WAVE_WEBHOOK_SECRET ?? '';

export interface WaveCheckoutSession {
  id: string;
  amount: string;
  checkout_status: 'open' | 'complete' | 'expired';
  client_reference: string;
  currency: string;
  error_url: string;
  success_url: string;
  wave_launch_url: string;   // deep link → ouvre l'app Wave directement
  checkout_url?: string;     // URL web de paiement Wave
  payment_status: 'requires_payment_method' | 'succeeded' | 'failed';
  when_created: string;
  when_expires: string;
  when_completed: string | null;
  business_name: string;
}

export interface WaveWebhookPayload {
  type: 'checkout.session.completed' | 'checkout.session.expired';
  data: WaveCheckoutSession;
}

/**
 * Crée une session de paiement Wave Checkout.
 * Retourne le checkout_url (page web Wave) et le wave_launch_url (deep link app).
 */
export async function createCheckoutSession(params: {
  amount: number;       // en FCFA (entier, ex: 5000)
  clientReference: string;  // identifiant interne (ex: "affiliation-12")
  successUrl: string;
  errorUrl: string;
}): Promise<WaveCheckoutSession> {
  const { data } = await axios.post<WaveCheckoutSession>(
    `${WAVE_API_URL}/checkout/sessions`,
    {
      amount: String(params.amount),
      currency: 'XOF',
      client_reference: params.clientReference,
      success_url: params.successUrl,
      error_url: params.errorUrl,
    },
    {
      headers: {
        Authorization: `Bearer ${WAVE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return data;
}

/**
 * Récupère l'état d'une session Wave par son ID.
 */
export async function getCheckoutSession(sessionId: string): Promise<WaveCheckoutSession> {
  const { data } = await axios.get<WaveCheckoutSession>(
    `${WAVE_API_URL}/checkout/sessions/${sessionId}`,
    {
      headers: { Authorization: `Bearer ${WAVE_API_KEY}` },
    }
  );
  return data;
}

/**
 * Vérifie la signature d'un webhook Wave (méthode « signing secret ») :
 *   Wave-Signature: t=<timestamp unix>,v1=<hmac>[,v1=<hmac>…]
 *   hmac = HMAC-SHA256(secret, timestamp + corps brut de la requête)
 * Refuse si le secret n'est pas configuré, si aucune signature ne correspond,
 * ou si l'horodatage a plus de 5 minutes (rejeu).
 * Doc : https://docs.wave.com/webhook
 */
export function verifyWebhookSignature(header: string | undefined, rawBody: Buffer | undefined): boolean {
  if (!WAVE_WEBHOOK_SECRET || !header || !rawBody) return false;

  const parts = header.split(',').map((p) => p.trim().split('='));
  const timestamp = parts.find(([k]) => k === 't')?.[1];
  const signatures = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!timestamp || signatures.length === 0) return false;

  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 5 * 60) return false;

  const expected = crypto
    .createHmac('sha256', WAVE_WEBHOOK_SECRET)
    .update(timestamp + rawBody.toString('utf8'))
    .digest('hex');

  return signatures.some((sig) => {
    const a = Buffer.from(sig ?? '', 'utf8');
    const b = Buffer.from(expected, 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

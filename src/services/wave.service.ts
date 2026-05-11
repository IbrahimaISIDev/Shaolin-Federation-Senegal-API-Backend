import axios from 'axios';

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
 * Vérifie la signature du webhook Wave.
 * Wave envoie le header: Wave-Signature: <secret>
 */
export function verifyWebhookSignature(receivedSecret: string): boolean {
  if (!WAVE_WEBHOOK_SECRET) return true; // en dev sans secret configuré
  return receivedSecret === WAVE_WEBHOOK_SECRET;
}

import axios from 'axios';

const OM_BASE_URL = 'https://api.orange.com/orange-money-webpay/sn/v1';
const OM_TOKEN_URL = 'https://api.orange.com/oauth/v3/token';

const OM_CLIENT_ID     = process.env.OM_CLIENT_ID ?? '';
const OM_CLIENT_SECRET = process.env.OM_CLIENT_SECRET ?? '';
const OM_MERCHANT_KEY  = process.env.OM_MERCHANT_KEY ?? '';
const OM_AUTH_TOKEN    = process.env.OM_AUTH_TOKEN ?? '';

// Cache du token OAuth2 (valide 90 secondes selon doc Orange)
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 5000) {
    return cachedToken.value;
  }

  const credentials = Buffer.from(`${OM_CLIENT_ID}:${OM_CLIENT_SECRET}`).toString('base64');
  const { data } = await axios.post(
    OM_TOKEN_URL,
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
    }
  );

  cachedToken = {
    value: data.access_token,
    expiresAt: now + (data.expires_in ?? 90) * 1000,
  };

  return cachedToken.value;
}

export interface OmPaymentSession {
  payment_url: string;
  pay_token: string;
  notif_token: string;
  order_id: string;
  message: string;
}

export interface OmPaymentStatus {
  status: 'SUCCESS' | 'FAILED' | 'INITIATED' | 'PENDING';
  txnid?: string;
  amount?: number;
  order_id: string;
  message?: string;
}

export interface OmWebhookPayload {
  status: 'SUCCESS' | 'FAILED';
  txnid: string;
  amount: number;
  order_id: string;
  pay_token: string;
  txnMessage: string;
  notif_token: string;
}

/**
 * Crée une session de paiement Orange Money Web Payment.
 */
export async function createOmPayment(params: {
  amount: number;      // en FCFA (entier)
  orderId: string;     // identifiant unique de la commande
  returnUrl: string;   // redirect après paiement réussi
  cancelUrl: string;   // redirect si annulation
  notifUrl: string;    // webhook notification
}): Promise<OmPaymentSession> {
  const token = await getAccessToken();

  const { data } = await axios.post(
    `${OM_BASE_URL}/webpayment`,
    {
      merchant_key: OM_MERCHANT_KEY,
      currency: 'OUV',
      order_id: params.orderId,
      amount: params.amount,
      return_url: params.returnUrl,
      cancel_url: params.cancelUrl,
      notif_url: params.notifUrl,
      lang: 'fr',
      reference: params.orderId,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-AUTH-TOKEN': OM_AUTH_TOKEN,
        'Content-Type': 'application/json',
        'Accept-Language': 'fr',
      },
    }
  );

  return data?.data ?? data;
}

/**
 * Vérifie le statut d'un paiement Orange Money par order_id.
 */
export async function getOmPaymentStatus(orderId: string): Promise<OmPaymentStatus> {
  const token = await getAccessToken();

  const { data } = await axios.get(
    `${OM_BASE_URL}/paymentstatus/${orderId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-AUTH-TOKEN': OM_AUTH_TOKEN,
      },
    }
  );

  return data?.data ?? data;
}

/**
 * Génère un order_id unique pour une demande d'affiliation.
 */
export function generateOmOrderId(demandeId: number): string {
  return `ADSS-${demandeId}-${Date.now()}`;
}

import "server-only";

/**
 * Low-level Safaricom Daraja API client. No business logic here — that
 * lives in ../providers/mpesa.ts (the PaymentProvider implementation).
 * This file only knows how to talk to Daraja's HTTP API correctly.
 *
 * Sandbox docs: https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function baseUrl(): string {
  return process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

/** YYYYMMDDHHmmss in the app server's local time, as Daraja requires. */
function darajaTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

function darajaPassword(shortcode: string, passkey: string, timestamp: string): string {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
}

/**
 * Converts common Kenyan phone formats (0712345678, +254712345678,
 * 254712345678, 0112345678) to the 2547XXXXXXXX / 2541XXXXXXXX shape
 * Daraja requires. Returns null if it doesn't look like a valid number,
 * so callers can reject bad input before ever calling Daraja.
 */
export function normalizeKenyanPhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (/^254(7|1)\d{8}$/.test(digits)) return digits;
  if (/^0(7|1)\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^(7|1)\d{8}$/.test(digits)) return `254${digits}`;
  return null;
}

// Module-level cache: avoids an OAuth round trip on every STK push within
// the same warm server instance. Daraja tokens last ~1 hour; refreshed a
// minute early to avoid edge-of-expiry failures. Not shared across
// serverless instances — worst case is an extra OAuth call, never a
// security issue, since a fresh token is requested whenever this is empty
// or expired.
let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const consumerKey = requireEnv("MPESA_CONSUMER_KEY");
  const consumerSecret = requireEnv("MPESA_CONSUMER_SECRET");
  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  const res = await fetch(`${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Daraja OAuth failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: string };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in) - 60) * 1000,
  };
  return cachedToken.token;
}

export interface StkPushParams {
  phone: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}

export interface StkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

interface DarajaErrorBody {
  errorCode?: string;
  errorMessage?: string;
  requestId?: string;
}

export async function stkPush(params: StkPushParams): Promise<StkPushResponse> {
  const shortcode = requireEnv("MPESA_SHORTCODE");
  const passkey = requireEnv("MPESA_PASSKEY");
  const callbackUrl = requireEnv("MPESA_CALLBACK_URL");
  const token = await getAccessToken();
  const timestamp = darajaTimestamp();

  const res = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: darajaPassword(shortcode, passkey, timestamp),
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      // Daraja rejects decimals — a checkout total is already rounded to
      // 2dp KES by checkoutSale, so round once more to whole shillings here.
      Amount: Math.round(params.amount),
      PartyA: params.phone,
      PartyB: shortcode,
      PhoneNumber: params.phone,
      CallBackURL: callbackUrl,
      // Daraja truncates this to ~12 chars — callers should pass something
      // short and meaningful (e.g. a sale number), not a full UUID.
      AccountReference: params.accountReference.slice(0, 12),
      TransactionDesc: params.transactionDesc.slice(0, 13),
    }),
    cache: "no-store",
  });

  const body = (await res.json()) as StkPushResponse | DarajaErrorBody;

  if (!res.ok || "errorMessage" in body) {
    const err = body as DarajaErrorBody;
    throw new Error(err.errorMessage ?? `Daraja STK push failed: ${res.status}`);
  }

  return body as StkPushResponse;
}

export interface StkPushQueryResponse {
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: string;
  ResultDesc: string;
}

/** Used to reconcile a pending payment when Daraja's callback never arrived. */
export async function stkPushQuery(checkoutRequestId: string): Promise<StkPushQueryResponse> {
  const shortcode = requireEnv("MPESA_SHORTCODE");
  const passkey = requireEnv("MPESA_PASSKEY");
  const token = await getAccessToken();
  const timestamp = darajaTimestamp();

  const res = await fetch(`${baseUrl()}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: darajaPassword(shortcode, passkey, timestamp),
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
    cache: "no-store",
  });

  const body = (await res.json()) as StkPushQueryResponse | DarajaErrorBody;

  if (!res.ok || "errorMessage" in body) {
    const err = body as DarajaErrorBody;
    throw new Error(err.errorMessage ?? `Daraja STK query failed: ${res.status}`);
  }

  return body as StkPushQueryResponse;
}

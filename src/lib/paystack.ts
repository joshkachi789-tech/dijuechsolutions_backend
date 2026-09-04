import crypto from "crypto";

const SECRET = process.env.PAYSTACK_SECRET_KEY ?? "";
const BASE = "https://api.paystack.co";

async function paystackFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${SECRET}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = (await res.json()) as { message?: string; data: unknown };
  if (!res.ok) throw new Error(data.message ?? "Paystack request failed");
  return data;
}

export interface InitPaymentInput {
  email: string;
  amount: number; // NGN — converted to kobo internally
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

export async function initializePayment(input: InitPaymentInput) {
  const { data } = (await paystackFetch("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: Math.round(input.amount * 100),
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  })) as { data: { authorization_url: string; access_code: string; reference: string } };

  return {
    authorizationUrl: data.authorization_url,
    accessCode: data.access_code,
    reference: data.reference,
  };
}

export async function verifyPayment(reference: string) {
  const { data } = (await paystackFetch(`/transaction/verify/${reference}`)) as {
    data: { status: string; amount: number; reference: string; paid_at: string };
  };
  return {
    status: data.status as "success" | "failed" | "abandoned",
    amount: data.amount / 100,
    reference: data.reference,
    paidAt: data.paid_at,
  };
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const hash = crypto.createHmac("sha512", SECRET).update(payload).digest("hex");
  return hash === signature;
}

export function generateReference(orderNumber: string): string {
  return `DJT-${orderNumber}-${Date.now()}`;
}

import { createHmac, timingSafeEqual } from "node:crypto";

export type Payment = {
  reference: string; user_id: string; plan: "day" | "week" | "month";
  amount: number; currency: string; provider: string; provider_id: string | null;
  mock_status: string;
};
export interface VerifiedPayment {
  status: string; amount: number; currency: string; reference: string; paymentId: string;
}
export interface PaymentProvider {
  startPayment(payment: Payment, returnUrl: string): Promise<{ id: string; url: string }>;
  confirmPayment(reference: string, payment: Payment): Promise<VerifiedPayment>;
}

export function providerName() {
  const name = process.env.PAYMENT_PROVIDER ?? "disabled";
  if (name === "disabled") throw new Error("Checkout is disabled.");
  // This stage never enables checkout in production, even if settings are wrong.
  if (process.env.NODE_ENV !== "development") throw new Error("Test payments require development mode.");
  if (name !== "mock" && name !== "whop") throw new Error("Unknown payment provider.");
  return name;
}

export function mockSignature(body: Buffer) {
  if (providerName() !== "mock" || !process.env.MOCK_WEBHOOK_SECRET) throw new Error("Mock payments are not configured.");
  return createHmac("sha512", process.env.MOCK_WEBHOOK_SECRET).update(body).digest("hex");
}
export function validMockSignature(body: Buffer, header: string | undefined) {
  if (!header || !/^[0-9a-f]{128}$/.test(header)) return false;
  return timingSafeEqual(Buffer.from(mockSignature(body), "hex"), Buffer.from(header, "hex"));
}

const mock: PaymentProvider = {
  async startPayment(payment, returnUrl) {
    return { id: payment.reference, url: returnUrl.replace("/payment-return", "/mock-payment") };
  },
  async confirmPayment(reference, payment) {
    return { status: payment.mock_status, amount: payment.amount, currency: payment.currency,
      reference, paymentId: `mock_${reference}` };
  },
};

export async function getProvider(): Promise<PaymentProvider> {
  if (providerName() === "mock") return mock;
  const { whopProvider } = await import("./whop");
  return whopProvider;
}

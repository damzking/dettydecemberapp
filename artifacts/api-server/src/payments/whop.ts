import type { PaymentProvider } from "./provider";
import { providerName } from "./provider";

// Deliberately never reads the connected production account's credentials.
export function getWhopClient() {
  if (providerName() !== "whop" || process.env.WHOP_ENVIRONMENT !== "sandbox"
    || !process.env.WHOP_SANDBOX_API_KEY || !process.env.WHOP_SANDBOX_COMPANY_ID) {
    throw new Error("Whop sandbox is not configured.");
  }
  return async (path: string, body?: object) => {
    const response = await fetch(`https://sandbox-api.whop.com/api/v1${path}`, {
      method: body ? "POST" : "GET",
      headers: { Authorization: `Bearer ${process.env.WHOP_SANDBOX_API_KEY}`,
        "Content-Type": "application/json", "Api-Version-Date": "2025-01-01" },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Whop sandbox request failed.");
    return response.json() as Promise<Record<string, any>>;
  };
}

export const whopProvider: PaymentProvider = {
  async startPayment(payment, returnUrl) {
    const api = getWhopClient();
    const planId = process.env[`WHOP_SANDBOX_${payment.plan.toUpperCase()}_PLAN_ID`];
    if (!planId) throw new Error("Sandbox plan is missing.");
    const plan = await api(`/plans/${encodeURIComponent(planId)}`);
    if (Math.round(Number(plan.initial_price) * 100) !== payment.amount
      || plan.currency?.toUpperCase() !== payment.currency || plan.plan_type !== "one_time") {
      throw new Error("Sandbox plan does not match the server price.");
    }
    const checkout = await api("/checkout_configurations", {
      plan_id: planId, redirect_url: returnUrl,
      metadata: { reference: payment.reference, user_id: payment.user_id },
    });
    const url = new URL(checkout.purchase_url);
    if (url.protocol !== "https:" || url.hostname !== "sandbox.whop.com") throw new Error("Non-sandbox checkout refused.");
    return { id: checkout.id, url: url.href };
  },
  async confirmPayment(reference, payment) {
    if (!payment.provider_id) throw new Error("Checkout is missing.");
    const api = getWhopClient();
    const result = await api(`/payments?company_id=${encodeURIComponent(process.env.WHOP_SANDBOX_COMPANY_ID!)}&checkout_configuration_ids[]=${encodeURIComponent(payment.provider_id)}&first=100`);
    const paid = result.data?.find((p: any) => p.status === "paid" || p.status === "succeeded");
    if (!paid) return { reference, status: "pending", amount: payment.amount, currency: payment.currency, paymentId: "" };
    if (paid.metadata?.reference !== reference || paid.metadata?.user_id !== payment.user_id) throw new Error("Payment ownership mismatch.");
    return { reference, status: "success", amount: Math.round(Number(paid.total) * 100),
      currency: String(paid.currency).toUpperCase(), paymentId: paid.id };
  },
};

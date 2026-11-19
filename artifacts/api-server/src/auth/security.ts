import type { Request, RequestHandler } from "express";

export const demoPaymentsEnabled = () =>
  process.env.NODE_ENV === "development" && process.env.DEMO_PAYMENTS === "true";

export function supportWhatsappUrl() {
  const number = (process.env.SUPPORT_WHATSAPP_NUMBER ?? "").replace(/^\+/, "");
  if (!/^\d{7,15}$/.test(number)) return null;
  const message = "Hi, I forgot my password for Detty December Guide. My account email is: ";
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function originAllowed(origin: string, req: Request) {
  const configured = [process.env.APP_ORIGIN, ...(process.env.CORS_ORIGINS ?? "").split(",")]
    .filter(Boolean).map((value) => value!.trim().replace(/\/$/, ""));
  if (configured.includes(origin)) return true;
  try {
    const url = new URL(origin);
    // The Expo browser uses its own origin for /api (no third-party cookies).
    const devHosts = process.env.NODE_ENV === "development"
      ? [process.env.REPLIT_EXPO_DEV_DOMAIN, process.env.REPLIT_DEV_DOMAIN] : [];
    return url.protocol === "https:" && [req.get("host"), ...devHosts].includes(url.host);
  } catch { return false; }
}

export const protectWrites: RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) { next(); return; }
  // Cross-site forms cannot supply this header; untrusted preflights are denied.
  const origin = req.get("origin");
  if (req.get("x-guide-client") !== "app" || (origin && !originAllowed(origin, req))) {
    res.status(403).json({ error: "Request origin was not accepted." }); return;
  }
  next();
};

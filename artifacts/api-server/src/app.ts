import express, { type Express } from "express";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import cookieParser from "cookie-parser";
import { originAllowed, protectWrites } from "./auth/security";
import { paymentWebhook } from "./payments/router";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// Trust exactly the nearest reverse proxy, not arbitrary client-supplied IPs.
app.set("trust proxy", 1);
// Credentialed browser requests may use only this server or configured origins.
app.use((req, res, next) => {
  const origin = req.get("origin");
  if (origin && originAllowed(origin, req)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Credentials", "true");
    res.set("Access-Control-Allow-Headers", "Content-Type, X-Guide-Client");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.vary("Origin");
    if (req.method === "OPTIONS") { res.sendStatus(204); return; }
  }
  res.set("Cache-Control", "no-store");
  next();
});
app.use("/api/payments/webhooks", paymentWebhook);
app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());
app.use("/api", protectWrites);

app.use("/api", router);

app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Never log request bodies, parser errors or SQL parameters containing passwords.
  req.log.error({ errorType: err instanceof Error ? err.name : "UnknownError" }, "Request failed");
  const status = typeof err === "object" && err !== null && "status" in err && err.status === 400 ? 400 : 500;
  res.status(status).json({ error: status === 400 ? "Invalid request body." : "The guide could not be loaded. Please try again." });
});

export default app;

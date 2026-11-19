import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  req.log.error({ err }, "Request failed");
  const status = typeof err === "object" && err !== null && "status" in err && err.status === 400 ? 400 : 500;
  res.status(status).json({ error: status === 400 ? "Invalid request body." : "The guide could not be loaded. Please try again." });
});

export default app;

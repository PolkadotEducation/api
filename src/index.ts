import "./instrument.js";
import * as Sentry from "@sentry/node";

import express, { Request, Response } from "express";

import router from "./routes";

import { setupMongoDB } from "./database";
import { env } from "./environment";
import corsConfig from "./middlewares/cors.config";
import { scheduleUpdates } from "./tasks/scheduleUpdates";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/status", (_req: Request, res: Response) => res.status(200).json({ type: "success" }));
app.get("/debug-sentry", function mainHandler(_req, _res) {
  throw new Error("My first Sentry error!");
});

app.use(corsConfig());

router(app);

Sentry.setupExpressErrorHandler(app);

app.listen(env.SERVER_PORT, env.SERVER_HOST, async () => {
  const db = `doteducation-${env.NODE_ENV}`;
  await setupMongoDB(db);

  // eslint-disable-next-line no-console
  console.info(`> Environment: ${env.NODE_ENV}`);
  // eslint-disable-next-line no-console
  console.info(`> Listening at http://${env.SERVER_HOST}:${env.SERVER_PORT}`);

  scheduleUpdates();
  // eslint-disable-next-line no-console
  console.info("Ranking Schedule initiated");
});

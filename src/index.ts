import express, { Request, Response } from "express";

import router from "./routes";

import { setupMongoDB } from "./database";
import { env } from "./environment";
import corsConfig from "./middlewares/cors.config";
import { scheduleRankingUpdate } from "./tasks/scheduleRankingUpdate";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/status", (_req: Request, res: Response) => res.status(200).json({ type: "success" }));

app.use(corsConfig());

router(app);

app.listen(env.SERVER_PORT, env.SERVER_HOST, async () => {
  await setupMongoDB();
  // eslint-disable-next-line no-console
  console.info(`> Listening at http://${env.SERVER_HOST}:${env.SERVER_PORT}`);
  scheduleRankingUpdate();
  // eslint-disable-next-line no-console
  console.info("Ranking Schedule initiated");
});

import express, { Request, Response } from "express";

import router from "./routes";
import { setupMongoDB } from "./database";
import { env } from "./environment";
import corsConfig from "./middlewares/cors.config";
import { connectRedis } from "./redis";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/status", (_req: Request, res: Response) => res.status(200).json({ type: "success" }));

app.use(corsConfig());

router(app);

(async () => {
  try {
    await setupMongoDB();

    await connectRedis();

    app.listen(env.SERVER_PORT, env.SERVER_HOST, () => {
      // eslint-disable-next-line no-console
      console.info(`> Listening at http://${env.SERVER_HOST}:${env.SERVER_PORT}`);
    });
  } catch (err) {
    console.error("[InitializeError]", err);
  }
})();

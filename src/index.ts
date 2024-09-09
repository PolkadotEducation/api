import express from "express";

import middlewareInjection from "./middlewares";
import router from "./routes";

import { setupMongoDB } from "./database";
import { env } from "./environment";

const app = express();

app.use(express.json());

middlewareInjection(app);

router(app);

app.listen(env.SERVER_PORT, env.SERVER_HOST, async () => {
  await setupMongoDB();
  // eslint-disable-next-line no-console
  console.info(`> Listening at http://${env.SERVER_HOST}:${env.SERVER_PORT}`);
});

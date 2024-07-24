import express from "express";

import middlewareInjection from "./middlewares";
import router from "./routes";

import { setupMongoDB } from "./database";
import { env } from "./environment";

import authMiddleware from "@/middlewares/auth";
import corsConfig from "@/cors.config";

const app = express();

app.use(express.json());

middlewareInjection(app);

if (env.NODE_ENV !== "local") {
  const authenticatedRouter = express.Router();
  app.use("/", [corsConfig(), authMiddleware], authenticatedRouter);
}

router(app);

app.listen(env.SERVER_PORT, env.SERVER_HOST, async () => {
  await setupMongoDB();
  console.log(`> Listening at http://${env.SERVER_HOST}:${env.SERVER_PORT}`);
});

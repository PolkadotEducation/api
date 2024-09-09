import { Express, Request, Response } from "express";

// Controllers
import { createUser, deleteUser, getUser, loginUser, loginUserWithGoogle, updateUser } from "@/controllers/users";
import { createLesson, deleteLesson, getLesson, updateLesson } from "@/controllers/lessons";
import { createModule, deleteModule, getModule, updateModule } from "@/controllers/modules";

import authMiddleware from "./middlewares/auth";
import corsConfig from "./cors.config";

const router = (app: Express) => {
  // Health check
  app.get("/status", (_req: Request, res: Response) => res.status(200).json({ type: "success" }));

  // Users
  app.post("/users", createUser);
  app.get("/users/:id", [corsConfig(), authMiddleware], getUser);
  app.put("/users/:id", [corsConfig(), authMiddleware], updateUser);
  app.delete("/users/:id", [corsConfig(), authMiddleware], deleteUser);
  app.post("/users/login", loginUser);
  app.post("/users/login/google", loginUserWithGoogle);

  // Lessons
  app.post("/lesson", [corsConfig(), authMiddleware], createLesson);
  app.get("/lesson", [corsConfig(), authMiddleware], getLesson);
  app.delete("/lesson", [corsConfig(), authMiddleware], deleteLesson);
  app.put("/lesson/:id", [corsConfig(), authMiddleware], updateLesson);

  // Modules
  app.post("/module", [corsConfig(), authMiddleware], createModule);
  app.get("/module", [corsConfig(), authMiddleware], getModule);
  app.put("/module/:id", [corsConfig(), authMiddleware], updateModule);
  app.delete("/module", [corsConfig(), authMiddleware], deleteModule);
};

export default router;

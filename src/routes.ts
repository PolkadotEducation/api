import { Express, Request, Response } from "express";

// Controllers
import { createUser, deleteUser, getUser, loginUser } from "@/controllers/users";

import { createLesson, deleteLesson, getLesson, updateLesson } from "@/controllers/lessons";
import authMiddleware from "./middlewares/auth";
import corsConfig from "./cors.config";

const router = (app: Express) => {
  // Health check
  app.get("/status", (_req: Request, res: Response) => res.status(200).json({ type: "success" }));

  // Users
  app.post("/user", createUser);
  app.get("/user", getUser);
  app.post("/user/login", loginUser);
  app.delete("/user", [corsConfig(), authMiddleware], deleteUser);

  // Tracks
  // Modules
  // Lessons
  app.post("/lesson", [corsConfig(), authMiddleware], createLesson);
  app.get("/lesson", [corsConfig(), authMiddleware], getLesson);
  app.delete("/lesson", [corsConfig(), authMiddleware], deleteLesson);
  app.put("/lesson/:id", [corsConfig(), authMiddleware], updateLesson);
};

export default router;

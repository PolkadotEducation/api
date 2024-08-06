import { Express } from "express";

// Controllers
import {
  createUser,
  deleteUser,
  getUser,
  loginUser,
} from "@/controllers/users";

import {
  createLesson,
  deleteLesson,
  getLesson,
  updateLesson,
} from "@/controllers/lessons";

const router = (app: Express) => {
  // Users
  app.post("/user", createUser);
  app.get("/user", getUser);
  app.delete("/user", deleteUser);
  app.post("/user/login", loginUser);

  // Tracks
  // Modules
  // Lessons
  app.post("/lesson", createLesson);
  app.get("/lesson", getLesson);
  app.delete("/lesson", deleteLesson);
  app.put("/lesson/:id", updateLesson);
};

export default router;

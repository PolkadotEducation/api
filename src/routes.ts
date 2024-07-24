import { Express } from "express";

// Controllers
import {
  createUser,
  deleteUser,
  getUser,
  loginUser,
} from "@/controllers/users";

const router = (app: Express) => {
  // Users
  app.post("/user", createUser);
  app.get("/user", getUser);
  app.delete("/user", deleteUser);
  app.post("/user/login", loginUser);

  // Tracks
  // Modules
  // Lessons
};

export default router;

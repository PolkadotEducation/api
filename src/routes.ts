import { Express, Request, Response } from "express";

// Controllers
import { createUser, deleteUser, getUser, loginUser, loginUserWithGoogle, updateUser } from "@/controllers/users";
import { createLesson, deleteLesson, getLesson, updateLesson } from "@/controllers/lessons";
import { createModule, deleteModule, getModule, updateModule } from "@/controllers/modules";
import { createCourse, deleteCourse, getCourse, updateCourse, duplicateCourse } from "@/controllers/courses";

import authMiddleware from "./middlewares/auth";

const router = (app: Express) => {
  // Health check
  app.get("/status", (_req: Request, res: Response) => res.status(200).json({ type: "success" }));

  // Users
  app.post("/users", createUser);
  app.get("/users/:id", [authMiddleware], getUser);
  app.put("/users/:id", [authMiddleware], updateUser);
  app.delete("/users/:id", [authMiddleware], deleteUser);
  app.post("/users/login", loginUser);
  app.post("/users/login/google", loginUserWithGoogle);

  // Lessons
  app.post("/lesson", [authMiddleware], createLesson);
  app.get("/lesson", [authMiddleware], getLesson);
  app.delete("/lesson", [authMiddleware], deleteLesson);
  app.put("/lesson/:id", [authMiddleware], updateLesson);

  // Modules
  app.post("/module", [authMiddleware], createModule);
  app.get("/module", [authMiddleware], getModule);
  app.delete("/module", [authMiddleware], deleteModule);
  app.put("/module/:id", [authMiddleware], updateModule);

  // Courses
  app.post("/course", [authMiddleware], createCourse);
  app.get("/course", [authMiddleware], getCourse);
  app.delete("/course", [authMiddleware], deleteCourse);
  app.put("/course/:id", [authMiddleware], updateCourse);
  app.post("/course/duplicate", [authMiddleware], duplicateCourse);
};

export default router;

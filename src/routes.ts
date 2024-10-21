import { Express } from "express";

// Controllers
import {
  createUser,
  verifyUser,
  deleteUser,
  getUser,
  loginUser,
  loginUserWithGoogle,
  loginUserWithWallet,
  updateUser,
  recoverUser,
} from "@/controllers/users";
import { createLesson, deleteLesson, getLesson, getLessonsByLanguage, updateLesson } from "@/controllers/lessons";
import { createModule, deleteModule, getModule, updateModule } from "@/controllers/modules";
import {
  createCourse,
  deleteCourse,
  getCourse,
  updateCourse,
  duplicateCourse,
  getCoursesByLanguage,
} from "@/controllers/courses";

import authMiddleware from "./middlewares/auth";
import { getCourseProgress, getLessonProgress, getUserXPAndLevel, submitAnswer } from "./controllers/progress";

const router = (app: Express) => {
  // Users
  app.post("/users", createUser);
  app.post("/users/verify", verifyUser);
  app.post("/users/recover", recoverUser);
  app.get("/users/:id", [authMiddleware], getUser);
  app.put("/users/:id", [authMiddleware], updateUser);
  app.delete("/users/:id", [authMiddleware], deleteUser);
  app.post("/users/login", loginUser);
  app.post("/users/login/google", loginUserWithGoogle);
  app.post("/users/login/wallet", loginUserWithWallet);

  // Lessons
  app.post("/lesson", [authMiddleware], createLesson);
  app.get("/lesson", [authMiddleware], getLesson);
  app.get("/lessons", [authMiddleware], getLessonsByLanguage);
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
  app.get("/courses", [authMiddleware], getCoursesByLanguage);
  app.delete("/course", [authMiddleware], deleteCourse);
  app.put("/course/:id", [authMiddleware], updateCourse);
  app.post("/course/duplicate", [authMiddleware], duplicateCourse);

  // Progress
  app.post("/progress", [authMiddleware], submitAnswer);
  app.get("/progress/lesson/:userId/:lessonId", [authMiddleware], getLessonProgress);
  app.get("/progress/course/:userId/:courseId", [authMiddleware], getCourseProgress);
  app.get("/progress/xp-level/:userId", [authMiddleware], getUserXPAndLevel);
};

export default router;

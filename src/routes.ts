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
import {
  createLesson,
  deleteLesson,
  getLesson,
  getLessonsByLanguage,
  getLessonsSummary,
  updateLesson,
} from "@/controllers/lessons";
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
import adminMiddleware from "./middlewares/admin";
import { createTeam, deleteTeam, getTeam, getUserTeams, updateTeam } from "./controllers/teams";
import teamMiddleware from "./middlewares/team";

const router = (app: Express) => {
  // Users
  app.post("/users", createUser);
  app.post("/users/verify", verifyUser);
  app.post("/users/recover", recoverUser);
  app.get("/users", [authMiddleware], getUser);
  app.put("/users", [authMiddleware], updateUser);
  app.delete("/users", [authMiddleware], deleteUser);
  app.post("/users/login", loginUser);
  app.post("/users/login/google", loginUserWithGoogle);
  app.post("/users/login/wallet", loginUserWithWallet);

  // User's teams
  app.get("/users/teams", [authMiddleware], getUserTeams);

  // Team
  app.post("/teams", [authMiddleware], createTeam);
  app.get("/teams", [authMiddleware], getTeam);
  app.put("/teams/:id", [authMiddleware], updateTeam);
  app.delete("/teams/:id", [authMiddleware], deleteTeam);

  // Lessons
  app.post("/lesson", [authMiddleware, teamMiddleware], createLesson);
  app.get("/lesson", [authMiddleware, teamMiddleware], getLesson);
  app.get("/lessons", [authMiddleware, teamMiddleware], getLessonsByLanguage);
  app.delete("/lesson/:id", [authMiddleware, teamMiddleware], deleteLesson);
  app.put("/lesson/:id", [authMiddleware, teamMiddleware], updateLesson);
  app.get("/lessons/summary", [authMiddleware, teamMiddleware], getLessonsSummary);

  // Modules
  app.post("/module", [authMiddleware, adminMiddleware], createModule);
  app.get("/module", [authMiddleware], getModule);
  app.delete("/module", [authMiddleware, adminMiddleware], deleteModule);
  app.put("/module/:id", [authMiddleware, adminMiddleware], updateModule);

  // Courses
  app.post("/course", [authMiddleware, adminMiddleware], createCourse);
  app.get("/course", [authMiddleware], getCourse);
  app.get("/courses", [authMiddleware], getCoursesByLanguage);
  app.delete("/course", [authMiddleware, adminMiddleware], deleteCourse);
  app.put("/course/:id", [authMiddleware, adminMiddleware], updateCourse);
  app.post("/course/duplicate", [authMiddleware, adminMiddleware], duplicateCourse);

  // Progress
  app.post("/progress", [authMiddleware], submitAnswer);
  app.get("/progress/lesson/:courseId/:lessonId", [authMiddleware], getLessonProgress);
  app.get("/progress/course/:courseId", [authMiddleware], getCourseProgress);
  app.get("/progress/level", [authMiddleware], getUserXPAndLevel);
};

export default router;

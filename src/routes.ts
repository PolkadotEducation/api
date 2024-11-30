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
  duplicateLessons,
  getLesson,
  getLessons,
  getLessonsSummary,
  updateLesson,
} from "@/controllers/lessons";
import { createModule, deleteModule, getModule, getModules, updateModule } from "@/controllers/modules";
import {
  createCourse,
  deleteCourse,
  getCourse,
  updateCourse,
  duplicateCourse,
  getCourses,
} from "@/controllers/courses";

import authMiddleware from "./middlewares/auth";
import { createTeam, deleteTeam, getTeam, getUserTeams, updateTeam } from "./controllers/teams";
import teamMiddleware from "./middlewares/team";
import {
  getCompletedCourses,
  getCourseProgress,
  getLessonProgress,
  getUserXPAndLevel,
  submitAnswer,
} from "./controllers/progress";
import adminMiddleware from "./middlewares/admin";
import { generateCertificate, getCertificate, getCertificates } from "./controllers/certificates";

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
  app.post("/teams", [authMiddleware, adminMiddleware], createTeam);
  app.get("/teams", [authMiddleware], getTeam);
  app.put("/teams/:id", [authMiddleware], updateTeam);
  app.delete("/teams/:id", [authMiddleware], deleteTeam);

  // Lessons
  app.post("/lesson/:teamId", [authMiddleware, teamMiddleware], createLesson);
  app.get("/lesson", [authMiddleware], getLesson);
  app.get("/lessons", [authMiddleware], getLessons);
  app.delete("/lesson/:teamId/:id", [authMiddleware, teamMiddleware], deleteLesson);
  app.put("/lesson/:teamId/:id", [authMiddleware, teamMiddleware], updateLesson);
  app.get("/lessons/summary", [authMiddleware], getLessonsSummary);
  app.post("/lessons/duplicate/:teamId", [authMiddleware, teamMiddleware], duplicateLessons);

  // Modules
  app.post("/module/:teamId", [authMiddleware, teamMiddleware], createModule);
  app.get("/module", [authMiddleware], getModule);
  app.get("/modules", [authMiddleware], getModules);
  app.delete("/module/:teamId/:id", [authMiddleware, teamMiddleware], deleteModule);
  app.put("/module/:teamId/:id", [authMiddleware, teamMiddleware], updateModule);

  // Courses
  app.post("/course/:teamId", [authMiddleware, teamMiddleware], createCourse);
  app.get("/course", [authMiddleware], getCourse);
  app.get("/courses", [authMiddleware], getCourses);
  app.delete("/course/:teamId/:id", [authMiddleware, teamMiddleware], deleteCourse);
  app.put("/course/:teamId/:id", [authMiddleware, teamMiddleware], updateCourse);
  app.post("/course/duplicate/:teamId/:id", [authMiddleware, teamMiddleware], duplicateCourse);

  // Progress
  app.post("/progress", [authMiddleware], submitAnswer);
  app.get("/progress/lesson/:courseId/:lessonId", [authMiddleware], getLessonProgress);
  app.get("/progress/course/:courseId", [authMiddleware], getCourseProgress);
  app.get("/progress/level", [authMiddleware], getUserXPAndLevel);
  app.get("/progress/courses", [authMiddleware], getCompletedCourses);

  // Certificate
  app.post("/certificates/generate", [authMiddleware], generateCertificate);
  app.get("/certificates/:certificateId", getCertificate);
  app.get("/certificates", [authMiddleware], getCertificates);
};

export default router;

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
  getCourses,
  getCoursesSummary,
  duplicateCourses,
} from "@/controllers/courses";

import authMiddleware from "./middlewares/auth";
import { createTeam, deleteTeam, getTeams, getUserTeams, leaveTeam, updateTeam } from "./controllers/teams";
import teamMiddleware from "./middlewares/team";
import {
  getCompletedCourses,
  getCourseProgress,
  getCourseSummary,
  getLessonProgress,
  getUserXPAndLevel,
  submitAnswer,
} from "./controllers/progress";
import adminMiddleware from "./middlewares/admin";
import { generateCertificate, getCertificate, getCertificates, mintCertificate } from "./controllers/certificates";
import { getRanking } from "./controllers/ranking";
import {
  createChallenge,
  deleteChallenge,
  getChallenge,
  getBackofficeChallenges,
  getUserChallenges,
  getChallengesSummary,
  updateChallenge,
} from "./controllers/challenges";

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
  app.delete("/users/teams/:id", [authMiddleware], leaveTeam);

  // Team
  app.post("/teams", [authMiddleware, adminMiddleware], createTeam);
  app.get("/teams", [authMiddleware], getTeams);
  app.put("/teams/:id", [authMiddleware], updateTeam);
  app.delete("/teams/:id", [authMiddleware], deleteTeam);

  // Challenges
  app.post("/challenge/:teamId", [authMiddleware, teamMiddleware], createChallenge);
  app.get("/challenges/backoffice", [authMiddleware, adminMiddleware], getBackofficeChallenges);
  app.get("/challenges/user", [authMiddleware], getUserChallenges);
  app.get("/challenges/summary", [authMiddleware], getChallengesSummary);
  app.get("/challenge", [authMiddleware], getChallenge);
  app.put("/challenge/:teamId/:id", [authMiddleware, teamMiddleware], updateChallenge);
  app.delete("/challenge/:teamId/:id", [authMiddleware, teamMiddleware], deleteChallenge);

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
  app.post("/courses/duplicate/:teamId", [authMiddleware, teamMiddleware], duplicateCourses);
  app.get("/courses/summary", [authMiddleware], getCoursesSummary);

  // Progress
  app.post("/progress", [authMiddleware], submitAnswer);
  app.get("/progress/lesson/:courseId/:lessonId", [authMiddleware], getLessonProgress);
  app.get("/progress/course/:courseId", [authMiddleware], getCourseProgress);
  app.get("/progress/course/summary/:courseId", [authMiddleware], getCourseSummary);
  app.get("/progress/level", [authMiddleware], getUserXPAndLevel);
  app.get("/progress/courses", [authMiddleware], getCompletedCourses);

  // Certificate
  app.post("/certificates/generate", [authMiddleware], generateCertificate);
  app.get("/certificates/:certificateId", getCertificate);
  app.get("/certificates", [authMiddleware], getCertificates);
  app.post("/certificates/mint", [authMiddleware], mintCertificate);

  // Ranking
  app.get("/ranking", [authMiddleware], getRanking);
};

export default router;

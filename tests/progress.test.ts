import express from "express";
import { Server } from "http";
import BodyParser from "body-parser";
import axios from "axios";
import router from "@/routes";
import { mongoDBsetup } from "./db/setupTestMongo";

import { readFileSync } from "fs";
import { join } from "path";
import { Module, ModuleModel } from "@/models/Module";
import { Course, CourseModel } from "@/models/Course";
import { Lesson, LessonModel } from "@/models/Lesson";
import { ProgressModel } from "@/models/Progress";
import { UserModel } from "@/models/User";
import { UserInfo } from "@/types/User";
import { getAuthHeaders } from "./helpers";
import { Team, TeamModel } from "@/models/Team";
import { UserTeamModel } from "@/models/UserTeam";
import { getCompletedCoursesByUserId } from "@/controllers/progress";

const PORT = 3014;
const API_URL = `http://0.0.0.0:${PORT}`;

const MONGODB_DATABASE_NAME = "progressTestDB";

const loadFixture = (fixture: string) => {
  const filePath = join(__dirname, `fixtures/${fixture}`);
  return readFileSync(filePath, "utf-8");
};

describe("Setting API Server up...", () => {
  let team: Team;
  let server: Server;
  beforeAll((done) => {
    const app = express();
    app.use(BodyParser.json());

    router(app);

    server = app.listen(PORT, done);
  });

  beforeAll(async () => {
    await mongoDBsetup(MONGODB_DATABASE_NAME);
    team = await TeamModel.create({
      owner: "owner@team.com",
      name: "Admin Team",
      description: "Admin Team Description",
      picture: "...",
    });
    await UserTeamModel.create({ email: "owner@team.com", teamId: team });
  });

  afterAll(async () => {
    await mongoDBsetup(MONGODB_DATABASE_NAME, true);
    return server && server.close();
  });

  describe("Progress", () => {
    let course: Course,
      lesson1: Lesson,
      lesson2: Lesson,
      lesson3: Lesson,
      lesson4: Lesson,
      lesson5: Lesson,
      module1: Module,
      module2: Module,
      module3: Module,
      user: UserInfo | undefined,
      headers: { authorization: string; code: string };

    beforeEach(async () => {
      const email = "new.user@polkadot.education";
      const password = "password";
      user = await UserModel.createUser({
        email,
        password,
        name: "New User",
        language: "english",
        company: "company",
        picture: "Base64OrLink",
        isAdmin: false,
        signInType: "Email",
      });

      headers = await getAuthHeaders(email, password);

      lesson1 = await LessonModel.create({
        teamId: team,
        title: "Lesson #1",
        language: "english",
        slug: "lesson-1-progress",
        body: loadFixture("example.md"),
        difficulty: "easy",
        challenge: {
          question: "What is the capital of Germany?",
          choices: ["Berlin", "Munich", "Frankfurt"],
          correctChoice: 0,
        },
      });

      lesson2 = await LessonModel.create({
        teamId: team,
        title: "Lesson #2",
        language: "english",
        slug: "lesson-2-progress",
        body: loadFixture("example.md"),
        difficulty: "easy",
        challenge: {
          question: "What is the capital of Italy?",
          choices: ["Naples", "Milan", "Rome"],
          correctChoice: 2,
        },
      });

      lesson3 = await LessonModel.create({
        teamId: team,
        title: "Lesson #3",
        language: "english",
        slug: "lesson-3-progress",
        body: loadFixture("example.md"),
        difficulty: "medium",
        challenge: {
          question: "Another question?",
          choices: ["1", "2", "3"],
          correctChoice: 2,
        },
      });

      lesson4 = await LessonModel.create({
        teamId: team,
        title: "Lesson #4",
        language: "english",
        slug: "lesson-4-progress",
        body: loadFixture("example.md"),
        difficulty: "hard",
        challenge: {
          question: "Another question?",
          choices: ["1", "2", "3"],
          correctChoice: 0,
        },
      });

      lesson5 = await LessonModel.create({
        teamId: team,
        title: "Lesson #5",
        language: "english",
        slug: "lesson-5-progress",
        body: loadFixture("example.md"),
        difficulty: "hard",
        challenge: {
          question: "Another question?",
          choices: ["1", "2", "3"],
          correctChoice: 1,
        },
      });

      module1 = await ModuleModel.create({
        teamId: team,
        title: "Initial Module",
        lessons: [lesson1._id, lesson2._id],
      });

      module2 = await ModuleModel.create({
        teamId: team,
        title: "Next Module",
        lessons: [lesson3._id, lesson4._id],
      });

      module3 = await ModuleModel.create({
        teamId: team,
        title: "Final Module",
        lessons: [lesson5._id],
      });

      course = await CourseModel.create({
        teamId: team,
        title: "Initial Course",
        language: "english",
        summary: "This is the initial course summary",
        modules: [module1._id, module2._id, module3._id],
        banner: "blackPink",
      });
    });

    afterEach(async () => {
      await ProgressModel.deleteMany({});
      await LessonModel.deleteMany({});
      await ModuleModel.deleteMany({});
      await CourseModel.deleteMany({});
      await UserModel.deleteMany({});
    });

    it("Submit wrong answer (POST /progress)", async () => {
      const wrongChoice = 1;

      await axios
        .post(
          `${API_URL}/progress`,
          {
            courseId: course._id,
            lessonId: lesson1._id,
            userId: user?.id,
            choice: wrongChoice,
          },
          { headers },
        )
        .then((r) => {
          expect(r.data.courseId).toEqual(course._id?.toString());
          expect(r.data.lessonId).toEqual(lesson1._id?.toString());
          expect(r.data.userId).toEqual(user?.id.toString());
          expect(r.data.choice).toEqual(wrongChoice);
          expect(r.data.isCorrect).toEqual(false);
          expect(r.status).toEqual(201);
        })
        .catch((e) => {
          expect(e).toBeUndefined();
        });
    });

    it("Prevent submitting another answer when lesson is complete (POST /progress)", async () => {
      const choice = 0;
      await axios
        .post(
          `${API_URL}/progress`,
          {
            courseId: course._id,
            lessonId: lesson1._id,
            userId: user?.id,
            choice: choice,
          },
          { headers },
        )
        .then((r) => {
          expect(r.data.courseId).toEqual(course._id?.toString());
          expect(r.data.lessonId).toEqual(lesson1._id?.toString());
          expect(r.data.userId).toEqual(user?.id.toString());
          expect(r.data.choice).toEqual(choice);
          expect(r.data.isCorrect).toEqual(true);
          expect(r.status).toEqual(201);
        })
        .catch((e) => {
          expect(e).toBeUndefined();
        });

      const wrongChoice = 1;
      await axios
        .post(
          `${API_URL}/progress`,
          {
            courseId: course._id,
            lessonId: lesson1._id,
            userId: user?.id,
            choice: wrongChoice,
          },
          { headers },
        )
        .then((r) => {
          expect(r.data.courseId).toEqual(course._id?.toString());
          expect(r.data.lessonId).toEqual(lesson1._id?.toString());
          expect(r.data.userId).toEqual(user?.id.toString());
          expect(r.data.choice).toEqual(choice);
          expect(r.data.isCorrect).toEqual(true);
          expect(r.status).toEqual(200);
        })
        .catch((e) => {
          expect(e).toBeUndefined();
        });
    });

    it("Unique lesson, course, user, and choice (POST /progress)", async () => {
      const wrongChoice = 1;

      await axios
        .post(
          `${API_URL}/progress`,
          {
            courseId: course._id,
            lessonId: lesson1._id,
            userId: user?.id,
            choice: wrongChoice,
          },
          { headers },
        )
        .then((r) => {
          expect(r.data.courseId).toEqual(course._id?.toString());
          expect(r.data.lessonId).toEqual(lesson1._id?.toString());
          expect(r.data.userId).toEqual(user?.id.toString());
          expect(r.data.choice).toEqual(wrongChoice);
          expect(r.data.isCorrect).toEqual(false);
        })
        .catch((e) => {
          expect(e).toBeUndefined();
        });

      await axios
        .post(
          `${API_URL}/progress`,
          {
            courseId: course._id,
            lessonId: lesson1._id,
            userId: user?.id,
            choice: wrongChoice,
          },
          { headers },
        )
        .then(() => {
          throw new Error("Duplicate progress entry was allowed, but it should not be.");
        })
        .catch((e) => {
          expect(e.response.status).toEqual(409);
          expect(e.response.data.error.message).toContain("E11000 duplicate key error");
        });
    });

    it("Get lesson progress (GET /progress/lesson/:courseId/:lessonId)", async () => {
      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson1._id,
        userId: user?.id,
        choice: lesson1.challenge.correctChoice + 1,
        isCorrect: false,
        difficulty: lesson1.difficulty,
      });

      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson1._id,
        userId: user?.id,
        choice: lesson1.challenge.correctChoice,
        isCorrect: true,
        difficulty: lesson1.difficulty,
      });

      await axios
        .get(`${API_URL}/progress/lesson/${course._id}/${lesson1._id}`, { headers })
        .then((r) => {
          expect(r.data.length).toEqual(2);
        })
        .catch((e) => {
          expect(e).toBeUndefined();
        });
    });

    it("Get course progress with no completed lessons (GET /progress/course/:courseId)", async () => {
      const expectedModulesProgress: Record<string, Record<string, boolean>> = {};
      [module1, module2, module3].forEach((module) => {
        const lessonsProgress: Record<string, boolean> = {};
        module.lessons.forEach((lessonId) => {
          lessonsProgress[lessonId.toString()] = false;
        });
        expectedModulesProgress[module?._id?.toString() || ""] = lessonsProgress;
      });
      await axios
        .get(`${API_URL}/progress/course/${course._id}`, { headers })
        .then((r) => {
          expect(r.data.totalLessons).toEqual(5);
          expect(r.data.completedLessons).toEqual(0);
          expect(r.data.progressPercentage).toEqual(0);
          expect(r.data.modulesProgress).toEqual(expectedModulesProgress);
        })
        .catch((e) => {
          expect(e).toBeUndefined();
        });
    });

    it("Get course progress with one completed lesson (GET /progress/course/:courseId)", async () => {
      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson1._id,
        userId: user?.id,
        choice: 0,
        isCorrect: true,
        difficulty: lesson1.difficulty,
      });

      const expectedModulesProgress: Record<string, Record<string, boolean>> = {};
      [module1, module2, module3].forEach((module) => {
        const lessonsProgress: Record<string, boolean> = {};
        module.lessons.forEach((lessonId) => {
          lessonsProgress[lessonId.toString()] = lessonId === lesson1._id ? true : false;
        });
        expectedModulesProgress[module?._id?.toString() || ""] = lessonsProgress;
      });

      await axios
        .get(`${API_URL}/progress/course/${course._id}`, { headers })
        .then((r) => {
          expect(r.data.totalLessons).toEqual(5);
          expect(r.data.completedLessons).toEqual(1);
          expect(r.data.progressPercentage).toEqual(20);
          expect(r.data.modulesProgress).toEqual(expectedModulesProgress);
        })
        .catch((e) => {
          expect(e).toBeUndefined();
        });
    });

    it("Get course progress with one lesson incomplete (GET /progress/course/:courseId)", async () => {
      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson1._id,
        userId: user?.id,
        choice: 0,
        isCorrect: true,
        difficulty: lesson1.difficulty,
      });
      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson2._id,
        userId: user?.id,
        choice: 2,
        isCorrect: false,
        difficulty: lesson2.difficulty,
      });

      const expectedModulesProgress: Record<string, Record<string, boolean>> = {};
      [module1, module2, module3].forEach((module) => {
        const lessonsProgress: Record<string, boolean> = {};
        module.lessons.forEach((lessonId) => {
          lessonsProgress[lessonId.toString()] = lessonId === lesson1._id ? true : false;
        });
        expectedModulesProgress[module?._id?.toString() || ""] = lessonsProgress;
      });

      await axios
        .get(`${API_URL}/progress/course/${course._id}`, { headers })
        .then((r) => {
          expect(r.data.totalLessons).toEqual(5);
          expect(r.data.completedLessons).toEqual(1);
          expect(r.data.progressPercentage).toEqual(20);
          expect(r.data.modulesProgress).toEqual(expectedModulesProgress);
        })
        .catch((e) => {
          expect(e).toBeUndefined();
        });
    });

    it("Get course progress with all lessons completed (GET /progress/course/:courseId)", async () => {
      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson1._id,
        userId: user?.id,
        choice: 0,
        isCorrect: true,
        difficulty: lesson1.difficulty,
      });

      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson2._id,
        userId: user?.id,
        choice: 2,
        isCorrect: true,
        difficulty: lesson2.difficulty,
      });

      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson3._id,
        userId: user?.id,
        choice: 2,
        isCorrect: true,
        difficulty: lesson3.difficulty,
      });

      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson4._id,
        userId: user?.id,
        choice: 0,
        isCorrect: true,
        difficulty: lesson4.difficulty,
      });

      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson5._id,
        userId: user?.id,
        choice: 1,
        isCorrect: true,
        difficulty: lesson5.difficulty,
      });

      const expectedModulesProgress: Record<string, Record<string, boolean>> = {};
      [module1, module2, module3].forEach((module) => {
        const lessonsProgress: Record<string, boolean> = {};
        module.lessons.forEach((lessonId) => {
          lessonsProgress[lessonId.toString()] = true;
        });
        expectedModulesProgress[module?._id?.toString() || ""] = lessonsProgress;
      });

      await axios
        .get(`${API_URL}/progress/course/${course._id}`, { headers })
        .then((r) => {
          expect(r.status).toEqual(200);
          expect(r.data.totalLessons).toEqual(5);
          expect(r.data.completedLessons).toEqual(5);
          expect(r.data.progressPercentage).toEqual(100);
          expect(r.data.modulesProgress).toEqual(expectedModulesProgress);
        })
        .catch((e) => {
          expect(e).toBeUndefined();
        });
    });

    it("Get user XP and level (GET /progress/level)", async () => {
      // Easy lesson mistake (0 XP)
      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson1._id,
        userId: user?.id,
        choice: lesson1.challenge.correctChoice + 1,
        isCorrect: false,
        difficulty: lesson1.difficulty,
      });

      // Easy lesson correct (25 XP)
      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson1._id,
        userId: user?.id,
        choice: lesson1.challenge.correctChoice,
        isCorrect: true,
        difficulty: lesson1.difficulty,
      });

      // Easy lesson correct at first try (50 XP)
      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson2._id,
        userId: user?.id,
        choice: lesson2.challenge.correctChoice,
        isCorrect: true,
        difficulty: lesson2.difficulty,
      });

      // Medium lesson mistake (0 XP)
      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson3._id,
        userId: user?.id,
        choice: lesson3.challenge.correctChoice + 1,
        isCorrect: false,
        difficulty: lesson3.difficulty,
      });

      // Medium lesson another mistake (0 XP)
      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson3._id,
        userId: user?.id,
        choice: lesson3.challenge.correctChoice + 2,
        isCorrect: false,
        difficulty: lesson3.difficulty,
      });

      // Medium lesson correct (50 XP)
      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson3._id,
        userId: user?.id,
        choice: lesson3.challenge.correctChoice,
        isCorrect: true,
        difficulty: lesson3.difficulty,
      });

      // Hard lesson mistake, incomplete (0 XP)
      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson4._id,
        userId: user?.id,
        choice: lesson4.challenge.correctChoice + 1,
        isCorrect: false,
        difficulty: lesson4.difficulty,
      });

      // Total: 125 XP
      await axios
        .get(`${API_URL}/progress/level`, { headers })
        .then((r) => {
          expect(r.status).toEqual(200);
          expect(r.data).toHaveProperty("xp");
          expect(r.data).toHaveProperty("level");
          expect(r.data).toHaveProperty("xpToNextLevel");
          expect(r.data.xp).toEqual(125);
          expect(r.data.level).toEqual(0);
          expect(r.data.xpToNextLevel).toEqual(25);
        })
        .catch((e) => {
          expect(e).toBeUndefined();
        });
    });

    it("should return a course summary", async () => {
      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson1._id,
        userId: user?.id,
        choice: 0,
        isCorrect: true,
        difficulty: lesson1.difficulty,
      });

      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson2._id,
        userId: user?.id,
        choice: 2,
        isCorrect: true,
        difficulty: lesson2.difficulty,
      });

      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson3._id,
        userId: user?.id,
        choice: 2,
        isCorrect: true,
        difficulty: lesson3.difficulty,
      });

      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson4._id,
        userId: user?.id,
        choice: 1,
        isCorrect: false,
        difficulty: lesson4.difficulty,
      });

      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson4._id,
        userId: user?.id,
        choice: 0,
        isCorrect: true,
        difficulty: lesson4.difficulty,
      });

      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson5._id,
        userId: user?.id,
        choice: 1,
        isCorrect: false,
        difficulty: lesson5.difficulty,
      });

      await axios
        .get(`${API_URL}/progress/course/summary/${course._id}`, { headers })
        .then((r) => {
          expect(r.status).toEqual(200);
          expect(r.data.courseSummary.title).toEqual(course.title);

          // 1st module should be completed
          expect(r.data.courseSummary.modules[0].title).toEqual(module1.title);
          expect(r.data.courseSummary.modules[0].isCompleted).toEqual(true);

          // 2nd module should be completed
          expect(r.data.courseSummary.modules[1].title).toEqual(module2.title);
          expect(r.data.courseSummary.modules[1].isCompleted).toEqual(true);

          // 3rd module should NOT be completed
          expect(r.data.courseSummary.modules[2].title).toEqual(module3.title);
          expect(r.data.courseSummary.modules[2].isCompleted).toEqual(false);
        })
        .catch((e) => {
          expect(e).toBeUndefined();
        });
    });

    it("should return an array of completed courses for a valid user", async () => {
      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson1._id,
        userId: user?.id,
        choice: lesson1.challenge.correctChoice,
        isCorrect: true,
        difficulty: lesson1.difficulty,
      });

      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson2._id,
        userId: user?.id,
        choice: lesson2.challenge.correctChoice,
        isCorrect: true,
        difficulty: lesson2.difficulty,
      });

      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson3._id,
        userId: user?.id,
        choice: lesson3.challenge.correctChoice,
        isCorrect: true,
        difficulty: lesson3.difficulty,
      });

      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson4._id,
        userId: user?.id,
        choice: lesson4.challenge.correctChoice,
        isCorrect: true,
        difficulty: lesson4.difficulty,
      });

      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson5._id,
        userId: user?.id,
        choice: lesson5.challenge.correctChoice,
        isCorrect: true,
        difficulty: lesson5.difficulty,
      });

      const completedCourses = await getCompletedCoursesByUserId(user?.id as string);

      expect(completedCourses).toEqual([
        { courseId: course._id, courseTitle: course.title, courseBanner: course.banner },
      ]);
    });

    it("should return an empty array since user didnt finished the course", async () => {
      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson1._id,
        userId: user?.id,
        choice: lesson1.challenge.correctChoice,
        isCorrect: true,
        difficulty: lesson1.difficulty,
      });

      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson2._id,
        userId: user?.id,
        choice: lesson2.challenge.correctChoice,
        isCorrect: true,
        difficulty: lesson2.difficulty,
      });

      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson3._id,
        userId: user?.id,
        choice: lesson3.challenge.correctChoice,
        isCorrect: true,
        difficulty: lesson3.difficulty,
      });

      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson4._id,
        userId: user?.id,
        choice: lesson4.challenge.correctChoice,
        isCorrect: true,
        difficulty: lesson4.difficulty,
      });

      // Missing lesson 5

      const completedCourses = await getCompletedCoursesByUserId(user?.id as string);

      expect(completedCourses).toEqual([]);
    });

    it("Get user completed courses (GET /progress/courses)", async () => {
      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson1._id,
        userId: user?.id,
        choice: 0,
        isCorrect: true,
        difficulty: lesson1.difficulty,
      });

      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson2._id,
        userId: user?.id,
        choice: 2,
        isCorrect: true,
        difficulty: lesson2.difficulty,
      });

      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson3._id,
        userId: user?.id,
        choice: 2,
        isCorrect: true,
        difficulty: lesson3.difficulty,
      });

      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson4._id,
        userId: user?.id,
        choice: 0,
        isCorrect: true,
        difficulty: lesson4.difficulty,
      });

      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson5._id,
        userId: user?.id,
        choice: 1,
        isCorrect: true,
        difficulty: lesson5.difficulty,
      });

      await axios
        .get(`${API_URL}/progress/courses`, { headers })
        .then((r) => {
          expect(r.status).toEqual(200);
          expect(r.data.length).toEqual(1);
          expect(r.data[0].courseId).toEqual(course._id?.toString());
          expect(r.data[0].courseTitle).toEqual(course.title);
          expect(r.data[0].courseBanner).toEqual(course.banner);
        })
        .catch((e) => {
          expect(e).toBeUndefined();
        });
    });
  });
});

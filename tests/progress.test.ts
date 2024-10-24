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

const PORT = 3014;
const API_URL = `http://0.0.0.0:${PORT}`;

const MONGODB_DATABASE_NAME = "progressTestDB";

const loadFixture = (fixture: string) => {
  const filePath = join(__dirname, `fixtures/${fixture}`);
  return readFileSync(filePath, "utf-8");
};

describe("Setting API Server up...", () => {
  let server: Server;
  beforeAll((done) => {
    const app = express();
    app.use(BodyParser.json());

    router(app);

    server = app.listen(PORT, done);
  });

  beforeAll(async () => {
    await mongoDBsetup(MONGODB_DATABASE_NAME);
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
      user: UserInfo | undefined;

    beforeEach(async () => {
      user = await UserModel.createUser({
        email: "new.user@polkadot.education",
        password: "password",
        name: "New User",
        language: "english",
        company: "company",
        picture: "Base64OrLink",
        isAdmin: false,
      });

      lesson1 = await LessonModel.create({
        title: "Lesson #1",
        language: "english",
        body: loadFixture("example.md"),
        difficulty: "easy",
        challenge: {
          question: "What is the capital of Germany?",
          choices: ["Berlin", "Munich", "Frankfurt"],
          correctChoice: 0,
        },
      });

      lesson2 = await LessonModel.create({
        title: "Lesson #2",
        language: "english",
        body: loadFixture("example.md"),
        difficulty: "easy",
        challenge: {
          question: "What is the capital of Italy?",
          choices: ["Naples", "Milan", "Rome"],
          correctChoice: 2,
        },
      });

      lesson3 = await LessonModel.create({
        title: "Lesson #3",
        language: "english",
        body: loadFixture("example.md"),
        difficulty: "medium",
        challenge: {
          question: "Another question?",
          choices: ["1", "2", "3"],
          correctChoice: 2,
        },
      });

      lesson4 = await LessonModel.create({
        title: "Lesson #4",
        language: "english",
        body: loadFixture("example.md"),
        difficulty: "hard",
        challenge: {
          question: "Another question?",
          choices: ["1", "2", "3"],
          correctChoice: 0,
        },
      });

      lesson5 = await LessonModel.create({
        title: "Lesson #5",
        language: "english",
        body: loadFixture("example.md"),
        difficulty: "hard",
        challenge: {
          question: "Another question?",
          choices: ["1", "2", "3"],
          correctChoice: 1,
        },
      });

      module1 = await ModuleModel.create({
        title: "Initial Module",
        lessons: [lesson1._id, lesson2._id],
      });

      module2 = await ModuleModel.create({
        title: "Next Module",
        lessons: [lesson3._id, lesson4._id],
      });

      module3 = await ModuleModel.create({
        title: "Final Module",
        lessons: [lesson5._id],
      });

      course = await CourseModel.create({
        title: "Initial Course",
        language: "english",
        summary: "This is the initial course summary",
        modules: [module1._id, module2._id, module3._id],
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
        .post(`${API_URL}/progress`, {
          courseId: course._id,
          lessonId: lesson1._id,
          userId: user?.id,
          choice: wrongChoice,
        })
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
    });

    it("Unique lesson, course, user, and choice (POST /progress)", async () => {
      const choice = 0;

      await axios
        .post(`${API_URL}/progress`, {
          courseId: course._id,
          lessonId: lesson1._id,
          userId: user?.id,
          choice: choice,
        })
        .then((r) => {
          expect(r.data.courseId).toEqual(course._id?.toString());
          expect(r.data.lessonId).toEqual(lesson1._id?.toString());
          expect(r.data.userId).toEqual(user?.id.toString());
          expect(r.data.choice).toEqual(choice);
          expect(r.data.isCorrect).toEqual(true);
        })
        .catch((e) => {
          expect(e).toBeUndefined();
        });

      await axios
        .post(`${API_URL}/progress`, {
          courseId: course._id,
          lessonId: lesson1._id,
          userId: user?.id,
          choice: choice,
        })
        .then(() => {
          throw new Error("Duplicate progress entry was allowed, but it should not be.");
        })
        .catch((e) => {
          expect(e.response.status).toEqual(400);
          expect(e.response.data.error.message).toContain("E11000 duplicate key error");
        });
    });

    it("Get lesson progress (GET /progress/lesson/:userId/:courseId/:lessonId)", async () => {
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
        .get(`${API_URL}/progress/lesson/${user?.id}/${course._id}/${lesson1._id}`)
        .then((r) => {
          expect(r.data.length).toEqual(2);
        })
        .catch((e) => {
          expect(e).toBeUndefined();
        });
    });

    it("Get course progress with no completed lessons (GET /progress/course/:userId/:courseId)", async () => {
      await axios
        .get(`${API_URL}/progress/course/${user?.id}/${course._id}`)
        .then((r) => {
          expect(r.data.totalLessons).toEqual(5);
          expect(r.data.completedLessons).toEqual(0);
          expect(r.data.progressPercentage).toEqual(0);
        })
        .catch((e) => {
          expect(e).toBeUndefined();
        });
    });

    it("Get course progress with one completed lesson (GET /progress/course/:userId/:courseId)", async () => {
      await ProgressModel.create({
        courseId: course._id,
        lessonId: lesson1._id,
        userId: user?.id,
        choice: 0,
        isCorrect: true,
        difficulty: lesson1.difficulty,
      });

      await axios
        .get(`${API_URL}/progress/course/${user?.id}/${course._id}`)
        .then((r) => {
          expect(r.data.totalLessons).toEqual(5);
          expect(r.data.completedLessons).toEqual(1);
          expect(r.data.progressPercentage).toEqual(20);
        })
        .catch((e) => {
          expect(e).toBeUndefined();
        });
    });

    it("Get course progress with one lesson incomplete (GET /progress/course/:userId/:courseId)", async () => {
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

      await axios
        .get(`${API_URL}/progress/course/${user?.id}/${course._id}`)
        .then((r) => {
          expect(r.data.totalLessons).toEqual(5);
          expect(r.data.completedLessons).toEqual(1);
          expect(r.data.progressPercentage).toEqual(20);
        })
        .catch((e) => {
          expect(e).toBeUndefined();
        });
    });

    it("Get course progress with all lessons completed (GET /progress/course/:userId/:courseId)", async () => {
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
        .get(`${API_URL}/progress/course/${user?.id}/${course._id}`)
        .then((r) => {
          expect(r.status).toEqual(200);
          expect(r.data.totalLessons).toEqual(5);
          expect(r.data.completedLessons).toEqual(5);
          expect(r.data.progressPercentage).toEqual(100);
        })
        .catch((e) => {
          expect(e).toBeUndefined();
        });
    });

    it("Get user XP and level (GET /progress/level/:userId)", async () => {
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
        .get(`${API_URL}/progress/level/${user?.id}`)
        .then((r) => {
          expect(r.status).toEqual(200);
          expect(r.data).toHaveProperty("exp");
          expect(r.data).toHaveProperty("level");
          expect(r.data.exp).toEqual(125);
          expect(r.data.level).toEqual(0);
        })
        .catch((e) => {
          expect(e).toBeUndefined();
        });
    });
  });
});

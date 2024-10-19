import express from "express";
import { Server } from "http";
import BodyParser from "body-parser";
import axios from "axios";
import router from "@/routes";
import { mongoDBsetup } from "./db/setupTestMongo";

import { readFileSync } from "fs";
import { join } from "path";
import { ModuleModel } from "@/models/Module";
import { CourseModel } from "@/models/Course";
import { LessonModel } from "@/models/Lesson";

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
    it("Submit wrong answer (POST /progress)", async () => {
      const lesson1 = await LessonModel.create({
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

      const wrongChoice = 1;

      const lesson2 = await LessonModel.create({
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

      const module = await ModuleModel.create({
        title: "Initial Module",
        lessons: [lesson1._id, lesson2._id],
      });

      const course = await CourseModel.create({
        title: "Initial Course",
        language: "english",
        summary: "This is the initial course summary",
        modules: [module._id],
      });

      await axios
        .post(`${API_URL}/progress/`, {
          courseId: course._id,
          lessonId: lesson1._id,
          choice: wrongChoice,
        })
        .then((r) => {
          expect(r.data.courseId).toEqual(course._id.toString());
          expect(r.data.lessonId).toEqual(lesson1._id.toString());
          expect(r.data.choice).toEqual(wrongChoice);
          expect(r.data.isCorrect).toEqual(false);
        })
        .catch((e) => {
          expect(e).toBeUndefined();
        });
    });
  });
});

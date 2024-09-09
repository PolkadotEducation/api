import express from "express";
import { Server } from "http";
import BodyParser from "body-parser";
import axios from "axios";
import router from "@/routes";
import { mongoDBsetup } from "./db/setupTestMongo";
import { readFileSync } from "fs";
import { join } from "path";
import { ModuleModel } from "@/models/Module";
import { LessonModel } from "@/models/Lesson";

const PORT = 3012;
const API_URL = `http://0.0.0.0:${PORT}`;
const MONGODB_DATABASE_NAME = "modulesTestDB";

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

  afterAll(async () => {
    await mongoDBsetup(MONGODB_DATABASE_NAME, true);
    return server && server.close();
  });

  describe("Modules", () => {
    it("Create a Module (POST /module)", async () => {
      await mongoDBsetup(MONGODB_DATABASE_NAME);

      const lesson = await LessonModel.create({
        title: "Lesson #1",
        body: loadFixture("example.md"),
        difficulty: "easy",
        challenge: {
          question: "What is the capital of France?",
          choices: ["Berlin", "Madrid", "Paris", "Rome"],
          correctChoice: 2,
        },
      });

      const moduleTitle = "Module #1";
      await axios
        .post(`${API_URL}/module`, {
          title: moduleTitle,
          lessons: [lesson._id],
        })
        .then((r) => {
          expect(r.data.title).toEqual(moduleTitle);
          expect(r.data.lessons).toContainEqual(lesson._id.toString());
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Create a Module with invalid lessons returns error (POST /module)", async () => {
      await mongoDBsetup(MONGODB_DATABASE_NAME);

      const moduleTitle = "Module with invalid lessons";
      await axios
        .post(`${API_URL}/module`, {
          title: moduleTitle,
          lessons: ["invalidLessonId"],
        })
        .then(() => {})
        .catch((e) => {
          expect(e.response.data.error.message).toContain("Some lessons not found");
        });
    });

    it("Update a Module (PUT /module/:id)", async () => {
      await mongoDBsetup(MONGODB_DATABASE_NAME);

      const lesson1 = await LessonModel.create({
        title: "Lesson #1",
        body: loadFixture("example.md"),
        difficulty: "easy",
        challenge: {
          question: "What is the capital of Germany?",
          choices: ["Berlin", "Munich", "Frankfurt"],
          correctChoice: 0,
        },
      });

      const lesson2 = await LessonModel.create({
        title: "Lesson #2",
        body: loadFixture("example.md"),
        difficulty: "easy",
        challenge: {
          question: "What is the capital of Italy?",
          choices: ["Rome", "Milan", "Naples"],
          correctChoice: 0,
        },
      });

      const module = await ModuleModel.create({
        title: "Initial Module",
        lessons: [lesson1._id],
      });

      const updatedTitle = "Updated Module";
      await axios.put(`${API_URL}/module/${module._id}`, {
        title: updatedTitle,
        lessons: [lesson1._id, lesson2._id],
      });

      await axios
        .get(`${API_URL}/module?moduleId=${module._id}`)
        .then((r) => {
          expect(r.data.title).toEqual(updatedTitle);
          expect(r.data.lessons).toContainEqual(lesson1._id.toString());
          expect(r.data.lessons).toContainEqual(lesson2._id.toString());
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Get a Module (GET /module)", async () => {
      await mongoDBsetup(MONGODB_DATABASE_NAME);

      const lesson = await LessonModel.create({
        title: "Lesson #3",
        body: loadFixture("example.md"),
        difficulty: "easy",
        challenge: {
          question: "What is the capital of Japan?",
          choices: ["Tokyo", "Kyoto", "Osaka"],
          correctChoice: 0,
        },
      });

      const newModule = await ModuleModel.create({
        title: "Module with Lesson",
        lessons: [lesson._id],
      });

      await axios
        .get(`${API_URL}/module?moduleId=${newModule._id}`)
        .then((r) => {
          expect(r.data.title).toEqual("Module with Lesson");
          expect(r.data.lessons[0]).toEqual(lesson._id.toString());
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Delete a Module (DELETE /module)", async () => {
      await mongoDBsetup(MONGODB_DATABASE_NAME);

      const lesson = await LessonModel.create({
        title: "Lesson #4",
        body: loadFixture("example.md"),
        difficulty: "hard",
        challenge: {
          question: "What is the capital of Kenya?",
          choices: ["Lagos", "Cairo", "Nairobi", "Addis Ababa"],
          correctChoice: 2,
        },
      });

      const newModule = await ModuleModel.create({
        title: "Module to Delete",
        lessons: [lesson._id],
      });

      await axios
        .delete(`${API_URL}/module`, { data: { moduleId: newModule._id } })
        .then((r) => {
          expect(r.data.message).toEqual(`Module '${newModule._id}' deleted`);
        })
        .catch((e) => expect(e).toBeUndefined());
    });
  });
});

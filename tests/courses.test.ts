import express from "express";
import { Server } from "http";
import BodyParser from "body-parser";
import axios from "axios";
import router from "@/routes";
import { mongoDBsetup } from "./db/setupTestMongo";
import { readFileSync } from "fs";
import { join } from "path";
import { CourseModel } from "@/models/Course";
import { Module, ModuleModel } from "@/models/Module";
import { LessonModel } from "@/models/Lesson";

const PORT = 3013;
const API_URL = `http://0.0.0.0:${PORT}`;
const MONGODB_DATABASE_NAME = "coursesTestDB";

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

  describe("Courses", () => {
    it("Create a Course (POST /course)", async () => {
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

      const module = await ModuleModel.create({
        title: "Module #1",
        lessons: [lesson._id],
      });

      const courseTitle = "Course #1";
      const courseSummary = "This is a summary of Course #1";

      await axios
        .post(`${API_URL}/course`, {
          title: courseTitle,
          summary: courseSummary,
          modules: [module._id],
        })
        .then((r) => {
          expect(r.data.title).toEqual(courseTitle);
          expect(r.data.summary).toEqual(courseSummary);
          expect(r.data.modules[0]).toEqual(module._id.toString());
        })
        .catch((e) => {
          expect(e).toBeUndefined();
        });
    });

    it("Create a Course with invalid modules returns error (POST /course)", async () => {
      await mongoDBsetup(MONGODB_DATABASE_NAME);

      const courseTitle = "Course with invalid modules";
      const courseSummary = "This course contains invalid modules";
      const invalidModuleId = "60e4b68f2f8fb814b56fa181";

      await axios
        .post(`${API_URL}/course`, {
          title: courseTitle,
          summary: courseSummary,
          modules: [invalidModuleId],
        })
        .then(() => {})
        .catch((e) => {
          expect(e.response.data.error.message).toContain("Some modules not found");
        });
    });

    it("Update a Course (PUT /course/:id)", async () => {
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
        lessons: [lesson1._id, lesson2._id],
      });

      const course = await CourseModel.create({
        title: "Initial Course",
        summary: "This is the initial course summary",
        modules: [module._id],
      });

      const updatedTitle = "Updated Course";
      const updatedSummary = "This is the updated course summary";

      await axios.put(`${API_URL}/course/${course._id}`, {
        title: updatedTitle,
        summary: updatedSummary,
        modules: [module._id],
      });

      await axios
        .get(`${API_URL}/course?courseId=${course._id}`)
        .then((r) => {
          expect(r.data.title).toEqual(updatedTitle);
          expect(r.data.summary).toEqual(updatedSummary);
          expect(r.data.modules.some((recordedModule: Module) => recordedModule._id === module._id.toString())).toBe(
            true,
          );
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Get a Course (GET /course)", async () => {
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

      const module = await ModuleModel.create({
        title: "Module with Lesson",
        lessons: [lesson._id],
      });

      const newCourse = await CourseModel.create({
        title: "Course with Module",
        summary: "This course contains a module",
        modules: [module._id],
      });

      await axios
        .get(`${API_URL}/course?courseId=${newCourse._id}`)
        .then((r) => {
          expect(r.data.title).toEqual("Course with Module");
          expect(r.data.summary).toEqual("This course contains a module");
          expect(r.data.modules.some((recordedModule: Module) => recordedModule._id === module._id.toString())).toBe(
            true,
          );
        })
        .catch((e) => expect(e).toBeUndefined());
    });

    it("Delete a Course (DELETE /course)", async () => {
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

      const module = await ModuleModel.create({
        title: "Module to Delete",
        lessons: [lesson._id],
      });

      const newCourse = await CourseModel.create({
        title: "Course to Delete",
        summary: "This course is about to be deleted",
        modules: [module._id],
      });

      const courseCountBefore = await CourseModel.countDocuments();

      await axios
        .delete(`${API_URL}/course`, { data: { courseId: newCourse._id } })
        .then((r) => {
          expect(r.data.message).toEqual(`Course '${newCourse._id}' deleted`);
        })
        .catch((e) => expect(e).toBeUndefined());

      const courseCountAfter = await CourseModel.countDocuments();
      expect(courseCountAfter).toBe(courseCountBefore - 1);
    });

    it("Duplicate a Course (POST /course/duplicate)", async () => {
      await mongoDBsetup(MONGODB_DATABASE_NAME);

      const lesson = await LessonModel.create({
        title: "Lesson #5",
        body: loadFixture("example.md"),
        difficulty: "medium",
        challenge: {
          question: "What is the capital of Brazil?",
          choices: ["Rio de Janeiro", "Brasília", "São Paulo", "Salvador"],
          correctChoice: 1,
        },
      });

      const module = await ModuleModel.create({
        title: "Module to Duplicate",
        lessons: [lesson._id],
      });

      const course = await CourseModel.create({
        title: "Course to Duplicate",
        summary: "This course will be duplicated",
        modules: [module._id],
      });

      await axios
        .post(`${API_URL}/course/duplicate`, { courseId: course._id })
        .then((r) => {
          expect(r.data.title).toEqual(`${course.title} (Copy)`);
          expect(r.data.summary).toEqual(course.summary);
          expect(r.data.modules[0]).toEqual(module._id.toString());
        })
        .catch((e) => expect(e).toBeUndefined());
    });
  });
});
